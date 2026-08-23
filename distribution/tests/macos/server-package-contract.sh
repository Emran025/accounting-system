#!/bin/bash
set -euo pipefail

usage() {
  echo "usage: $0 --package <path> --product <server-desktop|server-headless> --runtime-target <macos-aarch64|macos-x86_64>" >&2
  exit 2
}

package=""
product=""
runtime_target=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --package) package="${2:-}"; shift 2 ;;
    --product) product="${2:-}"; shift 2 ;;
    --runtime-target) runtime_target="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

[[ "$(uname -s)" == "Darwin" ]] || { echo 'this contract must run on macOS' >&2; exit 1; }
[[ -f "$package" && -n "$product" && -n "$runtime_target" ]] || usage
case "$product" in server-desktop|server-headless) ;; *) usage ;; esac
case "$runtime_target" in macos-aarch64|macos-x86_64) ;; *) usage ;; esac

label='im.accore.server-agent'
config='/Library/Application Support/ACCORE ERP/Server/agent-config.json'
manifest='/Library/Application Support/ACCORE ERP/Server/server-instance.json'
status='/Library/Application Support/ACCORE ERP/Server Status/runtime-status.json'
data_root='/Library/Application Support/ACCORE ERP/Server'
sentinel="$data_root/package-upgrade-sentinel"
application='/Applications/ACCORE ERP Server Desktop.app'
headless_agent='/Library/ACCORE ERP/Server/accore-server-agent'
agent=''
runtime=''
if [[ "$product" == 'server-desktop' ]]; then
  runtime="$application/Contents/Resources/resources/server-runtime/${runtime_target}"
  package_identifier='com.accore.erp.server.desktop'
else
  runtime="/Library/ACCORE ERP/Server/resources/server-runtime/${runtime_target}"
  package_identifier='com.accore.erp.server.headless'
fi

resolve_desktop_agent() {
  local candidates=()
  local candidate
  shopt -s nullglob
  for candidate in \
    "$application/Contents/MacOS/accore-server-agent" \
    "$application"/Contents/MacOS/accore-server-agent-*-apple-darwin; do
    [[ -f "$candidate" ]] && candidates+=("$candidate")
  done
  shopt -u nullglob
  [[ ${#candidates[@]} -eq 1 ]] || {
    echo "expected exactly one bundled Desktop agent, found ${#candidates[@]}: ${candidates[*]:-none}" >&2
    return 1
  }
  agent="${candidates[0]}"
}

resolve_product_paths() {
  if [[ "$product" == 'server-desktop' ]]; then
    resolve_desktop_agent
  else
    agent="$headless_agent"
  fi
}

cleanup() {
  set +e
  if [[ -x "$headless_agent" ]]; then
    sudo "$headless_agent" uninstall --owner server-headless >/dev/null 2>&1 || true
  fi
  if [[ -d "$application" ]]; then
    local old_agent=''
    if resolve_desktop_agent >/dev/null 2>&1; then old_agent="$agent"; fi
    if [[ -n "$old_agent" && -x "$old_agent" ]]; then
      sudo "$old_agent" uninstall --owner server-desktop >/dev/null 2>&1 || true
    fi
  fi
  sudo launchctl bootout "system/$label" >/dev/null 2>&1 || true
  sudo rm -f "/Library/LaunchDaemons/${label}.plist" || true
  sudo rm -rf \
    '/Library/Application Support/ACCORE ERP/Server' \
    '/Library/Application Support/ACCORE ERP/Server Status' \
    '/Library/ACCORE ERP/Server' \
    "$application" || true
  sudo pkgutil --forget "$package_identifier" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

require_root_owned_executable() {
  local path="$1"
  [[ -x "$path" ]] || { echo "installed executable is missing: $path" >&2; exit 1; }
  [[ "$(stat -f '%Su:%Sg' "$path")" == 'root:wheel' ]] || {
    echo "installed executable is not root:wheel: $path ($(stat -f '%Su:%Sg' "$path"))" >&2
    exit 1
  }
  local mode
  mode="$(stat -f '%Lp' "$path")"
  (( (8#$mode & 022) == 0 )) || { echo "installed executable is group/world writable: $path ($mode)" >&2; exit 1; }
}

wait_for_ready() {
  local timeout_seconds=300
  local elapsed=0
  sudo launchctl print "system/${label}" >/dev/null
  while (( elapsed < timeout_seconds )); do
    if [[ -f "$status" ]] && grep -q '"state": "ready"' "$status"; then
      return 0
    fi
    sleep 2
    (( elapsed += 2 ))
  done

  echo "${product} did not reach ready state; diagnostics follow:" >&2
  sudo launchctl print "system/${label}" 2>&1 || true
  sudo cat "$status" 2>/dev/null || true
  sudo cat "$config" 2>/dev/null || true
  sudo cat "$manifest" 2>/dev/null || true
  return 1
}

assert_runtime_operable() {
  [[ -f "$runtime/Caddyfile" ]] || { echo "installed Caddyfile is missing: $runtime/Caddyfile" >&2; exit 1; }
  require_root_owned_executable "$runtime/frankenphp"
  require_root_owned_executable "$runtime/mariadb/bin/mariadbd"
  require_root_owned_executable "$runtime/mariadb/scripts/mariadb-install-db"
  require_root_owned_executable "$runtime/mariadb/bin/mariadb-dump"
  "$runtime/frankenphp" --version >/dev/null
  "$runtime/mariadb/bin/mariadbd" --no-defaults --verbose --help >/dev/null
  "$runtime/mariadb/scripts/mariadb-install-db" --help >/dev/null
  "$runtime/mariadb/bin/mariadb-dump" --help >/dev/null
}

install_and_assert() {
  sudo installer -pkg "$package" -target /
  resolve_product_paths
  require_root_owned_executable "$agent"
  if [[ "$product" == 'server-desktop' ]]; then
    [[ "$(stat -f '%Su:%Sg' "$application")" == 'root:wheel' ]] || {
      echo "installed Desktop .app is not root:wheel" >&2
      exit 1
    }
  fi
  assert_runtime_operable
  sudo pkgutil --pkg-info "$package_identifier" >/dev/null
  wait_for_ready
}

install_and_assert
sudo touch "$sentinel"
[[ -f "$sentinel" ]] || { echo 'could not create upgrade persistence sentinel' >&2; exit 1; }

# Same-version reinstall exercises preinstall/postinstall behavior on the runner
# and proves that replacing the package does not delete protected server data.
install_and_assert
[[ -f "$sentinel" ]] || { echo 'package reinstall erased protected server data' >&2; exit 1; }
[[ -f "$config" && -f "$manifest" ]] || { echo 'package reinstall lost the server configuration or manifest' >&2; exit 1; }

echo "Verified ${product} macOS install, runtime, ownership, and reinstall contract."
