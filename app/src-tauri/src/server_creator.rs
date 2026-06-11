use serde::{Deserialize, Serialize};
use std::{
    collections::VecDeque,
    env,
    ffi::OsStr,
    fs,
    io::{BufRead, BufReader, Read, Write},
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Manager};

const REPO_URL: &str = "https://github.com/SimonHazard/MemeOver";
const LOG_LIMIT: usize = 500;
const INSTALL_METADATA_FILE: &str = ".memeover-server-creator.json";
const INSTALL_METADATA_MANAGED_BY: &str = "memeover-server-creator";
const UNMANAGED_INSTALL_ERROR: &str = "Install folder is not managed by MemeOver. Choose an empty folder or reinstall into the default folder.";

/// Cloneable so commands can move an owned handle into `spawn_blocking`;
/// the `Arc`s keep every clone pointing at the same child + log buffer.
#[derive(Clone, Default)]
pub struct ServerCreatorState {
    child: Arc<Mutex<Option<Child>>>,
    logs: Arc<Mutex<VecDeque<String>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInstallRequest {
    install_dir: String,
    discord_token: String,
    discord_client_id: String,
    ws_port: u16,
    public_ws_url: String,
    repair: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerCreatorStatus {
    platform: String,
    default_install_dir: String,
    install_dir: String,
    source_dir: String,
    bot_dir: String,
    installed: bool,
    configured: bool,
    bun_available: bool,
    bun_path: Option<String>,
    git_available: bool,
    running: bool,
    healthy: bool,
    health_url: String,
    local_ws_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInstallResult {
    install_dir: String,
    local_ws_url: String,
    public_ws_url: String,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct InstallMetadata {
    managed_by: String,
    repo_url: String,
}

/// All child processes must go through this constructor: on Windows a
/// GUI-subsystem app otherwise flashes a console window per spawn.
fn new_command(program: impl AsRef<OsStr>) -> Command {
    let mut command = Command::new(program);
    hide_console_window(&mut command);
    command
}

#[cfg(windows)]
fn hide_console_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_console_window(_command: &mut Command) {}

fn push_log(state: &ServerCreatorState, line: impl Into<String>) {
    push_log_to(&state.logs, line);
}

fn push_log_to(logs: &Arc<Mutex<VecDeque<String>>>, line: impl Into<String>) {
    let mut logs = match logs.lock() {
        Ok(logs) => logs,
        Err(_) => return,
    };
    if logs.len() >= LOG_LIMIT {
        logs.pop_front();
    }
    logs.push_back(redact_secrets(&line.into()));
}

fn redact_secrets(line: &str) -> String {
    if !line.split_whitespace().any(should_redact) {
        return line.to_string();
    }
    line.split_whitespace()
        .map(|part| if should_redact(part) { "[redacted]" } else { part })
        .collect::<Vec<_>>()
        .join(" ")
}

fn should_redact(part: &str) -> bool {
    part.to_ascii_lowercase().contains("token=") || looks_like_discord_token(part)
}

/// Discord bot tokens are three dot-separated base64url segments
/// (~24 / 6 / 38 chars); catch them even when not behind a `TOKEN=` prefix.
fn looks_like_discord_token(part: &str) -> bool {
    let is_segment = |s: &str| {
        !s.is_empty()
            && s.bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
    };
    let segments: Vec<&str> = part.split('.').collect();
    let [a, b, c] = segments.as_slice() else {
        return false;
    };
    a.len() >= 20
        && (5..=10).contains(&b.len())
        && c.len() >= 25
        && is_segment(a)
        && is_segment(b)
        && is_segment(c)
}

fn app_default_install_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|p| p.join("MemeOver-Server"))
        .map_err(|e| e.to_string())
}

fn normalize_install_dir(app: &AppHandle, install_dir: Option<String>) -> Result<PathBuf, String> {
    match install_dir {
        Some(raw) if !raw.trim().is_empty() => Ok(PathBuf::from(raw.trim())),
        _ => app_default_install_dir(app),
    }
}

fn source_dir(root: &Path) -> PathBuf {
    root.join("MemeOver")
}

fn bot_dir(root: &Path) -> PathBuf {
    source_dir(root).join("bot")
}

fn env_path(root: &Path) -> PathBuf {
    bot_dir(root).join(".env")
}

fn package_json_path(root: &Path) -> PathBuf {
    bot_dir(root).join("package.json")
}

fn install_metadata_path(root: &Path) -> PathBuf {
    root.join(INSTALL_METADATA_FILE)
}

fn expected_install_metadata() -> InstallMetadata {
    InstallMetadata {
        managed_by: INSTALL_METADATA_MANAGED_BY.to_string(),
        repo_url: REPO_URL.to_string(),
    }
}

fn write_install_metadata(root: &Path) -> Result<(), String> {
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let content =
        serde_json::to_string_pretty(&expected_install_metadata()).map_err(|e| e.to_string())?;
    fs::write(install_metadata_path(root), format!("{content}\n")).map_err(|e| e.to_string())
}

fn read_install_metadata(root: &Path) -> Result<InstallMetadata, String> {
    let content = fs::read_to_string(install_metadata_path(root)).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn is_managed_install(root: &Path) -> bool {
    read_install_metadata(root)
        .map(|metadata| metadata == expected_install_metadata())
        .unwrap_or(false)
}

fn ensure_managed_install(root: &Path) -> Result<(), String> {
    if is_managed_install(root) {
        return Ok(());
    }
    if package_json_path(root).exists() {
        return Err(UNMANAGED_INSTALL_ERROR.to_string());
    }
    Err("Server is not installed yet".to_string())
}

fn command_exists(cmd: &str) -> bool {
    new_command(cmd)
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn bun_candidate_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        env::var_os("USERPROFILE")
            .map(PathBuf::from)
            .map(|home| home.join(".bun").join("bin").join("bun.exe"))
            .filter(|path| path.exists())
    }

    #[cfg(not(target_os = "windows"))]
    {
        env::var_os("HOME")
            .map(PathBuf::from)
            .map(|home| home.join(".bun").join("bin").join("bun"))
            .filter(|path| path.exists())
    }
}

fn bun_command() -> Option<String> {
    if command_exists("bun") {
        return Some("bun".to_string());
    }

    let candidate = bun_candidate_path()?;
    if new_command(&candidate)
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
    {
        Some(candidate.to_string_lossy().to_string())
    } else {
        None
    }
}

fn append_bun_path(command: &mut Command) {
    let Some(candidate) = bun_candidate_path() else {
        return;
    };
    let Some(bin_dir) = candidate.parent() else {
        return;
    };
    let current = env::var_os("PATH").unwrap_or_default();
    let mut paths = env::split_paths(&current).collect::<Vec<_>>();
    if !paths.iter().any(|p| p == bin_dir) {
        paths.insert(0, bin_dir.to_path_buf());
        if let Ok(path) = env::join_paths(paths) {
            command.env("PATH", path);
        }
    }
}

fn health_check(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(500)) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(800)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(800)));

    if stream
        .write_all(b"GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
        .is_err()
    {
        return false;
    }

    let mut buffer = [0_u8; 128];
    let Ok(bytes_read) = stream.read(&mut buffer) else {
        return false;
    };
    let response = String::from_utf8_lossy(&buffer[..bytes_read]);
    response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200")
}

fn prune_child(state: &ServerCreatorState) -> Result<bool, String> {
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "Server process lock poisoned".to_string())?;

    if let Some(child) = guard.as_mut() {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                push_log(state, format!("Server process exited with {status}"));
                *guard = None;
                Ok(false)
            }
            None => Ok(true),
        }
    } else {
        Ok(false)
    }
}

fn run_logged(
    state: &ServerCreatorState,
    program: &str,
    args: &[&str],
    cwd: Option<&Path>,
) -> Result<(), String> {
    push_log(state, format!("Running: {} {}", program, args.join(" ")));

    let output = new_command(program)
        .args(args)
        .current_dir(cwd.unwrap_or_else(|| Path::new(".")))
        .output()
        .map_err(|e| format!("Failed to run {program}: {e}"))?;

    for line in String::from_utf8_lossy(&output.stdout).lines() {
        push_log(state, line);
    }
    for line in String::from_utf8_lossy(&output.stderr).lines() {
        push_log(state, line);
    }

    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "{} failed with exit code {}",
            program,
            output.status.code().unwrap_or(-1)
        ))
    }
}

fn validate_runtime_request(req: &ServerInstallRequest) -> Result<(), String> {
    if req.ws_port == 0 {
        return Err("WebSocket port must be between 1 and 65535".to_string());
    }
    if !req.public_ws_url.starts_with("ws://") && !req.public_ws_url.starts_with("wss://") {
        return Err("PUBLIC_WS_URL must start with ws:// or wss://".to_string());
    }
    Ok(())
}

fn validate_install_request(req: &ServerInstallRequest) -> Result<(), String> {
    if req.discord_token.trim().is_empty() {
        return Err("Discord token is required".to_string());
    }
    if req.discord_client_id.trim().len() < 17
        || req.discord_client_id.trim().len() > 20
        || !req
            .discord_client_id
            .trim()
            .chars()
            .all(|c| c.is_ascii_digit())
    {
        return Err("Discord Client ID must be a Discord snowflake".to_string());
    }
    validate_runtime_request(req)
}

fn write_env(root: &Path, req: &ServerInstallRequest) -> Result<(), String> {
    let bot = bot_dir(root);
    fs::create_dir_all(&bot).map_err(|e| e.to_string())?;
    let content = format!(
        "DISCORD_TOKEN={}\nDISCORD_CLIENT_ID={}\nWS_PORT={}\nPUBLIC_WS_URL={}\n",
        req.discord_token.trim(),
        req.discord_client_id.trim(),
        req.ws_port,
        req.public_ws_url.trim()
    );
    fs::write(env_path(root), content).map_err(|e| e.to_string())
}

fn install_sync(
    app: &AppHandle,
    state: &ServerCreatorState,
    req: ServerInstallRequest,
) -> Result<ServerInstallResult, String> {
    let root = normalize_install_dir(app, Some(req.install_dir.clone()))?;

    // Repair must work after an app restart, when the token only lives in
    // the already-written .env: keep it instead of demanding it again.
    let keep_existing_env = req.repair
        && env_path(&root).exists()
        && req.discord_token.trim().is_empty();
    if keep_existing_env {
        validate_runtime_request(&req)?;
    } else {
        validate_install_request(&req)?;
    }

    let source = source_dir(&root);
    let bot = bot_dir(&root);
    let has_package_json = package_json_path(&root).exists();
    if has_package_json {
        ensure_managed_install(&root)?;
    }
    let bun = bun_command().ok_or_else(|| "Bun is not installed yet".to_string())?;

    fs::create_dir_all(&root).map_err(|e| e.to_string())?;

    if !has_package_json {
        if source.exists() {
            return Err(
                "Install folder already contains a MemeOver folder but no bot package".into(),
            );
        }
        if !command_exists("git") {
            return Err("Git is required to download MemeOver".to_string());
        }
        let clone_dest = source.to_string_lossy().to_string();
        run_logged(
            state,
            "git",
            &["clone", "--depth=1", REPO_URL, &clone_dest],
            Some(&root),
        )?;
        write_install_metadata(&root)?;
    } else if req.repair && source.join(".git").exists() {
        run_logged(state, "git", &["pull", "--ff-only"], Some(&source))?;
    } else {
        push_log(state, "MemeOver source already installed");
    }

    if keep_existing_env {
        push_log(state, "Keeping existing server configuration");
    } else {
        write_env(&root, &req)?;
        push_log(state, "Server configuration saved");
    }

    // Only the bot workspace (and the shared package it links) is needed;
    // skip the app's heavy frontend dependencies.
    run_logged(
        state,
        &bun,
        &[
            "install",
            "--filter",
            "@memeover/bot",
            "--filter",
            "@memeover/shared",
        ],
        Some(&source),
    )?;
    push_log(state, "Dependencies installed");

    if !bot.exists() {
        return Err("Bot folder was not found after installation".to_string());
    }

    Ok(ServerInstallResult {
        install_dir: root.to_string_lossy().to_string(),
        local_ws_url: format!("ws://localhost:{}/ws", req.ws_port),
        public_ws_url: req.public_ws_url,
    })
}

fn spawn_log_reader(
    logs: Arc<Mutex<VecDeque<String>>>,
    reader: impl std::io::Read + Send + 'static,
) {
    std::thread::spawn(move || {
        for line in BufReader::new(reader).lines().map_while(Result::ok) {
            push_log_to(&logs, line);
        }
    });
}

fn status_sync(
    app: &AppHandle,
    state: &ServerCreatorState,
    install_dir: Option<String>,
    port: Option<u16>,
) -> Result<ServerCreatorStatus, String> {
    let default_root = app_default_install_dir(app)?;
    let root = normalize_install_dir(app, install_dir)?;
    let ws_port = port.unwrap_or(3001);
    let running = prune_child(state)?;
    let bun_path = bun_command();

    Ok(ServerCreatorStatus {
        platform: env::consts::OS.to_string(),
        default_install_dir: default_root.to_string_lossy().to_string(),
        install_dir: root.to_string_lossy().to_string(),
        source_dir: source_dir(&root).to_string_lossy().to_string(),
        bot_dir: bot_dir(&root).to_string_lossy().to_string(),
        installed: package_json_path(&root).exists(),
        configured: env_path(&root).exists(),
        bun_available: bun_path.is_some(),
        bun_path,
        git_available: command_exists("git"),
        running,
        healthy: health_check(ws_port),
        health_url: format!("http://localhost:{ws_port}/health"),
        local_ws_url: format!("ws://localhost:{ws_port}/ws"),
    })
}

fn install_bun_sync(state: &ServerCreatorState) -> Result<(), String> {
    if bun_command().is_some() {
        push_log(state, "Bun is already installed");
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    run_logged(
        state,
        "powershell",
        &[
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            "irm https://bun.com/install.ps1 | iex",
        ],
        None,
    )?;

    #[cfg(not(target_os = "windows"))]
    run_logged(
        state,
        "sh",
        &["-c", "curl -fsSL https://bun.com/install | bash"],
        None,
    )?;

    if bun_command().is_some() {
        push_log(state, "Bun installed");
        Ok(())
    } else {
        Err("Bun installer finished, but bun was not found".to_string())
    }
}

fn start_sync(
    app: &AppHandle,
    state: &ServerCreatorState,
    install_dir: Option<String>,
) -> Result<(), String> {
    if prune_child(state)? {
        push_log(state, "Server is already running");
        return Ok(());
    }

    let root = normalize_install_dir(app, install_dir)?;
    let bot = bot_dir(&root);
    if !package_json_path(&root).exists() {
        return Err("Server is not installed yet".to_string());
    }
    ensure_managed_install(&root)?;
    let bun = bun_command().ok_or_else(|| "Bun is not installed yet".to_string())?;

    // Run the entry file directly instead of `bun run start`: the start
    // script spawns a nested bun, and `Child::kill` would only reach the
    // outer one, leaving the actual bot alive.
    let mut command = new_command(bun);
    command
        .args(["run", "src/index.ts"])
        .current_dir(&bot)
        .env("NODE_ENV", "production")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    append_bun_path(&mut command);

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to start server: {e}"))?;

    if let Some(stdout) = child.stdout.take() {
        spawn_log_reader(state.logs.clone(), stdout);
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_log_reader(state.logs.clone(), stderr);
    }

    std::thread::sleep(Duration::from_millis(500));
    if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
        push_log(
            state,
            format!("Server process exited immediately with {status}"),
        );
        return Err(format!("Server failed to start: {status}"));
    }

    *state
        .child
        .lock()
        .map_err(|_| "Server process lock poisoned".to_string())? = Some(child);
    push_log(state, "Server process started");
    Ok(())
}

fn stop_process(state: &ServerCreatorState) -> Result<(), String> {
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "Server process lock poisoned".to_string())?;

    if let Some(child) = guard.as_mut() {
        child.kill().map_err(|e| e.to_string())?;
        let _ = child.wait();
        push_log(state, "Server process stopped");
    }
    *guard = None;
    Ok(())
}

/// Called from the app exit handler so the managed bot process does not
/// outlive the app and keep its port bound.
pub fn shutdown(state: &ServerCreatorState) {
    let _ = stop_process(state);
}

/// Heavy or process-spawning work runs through `spawn_blocking`: non-async
/// Tauri commands execute on the main thread and would freeze the UI.
async fn run_blocking<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn server_creator_status(
    app: AppHandle,
    state: tauri::State<'_, ServerCreatorState>,
    install_dir: Option<String>,
    port: Option<u16>,
) -> Result<ServerCreatorStatus, String> {
    let state = state.inner().clone();
    run_blocking(move || status_sync(&app, &state, install_dir, port)).await
}

#[tauri::command]
pub async fn server_creator_install(
    app: AppHandle,
    state: tauri::State<'_, ServerCreatorState>,
    request: ServerInstallRequest,
) -> Result<ServerInstallResult, String> {
    let state = state.inner().clone();
    run_blocking(move || install_sync(&app, &state, request)).await
}

#[tauri::command]
pub async fn server_creator_install_bun(
    state: tauri::State<'_, ServerCreatorState>,
) -> Result<(), String> {
    let state = state.inner().clone();
    run_blocking(move || install_bun_sync(&state)).await
}

#[tauri::command]
pub async fn server_creator_start(
    app: AppHandle,
    state: tauri::State<'_, ServerCreatorState>,
    install_dir: Option<String>,
) -> Result<(), String> {
    let state = state.inner().clone();
    run_blocking(move || start_sync(&app, &state, install_dir)).await
}

#[tauri::command]
pub async fn server_creator_stop(
    state: tauri::State<'_, ServerCreatorState>,
) -> Result<(), String> {
    let state = state.inner().clone();
    run_blocking(move || stop_process(&state)).await
}

#[tauri::command]
pub async fn server_creator_restart(
    app: AppHandle,
    state: tauri::State<'_, ServerCreatorState>,
    install_dir: Option<String>,
) -> Result<(), String> {
    let state = state.inner().clone();
    run_blocking(move || {
        stop_process(&state)?;
        start_sync(&app, &state, install_dir)
    })
    .await
}

#[tauri::command]
pub fn server_creator_logs(
    state: tauri::State<'_, ServerCreatorState>,
) -> Result<Vec<String>, String> {
    let logs = state
        .logs
        .lock()
        .map_err(|_| "Server logs lock poisoned".to_string())?;
    Ok(logs.iter().cloned().collect())
}

#[tauri::command]
pub async fn server_creator_public_ip(
    state: tauri::State<'_, ServerCreatorState>,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let endpoints = ["https://api4.my-ip.io/ip", "https://api.ipify.org"];
    for endpoint in endpoints {
        let Ok(response) = client.get(endpoint).send().await else {
            continue;
        };
        if !response.status().is_success() {
            continue;
        }
        let Ok(body) = response.text().await else {
            continue;
        };
        let ip = body.trim().to_string();
        if !ip.is_empty() {
            push_log(&state, format!("Detected public IP: {ip}"));
            return Ok(ip);
        }
    }
    Err("Could not detect public IP automatically".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_root(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "memeover-server-creator-{name}-{}-{nanos}",
            std::process::id()
        ))
    }

    fn create_synthetic_package_json(root: &Path) {
        fs::create_dir_all(bot_dir(root)).expect("bot directory should be created");
        fs::write(package_json_path(root), "{\"name\":\"@memeover/bot\"}\n")
            .expect("package json should be written");
    }

    #[test]
    fn server_creator_redacts_discord_token_shapes() {
        let fake_token = "aaaaaaaaaaaaaaaaaaaaaaaa.bbbbbb.ccccccccccccccccccccccccccccccc";
        let redacted = redact_secrets(&format!("Starting with token {fake_token}"));

        assert!(redacted.contains("[redacted]"));
        assert!(!redacted.contains(fake_token));
    }

    #[test]
    fn server_creator_redacts_token_key_value() {
        let redacted = redact_secrets("connected token=synthetic-secret ok");

        assert_eq!(redacted, "connected [redacted] ok");
    }

    #[test]
    fn server_creator_write_env_creates_bot_env_file() {
        let root = unique_temp_root("write-env");
        let req = ServerInstallRequest {
            install_dir: root.to_string_lossy().to_string(),
            discord_token: "synthetic-token".to_string(),
            discord_client_id: "123456789012345678".to_string(),
            ws_port: 3001,
            public_ws_url: "wss://example.test/ws".to_string(),
            repair: false,
        };

        write_env(&root, &req).expect("env file should be written");

        let content = fs::read_to_string(env_path(&root)).expect("env file should be readable");
        assert_eq!(
            content,
            "DISCORD_TOKEN=synthetic-token\nDISCORD_CLIENT_ID=123456789012345678\nWS_PORT=3001\nPUBLIC_WS_URL=wss://example.test/ws\n"
        );

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn server_creator_install_metadata_round_trips_expected_marker() {
        let root = unique_temp_root("metadata-round-trip");

        write_install_metadata(&root).expect("metadata should be written");

        assert_eq!(
            read_install_metadata(&root).expect("metadata should be readable"),
            InstallMetadata {
                managed_by: INSTALL_METADATA_MANAGED_BY.to_string(),
                repo_url: REPO_URL.to_string(),
            }
        );

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn server_creator_rejects_package_without_metadata() {
        let root = unique_temp_root("metadata-missing");
        create_synthetic_package_json(&root);

        let error = ensure_managed_install(&root).expect_err("missing metadata should be rejected");

        assert_eq!(error, UNMANAGED_INSTALL_ERROR);

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn server_creator_rejects_wrong_repo_metadata() {
        let root = unique_temp_root("metadata-wrong-repo");
        create_synthetic_package_json(&root);
        let metadata = InstallMetadata {
            managed_by: INSTALL_METADATA_MANAGED_BY.to_string(),
            repo_url: "https://example.test/not-memeover".to_string(),
        };
        fs::write(
            install_metadata_path(&root),
            serde_json::to_string_pretty(&metadata).expect("metadata should serialize"),
        )
        .expect("metadata should be written");

        let error =
            ensure_managed_install(&root).expect_err("wrong repo metadata should be rejected");

        assert_eq!(error, UNMANAGED_INSTALL_ERROR);

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn server_creator_accepts_valid_metadata() {
        let root = unique_temp_root("metadata-valid");
        create_synthetic_package_json(&root);
        write_install_metadata(&root).expect("metadata should be written");

        ensure_managed_install(&root).expect("valid metadata should be accepted");

        let _ = fs::remove_dir_all(&root);
    }
}
