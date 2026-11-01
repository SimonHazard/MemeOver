//! Opt-in local OBS browser source.
//!
//! The official `tauri-plugin-localhost` serves the built frontend (including
//! `obs.html`) on `127.0.0.1:<port>`. It is registered at runtime, only once the
//! user enables the source, and has no stop mechanism: disabling it or changing
//! the port takes effect after a restart. The server only serves public assets;
//! credentials stay in the URL fragment, which browsers never send.

use std::net::TcpListener;
use std::sync::Mutex;
use tauri::{AppHandle, Runtime, State};

/// Loopback only: never reachable from the LAN.
const LOOPBACK: &str = "127.0.0.1";
const MIN_PORT: u16 = 1024;

#[derive(Default)]
pub struct ObsSourceState {
    port: Mutex<Option<u16>>,
}

/// Why the source could not start, as a stable code the settings page translates.
#[derive(Debug, PartialEq, Eq)]
pub enum StartError {
    /// Already serving on another port; the plugin cannot be stopped or rebound.
    RestartRequired,
    InvalidPort,
    PortInUse,
    Plugin(String),
}

impl StartError {
    fn code(&self) -> String {
        match self {
            Self::RestartRequired => "restart_required".into(),
            Self::InvalidPort => "invalid_port".into(),
            Self::PortInUse => "port_in_use".into(),
            Self::Plugin(message) => message.clone(),
        }
    }
}

pub fn start<R: Runtime>(
    app: &AppHandle<R>,
    state: &ObsSourceState,
    port: u16,
) -> Result<u16, StartError> {
    let mut running = state
        .port
        .lock()
        .map_err(|_| StartError::Plugin("ObsSourceState lock poisoned".into()))?;
    match *running {
        Some(current) if current == port => return Ok(port),
        Some(_) => return Err(StartError::RestartRequired),
        None => {}
    }
    if port < MIN_PORT {
        return Err(StartError::InvalidPort);
    }
    // The plugin binds on its own thread and panics there when the port is taken,
    // with no feedback. Probe first; a race with another program in between only
    // ends that thread, because the release profile unwinds.
    drop(TcpListener::bind((LOOPBACK, port)).map_err(|_| StartError::PortInUse)?);
    app.plugin(
        tauri_plugin_localhost::Builder::new(port)
            .host(LOOPBACK)
            .build(),
    )
    .map_err(|e| StartError::Plugin(e.to_string()))?;
    *running = Some(port);
    Ok(port)
}

/// Start serving the OBS page. Idempotent for the running port.
#[tauri::command]
pub fn start_obs_source(
    app: AppHandle,
    state: State<'_, ObsSourceState>,
    port: u16,
) -> Result<u16, String> {
    start(&app, &state, port).map_err(|e| e.code())
}

/// Port the OBS page is served on in this session, if any.
#[tauri::command]
pub fn obs_source_status(state: State<'_, ObsSourceState>) -> Option<u16> {
    state.port.lock().ok().and_then(|port| *port)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::borrow::Cow;
    use std::io::{Read, Write};
    use std::net::TcpStream;
    use std::time::Duration;
    use tauri::utils::assets::{AssetKey, AssetsIter, CspHash};
    use tauri::Assets;

    const OBS_HTML: &[u8] = b"<!doctype html><title>MemeOver OBS</title>";

    struct ObsAssets;

    impl<R: Runtime> Assets<R> for ObsAssets {
        fn get(&self, key: &AssetKey) -> Option<Cow<'_, [u8]>> {
            (key.as_ref() == "/obs.html").then_some(Cow::Borrowed(OBS_HTML))
        }
        fn iter(&self) -> Box<AssetsIter<'_>> {
            Box::new(std::iter::empty())
        }
        fn csp_hashes(&self, _html_path: &AssetKey) -> Box<dyn Iterator<Item = CspHash<'_>> + '_> {
            Box::new(std::iter::empty())
        }
    }

    fn free_port() -> u16 {
        TcpListener::bind((LOOPBACK, 0))
            .unwrap()
            .local_addr()
            .unwrap()
            .port()
    }

    fn get(port: u16, path: &str) -> String {
        for _ in 0..50 {
            if let Ok(mut stream) = TcpStream::connect((LOOPBACK, port)) {
                stream
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .unwrap();
                write!(stream, "GET {path} HTTP/1.1\r\nHost: {LOOPBACK}\r\nConnection: close\r\n\r\n")
                    .unwrap();
                let mut response = String::new();
                let _ = stream.read_to_string(&mut response);
                return response;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        panic!("the OBS source never accepted a connection on port {port}");
    }

    fn app() -> tauri::App<tauri::test::MockRuntime> {
        let context = tauri::test::mock_context(ObsAssets);
        tauri::test::mock_builder().build(context).unwrap()
    }

    #[test]
    fn serves_obs_html_on_loopback_once_enabled() {
        let app = app();
        let state = ObsSourceState::default();
        let port = free_port();
        assert!(TcpStream::connect((LOOPBACK, port)).is_err(), "off by default");

        assert_eq!(start(app.handle(), &state, port), Ok(port));
        let response = get(port, "/obs.html");
        assert!(response.starts_with("HTTP/1.1 200"), "{response}");
        assert!(response.contains("Cache-Control: no-cache"), "{response}");
        assert!(response.contains("MemeOver OBS"), "{response}");

        // Idempotent for the same port, restart required for another one.
        assert_eq!(start(app.handle(), &state, port), Ok(port));
        assert_eq!(
            start(app.handle(), &state, free_port()),
            Err(StartError::RestartRequired)
        );
    }

    #[test]
    fn a_taken_port_is_reported_instead_of_panicking_the_server_thread() {
        let app = app();
        let state = ObsSourceState::default();
        let taken = TcpListener::bind((LOOPBACK, 0)).unwrap();
        let port = taken.local_addr().unwrap().port();
        assert_eq!(start(app.handle(), &state, port), Err(StartError::PortInUse));
        assert_eq!(start(app.handle(), &state, 80), Err(StartError::InvalidPort));
        assert_eq!(*state.port.lock().unwrap(), None);
    }
}
