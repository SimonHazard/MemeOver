#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri::Manager;
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let main_window = app.get_webview_window("main").unwrap();
      
      // Enable click-through functionality
      main_window.set_ignore_cursor_events(true).unwrap();

      // if cfg!(debug_assertions) {
      //     main_window.open_devtools();
      // }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
