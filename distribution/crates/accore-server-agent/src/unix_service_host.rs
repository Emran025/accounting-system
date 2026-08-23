#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
#[cfg(target_os = "macos")]
use std::path::PathBuf;
use std::{env, fs, path::Path, process::Command};

const LINUX_SERVICE_NAME: &str = "accore-server-agent.service";
const MACOS_SERVICE_LABEL: &str = "im.accore.server-agent";

pub fn harden_runtime_data(data_root: &Path, public_status_root: &Path) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        harden_linux_runtime_data(data_root)?;
        fs::create_dir_all(public_status_root)
            .map_err(|error| format!("create public server status directory: {error}"))?;
        run(
            "chown",
            [
                "-R",
                "accore:accore",
                public_status_root.to_string_lossy().as_ref(),
            ],
        )?;
        fs::set_permissions(public_status_root, fs::Permissions::from_mode(0o755))
            .map_err(|error| format!("set public server status permissions: {error}"))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        harden_macos_runtime_data(data_root)?;
        fs::create_dir_all(public_status_root)
            .map_err(|error| format!("create public server status directory: {error}"))?;
        fs::set_permissions(public_status_root, fs::Permissions::from_mode(0o755))
            .map_err(|error| format!("set public server status permissions: {error}"))?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = (data_root, public_status_root);
        Err("native service hosting is not available for this Unix target".into())
    }
}

pub fn make_public_status_file(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        fs::set_permissions(path, fs::Permissions::from_mode(0o644))
            .map_err(|error| format!("set public server status file permissions: {error}"))?;
    }
    Ok(())
}

pub fn reconcile_service(
    config_path: &Path,
    data_root: &Path,
    public_status_root: &Path,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        ensure_linux_service_account()?;
        harden_linux_runtime_data(data_root)?;
        write_linux_unit(config_path, data_root, public_status_root)?;
        run("systemctl", ["daemon-reload"])?;
        run("systemctl", ["enable", "--now", LINUX_SERVICE_NAME])?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        harden_macos_runtime_data(data_root)?;
        let plist = write_macos_launch_daemon(config_path)?;
        let _ = run(
            "launchctl",
            ["bootout", "system", plist.to_string_lossy().as_ref()],
        );
        run(
            "launchctl",
            ["bootstrap", "system", plist.to_string_lossy().as_ref()],
        )?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = (config_path, data_root, public_status_root);
        Err("native service hosting is not available for this Unix target".into())
    }
}

pub fn start_service() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        return run("systemctl", ["start", LINUX_SERVICE_NAME]);
    }

    #[cfg(target_os = "macos")]
    {
        return run(
            "launchctl",
            ["kickstart", "-k", &format!("system/{MACOS_SERVICE_LABEL}")],
        );
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    Err("native service hosting is not available for this Unix target".into())
}

pub fn stop_service() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        return run("systemctl", ["stop", LINUX_SERVICE_NAME]);
    }

    #[cfg(target_os = "macos")]
    {
        return run(
            "launchctl",
            ["kill", "SIGTERM", &format!("system/{MACOS_SERVICE_LABEL}")],
        );
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    Err("native service hosting is not available for this Unix target".into())
}

pub fn uninstall_service() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let _ = run("systemctl", ["disable", "--now", LINUX_SERVICE_NAME]);
        let unit = Path::new("/etc/systemd/system").join(LINUX_SERVICE_NAME);
        fs::remove_file(&unit)
            .map_err(|error| format!("remove systemd unit {}: {error}", unit.display()))?;
        return run("systemctl", ["daemon-reload"]);
    }

    #[cfg(target_os = "macos")]
    {
        let plist = launch_daemon_path();
        let _ = run(
            "launchctl",
            ["bootout", "system", plist.to_string_lossy().as_ref()],
        );
        return fs::remove_file(&plist)
            .map_err(|error| format!("remove LaunchDaemon {}: {error}", plist.display()));
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    Err("native service hosting is not available for this Unix target".into())
}

#[cfg(target_os = "linux")]
fn ensure_linux_service_account() -> Result<(), String> {
    if Command::new("id")
        .args(["-u", "accore"])
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
    {
        return Ok(());
    }

    run(
        "useradd",
        [
            "--system",
            "--user-group",
            "--home-dir",
            "/var/lib/accore-erp",
            "--shell",
            "/usr/sbin/nologin",
            "accore",
        ],
    )
}

#[cfg(target_os = "linux")]
fn harden_linux_runtime_data(data_root: &Path) -> Result<(), String> {
    fs::create_dir_all(data_root).map_err(|error| format!("create server data root: {error}"))?;
    run(
        "chown",
        ["-R", "accore:accore", data_root.to_string_lossy().as_ref()],
    )?;
    run(
        "chmod",
        ["-R", "u=rwX,g=,o=", data_root.to_string_lossy().as_ref()],
    )
}

#[cfg(target_os = "linux")]
fn write_linux_unit(
    config_path: &Path,
    data_root: &Path,
    public_status_root: &Path,
) -> Result<(), String> {
    let executable =
        env::current_exe().map_err(|error| format!("resolve Server Agent executable: {error}"))?;
    let unit_path = Path::new("/etc/systemd/system").join(LINUX_SERVICE_NAME);
    let unit = format!(
        "[Unit]\nDescription=ACCORE ERP Server Agent\nWants=network-online.target\nAfter=network-online.target\n\n[Service]\nType=exec\nUser=accore\nGroup=accore\nWorkingDirectory={}\nExecStart={} run --config {}\nRestart=on-failure\nRestartSec=3\nNoNewPrivileges=true\nCapabilityBoundingSet=\nPrivateTmp=true\nPrivateDevices=true\nProtectSystem=strict\nProtectHome=true\nProtectKernelTunables=true\nProtectKernelModules=true\nProtectKernelLogs=true\nProtectControlGroups=true\nProtectClock=true\nProtectHostname=true\nProtectProc=invisible\nProcSubset=pid\nRestrictAddressFamilies=AF_UNIX AF_INET AF_INET6\nRestrictNamespaces=true\nRestrictSUIDSGID=true\nLockPersonality=true\nSystemCallArchitectures=native\nSystemCallFilter=~@clock @cpu-emulation @debug @module @mount @obsolete @raw-io @reboot @swap\nReadWritePaths={} \"{}\"\nUMask=0077\n\n[Install]\nWantedBy=multi-user.target\n",
        data_root.display(),
        executable.display(),
        config_path.display(),
        data_root.display(),
        public_status_root.display(),
    );
    fs::write(&unit_path, unit)
        .map_err(|error| format!("write systemd unit {}: {error}", unit_path.display()))
}

#[cfg(target_os = "macos")]
fn harden_macos_runtime_data(data_root: &Path) -> Result<(), String> {
    fs::create_dir_all(data_root).map_err(|error| format!("create server data root: {error}"))?;
    run(
        "chown",
        ["-R", "root:wheel", data_root.to_string_lossy().as_ref()],
    )?;
    run(
        "chmod",
        ["-R", "u=rwX,g=,o=", data_root.to_string_lossy().as_ref()],
    )
}

#[cfg(target_os = "macos")]
fn write_macos_launch_daemon(config_path: &Path) -> Result<PathBuf, String> {
    let executable =
        env::current_exe().map_err(|error| format!("resolve Server Agent executable: {error}"))?;
    let path = launch_daemon_path();
    let plist = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\">\n<dict>\n  <key>Label</key><string>{}</string>\n  <key>ProgramArguments</key>\n  <array><string>{}</string><string>run</string><string>--config</string><string>{}</string></array>\n  <key>RunAtLoad</key><true/>\n  <key>KeepAlive</key><true/>\n  <key>ProcessType</key><string>Background</string>\n</dict>\n</plist>\n",
        MACOS_SERVICE_LABEL,
        xml_escape(&executable.to_string_lossy()),
        xml_escape(&config_path.to_string_lossy()),
    );
    fs::write(&path, plist)
        .map_err(|error| format!("write LaunchDaemon {}: {error}", path.display()))?;
    run("chown", ["root:wheel", path.to_string_lossy().as_ref()])?;
    run("chmod", ["600", path.to_string_lossy().as_ref()])?;
    Ok(path)
}

#[cfg(target_os = "macos")]
fn launch_daemon_path() -> PathBuf {
    Path::new("/Library/LaunchDaemons").join(format!("{MACOS_SERVICE_LABEL}.plist"))
}

#[cfg(target_os = "macos")]
fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn run<const N: usize>(command: &str, args: [&str; N]) -> Result<(), String> {
    let status = Command::new(command)
        .args(args)
        .status()
        .map_err(|error| format!("run {command}: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("{command} exited with {status}"))
    }
}
