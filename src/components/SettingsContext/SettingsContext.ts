import { createContext, Context } from "react";
import { proto } from "./config.js";
export * from "./config.js"
export class DeviceStatus {
    constructor(id: string, type: string, device: proto.IDevice) {
        this.id = id
        this.type = type
        this.device = device
    }
    id: string;
    type: string;
    connected: boolean = false;
    device: proto.IDevice;
}
export class Config {
    constructor(config: proto.Config) {
        this.devices = Object.fromEntries(config.devices!.map((x, i) => [i, x]))
        this.deviceStatus = Object.fromEntries(config.devices!.map((x, i) => [i, new DeviceStatus(i.toString(10), Object.entries(x).find(x => x[1])![0], x)]))
        this.config = config

    }
    devices: { [id: string]: proto.IDevice }
    deviceStatus: { [id: string]: DeviceStatus }
    config: proto.IConfig
}
export type SettingsAction =
    | { type: "updateConfig", config: proto.IConfig }
    | { type: "updateDevice", device: proto.IDevice, id: string }
    | { type: "deleteDevice", id: string }

export const SettingsContext: Context<Config> = createContext(new Config(proto.Config.create()));
export const SettingsDispatchContext: Context<React.ActionDispatch<[SettingsAction]>> = createContext((_) => { });

export function configReducer(config: Config, action: SettingsAction) {
    // should probably handle writing to the device here too.
    switch (action.type) {
        case 'updateDevice': {
            return { ...config, devices: { ...config.devices, [action.id]: { ...action.device } } };
        }
        case 'updateConfig': {
            return { ...config, config: action.config };
        }
        case 'deleteDevice': {
            const newConfig = { ...config }
            delete newConfig.devices[action.id]
            return newConfig;
        }
    }
}

export const initialConfig = new Config(
    proto.Config.create({
        faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
        devices: [
            {
                wii: {
                    mappingMode: proto.MappingMode.PerInput,
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                bhDrum: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                mpu6050: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                worldTourDrum: {
                    spi: { mosi: 1, miso: 1, sck: 1, block: 0, clock: 100000 }
                }
            },
            {
                usbHost: {
                    dmFirst: false, firstPin: 0, enable5v: false,
                    mappingMode: proto.MappingMode.PerInput,
                }
            },
            {
                adxl: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                lis3dh: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                max1704x: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                mpr121: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }, touchpadCount: 5, enablePins: 0, ddrPins: 0
                }
            },
            {
                crazyGuitarNeck: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                gh5Neck: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                djhTurntable: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                midiSerial: {
                    uart: { tx: 1, rx: 1, block: 0, baudrate: 100000 }
                }
            },
            {
                multiplexer: {
                    s0Pin: 0,
                    s1Pin: 1,
                    s2Pin: 2,
                    s3Pin: 3,
                    inputPin: 4,
                    sixteenChannel: true
                }
            },
            {
                psx: {
                    spi: { mosi: 1, miso: 1, sck: 1, block: 0, clock: 100000 },
                    ackPin: 1,
                    attPin: 2,
                    mappingMode: proto.MappingMode.PerInput,
                }
            },
            {
                snes: {
                    clockPin: 0,
                    dataPin: 1,
                    latchPin: 2,
                    mappingMode: proto.MappingMode.PerInput,
                }
            },
            {
                joybus: {
                    dataPin: 1,
                    mappingMode: proto.MappingMode.PerInput,
                }
            },
            {
                wiiEmulation: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 }
                }
            },
            {
                psxEmulation: {
                    commandPin: 1,
                    attentionPin: 2,
                    acknowledgePin: 3,
                    dataPin: 4,
                    clockPin: 5
                }
            },
            {
                joybusEmulation: {
                    dataPin: 1
                }
            },
            {
                peripheral: {
                    i2c: { sda: 1, scl: 1, block: 0, clock: 100000 },
                    address: 0x45
                }
            },
        ]
    }))