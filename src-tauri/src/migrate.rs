// Getting a Pico onto Santroller 2 from the desktop app: finding Picos that are in their bootloader
// (BOOTSEL) or still running Santroller 1, reading what Santroller 1 had on them, and flashing the
// firmware.
use std::{
    io::Read,
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

use nusb::{
    transfer::{Buffer, Bulk, ControlIn, ControlOut, ControlType, In, Out, Recipient},
    DeviceInfo, Interface, MaybeFuture,
};
use serde::Serialize;
use tauri::{ipc::Request, AppHandle, Emitter, Manager};

const RPI_VID: u16 = 0x2e8a;
const RP2040_BOOT_PID: u16 = 0x0003;
const RP2350_BOOT_PID: u16 = 0x000f;
pub const SANTROLLER_VID: u16 = 0x1209;
pub const SANTROLLER_V1_PID: u16 = 0x2882;

// Santroller 1's requests, sent to its vendor interface as class requests
const S1_INTERFACE: u8 = 2;
const S1_JUMP_BOOTLOADER: u8 = 0x31;
const S1_READ_CONFIG: u8 = 0x34;
const S1_READ_F_CPU: u8 = 0x35;
const S1_READ_BOARD: u8 = 0x36;
const S1_CONFIG_CHUNK: u16 = 64;
// Far bigger than any config, in case a device never sends the empty chunk that ends it
const S1_MAX_CONFIG: usize = 256 * 1024;
const S1_TIMEOUT: Duration = Duration::from_millis(1000);

// Santroller 1's console modes, from the third last character of the serial number
const S1_MODE_UNIVERSAL: u8 = 0;
const S1_MODE_WINDOWS: u8 = 9;

#[derive(Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Chip {
    Rp2040,
    Rp2350,
}

impl Chip {
    fn from_boot_pid(pid: u16) -> Option<Chip> {
        match pid {
            RP2040_BOOT_PID => Some(Chip::Rp2040),
            RP2350_BOOT_PID => Some(Chip::Rp2350),
            _ => None,
        }
    }

    // The Board-ID line in the bootloader drive's INFO_UF2.TXT
    fn board_id(self) -> &'static str {
        match self {
            Chip::Rp2040 => "RPI-RP2",
            Chip::Rp2350 => "RP2350",
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bootsel {
    chip: Chip,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Santroller1 {
    serial: String,
    // What Santroller 1 calls the board, if it said. The frontend works out from it whether it can
    // run Santroller 2.
    board: Option<String>,
    mode: u8,
    // In a console mode Santroller 1 doesn't answer, so its config can't be read and it can't be
    // put into its bootloader. It has to be plugged in again in PC mode.
    console_mode: bool,
    // Why it couldn't be asked what it is, usually missing permissions on Linux
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrateScan {
    bootsel: Vec<Bootsel>,
    santroller1: Vec<Santroller1>,
}

pub fn is_migrate_device(vid: u16, pid: u16) -> bool {
    (vid == RPI_VID && Chip::from_boot_pid(pid).is_some())
        || (vid == SANTROLLER_VID && pid == SANTROLLER_V1_PID)
}

// The console mode Santroller 1 is in, and whether it can be configured that way. Santroller 1
// puts these at the end of the serial: the mode, the controller type and whether it's XInput.
fn s1_mode(serial: &str) -> (u8, bool) {
    let bytes = serial.as_bytes();
    if bytes.len() < 3 {
        return (S1_MODE_UNIVERSAL, true);
    }
    let mode = bytes[bytes.len() - 3].wrapping_sub(b'0');
    let xinput = bytes[bytes.len() - 1] != b'0';
    let configurable = match mode {
        S1_MODE_WINDOWS => true,
        // Windows hands an XInput device to its own driver, so the configurator can't reach it
        S1_MODE_UNIVERSAL => !(cfg!(target_os = "windows") && xinput),
        _ => false,
    };
    (mode, configurable)
}

fn is_s1(info: &DeviceInfo) -> bool {
    info.vendor_id() == SANTROLLER_VID
        && info.product_id() == SANTROLLER_V1_PID
        // Ardwiino, from before Santroller 1, used the same ids
        && info.product_string().is_none_or(|product| product == "Santroller")
}

fn open_s1_interface(info: &DeviceInfo) -> Result<Interface, String> {
    let device = info.open().wait().map_err(|e| e.to_string())?;
    device
        .claim_interface(S1_INTERFACE)
        .wait()
        .map_err(|e| e.to_string())
}

fn s1_read(interface: &Interface, request: u8, value: u16, length: u16) -> Result<Vec<u8>, String> {
    interface
        .control_in(
            ControlIn {
                control_type: ControlType::Class,
                recipient: Recipient::Interface,
                request,
                value,
                index: S1_INTERFACE as u16,
                length,
            },
            S1_TIMEOUT,
        )
        .wait()
        .map_err(|e| e.to_string())
}

fn s1_string(interface: &Interface, request: u8) -> Result<String, String> {
    let data = s1_read(interface, request, 0, 32)?;
    Ok(String::from_utf8_lossy(&data)
        .trim_end_matches('\0')
        .trim()
        .to_owned())
}

fn s1_board(info: &DeviceInfo) -> Result<String, String> {
    let interface = open_s1_interface(info)?;
    // Santroller 1 reads the clock speed first, and an empty one means it isn't ready yet
    if s1_string(&interface, S1_READ_F_CPU)?.is_empty() {
        return Err("The controller didn't say what it is".to_owned());
    }
    s1_string(&interface, S1_READ_BOARD)
}

fn find_s1(serial: &str) -> Result<DeviceInfo, String> {
    nusb::list_devices()
        .wait()
        .map_err(|e| e.to_string())?
        .find(|info| is_s1(info) && info.serial_number() == Some(serial))
        .ok_or_else(|| "The controller was unplugged".to_owned())
}

#[tauri::command]
pub async fn migrate_scan() -> Result<MigrateScan, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut scan = MigrateScan {
            bootsel: vec![],
            santroller1: vec![],
        };
        for info in nusb::list_devices().wait().map_err(|e| e.to_string())? {
            if info.vendor_id() == RPI_VID {
                if let Some(chip) = Chip::from_boot_pid(info.product_id()) {
                    scan.bootsel.push(Bootsel { chip });
                }
            } else if is_s1(&info) {
                let serial = info.serial_number().unwrap_or_default().to_owned();
                let (mode, configurable) = s1_mode(&serial);
                let (board, error) = if configurable {
                    match s1_board(&info) {
                        Ok(board) => (Some(board), None),
                        Err(e) => (None, Some(e)),
                    }
                } else {
                    (None, None)
                };
                scan.santroller1.push(Santroller1 {
                    board,
                    serial,
                    mode,
                    console_mode: !configurable,
                    error,
                });
            }
        }
        Ok(scan)
    })
    .await
    .map_err(|e| e.to_string())?
}

// The config Santroller 1 keeps on the controller, as the same protobuf it exports, so it can be
// imported like an exported file
#[tauri::command]
pub async fn s1_read_config(serial: String) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let interface = open_s1_interface(&find_s1(&serial)?)?;
        let mut compressed = Vec::new();
        // Santroller 1 steps through it a chunk at a time, whatever the last chunk held
        for offset in (0..=u16::MAX).step_by(S1_CONFIG_CHUNK as usize) {
            let chunk = s1_read(&interface, S1_READ_CONFIG, offset, S1_CONFIG_CHUNK)?;
            if chunk.is_empty() {
                break;
            }
            compressed.extend_from_slice(&chunk);
            if compressed.len() > S1_MAX_CONFIG {
                return Err("The controller's config is too big".to_owned());
            }
        }
        if compressed.is_empty() {
            return Err("The controller has no config".to_owned());
        }
        let mut config = Vec::new();
        brotli_decompressor::Decompressor::new(compressed.as_slice(), 4096)
            .read_to_end(&mut config)
            .map_err(|e| format!("Couldn't read the controller's config: {e}"))?;
        Ok(config)
    })
    .await
    .map_err(|e| e.to_string())?
}

// Restarts a Santroller 1 Pico into its bootloader. It disconnects straight away, so the request
// may not complete.
#[tauri::command]
pub async fn s1_bootloader(serial: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let interface = open_s1_interface(&find_s1(&serial)?)?;
        let _ = interface
            .control_out(
                ControlOut {
                    control_type: ControlType::Class,
                    recipient: Recipient::Interface,
                    request: S1_JUMP_BOOTLOADER,
                    value: 0,
                    index: S1_INTERFACE as u16,
                    data: &[],
                },
                S1_TIMEOUT,
            )
            .wait();
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

// Where Santroller 1 keeps its settings, including the presets saved in it
fn s1_app_data(app: &AppHandle) -> Option<PathBuf> {
    if cfg!(target_os = "macos") {
        return Some(PathBuf::from(
            "/Users/Shared/Library/Application Support/SantrollerConfigurator",
        ));
    }
    // .NET's ApplicationData: %APPDATA% on Windows, $XDG_CONFIG_HOME or ~/.config elsewhere
    app.path()
        .config_dir()
        .ok()
        .map(|dir| dir.join("SantrollerConfigurator"))
}

// Santroller 1's settings file, which holds its saved presets. None when it was never installed.
#[tauri::command]
pub fn s1_saved_presets(app: AppHandle) -> Result<Option<Vec<u8>>, String> {
    let Some(path) = s1_app_data(&app).map(|dir| dir.join("config.bin")) else {
        return Ok(None);
    };
    match std::fs::read(&path) {
        Ok(data) => Ok(Some(data)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("Couldn't read {}: {e}", path.display())),
    }
}

// Keeps a copy of the config read off a Santroller 1 controller before it's flashed over, as an
// exported file the configurator can import again. The body is the config, and x-file-name what to
// call it.
#[tauri::command]
pub fn s1_backup_config(app: AppHandle, request: Request<'_>) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(data) = request.body() else {
        return Err("Expected the config as the request body".to_owned());
    };
    let name = request
        .headers()
        .get("x-file-name")
        .and_then(|name| name.to_str().ok())
        .unwrap_or("santroller1.picoconfig");
    // only a file name, never a path
    let name = Path::new(name)
        .file_name()
        .ok_or("Invalid file name")?
        .to_owned();
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("santroller1-backups");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(name);
    std::fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase", tag = "result")]
pub enum FlashResult {
    // Copied to the bootloader's drive
    Drive,
    // Written over USB, as the drive wasn't mounted
    Picoboot,
    // Neither worked, so the drive has to be mounted by hand. Says why PICOBOOT didn't work.
    NeedsMount { error: String },
}

// The mounted drives that could be a bootloader's
fn candidate_drives() -> Vec<PathBuf> {
    #[cfg(target_os = "linux")]
    {
        // Spaces and the like are escaped as octal, eg \040
        fn unescape(path: &str) -> String {
            let mut out = Vec::new();
            let bytes = path.as_bytes();
            let mut i = 0;
            while i < bytes.len() {
                if bytes[i] == b'\\' && i + 4 <= bytes.len() {
                    if let Ok(byte) = u8::from_str_radix(&path[i + 1..i + 4], 8) {
                        out.push(byte);
                        i += 4;
                        continue;
                    }
                }
                out.push(bytes[i]);
                i += 1;
            }
            String::from_utf8_lossy(&out).into_owned()
        }
        std::fs::read_to_string("/proc/self/mounts")
            .map(|mounts| {
                mounts
                    .lines()
                    .filter_map(|line| line.split(' ').nth(1))
                    .map(|path| PathBuf::from(unescape(path)))
                    .collect()
            })
            .unwrap_or_default()
    }
    #[cfg(target_os = "macos")]
    {
        std::fs::read_dir("/Volumes")
            .map(|entries| entries.flatten().map(|entry| entry.path()).collect())
            .unwrap_or_default()
    }
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Storage::FileSystem::{GetDriveTypeW, GetLogicalDrives};
        const DRIVE_REMOVABLE: u32 = 2;
        let drives = unsafe { GetLogicalDrives() };
        (0..26u8)
            .filter(|i| drives & (1 << i) != 0)
            .map(|i| format!("{}:\\", (b'A' + i) as char))
            .filter(|root| {
                let wide: Vec<u16> = root.encode_utf16().chain(Some(0)).collect();
                unsafe { GetDriveTypeW(wide.as_ptr()) == DRIVE_REMOVABLE }
            })
            .map(PathBuf::from)
            .collect()
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        vec![]
    }
}

fn find_drive(chip: Chip) -> Option<PathBuf> {
    let board_id = format!("Board-ID: {}", chip.board_id());
    candidate_drives().into_iter().find(|drive| {
        std::fs::read_to_string(drive.join("INFO_UF2.TXT"))
            .is_ok_and(|info| info.lines().any(|line| line.trim() == board_id))
    })
}

// How much is copied to the drive between progress updates. Each piece is flushed to the Pico
// before the next, so the progress follows the Pico rather than the OS's write cache.
const DRIVE_CHUNK: usize = 64 * 1024;

fn copy_to_drive(drive: &Path, uf2: &[u8], progress: &dyn Fn(f64)) -> Result<(), String> {
    use std::io::Write;
    let mut file =
        std::fs::File::create(drive.join("SANTROLLER.UF2")).map_err(|e| e.to_string())?;
    let mut written = 0;
    for chunk in uf2.chunks(DRIVE_CHUNK) {
        file.write_all(chunk).map_err(|e| e.to_string())?;
        written += chunk.len();
        // The Pico reboots as soon as it has the last block, so the drive can be gone before the
        // last of these finishes
        let synced = file.sync_data();
        if written < uf2.len() {
            synced.map_err(|e| e.to_string())?;
        }
        progress(written as f64 / uf2.len() as f64);
    }
    Ok(())
}

// What a UF2 writes to flash, as runs of consecutive blocks
fn uf2_runs(uf2: &[u8]) -> Result<Vec<(u32, Vec<u8>)>, String> {
    const MAGIC0: u32 = 0x0A32_4655;
    const MAGIC1: u32 = 0x9E5D_5157;
    const MAGIC_END: u32 = 0x0AB1_6F30;
    const FLAG_NOT_MAIN_FLASH: u32 = 0x1;
    let word = |block: &[u8], at: usize| u32::from_le_bytes(block[at..at + 4].try_into().unwrap());
    let mut runs: Vec<(u32, Vec<u8>)> = vec![];
    for block in uf2.chunks(512) {
        if block.len() != 512
            || word(block, 0) != MAGIC0
            || word(block, 4) != MAGIC1
            || word(block, 508) != MAGIC_END
        {
            return Err("The firmware isn't a UF2".to_owned());
        }
        if word(block, 8) & FLAG_NOT_MAIN_FLASH != 0 {
            continue;
        }
        let addr = word(block, 12);
        let size = word(block, 16) as usize;
        if size > 476 {
            return Err("The firmware isn't a UF2".to_owned());
        }
        let data = &block[32..32 + size];
        match runs.last_mut() {
            Some((start, run)) if *start + run.len() as u32 == addr => run.extend_from_slice(data),
            _ => runs.push((addr, data.to_vec())),
        }
    }
    Ok(runs)
}

// The bootloader's PICOBOOT interface, which picotool uses
struct Picoboot {
    out: nusb::Endpoint<Bulk, Out>,
    input: nusb::Endpoint<Bulk, In>,
    token: u32,
}

const PICOBOOT_MAGIC: u32 = 0x431f_d10b;
const PC_EXCLUSIVE_ACCESS: u8 = 0x1;
const PC_REBOOT: u8 = 0x2;
const PC_FLASH_ERASE: u8 = 0x3;
const PC_WRITE: u8 = 0x5;
const PC_EXIT_XIP: u8 = 0x6;
const PC_REBOOT2: u8 = 0xa;
const PICOBOOT_IF_RESET: u8 = 0x41;
const PICOBOOT_TIMEOUT: Duration = Duration::from_secs(10);
const FLASH_SECTOR: u32 = 4096;
const RP2040_SRAM_END: u32 = 0x2004_2000;

impl Picoboot {
    fn open(chip: Chip) -> Result<Picoboot, String> {
        let pid = match chip {
            Chip::Rp2040 => RP2040_BOOT_PID,
            Chip::Rp2350 => RP2350_BOOT_PID,
        };
        let info = nusb::list_devices()
            .wait()
            .map_err(|e| e.to_string())?
            .find(|info| info.vendor_id() == RPI_VID && info.product_id() == pid)
            .ok_or("The Pico isn't in its bootloader any more")?;
        let number = info
            .interfaces()
            .find(|interface| interface.class() == 0xff)
            .map(|interface| interface.interface_number())
            .ok_or("The bootloader has no PICOBOOT interface")?;
        let device = info.open().wait().map_err(|e| e.to_string())?;
        let interface = device
            .claim_interface(number)
            .wait()
            .map_err(|e| e.to_string())?;
        let (mut out_addr, mut in_addr) = (None, None);
        for endpoint in interface
            .descriptor()
            .into_iter()
            .flat_map(|d| d.endpoints().collect::<Vec<_>>())
        {
            if endpoint.address() & 0x80 != 0 {
                in_addr = Some(endpoint.address());
            } else {
                out_addr = Some(endpoint.address());
            }
        }
        interface
            .control_out(
                ControlOut {
                    control_type: ControlType::Vendor,
                    recipient: Recipient::Interface,
                    request: PICOBOOT_IF_RESET,
                    value: 0,
                    index: number as u16,
                    data: &[],
                },
                PICOBOOT_TIMEOUT,
            )
            .wait()
            .map_err(|e| e.to_string())?;
        Ok(Picoboot {
            out: interface
                .endpoint::<Bulk, Out>(out_addr.ok_or("No PICOBOOT OUT endpoint")?)
                .map_err(|e| e.to_string())?,
            input: interface
                .endpoint::<Bulk, In>(in_addr.ok_or("No PICOBOOT IN endpoint")?)
                .map_err(|e| e.to_string())?,
            token: 1,
        })
    }

    fn send(&mut self, data: &[u8]) -> Result<(), String> {
        let mut buffer = Buffer::new(data.len());
        buffer.extend_from_slice(data);
        self.out
            .transfer_blocking(buffer, PICOBOOT_TIMEOUT)
            .into_result()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    // Every command used here sends its data (if any) to the device, and is acknowledged with an
    // empty packet from it
    fn command(&mut self, id: u8, args: &[u8], data: &[u8]) -> Result<(), String> {
        let mut cmd = Vec::with_capacity(32);
        cmd.extend_from_slice(&PICOBOOT_MAGIC.to_le_bytes());
        cmd.extend_from_slice(&self.token.to_le_bytes());
        self.token = self.token.wrapping_add(1);
        cmd.push(id);
        cmd.push(args.len() as u8);
        cmd.extend_from_slice(&[0, 0]);
        cmd.extend_from_slice(&(data.len() as u32).to_le_bytes());
        cmd.extend_from_slice(args);
        cmd.resize(32, 0);
        self.send(&cmd)?;
        if !data.is_empty() {
            self.send(data)?;
        }
        let max = self.input.max_packet_size();
        self.input
            .transfer_blocking(Buffer::new(max), PICOBOOT_TIMEOUT)
            .into_result()
            .map(|_| ())
            .map_err(|e| format!("PICOBOOT command {id:#x} failed: {e}"))
    }

    fn range(addr: u32, size: u32) -> Vec<u8> {
        [addr.to_le_bytes(), size.to_le_bytes()].concat()
    }

    fn flash(&mut self, chip: Chip, uf2: &[u8], progress: &dyn Fn(f64)) -> Result<(), String> {
        let runs = uf2_runs(uf2)?;
        let total: usize = runs.iter().map(|(_, data)| data.len()).sum();
        let mut written = 0;
        self.command(PC_EXCLUSIVE_ACCESS, &[1], &[])?;
        self.command(PC_EXIT_XIP, &[], &[])?;
        for (addr, run) in &runs {
            let start = addr & !(FLASH_SECTOR - 1);
            let end = (addr + run.len() as u32).div_ceil(FLASH_SECTOR) * FLASH_SECTOR;
            self.command(PC_FLASH_ERASE, &Self::range(start, end - start), &[])?;
            // Flash is written a page at a time, so pad the run out to a whole page
            let mut data = run.clone();
            data.resize(data.len().div_ceil(256) * 256, 0xff);
            for (i, chunk) in data.chunks(FLASH_SECTOR as usize).enumerate() {
                let at = addr + (i as u32) * FLASH_SECTOR;
                self.command(PC_WRITE, &Self::range(at, chunk.len() as u32), chunk)?;
                written += chunk.len().min(run.len() - i * FLASH_SECTOR as usize);
                progress(written as f64 / total as f64);
            }
        }
        // The device goes away as it reboots, so this may not be acknowledged
        let _ = match chip {
            Chip::Rp2040 => self.command(
                PC_REBOOT,
                &[
                    0u32.to_le_bytes(),
                    RP2040_SRAM_END.to_le_bytes(),
                    500u32.to_le_bytes(),
                ]
                .concat(),
                &[],
            ),
            Chip::Rp2350 => self.command(
                PC_REBOOT2,
                &[0u32.to_le_bytes(), 500u32.to_le_bytes(), [0; 4], [0; 4]].concat(),
                &[],
            ),
        };
        Ok(())
    }
}

// How long to wait for the bootloader's drive to be mounted after it appears, before writing the
// firmware over USB instead
const DRIVE_WAIT: Duration = Duration::from_secs(5);

// Flashes a Pico that's in its bootloader. Copies the firmware to its drive like dragging it there
// would, and when the drive isn't mounted (common on Linux) writes it over PICOBOOT instead. If
// that fails too, the drive has to be mounted by hand. The body is the UF2, x-chip which Pico it's
// for, and x-drive-only skips straight to the drive (after asking for it to be mounted).
#[tauri::command]
pub async fn flash_uf2(app: AppHandle, request: Request<'_>) -> Result<FlashResult, String> {
    let tauri::ipc::InvokeBody::Raw(data) = request.body() else {
        return Err("Expected the firmware as the request body".to_owned());
    };
    let data = data.clone();
    let header = |name: &str| {
        request
            .headers()
            .get(name)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned)
    };
    let chip = match header("x-chip").as_deref() {
        Some("rp2040") => Chip::Rp2040,
        Some("rp2350") => Chip::Rp2350,
        _ => return Err("Unknown chip".to_owned()),
    };
    let drive_only = header("x-drive-only").is_some_and(|value| value == "true");
    // How far through it is, from 0 to 1, as a flash-progress event
    let progress = move |fraction: f64| {
        let _ = app.emit("flash-progress", fraction);
    };
    tauri::async_runtime::spawn_blocking(move || flash(chip, &data, drive_only, &progress))
        .await
        .map_err(|e| e.to_string())?
}

fn flash(
    chip: Chip,
    uf2: &[u8],
    drive_only: bool,
    progress: &dyn Fn(f64),
) -> Result<FlashResult, String> {
    let started = Instant::now();
    loop {
        if let Some(drive) = find_drive(chip) {
            copy_to_drive(&drive, uf2, progress)?;
            return Ok(FlashResult::Drive);
        }
        if drive_only || started.elapsed() >= DRIVE_WAIT {
            break;
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    if drive_only {
        return Ok(FlashResult::NeedsMount {
            error: String::new(),
        });
    }
    match Picoboot::open(chip).and_then(|mut picoboot| picoboot.flash(chip, uf2, progress)) {
        Ok(()) => Ok(FlashResult::Picoboot),
        Err(error) => Ok(FlashResult::NeedsMount { error }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_mode_from_the_serial() {
        assert_eq!(s1_mode("00AA966B5AAC69C23041").0, 0);
        assert!(!s1_mode("00AA966B5AAC69C23240").1);
        assert!(s1_mode("00AA966B5AAC69C23940").1);
    }

    #[test]
    fn joins_consecutive_uf2_blocks() {
        let block = |addr: u32| {
            let mut block = vec![0u8; 512];
            block[0..4].copy_from_slice(&0x0A32_4655u32.to_le_bytes());
            block[4..8].copy_from_slice(&0x9E5D_5157u32.to_le_bytes());
            block[12..16].copy_from_slice(&addr.to_le_bytes());
            block[16..20].copy_from_slice(&256u32.to_le_bytes());
            block[508..512].copy_from_slice(&0x0AB1_6F30u32.to_le_bytes());
            block
        };
        let uf2 = [block(0x1000_0000), block(0x1000_0100), block(0x1000_1000)].concat();
        let runs = uf2_runs(&uf2).unwrap();
        assert_eq!(runs.len(), 2);
        assert_eq!(runs[0].0, 0x1000_0000);
        assert_eq!(runs[0].1.len(), 512);
        assert_eq!(runs[1].0, 0x1000_1000);
    }

    // Reads the config off a Santroller 1 controller that's plugged in:
    // cargo test read_plugged_in -- --ignored --nocapture
    #[test]
    #[ignore]
    fn read_plugged_in_santroller1() {
        let scan = tauri::async_runtime::block_on(migrate_scan()).unwrap();
        for device in &scan.santroller1 {
            println!(
                "{} board={:?} mode={} console={} error={:?}",
                device.serial, device.board, device.mode, device.console_mode, device.error
            );
            let config =
                tauri::async_runtime::block_on(s1_read_config(device.serial.clone())).unwrap();
            println!("config is {} bytes", config.len());
            std::fs::write(std::env::temp_dir().join("s1-config.bin"), config).unwrap();
        }
    }

    // Moves a plugged in Santroller 1 Pico over to Santroller 2, the way the app does:
    // cargo test move_plugged_in -- --ignored --nocapture
    #[test]
    #[ignore]
    fn move_plugged_in_santroller1() {
        use tauri::async_runtime::block_on;
        let scan = block_on(migrate_scan()).unwrap();
        let device = scan
            .santroller1
            .first()
            .expect("no Santroller 1 controller");
        let chip = match device.board.as_deref() {
            Some("pico2" | "pico2w") => Chip::Rp2350,
            Some(_) => Chip::Rp2040,
            None => panic!("couldn't read the board"),
        };
        block_on(s1_bootloader(device.serial.clone())).unwrap();
        let started = Instant::now();
        while !block_on(migrate_scan())
            .unwrap()
            .bootsel
            .iter()
            .any(|found| found.chip == chip)
        {
            assert!(
                started.elapsed() < Duration::from_secs(15),
                "never reached the bootloader"
            );
            std::thread::sleep(Duration::from_millis(250));
        }
        println!("in the bootloader after {:?}", started.elapsed());
        let name = match chip {
            Chip::Rp2040 => "santroller_pico1.uf2",
            Chip::Rp2350 => "santroller_pico2.uf2",
        };
        let uf2 = std::fs::read(Path::new("../public").join(name)).unwrap();
        let started = Instant::now();
        match flash(chip, &uf2, false, &|_| ()).unwrap() {
            FlashResult::Drive => println!("copied to the drive in {:?}", started.elapsed()),
            FlashResult::Picoboot => println!("written over PICOBOOT in {:?}", started.elapsed()),
            FlashResult::NeedsMount { error } => panic!("needs mounting: {error}"),
        }
    }

    // Flashes a Pico in its bootloader over PICOBOOT, even if its drive is mounted:
    // cargo test picoboot_plugged_in -- --ignored --nocapture
    #[test]
    #[ignore]
    fn picoboot_plugged_in() {
        let scan = tauri::async_runtime::block_on(migrate_scan()).unwrap();
        let chip = scan
            .bootsel
            .first()
            .expect("no Pico in its bootloader")
            .chip;
        let name = match chip {
            Chip::Rp2040 => "santroller_pico1.uf2",
            Chip::Rp2350 => "santroller_pico2.uf2",
        };
        let uf2 = std::fs::read(Path::new("../public").join(name)).unwrap();
        let started = Instant::now();
        Picoboot::open(chip)
            .and_then(|mut picoboot| picoboot.flash(chip, &uf2, &|_| ()))
            .unwrap();
        println!("written over PICOBOOT in {:?}", started.elapsed());
    }

    // Flashes a Pico in its bootloader the way the app does, printing the progress:
    // cargo test flash_plugged_in -- --ignored --nocapture
    #[test]
    #[ignore]
    fn flash_plugged_in() {
        let scan = tauri::async_runtime::block_on(migrate_scan()).unwrap();
        let chip = scan
            .bootsel
            .first()
            .expect("no Pico in its bootloader")
            .chip;
        let name = match chip {
            Chip::Rp2040 => "santroller_pico1.uf2",
            Chip::Rp2350 => "santroller_pico2.uf2",
        };
        let uf2 = std::fs::read(Path::new("../public").join(name)).unwrap();
        let started = Instant::now();
        let last = std::cell::Cell::new(-1);
        let result = flash(chip, &uf2, false, &|fraction| {
            let percent = (fraction * 100.0) as i32;
            if percent / 10 != last.get() / 10 {
                println!("{percent}% after {:?}", started.elapsed());
            }
            last.set(percent);
        })
        .unwrap();
        assert_eq!(last.get(), 100);
        println!("done after {:?}", started.elapsed());
        assert!(!matches!(result, FlashResult::NeedsMount { .. }));
    }
}
