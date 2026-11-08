// The GetVersion report: the report id, the firmware's commit hash and its NUL, a zero byte, then
// the build number (little endian), which counts up with every firmware commit. Firmware from
// before build numbers stops after the zero byte, and firmware built without the git history
// reports 0, so neither has a build number.
export function parseVersionReport(report: DataView) {
  const bytes = new Uint8Array(report.buffer, report.byteOffset + 1, report.byteLength - 1);
  const end = bytes.indexOf(0);
  const version = String.fromCharCode(...bytes.subarray(0, end < 0 ? bytes.length : end))
    .trim()
    .substring(0, 8);
  let build: number | undefined;
  if (end >= 0 && bytes.length >= end + 6) {
    build =
      new DataView(bytes.buffer, bytes.byteOffset + end + 2, 4).getUint32(0, true) || undefined;
  }
  return { version, build };
}

// Whether the device has to be reflashed from a UF2 once before it can update over OTA again. This
// only goes by the installed build: anything the firmware reports about itself only arrives once the
// firmware reporting it is installed, which would take an OTA update first. Anything at MIN_OTA_BUILD
// or later got there through the UF2, so it has a current bootloader as well.
//
// Raise MIN_OTA_BUILD when an update needs something new from the firmware doing the update, or from
// a bootloader OTA updates can't replace:
// - 3439 fixed the slow generic_03h boot stage in pico_w_compat bootloaders (from 2850)
// - 3493 verifies the image's SHA-256 before installing it
// - 3521 ends the devices the update doesn't need first, as some setups hung partway through it
//
// Unnumbered builds (from before build numbers, or built without the git history) can't be placed
// against it, so they need the UF2 too.
const MIN_OTA_BUILD = 3521;

export function needsUf2BeforeOta(build: number | undefined) {
  return build === undefined || build < MIN_OTA_BUILD;
}
