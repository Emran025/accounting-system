use std::{
    env,
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    net::TcpStream,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use server_instance::{
    decide_installation, decide_transition, decide_uninstall, InstallationDecision,
    PublicServerInstanceReceipt, ServerInstanceManifest, ServerProductFlavor, TransitionDecision,
    UninstallDecision, SERVER_INSTANCE_SCHEMA_VERSION,
};
#[cfg(windows)]
use windows_sys::Win32::{
    Foundation::{CloseHandle, HANDLE},
    Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY},
    System::Threading::{GetCurrentProcess, OpenProcessToken},
};

mod backup;
mod server_instance;
mod unix_service_host;
mod windows_service_host;

const DATABASE_PORT: u16 = 3307;
const API_PORT: u16 = 8765;
const BACKUP_VALIDATION_PORT: u16 = 3308;
const READINESS_TIMEOUT: Duration = Duration::from_secs(90);
const MAX_RESTART_ATTEMPTS: u8 = 3;
const BACKUP_INTERVAL_SECONDS: u64 = 6 * 60 * 60;
// Use the well-known SID rather than a localized account name. `icacls` accepts
// numerical SIDs when prefixed with `*`; S-1-5-11 is Authenticated Users.
const PUBLIC_STATUS_READ_PRINCIPAL: &str = "*S-1-5-11:(OI)(CI)RX";
const PUBLIC_STATUS_FILE_READ_PRINCIPAL: &str = "*S-1-5-11:RX";
const SYSTEM_DIRECTORY_FULL_PRINCIPAL: &str = "*S-1-5-18:(OI)(CI)F";
const SYSTEM_FILE_FULL_PRINCIPAL: &str = "*S-1-5-18:F";
const ADMINISTRATORS_DIRECTORY_FULL_PRINCIPAL: &str = "*S-1-5-32-544:(OI)(CI)F";
const ADMINISTRATORS_FILE_FULL_PRINCIPAL: &str = "*S-1-5-32-544:F";

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeConfig {
    runtime_root: PathBuf,
    data_root: PathBuf,
    app_key: String,
    database_password: String,
    #[serde(default)]
    database_root_password: String,
    #[serde(default)]
    database_root_password_legacy_blank: bool,
    database_name: String,
    #[serde(default)]
    server_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ComponentStatus {
    state: String,
    detail: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeStatus {
    state: String,
    detail: String,
    phase: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_code: Option<String>,
    server_id: String,
    server_instance_id: String,
    owner_product: String,
    database: ComponentStatus,
    api: ComponentStatus,
    queue: ComponentStatus,
    backup: ComponentStatus,
    updated_at: u64,
}

impl RuntimeStatus {
    fn bootstrapping(config: &RuntimeConfig, detail: impl Into<String>) -> Self {
        Self {
            state: "bootstrapping".into(),
            detail: detail.into(),
            phase: "initializing".into(),
            error_code: None,
            server_id: config.server_id.clone(),
            server_instance_id: String::new(),
            owner_product: "unknown".into(),
            database: component("pending", "not started"),
            api: component("pending", "not started"),
            queue: component("pending", "not started"),
            backup: component("pending", "backup policy not yet active"),
            updated_at: now(),
        }
    }

    fn failed(&mut self, detail: impl Into<String>) {
        self.state = "unhealthy".into();
        self.detail = detail.into();
        if self.error_code.is_none() {
            self.phase = "failed".into();
            self.error_code = Some("runtime_failed".into());
        }
        self.updated_at = now();
    }

    fn entering(&mut self, phase: &str, detail: impl Into<String>) {
        self.state = "bootstrapping".into();
        self.phase = phase.into();
        self.error_code = None;
        self.detail = detail.into();
        self.updated_at = now();
    }

    fn failed_at(&mut self, phase: &str, error_code: &str, detail: impl Into<String>) {
        self.state = "unhealthy".into();
        self.phase = phase.into();
        self.error_code = Some(error_code.into());
        self.detail = detail.into();
        self.updated_at = now();
    }
}

fn main() {
    if let Err(error) = execute() {
        eprintln!("ACCORE Server Agent failed: {error}");
        std::process::exit(1);
    }
}

fn execute() -> Result<(), String> {
    let mut arguments = env::args().skip(1);
    let command = arguments.next().ok_or(
        "usage: accore-server-agent <run|service|claim|install|attach|transition|uninstall|status|stop|request-backup|seed-baseline> [--config <path>]",
    )?;

    match command.as_str() {
        "claim" | "install" => {
            let (owner, runtime_root) = read_owner_and_runtime_argument(
                &mut arguments,
                ServerProductFlavor::ServerDesktop,
            )?;
            install_embedded_service(owner, runtime_root.as_deref())
        }
        "uninstall" => uninstall_embedded_service(read_owner_argument(
            &mut arguments,
            ServerProductFlavor::ServerDesktop,
        )?),
        "attach" => attach_embedded_service(read_owner_argument(
            &mut arguments,
            ServerProductFlavor::ServerDesktop,
        )?),
        "transition" => {
            let (from, to) = read_transition_arguments(&mut arguments)?;
            transition_embedded_service(from, to)
        }
        "stop" => stop_embedded_service(),
        "run" | "service" | "status" | "request-backup" | "seed-baseline" => {
            let config_path = read_config_argument(&mut arguments)?;
            match command.as_str() {
                "run" => execute_with_config(Path::new(&config_path)),
                "service" => run_platform_service(config_path),
                "status" => print_status(&load_config(Path::new(&config_path))?),
                "request-backup" => request_backup_for_config(Path::new(&config_path)),
                "seed-baseline" => recover_baseline_seed_for_config(Path::new(&config_path)),
                _ => unreachable!(),
            }
        }
        _ => Err(format!("unsupported command {command}")),
    }
}

fn stop_embedded_service() -> Result<(), String> {
    #[cfg(windows)]
    {
        require_elevated_lifecycle()?;
        return windows_service_host::stop_service();
    }

    #[cfg(not(windows))]
    {
        unix_service_host::stop_service()
    }
}

fn run_platform_service(config_path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        return windows_service_host::run_service(config_path);
    }

    #[cfg(not(windows))]
    {
        execute_with_config(Path::new(&config_path))
    }
}

#[cfg(not(windows))]
fn install_unix_embedded_service(
    owner: ServerProductFlavor,
    runtime_root: Option<&Path>,
) -> Result<(), String> {
    let config_path = default_config_path()?;
    let existing_manifest = load_server_instance(&config_path)?;
    if config_path.is_file()
        && existing_manifest.is_none()
        && owner == ServerProductFlavor::ServerHeadless
    {
        return Err("a legacy Server Desktop instance exists without a server-instance manifest; migrate or transition it explicitly before installing Server Headless".into());
    }
    match decide_installation(existing_manifest.as_ref(), owner)? {
        InstallationDecision::AttachAsDesktopManager => return Err(
            "a Server Headless-owned instance must be attached with the explicit attach operation"
                .into(),
        ),
        InstallationDecision::ClaimOrUpdate => {}
    }

    let mut config = embedded_runtime_config(runtime_root)?;
    if config_path.is_file() {
        carry_durable_configuration(&mut config, load_config(&config_path)?);
    }
    ensure_layout(&config)?;
    harden_runtime_data_access(&config)?;
    write_config(&config_path, &config)?;
    let manifest = write_server_instance(&config, owner, &config_path, existing_manifest)?;
    let operation_id = new_operation_id();
    write_public_receipt(
        &config,
        &PublicServerInstanceReceipt::transitioning(&manifest, owner, operation_id.clone(), now()),
    )?;
    unix_service_host::reconcile_service(
        &config_path,
        &config.data_root,
        &public_status_root(&config),
    )?;
    write_public_instance_receipt(&config, &manifest, operation_id)
}

#[cfg(not(windows))]
fn transition_unix_embedded_service(
    from: ServerProductFlavor,
    to: ServerProductFlavor,
) -> Result<(), String> {
    let config_path = default_config_path()?;
    let existing = load_server_instance(&config_path)?
        .ok_or("cannot transition a server instance without a server-instance manifest")?;
    match decide_transition(Some(&existing), from, to)? {
        TransitionDecision::UpdateOwner => {}
    }
    let config = load_config(&config_path)?;
    ensure_layout(&config)?;
    harden_runtime_data_access(&config)?;
    let operation_id = new_operation_id();
    write_public_receipt(
        &config,
        &PublicServerInstanceReceipt::transitioning(&existing, to, operation_id.clone(), now()),
    )?;
    let manifest = write_server_instance(&config, to, &config_path, Some(existing))?;
    unix_service_host::reconcile_service(
        &config_path,
        &config.data_root,
        &public_status_root(&config),
    )?;
    write_public_instance_receipt(&config, &manifest, operation_id)
}

#[cfg(not(windows))]
fn uninstall_unix_embedded_service(owner: ServerProductFlavor) -> Result<(), String> {
    let config_path = default_config_path()?;
    let manifest = load_server_instance(&config_path)?
        .ok_or("cannot remove a server instance without a server-instance manifest")?;
    match decide_uninstall(Some(&manifest), owner)? {
        UninstallDecision::PassivePackageRemoval => Ok(()),
        UninstallDecision::ActiveRemoval => {
            let config = load_config(&config_path)?;
            request_stop(&config)?;
            unix_service_host::uninstall_service()?;
            write_public_receipt(
                &config,
                &PublicServerInstanceReceipt::removed(&manifest, new_operation_id()),
            )
        }
    }
}

#[cfg(windows)]
fn require_elevated_lifecycle() -> Result<(), String> {
    let mut token: HANDLE = std::ptr::null_mut();
    let opened = unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) };
    if opened == 0 {
        return Err("inspect the current Windows token before lifecycle mutation".into());
    }

    let mut elevation = TOKEN_ELEVATION::default();
    let mut reported_size = 0;
    let loaded = unsafe {
        GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut TOKEN_ELEVATION as *mut std::ffi::c_void,
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut reported_size,
        )
    };
    unsafe {
        CloseHandle(token);
    }
    if loaded == 0 {
        return Err("inspect Windows elevation before lifecycle mutation".into());
    }
    require_elevated_lifecycle_status(elevation.TokenIsElevated != 0)
}

fn require_elevated_lifecycle_status(is_elevated: bool) -> Result<(), String> {
    if is_elevated {
        return Ok(());
    }
    Err(
        "claim, attach, transition, uninstall, and stop require Windows elevation before protected Server data or service configuration can be changed".into(),
    )
}

fn read_owner_argument(
    arguments: &mut impl Iterator<Item = String>,
    default_owner: ServerProductFlavor,
) -> Result<ServerProductFlavor, String> {
    let (owner, runtime_root) = read_owner_and_runtime_argument(arguments, default_owner)?;
    if runtime_root.is_some() {
        return Err("--runtime-root is permitted only with claim or install".into());
    }
    Ok(owner)
}

fn read_owner_and_runtime_argument(
    arguments: &mut impl Iterator<Item = String>,
    default_owner: ServerProductFlavor,
) -> Result<(ServerProductFlavor, Option<PathBuf>), String> {
    let mut owner = default_owner;
    let mut owner_supplied = false;
    let mut runtime_root = None;
    while let Some(flag) = arguments.next() {
        match flag.as_str() {
            "--owner" if !owner_supplied => {
                owner = ServerProductFlavor::parse(&arguments.next().ok_or("missing owner")?)?;
                owner_supplied = true;
            }
            "--runtime-root" if runtime_root.is_none() => {
                let value = arguments.next().ok_or("missing runtime root")?;
                let path = PathBuf::from(value);
                if !path.is_absolute() {
                    return Err("--runtime-root must be an absolute path".into());
                }
                runtime_root = Some(path);
            }
            "--owner" => return Err("--owner may be supplied only once".into()),
            "--runtime-root" => return Err("--runtime-root may be supplied only once".into()),
            _ => return Err(format!("unexpected lifecycle argument: {flag}")),
        }
    }
    Ok((owner, runtime_root))
}

fn read_config_argument(arguments: &mut impl Iterator<Item = String>) -> Result<String, String> {
    let flag = arguments.next().ok_or("missing --config")?;
    let config_path = arguments.next().ok_or("missing config path")?;
    if flag != "--config" {
        return Err("usage: accore-server-agent <run|service|status> --config <path>".into());
    }
    Ok(config_path)
}

fn read_transition_arguments(
    arguments: &mut impl Iterator<Item = String>,
) -> Result<(ServerProductFlavor, ServerProductFlavor), String> {
    let from_flag = arguments.next().ok_or("missing --from")?;
    let from = arguments.next().ok_or("missing transition source owner")?;
    let to_flag = arguments.next().ok_or("missing --to")?;
    let to = arguments
        .next()
        .ok_or("missing transition destination owner")?;
    if from_flag != "--from" || to_flag != "--to" || arguments.next().is_some() {
        return Err("usage: accore-server-agent transition --from <owner> --to <owner>".into());
    }
    Ok((
        ServerProductFlavor::parse(&from)?,
        ServerProductFlavor::parse(&to)?,
    ))
}

fn install_embedded_service(
    owner: ServerProductFlavor,
    runtime_root: Option<&Path>,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        require_elevated_lifecycle()?;
        let config_path = default_config_path()?;
        let existing_manifest = load_server_instance(&config_path)?;
        if config_path.is_file()
            && existing_manifest.is_none()
            && owner == ServerProductFlavor::ServerHeadless
        {
            return Err("a legacy Server Desktop instance exists without a server-instance manifest; migrate or transition it explicitly before installing Server Headless".into());
        }
        match decide_installation(existing_manifest.as_ref(), owner)? {
            InstallationDecision::AttachAsDesktopManager => {
                return Err("a Server Headless-owned instance must be attached with the explicit attach operation".into())
            }
            InstallationDecision::ClaimOrUpdate => {}
        }
        let mut config = embedded_runtime_config(runtime_root)?;
        if config_path.is_file() {
            let existing = load_config(&config_path)?;
            carry_durable_configuration(&mut config, existing);
        }
        ensure_layout(&config)?;
        harden_runtime_data_access(&config)?;
        write_config(&config_path, &config)?;
        let manifest = write_server_instance(&config, owner, &config_path, existing_manifest)?;
        let operation_id = new_operation_id();
        write_public_receipt(
            &config,
            &PublicServerInstanceReceipt::transitioning(
                &manifest,
                owner,
                operation_id.clone(),
                now(),
            ),
        )?;
        windows_service_host::reconcile_service(config_path.display().to_string())?;
        write_public_instance_receipt(&config, &manifest, operation_id)
    }

    #[cfg(not(windows))]
    {
        install_unix_embedded_service(owner, runtime_root)
    }
}

fn attach_embedded_service(owner: ServerProductFlavor) -> Result<(), String> {
    #[cfg(windows)]
    {
        require_elevated_lifecycle()?;
        let config_path = default_config_path()?;
        match decide_installation(load_server_instance(&config_path)?.as_ref(), owner)? {
            InstallationDecision::AttachAsDesktopManager => windows_service_host::start_service(),
            InstallationDecision::ClaimOrUpdate => Err(
                "attach is permitted only for Server Desktop against an active Server Headless-owned instance".into(),
            ),
        }
    }

    #[cfg(not(windows))]
    {
        match decide_installation(load_server_instance(&default_config_path()?)?.as_ref(), owner)? {
            InstallationDecision::AttachAsDesktopManager => unix_service_host::start_service(),
            InstallationDecision::ClaimOrUpdate => Err(
                "attach is permitted only for Server Desktop against an active Server Headless-owned instance".into(),
            ),
        }
    }
}

fn transition_embedded_service(
    from: ServerProductFlavor,
    to: ServerProductFlavor,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        require_elevated_lifecycle()?;
        let config_path = default_config_path()?;
        let existing = load_server_instance(&config_path)?
            .ok_or("cannot transition a server instance without a server-instance manifest")?;
        match decide_transition(Some(&existing), from, to)? {
            TransitionDecision::UpdateOwner => {}
        }
        let config = load_config(&config_path)?;
        ensure_layout(&config)?;
        harden_runtime_data_access(&config)?;
        let operation_id = new_operation_id();
        write_public_receipt(
            &config,
            &PublicServerInstanceReceipt::transitioning(&existing, to, operation_id.clone(), now()),
        )?;
        let manifest = write_server_instance(&config, to, &config_path, Some(existing))?;
        windows_service_host::reconcile_service(config_path.display().to_string())?;
        write_public_instance_receipt(&config, &manifest, operation_id)
    }

    #[cfg(not(windows))]
    {
        transition_unix_embedded_service(from, to)
    }
}

fn uninstall_embedded_service(owner: ServerProductFlavor) -> Result<(), String> {
    #[cfg(windows)]
    {
        require_elevated_lifecycle()?;
        let config_path = default_config_path()?;
        let manifest = load_server_instance(&config_path)?
            .ok_or("cannot remove a server instance without a server-instance manifest")?;
        match decide_uninstall(Some(&manifest), owner)? {
            UninstallDecision::PassivePackageRemoval => Ok(()),
            UninstallDecision::ActiveRemoval => {
                let config = load_config(&config_path)?;
                request_stop(&config)?;
                windows_service_host::uninstall_service()?;
                write_public_receipt(
                    &config,
                    &PublicServerInstanceReceipt::removed(&manifest, new_operation_id()),
                )
            }
        }
    }

    #[cfg(not(windows))]
    {
        uninstall_unix_embedded_service(owner)
    }
}

fn execute_with_config(path: &Path) -> Result<(), String> {
    run(load_config(path)?)
}

#[cfg(windows)]
fn execute_service_with_config(path: &Path) -> Result<(), String> {
    let config = load_config(path)?;
    ensure_layout(&config)?;
    harden_runtime_data_access(&config)?;
    run(config)
}

fn run(config: RuntimeConfig) -> Result<(), String> {
    ensure_layout(&config)?;
    let mut backup = backup::BackupRuntime::open(&config)?;
    let mut status = RuntimeStatus::bootstrapping(&config, "preparing durable local runtime");
    apply_public_instance_identity(&config, &mut status);
    write_status(&config, &status)?;

    let mut restart_attempts = 0;
    loop {
        match run_components(&config, &mut status, &mut backup) {
            Ok(()) => return Ok(()),
            Err(error) => {
                restart_attempts += 1;
                if restart_attempts > MAX_RESTART_ATTEMPTS {
                    status.failed(format!(
                        "local server stopped after {MAX_RESTART_ATTEMPTS} recovery attempts: {error}"
                    ));
                    let _ = write_status(&config, &status);
                    return Err(error);
                }

                let delay = Duration::from_secs(u64::from(restart_attempts) * 2);
                status.state = "recovering".into();
                status.detail = format!(
                    "{error}; restarting local components in {} seconds (attempt {restart_attempts}/{MAX_RESTART_ATTEMPTS})",
                    delay.as_secs()
                );
                status.database = component("recovering", "waiting for controlled restart");
                status.api = component("recovering", "waiting for controlled restart");
                status.queue = component("recovering", "waiting for controlled restart");
                status.updated_at = now();
                let _ = write_status(&config, &status);
                thread::sleep(delay);
            }
        }
    }
}

fn run_components(
    config: &RuntimeConfig,
    status: &mut RuntimeStatus,
    backup: &mut backup::BackupRuntime,
) -> Result<(), String> {
    let mut database = None;
    let mut api = None;
    let mut queue = None;
    let result = (|| {
        status.entering(
            "database_initialization",
            "preparing embedded MariaDB data files",
        );
        write_status(config, status)?;
        initialise_database(config)?;
        ensure_port_is_free(DATABASE_PORT, "MariaDB")?;
        status.entering("database_start", "starting MariaDB on loopback");
        status.database = component("starting", "starting MariaDB on loopback");
        write_status(config, status)?;
        database = Some(start_database(config)?);
        wait_for_port(DATABASE_PORT, "MariaDB")?;
        ensure_child_is_running(database.as_mut().expect("database child exists"), "MariaDB")?;
        provision_database_principal(config)?;
        status.database = component("ready", "MariaDB is ready on 127.0.0.1:3307");
        write_status(config, status)?;

        status.entering(
            "application_provisioning",
            "applying database migrations and seed revisions",
        );
        provision_application(config, status)?;
        ensure_port_is_free(API_PORT, "ACCORE API")?;
        status.entering("api_configuration", "validating FrankenPHP configuration");
        let api_config_path = prepare_api_configuration(config)?;
        if let Err(error) = validate_api_configuration(config, &api_config_path) {
            status.failed_at(
                "api_configuration",
                "api_configuration_invalid",
                error.clone(),
            );
            let _ = write_status(config, status);
            Err(error)?;
        }
        status.entering("api_start", "starting FrankenPHP API on loopback");
        status.api = component("starting", "starting FrankenPHP API on loopback");
        write_status(config, status)?;
        api = Some(start_api(config, &api_config_path)?);
        wait_for_http_ok(API_PORT, "/up", "ACCORE API")?;
        ensure_child_is_running(api.as_mut().expect("API child exists"), "ACCORE API")?;
        status.api = component("ready", "API is ready on http://127.0.0.1:8765/up");
        write_status(config, status)?;

        status.entering("queue_start", "starting Laravel queue worker");
        status.queue = component("starting", "starting Laravel queue worker");
        write_status(config, status)?;
        queue = Some(start_queue(config)?);
        thread::sleep(Duration::from_millis(250));
        ensure_child_is_running(queue.as_mut().expect("queue child exists"), "queue worker")?;
        status.queue = component("ready", "queue worker is running");
        status.backup = backup.component_status();
        status.state = "ready".into();
        status.phase = "ready".into();
        status.detail = "all local server components are ready".into();
        status.updated_at = now();
        write_status(config, status)?;

        loop {
            if stop_requested(config) {
                status.state = "stopping".into();
                status.detail = "ordered shutdown requested".into();
                write_status(config, status)?;
                terminate_optional(&mut queue);
                terminate_optional(&mut api);
                terminate_optional(&mut database);
                status.state = "stopped".into();
                status.detail = "local server stopped".into();
                status.queue = component("stopped", "queue stopped");
                status.api = component("stopped", "API stopped");
                status.database = component("stopped", "MariaDB stopped");
                status.backup = component(
                    "pending",
                    "backup policy paused while local server is stopped",
                );
                write_status(config, status)?;
                return Ok(());
            }

            if let Some(next_backup_status) = backup.maintain(backup_requested(config)) {
                status.backup = next_backup_status;
                status.updated_at = now();
                write_status(config, status)?;
            }

            if let Some(reason) =
                child_exit(database.as_mut().expect("database child exists"), "MariaDB")
            {
                return Err(reason);
            }
            if let Some(reason) = child_exit(api.as_mut().expect("API child exists"), "API") {
                return Err(reason);
            }
            if let Some(reason) =
                child_exit(queue.as_mut().expect("queue child exists"), "queue worker")
            {
                return Err(reason);
            }
            thread::sleep(Duration::from_secs(2));
        }
    })();

    if result.is_err() {
        terminate_optional(&mut queue);
        terminate_optional(&mut api);
        terminate_optional(&mut database);
    }
    result
}

fn initialise_database(config: &RuntimeConfig) -> Result<(), String> {
    let marker = config.data_root.join("accoredb").join(".initialized");
    if marker.exists() {
        return Ok(());
    }
    let installer = mariadb_install_db(config);
    run_checked(
        Command::new(installer)
            .arg(format!("--datadir={}", database_data(config).display()))
            .arg(format!("--password={}", config.database_root_password))
            .arg(format!("--port={DATABASE_PORT}")),
        "initialize MariaDB data directory",
    )?;
    File::create(marker)
        .map_err(|error| format!("write MariaDB initialization marker: {error}"))?;
    Ok(())
}

fn provision_database_principal(config: &RuntimeConfig) -> Result<(), String> {
    let marker = config
        .data_root
        .join("accoredb")
        .join(".principal-provisioned");
    let root_marker = config
        .data_root
        .join("accoredb")
        .join(".root-credential-provisioned");
    let database = &config.database_name;
    let password = &config.database_password;
    let mut statements = Vec::new();
    if !root_marker.exists() {
        statements.push(format!(
            "ALTER USER 'root'@'localhost' IDENTIFIED BY '{}'; \
             DELETE FROM mysql.global_priv WHERE User = ''; \
             DROP DATABASE IF EXISTS test;",
            config.database_root_password
        ));
    }
    statements.push(format!(
        "CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; \
         CREATE USER IF NOT EXISTS 'accore_app'@'localhost' IDENTIFIED BY '{password}'; \
         CREATE USER IF NOT EXISTS 'accore_app'@'127.0.0.1' IDENTIFIED BY '{password}'; \
         ALTER USER 'accore_app'@'localhost' IDENTIFIED BY '{password}'; \
         ALTER USER 'accore_app'@'127.0.0.1' IDENTIFIED BY '{password}'; \
         GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, CREATE VIEW, SHOW VIEW ON `{database}`.* TO 'accore_app'@'localhost'; \
         GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, CREATE VIEW, SHOW VIEW ON `{database}`.* TO 'accore_app'@'127.0.0.1';"
    ));
    statements.push("FLUSH PRIVILEGES;".into());
    let source_root_password = if config.database_root_password_legacy_blank {
        ""
    } else {
        &config.database_root_password
    };
    run_checked(
        Command::new(mariadb_bin(config, mariadb_name()))
            .args(["--no-defaults", "--protocol=tcp", "--host=127.0.0.1"])
            .arg(format!("--port={DATABASE_PORT}"))
            .arg("--user=root")
            .arg(format!("--password={source_root_password}"))
            .arg(format!("--execute={}", statements.join(" "))),
        "provision ACCORE database principal",
    )?;
    if !marker.exists() {
        File::create(marker)
            .map_err(|error| format!("write database principal marker: {error}"))?;
    }
    if !root_marker.exists() {
        File::create(root_marker)
            .map_err(|error| format!("write root credential marker: {error}"))?;
    }
    Ok(())
}

fn start_database(config: &RuntimeConfig) -> Result<Child, String> {
    let log = File::create(log_path(config, "mariadb.log"))
        .map_err(|error| format!("open MariaDB log: {error}"))?;
    Command::new(mariadb_bin(config, mariadbd_name()))
        .arg("--no-defaults")
        .arg(format!(
            "--basedir={}",
            config.runtime_root.join(mariadb_root_name()).display()
        ))
        .arg(format!("--datadir={}", database_data(config).display()))
        .arg("--bind-address=127.0.0.1")
        .arg(format!("--port={DATABASE_PORT}"))
        .arg("--skip-name-resolve")
        .stdout(Stdio::from(
            log.try_clone()
                .map_err(|error| format!("clone MariaDB log: {error}"))?,
        ))
        .stderr(Stdio::from(log))
        .spawn()
        .map_err(|error| format!("start MariaDB: {error}"))
}

fn provision_application(config: &RuntimeConfig, status: &mut RuntimeStatus) -> Result<(), String> {
    let storage = config.data_root.join("laravel-storage");
    for path in [
        storage.join("app/public"),
        storage.join("framework/cache/data"),
        storage.join("framework/sessions"),
        storage.join("framework/views"),
        storage.join("logs"),
    ] {
        fs::create_dir_all(path)
            .map_err(|error| format!("create durable Laravel runtime directory: {error}"))?;
    }
    match fs::remove_file(app_root(config).join(".env")) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => {
            return Err(format!(
                "remove legacy packaged Laravel environment: {error}"
            ))
        }
    }

    let provisioning_log = log_path(config, "provisioning.log");
    File::create(&provisioning_log)
        .map_err(|error| format!("reset Laravel provisioning log: {error}"))?;

    status.detail = "applying required Laravel migrations".into();
    write_status(config, status)?;
    let mut migrate = application_command(config, ["php-cli", "artisan", "migrate", "--force"]);
    run_checked_logged(&mut migrate, "run Laravel migrations", &provisioning_log)?;

    status.detail = "applying pending ACCORE desktop seed revisions".into();
    write_status(config, status)?;
    run_desktop_seed_revisions(config, &provisioning_log)
}

fn run_desktop_seed_revisions(
    config: &RuntimeConfig,
    provisioning_log: &Path,
) -> Result<(), String> {
    let seed_state_path = config.data_root.join("desktop-seed-state.json");
    let mut seed = application_command(config, ["php-cli", "artisan", "accore:desktop:seed"]);
    seed.arg("--state-path").arg(seed_state_path);
    run_checked_logged(
        &mut seed,
        "apply pending ACCORE desktop seed revisions",
        provisioning_log,
    )
}

fn runtime_caddyfile_path(config: &RuntimeConfig) -> PathBuf {
    config.data_root.join("runtime.Caddyfile")
}

fn caddy_path_literal(path: &Path) -> String {
    path.display()
        .to_string()
        .replace('\\', "/")
        .replace('"', "\\\"")
}

fn prepare_api_configuration(config: &RuntimeConfig) -> Result<PathBuf, String> {
    let path = runtime_caddyfile_path(config);
    fs::write(&path, api_configuration_content(config))
        .map_err(|error| format!("write protected FrankenPHP configuration: {error}"))?;
    Ok(path)
}

fn api_configuration_content(config: &RuntimeConfig) -> String {
    let public_root = caddy_path_literal(&app_root(config).join("public"));
    format!(
        "{{\n  auto_https off\n  admin off\n  frankenphp\n}}\n\nhttp://127.0.0.1:{API_PORT} {{\n  root * \"{public_root}\"\n  encode zstd gzip\n  php_server\n}}\n"
    )
}

fn validate_api_configuration(config: &RuntimeConfig, path: &Path) -> Result<(), String> {
    let output = Command::new(frankenphp(config))
        .args(["validate", "--config"])
        .arg(path)
        .args(["--adapter", "caddyfile"])
        .current_dir(app_root(config))
        .output()
        .map_err(|error| format!("launch FrankenPHP configuration validation: {error}"))?;
    if output.status.success() {
        return Ok(());
    }
    let diagnostic = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    Err(format!(
        "FrankenPHP configuration validation exited with {}{}",
        output.status,
        if diagnostic.is_empty() {
            String::new()
        } else {
            format!(": {diagnostic}")
        }
    ))
}

fn start_api(config: &RuntimeConfig, caddyfile: &Path) -> Result<Child, String> {
    let log = File::create(log_path(config, "api.log"))
        .map_err(|error| format!("open API log: {error}"))?;
    let mut command = Command::new(frankenphp(config));
    command
        .args(["run", "--config"])
        .arg(caddyfile)
        .current_dir(app_root(config))
        .env("ACCORE_APP_ROOT", app_root(config))
        .envs(application_environment(config))
        .stdout(Stdio::from(
            log.try_clone()
                .map_err(|error| format!("clone API log: {error}"))?,
        ))
        .stderr(Stdio::from(log));
    command
        .spawn()
        .map_err(|error| format!("start FrankenPHP API: {error}"))
}

fn start_queue(config: &RuntimeConfig) -> Result<Child, String> {
    let log = File::create(log_path(config, "queue.log"))
        .map_err(|error| format!("open queue log: {error}"))?;
    let mut command = application_command(
        config,
        [
            "php-cli",
            "artisan",
            "queue:work",
            "--sleep=1",
            "--tries=3",
            "--timeout=90",
        ],
    );
    command
        .stdout(Stdio::from(
            log.try_clone()
                .map_err(|error| format!("clone queue log: {error}"))?,
        ))
        .stderr(Stdio::from(log));
    command
        .spawn()
        .map_err(|error| format!("start queue worker: {error}"))
}

fn application_command<const N: usize>(config: &RuntimeConfig, arguments: [&str; N]) -> Command {
    let mut command = Command::new(frankenphp(config));
    command
        .args(arguments)
        .current_dir(app_root(config))
        .envs(application_environment(config));
    command
}

fn application_environment(config: &RuntimeConfig) -> Vec<(&'static str, String)> {
    let storage = config
        .data_root
        .join("laravel-storage")
        .display()
        .to_string()
        .replace('\\', "/");
    vec![
        ("APP_NAME", "ACCORE ERP".into()),
        ("APP_ENV", "production".into()),
        ("APP_KEY", config.app_key.clone()),
        ("APP_DEBUG", "false".into()),
        ("APP_URL", format!("http://127.0.0.1:{API_PORT}")),
        ("LARAVEL_STORAGE_PATH", storage),
        ("PHPRC", config.runtime_root.display().to_string()),
        ("LOG_CHANNEL", "single".into()),
        ("LOG_LEVEL", "info".into()),
        ("DB_CONNECTION", "mysql".into()),
        ("DB_HOST", "127.0.0.1".into()),
        ("DB_PORT", DATABASE_PORT.to_string()),
        ("DB_DATABASE", config.database_name.clone()),
        ("DB_USERNAME", "accore_app".into()),
        ("DB_PASSWORD", config.database_password.clone()),
        ("SESSION_DRIVER", "file".into()),
        ("CACHE_STORE", "file".into()),
        ("QUEUE_CONNECTION", "database".into()),
    ]
}

fn wait_for_port(port: u16, component: &str) -> Result<(), String> {
    let started = std::time::Instant::now();
    while started.elapsed() < READINESS_TIMEOUT {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(500));
    }
    Err(format!(
        "{component} did not become ready within {} seconds",
        READINESS_TIMEOUT.as_secs()
    ))
}

fn ensure_port_is_free(port: u16, component: &str) -> Result<(), String> {
    if TcpStream::connect(("127.0.0.1", port)).is_ok() {
        return Err(format!(
            "{component} cannot start because 127.0.0.1:{port} is already in use by another local process"
        ));
    }
    Ok(())
}

fn wait_for_http_ok(port: u16, path: &str, component: &str) -> Result<(), String> {
    let started = std::time::Instant::now();
    while started.elapsed() < READINESS_TIMEOUT {
        if let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) {
            let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
            let request =
                format!("GET {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n");
            if stream.write_all(request.as_bytes()).is_ok() {
                let mut response = String::new();
                if stream.read_to_string(&mut response).is_ok()
                    && (response.starts_with("HTTP/1.1 200")
                        || response.starts_with("HTTP/1.0 200"))
                {
                    return Ok(());
                }
            }
        }
        thread::sleep(Duration::from_millis(500));
    }
    Err(format!(
        "{component} did not return HTTP 200 from {path} within {} seconds",
        READINESS_TIMEOUT.as_secs()
    ))
}

fn run_checked(command: &mut Command, description: &str) -> Result<(), String> {
    let output = command
        .output()
        .map_err(|error| format!("{description}: {error}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let diagnostic = if stderr.trim().is_empty() {
            stdout.trim()
        } else {
            stderr.trim()
        };
        Err(format!(
            "{description} exited with {}: {}",
            output.status, diagnostic
        ))
    }
}

fn run_checked_logged(
    command: &mut Command,
    description: &str,
    log_path: &Path,
) -> Result<(), String> {
    let mut log = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|error| format!("open Laravel provisioning log: {error}"))?;
    writeln!(log, "\n=== {description} ===")
        .map_err(|error| format!("write Laravel provisioning log header: {error}"))?;
    let stdout = log
        .try_clone()
        .map_err(|error| format!("clone Laravel provisioning log: {error}"))?;
    command.stdout(Stdio::from(stdout)).stderr(Stdio::from(log));

    let status = command
        .status()
        .map_err(|error| format!("{description}: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "{description} exited with {status}; inspect {}",
            log_path.display()
        ))
    }
}

fn child_exit(child: &mut Child, component: &str) -> Option<String> {
    match child.try_wait() {
        Ok(Some(status)) => Some(format!("{component} exited unexpectedly with {status}")),
        Ok(None) => None,
        Err(error) => Some(format!("could not inspect {component}: {error}")),
    }
}

fn ensure_child_is_running(child: &mut Child, component: &str) -> Result<(), String> {
    child_exit(child, component).map_or(Ok(()), Err)
}

fn terminate(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

fn terminate_optional(child: &mut Option<Child>) {
    if let Some(child) = child.as_mut() {
        terminate(child);
    }
}

fn print_status(config: &RuntimeConfig) -> Result<(), String> {
    let status = fs::read_to_string(status_path(config))
        .map_err(|error| format!("read runtime status: {error}"))?;
    print!("{status}");
    Ok(())
}

fn write_status(config: &RuntimeConfig, status: &RuntimeStatus) -> Result<(), String> {
    write_public_json_atomically(&status_path(config), status, "runtime status")
}

fn request_stop(config: &RuntimeConfig) -> Result<(), String> {
    fs::write(config.data_root.join("control.stop"), "requested\n")
        .map_err(|error| format!("request runtime stop: {error}"))
}

fn request_stop_for_config(path: &Path) -> Result<(), String> {
    request_stop(&load_config(path)?)
}

fn request_backup_for_config(path: &Path) -> Result<(), String> {
    let config = load_config(path)?;
    fs::write(config.data_root.join("control.backup"), "requested\n")
        .map_err(|error| format!("request protected backup: {error}"))
}

fn recover_baseline_seed_for_config(path: &Path) -> Result<(), String> {
    let config = load_config(path)?;
    let user_count = database_scalar_count(&config, "SELECT COUNT(*) FROM users;")?;
    if user_count > 0 {
        println!("baseline seed recovery skipped: {user_count} user account(s) already exist");
        return Ok(());
    }

    let mut seed = application_command(&config, ["php-cli", "artisan", "db:seed", "--force"]);
    run_checked(&mut seed, "apply guarded ACCORE baseline seed")?;

    let active_admin_count = database_scalar_count(
        &config,
        "SELECT COUNT(*) FROM users WHERE username = 'admin' AND is_active = 1;",
    )?;
    if active_admin_count != 1 {
        return Err(
            "guarded baseline seed completed without creating one active administrator".into(),
        );
    }

    println!("baseline seed recovery completed: active administrator account is ready");
    Ok(())
}

fn database_scalar_count(config: &RuntimeConfig, query: &str) -> Result<u64, String> {
    let output = Command::new(mariadb_bin(config, mariadb_name()))
        .args(["--no-defaults", "--protocol=tcp", "--host=127.0.0.1"])
        .arg(format!("--port={DATABASE_PORT}"))
        .arg("--user=accore_app")
        .arg(format!("--password={}", config.database_password))
        .args(["--batch", "--skip-column-names"])
        .arg(format!("--database={}", config.database_name))
        .arg(format!("--execute={query}"))
        .output()
        .map_err(|error| format!("query local ACCORE database: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "query local ACCORE database exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    let raw = String::from_utf8(output.stdout)
        .map_err(|error| format!("decode local ACCORE database count: {error}"))?;
    parse_database_count(&raw)
}

fn parse_database_count(raw: &str) -> Result<u64, String> {
    raw.trim()
        .parse::<u64>()
        .map_err(|error| format!("parse local ACCORE database count '{raw}': {error}"))
}

fn stop_requested(config: &RuntimeConfig) -> bool {
    let path = config.data_root.join("control.stop");
    if path.exists() {
        let _ = fs::remove_file(path);
        true
    } else {
        false
    }
}

fn backup_requested(config: &RuntimeConfig) -> bool {
    let path = config.data_root.join("control.backup");
    if path.exists() {
        let _ = fs::remove_file(path);
        true
    } else {
        false
    }
}

fn ensure_layout(config: &RuntimeConfig) -> Result<(), String> {
    for path in [
        config.data_root.join("accoredb").join("data"),
        config.data_root.join("laravel-storage"),
        config.data_root.join("logs"),
        config.data_root.join("backups"),
        public_status_root(config),
    ] {
        fs::create_dir_all(path).map_err(|error| format!("create runtime directory: {error}"))?;
    }
    Ok(())
}

fn app_root(config: &RuntimeConfig) -> PathBuf {
    config.runtime_root.join("app")
}
fn database_data(config: &RuntimeConfig) -> PathBuf {
    config.data_root.join("accoredb").join("data")
}
fn mariadb_bin(config: &RuntimeConfig, name: &str) -> PathBuf {
    config
        .runtime_root
        .join(mariadb_root_name())
        .join("bin")
        .join(name)
}
fn frankenphp(config: &RuntimeConfig) -> PathBuf {
    config.runtime_root.join(frankenphp_name())
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
fn mariadb_name() -> &'static str {
    #[cfg(windows)]
    {
        "mariadb.exe"
    }
    #[cfg(not(windows))]
    {
        "mariadb"
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
fn mariadb_install_db(config: &RuntimeConfig) -> PathBuf {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        return config
            .runtime_root
            .join(mariadb_root_name())
            .join("scripts")
            .join("mariadb-install-db");
    }

    #[cfg(not(target_os = "linux"))]
    mariadb_bin(
        config,
        if cfg!(windows) {
            "mariadb-install-db.exe"
        } else {
            "mariadb-install-db"
        },
    )
}
fn status_path(config: &RuntimeConfig) -> PathBuf {
    public_status_root(config).join("runtime-status.json")
}
fn log_path(config: &RuntimeConfig, name: &str) -> PathBuf {
    config.data_root.join("logs").join(name)
}
fn component(state: impl Into<String>, detail: impl Into<String>) -> ComponentStatus {
    ComponentStatus {
        state: state.into(),
        detail: detail.into(),
    }
}
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or_default()
}

fn server_instance_path(config_path: &Path) -> PathBuf {
    config_path.with_file_name("server-instance.json")
}

fn public_instance_receipt_path(config: &RuntimeConfig) -> PathBuf {
    public_status_root(config).join("server-instance.json")
}

fn load_server_instance(config_path: &Path) -> Result<Option<ServerInstanceManifest>, String> {
    let path = server_instance_path(config_path);
    if !path.is_file() {
        return Ok(None);
    }
    serde_json::from_slice(
        &fs::read(&path).map_err(|error| format!("read server instance manifest: {error}"))?,
    )
    .map(Some)
    .map_err(|error| format!("parse server instance manifest: {error}"))
}

fn write_json_atomically<T: Serialize>(
    path: &Path,
    value: &T,
    description: &str,
) -> Result<(), String> {
    let temporary = path.with_extension("json.partial");
    let payload = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("serialize {description}: {error}"))?;
    fs::write(&temporary, payload).map_err(|error| format!("write {description}: {error}"))?;
    fs::rename(&temporary, path).map_err(|error| format!("publish {description}: {error}"))
}

fn write_public_json_atomically<T: Serialize>(
    path: &Path,
    value: &T,
    description: &str,
) -> Result<(), String> {
    write_json_atomically(path, value, description)?;
    #[cfg(windows)]
    apply_windows_public_file_acl(path)?;
    #[cfg(not(windows))]
    unix_service_host::make_public_status_file(path)?;
    Ok(())
}

fn write_server_instance(
    config: &RuntimeConfig,
    owner: ServerProductFlavor,
    config_path: &Path,
    existing: Option<ServerInstanceManifest>,
) -> Result<ServerInstanceManifest, String> {
    let executable = env::current_exe().map_err(|error| {
        format!("resolve Server Agent executable for instance manifest: {error}")
    })?;
    let manifest = ServerInstanceManifest {
        schema_version: SERVER_INSTANCE_SCHEMA_VERSION,
        instance_id: existing
            .as_ref()
            .map(|instance| instance.instance_id.clone())
            .unwrap_or_else(|| format!("accore-instance-{}", random_secret(""))),
        server_id: config.server_id.clone(),
        owner_product: owner,
        active_runtime_root: config.runtime_root.clone(),
        service_executable: executable,
        service_config_path: config_path.to_path_buf(),
        updated_at: now(),
    };
    write_json_atomically(
        &server_instance_path(config_path),
        &manifest,
        "protected server instance manifest",
    )?;
    Ok(manifest)
}

fn write_public_instance_receipt(
    config: &RuntimeConfig,
    manifest: &ServerInstanceManifest,
    operation_id: String,
) -> Result<(), String> {
    let receipt = PublicServerInstanceReceipt::active(manifest, operation_id);
    write_public_receipt(config, &receipt)
}

fn write_public_receipt(
    config: &RuntimeConfig,
    receipt: &PublicServerInstanceReceipt,
) -> Result<(), String> {
    write_public_json_atomically(
        &public_instance_receipt_path(config),
        receipt,
        "public server instance receipt",
    )
}

fn load_public_instance_receipt(config: &RuntimeConfig) -> Option<PublicServerInstanceReceipt> {
    serde_json::from_slice(&fs::read(public_instance_receipt_path(config)).ok()?).ok()
}

fn apply_public_instance_identity(config: &RuntimeConfig, status: &mut RuntimeStatus) {
    if let Some(receipt) = load_public_instance_receipt(config) {
        status.server_instance_id = receipt.instance_id;
        status.owner_product = receipt.owner_product.as_str().into();
        if status.server_id.is_empty() {
            status.server_id = receipt.server_id;
        }
    }
}

fn new_operation_id() -> String {
    format!("operation-{}", random_secret(""))
}

fn carry_durable_configuration(target: &mut RuntimeConfig, existing: RuntimeConfig) {
    target.app_key = existing.app_key;
    target.database_password = existing.database_password;
    target.database_root_password_legacy_blank = existing.database_root_password.is_empty();
    if !existing.database_root_password.is_empty() {
        target.database_root_password = existing.database_root_password;
    }
    target.database_name = existing.database_name;
    if !existing.server_id.is_empty() {
        target.server_id = existing.server_id;
    }
}

fn default_config_path() -> Result<PathBuf, String> {
    #[cfg(windows)]
    {
        let program_data = env::var_os("PROGRAMDATA")
            .map(PathBuf::from)
            .ok_or("PROGRAMDATA is not available")?;
        return Ok(program_data
            .join("ACCORE ERP")
            .join("Server")
            .join("agent-config.json"));
    }

    #[cfg(target_os = "linux")]
    {
        return Ok(PathBuf::from(
            "/var/lib/accore-erp/server/agent-config.json",
        ));
    }

    #[cfg(target_os = "macos")]
    {
        return Ok(PathBuf::from(
            "/Library/Application Support/ACCORE ERP/Server/agent-config.json",
        ));
    }

    #[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
    Err("this platform is not supported by the embedded ACCORE Server runtime".into())
}

fn embedded_runtime_config(explicit_runtime_root: Option<&Path>) -> Result<RuntimeConfig, String> {
    let executable =
        env::current_exe().map_err(|error| format!("resolve Agent executable: {error}"))?;
    let installation_root = executable
        .parent()
        .ok_or("resolve Server Desktop installation root from Agent executable")?;
    let runtime_root = explicit_runtime_root
        .map(Path::to_path_buf)
        .unwrap_or_else(|| packaged_runtime_root(installation_root));
    if !required_runtime_files_exist(&runtime_root) {
        return Err(format!(
            "verified Server Desktop runtime resources are missing at {}",
            runtime_root.display()
        ));
    }
    let config_path = default_config_path()?;
    let data_root = config_path
        .parent()
        .ok_or("resolve Server Desktop data root")?
        .to_path_buf();
    Ok(RuntimeConfig {
        runtime_root,
        data_root,
        app_key: random_secret("base64:"),
        database_password: random_secret(""),
        database_root_password: random_secret(""),
        database_root_password_legacy_blank: false,
        database_name: "accore".into(),
        server_id: format!("accore-server-{}", random_secret("")),
    })
}

fn harden_runtime_data_access(config: &RuntimeConfig) -> Result<(), String> {
    #[cfg(windows)]
    {
        apply_windows_acl(&config.data_root, false)?;
        return apply_windows_acl(&public_status_root(config), true);
    }

    #[cfg(not(windows))]
    {
        unix_service_host::harden_runtime_data(&config.data_root, &public_status_root(config))
    }
}

#[cfg(windows)]
fn apply_windows_acl(path: &Path, permit_users_read: bool) -> Result<(), String> {
    harden_windows_acl_tree(path, permit_users_read)
}

#[cfg(windows)]
fn harden_windows_acl_tree(path: &Path, permit_users_read: bool) -> Result<(), String> {
    harden_windows_acl_entry_tree(path, permit_users_read, false)
}

#[cfg(windows)]
fn harden_windows_acl_entry_tree(
    path: &Path,
    permit_users_read: bool,
    may_disappear: bool,
) -> Result<(), String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        // Agent-owned processes legitimately create and remove transient control
        // entries while a service reconciliation re-applies the private ACL.
        // Only a descendant observed during this traversal may be skipped; a
        // missing requested root remains a hard failure.
        Err(error) if may_disappear && error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(())
        }
        Err(error) => {
            return Err(format!(
                "inspect Server Desktop runtime data permissions: {error}"
            ))
        }
    };
    if metadata.file_type().is_symlink() {
        return Err(format!(
            "refuse to harden Server Desktop runtime data through symbolic link {}",
            path.display()
        ));
    }
    let is_directory = metadata.is_dir();
    apply_windows_acl_entry(path, permit_users_read, is_directory)?;
    if is_directory {
        let entries = match fs::read_dir(path) {
            Ok(entries) => entries,
            Err(error) if may_disappear && error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(())
            }
            Err(error) => {
                return Err(format!(
                    "enumerate Server Desktop runtime data permissions: {error}"
                ))
            }
        };
        for entry in entries {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
                Err(error) => {
                    return Err(format!(
                        "read Server Desktop runtime data permission entry: {error}"
                    ))
                }
            };
            harden_windows_acl_entry_tree(&entry.path(), permit_users_read, true)?;
        }
    }
    Ok(())
}

#[cfg(windows)]
fn apply_windows_acl_entry(
    path: &Path,
    permit_users_read: bool,
    is_directory: bool,
) -> Result<(), String> {
    let system_principal = if is_directory {
        SYSTEM_DIRECTORY_FULL_PRINCIPAL
    } else {
        SYSTEM_FILE_FULL_PRINCIPAL
    };
    let administrators_principal = if is_directory {
        ADMINISTRATORS_DIRECTORY_FULL_PRINCIPAL
    } else {
        ADMINISTRATORS_FILE_FULL_PRINCIPAL
    };
    let mut command = Command::new("icacls.exe");
    command.arg(path).args([
        "/inheritance:r",
        "/grant:r",
        system_principal,
        "/grant:r",
        administrators_principal,
    ]);
    if permit_users_read {
        let public_read_principal = if is_directory {
            PUBLIC_STATUS_READ_PRINCIPAL
        } else {
            PUBLIC_STATUS_FILE_READ_PRINCIPAL
        };
        command.args(["/grant:r", public_read_principal]);
    }
    command.arg("/q");
    run_checked(
        &mut command,
        "harden Server Desktop runtime data permissions",
    )
}

#[cfg(windows)]
fn apply_windows_public_file_acl(path: &Path) -> Result<(), String> {
    apply_windows_acl_entry(path, true, false)
}

fn random_secret(prefix: &str) -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    format!("{prefix}{}", URL_SAFE_NO_PAD.encode(bytes))
}

fn public_status_root(config: &RuntimeConfig) -> PathBuf {
    config
        .data_root
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| config.data_root.clone())
        .join("Server Status")
}

fn packaged_runtime_root(installation_root: &Path) -> PathBuf {
    let target = runtime_target();
    let candidates = [
        installation_root
            .join("resources/server-runtime")
            .join(target),
        installation_root.join("server-runtime").join(target),
        installation_root
            .parent()
            .map(|contents_root| {
                contents_root
                    .join("Resources/resources/server-runtime")
                    .join(target)
            })
            .unwrap_or_default(),
    ];
    candidates
        .into_iter()
        .find(|candidate| required_runtime_files_exist(candidate))
        .unwrap_or_else(|| {
            installation_root
                .join("resources/server-runtime")
                .join(target)
        })
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
        compile_error!("unsupported ACCORE Server runtime target")
    }
}

fn required_runtime_files_exist(runtime_root: &Path) -> bool {
    runtime_root.join(frankenphp_name()).is_file()
        && runtime_root
            .join(mariadb_root_name())
            .join("bin")
            .join(mariadbd_name())
            .is_file()
}

fn write_config(path: &Path, config: &RuntimeConfig) -> Result<(), String> {
    let temporary = path.with_extension("json.partial");
    let payload = serde_json::to_vec_pretty(config)
        .map_err(|error| format!("serialize Agent configuration: {error}"))?;
    fs::write(&temporary, payload)
        .map_err(|error| format!("write Agent configuration: {error}"))?;
    fs::rename(&temporary, path).map_err(|error| format!("publish Agent configuration: {error}"))
}

fn load_config(path: &Path) -> Result<RuntimeConfig, String> {
    serde_json::from_slice(
        &fs::read(path).map_err(|error| format!("read runtime config: {error}"))?,
    )
    .map_err(|error| format!("parse runtime config: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> RuntimeConfig {
        RuntimeConfig {
            runtime_root: PathBuf::from("C:/Program Files/ACCORE ERP Server Desktop/runtime"),
            data_root: PathBuf::from("C:/ProgramData/ACCORE ERP/Server"),
            app_key: "base64:test".into(),
            database_password: "application-password".into(),
            database_root_password: "root-password".into(),
            database_root_password_legacy_blank: false,
            database_name: "accore".into(),
            server_id: "accore-server-test".into(),
        }
    }

    #[test]
    fn status_is_published_outside_the_private_secret_root() {
        let config = config();
        let status = status_path(&config);
        assert_ne!(status.parent(), Some(config.data_root.as_path()));
        assert!(status.ends_with("Server Status/runtime-status.json"));
    }

    #[test]
    fn generated_caddyfile_quotes_a_program_files_public_root() {
        let rendered = api_configuration_content(&config());
        assert!(rendered
            .contains("root * \"C:/Program Files/ACCORE ERP Server Desktop/runtime/app/public\""));
    }

    #[test]
    fn public_status_acl_includes_authenticated_desktop_clients() {
        assert_eq!(PUBLIC_STATUS_READ_PRINCIPAL, "*S-1-5-11:(OI)(CI)RX");
        assert_eq!(PUBLIC_STATUS_FILE_READ_PRINCIPAL, "*S-1-5-11:RX");
    }

    #[test]
    fn private_data_acl_uses_builtin_administrator_sid_for_files_and_directories() {
        assert_eq!(SYSTEM_DIRECTORY_FULL_PRINCIPAL, "*S-1-5-18:(OI)(CI)F");
        assert_eq!(SYSTEM_FILE_FULL_PRINCIPAL, "*S-1-5-18:F");
        assert_eq!(
            ADMINISTRATORS_DIRECTORY_FULL_PRINCIPAL,
            "*S-1-5-32-544:(OI)(CI)F"
        );
        assert_eq!(ADMINISTRATORS_FILE_FULL_PRINCIPAL, "*S-1-5-32-544:F");
    }

    #[test]
    fn lifecycle_mutation_rejects_a_limited_token_before_persistence() {
        assert!(require_elevated_lifecycle_status(false).is_err());
        assert!(require_elevated_lifecycle_status(true).is_ok());
    }

    #[test]
    fn legacy_configuration_without_root_password_remains_readable_for_hardening() {
        let legacy = r#"{
          "runtimeRoot":"C:/runtime",
          "dataRoot":"C:/data",
          "appKey":"base64:test",
          "databasePassword":"application-password",
          "databaseName":"accore"
        }"#;
        let parsed: RuntimeConfig = serde_json::from_str(legacy).expect("legacy config parses");
        assert!(parsed.database_root_password.is_empty());
        assert!(!parsed.database_root_password_legacy_blank);
    }

    #[test]
    fn packaged_runtime_root_matches_the_current_platform_resource_layout() {
        let installation_root = PathBuf::from("/opt/accore-erp/server");
        assert_eq!(
            packaged_runtime_root(&installation_root),
            installation_root
                .join("resources/server-runtime")
                .join(runtime_target())
        );
    }

    #[test]
    fn guarded_seed_recovery_accepts_a_numeric_user_count() {
        assert_eq!(parse_database_count("0\n").expect("zero users parses"), 0);
        assert_eq!(
            parse_database_count("12\n").expect("existing users parse"),
            12
        );
    }

    #[test]
    fn guarded_seed_recovery_rejects_a_non_numeric_user_count() {
        assert!(parse_database_count("not-a-count\n").is_err());
    }
}
