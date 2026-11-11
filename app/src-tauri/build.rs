const COMMANDS: &[&str] = &[
    "set_overlay_click_through",
    "ensure_overlay_visible",
    "reload_overlay",
    "quit_overlay",
    "update_tray_labels",
    "set_tray_overlay_muted",
    "start_browser_source",
    "browser_source_status",
    "set_browser_source_controls",
    "browser_source_heartbeat",
    "toggle_overlay_preview_mode",
    "move_overlay_to_monitor",
    "server_creator_status",
    "server_creator_install",
    "server_creator_install_bun",
    "server_creator_start",
    "server_creator_stop",
    "server_creator_restart",
    "server_creator_logs",
    "server_creator_public_ip",
    "auto_update_stage",
    "auto_update_restart_now",
];

fn main() {
    // Declaring the commands makes Tauri enforce the capability files for them: without an
    // app manifest every local window may call every command.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run tauri-build");
}
