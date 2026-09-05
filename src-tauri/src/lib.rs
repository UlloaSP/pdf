use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Manager;

#[derive(Default)]
struct JobState(Arc<Mutex<Option<u32>>>);

#[derive(Deserialize, Serialize)]
struct JobRequest {
    feature: String,
    inputs: Vec<String>,
    output_dir: String,
    options: serde_json::Value,
}

fn worker_command() -> Result<Command, String> {
    let executable = if cfg!(debug_assertions) {
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("binaries/pdf-worker-x86_64-pc-windows-msvc.exe")
    } else {
        std::env::current_exe()
            .map_err(|e| e.to_string())?
            .with_file_name("pdf-worker.exe")
    };
    if !executable.is_file() {
        return Err("Falta el motor local. Ejecuta el empaquetado del motor antes de iniciar la aplicación.".into());
    }
    let mut command = Command::new(executable);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    Ok(command)
}

#[tauri::command]
async fn run_tool(
    request: JobRequest,
    state: tauri::State<'_, JobState>,
) -> Result<serde_json::Value, String> {
    let active = state.0.clone();
    {
        let mut job = active.lock().map_err(|e| e.to_string())?;
        if job.is_some() {
            return Err("Ya hay una operación en ejecución.".into());
        }
        *job = Some(0);
    }
    let result = tauri::async_runtime::spawn_blocking(move || {
        let result = execute_job(request, &active);
        if let Ok(mut job) = active.lock() {
            *job = None;
        }
        result
    })
    .await
    .map_err(|e| e.to_string())?;
    result
}

fn execute_job(
    request: JobRequest,
    active: &Arc<Mutex<Option<u32>>>,
) -> Result<serde_json::Value, String> {
    let payload = serde_json::to_vec(&request).map_err(|e| e.to_string())?;
    if payload.len() > 2_000_000 {
        return Err("Solicitud demasiado grande.".into());
    }
    let mut command = worker_command()?;
    let mut job = active.lock().map_err(|e| e.to_string())?;
    if *job == Some(u32::MAX) {
        return Err("Operación cancelada.".into());
    }
    let mut child = command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    *job = Some(child.id());
    drop(job);
    if let Some(mut stdin) = child.stdin.take() {
        if let Err(error) = stdin.write_all(&payload) {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error.to_string());
        }
    }
    let stdout = child
        .stdout
        .take()
        .ok_or("No se pudo abrir la salida del motor")?;
    let reader = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        stdout
            .take(4_000_000)
            .read_to_end(&mut bytes)
            .map(|_| bytes)
    });
    let start = Instant::now();
    loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            if !status.success() {
                return Err("Operación cancelada o motor finalizado inesperadamente.".into());
            }
            break;
        }
        if start.elapsed() > Duration::from_secs(900) {
            stop_process(child.id());
            let _ = child.wait();
            return Err("La operación superó el límite de 15 minutos.".into());
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    let bytes = reader
        .join()
        .map_err(|_| "Error leyendo el motor")?
        .map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|_| "El motor devolvió una respuesta inválida.".into())
}

fn stop_process(pid: u32) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = Command::new("taskkill.exe")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(0x08000000)
            .output();
    }
}

#[tauri::command]
fn cancel_job(state: tauri::State<'_, JobState>) -> Result<(), String> {
    let mut job = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(pid) = *job {
        *job = Some(u32::MAX);
        if pid > 0 && pid != u32::MAX {
            stop_process(pid);
        }
    }
    Ok(())
}

#[derive(Serialize)]
struct AppInfo {
    name: &'static str,
    version: &'static str,
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: "PDF Utils",
        version: env!("CARGO_PKG_VERSION"),
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(JobState::default())
        .invoke_handler(tauri::generate_handler![get_app_info, run_tool, cancel_job])
        .build(tauri::generate_context!())
        .expect("No se ha podido iniciar PDF Utils")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                let _ = cancel_job(app.state::<JobState>());
            }
        });
}
