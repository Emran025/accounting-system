[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Agent,
  [Parameter(Mandatory = $true)]
  [string]$PublicStatusRoot
)

$ErrorActionPreference = 'Stop'
$serviceName = 'ACCOREServerAgent'
$statusPath = Join-Path $PublicStatusRoot 'runtime-status.json'
$receiptPath = Join-Path $PublicStatusRoot 'server-instance.json'

function Assert-Contract {
  param(
    [Parameter(Mandatory = $true)]
    [bool]$Condition,
    [Parameter(Mandatory = $true)]
    [string]$Message
  )
  if (-not $Condition) { throw $Message }
}

function Assert-ElevatedContractContext {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  Assert-Contract -Condition $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) -Message 'Lifecycle mutator must run with a full elevated Windows token'
}

function Invoke-AgentOperation {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  & $Agent @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Agent operation '$($Arguments -join ' ')' exited with $LASTEXITCODE"
  }
}

function Read-PublicJson {
  param([Parameter(Mandatory = $true)][string]$Path)
  Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Wait-ForPublicState {
  param(
    [Parameter(Mandatory = $true)][string]$ExpectedState,
    [int]$TimeoutSeconds = 180
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Path -LiteralPath $statusPath) {
      $status = Read-PublicJson -Path $statusPath
      if ($status.state -eq $ExpectedState) { return $status }
      if ($status.state -eq 'unhealthy') {
        throw "Agent published unhealthy public status at phase '$($status.phase)' with code '$($status.errorCode)': $($status.detail)"
      }
    }
    Start-Sleep -Seconds 2
  }
  throw "Agent did not publish public state '$ExpectedState' within $TimeoutSeconds seconds"
}

function Get-ServiceMetadata {
  Get-CimInstance Win32_Service -Filter "Name='$serviceName'"
}

function Write-PublicPathDiagnostics {
  param([Parameter(Mandatory = $true)][string]$Path)
  try {
    if (-not (Test-Path -LiteralPath $Path)) {
      Write-Host "--- $Path is not present ---"
      return
    }
    Write-Host "--- $Path ---"
    Get-Content -LiteralPath $Path -Raw
  }
  catch {
    Write-Host "--- $Path could not be read: $($_.Exception.Message) ---"
    Write-Host "--- public ACL metadata for $Path ---"
    & icacls.exe $Path 2>&1 | ForEach-Object { Write-Host $_ }
  }
}

try {
  Assert-ElevatedContractContext
  Assert-Contract -Condition (Test-Path -LiteralPath $Agent) -Message "Agent binary is missing: $Agent"
  Assert-Contract -Condition (-not (Get-Service -Name $serviceName -ErrorAction SilentlyContinue)) -Message 'Worker is not fresh: ACCORE Server Agent service already exists'
  Assert-Contract -Condition (-not (Test-Path -LiteralPath $PublicStatusRoot)) -Message 'Worker is not fresh: public Server Status directory already exists'

  Invoke-AgentOperation -Arguments @('claim', '--owner', 'server-desktop')
  # A fresh server applies the complete Laravel schema before starting the API.
  # Marketplace adds migrations, so keep the first readiness assertion bounded
  # but allow the slower Windows filesystem/database bootstrap to complete.
  $ready = Wait-ForPublicState -ExpectedState 'ready' -TimeoutSeconds 600
  Assert-Contract -Condition ($ready.phase -eq 'ready') -Message "Ready agent published unexpected phase '$($ready.phase)'"
  Assert-Contract -Condition (-not [string]::IsNullOrWhiteSpace($ready.serverId)) -Message 'Ready agent did not publish serverId'

  $desktopReceipt = Read-PublicJson -Path $receiptPath
  Assert-Contract -Condition ($desktopReceipt.ownerProduct -eq 'server-desktop') -Message "Unexpected initial owner '$($desktopReceipt.ownerProduct)'"
  Assert-Contract -Condition ($desktopReceipt.state -eq 'active') -Message "Unexpected initial public instance state '$($desktopReceipt.state)'"
  Assert-Contract -Condition (-not [string]::IsNullOrWhiteSpace($desktopReceipt.instanceId)) -Message 'Public receipt did not publish instanceId'

  $service = Get-ServiceMetadata
  Assert-Contract -Condition ($null -ne $service) -Message 'SCM does not expose ACCORE Server Agent after Desktop claim'
  Assert-Contract -Condition ($service.StartMode -eq 'Auto') -Message "SCM service start mode is '$($service.StartMode)', not Auto"
  Assert-Contract -Condition ($service.State -eq 'Running') -Message "SCM service state is '$($service.State)', not Running after the initial Desktop claim"
  Assert-Contract -Condition ($service.PathName -match [regex]::Escape((Resolve-Path $Agent).Path)) -Message 'SCM service command does not reference the claimed Agent executable'

  Invoke-AgentOperation -Arguments @('claim', '--owner', 'server-desktop')
  $ready = Wait-ForPublicState -ExpectedState 'ready'
  Assert-Contract -Condition ($ready.ownerProduct -eq 'server-desktop') -Message 'Reconcile did not preserve the Desktop owner in public status'
  $service = Get-ServiceMetadata
  Assert-Contract -Condition ($null -ne $service -and $service.State -eq 'Running') -Message 'Repeated Desktop claim did not leave the SCM service Running'

  Invoke-AgentOperation -Arguments @('uninstall', '--owner', 'server-headless')
  $passiveReceipt = Read-PublicJson -Path $receiptPath
  Assert-Contract -Condition ($passiveReceipt.ownerProduct -eq 'server-desktop') -Message 'Non-owner removal changed the active public owner'
  Assert-Contract -Condition ($null -ne (Get-ServiceMetadata)) -Message 'Non-owner removal unexpectedly removed the SCM service'

  Invoke-AgentOperation -Arguments @('transition', '--from', 'server-desktop', '--to', 'server-headless')
  $headlessReceipt = Read-PublicJson -Path $receiptPath
  Assert-Contract -Condition ($headlessReceipt.ownerProduct -eq 'server-headless') -Message 'Explicit transition did not publish the Headless owner'
  Assert-Contract -Condition ($headlessReceipt.state -eq 'active') -Message "Explicit transition did not complete: '$($headlessReceipt.state)'"
  Assert-Contract -Condition ($headlessReceipt.instanceId -eq $desktopReceipt.instanceId) -Message 'Explicit transition changed the durable instance identity'
  $ready = Wait-ForPublicState -ExpectedState 'ready'
  Assert-Contract -Condition ($ready.ownerProduct -eq 'server-headless') -Message 'Runtime status did not publish the Headless owner after transition'
  $service = Get-ServiceMetadata
  Assert-Contract -Condition ($null -ne $service -and $service.State -eq 'Running') -Message 'Explicit owner transition did not leave the SCM service Running'

  Invoke-AgentOperation -Arguments @('attach', '--owner', 'server-desktop')
  Assert-Contract -Condition ($null -ne (Get-ServiceMetadata)) -Message 'Desktop attach removed the Headless-owned SCM service'

  Invoke-AgentOperation -Arguments @('uninstall', '--owner', 'server-desktop')
  Assert-Contract -Condition ($null -ne (Get-ServiceMetadata)) -Message 'Desktop passive removal removed the Headless-owned SCM service'

  Invoke-AgentOperation -Arguments @('uninstall', '--owner', 'server-headless')
  $deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $deadline -and $null -ne (Get-ServiceMetadata)) {
    Start-Sleep -Milliseconds 500
  }
  Assert-Contract -Condition ($null -eq (Get-ServiceMetadata)) -Message 'Active Headless removal did not remove the SCM service'
  $removedReceipt = Read-PublicJson -Path $receiptPath
  Assert-Contract -Condition ($removedReceipt.state -eq 'removed') -Message "Active removal did not publish removed state: '$($removedReceipt.state)'"
  Assert-Contract -Condition ($removedReceipt.instanceId -eq $desktopReceipt.instanceId) -Message 'Removal changed the durable instance identity in the public receipt'

  Write-Host 'Server lifecycle public contract passed without reading or deleting private ProgramData files.'
}
catch {
  $originalFailure = $_
  Write-Host 'Server lifecycle public contract diagnostics follow.'
  Write-Host "--- original contract failure: $($originalFailure.Exception.Message) ---"
  Write-Host "--- current identity: $([Security.Principal.WindowsIdentity]::GetCurrent().Name) ---"
  foreach ($path in @($statusPath, $receiptPath)) {
    Write-PublicPathDiagnostics -Path $path
  }
  $service = Get-ServiceMetadata
  if ($null -ne $service) {
    Write-Host '--- SCM public service metadata ---'
    $service | Select-Object Name, State, StartMode, PathName | Format-List | Out-String | Write-Host
  }
  throw $originalFailure
}
