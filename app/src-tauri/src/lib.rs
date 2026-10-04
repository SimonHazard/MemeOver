use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Listener, Manager, WebviewUrl, WebviewWindowBuilder,
};
#[cfg(not(debug_assertions))]
use tauri_plugin_autostart::ManagerExt as _;

mod auto_update;
mod server_creator;

const AUTOSTART_ARG: &str = "--autostart";

// ─── Tray state ───────────────────────────────────────────────────────────────

/// Holds handles to translatable tray menu items so the frontend can
/// update their labels whenever the user changes the UI language.
struct TrayState {
    show_item: Mutex<MenuItem<tauri::Wry>>,
    quit_item: Mutex<MenuItem<tauri::Wry>>,
}

fn launched_from_autostart() -> bool {
    std::env::args_os().skip(1).any(|arg| arg == AUTOSTART_ARG)
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
        let _ = SetWindowPos(
            hwnd,
            Some(HWND_TOPMOST),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
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

/// Physical bounds `(x, y, width, height)`.
#[cfg_attr(debug_assertions, allow(dead_code))]
type Bounds = (i32, i32, u32, u32);

/// Whether the watcher should fit the overlay to its monitor again. A maximized
/// window followed resolution, scaling and monitor changes on its own; explicit
/// bounds do not, and no window event reports a resolution change. Each monitor
/// layout gets a single attempt so bounds the OS refuses are not retried forever.
#[cfg_attr(debug_assertions, allow(dead_code))]
fn should_refit(window: Bounds, monitor: Bounds, last_attempt: Option<Bounds>) -> bool {
    window != monitor && last_attempt != Some(monitor)
}

/// Spawns a long-lived background thread (production only) that reasserts the
/// overlay's native window level every 2 seconds and keeps it covering its monitor.
///
/// - Checks `is_visible()` to skip hidden overlays (e.g. after quit_overlay).
/// - Dispatches the actual platform calls to the main thread via
///   `run_on_main_thread`, which is mandatory for Objective-C / Win32 UI APIs.
/// - Sleep interval of 2 s keeps CPU overhead negligible (~0.05 % average).
#[cfg(not(debug_assertions))]
fn start_overlay_watcher(app: tauri::AppHandle) {
    std::thread::Builder::new()
        .name("overlay-watcher".into())
        .spawn(move || {
            let mut last_refit: Option<Bounds> = None;
            loop {
                std::thread::sleep(std::time::Duration::from_secs(2));

                let Some(win) = app.get_webview_window("overlay") else {
                    continue;
                };

                if !win.is_visible().unwrap_or(false) {
                    continue;
                }

                let refit_to = match (
                    win.current_monitor(),
                    win.outer_position(),
                    win.inner_size(),
                ) {
                    (Ok(Some(monitor)), Ok(pos), Ok(size)) => {
                        let target = (
                            monitor.position().x,
                            monitor.position().y,
                            monitor.size().width,
                            monitor.size().height,
                        );
                        let window = (pos.x, pos.y, size.width, size.height);
                        if window == target {
                            last_refit = None;
                            None
                        } else if should_refit(window, target, last_refit) {
                            last_refit = Some(target);
                            Some(monitor)
                        } else {
                            None
                        }
                    }
                    _ => None,
                };

                let win_clone = win.clone();
                let _ = win.run_on_main_thread(move || {
                    if let Some(monitor) = refit_to {
                        let _ = fit_overlay_to_monitor(&win_clone, &monitor);
                    }
                    apply_native_overlay_level(&win_clone);
                });
            }
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
            win.eval("window.location.reload()")
                .map_err(|e| e.to_string())?;
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

/// Cover the whole monitor with the overlay, including the taskbar / menu bar area.
///
/// Explicit bounds instead of `maximize()`: maximizing stops at the work area, and
/// since tao 0.37 (Tauri 2.12) a window built hidden + maximized is only maximized
/// when first shown on Windows. The overlay is transparent and click-through, so it
/// can safely span the full physical bounds of the screen.
fn fit_overlay_to_monitor(
    win: &tauri::WebviewWindow,
    monitor: &tauri::Monitor,
) -> tauri::Result<()> {
    let pos = *monitor.position();
    let size = *monitor.size();
    // Position first: moving to a monitor with another scale factor may resize
    // the window, so the final size must be applied afterwards.
    win.set_position(tauri::PhysicalPosition::new(pos.x, pos.y))?;
    win.set_size(tauri::PhysicalSize::new(size.width, size.height))?;
    Ok(())
}

/// Fit the overlay to the monitor it currently sits on (primary as a fallback).
fn fit_overlay_to_current_monitor(win: &tauri::WebviewWindow) -> tauri::Result<()> {
    let monitor = match win.current_monitor()? {
        Some(monitor) => Some(monitor),
        None => win.primary_monitor()?,
    };
    match monitor {
        Some(monitor) => fit_overlay_to_monitor(win, &monitor),
        None => Ok(()),
    }
}

/// Move the overlay window to the monitor at the given index (from `available_monitors()`).
///
/// If the overlay is currently visible (e.g. a media item is playing), it is hidden
/// before the move and restored afterwards. This prevents the intermediate states
/// (repositioned → resized) from being visible to the user.
/// `win.hide()` does not trigger the CloseRequested handler, so no
/// `overlay-health-changed` event is emitted and the webview keeps running.
///
/// Sequence: hide (if visible) → set_position → set_size (full monitor bounds) →
/// re-apply native level → show (if was visible).
#[tauri::command]
fn move_overlay_to_monitor(app: tauri::AppHandle, monitor_index: usize) -> Result<(), String> {
    let win = app
        .get_webview_window("overlay")
        .ok_or_else(|| "Overlay window not found".to_string())?;

    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let monitor = monitors.get(monitor_index).ok_or_else(|| {
        format!(
            "Monitor index {} out of range (found {})",
            monitor_index,
            monitors.len()
        )
    })?;

    // Remember visibility so we can restore it after the move.
    let was_visible = win.is_visible().unwrap_or(false);
    if was_visible {
        win.hide().map_err(|e| e.to_string())?;
    }

    // Run the repositioning steps in a closure so we can guarantee show() is
    // called even if any intermediate step fails — the overlay must never stay
    // permanently hidden due to a positioning error.
    let move_result = (|| -> Result<(), String> {
        fit_overlay_to_monitor(&win, monitor).map_err(|e| e.to_string())?;
        apply_native_overlay_level(&win);
        Ok(())
    })();

    // Best-effort restore — ignore any show() error to keep propagating the
    // original move_result if it failed.
    if was_visible {
        let _ = win.show();
    }

    move_result
}

/// Toggle the overlay between dev mode (decorated, windowed, opaque) and a
/// prod-like preview (no decorations, always-on-top, full monitor, transparent).
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
        fit_overlay_to_current_monitor(&win).map_err(|e| e.to_string())?;
        win.set_background_color(Some(tauri::utils::config::Color(0, 0, 0, 0)))
            .map_err(|e| e.to_string())?;
        win.set_ignore_cursor_events(true)
            .map_err(|e| e.to_string())?;
    } else {
        win.set_ignore_cursor_events(false)
            .map_err(|e| e.to_string())?;
        win.set_background_color(None).map_err(|e| e.to_string())?;
        win.set_size(tauri::LogicalSize::new(800.0, 600.0))
            .map_err(|e| e.to_string())?;
        win.center().map_err(|e| e.to_string())?;
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

    // Prod: transparent always-on-top overlay covering the whole monitor.
    // Not `maximized`: that stops at the work area (taskbar / menu bar excluded).
    #[cfg(not(debug_assertions))]
    let builder = builder
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .resizable(false);

    // Windows draws a 1px border (and rounded corners on Windows 11) around
    // undecorated windows that keep the default shadow, unless they are maximized.
    #[cfg(all(not(debug_assertions), windows))]
    let builder = builder.shadow(false);

    #[cfg_attr(debug_assertions, allow(unused_variables))]
    let win = builder.build()?;

    #[cfg(not(debug_assertions))]
    fit_overlay_to_current_monitor(&win)?;

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

fn show_settings_window(app: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

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
                        show_settings_window(app);
                    }
                }
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                show_settings_window(app);
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

// ─── Settings window — check unsaved edits before hiding ──────────────────────

/// How long the settings page has to acknowledge a close request before Rust hides
/// the window itself (page still loading, crashed or frozen).
const SETTINGS_CLOSE_ACK_TIMEOUT: Duration = Duration::from_millis(1500);

fn setup_settings_close_behavior(app: &tauri::App) {
    if let Some(win) = app.get_webview_window("settings") {
        let requested = Arc::new(AtomicU64::new(0));
        let acknowledged = Arc::new(AtomicU64::new(0));
        {
            let requested = requested.clone();
            let acknowledged = acknowledged.clone();
            app.listen_any("settings-close-ack", move |_| {
                acknowledged.store(requested.load(Ordering::SeqCst), Ordering::SeqCst);
            });
        }
        let win2 = win.clone();
        win.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let request = requested.fetch_add(1, Ordering::SeqCst) + 1;
                let _ = win2.emit("settings-close-requested", ());
                let win3 = win2.clone();
                let acknowledged = acknowledged.clone();
                let _ = std::thread::Builder::new()
                    .name("settings-close-fallback".into())
                    .spawn(move || {
                        std::thread::sleep(SETTINGS_CLOSE_ACK_TIMEOUT);
                        if acknowledged.load(Ordering::SeqCst) < request {
                            let _ = win3.hide();
                        }
                    });
            }
        });
    }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(server_creator::ServerCreatorState::default())
        .manage(auto_update::AutoUpdateState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus the settings window of the already-running instance
            show_settings_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_ARG]),
        ))
        .invoke_handler(tauri::generate_handler![
            set_overlay_click_through,
            ensure_overlay_visible,
            reload_overlay,
            quit_overlay,
            update_tray_labels,
            toggle_overlay_preview_mode,
            move_overlay_to_monitor,
            server_creator::server_creator_status,
            server_creator::server_creator_install,
            server_creator::server_creator_install_bun,
            server_creator::server_creator_start,
            server_creator::server_creator_stop,
            server_creator::server_creator_restart,
            server_creator::server_creator_logs,
            server_creator::server_creator_public_ip,
            auto_update::auto_update_stage,
            auto_update::auto_update_restart_now,
        ])
        .setup(|app| {
            let background_start = launched_from_autostart();

            #[cfg(not(debug_assertions))]
            {
                // Re-register existing entries so installs that enabled autostart
                // before the background flag was introduced receive it as well.
                let autolaunch = app.autolaunch();
                if autolaunch.is_enabled().unwrap_or(false) {
                    let _ = autolaunch.enable();
                }
            }

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

            if background_start {
                #[cfg(target_os = "macos")]
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            } else {
                show_settings_window(app.handle());
            }

            // Start the background watcher that reasserts the window level every 2 s.
            #[cfg(not(debug_assertions))]
            start_overlay_watcher(app.handle().clone());

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            // Kill the managed self-hosted bot process so it does not
            // outlive the app and keep its port bound, then apply a staged
            // Windows update (exits the process when one is pending).
            if let tauri::RunEvent::Exit = event {
                server_creator::shutdown(
                    &app_handle.state::<server_creator::ServerCreatorState>(),
                );
                auto_update::apply_on_exit(app_handle);
            }
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    const FULL_HD: Bounds = (0, 0, 1920, 1080);

    #[test]
    fn overlay_covering_its_monitor_is_left_alone() {
        assert!(!should_refit(FULL_HD, FULL_HD, None));
    }

    #[test]
    fn resolution_change_refits_the_overlay() {
        assert!(should_refit(FULL_HD, (0, 0, 2560, 1440), None));
    }

    #[test]
    fn overlay_moved_to_another_monitor_refits_there() {
        // Windows relocates windows from an unplugged monitor without resizing them.
        let stale = (1920, 0, 2560, 1440);
        assert!(should_refit(stale, (1920, 0, 1920, 1080), None));
    }

    #[test]
    fn refused_bounds_are_not_retried_for_the_same_layout() {
        let constrained = (0, 25, 1920, 1055);
        assert!(!should_refit(constrained, FULL_HD, Some(FULL_HD)));
    }

    #[test]
    fn a_new_layout_gets_a_new_attempt() {
        let constrained = (0, 25, 1920, 1055);
        assert!(should_refit(constrained, (0, 0, 2560, 1440), Some(FULL_HD)));
    }
}
