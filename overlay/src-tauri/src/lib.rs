#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri::Manager;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{TrayIconBuilder},
};

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let main_window = app.get_webview_window("main").unwrap();
      
      // Enable click-through functionality
      main_window.set_ignore_cursor_events(true).unwrap();

      // if cfg!(debug_assertions) {
      //     main_window.open_devtools();
      // }

      let quit = MenuItemBuilder::new("Quit").id("quit").build(app).unwrap();
      let hide = MenuItemBuilder::new("Hide").id("hide").build(app).unwrap();
      let show = MenuItemBuilder::new("Show").id("show").build(app).unwrap();
      // we could opt handle an error case better than calling unwrap
      let menu = MenuBuilder::new(app)
        .items(&[&quit, &hide, &show])
        .build()
        .unwrap();

      let _ = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
          "quit" => app.exit(0),
          "hide" => {
            let window = app.get_webview_window("main").unwrap();
            window.hide().unwrap();
          }
          "show" => {
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();
          }
          _ => {}
        })
        .build(app);

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
