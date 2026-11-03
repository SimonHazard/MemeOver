//! Opt-in local browser source.
//!
//! The official `tauri-plugin-localhost` serves the built frontend (including
//! `browser-source.html`) on `127.0.0.1:<port>`. It is registered at runtime, only once the
//! user enables the source, and has no stop mechanism: disabling it or changing
//! the port takes effect after a restart. The server only serves public assets;
//! credentials stay in the URL fragment, which browsers never send.

use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Runtime, State};

/// Loopback only: never reachable from the LAN.
const LOOPBACK: &str = "127.0.0.1";
const MIN_PORT: u16 = 1024;
const SESSION_HEADER: &str = "X-MemeOver-Source-Session";
/// Bounds one connection or read. Windows can also spend this long on a closed port, so
/// running out of time proves nothing about the server.
const PROBE_TIMEOUT: Duration = Duration::from_secs(1);
const START_TIMEOUT: Duration = Duration::from_secs(3);
const START_RETRY_DELAY: Duration = Duration::from_millis(20);

#[derive(Debug, PartialEq, Eq)]
enum ProbeAnswer {
    OurSession,
    AnotherServer,
    NoAnswer,
}

struct RunningServer {
    port: u16,
    session: String,
}

#[derive(Default)]
pub struct BrowserSourceState {
    running: Mutex<Option<RunningServer>>,
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

/// Asks `port` for the page. Only our session header proves that the answer comes from us.
fn probe_session(port: u16, session: &str) -> ProbeAnswer {
    let address = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    let Ok(mut stream) = TcpStream::connect_timeout(&address, PROBE_TIMEOUT) else {
        return ProbeAnswer::NoAnswer;
    };
    if stream.set_read_timeout(Some(PROBE_TIMEOUT)).is_err()
        || stream.set_write_timeout(Some(PROBE_TIMEOUT)).is_err()
        || write!(
            stream,
            "HEAD /browser-source.html HTTP/1.1\r\nHost: {LOOPBACK}\r\nConnection: close\r\n\r\n"
        )
        .is_err()
    {
        return ProbeAnswer::NoAnswer;
    }
    let mut response = Vec::new();
    let _ = stream.read_to_end(&mut response);
    if response.is_empty() {
        return ProbeAnswer::NoAnswer;
    }
    let expected = format!("{SESSION_HEADER}: {session}");
    if String::from_utf8_lossy(&response)
        .lines()
        .any(|line| line == expected)
    {
        ProbeAnswer::OurSession
    } else {
        ProbeAnswer::AnotherServer
    }
}

/// Whether our server still runs. Its thread answers one request at a time and can end
/// without notice, so silence alone proves nothing: only a free port shows that it has ended.
/// Forgetting a busy server would report its own port as taken until the next restart.
fn server_is_alive(port: u16, session: &str) -> bool {
    match probe_session(port, session) {
        ProbeAnswer::OurSession => true,
        ProbeAnswer::AnotherServer => false,
        ProbeAnswer::NoAnswer => TcpListener::bind((LOOPBACK, port)).is_err(),
    }
}

/// Port of the server this app really runs; forgets one whose thread has ended.
fn live_port(running: &mut Option<RunningServer>) -> Option<u16> {
    let alive = running
        .as_ref()
        .is_some_and(|server| server_is_alive(server.port, &server.session));
    if !alive {
        *running = None;
    }
    running.as_ref().map(|server| server.port)
}

pub fn start<R: Runtime>(
    app: &AppHandle<R>,
    state: &BrowserSourceState,
    port: u16,
) -> Result<u16, StartError> {
    let mut running = state
        .running
        .lock()
        .map_err(|_| StartError::Plugin("BrowserSourceState lock poisoned".into()))?;
    match live_port(&mut running) {
        Some(current) if current == port => return Ok(port),
        Some(_) => return Err(StartError::RestartRequired),
        None => {}
    }
    if port < MIN_PORT {
        return Err(StartError::InvalidPort);
    }
    // The plugin binds on its own thread and panics there when the port is taken,
    // with no feedback. Probe first; a race with another program in between only
    // ends that thread, because the release profile unwinds, and is reported below.
    drop(TcpListener::bind((LOOPBACK, port)).map_err(|_| StartError::PortInUse)?);
    // This is a public instance identifier, not a credential. A new process gets
    // a new value even if it restarts between two browser liveness checks.
    let session = format!(
        "{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| StartError::Plugin(e.to_string()))?
            .as_nanos()
    );
    app.plugin(
        tauri_plugin_localhost::Builder::new(port)
            .host(LOOPBACK)
            .on_request({
                let session = session.clone();
                move |_, response| response.add_header(SESSION_HEADER, &session)
            })
            .build(),
    )
    .map_err(|e| StartError::Plugin(e.to_string()))?;
    // Only HTTP while the thread may still be binding: a bind here could make it panic.
    let deadline = Instant::now() + START_TIMEOUT;
    while probe_session(port, &session) != ProbeAnswer::OurSession {
        if Instant::now() >= deadline {
            if !server_is_alive(port, &session) {
                return Err(StartError::PortInUse);
            }
            break;
        }
        std::thread::sleep(START_RETRY_DELAY);
    }
    *running = Some(RunningServer { port, session });
    Ok(port)
}

/// Start serving the browser source page. Idempotent for the running port. Async so the
/// liveness checks never block the main thread.
#[tauri::command(async)]
pub fn start_browser_source(
    app: AppHandle,
    state: State<'_, BrowserSourceState>,
    port: u16,
) -> Result<u16, String> {
    start(&app, &state, port).map_err(|e| e.code())
}

/// Port the browser source page is really served on in this session, if any.
#[tauri::command(async)]
pub fn browser_source_status(state: State<'_, BrowserSourceState>) -> Option<u16> {
    let mut running = state.running.lock().ok()?;
    live_port(&mut running)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::borrow::Cow;
    use tauri::utils::assets::{AssetKey, AssetsIter, CspHash};
    use tauri::Assets;

    const SOURCE_HTML: &[u8] = b"<!doctype html><title>MemeOver Browser Source</title>";

    struct SourceAssets;

    impl<R: Runtime> Assets<R> for SourceAssets {
        fn get(&self, key: &AssetKey) -> Option<Cow<'_, [u8]>> {
            (key.as_ref() == "/browser-source.html").then_some(Cow::Borrowed(SOURCE_HTML))
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

    fn request(port: u16, path: &str, method: &str) -> String {
        for _ in 0..50 {
            if let Ok(mut stream) = TcpStream::connect((LOOPBACK, port)) {
                stream
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .unwrap();
                write!(
                    stream,
                    "{method} {path} HTTP/1.1\r\nHost: {LOOPBACK}\r\nConnection: close\r\n\r\n"
                )
                .unwrap();
                let mut response = String::new();
                let _ = stream.read_to_string(&mut response);
                return response;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        panic!("the browser source never accepted a connection on port {port}");
    }

    fn get(port: u16, path: &str) -> String {
        request(port, path, "GET")
    }

    fn app() -> tauri::App<tauri::test::MockRuntime> {
        let context = tauri::test::mock_context(SourceAssets);
        tauri::test::mock_builder().build(context).unwrap()
    }

    fn session_header(response: &str) -> &str {
        response
            .lines()
            .find_map(|line| line.strip_prefix(&format!("{SESSION_HEADER}: ")))
            .expect("the browser needs an instance identifier to detect an app restart")
    }

    #[test]
    fn serves_the_source_page_on_loopback_once_enabled() {
        let app = app();
        let state = BrowserSourceState::default();
        let port = free_port();
        assert!(
            TcpStream::connect((LOOPBACK, port)).is_err(),
            "off by default"
        );

        assert_eq!(start(app.handle(), &state, port), Ok(port));
        let response = get(port, "/browser-source.html");
        assert!(response.starts_with("HTTP/1.1 200"), "{response}");
        assert!(response.contains("Cache-Control: no-cache"), "{response}");
        assert!(response.contains("MemeOver Browser Source"), "{response}");
        let session = session_header(&response);
        assert!(!session.is_empty());
        let head = request(port, "/browser-source.html", "HEAD");
        assert!(head.starts_with("HTTP/1.1 200"), "{head}");
        assert_eq!(session_header(&head), session);
        assert!(
            !head.contains("MemeOver Browser Source"),
            "HEAD sends no asset body"
        );

        // Idempotent for the same port, restart required for another one.
        assert_eq!(start(app.handle(), &state, port), Ok(port));
        assert_eq!(session_header(&get(port, "/browser-source.html")), session);
        assert_eq!(
            start(app.handle(), &state, free_port()),
            Err(StartError::RestartRequired)
        );
    }

    #[test]
    fn a_restarted_source_has_a_different_session_header() {
        let first = app();
        let first_port = free_port();
        start(first.handle(), &BrowserSourceState::default(), first_port).unwrap();
        let first_response = get(first_port, "/browser-source.html");

        let restarted = app();
        let second_port = free_port();
        start(
            restarted.handle(),
            &BrowserSourceState::default(),
            second_port,
        )
        .unwrap();
        let second_response = get(second_port, "/browser-source.html");
        assert_ne!(
            session_header(&first_response),
            session_header(&second_response)
        );
    }

    #[test]
    fn a_taken_port_is_reported_instead_of_panicking_the_server_thread() {
        let app = app();
        let state = BrowserSourceState::default();
        let taken = TcpListener::bind((LOOPBACK, 0)).unwrap();
        let port = taken.local_addr().unwrap().port();
        assert_eq!(
            start(app.handle(), &state, port),
            Err(StartError::PortInUse)
        );
        assert_eq!(
            start(app.handle(), &state, 80),
            Err(StartError::InvalidPort)
        );
        assert!(state.running.lock().unwrap().is_none());
    }

    #[test]
    fn a_server_whose_thread_ended_is_forgotten_and_restarted() {
        let app = app();
        let state = BrowserSourceState::default();
        let port = free_port();
        *state.running.lock().unwrap() = Some(RunningServer {
            port,
            session: "ended".into(),
        });
        assert_eq!(live_port(&mut state.running.lock().unwrap()), None);

        *state.running.lock().unwrap() = Some(RunningServer {
            port: free_port(),
            session: "ended".into(),
        });
        // A dead server on another port does not require a restart.
        assert_eq!(start(app.handle(), &state, port), Ok(port));
        let response = get(port, "/browser-source.html");
        assert!(response.starts_with("HTTP/1.1 200"), "{response}");
    }

    #[test]
    fn the_plugin_can_be_registered_again_on_the_same_app() {
        // What restarting a dead server does: the first registration stays in the plugin store.
        let app = app();
        let first = free_port();
        start(app.handle(), &BrowserSourceState::default(), first).unwrap();
        let second = free_port();
        assert_eq!(
            start(app.handle(), &BrowserSourceState::default(), second),
            Ok(second)
        );
        let response = get(second, "/browser-source.html");
        assert!(response.starts_with("HTTP/1.1 200"), "{response}");
    }

    #[test]
    fn another_program_on_the_port_does_not_count_as_our_server() {
        let taken = TcpListener::bind((LOOPBACK, 0)).unwrap();
        let port = taken.local_addr().unwrap().port();
        let other_program = std::thread::spawn(move || {
            let (mut stream, _) = taken.accept().unwrap();
            let mut request = [0; 512];
            let _ = stream.read(&mut request);
            stream
                .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n")
                .unwrap();
        });
        let mut running = Some(RunningServer {
            port,
            session: "ours".into(),
        });
        assert_eq!(live_port(&mut running), None);
        other_program.join().unwrap();
    }

    #[test]
    fn a_silent_server_holding_its_port_is_not_forgotten() {
        // Accepts nothing, like a server thread stuck on a slow client.
        let held = TcpListener::bind((LOOPBACK, 0)).unwrap();
        let port = held.local_addr().unwrap().port();
        let app = app();
        let state = BrowserSourceState::default();
        *state.running.lock().unwrap() = Some(RunningServer {
            port,
            session: "busy".into(),
        });

        assert_eq!(start(app.handle(), &state, port), Ok(port));
        assert_eq!(
            start(app.handle(), &state, free_port()),
            Err(StartError::RestartRequired)
        );
        assert_eq!(live_port(&mut state.running.lock().unwrap()), Some(port));
    }
}
