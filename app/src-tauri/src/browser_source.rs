//! Opt-in local browser source.
//!
//! The official `tauri-plugin-localhost` serves the built frontend (including
//! `browser-source.html`) on `127.0.0.1:<port>`. It is registered at runtime, only once the
//! user enables the source, and has no stop mechanism: disabling it or changing
//! the port takes effect after a restart. The server only serves public assets;
//! credentials stay in the URL fragment, which browsers never send.
//!
//! The page checks the server every second with a HEAD request. That check is also the only link
//! between a loaded page and this app, in both directions: the response carries the live skip,
//! clear and moderation state, and the request's query reports how the page is doing.

use serde::Serialize;
use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, Runtime, State};

/// Loopback only: never reachable from the LAN.
const LOOPBACK: &str = "127.0.0.1";
const MIN_PORT: u16 = 1024;
/// All four also live in `src/shared/browser-source-contract.ts`; a test keeps them equal.
const PAGE_PATH: &str = "/browser-source.html";
const SESSION_HEADER: &str = "X-MemeOver-Source-Session";
const CONTROLS_HEADER: &str = "X-MemeOver-Source-Controls";
const HEARTBEAT_PREFIX: &str = "source=";
/// A page's report is three short fields: anything longer did not come from it.
const MAX_HEARTBEAT_LENGTH: usize = 128;
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

/// Latest report from a loaded page. Local programs can reach the server too, so the settings
/// page only uses it to choose among fixed messages.
#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceHeartbeat {
    age_ms: u64,
    query: String,
}

/// Shared with the server thread, which outlives any single registration of the plugin.
#[derive(Default)]
struct PageLink {
    /// Opaque to Rust: encoded and decoded by `src/shared/browser-source.ts`.
    controls: Mutex<String>,
    heartbeat: Mutex<Option<(Instant, String)>>,
}

impl PageLink {
    fn on_request(
        &self,
        session: &str,
        request: &tauri_plugin_localhost::Request,
        response: &mut tauri_plugin_localhost::Response,
    ) {
        response.add_header(SESSION_HEADER, session);
        if let Ok(controls) = self.controls.lock() {
            if !controls.is_empty() {
                response.add_header(CONTROLS_HEADER, controls.as_str());
            }
        }
        let report = request.url().split_once('?').map(|(_, query)| query);
        if let Some(query) = report.filter(|query| {
            query.starts_with(HEARTBEAT_PREFIX) && query.len() <= MAX_HEARTBEAT_LENGTH
        }) {
            if let Ok(mut heartbeat) = self.heartbeat.lock() {
                *heartbeat = Some((Instant::now(), query.to_owned()));
            }
        }
    }

    fn heartbeat(&self) -> Option<SourceHeartbeat> {
        let heartbeat = self.heartbeat.lock().ok()?;
        heartbeat.as_ref().map(|(at, query)| SourceHeartbeat {
            age_ms: u64::try_from(at.elapsed().as_millis()).unwrap_or(u64::MAX),
            query: query.clone(),
        })
    }
}

#[derive(Default)]
pub struct BrowserSourceState {
    running: Mutex<Option<RunningServer>>,
    page: Arc<PageLink>,
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
            "HEAD {PAGE_PATH} HTTP/1.1\r\nHost: {LOOPBACK}\r\nConnection: close\r\n\r\n"
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
                let page = Arc::clone(&state.page);
                move |request, response| page.on_request(&session, request, response)
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

/// Start serving the browser source page. Idempotent for the running port. The checks can wait
/// for seconds on sockets, a lock and sleeps: a blocking thread keeps them off the async runtime.
#[tauri::command]
pub async fn start_browser_source(app: AppHandle, port: u16) -> Result<u16, String> {
    tauri::async_runtime::spawn_blocking(move || {
        start(&app, &app.state::<BrowserSourceState>(), port).map_err(|e| e.code())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Port the browser source page is really served on in this session, if any.
#[tauri::command]
pub async fn browser_source_status(app: AppHandle) -> Result<Option<u16>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<BrowserSourceState>();
        let mut running = state.running.lock().map_err(|e| e.to_string())?;
        Ok(live_port(&mut running))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Sets what loaded pages read on their next check. Stored even with no server running.
#[tauri::command]
pub fn set_browser_source_controls(
    state: State<'_, BrowserSourceState>,
    value: String,
) -> Result<(), String> {
    *state.page.controls.lock().map_err(|e| e.to_string())? = value;
    Ok(())
}

/// The latest report from a loaded page, if one has ever checked in during this session.
#[tauri::command]
pub fn browser_source_heartbeat(state: State<'_, BrowserSourceState>) -> Option<SourceHeartbeat> {
    state.page.heartbeat()
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
            (key.as_ref() == PAGE_PATH).then_some(Cow::Borrowed(SOURCE_HTML))
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
    fn the_page_contract_matches_the_frontend() {
        let contract = include_str!("../../src/shared/browser-source-contract.ts");
        assert!(contract.contains(&format!("\"{PAGE_PATH}\"")));
        assert!(contract.contains(&format!("\"{SESSION_HEADER}\"")));
        assert!(contract.contains(&format!("\"{CONTROLS_HEADER}\"")));
        assert!(contract.contains(&format!("\"{HEARTBEAT_PREFIX}\"")));
    }

    #[test]
    fn start_errors_are_the_codes_the_frontend_translates() {
        let frontend = include_str!("../../src/shared/stream-controls.ts");
        for error in [
            StartError::RestartRequired,
            StartError::InvalidPort,
            StartError::PortInUse,
        ] {
            assert!(
                frontend.contains(&format!("\"{}\"", error.code())),
                "{error:?}"
            );
        }
        assert_eq!(StartError::Plugin("boom".into()).code(), "boom");
    }

    #[test]
    fn a_heartbeat_reaches_the_frontend_in_camel_case() {
        let heartbeat = SourceHeartbeat {
            age_ms: 12,
            query: "source=1".into(),
        };
        assert_eq!(
            serde_json::to_value(heartbeat).unwrap(),
            serde_json::json!({ "ageMs": 12, "query": "source=1" })
        );
    }

    #[test]
    fn nothing_is_reported_or_published_before_the_first_values() {
        let app = app();
        let state = BrowserSourceState::default();
        let port = free_port();
        start(app.handle(), &state, port).unwrap();
        let response = request(port, PAGE_PATH, "HEAD");
        assert!(!response.contains(CONTROLS_HEADER), "{response}");
        assert_eq!(state.page.heartbeat(), None);
    }

    #[test]
    fn a_reregistered_server_keeps_the_published_controls() {
        let app = app();
        let state = BrowserSourceState::default();
        *state.page.controls.lock().unwrap() = "kept".into();
        *state.running.lock().unwrap() = Some(RunningServer {
            port: free_port(),
            session: "ended".into(),
        });
        let port = free_port();
        assert_eq!(start(app.handle(), &state, port), Ok(port));
        let response = request(port, PAGE_PATH, "HEAD");
        assert!(
            response.contains(&format!("{CONTROLS_HEADER}: kept")),
            "{response}"
        );
    }

    #[test]
    fn an_unknown_path_is_answered_without_following_the_query() {
        let app = app();
        let state = BrowserSourceState::default();
        let port = free_port();
        start(app.handle(), &state, port).unwrap();
        // The page's own path resolves whatever the query says: reports never change the asset.
        let response = get(
            port,
            &format!("{PAGE_PATH}?source=1&sound=on&bot=connected"),
        );
        assert!(response.contains("MemeOver Browser Source"), "{response}");
    }

    #[test]
    fn checks_read_the_live_controls_and_report_how_the_page_is_doing() {
        let app = app();
        let state = BrowserSourceState::default();
        *state.page.controls.lock().unwrap() = "before".into();
        let port = free_port();
        start(app.handle(), &state, port).unwrap();
        let controls = format!("{CONTROLS_HEADER}: ");

        // The app's own probes and page loads say nothing about a page.
        assert!(get(port, PAGE_PATH).contains(&format!("{controls}before")));
        assert_eq!(state.page.heartbeat(), None);

        // The plugin answers from the store, so a change applies without a new registration.
        *state.page.controls.lock().unwrap() = "after".into();
        let report = "source=1&sound=on&bot=connected";
        let check = request(port, &format!("{PAGE_PATH}?{report}"), "HEAD");
        assert!(check.starts_with("HTTP/1.1 200"), "{check}");
        assert!(check.contains(&format!("{controls}after")), "{check}");
        let heartbeat = state.page.heartbeat().expect("the page checked in");
        assert_eq!(heartbeat.query, report);
        assert!(heartbeat.age_ms < 5000);

        // Oversized or unrelated queries do not replace the last report.
        let oversized = format!("{HEARTBEAT_PREFIX}{}", "x".repeat(MAX_HEARTBEAT_LENGTH));
        request(port, &format!("{PAGE_PATH}?{oversized}"), "HEAD");
        request(port, &format!("{PAGE_PATH}?other=1"), "HEAD");
        assert_eq!(state.page.heartbeat().unwrap().query, report);
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
        let response = get(port, PAGE_PATH);
        assert!(response.starts_with("HTTP/1.1 200"), "{response}");
        assert!(response.contains("Cache-Control: no-cache"), "{response}");
        assert!(response.contains("MemeOver Browser Source"), "{response}");
        let session = session_header(&response);
        assert!(!session.is_empty());
        let head = request(port, PAGE_PATH, "HEAD");
        assert!(head.starts_with("HTTP/1.1 200"), "{head}");
        assert_eq!(session_header(&head), session);
        assert!(
            !head.contains("MemeOver Browser Source"),
            "HEAD sends no asset body"
        );

        // Idempotent for the same port, restart required for another one.
        assert_eq!(start(app.handle(), &state, port), Ok(port));
        assert_eq!(session_header(&get(port, PAGE_PATH)), session);
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
        let first_response = get(first_port, PAGE_PATH);

        let restarted = app();
        let second_port = free_port();
        start(
            restarted.handle(),
            &BrowserSourceState::default(),
            second_port,
        )
        .unwrap();
        let second_response = get(second_port, PAGE_PATH);
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
        let response = get(port, PAGE_PATH);
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
        let response = get(second, PAGE_PATH);
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
