// The desktop app runs the same frontend as santroller.com, but the system webviews don't have
// WebHID, so the frontend talks to devices through these commands instead (see src/desktop).
use std::{
    collections::HashMap,
    ffi::CString,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc::{self, Receiver, Sender, TryRecvError},
        Mutex,
    },
    thread,
};

use futures_lite::StreamExt;
use hidapi::{HidApi, HidDevice};
use nusb::hotplug::HotplugEvent;
use serde::Serialize;
use tauri::{ipc::{Channel, Request}, AppHandle, Emitter, Manager, State, Url};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

// Big enough for any report, the report id in front of it, and any report descriptor
const BUFFER_SIZE: usize = 4096;
// How long the worker waits for an input report before it checks for commands again
const READ_TIMEOUT_MS: i32 = 1;
// Only Santroller devices are listed. On Windows, hidapi asks every device it lists for its
// strings, which makes some mice and keyboards stutter.
const SANTROLLER_VID: u16 = 0x1209;
const SANTROLLER_V1_PID: u16 = 0x2882;
const SANTROLLER_PID: u16 = 0x2883;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HidDeviceInfo {
    path: String,
    vendor_id: u16,
    product_id: u16,
    product_name: Option<String>,
    serial_number: Option<String>,
    usage_page: u16,
    usage: u16,
}

#[derive(Clone, Serialize)]
struct HidInput {
    path: String,
    // As read, so with the report id in front for devices that number their reports
    data: Vec<u8>,
}

#[derive(Clone, Serialize)]
struct HidClosed {
    path: String,
    error: String,
}

enum Command {
    Write {
        report: Vec<u8>,
        done: Sender<Result<(), String>>,
    },
    SendFeatureReport {
        report: Vec<u8>,
        done: Sender<Result<(), String>>,
    },
    GetFeatureReport {
        report_id: u8,
        length: usize,
        done: Sender<Result<Vec<u8>, String>>,
    },
    Close,
}

struct OpenDevice {
    id: u64,
    commands: Sender<Command>,
}

#[derive(Default)]
struct HidState {
    api: Mutex<Option<HidApi>>,
    devices: Mutex<HashMap<String, OpenDevice>>,
    watching: AtomicBool,
    next_id: AtomicU64,
}

fn with_api<T>(
    state: &HidState,
    f: impl FnOnce(&mut HidApi) -> Result<T, String>,
) -> Result<T, String> {
    let mut api = state.api.lock().map_err(|e| e.to_string())?;
    if api.is_none() {
        HidApi::disable_device_discovery();
        *api = Some(HidApi::new().map_err(|e| e.to_string())?);
    }
    f(api.as_mut().unwrap())
}

fn handle_command(device: &HidDevice, command: Command) {
    match command {
        Command::Write { report, done } => {
            let _ = done.send(device.write(&report).map(|_| ()).map_err(|e| e.to_string()));
        }
        Command::SendFeatureReport { report, done } => {
            let _ = done.send(device.send_feature_report(&report).map_err(|e| e.to_string()));
        }
        Command::GetFeatureReport {
            report_id,
            length,
            done,
        } => {
            // Windows expects the buffer passed to get_feature_report (DeviceIoControl/HidD_GetFeature)
            // to be at least caps.FeatureReportByteLength, which is the maximum feature report length
            // in the collection plus the report ID (64 bytes for Santroller). Passing a smaller buffer
            // fails on Bluetooth with ERROR_INVALID_USER_BUFFER.
            let buf_size = length.max(64).clamp(2, BUFFER_SIZE);
            let mut report = vec![0; buf_size];
            report[0] = report_id;
            let result = device
                .get_feature_report(&mut report)
                .map(|read| {
                    report.truncate(read);
                    report
                })
                .map_err(|e| e.to_string());
            let _ = done.send(result);
        }
        Command::Close => {}
    }
}

// Owns the device, so reads and writes never happen at the same time
fn run_worker(app: AppHandle, path: String, id: u64, device: HidDevice, commands: Receiver<Command>) {
    let mut buf = vec![0; BUFFER_SIZE];
    let error = loop {
        match commands.try_recv() {
            Ok(Command::Close) | Err(TryRecvError::Disconnected) => break None,
            Ok(command) => {
                handle_command(&device, command);
                continue;
            }
            Err(TryRecvError::Empty) => {}
        }
        match device.read_timeout(&mut buf, READ_TIMEOUT_MS) {
            Ok(0) => {}
            Ok(read) => {
                let _ = app.emit(
                    "hid-input",
                    HidInput {
                        path: path.clone(),
                        data: buf[..read].to_vec(),
                    },
                );
            }
            // usually the device was unplugged or rebooted
            Err(e) => break Some(e.to_string()),
        }
    };
    if let Some(state) = app.try_state::<HidState>() {
        if let Ok(mut devices) = state.devices.lock() {
            // it may have been opened again since
            if devices.get(&path).is_some_and(|open| open.id == id) {
                devices.remove(&path);
            }
        }
    }
    if let Some(error) = error {
        let _ = app.emit("hid-closed", HidClosed { path, error });
    }
}

#[tauri::command]
fn hid_list(state: State<'_, HidState>) -> Result<Vec<HidDeviceInfo>, String> {
    with_api(&state, |api| {
        api.reset_devices().map_err(|e| e.to_string())?;
        api.add_devices(SANTROLLER_VID, SANTROLLER_PID).map_err(|e| e.to_string())?;
        api.add_devices(SANTROLLER_VID, SANTROLLER_V1_PID).map_err(|e| e.to_string())?;
        Ok(api
            .device_list()
            .map(|device| HidDeviceInfo {
                path: device.path().to_string_lossy().into_owned(),
                vendor_id: device.vendor_id(),
                product_id: device.product_id(),
                product_name: device.product_string().map(str::to_owned),
                serial_number: device.serial_number().map(str::to_owned),
                usage_page: device.usage_page(),
                usage: device.usage(),
            })
            .collect())
    })
}

// Tells the frontend to look at the device list again when a Santroller is plugged in, or when
// anything is unplugged (only the device's id is known by then). The USB device shows up before
// its HID interface does, so the frontend has to keep looking for a little while.
#[tauri::command]
fn hid_watch(app: AppHandle, state: State<'_, HidState>) -> Result<(), String> {
    if state.watching.swap(true, Ordering::Relaxed) {
        return Ok(());
    }
    let mut watch = match nusb::watch_devices() {
        Ok(watch) => watch,
        Err(e) => {
            state.watching.store(false, Ordering::Relaxed);
            return Err(e.to_string());
        }
    };
    tauri::async_runtime::spawn(async move {
        while let Some(event) = watch.next().await {
            let changed = match event {
                HotplugEvent::Connected(info) => {
                    info.vendor_id() == SANTROLLER_VID
                        && (info.product_id() == SANTROLLER_PID || info.product_id() == SANTROLLER_V1_PID)
                }
                HotplugEvent::Disconnected(_) => true,
            };
            if changed {
                let _ = app.emit("hid-changed", ());
            }
        }
    });
    Ok(())
}

// Returns the report descriptor, as the frontend needs to know which reports the device has
#[tauri::command]
async fn hid_open(
    app: AppHandle,
    state: State<'_, HidState>,
    path: String,
) -> Result<Vec<u8>, String> {
    if let Some(open) = state.devices.lock().map_err(|e| e.to_string())?.remove(&path) {
        let _ = open.commands.send(Command::Close);
    }
    let c_path = CString::new(path.as_bytes()).map_err(|e| e.to_string())?;
    let device = with_api(&state, |api| {
        api.open_path(c_path.as_c_str()).map_err(|e| e.to_string())
    })?;
    let mut descriptor = vec![0; BUFFER_SIZE];
    let length = device
        .get_report_descriptor(&mut descriptor)
        .map_err(|e| e.to_string())?;
    descriptor.truncate(length);

    let id = state.next_id.fetch_add(1, Ordering::Relaxed);
    let (commands, receiver) = mpsc::channel();
    state
        .devices
        .lock()
        .map_err(|e| e.to_string())?
        .insert(path.clone(), OpenDevice { id, commands });
    clear_windows_controller_cache(SANTROLLER_VID, SANTROLLER_PID);
    clear_windows_controller_cache(SANTROLLER_VID, SANTROLLER_V1_PID);
    thread::spawn(move || run_worker(app, path, id, device, receiver));
    Ok(descriptor)
}

// DirectInput caches a pad's name and calibration per VID/PID, not per serial, so after the firmware
// swaps a pad between HID and XInput the cached entries are stale and joy.cpl shows it blank
#[cfg(target_os = "windows")]
fn clear_windows_controller_cache(vid: u16, pid: u16) {
    use winreg::enums::*;
    use winreg::RegKey;

    let device_key = format!("VID_{:04X}&PID_{:04X}", vid, pid);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    // OEMName, OEMData
    let _ = hkcu.delete_subkey_all(format!(
        r"System\CurrentControlSet\Control\MediaProperties\PrivateProperties\Joystick\OEM\{}",
        device_key
    ));
    // calibration
    let _ = hkcu.delete_subkey_all(format!(
        r"System\CurrentControlSet\Control\MediaProperties\PrivateProperties\DirectInput\{}",
        device_key
    ));
    // slot assignments
    if let Ok(settings) = hkcu.open_subkey_with_flags(
        r"System\CurrentControlSet\Control\MediaResources\Joystick\DINPUT.DLL\CurrentJoystickSettings",
        KEY_READ | KEY_WRITE,
    ) {
        let to_delete: Vec<String> = settings
            .enum_values()
            .filter_map(|val| val.ok())
            .filter_map(|(name, _)| {
                let value = settings.get_value::<String, _>(&name).ok()?;
                value.contains(&device_key).then_some(name)
            })
            .collect();
        for name in to_delete {
            let _ = settings.delete_value(&name);
            if name.ends_with("OEMName") {
                let _ = settings.delete_value(name.replace("OEMName", "Configuration"));
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn clear_windows_controller_cache(_vid: u16, _pid: u16) {}

#[tauri::command]
fn hid_close(state: State<'_, HidState>, path: String) -> Result<(), String> {
    if let Some(open) = state.devices.lock().map_err(|e| e.to_string())?.remove(&path) {
        let _ = open.commands.send(Command::Close);
    }
    Ok(())
}

// Hands the command to the device's worker and waits for it off the async runtime, so a slow
// device doesn't hold up other commands
async fn send_command<T: Send + 'static>(
    state: State<'_, HidState>,
    path: &str,
    create: impl FnOnce(Sender<Result<T, String>>) -> Command,
) -> Result<T, String> {
    let commands = state
        .devices
        .lock()
        .map_err(|e| e.to_string())?
        .get(path)
        .map(|open| open.commands.clone())
        .ok_or_else(|| "The device is not open".to_owned())?;
    let (done, result) = mpsc::channel();
    commands
        .send(create(done))
        .map_err(|_| "The device was closed".to_owned())?;
    tauri::async_runtime::spawn_blocking(move || {
        result
            .recv()
            .map_err(|_| "The device was closed".to_owned())?
    })
    .await
    .map_err(|e| e.to_string())?
}

fn with_report_id(report_id: u8, data: Vec<u8>) -> Vec<u8> {
    let mut report = Vec::with_capacity(data.len() + 1);
    report.push(report_id);
    report.extend(data);
    report
}

#[tauri::command]
async fn hid_send_report(
    state: State<'_, HidState>,
    path: String,
    report_id: u8,
    data: Vec<u8>,
) -> Result<(), String> {
    let report = with_report_id(report_id, data);
    send_command(state, &path, |done| Command::Write { report, done }).await
}

#[tauri::command]
async fn hid_send_feature_report(
    state: State<'_, HidState>,
    path: String,
    report_id: u8,
    data: Vec<u8>,
) -> Result<(), String> {
    let report = with_report_id(report_id, data);
    send_command(state, &path, |done| Command::SendFeatureReport { report, done }).await
}

// The report comes back with the report id in front of it, the same as WebHID
#[tauri::command]
async fn hid_receive_feature_report(
    state: State<'_, HidState>,
    path: String,
    report_id: u8,
    length: usize,
) -> Result<Vec<u8>, String> {
    send_command(state, &path, |done| Command::GetFeatureReport {
        report_id,
        length,
        done,
    })
    .await
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UdevStatus {
    is_linux: bool,
    is_app_image: bool,
    // /etc is generated from configuration.nix, so the rules have to be added there instead
    is_nixos: bool,
    rules_needed: bool,
    // Without logind uaccess does nothing, so the user has to be in the input group the rules use
    needs_input_group: bool,
}

#[cfg(target_os = "linux")]
const UDEV_RULES: &str = include_str!("../../public/70-santroller.rules");

// The groups this process has, so adding yourself to input only counts once you log in again
#[cfg(target_os = "linux")]
fn in_input_group() -> bool {
    std::process::Command::new("id")
        .arg("-nG")
        .output()
        .is_ok_and(|output| {
            String::from_utf8_lossy(&output.stdout)
                .split_whitespace()
                .any(|group| group == "input")
        })
}

#[tauri::command]
async fn check_udev_rules() -> Result<UdevStatus, String> {
    #[cfg(target_os = "linux")]
    {
        // systemd-logind and elogind both create this
        let has_logind = Path::new("/run/systemd/seats").exists();

        let check_file = |path_str: &str| -> bool {
            let path = Path::new(path_str);
            if let Ok(content) = std::fs::read_to_string(path) {
                content.contains("2883")
                    && content.contains("2882")
                    // older rules only had uaccess
                    && (has_logind || content.contains("GROUP=\"input\""))
            } else {
                false
            }
        };

        let installed = check_file("/etc/udev/rules.d/70-santroller.rules")
            || check_file("/usr/lib/udev/rules.d/70-santroller.rules")
            || check_file("/lib/udev/rules.d/70-santroller.rules")
            || check_file("/etc/udev/rules.d/68-santroller.rules")
            || check_file("/usr/lib/udev/rules.d/68-santroller.rules")
            || check_file("/lib/udev/rules.d/68-santroller.rules");

        let is_nixos = Path::new("/etc/NIXOS").exists()
            || std::fs::read_to_string("/etc/os-release")
                .is_ok_and(|os_release| os_release.lines().any(|line| line == "ID=nixos"));

        // services.udev.extraRules ends up in 99-local.rules, so look through everything
        let installed = installed
            || (is_nixos
                && std::fs::read_dir("/etc/udev/rules.d").is_ok_and(|entries| {
                    entries
                        .flatten()
                        .any(|entry| check_file(&entry.path().to_string_lossy()))
                }));

        Ok(UdevStatus {
            is_linux: true,
            is_app_image: std::env::var_os("APPIMAGE").is_some(),
            is_nixos,
            rules_needed: !installed,
            needs_input_group: !has_logind && !in_input_group(),
        })
    }
    #[cfg(not(target_os = "linux"))]
    {
        Ok(UdevStatus {
            is_linux: false,
            is_app_image: false,
            is_nixos: false,
            rules_needed: false,
            needs_input_group: false,
        })
    }
}

#[tauri::command]
async fn install_udev_rules() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let temp_dir = std::env::temp_dir();
        let temp_path = temp_dir.join("70-santroller.rules");
        std::fs::write(&temp_path, UDEV_RULES)
            .map_err(|e| format!("Failed to create temporary rules file: {}", e))?;

        let temp_str = temp_path.to_string_lossy();
        let script = format!(
            "cp '{}' /etc/udev/rules.d/70-santroller.rules && chmod 644 /etc/udev/rules.d/70-santroller.rules && rm -f '{}' && (udevadm control --reload-rules 2>/dev/null || true) && (udevadm trigger 2>/dev/null || true)",
            temp_str, temp_str
        );

        let status = std::process::Command::new("pkexec")
            .args(["sh", "-c", &script])
            .status()
            .map_err(|e| format!("Failed to run pkexec: {}. If pkexec is not installed, install polkit or copy udev rules manually.", e))?;

        let _ = std::fs::remove_file(&temp_path);

        if !status.success() {
            return Err(format!("Installation failed or was cancelled (status: {})", status));
        }

        Ok(())
    }
    #[cfg(not(target_os = "linux"))]
    {
        Err("udev rules can only be installed on Linux".to_string())
    }
}

// The webviews can't download files, so the frontend sends what it would have downloaded here.
// The body is the file, and the x-file-name header what to call it.
#[tauri::command]
async fn save_file(app: AppHandle, request: Request<'_>) -> Result<bool, String> {
    let tauri::ipc::InvokeBody::Raw(data) = request.body() else {
        return Err("Expected the file as the request body".to_owned());
    };
    let name = request
        .headers()
        .get("x-file-name")
        .and_then(|name| name.to_str().ok())
        .unwrap_or("download")
        .to_owned();
    let mut dialog = app.dialog().file().set_file_name(&name);
    if let Some(extension) = PathBuf::from(&name).extension().and_then(|e| e.to_str()) {
        dialog = dialog.add_filter(extension.to_uppercase(), &[extension]);
    }
    let Some(target) = dialog.blocking_save_file() else {
        return Ok(false);
    };
    let target = target.into_path().map_err(|e| e.to_string())?;
    std::fs::write(target, data).map_err(|e| e.to_string())?;
    Ok(true)
}

// The portable build is just the exe, which the updater can't update: it would install the msi
// alongside it. It replaces itself with the portable exe from the release instead.
#[cfg(feature = "portable")]
fn portable_update_target() -> Option<String> {
    tauri_plugin_updater::target().map(|target| format!("{target}-portable"))
}

// Windows won't let the running exe be overwritten, but it can be renamed out of the way. It's
// left behind until the next start.
#[cfg(feature = "portable")]
fn replaced_exe(exe: &Path) -> PathBuf {
    let mut name = exe.as_os_str().to_owned();
    name.push(".old");
    PathBuf::from(name)
}

// What to pass to the updater's check, so it looks for the portable exe. None when installed.
#[tauri::command]
fn update_target() -> Option<String> {
    #[cfg(feature = "portable")]
    {
        portable_update_target()
    }
    #[cfg(not(feature = "portable"))]
    {
        None
    }
}

// The same events as the updater's downloadAndInstall
#[cfg_attr(not(feature = "portable"), allow(dead_code))]
#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data")]
enum DownloadEvent {
    #[serde(rename_all = "camelCase")]
    Started {
        content_length: Option<u64>,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        chunk_length: usize,
    },
    Finished,
}

// Swaps the portable exe for the latest release's and starts that
#[tauri::command]
async fn install_portable_update(
    app: AppHandle,
    on_event: Channel<DownloadEvent>,
) -> Result<(), String> {
    #[cfg(feature = "portable")]
    {
        use tauri_plugin_updater::UpdaterExt;
        let target = portable_update_target().ok_or("Updates aren't supported here")?;
        let update = app
            .updater_builder()
            .target(target)
            .build()
            .map_err(|e| e.to_string())?
            .check()
            .await
            .map_err(|e| e.to_string())?
            .ok_or("There's no update to install")?;
        let mut started = false;
        // checks the signature before handing it over
        let new_exe = update
            .download(
                |chunk_length, content_length| {
                    if !std::mem::replace(&mut started, true) {
                        let _ = on_event.send(DownloadEvent::Started { content_length });
                    }
                    let _ = on_event.send(DownloadEvent::Progress { chunk_length });
                },
                || {
                    let _ = on_event.send(DownloadEvent::Finished);
                },
            )
            .await
            .map_err(|e| e.to_string())?;
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let old = replaced_exe(&exe);
        let _ = std::fs::remove_file(&old);
        std::fs::rename(&exe, &old)
            .map_err(|e| format!("Couldn't replace {}: {e}", exe.display()))?;
        if let Err(e) = std::fs::write(&exe, new_exe) {
            let _ = std::fs::remove_file(&exe);
            let _ = std::fs::rename(&old, &exe);
            return Err(format!("Couldn't write {}: {e}", exe.display()));
        }
        std::process::Command::new(&exe)
            .args(std::env::args_os().skip(1))
            .spawn()
            .map_err(|e| e.to_string())?;
        app.exit(0);
        Ok(())
    }
    #[cfg(not(feature = "portable"))]
    {
        let _ = (app, on_event);
        Err("Only the portable build updates itself".to_owned())
    }
}

fn is_app_url(url: &Url) -> bool {
    matches!(url.scheme(), "tauri" | "asset")
        || matches!(url.host_str(), Some("localhost" | "tauri.localhost" | "127.0.0.1"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Anything outside the app (links, the github login) opens in the browser instead of
        // replacing the app in its window
        .plugin(
            tauri::plugin::Builder::<tauri::Wry>::new("external-links")
                .on_navigation(|webview, url| {
                    if is_app_url(url) {
                        return true;
                    }
                    let _ = webview.opener().open_url(url.as_str(), None::<&str>);
                    false
                })
                .build(),
        )
        .manage(HidState::default())
        .setup(|_| {
            // the exe an update replaced, now that it isn't running
            #[cfg(feature = "portable")]
            if let Ok(exe) = std::env::current_exe() {
                let _ = std::fs::remove_file(replaced_exe(&exe));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hid_list,
            hid_watch,
            hid_open,
            hid_close,
            hid_send_report,
            hid_send_feature_report,
            hid_receive_feature_report,
            save_file,
            check_udev_rules,
            install_udev_rules,
            update_target,
            install_portable_update,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run the Santroller Configurator");
}
