import { proto } from '@/components/SettingsContext/config';
import { buildUf2FromConfig } from '@/components/SettingsContext/SettingsContext';
import { I2CGroups } from '@/devices/pico/pins';

// What a secondary Pico is flashed with: the I2C pins it listens on, and the pin that picks its
// address (0x75 left unconnected, 0x76 tied to GND)
export interface PeripheralBootPins {
  sda: number;
  scl: number;
  idPin: number;
  pico2: boolean;
}

export const DEFAULT_PERIPHERAL_BOOT: PeripheralBootPins = {
  sda: 0,
  scl: 1,
  idPin: 2,
  pico2: false,
};

/** Whether SDA and SCL are both on the same I2C block, which the secondary needs to listen at all */
export function peripheralBootValid({ sda, scl, idPin }: PeripheralBootPins): boolean {
  const sdaBlock = I2CGroups[sda];
  return (
    sdaBlock !== undefined &&
    sdaBlock === I2CGroups[scl] &&
    sda % 2 === 0 &&
    idPin !== sda &&
    idPin !== scl
  );
}

/** Downloads the UF2 that turns a Pico into a secondary Pico, set up from its boot pins */
export async function downloadPeripheralUf2(pins: PeripheralBootPins) {
  const config = proto.Config.create({
    peripheralBoot: {
      i2c: {
        block: parseInt(I2CGroups[pins.sda], 10),
        sda: pins.sda,
        scl: pins.scl,
        clock: 400000,
      },
      idPin: pins.idPin,
    },
  });
  const aux = proto.AuxConfigBlock.create({});
  const configBuf = proto.Config.encode(config).finish();
  const auxBuf = proto.AuxConfigBlock.encode(aux).finish();
  const buffer = new Uint8Array(configBuf.length + auxBuf.length);
  buffer.set(configBuf);
  buffer.set(auxBuf, configBuf.length);
  await buildUf2FromConfig(pins.pico2, {
    buffer,
    mainLen: configBuf.length,
    auxLen: auxBuf.length,
  });
}
