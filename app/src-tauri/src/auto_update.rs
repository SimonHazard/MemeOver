//! Background auto-update: download silently, apply on the next launch.
//!
//! The settings page calls [`auto_update_stage`] at startup when the user keeps
//! automatic updates enabled. The package is downloaded and its signature
//! verified without interrupting the overlay, then:
//!
//! - **macOS / Linux:** installed on disk immediately. The running process keeps
//!   its loaded binary, so the new version starts on the next launch.
//! - **Windows:** `install()` launches the installer and exits the process, so
//!   the verified bytes stay in memory and are installed when the app quits
//!   (see [`apply_on_exit`]), without relaunching it afterwards.
//!
//! Bytes are never persisted: `install()` does not re-verify the signature, so
//! keeping them in memory avoids trusting a file that could change on disk.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::server_creator;

#[derive(Default)]
pub struct AutoUpdateState {
    staged: Mutex<Option<StagedPackage>>,
    in_flight: AtomicBool,
}

struct StagedPackage {
    update: Update,
    /// Verified installer bytes, kept until exit (Windows) because installing
    /// terminates the process.
    #[cfg(windows)]
    bytes: Vec<u8>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StagedUpdate {
    version: String,
    current_version: String,
    body: Option<String>,
}

impl StagedPackage {
    fn meta(&self) -> StagedUpdate {
        StagedUpdate {
            version: self.update.version.clone(),
            current_version: self.update.current_version.clone(),
            body: self.update.body.clone(),
        }
    }
}

fn staged_meta(state: &AutoUpdateState) -> Option<StagedUpdate> {
    state
        .staged
        .lock()
        .ok()
        .and_then(|staged| staged.as_ref().map(StagedPackage::meta))
}

struct InFlightGuard<'a>(&'a AtomicBool);

impl Drop for InFlightGuard<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

/// Checks, downloads and stages the latest release. Returns the staged update,
/// or `None` when already up to date. Idempotent: a staged update is returned
/// without hitting the network again.
#[tauri::command]
pub async fn auto_update_stage(
    app: AppHandle,
    state: State<'_, AutoUpdateState>,
) -> Result<Option<StagedUpdate>, String> {
    // Dev builds would replace the debug binary in `target/`.
    if cfg!(debug_assertions) {
        return Ok(None);
    }
    if let Some(meta) = staged_meta(&state) {
        return Ok(Some(meta));
    }
    if state.in_flight.swap(true, Ordering::SeqCst) {
        return Ok(None);
    }
    let _guard = InFlightGuard(&state.in_flight);

    // Installing on Windows exits through `std::process::exit`, which skips
    // `RunEvent::Exit`: stop the managed bot here instead.
    let exit_app = app.clone();
    let updater = app
        .updater_builder()
        .on_before_exit(move || {
            server_creator::shutdown(&exit_app.state::<server_creator::ServerCreatorState>());
        })
        .build()
        .map_err(|e| e.to_string())?;
    let Some(update) = updater.check().await.map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let bytes = update
        .download(|_, _| {}, || {})
        .await
        .map_err(|e| e.to_string())?;

    #[cfg(not(windows))]
    let package = {
        // May prompt for admin rights through the main thread, so stay off it.
        let to_install = update.clone();
        tauri::async_runtime::spawn_blocking(move || to_install.install(bytes))
            .await
            .map_err(|e| e.to_string())?
            .map_err(|e| e.to_string())?;
        StagedPackage { update }
    };
    #[cfg(windows)]
    let package = StagedPackage { update, bytes };

    let meta = package.meta();
    *state.staged.lock().map_err(|e| e.to_string())? = Some(package);
    Ok(Some(meta))
}

/// Applies the staged update right away and relaunches MemeOver.
#[tauri::command]
pub async fn auto_update_restart_now(
    app: AppHandle,
    state: State<'_, AutoUpdateState>,
) -> Result<(), String> {
    let staged = state
        .staged
        .lock()
        .map_err(|e| e.to_string())?
        .take()
        .ok_or_else(|| "no staged update".to_string())?;

    #[cfg(windows)]
    {
        let _ = app;
        // Exits the process and lets the installer relaunch the new version.
        if let Err(err) = staged.update.install(&staged.bytes) {
            let message = err.to_string();
            if let Ok(mut slot) = state.staged.lock() {
                *slot = Some(staged);
            }
            return Err(message);
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        // Already installed on disk: restarting runs the new bundle.
        drop(staged);
        server_creator::shutdown(&app.state::<server_creator::ServerCreatorState>());
        app.restart()
    }
}

/// Installs a staged Windows update while the app quits, without relaunching it.
pub fn apply_on_exit(app: &AppHandle) {
    #[cfg(windows)]
    {
        let staged = app
            .state::<AutoUpdateState>()
            .staged
            .lock()
            .ok()
            .and_then(|mut slot| slot.take());
        if let Some(staged) = staged {
            if let Err(err) = staged
                .update
                .restart_after_install(false)
                .install(&staged.bytes)
            {
                eprintln!("[auto-update] install on exit failed: {err}");
            }
        }
    }
    #[cfg(not(windows))]
    let _ = app;
}
