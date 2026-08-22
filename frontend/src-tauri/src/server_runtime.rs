use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::Duration,
};

use serde::{Deserialize, Serialize};
#[cfg(unix)]
use std::os::unix::fs::MetadataExt;
#[cfg(windows)]
use std::{ffi::OsStr, os::windows::ffi::OsStrExt, ptr};
use tauri::{AppHandle, Manager};
#[cfg(windows)]
use windows_sys::Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_HIDE};

const SERVER_DESKTOP_OWNER: &str = "server-desktop";
const LINUX_HEADLESS_AGENT: &str = "/opt/accore-erp/server/accore-server-agent";
const MACOS_HEADLESS_AGENT: &str = "/Library/ACCORE ERP/Server/accore-server-agent";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerRuntimeSnapshot {
    pub state: String,
    pub detail: String,
    pub database: RuntimeComponentSnapshot,
    pub api: RuntimeComponentSnapshot,
    pub queue: RuntimeComponentSnapshot,
    pub backup: RuntimeComponentSnapshot,
    #[serde(default)]
    pub runtime_present: bool,
    pub updated_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeComponentSnapshot {
    pub state: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerBackupSnapshot {
    pub state: String,
    pub detail: String,
    pub retained_restore_points: usize,
    pub last_backup_at_unix: Option<u64>,
    pub last_verified_at_unix: Option<u64>,
    pub updated_at_unix: Option<u64>,
}

#[tauri::command]
pub fn server_runtime_status(app: AppHandle) -> Result<ServerRuntimeSnapshot, String> {
    let paths = RuntimePaths::resolve(&app)?;
    let missing_resources = paths.missing_resources();
    if !missing_resources.is_empty() {
        return Ok(unavailable(
            format!(
                "required self-contained runtime resource(s) are missing: {}",
                missing_resources.join(", ")
            ),
            false,
        ));
    }

    let status_path = paths.status_root.join("runtime-status.json");
    if !status_path.is_file() {
        return Ok(unavailable("local server is not initialized", true));
    }

    let raw =
        fs::read(&status_path).map_err(|error| format!("read server runtime status: {error}"))?;
    parse_published_runtime_snapshot(&raw)
}

fn parse_published_runtime_snapshot(raw: &[u8]) -> Result<ServerRuntimeSnapshot, String> {
    let mut status: ServerRuntimeSnapshot = serde_json::from_slice(raw)
        .map_err(|error| format!("parse server runtime status: {error}"))?;
    status.runtime_present = true;
    Ok(status)
}

#[tauri::command]
pub fn server_runtime_start(app: AppHandle) -> Result<ServerRuntimeSnapshot, String> {
    let paths = RuntimePaths::resolve(&app)?;
    let missing_resources = paths.missing_resources();
    if !missing_resources.is_empty() {
        return Ok(unavailable(
            format!(
                "runtime package verification failed; missing: {}",
                missing_resources.join(", ")
            ),
            false,
        ));
    }

    let current = server_runtime_status(app.clone())?;
    if matches!(current.state.as_str(), "ready" | "bootstrapping") {
        return Ok(current);
    }

    start_service_agent(&paths)?;

    for _ in 0..10 {
        thread::sleep(Duration::from_millis(250));
        let status = server_runtime_status(app.clone())?;
        if status.state != "unavailable" {
            return Ok(status);
        }
    }
    Ok(unavailable(
        "Server Agent started but has not yet published readiness",
        true,
    ))
}

#[tauri::command]
pub fn server_runtime_stop(app: AppHandle) -> Result<ServerRuntimeSnapshot, String> {
    let paths = RuntimePaths::resolve(&app)?;
    if !paths.status_root.join("runtime-status.json").is_file() {
        return Ok(unavailable(
            "local server is not initialized",
            paths.runtime_root.exists(),
        ));
    }
    run_service_agent(&paths, &["stop"], "stop the Server Agent")?;
    Ok(server_runtime_status(app)?)
}

#[tauri::command]
pub fn server_backup_status(app: AppHandle) -> Result<ServerBackupSnapshot, String> {
    let paths = RuntimePaths::resolve(&app)?;
    server_backup_status_from_paths(&paths)
}

#[tauri::command]
pub fn trigger_server_backup(app: AppHandle) -> Result<ServerBackupSnapshot, String> {
    let paths = RuntimePaths::resolve(&app)?;
    let status = server_runtime_status(app)?;
    if status.state != "ready" {
        return Err(
            "a protected backup can be requested only when the local server is ready".into(),
        );
    }
    run_service_agent(
        &paths,
        &[
            "request-backup",
            "--config",
            paths.config_path.to_string_lossy().as_ref(),
        ],
        "request a protected backup",
    )?;
    server_backup_status_from_paths(&paths)
}

#[tauri::command]
pub fn prepare_server_desktop_update(app: AppHandle) -> Result<ServerRuntimeSnapshot, String> {
    let paths = RuntimePaths::resolve(&app)?;
    let current = server_runtime_status(app.clone())?;
    if current.state != "ready" {
        return Err(
            "signed update installation is blocked until the local server reports ready".into(),
        );
    }
    run_service_agent(&paths, &["stop"], "stop the Server Agent")?;
    for _ in 0..180 {
        thread::sleep(Duration::from_millis(500));
        let status = server_runtime_status(app.clone())?;
        if status.state == "stopped" {
            return Ok(status);
        }
    }
    Err("local server did not confirm ordered shutdown before update installation".into())
}

struct RuntimePaths {
    runtime_root: PathBuf,
    config_path: PathBuf,
    status_root: PathBuf,
    agent_binary: PathBuf,
}

impl RuntimePaths {
    fn resolve(app: &AppHandle) -> Result<Self, String> {
        let tauri_resource_root = app
            .path()
            .resource_dir()
            .map_err(|error| format!("resolve packaged resource directory: {error}"))?;
        let executable_root = env::current_exe()
            .map_err(|error| format!("resolve Server Desktop executable: {error}"))?
            .parent()
            .map(PathBuf::from)
            .ok_or("resolve Server Desktop installation root from executable")?;

        let runtime_root = runtime_candidates(&tauri_resource_root, &executable_root)
            .into_iter()
            .find(|candidate| required_runtime_files_exist(candidate))
            .ok_or_else(|| {
                format!(
                    "resolve verified Server Desktop runtime for {}; checked resource layouts: {}",
                    runtime_target(),
                    runtime_candidates(&tauri_resource_root, &executable_root)
                        .iter()
                        .map(|candidate| candidate.display().to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            })?;

        let agent_binary = agent_candidates(&tauri_resource_root, &executable_root)
            .into_iter()
            .find(|candidate| candidate.is_file())
            .ok_or("resolve bundled ACCORE Server Agent beside the Server Desktop executable")?;

        let data_root = platform_data_root(app)?;
        let status_root = data_root
            .parent()
            .map(PathBuf::from)
            .unwrap_or_else(|| data_root.clone())
            .join("Server Status");
        Ok(Self {
            runtime_root,
            config_path: data_root.join("agent-config.json"),
            agent_binary,
            status_root,
        })
    }

    fn missing_resources(&self) -> Vec<&'static str> {
        let mut missing = Vec::new();
        if !self.runtime_root.join(frankenphp_name()).is_file() {
            missing.push("embedded FrankenPHP runtime");
        }
        if !self
            .runtime_root
            .join(mariadb_root_name())
            .join("bin")
            .join(mariadbd_name())
            .is_file()
        {
            missing.push("embedded MariaDB runtime");
        }
        if !self
            .runtime_root
            .join(mariadb_root_name())
            .join(mariadb_install_db_relative_path())
            .is_file()
        {
            missing.push("embedded MariaDB initializer");
        }
        if !self
            .runtime_root
            .join(mariadb_root_name())
            .join("bin")
            .join(mariadb_dump_name())
            .is_file()
        {
            missing.push("embedded MariaDB backup client");
        }
        if !self.agent_binary.is_file() {
            missing.push("ACCORE Server Agent");
        }
        missing
    }
}

fn runtime_candidates(resource_root: &Path, executable_root: &Path) -> Vec<PathBuf> {
    let target = runtime_target();
    vec![
        resource_root.join("resources/server-runtime").join(target),
        resource_root.join("server-runtime").join(target),
        executable_root
            .join("resources/server-runtime")
            .join(target),
        executable_root.join("server-runtime").join(target),
        executable_root
            .parent()
            .map(|contents_root| {
                contents_root
                    .join("Resources/resources/server-runtime")
                    .join(target)
            })
            .unwrap_or_default(),
    ]
}

fn agent_candidates(resource_root: &Path, executable_root: &Path) -> Vec<PathBuf> {
    let agent = agent_binary_name();
    vec![
        executable_root.join(agent),
        resource_root.join(agent),
        resource_root
            .parent()
            .map(|contents_root| contents_root.join("MacOS").join(agent))
            .unwrap_or_default(),
        resource_root
            .parent()
            .map(|installation_root| installation_root.join(agent))
            .unwrap_or_default(),
    ]
}

fn platform_data_root(app: &AppHandle) -> Result<PathBuf, String> {
    #[cfg(windows)]
    {
        return Ok(env::var_os("PROGRAMDATA")
            .map(PathBuf::from)
            .unwrap_or(
                app.path()
                    .app_local_data_dir()
                    .map_err(|error| format!("resolve application data directory: {error}"))?,
            )
            .join("ACCORE ERP")
            .join("Server"));
    }

    #[cfg(target_os = "linux")]
    {
        let _ = app;
        return Ok(PathBuf::from("/var/lib/accore-erp/server"));
    }

    #[cfg(target_os = "macos")]
    {
        let _ = app;
        return Ok(PathBuf::from(
            "/Library/Application Support/ACCORE ERP/Server",
        ));
    }

    #[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
    {
        let _ = app;
        Err("this platform is not supported by the embedded ACCORE Server runtime".into())
    }
}

fn start_service_agent(paths: &RuntimePaths) -> Result<(), String> {
    let (agent, managed_headless_agent) = lifecycle_agent(paths);
    if managed_headless_agent {
        return run_agent_with_elevation(
            &agent,
            &["attach", "--owner", SERVER_DESKTOP_OWNER],
            "attach the Server Desktop control surface to the protected Headless service",
        );
    }

    run_agent_with_elevation(
        &agent,
        &[
            "claim",
            "--owner",
            SERVER_DESKTOP_OWNER,
            "--runtime-root",
            paths.runtime_root.to_string_lossy().as_ref(),
        ],
        "claim or update the Server Desktop Agent",
    )
}

fn run_service_agent(
    paths: &RuntimePaths,
    arguments: &[&str],
    operation: &str,
) -> Result<(), String> {
    let (agent, _) = lifecycle_agent(paths);
    run_agent_with_elevation(&agent, arguments, operation)
}

fn lifecycle_agent(paths: &RuntimePaths) -> (PathBuf, bool) {
    #[cfg(target_os = "linux")]
    {
        let headless = PathBuf::from(LINUX_HEADLESS_AGENT);
        if headless.is_file() {
            return (headless, true);
        }
    }

    #[cfg(target_os = "macos")]
    {
        let headless = PathBuf::from(MACOS_HEADLESS_AGENT);
        if headless.is_file() {
            return (headless, true);
        }
    }

    (paths.agent_binary.clone(), false)
}

fn run_agent_with_elevation(
    agent_binary: &Path,
    arguments: &[&str],
    operation: &str,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        return launch_windows_elevated_agent(agent_binary, arguments, operation);
    }

    #[cfg(unix)]
    {
        require_trusted_unix_agent(agent_binary)?;
        return launch_unix_elevated_agent(agent_binary, arguments, operation);
    }

    #[cfg(not(any(windows, unix)))]
    {
        let _ = (agent_binary, arguments, operation);
        Err("this platform is not supported by the embedded ACCORE Server runtime".into())
    }
}

#[cfg(unix)]
fn require_trusted_unix_agent(agent_binary: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(agent_binary)
        .map_err(|error| format!("inspect Server Agent ownership before elevation: {error}"))?;
    if metadata.file_type().is_symlink() {
        return Err(format!(
            "refuse to elevate a Server Agent through symbolic link {}",
            agent_binary.display()
        ));
    }
    if metadata.uid() != 0 || metadata.mode() & 0o022 != 0 {
        return Err(format!(
            "refuse to elevate untrusted Server Agent {}; install the native Headless package or a root-owned Desktop system package first",
            agent_binary.display()
        ));
    }
    Ok(())
}

#[cfg(target_os = "linux")]
fn launch_unix_elevated_agent(
    agent_binary: &Path,
    arguments: &[&str],
    operation: &str,
) -> Result<(), String> {
    let status = Command::new("pkexec")
        .arg(agent_binary)
        .args(arguments)
        .status()
        .map_err(|error| {
            format!(
                "start Linux authorization for {operation}: {error}; install polkit or use the Headless system package"
            )
        })?;
    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "administrator authorization did not complete {operation} ({status})"
        ))
    }
}

#[cfg(target_os = "macos")]
fn launch_unix_elevated_agent(
    agent_binary: &Path,
    arguments: &[&str],
    operation: &str,
) -> Result<(), String> {
    const SCRIPT: &str = r#"on run argv
set commandLine to ""
repeat with argumentValue in argv
  set commandLine to commandLine & quoted form of (contents of argumentValue) & " "
end repeat
do shell script commandLine with administrator privileges
end run"#;

    let status = Command::new("osascript")
        .args(["-e", SCRIPT, "--"])
        .arg(agent_binary)
        .args(arguments)
        .status()
        .map_err(|error| format!("start macOS authorization for {operation}: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "administrator authorization did not complete {operation} ({status})"
        ))
    }
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
fn launch_unix_elevated_agent(
    agent_binary: &Path,
    arguments: &[&str],
    operation: &str,
) -> Result<(), String> {
    let _ = (agent_binary, arguments, operation);
    Err("this Unix target is not supported by the embedded ACCORE Server runtime".into())
}

fn runtime_target() -> &'static str {
    #[cfg(windows)]
    {
        "windows-x86_64"
    }
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        "linux-x86_64"
    }
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        "macos-aarch64"
    }
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        "macos-x86_64"
    }
    #[cfg(not(any(
        windows,
        all(target_os = "linux", target_arch = "x86_64"),
        all(target_os = "macos", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "x86_64")
    )))]
    {
        compile_error!("unsupported ACCORE Server Desktop runtime target")
    }
}

fn agent_binary_name() -> &'static str {
    #[cfg(windows)]
    {
        "accore-server-agent.exe"
    }
    #[cfg(not(windows))]
    {
        "accore-server-agent"
    }
}

fn frankenphp_name() -> &'static str {
    #[cfg(windows)]
    {
        "frankenphp.exe"
    }
    #[cfg(not(windows))]
    {
        "frankenphp"
    }
}

fn mariadb_root_name() -> &'static str {
    #[cfg(windows)]
    {
        "mariadb-11.4.9-winx64"
    }
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        "mariadb-11.4.9-linux-systemd-x86_64"
    }
    #[cfg(target_os = "macos")]
    {
        "mariadb"
    }
    #[cfg(not(any(
        windows,
        all(target_os = "linux", target_arch = "x86_64"),
        target_os = "macos"
    )))]
    {
        compile_error!("unsupported ACCORE Server MariaDB target")
    }
}

fn mariadbd_name() -> &'static str {
    #[cfg(windows)]
    {
        "mariadbd.exe"
    }
    #[cfg(not(windows))]
    {
        "mariadbd"
    }
}

fn mariadb_dump_name() -> &'static str {
    #[cfg(windows)]
    {
        "mariadb-dump.exe"
    }
    #[cfg(not(windows))]
    {
        "mariadb-dump"
    }
}

fn mariadb_install_db_relative_path() -> &'static str {
    #[cfg(windows)]
    {
        "bin/mariadb-install-db.exe"
    }
    #[cfg(target_os = "linux")]
    {
        "scripts/mariadb-install-db"
    }
    #[cfg(target_os = "macos")]
    {
        "scripts/mariadb-install-db"
    }
    #[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
    {
        compile_error!("unsupported ACCORE Server MariaDB target")
    }
}

fn required_runtime_files_exist(runtime_root: &Path) -> bool {
    runtime_root.join(frankenphp_name()).is_file()
        && runtime_root
            .join(mariadb_root_name())
            .join("bin")
            .join(mariadbd_name())
            .is_file()
        && runtime_root
            .join(mariadb_root_name())
            .join(mariadb_install_db_relative_path())
            .is_file()
        && runtime_root
            .join(mariadb_root_name())
            .join("bin")
            .join(mariadb_dump_name())
            .is_file()
}

fn unavailable(detail: impl Into<String>, runtime_present: bool) -> ServerRuntimeSnapshot {
    ServerRuntimeSnapshot {
        state: "unavailable".into(),
        detail: detail.into(),
        database: RuntimeComponentSnapshot {
            state: "unavailable".into(),
            detail: "not running".into(),
        },
        api: RuntimeComponentSnapshot {
            state: "unavailable".into(),
            detail: "not running".into(),
        },
        queue: RuntimeComponentSnapshot {
            state: "unavailable".into(),
            detail: "not running".into(),
        },
        backup: RuntimeComponentSnapshot {
            state: "unavailable".into(),
            detail: "not initialized".into(),
        },
        runtime_present,
        updated_at: None,
    }
}

fn server_backup_status_from_paths(paths: &RuntimePaths) -> Result<ServerBackupSnapshot, String> {
    let path = paths.status_root.join("backup-status.json");
    if !path.is_file() {
        return Ok(ServerBackupSnapshot {
            state: "unavailable".into(),
            detail: "backup policy has not published a status yet".into(),
            retained_restore_points: 0,
            last_backup_at_unix: None,
            last_verified_at_unix: None,
            updated_at_unix: None,
        });
    }
    serde_json::from_slice(
        &fs::read(path).map_err(|error| format!("read server backup status: {error}"))?,
    )
    .map_err(|error| format!("parse server backup status: {error}"))
}

#[cfg(windows)]
fn launch_windows_elevated_agent(
    agent_binary: &Path,
    arguments: &[&str],
    operation: &str,
) -> Result<(), String> {
    fn wide(value: &OsStr) -> Vec<u16> {
        value.encode_wide().chain(std::iter::once(0)).collect()
    }

    let verb = wide(OsStr::new("runas"));
    let executable = wide(agent_binary.as_os_str());
    let arguments = wide(OsStr::new(&windows_command_line(arguments)));
    let result = unsafe {
        ShellExecuteW(
            ptr::null_mut(),
            verb.as_ptr(),
            executable.as_ptr(),
            arguments.as_ptr(),
            ptr::null(),
            SW_HIDE,
        )
    };
    let result_code = result as usize;
    if result_code <= 32 {
        return Err(format!(
            "could not {operation} without a visible console; approve the Windows elevation prompt and retry (ShellExecute result {result_code})"
        ));
    }
    Ok(())
}

#[cfg(windows)]
fn windows_command_line(arguments: &[&str]) -> String {
    arguments
        .iter()
        .map(|argument| format!("\"{}\"", argument.replace('"', "\\\"")))
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_a_ready_agent_snapshot_without_bridge_only_runtime_presence() {
        let status = parse_published_runtime_snapshot(
            br#"{
              "state":"ready",
              "detail":"all local server components are ready",
              "database":{"state":"ready","detail":"MariaDB is ready"},
              "api":{"state":"ready","detail":"API is ready"},
              "queue":{"state":"ready","detail":"queue worker is running"},
              "backup":{"state":"ready","detail":"restore point is verified"},
              "updatedAt":1787315152
            }"#,
        )
        .expect("published Agent snapshots omit runtimePresent but must remain readable");

        assert_eq!(status.state, "ready");
        assert!(status.runtime_present);
        assert_eq!(status.updated_at, Some(1787315152));
    }

    #[test]
    fn platform_runtime_candidate_preserves_tauri_resource_layout() {
        let candidates = runtime_candidates(
            Path::new("/Application.app/Contents/Resources"),
            Path::new("/Application.app/Contents/MacOS"),
        );
        assert!(candidates.iter().any(|candidate| {
            candidate.ends_with(format!(
                "Resources/resources/server-runtime/{}",
                runtime_target()
            ))
        }));
    }

    #[test]
    fn platform_specific_runtime_contract_has_a_backup_client() {
        assert!(!frankenphp_name().is_empty());
        assert!(!mariadb_root_name().is_empty());
        assert!(!mariadb_dump_name().is_empty());
        assert!(!mariadb_install_db_relative_path().is_empty());
    }

    #[cfg(windows)]
    #[test]
    fn windows_agent_arguments_quote_runtime_paths() {
        assert_eq!(
            windows_command_line(&[
                "claim",
                "--runtime-root",
                "C:/Program Files/ACCORE ERP/resources/server-runtime/windows-x86_64",
            ]),
            "\"claim\" \"--runtime-root\" \"C:/Program Files/ACCORE ERP/resources/server-runtime/windows-x86_64\""
        );
    }
}
