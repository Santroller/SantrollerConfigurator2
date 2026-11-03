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

// pico_w_compat builds booted with the slow generic_03h boot stage from when the board was added
// (build 2850) until 3439. The boot stage is in the bootloader, which OTA updates don't replace.
// Firmware from 3439 on reports slowBootStage itself, as an OTA update past it still leaves the old
// bootloader, but older firmware can't, so for those the build says it.
const SLOW_BOOT_STAGE_FIRST_BUILD = 2850;
const SLOW_BOOT_STAGE_FIXED_BUILD = 3439;

export function hasSlowBootStageBuild(type: string, build: number | undefined) {
  return (
    type === 'pico_w_compat' &&
    build !== undefined &&
    build >= SLOW_BOOT_STAGE_FIRST_BUILD &&
    build < SLOW_BOOT_STAGE_FIXED_BUILD
  );
}

// Build 3493 first enabled SHA256 verification. Check the installed build before uploading,
// as earlier firmware cannot report the capability. Unnumbered builds use the capability instead.
const FIRMWARE_VERIFICATION_FIRST_BUILD = 3493;

export function needsFirmwareVerificationUf2(
  build: number | undefined,
  verification?: boolean | null
) {
  return build === undefined
    ? verification !== true
    : build < FIRMWARE_VERIFICATION_FIRST_BUILD || verification === false;
}
