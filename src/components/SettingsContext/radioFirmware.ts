// The radio firmware area (Xbox wireless adapter and CYW43 firmware), which the controller can have
// rewritten over OTA when ConfigInfo has radioFirmwareVersion. Its table of contents sits in the image's
// last 4096 byte sector, see Santroller/include/radio_firmware.h.
const TOC_SECTOR_SIZE = 4096;
const TOC_MAGIC = 0x57465253; // "SRFW"
const TOC_FORMAT = 1;

// The blobs older images carried (Xbox adapter and CYW43), matching content version 1
const LEGACY_CONTENT_VERSION = 1;

export const RADIO_FIRMWARE_FILE = 'santroller_radio.bin';

// The content version in an image, or null if it doesn't have a table of contents
export function radioFirmwareVersionOf(image: Uint8Array): number | null {
  if (image.length < TOC_SECTOR_SIZE) {
    return null;
  }
  const toc = new DataView(image.buffer, image.byteOffset + image.length - TOC_SECTOR_SIZE, 32);
  if (toc.getUint32(0, true) !== TOC_MAGIC || toc.getUint16(4, true) !== TOC_FORMAT) {
    return null;
  }
  if (toc.getUint32(12, true) !== image.length) {
    return null;
  }
  return toc.getUint32(8, true);
}

// What the controller should be offered, given what it reports and what this tool ships
export function radioFirmwareStatus(
  deviceVersion: number | null,
  bundledVersion: number | null,
  missing: boolean
): 'unsupported' | 'missing' | 'outdated' | 'current' {
  if (deviceVersion === null || bundledVersion === null) {
    return 'unsupported';
  }
  if (missing) {
    return 'missing';
  }
  // Areas from before versioning report 0, and hold what version 1 does
  const effective = Math.max(deviceVersion, LEGACY_CONTENT_VERSION);
  return effective < bundledVersion ? 'outdated' : 'current';
}

let bundled: Promise<Uint8Array | null> | undefined;

// The image this tool ships, fetched once. Null if it isn't there or has no table of contents
export function fetchBundledRadioFirmware(): Promise<Uint8Array | null> {
  bundled ??= fetch(`${RADIO_FIRMWARE_FILE}?v=${__CONFIGURATOR_COMMIT__}`)
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }
      const image = await response.bytes();
      return radioFirmwareVersionOf(image) === null ? null : image;
    })
    .catch((e) => {
      console.warn('Radio firmware image is unavailable', e);
      bundled = undefined;
      return null;
    });
  return bundled;
}
