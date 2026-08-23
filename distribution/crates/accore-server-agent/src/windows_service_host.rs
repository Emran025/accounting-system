#[cfg(windows)]
use std::{ffi::OsString, path::Path, sync::mpsc, time::Duration};

#[cfg(windows)]
use windows_service::{
    define_windows_service,
    service::{
        ServiceAccess, ServiceControl, ServiceControlAccept, ServiceErrorControl, ServiceExitCode,
        ServiceInfo, ServiceStartType, ServiceState, ServiceStatus, ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
    service_manager::{ServiceManager, ServiceManagerAccess},
};

#[cfg(windows)]
const SERVICE_NAME: &str = "ACCOREServerAgent";
#[cfg(windows)]
const SERVICE_DISPLAY_NAME: &str = "ACCORE ERP Server Agent";

#[cfg(any(windows, test))]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ReconciliationAction {
    KeepRunning,
    UpdateThenStart,
}

#[cfg(any(windows, test))]
fn reconciliation_action(service_state: &str) -> Result<ReconciliationAction, String> {
    match service_state {
        "Running" => Ok(ReconciliationAction::KeepRunning),
        "Stopped" => Ok(ReconciliationAction::UpdateThenStart),
        "StartPending" | "StopPending" | "ContinuePending" | "PausePending" | "Paused" => Err(
            format!(
                "ACCORE Server Agent is transitioning ({service_state}); retry reconciliation after the current lifecycle operation completes"
            ),
        ),
        state => Err(format!(
            "ACCORE Server Agent reported unsupported SCM state ({state}); retry reconciliation after it becomes Running or Stopped"
        )),
    }
}

#[cfg(windows)]
fn service_info(config_path: String) -> Result<ServiceInfo, String> {
    let executable =
        std::env::current_exe().map_err(|error| format!("resolve Agent executable: {error}"))?;
    Ok(ServiceInfo {
        name: OsString::from(SERVICE_NAME),
        display_name: OsString::from(SERVICE_DISPLAY_NAME),
        service_type: ServiceType::OWN_PROCESS,
        start_type: ServiceStartType::AutoStart,
        error_control: ServiceErrorControl::Normal,
        executable_path: executable,
        launch_arguments: vec![
            OsString::from("service"),
            OsString::from("--config"),
            OsString::from(config_path),
        ],
        dependencies: vec![],
        account_name: None,
        account_password: None,
    })
}

#[cfg(windows)]
fn reconcile_access() -> ServiceAccess {
    ServiceAccess::QUERY_STATUS | ServiceAccess::START | ServiceAccess::CHANGE_CONFIG
}

#[cfg(windows)]
fn wait_for_stopped(service: &windows_service::service::Service) -> Result<(), String> {
    let deadline = std::time::Instant::now() + Duration::from_secs(30);
    loop {
        let status = service
            .query_status()
            .map_err(|error| format!("query ACCORE Server Agent service: {error}"))?;
        if status.current_state == ServiceState::Stopped {
            return Ok(());
        }
        if std::time::Instant::now() >= deadline {
            return Err("ACCORE Server Agent did not stop before service reconciliation".into());
        }
        std::thread::sleep(Duration::from_millis(250));
    }
}

#[cfg(windows)]
pub fn reconcile_service(config_path: String) -> Result<(), String> {
    let manager = ServiceManager::local_computer(
        None::<&str>,
        ServiceManagerAccess::CONNECT | ServiceManagerAccess::CREATE_SERVICE,
    )
    .map_err(|error| format!("open Windows Service Control Manager: {error}"))?;
    let info = service_info(config_path)?;
    match manager.open_service(SERVICE_NAME, reconcile_access()) {
        Ok(service) => {
            let status = service.query_status().map_err(|error| {
                format!("query ACCORE Server Agent before reconciliation: {error}")
            })?;
            let action = reconciliation_action(&format!("{:?}", status.current_state))?;
            service.change_config(&info).map_err(|error| {
                format!("reconcile ACCORE Server Agent service configuration: {error}")
            })?;

            match action {
                ReconciliationAction::KeepRunning => Ok(()),
                ReconciliationAction::UpdateThenStart => {
                    service.start::<&str>(&[]).map_err(|error| {
                        format!("start reconciled ACCORE Server Agent service: {error}")
                    })
                }
            }
        }
        Err(_) => manager
            .create_service(&info, reconcile_access())
            .map_err(|error| format!("create ACCORE Server Agent service: {error}"))?
            .start::<&str>(&[])
            .map_err(|error| format!("start ACCORE Server Agent service: {error}")),
    }
}

#[cfg(windows)]
pub fn start_service() -> Result<(), String> {
    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .map_err(|error| format!("open Windows Service Control Manager: {error}"))?;
    let service = manager
        .open_service(
            SERVICE_NAME,
            ServiceAccess::QUERY_STATUS | ServiceAccess::START,
        )
        .map_err(|error| format!("open ACCORE Server Agent service: {error}"))?;
    let status = service
        .query_status()
        .map_err(|error| format!("query ACCORE Server Agent service: {error}"))?;
    match reconciliation_action(&format!("{:?}", status.current_state))? {
        ReconciliationAction::KeepRunning => Ok(()),
        ReconciliationAction::UpdateThenStart => service
            .start::<&str>(&[])
            .map_err(|error| format!("start ACCORE Server Agent service: {error}")),
    }
}

#[cfg(windows)]
pub fn uninstall_service() -> Result<(), String> {
    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .map_err(|error| format!("open Windows Service Control Manager: {error}"))?;
    let service = manager
        .open_service(
            SERVICE_NAME,
            ServiceAccess::QUERY_STATUS | ServiceAccess::STOP | ServiceAccess::DELETE,
        )
        .map_err(|error| format!("open ACCORE Server Agent service: {error}"))?;
    let status = service
        .query_status()
        .map_err(|error| format!("query ACCORE Server Agent before removal: {error}"))?;
    if status.current_state != ServiceState::Stopped {
        service
            .stop()
            .map_err(|error| format!("stop ACCORE Server Agent before removal: {error}"))?;
        wait_for_stopped(&service)?;
    }
    service
        .delete()
        .map_err(|error| format!("remove ACCORE Server Agent service: {error}"))
}

#[cfg(windows)]
pub fn stop_service() -> Result<(), String> {
    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .map_err(|error| format!("open Windows Service Control Manager: {error}"))?;
    let service = manager
        .open_service(SERVICE_NAME, ServiceAccess::STOP)
        .map_err(|error| format!("open ACCORE Server Agent service: {error}"))?;
    service
        .stop()
        .map(|_| ())
        .map_err(|error| format!("stop ACCORE Server Agent service: {error}"))
}

#[cfg(windows)]
pub fn run_service(config_path: String) -> Result<(), String> {
    std::env::set_var("ACCORE_SERVER_AGENT_CONFIG", config_path);
    service_dispatcher::start(SERVICE_NAME, ffi_service_main)
        .map_err(|error| format!("start Windows service dispatcher: {error}"))
}

#[cfg(windows)]
define_windows_service!(ffi_service_main, service_main);

#[cfg(windows)]
fn service_main(_arguments: Vec<OsString>) {
    let (stop_sender, stop_receiver) = mpsc::channel();
    let status_handle =
        match service_control_handler::register(SERVICE_NAME, move |control| match control {
            ServiceControl::Stop => {
                let _ = stop_sender.send(());
                ServiceControlHandlerResult::NoError
            }
            _ => ServiceControlHandlerResult::NotImplemented,
        }) {
            Ok(handle) => handle,
            Err(_) => return,
        };

    let _ = status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    });

    let config = std::env::var("ACCORE_SERVER_AGENT_CONFIG").ok();
    let mut worker = config.as_ref().map(|config| {
        let worker_config = config.clone();
        std::thread::spawn(move || super::execute_service_with_config(Path::new(&worker_config)))
    });

    loop {
        match stop_receiver.recv_timeout(Duration::from_millis(500)) {
            Ok(()) => {
                if let Some(config) = config.as_ref() {
                    let _ = super::request_stop_for_config(Path::new(config));
                }
                let _ = status_handle.set_service_status(ServiceStatus {
                    service_type: ServiceType::OWN_PROCESS,
                    current_state: ServiceState::StopPending,
                    controls_accepted: ServiceControlAccept::empty(),
                    exit_code: ServiceExitCode::Win32(0),
                    checkpoint: 0,
                    wait_hint: Duration::from_secs(10),
                    process_id: None,
                });
                break;
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                if worker
                    .as_ref()
                    .map_or(true, std::thread::JoinHandle::is_finished)
                {
                    break;
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    if let Some(worker) = worker.take() {
        let _ = worker.join();
    }

    let _ = status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Stopped,
        controls_accepted: ServiceControlAccept::empty(),
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    });
}

#[cfg(not(windows))]
#[allow(dead_code)]
pub fn reconcile_service(_config_path: String) -> Result<(), String> {
    Err("Windows Service installation is supported only on Windows".into())
}
#[cfg(not(windows))]
#[allow(dead_code)]
pub fn start_service() -> Result<(), String> {
    Err("Windows Service installation is supported only on Windows".into())
}
#[cfg(not(windows))]
pub fn uninstall_service() -> Result<(), String> {
    Err("Windows Service removal is supported only on Windows".into())
}
#[cfg(not(windows))]
pub fn run_service(_config_path: String) -> Result<(), String> {
    Err("Windows Service dispatch is supported only on Windows".into())
}
#[cfg(not(windows))]
pub fn stop_service() -> Result<(), String> {
    Err("Windows Service control is supported only on Windows".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn running_service_is_reconciled_without_restart() {
        assert_eq!(
            reconciliation_action("Running"),
            Ok(ReconciliationAction::KeepRunning)
        );
    }

    #[test]
    fn stopped_service_is_reconfigured_then_started() {
        assert_eq!(
            reconciliation_action("Stopped"),
            Ok(ReconciliationAction::UpdateThenStart)
        );
    }

    #[test]
    fn transitional_services_are_retryable_and_never_reconfigured() {
        for state in [
            "StartPending",
            "StopPending",
            "ContinuePending",
            "PausePending",
            "Paused",
        ] {
            let error =
                reconciliation_action(state).expect_err("transition must not be reconciled");
            assert!(
                error.contains("retry reconciliation"),
                "unexpected error for {state}: {error}"
            );
        }
    }

    #[test]
    fn unknown_service_state_requires_operator_retry() {
        let error =
            reconciliation_action("Unknown").expect_err("unknown state must not be reconciled");
        assert!(error.contains("unsupported SCM state"));
    }
}
