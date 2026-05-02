use std::path::PathBuf;
use tauri::Manager;

fn offline_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|error| error.to_string())?
    .join("offline");
  std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
  Ok(dir)
}

fn sanitize_file_name(file_name: &str) -> String {
  let sanitized: String = file_name
    .chars()
    .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_'))
    .collect();

  if sanitized.is_empty() {
    "offline_file".to_string()
  } else {
    sanitized
  }
}

#[tauri::command]
fn save_offline_file(
  app: tauri::AppHandle,
  file_name: String,
  bytes: Vec<u8>,
) -> Result<String, String> {
  let path = offline_dir(&app)?.join(sanitize_file_name(&file_name));
  std::fs::write(&path, bytes).map_err(|error| error.to_string())?;
  Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_offline_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
  let offline = offline_dir(&app)?;
  let target = PathBuf::from(path);

  if !target.exists() {
    return Ok(());
  }

  let offline = offline.canonicalize().map_err(|error| error.to_string())?;
  let target = target.canonicalize().map_err(|error| error.to_string())?;
  if !target.starts_with(offline) {
    return Err("Refusing to delete a file outside offline storage".to_string());
  }

  std::fs::remove_file(target).map_err(|error| error.to_string())
}

fn validate_offline_file(app: &tauri::AppHandle, path: String) -> Result<PathBuf, String> {
  let offline = offline_dir(app)?;
  let target = PathBuf::from(path);

  if !target.exists() {
    return Err("Offline file does not exist".to_string());
  }

  let offline = offline.canonicalize().map_err(|error| error.to_string())?;
  let target = target.canonicalize().map_err(|error| error.to_string())?;
  if !target.starts_with(offline) {
    return Err("Refusing to access a file outside offline storage".to_string());
  }

  Ok(target)
}

#[tauri::command]
fn read_offline_file(app: tauri::AppHandle, path: String) -> Result<Vec<u8>, String> {
  let target = validate_offline_file(&app, path)?;
  std::fs::read(target).map_err(|error| error.to_string())
}

#[tauri::command]
fn offline_file_exists(app: tauri::AppHandle, path: String) -> Result<bool, String> {
  let Ok(target) = validate_offline_file(&app, path) else {
    return Ok(false);
  };

  Ok(target
    .metadata()
    .map(|metadata| metadata.len() > 0)
    .unwrap_or(false))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      save_offline_file,
      delete_offline_file,
      read_offline_file,
      offline_file_exists
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
