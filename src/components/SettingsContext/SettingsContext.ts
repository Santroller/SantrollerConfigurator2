import {immerable} from "immer"
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { } from '@redux-devtools/extension'
import { proto } from "./config.js";
export * from "./config.js"
export class DeviceStatus {
    [immerable] = true
    constructor(id: string, type: string, device: proto.IDevice) {
        this.id = id
        this.type = type
        this.device = device
    }
    id: string;
    type: string;
    connected: boolean = false;
    device: proto.IDevice;
    static pins(status: DeviceStatus) {
        switch (status.type) {
            case "wii":
                return [
                    status.device.wii?.i2c.sda,
                    status.device.wii?.i2c.scl
                ]
            case "bhDrum":
                return [
                    status.device.bhDrum?.i2c.sda,
                    status.device.bhDrum?.i2c.scl
                ]
            case "mpu6050":
                return [
                    status.device.mpu6050?.i2c.sda,
                    status.device.mpu6050?.i2c.scl
                ]
            case "worldTourDrum":
                return [
                    status.device.worldTourDrum?.spi.mosi,
                    status.device.worldTourDrum?.spi.miso,
                    status.device.worldTourDrum?.spi.sck
                ]
            case "usbHost":
                return [
                    status.device.usbHost!.firstPin,
                    status.device.usbHost!.firstPin + 1,
                ]
            case "adxl":
                return [
                    status.device.adxl?.i2c.sda,
                    status.device.adxl?.i2c.scl
                ]
            case "lis3dh":
                return [
                    status.device.lis3dh?.i2c.sda,
                    status.device.lis3dh?.i2c.scl
                ]
            case "mpr121":
                return [
                    status.device.mpr121?.i2c.sda,
                    status.device.mpr121?.i2c.scl
                ]
            case "crazyGuitarNeck":
                return [
                    status.device.crazyGuitarNeck?.i2c.sda,
                    status.device.crazyGuitarNeck?.i2c.scl
                ]
            case "gh5Neck":
                return [
                    status.device.gh5Neck?.i2c.sda,
                    status.device.gh5Neck?.i2c.scl
                ]
            case "djhTurntable":
                return [
                    status.device.djhTurntable?.i2c.sda,
                    status.device.djhTurntable?.i2c.scl
                ]
            case "midiSerial":
                return [
                    status.device.midiSerial?.uart.tx,
                    status.device.midiSerial?.uart.rx
                ]
            case "multiplexer":
                return [
                    status.device.multiplexer?.s0Pin,
                    status.device.multiplexer?.s1Pin,
                    status.device.multiplexer?.s2Pin,
                    status.device.multiplexer?.s3Pin,
                    status.device.multiplexer?.inputPin,
                ]
            case "psx":
                return [
                    status.device.psx?.spi.mosi,
                    status.device.psx?.spi.miso,
                    status.device.psx?.spi.sck,
                    status.device.psx?.ackPin,
                    status.device.psx?.attPin
                ]
            case "snes":
                return [
                    status.device.snes?.clockPin,
                    status.device.snes?.latchPin,
                    status.device.snes?.latchPin
                ]
            case "joybus":
                return [
                    status.device.joybus?.dataPin
                ]
            case "wiiEmulation":
                return [
                    status.device.wiiEmulation?.i2c.sda,
                    status.device.wiiEmulation?.i2c.scl
                ]
            case "psxEmulation":
                return [
                    status.device.psxEmulation?.commandPin,
                    status.device.psxEmulation?.attentionPin,
                    status.device.psxEmulation?.acknowledgePin,
                    status.device.psxEmulation?.dataPin,
                    status.device.psxEmulation?.clockPin
                ]
            case "joybusEmulation":
                return [
                    status.device.joybusEmulation?.dataPin
                ]
            case "peripheral":
                return [
                    status.device.peripheral?.i2c.sda,
                    status.device.peripheral?.i2c.scl
                ]

        }
    }
}
export interface ConfigState {
    deviceStatus: { [id: string]: DeviceStatus }
    config: proto.IConfig
}
export interface Actions {
    updateDevice: (device: proto.IDevice, id: string) => void
    updateConfig: (config: proto.IConfig) => void
    deleteDevice: (id: string) => void
}

function InitState(config: proto.Config): ConfigState {
    const deviceStatus = Object.fromEntries(config.devices!.map((x, i) => [i, new DeviceStatus(i.toString(10), Object.entries(x).find(x => x[1])![0], x)]))
    return { deviceStatus, config };
}


export const initialConfig = InitState(
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
        ],
        profiles: [
            {
                deviceToEmulate: proto.SubType.GuitarHeroGuitar,
                name: "Guitar Hero Guitar",
                activationMethod: [],
                mappings: [
                    {
                        axis: {
                            axis: proto.AxisType.LeftStickX
                        },
                        input: {
                            gpio: {
                                pin: 27,
                                pinMode: proto.PinMode.Floating
                            }
                        }
                    },
                    {
                        button: {
                            button: proto.ButtonType.North,
                            inverted: false
                        },
                        input: {
                            gpio: {
                                pin: 2,
                                pinMode: proto.PinMode.Floating
                            }
                        }
                    },
                    {
                        button: {
                            button: proto.ButtonType.North,
                            inverted: false
                        },
                        input: {
                            digitalDevice: {
                                deviceid: 0,
                                button: proto.ButtonType.North
                            }
                        }
                    }
                ]
            }
        ]
    }))



export const useConfigStore = create<ConfigState & Actions>()(
    immer(devtools(
        (set) => ({
            ...initialConfig,
            updateDevice: (device: proto.IDevice, id: string) => set((config) => { config.deviceStatus[id].device = device }),
            updateConfig: (config: proto.IConfig) => set((state) => { state.config = {...state.config, ...config} }),
            deleteDevice: (id: string) => set((state) => {
                delete state.deviceStatus[id]
            })
        }),
        {
            name: 'config',
        },
    )),
)