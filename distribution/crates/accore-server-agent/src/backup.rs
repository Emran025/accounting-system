use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    net::TcpStream,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

use accore_server_agent::{
    AgentError, BackupOperator, BackupRecord, BackupRetentionPolicy, BackupSchedule,
    BackupSupervisor, ManagedService,
};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::{
    component, mariadb_bin, mariadb_dump_name, mariadb_install_db_command, mariadb_name,
    mariadb_root_name, mariadbd_name, now, public_status_root, run_checked, terminate,
    wait_for_port, ComponentStatus, RuntimeConfig, BACKUP_VALIDATION_PORT, DATABASE_PORT,
};

const BACKUP_MANIFEST_VERSION: u8 = 1;
const VALIDATION_TIMEOUT_MESSAGE: &str = "isolated restore validation instance";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupManifest {
    schema_version: u8,
    records: Vec<BackupManifestRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupManifestRecord {
    id: String,
    artifact: String,
    created_at_unix: u64,
    verified_at_unix: Option<u64>,
    size_bytes: u64,
    sha256: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PublicBackupStatus {
    state: String,
    detail: String,
    retained_restore_points: usize,
    last_backup_at_unix: Option<u64>,
    last_verified_at_unix: Option<u64>,
    updated_at_unix: u64,
}

pub struct BackupRuntime {
    config: RuntimeConfig,
    supervisor: BackupSupervisor<MariaDbBackupOperator>,
    schedule: BackupSchedule,
    catalog_error: Option<String>,
    last_failure: Option<String>,
    audit_cursor: usize,
}

impl BackupRuntime {
    pub fn open(config: &RuntimeConfig) -> Result<Self, String> {
        let (records, catalog_error) = match load_manifest(config) {
            Ok(records) => (records, None),
            Err(error) => (Vec::new(), Some(error)),
        };
        let runtime = Self {
            config: config.clone(),
            supervisor: BackupSupervisor::with_records(
                MariaDbBackupOperator::new(config.clone()),
                BackupRetentionPolicy::default(),
                records,
            ),
            schedule: BackupSchedule {
                interval_seconds: crate::BACKUP_INTERVAL_SECONDS,
            },
            catalog_error,
            last_failure: None,
            audit_cursor: 0,
        };
        runtime.publish_public_status(runtime.component_status())?;
        Ok(runtime)
    }

    pub fn component_status(&self) -> ComponentStatus {
        if let Some(error) = &self.catalog_error {
            return component(
                "attention",
                format!("backup catalog requires administrator review: {error}"),
            );
        }
        let records = self.supervisor.records();
        let Some(latest) = records.iter().max_by_key(|record| record.created_at_unix) else {
            if let Some(failure) = &self.last_failure {
                return component(
                    "attention",
                    format!("latest protected backup did not complete: {failure}"),
                );
            }
            return component(
                "attention",
                "no verified local restore point has been created yet",
            );
        };
        if latest.verified_at_unix.is_none() {
            if let Some(failure) = &self.last_failure {
                return component(
                    "attention",
                    format!("latest backup requires isolated restore review: {failure}"),
                );
            }
            return component(
                "attention",
                "latest backup exists but isolated restore validation has not succeeded",
            );
        }
        component(
            "ready",
            format!(
                "{} local restore point(s); latest verified at {}",
                records.len(),
                latest.verified_at_unix.unwrap_or_default()
            ),
        )
    }

    /// Executes only after the production database has reached ready state. The return
    /// value is present when a public runtime status refresh is required.
    pub fn maintain(&mut self, requested: bool) -> Option<ComponentStatus> {
        if self.catalog_error.is_some() {
            return None;
        }
        let current_time = now();
        let latest = self
            .supervisor
            .records()
            .iter()
            .max_by_key(|record| record.created_at_unix);
        if !requested && !self.schedule.is_due(latest, current_time) {
            return None;
        }

        let backup_id = format!("accore-{}", current_time);
        let outcome = self
            .supervisor
            .create_and_verify(backup_id.clone(), current_time)
            .and_then(|()| self.supervisor.enforce_retention(current_time));

        if let Err(error) = &outcome {
            let failure = sanitized_backup_failure_detail(&self.config, error);
            self.last_failure = Some(failure.clone());
            append_backup_failure_diagnostic(&self.config, &failure);
            append_safe_audit(
                &self.config,
                "Backup",
                "failed",
                current_time,
                &format!("backup:{backup_id}; {}", safe_error_summary(error)),
            );
        } else {
            self.last_failure = None;
        }
        if let Err(error) = self.persist_manifest() {
            self.catalog_error = Some(error);
        }
        if let Err(error) = self.flush_policy_audit() {
            self.catalog_error = Some(error);
        }

        let status = self.component_status();
        if let Err(error) = self.publish_public_status(status.clone()) {
            self.catalog_error = Some(error);
            return Some(self.component_status());
        }
        Some(status)
    }

    fn persist_manifest(&self) -> Result<(), String> {
        let mut records = self
            .supervisor
            .records()
            .iter()
            .map(|record| manifest_record(&self.config, record))
            .collect::<Result<Vec<_>, _>>()?;
        records.sort_by(|left, right| right.created_at_unix.cmp(&left.created_at_unix));
        let payload = serde_json::to_vec_pretty(&BackupManifest {
            schema_version: BACKUP_MANIFEST_VERSION,
            records,
        })
        .map_err(|error| format!("serialize backup catalog: {error}"))?;
        atomic_write(
            &manifest_path(&self.config),
            &payload,
            "publish backup catalog",
        )
    }

    fn flush_policy_audit(&mut self) -> Result<(), String> {
        for event in self.supervisor.audit().iter().skip(self.audit_cursor) {
            append_safe_audit(
                &self.config,
                &format!("{:?}", event.kind),
                &event.outcome,
                event.occurred_at_unix,
                &event.safe_reference,
            );
        }
        self.audit_cursor = self.supervisor.audit().len();
        Ok(())
    }

    fn publish_public_status(&self, component_status: ComponentStatus) -> Result<(), String> {
        let records = self.supervisor.records();
        let last_backup_at_unix = records.iter().map(|record| record.created_at_unix).max();
        let last_verified_at_unix = records
            .iter()
            .filter_map(|record| record.verified_at_unix)
            .max();
        let payload = serde_json::to_vec_pretty(&PublicBackupStatus {
            state: component_status.state,
            detail: component_status.detail,
            retained_restore_points: records.len(),
            last_backup_at_unix,
            last_verified_at_unix,
            updated_at_unix: now(),
        })
        .map_err(|error| format!("serialize public backup status: {error}"))?;
        atomic_write(
            &public_status_root(&self.config).join("backup-status.json"),
            &payload,
            "publish public backup status",
        )
    }
}

struct MariaDbBackupOperator {
    config: RuntimeConfig,
}

impl MariaDbBackupOperator {
    fn new(config: RuntimeConfig) -> Self {
        Self { config }
    }

    fn archive_path(&self, backup_id: &str) -> PathBuf {
        backups_root(&self.config).join(format!("{backup_id}.sql.gz"))
    }

    fn root_password(&self) -> &str {
        if self.config.database_root_password_legacy_blank {
            ""
        } else {
            &self.config.database_root_password
        }
    }

    fn write_client_config(
        &self,
        path: &Path,
        port: u16,
        password: &str,
    ) -> Result<(), AgentError> {
        fs::write(
            path,
            format!(
                "[client]\nprotocol=tcp\nhost=127.0.0.1\nport={port}\nuser=root\npassword={password}\n"
            ),
        )
        .map_err(|error| backup_io_error("write protected MariaDB client configuration", error))
    }
}

impl BackupOperator for MariaDbBackupOperator {
    fn create_backup(&mut self, backup_id: &str) -> Result<u64, AgentError> {
        validate_backup_id(backup_id)?;
        let archive = self.archive_path(backup_id);
        let sql_staging = backups_root(&self.config).join(format!("{backup_id}.sql.partial"));
        let archive_staging =
            backups_root(&self.config).join(format!("{backup_id}.sql.gz.partial"));
        let client_config = backups_root(&self.config).join(format!(".{backup_id}.client.cnf"));
        self.write_client_config(&client_config, DATABASE_PORT, self.root_password())?;

        let result = (|| {
            let dump_output = File::create(&sql_staging).map_err(|error| {
                backup_io_error("create MariaDB backup SQL staging file", error)
            })?;
            run_checked(
                Command::new(mariadb_bin(&self.config, mariadb_dump_name()))
                    .arg(format!("--defaults-file={}", client_config.display()))
                    .args([
                        "--single-transaction",
                        "--skip-lock-tables",
                        "--no-tablespaces",
                        "--routines",
                        "--events",
                        "--triggers",
                        "--databases",
                    ])
                    .arg(&self.config.database_name)
                    .stdout(Stdio::from(dump_output)),
                "create protected MariaDB logical backup",
            )
            .map_err(|error| backup_error("create protected MariaDB logical backup", error))?;

            let mut source = File::open(&sql_staging)
                .map_err(|error| backup_io_error("open MariaDB backup staging file", error))?;
            let destination = File::create(&archive_staging)
                .map_err(|error| backup_io_error("create compressed backup staging file", error))?;
            let mut encoder = GzEncoder::new(destination, Compression::default());
            std::io::copy(&mut source, &mut encoder)
                .map_err(|error| backup_io_error("compress MariaDB backup", error))?;
            let destination = encoder
                .finish()
                .map_err(|error| backup_io_error("finalize compressed MariaDB backup", error))?;
            destination
                .sync_all()
                .map_err(|error| backup_io_error("flush compressed MariaDB backup", error))?;
            fs::rename(&archive_staging, &archive).map_err(|error| {
                backup_io_error("atomically publish compressed MariaDB backup", error)
            })?;
            fs::metadata(&archive)
                .map_err(|error| backup_io_error("inspect published MariaDB backup", error))
                .map(|metadata| metadata.len())
        })();

        let _ = fs::remove_file(&client_config);
        let _ = fs::remove_file(&sql_staging);
        if result.is_err() {
            let _ = fs::remove_file(&archive_staging);
        }
        result
    }

    fn verify_restore_isolated(&mut self, backup_id: &str) -> Result<(), AgentError> {
        validate_backup_id(backup_id)?;
        let archive = self.archive_path(backup_id);
        if !archive.is_file() {
            return Err(backup_error(
                "locate backup for isolated restore validation",
                "backup archive is missing",
            ));
        }
        if TcpStream::connect(("127.0.0.1", BACKUP_VALIDATION_PORT)).is_ok() {
            return Err(backup_error(
                "reserve isolated restore validation port",
                format!("127.0.0.1:{BACKUP_VALIDATION_PORT} is already in use"),
            ));
        }

        let validation_root = backups_root(&self.config)
            .join("validation")
            .join(format!("{backup_id}-{}", now()));
        let data_directory = validation_root.join("data");
        let restore_sql = validation_root.join("restore.sql");
        let client_config = validation_root.join("validation.client.cnf");
        let validation_socket = validation_root.join("mariadb.sock");
        fs::create_dir_all(&data_directory).map_err(|error| {
            backup_io_error("create isolated restore validation directory", error)
        })?;
        let validation_root_password = random_secret();
        let result = (|| {
            let mut command = mariadb_install_db_command(&self.config, &data_directory);
            run_checked(
                &mut command,
                "initialize isolated MariaDB restore validation instance",
            )
            .map_err(|error| {
                backup_error(
                    "initialize isolated MariaDB restore validation instance",
                    error,
                )
            })?;

            let validation_log = File::create(validation_root.join("mariadb-validation.log"))
                .map_err(|error| backup_io_error("open isolated MariaDB validation log", error))?;
            let mut validation_database = Command::new(mariadb_bin(&self.config, mariadbd_name()))
                .arg("--no-defaults")
                .arg(format!(
                    "--basedir={}",
                    self.config.runtime_root.join(mariadb_root_name()).display()
                ))
                .arg(format!("--datadir={}", data_directory.display()))
                .arg(format!("--socket={}", validation_socket.display()))
                .arg("--bind-address=127.0.0.1")
                .arg(format!("--port={BACKUP_VALIDATION_PORT}"))
                .arg("--skip-name-resolve")
                .stdout(Stdio::from(validation_log.try_clone().map_err(
                    |error| backup_io_error("clone isolated MariaDB validation log", error),
                )?))
                .stderr(Stdio::from(validation_log))
                .spawn()
                .map_err(|error| {
                    backup_io_error("start isolated MariaDB restore validation instance", error)
                })?;

            let validation_result = (|| {
                wait_for_port(BACKUP_VALIDATION_PORT, VALIDATION_TIMEOUT_MESSAGE)
                    .map_err(|error| backup_error("wait for isolated restore database", error))?;
                let database = &self.config.database_name;
                let password = &self.config.database_password;
                let principal_sql = format!(
                    "ALTER USER 'root'@'localhost' IDENTIFIED BY '{validation_root_password}'; \
                     CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '{validation_root_password}'; \
                     ALTER USER 'root'@'127.0.0.1' IDENTIFIED BY '{validation_root_password}'; \
                     GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION; \
                     CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; \
                     CREATE USER IF NOT EXISTS 'accore_app'@'localhost' IDENTIFIED BY '{password}'; \
                     CREATE USER IF NOT EXISTS 'accore_app'@'127.0.0.1' IDENTIFIED BY '{password}'; \
                     GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, CREATE VIEW, SHOW VIEW ON `{database}`.* TO 'accore_app'@'localhost'; \
                     GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, CREATE VIEW, SHOW VIEW ON `{database}`.* TO 'accore_app'@'127.0.0.1'; \
                     FLUSH PRIVILEGES;"
                );
                run_checked(
                    Command::new(mariadb_bin(&self.config, mariadb_name()))
                        .args([
                            "--no-defaults",
                            "--protocol=socket",
                            "--user=root",
                            "--password=",
                        ])
                        .arg(format!("--socket={}", validation_socket.display()))
                        .arg(format!("--execute={principal_sql}")),
                    "provision isolated restore validation view definer",
                )
                .map_err(|error| {
                    backup_error("provision isolated restore validation view definer", error)
                })?;
                self.write_client_config(
                    &client_config,
                    BACKUP_VALIDATION_PORT,
                    &validation_root_password,
                )?;
                let archive_file = File::open(&archive).map_err(|error| {
                    backup_io_error("open compressed backup for restore validation", error)
                })?;
                let mut decoder = GzDecoder::new(archive_file);
                let mut restored_sql = File::create(&restore_sql).map_err(|error| {
                    backup_io_error("create isolated restore SQL staging file", error)
                })?;
                std::io::copy(&mut decoder, &mut restored_sql).map_err(|error| {
                    backup_io_error("decompress isolated restore SQL staging file", error)
                })?;
                restored_sql.sync_all().map_err(|error| {
                    backup_io_error("flush isolated restore SQL staging file", error)
                })?;

                let input = File::open(&restore_sql).map_err(|error| {
                    backup_io_error("open isolated restore SQL staging file", error)
                })?;
                let mut restore = Command::new(mariadb_bin(&self.config, mariadb_name()));
                restore
                    .arg(format!("--defaults-file={}", client_config.display()))
                    .stdin(Stdio::from(input));
                run_checked(
                    &mut restore,
                    "restore backup into isolated MariaDB validation instance",
                )
                .map_err(|error| {
                    backup_error(
                        "restore backup into isolated MariaDB validation instance",
                        error,
                    )
                })?;

                let mut query = Command::new(mariadb_bin(&self.config, mariadb_name()));
                query
                    .arg(format!("--defaults-file={}", client_config.display()))
                    .arg(format!("--database={}", self.config.database_name))
                    .arg("--execute=SELECT 1 AS accore_restore_validation");
                run_checked(&mut query, "query isolated restored MariaDB database").map_err(
                    |error| backup_error("query isolated restored MariaDB database", error),
                )
            })();
            terminate(&mut validation_database);
            validation_result
        })();

        let _ = fs::remove_dir_all(&validation_root);
        result
    }

    fn remove_backup(&mut self, backup_id: &str) -> Result<(), AgentError> {
        validate_backup_id(backup_id)?;
        fs::remove_file(self.archive_path(backup_id))
            .map_err(|error| backup_io_error("remove expired backup archive", error))
    }
}

fn load_manifest(config: &RuntimeConfig) -> Result<Vec<BackupRecord>, String> {
    let path = manifest_path(config);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let manifest: BackupManifest = serde_json::from_slice(
        &fs::read(&path).map_err(|error| format!("read backup catalog: {error}"))?,
    )
    .map_err(|error| format!("parse backup catalog: {error}"))?;
    if manifest.schema_version != BACKUP_MANIFEST_VERSION {
        return Err(format!(
            "unsupported backup catalog version {}",
            manifest.schema_version
        ));
    }
    manifest
        .records
        .into_iter()
        .map(|record| {
            validate_backup_id(&record.id).map_err(|error| error.to_string())?;
            let expected_artifact = format!("{}.sql.gz", record.id);
            if record.artifact != expected_artifact {
                return Err("backup catalog contains an invalid artifact reference".into());
            }
            let archive = backups_root(config).join(&record.artifact);
            if !archive.is_file()
                || fs::metadata(&archive)
                    .map_err(|error| error.to_string())?
                    .len()
                    != record.size_bytes
            {
                return Err(format!(
                    "backup artifact is missing or changed: {}",
                    record.id
                ));
            }
            let actual_digest = sha256_file(&archive)?;
            if actual_digest != record.sha256 {
                return Err(format!("backup digest mismatch: {}", record.id));
            }
            Ok(BackupRecord {
                id: record.id,
                created_at_unix: record.created_at_unix,
                verified_at_unix: record.verified_at_unix,
                size_bytes: record.size_bytes,
            })
        })
        .collect()
}

fn manifest_record(
    config: &RuntimeConfig,
    record: &BackupRecord,
) -> Result<BackupManifestRecord, String> {
    let artifact = format!("{}.sql.gz", record.id);
    let archive = backups_root(config).join(&artifact);
    if !archive.is_file() {
        return Err(format!(
            "backup artifact disappeared before catalog publication: {}",
            record.id
        ));
    }
    let size_bytes = fs::metadata(&archive)
        .map_err(|error| format!("inspect backup archive: {error}"))?
        .len();
    if size_bytes != record.size_bytes {
        return Err(format!(
            "backup archive size changed before catalog publication: {}",
            record.id
        ));
    }
    Ok(BackupManifestRecord {
        id: record.id.clone(),
        artifact,
        created_at_unix: record.created_at_unix,
        verified_at_unix: record.verified_at_unix,
        size_bytes,
        sha256: sha256_file(&archive)?,
    })
}

fn backups_root(config: &RuntimeConfig) -> PathBuf {
    config.data_root.join("backups")
}

fn manifest_path(config: &RuntimeConfig) -> PathBuf {
    backups_root(config).join("manifest.json")
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file =
        File::open(path).map_err(|error| format!("open backup archive for digest: {error}"))?;
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let count = file
            .read(&mut buffer)
            .map_err(|error| format!("read backup archive for digest: {error}"))?;
        if count == 0 {
            break;
        }
        digest.update(&buffer[..count]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

fn atomic_write(path: &Path, payload: &[u8], action: &str) -> Result<(), String> {
    let temporary = path.with_extension("partial");
    fs::write(&temporary, payload).map_err(|error| format!("{action}: {error}"))?;
    fs::rename(&temporary, path).map_err(|error| format!("{action}: {error}"))
}

fn append_safe_audit(
    config: &RuntimeConfig,
    kind: &str,
    outcome: &str,
    occurred_at_unix: u64,
    reference: &str,
) {
    let line = format!(
        "{{\"kind\":\"{}\",\"outcome\":\"{}\",\"occurredAtUnix\":{},\"safeReference\":\"{}\"}}\n",
        json_escape(kind),
        json_escape(outcome),
        occurred_at_unix,
        json_escape(reference),
    );
    let _ = OpenOptions::new()
        .create(true)
        .append(true)
        .open(config.data_root.join("operations-audit.jsonl"))
        .and_then(|mut file| file.write_all(line.as_bytes()));
}

fn sanitized_backup_failure_detail(config: &RuntimeConfig, error: &AgentError) -> String {
    let mut detail = format!("{error:?}");
    for secret in [
        config.app_key.as_str(),
        config.database_password.as_str(),
        config.database_root_password.as_str(),
    ] {
        if !secret.is_empty() {
            detail = detail.replace(secret, "[redacted]");
        }
    }
    detail.chars().take(640).collect()
}

fn append_backup_failure_diagnostic(config: &RuntimeConfig, detail: &str) {
    let line = format!("{} backup failure: {detail}\n", now());
    let _ = OpenOptions::new()
        .create(true)
        .append(true)
        .open(config.data_root.join("logs").join("backup.log"))
        .and_then(|mut file| file.write_all(line.as_bytes()));
}

fn json_escape(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn validate_backup_id(backup_id: &str) -> Result<(), AgentError> {
    if backup_id.is_empty()
        || backup_id.len() > 96
        || !backup_id.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
    {
        return Err(backup_error(
            "validate backup identifier",
            "backup identifier is invalid",
        ));
    }
    Ok(())
}

fn backup_io_error(action: impl Into<String>, error: impl std::fmt::Display) -> AgentError {
    backup_error(action, error)
}

fn backup_error(action: impl Into<String>, detail: impl std::fmt::Display) -> AgentError {
    AgentError::ServiceFailure {
        service: ManagedService::Database,
        detail: format!("{}: {}", action.into(), detail),
    }
}

fn safe_error_summary(error: &AgentError) -> String {
    match error {
        AgentError::ServiceFailure { .. } => "protected backup operation did not complete".into(),
        _ => "protected backup operation failed".into(),
    }
}

fn random_secret() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}
