// Where the firmware keeps its config, written by the firmware build (santroller_layout.json) next
// to each UF2, so UF2s with a config in them put it where that build reads it from
export interface FirmwareLayout {
  flashSize: number;
  configSize: number;
}

export type Uf2BuildErrorCode = 'layoutMissing' | 'configTooLarge';

export class Uf2BuildError extends Error {
  constructor(
    public code: Uf2BuildErrorCode,
    message: string
  ) {
    super(message);
  }
}

const FLASH_BASE = 0x10000000;
const FLASH_PAGE_SIZE = 256;

export function parseFirmwareLayout(data: unknown): FirmwareLayout {
  const layout = data as Partial<FirmwareLayout> | null;
  const valid = (n: unknown): n is number =>
    typeof n === 'number' && Number.isInteger(n) && n > 0 && n % FLASH_PAGE_SIZE === 0;
  if (!layout || !valid(layout.flashSize) || !valid(layout.configSize)) {
    throw new Uf2BuildError('layoutMissing', 'The firmware layout is missing or invalid');
  }
  if (layout.configSize > layout.flashSize) {
    throw new Uf2BuildError('layoutMissing', 'The firmware layout has a config bigger than flash');
  }
  return { flashSize: layout.flashSize, configSize: layout.configSize };
}

// The config (data + footer) is padded at the front to whole flash pages and ends at the end of
// flash, where the firmware reads the footer from
export function configFlashAddress(layout: FirmwareLayout, size: number): number {
  const padded = Math.ceil(size / FLASH_PAGE_SIZE) * FLASH_PAGE_SIZE;
  if (size > layout.configSize) {
    throw new Uf2BuildError(
      'configTooLarge',
      `The config is ${size} bytes, but the firmware only has room for ${layout.configSize}`
    );
  }
  return FLASH_BASE + layout.flashSize - padded;
}
