use serde::Serialize;

#[derive(Serialize)]
struct SystemSummary {
    os: String,
    arch: String,
    app_version: String,
}

#[tauri::command]
fn system_summary(app: tauri::AppHandle) -> SystemSummary {
    SystemSummary {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: app.package_info().version.to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![system_summary])
        .run(tauri::generate_context!())
        .expect("error while running LiveTask desktop");
}
