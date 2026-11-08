import { proto } from '@/components/SettingsContext/config';

// The RP2350B (QFN80) has GP0 - GP47, everything else GP0 - GP29. The firmware reports which as
// ConfigInfo.gpioCount (useConfigStore's gpioCount). The tables below cover all 48, and PinBox leaves out the
// ones the connected chip doesn't have (see pinAvailable).
export const RP2350B_GPIO_COUNT = 48;
export const DEFAULT_GPIO_COUNT = 30;
const RP2350B_PINS = [...Array(RP2350B_GPIO_COUNT - DEFAULT_GPIO_COUNT).keys()].map(
  (i) => i + DEFAULT_GPIO_COUNT
);

// The ADC pins: GP26 - GP29, or GP40 - GP47 on an RP2350B (where GP26 - GP29 are digital only)
export const AnalogPins = [26, 27, 28, 29];
export const RP2350BAnalogPins = [40, 41, 42, 43, 44, 45, 46, 47];
export function analogPinsFor(gpioCount: number): number[] {
  return gpioCount > DEFAULT_GPIO_COUNT ? RP2350BAnalogPins : AnalogPins;
}
export function isAnalogPin(pin: number, gpioCount: number): boolean {
  return analogPinsFor(gpioCount).includes(pin);
}

// adc: only offered where the pin is an ADC pin on the chip. lastPin: the option uses the pins from pin to
// lastPin (eg a USB host's D+ and D-), which all have to exist.
export type PinOption = {
  label: string;
  channel?: string;
  pin: number;
  adc?: boolean;
  lastPin?: number;
};
// Whether a pin option exists on a chip with gpioCount GPIOs. ADC options are only ADC pins on that chip.
export function pinAvailable(option: PinOption, gpioCount: number): boolean {
  if (Math.max(option.pin, option.lastPin ?? option.pin) >= gpioCount) {
    return false;
  }
  return !option.adc || isAnalogPin(option.pin, gpioCount);
}

// The pins a board's CYW43 wireless chip is on, as the firmware picks them from the bluetooth device's wirelessPins
// (BluetoothDevice::wireless_pins). Custom pins left unset are -1.
export type WirelessChipPins = { on: number; data: number; cs: number; clock: number };
export const WirelessPinPresets: Record<number, WirelessChipPins> = {
  [proto.WirelessPins.WirelessPinsPicoW]: { on: 23, data: 24, cs: 25, clock: 29 },
  [proto.WirelessPins.WirelessPinsWaveshareRp2350bPlusW]: { on: 36, data: 37, cs: 38, clock: 39 },
};
export function wirelessChipPins(bt: proto.IBluetoothDevice): WirelessChipPins {
  const preset = WirelessPinPresets[bt.wirelessPins ?? proto.WirelessPins.WirelessPinsPicoW];
  return (
    preset ?? {
      on: bt.wlOnPin ?? -1,
      data: bt.wlDataPin ?? -1,
      cs: bt.wlCsPin ?? -1,
      clock: bt.wlClockPin ?? -1,
    }
  );
}

// The peripheral functions repeat every few pins, and carry on the same way up GP30 - GP47 (RP2350 datasheet,
// GPIO function select): I2C block (pin >> 1) & 1, SDA on even pins. SPI block (pin >> 3) & 1, by pin & 3
// RX (MISO), CSn, SCK, TX (MOSI). UART block ((pin + 4) >> 3) & 1, TX on pin % 4 == 0, RX on 1.
function addRp2350bPins<T extends Record<string, number[]>>(
  table: { 0: T; 1: T },
  pick: (pin: number) => [0 | 1, keyof T] | undefined
) {
  for (const pin of RP2350B_PINS) {
    const found = pick(pin);
    if (found) {
      table[found[0]][found[1]].push(pin);
    }
  }
  return table;
}
export const I2CPins = {
  0: {
    sda: [0, 4, 8, 12, 16, 20],
    scl: [1, 5, 9, 13, 17, 21],
  },
  1: {
    sda: [2, 6, 10, 14, 18, 22, 26],
    scl: [3, 7, 11, 15, 19, 23, 27],
  },
};
addRp2350bPins(I2CPins, (pin) => [((pin >> 1) & 1) as 0 | 1, pin % 2 ? 'scl' : 'sda']);
export const I2CGroups = Object.fromEntries(
  Object.entries(I2CPins).flatMap((group) =>
    group[1].sda.concat(group[1].scl).map((pin) => [pin, group[0]])
  )
);
export const SdaPins = Object.fromEntries(
  Object.entries(I2CPins).flatMap((group) =>
    group[1].sda.map((pin) => [pin, { label: 'i2c.sda.pin', channel: group[0], pin }])
  )
);
export const SclPins = Object.fromEntries(
  Object.entries(I2CPins).flatMap((group) =>
    group[1].scl.map((pin) => [pin, { label: 'i2c.scl.pin', channel: group[0], pin }])
  )
);
export const SPIPins = {
  0: {
    miso: [0, 4, 16, 20],
    csn: [1, 5, 17, 21],
    sck: [2, 6, 18, 22],
    mosi: [3, 7, 19, 23],
  },
  1: {
    miso: [8, 12, 28],
    csn: [9, 13],
    sck: [10, 14, 26],
    mosi: [11, 15, 27],
  },
};
addRp2350bPins(SPIPins, (pin) => [
  ((pin >> 3) & 1) as 0 | 1,
  (['miso', 'csn', 'sck', 'mosi'] as const)[pin & 3],
]);
export const MosiPins = Object.fromEntries(
  Object.entries(SPIPins).flatMap((group) =>
    group[1].mosi.map((pin) => [pin, { label: 'spi.mosi.pin', channel: group[0], pin }])
  )
);
export const MisoPins = Object.fromEntries(
  Object.entries(SPIPins).flatMap((group) =>
    group[1].miso.map((pin) => [pin, { label: 'spi.miso.pin', channel: group[0], pin }])
  )
);
export const SckPins = Object.fromEntries(
  Object.entries(SPIPins).flatMap((group) =>
    group[1].sck.map((pin) => [pin, { label: 'spi.sck.pin', channel: group[0], pin }])
  )
);
export const SPIGroups = Object.fromEntries(
  Object.entries(SPIPins).flatMap((group) =>
    group[1].miso
      .concat(group[1].csn)
      .concat(group[1].mosi)
      .concat(group[1].sck)
      .map((pin) => [pin, group[0]])
  )
);

export const UARTPins = {
  0: {
    tx: [0, 12, 16],
    rx: [1, 13, 17],
  },
  1: {
    tx: [4, 8, 20],
    rx: [5, 9, 21],
  },
};
addRp2350bPins(UARTPins, (pin) =>
  pin % 4 < 2 ? [(((pin + 4) >> 3) & 1) as 0 | 1, pin % 4 ? 'rx' : 'tx'] : undefined
);
export const UARTGroups = Object.fromEntries(
  Object.entries(UARTPins).flatMap((group) =>
    group[1].tx.concat(group[1].rx).map((pin) => [pin, group[0]])
  )
);
export const TxPins = Object.fromEntries(
  Object.entries(UARTPins).flatMap((group) =>
    group[1].tx.map((pin) => [pin, { label: 'uart.tx.pin', channel: group[0], pin }])
  )
);
export const RxPins = Object.fromEntries(
  Object.entries(UARTPins).flatMap((group) =>
    group[1].rx.map((pin) => [pin, { label: 'uart.rx.pin', channel: group[0], pin }])
  )
);
export const AllPins = [...Array(RP2350B_GPIO_COUNT).keys()];

export const AllPinsNamed = Object.fromEntries(AllPins.map((pin) => [pin, { label: 'pin', pin }]));
// The onboard LED is on GP25, and the firmware routes it to a Pico W's LED (which isn't on a pin) too
export const OnboardLedPin = 25;
export const LedPinsNamed = {
  ...AllPinsNamed,
  [OnboardLedPin]: { label: 'pin_onboard_led', pin: OnboardLedPin },
};
export const AnalogPinsNamed: { [pin: number]: PinOption } = Object.fromEntries(
  [...AnalogPins, ...RP2350BAnalogPins].map((pin) => [pin, { label: 'pin', pin, adc: true }])
);
