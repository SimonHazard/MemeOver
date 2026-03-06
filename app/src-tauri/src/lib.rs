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

// ─── Native overlay level (macOS) ─────────────────────────────────────────────

/// Sets the NSWindow level to NSStatusWindowLevel (25) so the overlay floats
/// above fullscreen applications and Mission Control transitions. Also sets
/// the collection behavior so macOS migrates the window to any Space,
/// including fullscreen Spaces (FullScreenAuxiliary).
///
/// Constants used:
///   NSStatusWindowLevel                        = 25
///   NSWindowCollectionBehaviorCanJoinAllSpaces  = 1 << 0  (1)
///   NSWindowCollectionBehaviorFullScreenAuxiliary = 1 << 8 (256)
#[cfg(all(target_os = "macos", not(debug_assertions)))]
fn apply_macos_overlay_level(win: &tauri::WebviewWindow) {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};

    let Ok(handle) = win.window_handle() else {
        return;
    };
    let RawWindowHandle::AppKit(appkit) = handle.as_raw() else {
        return;
    };

    unsafe {
        // ns_view is a NonNull<c_void> pointing to the NSView backing the webview.
        let ns_view = appkit.ns_view.as_ptr() as *mut AnyObject;

        // Retrieve the NSWindow that owns this view.
        let ns_win: *mut AnyObject = msg_send![ns_view, window];
        if ns_win.is_null() {
            return;
        }

        // Float above fullscreen apps (NSStatusWindowLevel = 25).
        let _: () = msg_send![ns_win, setLevel: 25i64];

        // Allow the window to follow the user across all Spaces, including
        // fullscreen Spaces (bit 0 = CanJoinAllSpaces, bit 8 = FullScreenAuxiliary).
        let _: () = msg_send![ns_win, setCollectionBehavior: 257u64];
    }
}

// ─── Native overlay level (Windows) ───────────────────────────────────────────

/// Re-injects HWND_TOPMOST via SetWindowPos, forcing the overlay above any
/// fullscreen DirectX / exclusive-mode application on Windows.
#[cfg(target_os = "windows")]
fn apply_windows_topmost(win: &tauri::WebviewWindow) {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
    };

    let Ok(handle) = win.window_handle() else {
        return;
    };
    let RawWindowHandle::Win32(w32) = handle.as_raw() else {
        return;
    };

    // Construct the typed HWND from the raw isize value.
    let hwnd = HWND(w32.hwnd.get() as *mut core::ffi::c_void);
    unsafe {
        let _ = SetWindowPos(hwnd, Some(HWND_TOPMOST), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
    }
}

// ─── Unified overlay level helper ─────────────────────────────────────────────

/// Applies always-on-top + the platform-native window level to the overlay.
#[cfg(not(debug_assertions))]
fn apply_native_overlay_level(win: &tauri::WebviewWindow) {
    let _ = win.set_always_on_top(true);

    #[cfg(target_os = "macos")]
    apply_macos_overlay_level(win);

    #[cfg(target_os = "windows")]
    apply_windows_topmost(win);
}

/// No-op in debug builds — overlay window stays in normal mode for development.
#[cfg(debug_assertions)]
fn apply_native_overlay_level(_win: &tauri::WebviewWindow) {}

// ─── Overlay watcher ──────────────────────────────────────────────────────────

/// Spawns a long-lived background thread (production only) that reasserts the
/// overlay's native window level every 2 seconds.
///
/// - Checks `is_visible()` to skip hidden overlays (e.g. after quit_overlay).
/// - Dispatches the actual platform calls to the main thread via
///   `run_on_main_thread`, which is mandatory for Objective-C / Win32 UI APIs.
/// - Sleep interval of 2 s keeps CPU overhead negligible (~0.05 % average).
#[cfg(not(debug_assertions))]
fn start_overlay_watcher(app: tauri::AppHandle) {
    std::thread::Builder::new()
        .name("overlay-watcher".into())
        .spawn(move || loop {
            std::thread::sleep(std::time::Duration::from_secs(2));

            let Some(win) = app.get_webview_window("overlay") else {
                continue;
            };

            if !win.is_visible().unwrap_or(false) {
                continue;
            }

            let win_clone = win.clone();
            let _ = win.run_on_main_thread(move || {
                apply_native_overlay_level(&win_clone);
            });
        })
        .expect("overlay-watcher thread failed to start");
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
            // Re-apply the native window level before reloading so it is set
            // when the page finishes loading (main-overlay.tsx then calls show()).
            apply_native_overlay_level(&win);
            win.eval("window.location.reload()").map_err(|e| e.to_string())?;
        }
        None => {
            // Safety fallback: window was unexpectedly destroyed — recreate it.
            create_overlay_window(&app).map_err(|e| e.to_string())?;
            if let Some(win) = app.get_webview_window("overlay") {
                attach_overlay_close_handler(&win);
                apply_native_overlay_level(&win);
                // main-overlay.tsx calls show() after the page loads; no show() here.
            }
        }
    }
    app.emit("overlay-health-changed", "alive")
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Toggle the overlay between dev mode (decorated, windowed, opaque) and a
/// prod-like preview (no decorations, always-on-top, maximized, transparent).
/// Only meaningful in debug builds; the frontend gate (`import.meta.env.DEV`)
/// ensures it is never called from a production bundle.
#[tauri::command]
fn toggle_overlay_preview_mode(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let win = app
        .get_webview_window("overlay")
        .ok_or_else(|| "Overlay window not found".to_string())?;

    if enabled {
        win.set_decorations(false).map_err(|e| e.to_string())?;
        win.set_always_on_top(true).map_err(|e| e.to_string())?;
        win.maximize().map_err(|e| e.to_string())?;
        win.set_background_color(Some(tauri::utils::config::Color(0, 0, 0, 0)))
            .map_err(|e| e.to_string())?;
        win.set_ignore_cursor_events(true).map_err(|e| e.to_string())?;
    } else {
        win.set_ignore_cursor_events(false).map_err(|e| e.to_string())?;
        win.set_background_color(None).map_err(|e| e.to_string())?;
        win.unmaximize().map_err(|e| e.to_string())?;
        win.set_always_on_top(false).map_err(|e| e.to_string())?;
        win.set_decorations(true).map_err(|e| e.to_string())?;
    }

    app.emit("overlay-dev-preview", enabled)
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
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            set_overlay_click_through,
            ensure_overlay_visible,
            reload_overlay,
            quit_overlay,
            update_tray_labels,
            toggle_overlay_preview_mode,
        ])
        .setup(|app| {
            create_overlay_window(&app.handle().clone())?;

            // Apply the native window level immediately after creation (prod only).
            // The builder sets always_on_top(true) but only at NSFloatingWindowLevel;
            // apply_native_overlay_level elevates to NSStatusWindowLevel on macOS.
            #[cfg(not(debug_assertions))]
            if let Some(overlay) = app.get_webview_window("overlay") {
                apply_native_overlay_level(&overlay);
            }

            setup_overlay_close_notification(app);
            setup_tray(app)?;
            setup_settings_close_behavior(app);

            // Start the background watcher that reasserts the window level every 2 s.
            #[cfg(not(debug_assertions))]
            start_overlay_watcher(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
