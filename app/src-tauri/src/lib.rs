use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};

// ─── Tray state ───────────────────────────────────────────────────────────────

/// Holds handles to translatable tray menu items so the frontend can
/// update their labels whenever the user changes the UI language.
struct TrayState {
    show_item: Mutex<MenuItem<tauri::Wry>>,
    quit_item: Mutex<MenuItem<tauri::Wry>>,
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

/// Enable or disable click-through on the overlay window.
/// Called from the overlay React app on mount (and from settings if needed).
#[tauri::command]
fn set_overlay_click_through(app: tauri::AppHandle, ignore: bool) -> Result<(), String> {
    app.get_webview_window("overlay")
        .ok_or_else(|| "Overlay window not found".to_string())?
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

/// Force a JavaScript reload of the overlay window without destroying it.
/// The WebSocket will reconnect automatically via shouldReconnect.
#[tauri::command]
fn reload_overlay(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("overlay")
        .ok_or_else(|| "Overlay window not found".to_string())?
        .eval("window.location.reload()")
        .map_err(|e| e.to_string())
}

/// Hide the overlay window without destroying it.
/// Emits "overlay-health-changed: closed" manually since Destroyed won't fire.
#[tauri::command]
fn quit_overlay(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("overlay")
        .ok_or_else(|| "Overlay window not found".to_string())?
        .hide()
        .map_err(|e| e.to_string())?;
    app.emit("overlay-health-changed", "closed")
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Show the overlay window (or recreate it if somehow destroyed).
/// Always reloads the page so the overlay picks up any config changes
/// (WebSocket URL, guild ID, token, etc.) that occurred while it was hidden.
/// Emits "overlay-health-changed" with "alive" after success.
#[tauri::command]
fn ensure_overlay_visible(app: tauri::AppHandle) -> Result<(), String> {
    match app.get_webview_window("overlay") {
        Some(win) => {
            win.unminimize().map_err(|e| e.to_string())?;
            // Apply always-on-top before reload so the property is set when the
            // page loads. main-overlay.tsx calls show() once the page is ready,
            // avoiding the flash caused by show() → blank → content.
            #[cfg(not(debug_assertions))]
            win.set_always_on_top(true).map_err(|e| e.to_string())?;
            win.eval("window.location.reload()").map_err(|e| e.to_string())?;
        }
        None => {
            // Safety fallback: window was unexpectedly destroyed — recreate it.
            create_overlay_window(&app).map_err(|e| e.to_string())?;
            if let Some(win) = app.get_webview_window("overlay") {
                attach_overlay_close_handler(&win);
                // main-overlay.tsx calls show() after the page loads; no show() here.
            }
        }
    }
    app.emit("overlay-health-changed", "alive")
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Update the translatable labels of the tray context menu.
/// Called from the frontend after every language change.
#[tauri::command]
fn update_tray_labels(
    state: tauri::State<TrayState>,
    show_label: String,
    quit_label: String,
) -> Result<(), String> {
    state
        .show_item
        .lock()
        .map_err(|_| "TrayState lock poisoned".to_string())?
        .set_text(show_label)
        .map_err(|e| e.to_string())?;
    state
        .quit_item
        .lock()
        .map_err(|_| "TrayState lock poisoned".to_string())?
        .set_text(quit_label)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Overlay window ───────────────────────────────────────────────────────────

/// Create the overlay window with the correct URL depending on the build mode.
/// In dev, Tauri does NOT resolve relative paths against `devUrl`, so we must
/// supply the full `http://localhost:1420/overlay.html` URL explicitly.
/// In production, `WebviewUrl::App` resolves against `frontendDist` as usual.
fn create_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    #[cfg(debug_assertions)]
    let url = WebviewUrl::External(
        "http://localhost:1420/overlay.html"
            .parse()
            .expect("overlay dev URL is valid"),
    );
    #[cfg(not(debug_assertions))]
    let url = WebviewUrl::App("overlay.html".into());

    // Common properties for both modes
    let builder = WebviewWindowBuilder::new(app, "overlay", url)
        .title("MemeOver Overlay")
        .visible(false)
        .skip_taskbar(true)
        .accept_first_mouse(true);

    // Dev: normal 800×600 window — no fullscreen or always_on_top
    // to avoid blocking clicks on the settings window during development.
    #[cfg(debug_assertions)]
    let builder = builder
        .inner_size(800.0, 600.0)
        .decorations(true)
        .transparent(false)
        .always_on_top(false)
        .resizable(true);

    // Prod: transparent fullscreen always-on-top overlay (final behavior).
    #[cfg(not(debug_assertions))]
    let builder = builder
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .maximized(true)
        .resizable(false);

    builder.build()?;

    Ok(())
}

// ─── Overlay close notification ───────────────────────────────────────────────

/// Attach event listeners to the overlay window.
///
/// - `CloseRequested` (e.g. Alt+F4 on Windows): prevented, window is hidden instead.
/// - `Destroyed` (safety net, should not trigger in normal operation): emits closed signals.
fn attach_overlay_close_handler(win: &tauri::WebviewWindow) {
    let handle = win.app_handle().clone();
    let win_clone = win.clone();
    win.on_window_event(move |event| match event {
        tauri::WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            let _ = win_clone.hide();
            let _ = handle.emit("overlay-health-changed", "closed");
        }
        tauri::WindowEvent::Destroyed => {
            let _ = handle.emit("overlay-health-changed", "closed");
            let _ = handle.emit("ws-status-changed", "disconnected");
        }
        _ => {}
    });
}

fn setup_overlay_close_notification(app: &tauri::App) {
    if let Some(win) = app.get_webview_window("overlay") {
        attach_overlay_close_handler(&win);
    }
}

// ─── Tray icon ────────────────────────────────────────────────────────────────

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "Show MemeOver", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "Hide MemeOver", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &hide_i, &sep, &quit_i])?;

    // Store handles so the frontend can update labels on language change
    app.manage(TrayState {
        show_item: Mutex::new(show_i),
        quit_item: Mutex::new(quit_i),
    });

    let icon = app
        .default_window_icon()
        .cloned()
        .expect("No app icon configured");

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false) // left click → toggle via on_tray_icon_event
        .tooltip("MemeOver")
        .on_tray_icon_event(|tray, event| {
            // Left click → show / hide the settings window
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("settings") {
                    if win.is_visible().unwrap_or(false) {
                        let _ = win.hide();
                    } else {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("settings") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "hide" => {
                if let Some(w) = app.get_webview_window("settings") {
                    let _ = w.hide();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

// ─── Settings window — close → hide ──────────────────────────────────────────

fn setup_settings_close_behavior(app: &tauri::App) {
    if let Some(win) = app.get_webview_window("settings") {
        let win2 = win.clone();
        win.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = win2.hide();
            }
        });
    }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            set_overlay_click_through,
            ensure_overlay_visible,
            reload_overlay,
            quit_overlay,
            update_tray_labels,
        ])
        .setup(|app| {
            create_overlay_window(&app.handle().clone())?;
            setup_overlay_close_notification(app);
            setup_tray(app)?;
            setup_settings_close_behavior(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
