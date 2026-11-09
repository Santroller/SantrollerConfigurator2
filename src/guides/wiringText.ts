import i18next from 'i18next';

// Shared, translated fragments for the pin / wiring tables in the guides. Signal and pin
// identifiers (GP4, GND, 3V3(OUT), SDA, ...) are passed through untranslated.
export const WIRING = 'guides.common.wiring';
export const IMAGE_ALT = 'guides.common.imageAlt';

export type WireColour =
  | 'black'
  | 'blue'
  | 'brown'
  | 'cyan'
  | 'green'
  | 'grey'
  | 'orange'
  | 'pink'
  | 'red'
  | 'white'
  | 'yellow';

const tr = (key: string, options?: Record<string, unknown>) => i18next.t(key, options) as string;

/** "Blue" */
export const wireColour = (colour: WireColour) => tr(`${WIRING}.colours.${colour}`);

/** "Cyan / Blue" */
export const wireColours = (...colours: WireColour[]) => colours.map(wireColour).join(' / ');

/** "Pin 7" */
export const pinNum = (n: number | string) => tr(`${WIRING}.pin`, { n });

/** "Pin 40 (VBUS)" */
export const pinWithLabel = (n: number | string, label: string) =>
  tr(`${WIRING}.pinWithLabel`, { n, label });

/** "Pin 7 (Blue)" */
export const pinWithColour = (n: number | string, colour: WireColour) =>
  pinWithLabel(n, wireColour(colour));

/** "3V3(OUT) (Pin 36)" */
export const labelWithPin = (label: string, n: number | string | undefined) =>
  tr(`${WIRING}.labelWithPin`, { label, n });

/** "GP18 (Pin 24)" */
export const gpWithPin = (gp: number | string, n: number | string | undefined) =>
  labelWithPin(`GP${gp}`, n);

// Where each GP pin is on the Pico's 40-pin header, so a guide can show a pin that's been changed
export const PICO_PHYSICAL_PINS: Record<number, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 5,
  4: 6,
  5: 7,
  6: 9,
  7: 10,
  8: 11,
  9: 12,
  10: 14,
  11: 15,
  12: 16,
  13: 17,
  14: 19,
  15: 20,
  16: 21,
  17: 22,
  18: 24,
  19: 25,
  20: 26,
  21: 27,
  22: 29,
  26: 31,
  27: 32,
  28: 34,
};

/** "GP18 (Pin 24)", for any GP pin */
export const gpPin = (gp: number) => gpWithPin(gp, PICO_PHYSICAL_PINS[gp]);

/** "GP4 (Pin 6) + 1kΩ to 3V3" */
export const withPullup = (pin: string) => tr(`${WIRING}.pullup1k`, { pin });

/** "SDA (Data)" */
export const signalWithName = (signal: string, name: 'data' | 'clock') =>
  tr(`${WIRING}.signalWithName`, { signal, name: tr(`${WIRING}.names.${name}`) });

/** "Pico Pin 36 (3V3 OUT)" */
export const picoPinWithLabel = (n: number | string, label: string) =>
  tr(`${WIRING}.picoPinWithLabel`, { n, label });

/** "Pico GP Pin (e.g. GP4)" */
export const picoGpPinExample = (pin: string) => tr(`${WIRING}.picoGpPinExample`, { pin });

/** "Pico GP3 (USB host D-)" */
export const picoUsbHostPin = (pin: string, signal: string) =>
  tr(`${WIRING}.picoUsbHostPin`, { pin, signal });

/** "ADC1", for an analog pin on the Pico header (GP26 - GP28) */
export const adcChannel = (gp: number) => `ADC${gp - 26}`;
