import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import {
  assignMidiDrumSlot,
  ensureDrumKitProfile,
  hasMidiPadMappings,
} from '../bhdrums/bhDrumSetup';
import { findDeviceStatus } from '../guideConfig';
import { gpPin, labelWithPin } from '../wiringText';

// The cable from the drum pads carries the kit's SPI bus. The Pico is the SPI master on SPI0:
// SCK GP2 (pin 4), MOSI / TX GP3 (pin 5), MISO / RX GP4 (pin 6), with chip select as a plain GPIO.
export const WT_SPI = { sck: 2, mosi: 3, miso: 4, block: 0 };
export const WT_CS_PIN = 5;

export interface WtConnectorPin {
  // The pad's label on the original brain's silkscreen
  label: string;
  // Rendered at display time so the "Pin" wording follows the current language, from the driver's
  // pins, which can be changed on the wiring step
  pico: (pins: WtPins) => string;
  type: string;
}

// In the order the original brain's connector lists them
export const WT_CONNECTOR: WtConnectorPin[] = [
  { label: 'CS', pico: (pins) => gpPin(pins.cs), type: 'typeCs' },
  { label: '+3V3', pico: () => labelWithPin('3V3(OUT)', 36), type: 'typePower' },
  { label: 'MOSI', pico: (pins) => gpPin(pins.mosi), type: 'typeMosi' },
  { label: '0V', pico: () => labelWithPin('GND', 38), type: 'typeGround' },
  { label: 'MISO', pico: (pins) => gpPin(pins.miso), type: 'typeMiso' },
  { label: 'CLK', pico: (pins) => gpPin(pins.sck), type: 'typeClock' },
];

export interface WtPins {
  sck: number;
  mosi: number;
  miso: number;
  cs: number;
}

// The driver's pins once it's added, or the ones it's added with
export function wtPins(device: proto.IWorldTourDrumDevice | null | undefined): WtPins {
  return {
    sck: device?.spi?.sck ?? WT_SPI.sck,
    mosi: device?.spi?.mosi ?? WT_SPI.mosi,
    miso: device?.spi?.miso ?? WT_SPI.miso,
    cs: device?.csPin ?? WT_CS_PIN,
  };
}

export function findWtDrum(state: ConfigState) {
  return findDeviceStatus(state, 'worldTourDrum');
}

export function isWtDrumConfigured(state: ConfigState) {
  return findWtDrum(state) !== undefined && hasMidiPadMappings(state);
}

/**
 * Adds the World Tour drum driver on SPI0 (SCK GP2, MOSI GP3, MISO GP4, CS GP5), gives the
 * profile a MIDI channel 10 slot for it, and loads the MIDI drum defaults. The profile is switched
 * to a Guitar Hero kit first unless it already emulates a drum kit.
 */
export function addWtDrumDriver() {
  ensureDrumKitProfile();
  let id = findWtDrum(useConfigStore.getState())?.id;
  if (id === undefined) {
    id = useConfigStore.getState().addDevice('worldTourDrum', undefined, (device) => {
      // Keeps the default 500 kHz clock
      device.worldTourDrum!.spi = { ...device.worldTourDrum!.spi, ...WT_SPI };
      device.worldTourDrum!.csPin = WT_CS_PIN;
    });
  }
  assignMidiDrumSlot(id);
}
