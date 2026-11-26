// Windows keeps the driver it installed on each of a device's interfaces (USB\VID_x&PID_y&MI_nn) for as
// long as that interface's entry exists. The firmware's interfaces move around with its profiles (eg a
// MIDI profile in place of an XInput one), and some Windows builds (seen on 11 23H2, build 22631) then
// keep the old driver on an interface number that now holds a different kind of interface. The config
// interface can end up on WinUSB that way, which hides the controller from the configurator. Newer
// builds install the right driver again by themselves.
//
// The check reads what each connected interface reports now and which driver it has, and the repair
// removes every saved entry for the controller so that Windows sets it up again from scratch.

use serde::Serialize;

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StaleInterface {
    pub instance_id: String,
    pub driver: String,
    pub expected_driver: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsDriverStatus {
    pub is_windows: bool,
    pub stale_interfaces: Vec<StaleInterface>,
}

// The driver an interface should be using, going by its compatible ids. None for interfaces this doesn't
// know about, which are never reported as stale.
#[cfg_attr(not(any(target_os = "windows", test)), allow(dead_code))]
fn expected_driver(compatible_ids: &[String]) -> Option<&'static str> {
    let has = |id: &str| compatible_ids.iter().any(|c| c.eq_ignore_ascii_case(id));
    if has(r"USB\MS_COMP_XUSB20") || has(r"USB\MS_COMP_XUSB10") {
        return Some("xusb22");
    }
    if has(r"USB\MS_COMP_WINUSB") {
        return Some("WinUSB");
    }
    // Other compatible ids from the firmware's MS OS descriptor (eg XGIP10) pick their own drivers
    if compatible_ids
        .iter()
        .any(|c| c.to_ascii_uppercase().starts_with(r"USB\MS_COMP_"))
    {
        return None;
    }
    if has(r"USB\Class_03") {
        return Some("HidUsb");
    }
    // Audio control, which a microphone or MIDI starts with
    if has(r"USB\Class_01&SubClass_01") {
        return Some("usbaudio");
    }
    None
}

#[cfg_attr(not(any(target_os = "windows", test)), allow(dead_code))]
fn driver_fits(expected: &str, driver: &str) -> bool {
    driver.eq_ignore_ascii_case(expected)
        || (expected == "usbaudio" && driver.eq_ignore_ascii_case("usbaudio2"))
}

#[cfg_attr(not(any(target_os = "windows", test)), allow(dead_code))]
fn stale_interface(
    instance_id: &str,
    compatible_ids: &[String],
    driver: Option<&str>,
) -> Option<StaleInterface> {
    // An interface without a driver yet is still being set up, or has none to install
    let driver = driver.filter(|d| !d.is_empty())?;
    let expected = expected_driver(compatible_ids)?;
    if driver_fits(expected, driver) {
        return None;
    }
    Some(StaleInterface {
        instance_id: instance_id.to_string(),
        driver: driver.to_string(),
        expected_driver: expected.to_string(),
    })
}

#[cfg(target_os = "windows")]
mod imp {
    use super::*;
    use windows_sys::Win32::Devices::DeviceAndDriverInstallation::{
        CM_Locate_DevNodeW, CM_LOCATE_DEVNODE_NORMAL, CR_SUCCESS,
    };
    use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_CANCELLED};
    use windows_sys::Win32::System::Threading::{
        GetExitCodeProcess, WaitForSingleObject, INFINITE,
    };
    use windows_sys::Win32::UI::Shell::{
        ShellExecuteExW, SEE_MASK_NOASYNC, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_HIDE;
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    const INTERFACE_PREFIXES: [&str; 2] = ["VID_1209&PID_2882&MI_", "VID_1209&PID_2883&MI_"];

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn connected(instance_id: &str) -> bool {
        let id = wide(instance_id);
        let mut devinst = 0u32;
        unsafe {
            CM_Locate_DevNodeW(&mut devinst, id.as_ptr(), CM_LOCATE_DEVNODE_NORMAL) == CR_SUCCESS
        }
    }

    pub fn check() -> Vec<StaleInterface> {
        let Ok(usb) =
            RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(r"SYSTEM\CurrentControlSet\Enum\USB")
        else {
            return Vec::new();
        };
        let mut stale = Vec::new();
        for device in usb.enum_keys().flatten() {
            let upper = device.to_ascii_uppercase();
            if !INTERFACE_PREFIXES.iter().any(|p| upper.starts_with(p)) {
                continue;
            }
            let Ok(device_key) = usb.open_subkey(&device) else {
                continue;
            };
            for instance in device_key.enum_keys().flatten() {
                let instance_id = format!(r"USB\{}\{}", device, instance);
                if !connected(&instance_id) {
                    continue;
                }
                let Ok(key) = device_key.open_subkey(&instance) else {
                    continue;
                };
                let compatible_ids: Vec<String> =
                    key.get_value("CompatibleIDs").unwrap_or_default();
                let driver: Option<String> = key.get_value("Service").ok();
                if let Some(s) = stale_interface(&instance_id, &compatible_ids, driver.as_deref()) {
                    stale.push(s);
                }
            }
        }
        stale
    }

    // Interfaces first and the composite devices last, then Windows looks for the controller again
    const REPAIR_SCRIPT: &str = r#"
$devs = Get-PnpDevice | Where-Object { $_.InstanceId -match 'VID_1209&PID_288[23]' }
$devs | Sort-Object { $_.InstanceId -match '^USB\\VID_1209&PID_288[23]\\' } | ForEach-Object { pnputil /remove-device "$($_.InstanceId)" | Out-Null }
Get-ChildItem HKLM:\SYSTEM\CurrentControlSet\Control\usbflags -ErrorAction SilentlyContinue | Where-Object PSChildName -match '^1209288[23]' | Remove-Item -Recurse -Force
pnputil /scan-devices | Out-Null
exit 0
"#;

    fn base64(data: &[u8]) -> String {
        const ALPHABET: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
        for chunk in data.chunks(3) {
            let b = [
                chunk[0],
                *chunk.get(1).unwrap_or(&0),
                *chunk.get(2).unwrap_or(&0),
            ];
            let n = (b[0] as u32) << 16 | (b[1] as u32) << 8 | b[2] as u32;
            for i in 0..4 {
                if i <= chunk.len() {
                    out.push(ALPHABET[(n >> (18 - 6 * i) & 63) as usize] as char);
                } else {
                    out.push('=');
                }
            }
        }
        out
    }

    // Runs the repair in an elevated PowerShell, which shows the UAC prompt
    pub fn repair() -> Result<(), String> {
        let script: Vec<u8> = REPAIR_SCRIPT
            .encode_utf16()
            .flat_map(|c| c.to_le_bytes())
            .collect();
        let params = format!(
            "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand {}",
            base64(&script)
        );
        let verb = wide("runas");
        let file = wide("powershell.exe");
        let params = wide(&params);
        unsafe {
            let mut info: SHELLEXECUTEINFOW = std::mem::zeroed();
            info.cbSize = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
            info.fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC;
            info.lpVerb = verb.as_ptr();
            info.lpFile = file.as_ptr();
            info.lpParameters = params.as_ptr();
            info.nShow = SW_HIDE;
            if ShellExecuteExW(&mut info) == 0 {
                return Err(if GetLastError() == ERROR_CANCELLED {
                    "cancelled".to_string()
                } else {
                    format!("Couldn't start the repair (error {})", GetLastError())
                });
            }
            if info.hProcess.is_null() {
                return Err("Couldn't start the repair".to_string());
            }
            WaitForSingleObject(info.hProcess, INFINITE);
            let mut code = 0u32;
            GetExitCodeProcess(info.hProcess, &mut code);
            CloseHandle(info.hProcess);
            if code != 0 {
                return Err(format!("The repair failed (exit code {})", code));
            }
        }
        Ok(())
    }
}

#[tauri::command]
pub async fn check_windows_drivers() -> Result<WindowsDriverStatus, String> {
    #[cfg(target_os = "windows")]
    {
        let stale_interfaces = tauri::async_runtime::spawn_blocking(imp::check)
            .await
            .map_err(|e| e.to_string())?;
        Ok(WindowsDriverStatus {
            is_windows: true,
            stale_interfaces,
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsDriverStatus {
            is_windows: false,
            stale_interfaces: Vec::new(),
        })
    }
}

// Errors with "cancelled" when the UAC prompt is declined
#[tauri::command]
pub async fn repair_windows_drivers() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        tauri::async_runtime::spawn_blocking(imp::repair)
            .await
            .map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Only needed on Windows".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    // The interfaces from a user's PC on Windows 11 22631 after their kit went from XInput to MIDI
    #[test]
    fn finds_the_stale_interfaces_from_the_report() {
        let midi = ids(&[
            r"USB\COMPAT_VID_1209&Class_01&SubClass_01&Prot_00",
            r"USB\Class_01&SubClass_01&Prot_00",
            r"USB\Class_01&SubClass_01",
            r"USB\Class_01",
        ]);
        let config = ids(&[
            r"USB\COMPAT_VID_1209&Class_03&SubClass_00&Prot_00",
            r"USB\Class_03&SubClass_00&Prot_00",
            r"USB\Class_03&SubClass_00",
            r"USB\Class_03",
        ]);
        let security = ids(&[
            r"USB\MS_COMP_WINUSB",
            r"USB\COMPAT_VID_1209&Class_ff&SubClass_fd&Prot_13",
            r"USB\Class_ff&SubClass_fd&Prot_13",
            r"USB\Class_ff&SubClass_fd",
            r"USB\Class_ff",
        ]);

        let midi_stale = stale_interface("MI_00", &midi, Some("xusb22")).unwrap();
        assert_eq!(midi_stale.expected_driver, "usbaudio");
        let config_stale = stale_interface("MI_02", &config, Some("WINUSB")).unwrap();
        assert_eq!(config_stale.expected_driver, "HidUsb");
        assert_eq!(stale_interface("MI_03", &security, Some("WINUSB")), None);
    }

    #[test]
    fn leaves_correct_and_unknown_interfaces_alone() {
        let receiver = ids(&[
            r"USB\MS_COMP_XUSB20",
            r"USB\Class_ff&SubClass_5d&Prot_81",
            r"USB\Class_ff",
        ]);
        assert_eq!(stale_interface("a", &receiver, Some("xusb22")), None);
        let hid = ids(&[r"USB\Class_03&SubClass_00&Prot_00", r"USB\Class_03"]);
        assert_eq!(stale_interface("b", &hid, Some("HidUsb")), None);
        // no driver yet
        assert_eq!(stale_interface("c", &hid, None), None);
        let gip = ids(&[
            r"USB\MS_COMP_XGIP10",
            r"USB\Class_ff&SubClass_47&Prot_d0",
            r"USB\Class_ff",
        ]);
        assert_eq!(stale_interface("d", &gip, Some("xboxgip")), None);
        let audio = ids(&[
            r"USB\Class_01&SubClass_01&Prot_20",
            r"USB\Class_01&SubClass_01",
            r"USB\Class_01",
        ]);
        assert_eq!(stale_interface("e", &audio, Some("usbaudio2")), None);
        // a receiver slot left on an interface that is now HID
        assert!(stale_interface("f", &hid, Some("xusb22")).is_some());
    }
}
