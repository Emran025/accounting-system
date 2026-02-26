// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Child};
use std::sync::Mutex;
use tauri::Manager;

static mut LARAVEL_PROCESS: Option<Child> = None;

fn main() {
    // Laravel
    let child = Command::new("php")
        .current_dir("../src")
        .args(["-S", "127.0.0.1:8000", "-t", "public"])
        .spawn()
        .expect("Failed to start Laravel");

    unsafe {
        LARAVEL_PROCESS = Some(child);
    }

    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();

            app_handle.listen_global("tauri://close-requested", move |_| {
                unsafe {
                    if let Some(mut process) = LARAVEL_PROCESS.take() {
                        let _ = process.kill();
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}