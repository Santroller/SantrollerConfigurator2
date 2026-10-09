import React, { useMemo, useState } from 'react';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowRight,
  IconBatteryCharging,
  IconCheck,
  IconCpu,
  IconDeviceGamepad,
  IconDeviceGamepad2,
  IconDevices,
  IconFlame,
  IconInfoCircle,
  IconLamp,
  IconPlug,
  IconSearch,
  IconTopologyStarRing3,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';

export type HardwareCategory =
  | 'all'
  | 'mcu'
  | 'usb_host'
  | 'peripherals'
  | 'sensors'
  | 'expansion'
  | 'lighting'
  | 'bus'
  | 'power';

interface HardwareItem {
  id: string;
  name: string;
  category: HardwareCategory;
  interfaceType: string;
  badge: string;
  badgeColor: string;
  description: string;
  details: string[];
  guideLink?: string;
  guideLabel?: string;
}

const HARDWARE_CATALOG: HardwareItem[] = [
  // --- Microcontrollers ---
  {
    id: 'pico_rp2040',
    name: 'Raspberry Pi Pico (RP2040)',
    category: 'mcu',
    interfaceType: 'Native Microcontroller',
    badge: 'Primary Recommended',
    badgeColor: 'teal',
    description:
      'The standard dual-core RP2040 development board. Delivers sub-millisecond input polling, 26 exposed GPIOs, and full USB HID emulation.',
    details: [
      'Dual ARM Cortex-M0+ cores @ 133 MHz (overclockable)',
      'Sub-millisecond USB polling rate (up to 1000 Hz / 1 ms)',
      '3 high-speed ADC pins for whammy, analog sticks, or piezo sensors',
      'Programmable I/O (PIO) used for software USB host and console bus emulation',
    ],
    guideLink: '/guides/direct-pico-guitar',
    guideLabel: 'Direct Pico Build Guide',
  },
  {
    id: 'pico2_rp2350',
    name: 'Raspberry Pi Pico 2 (RP2350)',
    category: 'mcu',
    interfaceType: 'Native Microcontroller',
    badge: 'Next-Gen Supported',
    badgeColor: 'blue',
    description:
      'The newer dual-core ARM Cortex-M33 / Hazard3 RISC-V board with enhanced clock speeds, more memory, and faster PIO performance.',
    details: [
      'Dual Cortex-M33 @ 150 MHz with hardware floating point',
      'Increased SRAM (520 KB) and upgraded PIO engines',
      'Drop-in pin-compatible with Raspberry Pi Pico 1',
      'Supported with native Santroller Pico 2 firmware builds',
    ],
  },
  {
    id: 'pico_w_wireless',
    name: 'Raspberry Pi Pico W / Pico 2 W',
    category: 'mcu',
    interfaceType: 'Wireless Bluetooth + USB',
    badge: 'Wireless Supported',
    badgeColor: 'violet',
    description:
      'Equipped with an authentic Infineon CYW43439 wireless chip for Bluetooth Classic and BLE. Can emulate a complete Nintendo Wii Remote natively!',
    details: [
      'Full Wii Remote Bluetooth Emulation: Connects directly to Nintendo Wii / Wii U for Guitar Hero, Band Hero, and DJ Hero with real game discs and zero console mods',
      'Can be configured as a low-latency Bluetooth Transmitter inside wireless guitars',
      'Can be paired with a second Pico acting as a console receiver',
      'Supports battery power via VSYS with reverse-protection Schottky diode',
      'WARNING: Beware of cheap AliExpress clone boards that use an ESP8285 / ESP8266 chip instead of the CYW43439! The ESP8285/8266 is Wi-Fi ONLY, lacks Bluetooth hardware entirely, and will NEVER work with Santroller Bluetooth.',
      'Only purchase genuine Raspberry Pi Pico W / Pico 2 W boards with the official silver metal RF shield marked "Raspberry Pi".',
    ],
  },
  {
    id: 'rp2040_derivatives',
    name: 'Waveshare RP2040-Zero / One / Plus',
    category: 'mcu',
    interfaceType: 'Compact Microcontroller',
    badge: 'Compact Form Factor',
    badgeColor: 'cyan',
    description:
      'Compact RP2040 boards suitable for tight guitar bodies, neck boards, or compact adapter enclosures.',
    details: [
      'RP2040-Zero: Miniature board with Type-C USB and castellation pins',
      'Includes onboard RGB LED (WS2812B) on pin GP16 on Zero models',
      'Fully compatible with Pico 1 Santroller firmware',
    ],
  },
  {
    id: 'mcu_legacy_promicro',
    name: 'SparkFun Pro Micro (ATmega32U4)',
    category: 'mcu',
    interfaceType: 'Legacy Microcontroller (S1)',
    badge: 'Legacy Firmware (S1)',
    badgeColor: 'orange',
    description:
      'Supported by legacy Santroller 1 firmware (v10.1.188). Uses the 8-bit AVR ATmega32U4 with native USB client.',
    details: [
      'Available in 5V (16 MHz) and 3.3V (8 MHz) variants',
      'Supported on older Santroller v10 releases for basic directly-wired guitars',
      'Lacks USB Host, Bluetooth, and advanced multi-bus capabilities of the RP2040/RP2350',
      'Rescue procedure: Short RST to GND twice within 0.5s to enter bootloader',
      'New builds should use the Raspberry Pi Pico 1 or 2 instead',
      'Older firmware can be quite buggy and if things are not working they wont be fixed'
    ],
  },
  {
    id: 'mcu_legacy_uno_mega',
    name: 'Arduino Uno R3 & Mega 2560 (ATmega16U2)',
    category: 'mcu',
    interfaceType: 'Legacy Microcontroller (S1)',
    badge: 'Legacy Firmware (S1)',
    badgeColor: 'orange',
    description:
      'Supported by legacy Santroller 1 firmware (v10.1.188) via DFU flashing on boards with authentic ATmega16U2 USB co-processors.',
    details: [
      'Requires authentic 16U2 co-processor (CH340/FTDI clones are NOT supported)',
      'Legacy dual-MCU architecture (co-processor handles USB while main MCU reads pins)',
      'Rescue procedure: Short the 2x3 ICSP header pins near the USB port to enter DFU mode',
      'New builds should use the Raspberry Pi Pico 1 or 2 instead',
      'Older firmware can be quite buggy and if things are not working they wont be fixed'
    ],
  },

  // --- USB Host: Bluetooth Adapters ---
  {
    id: 'bt_csr8510',
    name: 'CSR8510 A10 Bluetooth USB Dongle',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Plug-and-Play',
    badgeColor: 'teal',
    description:
      'Standard Bluetooth 4.0 USB dongle with complete mask ROM firmware. Works out-of-the-box on Santroller USB Host without any firmware uploads, enabling Wii Remote emulation on standard Picos.',
    details: [
      'Enables full Wii Remote Bluetooth Emulation on standard (non-W) Raspberry Pi Pico boards for native Wii Guitar Hero / DJ Hero support',
      'Fully ROM-based HCI H2 transport (no external firmware patch needed)',
      'Connects wireless PS3, PS4, and generic Bluetooth controllers/instruments',
      'Widely available and very low cost under brands like TP-Link, ORICO, and generic CSR',
    ],
  },
  {
    id: 'bt_broadcom_bcm',
    name: 'Broadcom BCM20702 / BCM20703 Dongles',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'ROM HCI Supported',
    badgeColor: 'indigo',
    description:
      'Broadcom Bluetooth USB adapters are supported in native HCI mode without requiring runtime firmware patching for Bluetooth Classic, enabling wireless controller pairing and Wii Remote emulation.',
    details: [
      'Santroller initializes the BCM internal mask ROM directly over USB',
      'Enables wireless Wii Remote Bluetooth emulation and wireless gamepad connectivity on USB Host',
      'Useful for existing Broadcom USB dongles without needing Linux-style .hcd loading',
    ],
  },

  // --- USB Host: PlayStation ---
  {
    id: 'usb_ps_controllers',
    name: 'PlayStation DualShock 3 / 4 & DualSense',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Native USB Host',
    badgeColor: 'blue',
    description:
      'Plug official DualShock 3, DualShock 4, or DualSense (PS5) controllers into your Santroller USB Host port for direct gaming or authentication.',
    details: [
      'Automatic descriptor parsing for all standard buttons, analog sticks, and triggers',
      'DualShock 4 serves as an authentic security controller for PS4 console passthrough',
      'Supports wired USB and wireless pairing via supported Bluetooth dongles',
    ],
  },
  {
    id: 'usb_ps3_instruments',
    name: 'PlayStation 3 Wireless Instruments & Dongles',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Native Rhythm Dongles',
    badgeColor: 'teal',
    description:
      'Connect original PS3 Guitar Hero and Rock Band wireless USB dongles directly into the Santroller USB host port.',
    details: [
      'PS3 Guitar Hero Guitars (Kramer, Les Paul, World Tour, GH5 dongles)',
      'PS3 Guitar Hero Drums & Rock Band Wireless Drums',
      'PS3 Rock Band Wireless Guitars (Fender Stratocaster dongles)',
      'PS3 DJ Hero Wireless Turntables & Wii U / PS3 Guitar Hero Live dongles',
    ],
  },
  {
    id: 'usb_riffmaster',
    name: 'PDP Riffmaster (PS4 / PS5 / Xbox One)',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Modern Rhythm Controller',
    badgeColor: 'teal',
    description:
      'The modern wireless guitar controller by PDP is natively recognized via its USB wireless dongle.',
    details: [
      'Supports PS4/PS5 wireless dongle version',
      'Supports Xbox One wireless dongle version',
      'Full fret detection, strum bar, whammy bar, and tilt sensors',
    ],
  },

  // --- USB Host: Xbox ---
  {
    id: 'usb_x360_wired',
    name: 'Xbox 360 Wired Controllers & Instruments',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'XInput Native',
    badgeColor: 'green',
    description:
      'Direct USB support for all standard wired Xbox 360 controllers and official rhythm instruments.',
    details: [
      'Xbox 360 X-Plorer wired guitar (Guitar Hero 2)',
      'Xbox 360 wired Rock Band Stratocaster and drums',
      'Xbox 360 Big Button Scene It? wireless sensor and controllers',
      'All standard official and third-party wired Xbox 360 gamepads',
    ],
  },
  {
    id: 'usb_x360_wireless_receiver',
    name: 'Xbox 360 Wireless Gaming Receiver',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Multi-Device Wireless',
    badgeColor: 'green',
    description:
      'Connect an official or third-party Xbox 360 Wireless Gaming Receiver to connect up to 4 wireless Xbox 360 controllers or instruments.',
    details: [
      'Compatible with wireless Les Paul, GHWT Sunburst, GH5 guitars, and wireless drums',
      'Supports official Microsoft PC receivers and clone/generic receiver dongles',
      'Automatic device negotiation and wireless sync handling',
    ],
  },
  {
    id: 'usb_xone_series',
    name: 'Xbox One / Series Controllers & Dongles',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Xbox One Native',
    badgeColor: 'green',
    description:
      'Wired Xbox One and Xbox Series X|S controllers are supported for input, and official or most third-party Xbox One gamepads can provide security authentication for Xbox One/Series consoles.',
    details: [
      'Official and most third-party wired Xbox One / Series gamepads',
      'Xbox One Guitar Hero Live wireless dongle',
      'Passthrough authentication host for playing on Xbox One and Xbox Series X|S',
    ],
  },
  {
    id: 'usb_xone_wireless_adapter',
    name: 'Xbox One Wireless PC Adapter (MediaTek MT76x2U)',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Proprietary Wireless',
    badgeColor: 'green',
    description:
      'Santroller integrates a native driver for the official Microsoft Xbox One Wireless PC Adapter dongle, allowing wireless Xbox One / Series gamepads and instruments to connect over USB Host.',
    details: [
      'Built-in MT76x2U Wi-Fi Direct driver and firmware loader',
      'Connects wireless Xbox One, Xbox Series, and wireless GIP guitar/drum peripherals',
      'Supports hardware pairing button and wireless status negotiation',
      'Enables true wireless Xbox controller play without external PC drivers',
    ],
  },

  // --- USB Host: Nintendo ---
  {
    id: 'usb_nintendo_devices',
    name: 'Nintendo Switch Pro & Wii USB Dongles',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Nintendo Native',
    badgeColor: 'red',
    description:
      'Connect Nintendo controllers and legacy Wii USB instruments through the USB host port.',
    details: [
      'Nintendo Switch Pro Controller (wired USB mode)',
      'Wii Rock Band 1/2/3 Wireless Guitar and Drum USB dongles',
      'Raphnet Classic Controller to USB adapters',
    ],
  },

  // --- Rhythm & Dance Pads ---
  {
    id: 'rhythm_dance_pads',
    name: 'Dance Pads (L-TEK & StepManiaX)',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Rhythm Specialty',
    badgeColor: 'orange',
    description:
      'Plug dedicated arcade and home dance pads into Santroller for console conversion or custom profiles.',
    details: [
      'L-TEK Dance Pad & L-TEK Pro Dance Pad',
      'StepManiaX Dance Stage controller',
      'Zero-lag polling and debounced switch handling',
    ],
  },
  {
    id: 'rhythm_bemanistyle',
    name: 'BEMANI Arcade & Mini Controllers',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Arcade Rhythm',
    badgeColor: 'orange',
    description:
      'Dedicated support for Japanese arcade rhythm game controller layouts and converters.',
    details: [
      'Pop’n Music mini and arcade controllers',
      'Beatmania IIDX turntable and key controllers',
      'GuitarFreaks / DrumMania USB controllers',
      'PDLoader and Spice2x arcade I/O devices',
    ],
  },
  {
    id: 'usb_streamdeck',
    name: 'Elgato Stream Deck & Stream Deck Pedals',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Macro & Pedals',
    badgeColor: 'grape',
    description:
      'Use Stream Deck Pedals as custom foot switches (Star Power, bass pedals, or macros) connected directly over USB.',
    details: [
      'Stream Deck Pedal 3-button foot switch support',
      'Ideal for activating Star Power / Overdrive hands-free',
      'Can be mapped to any digital gamepad or instrument action',
    ],
  },

  // --- USB Host: Generic & Keyboards ---
  {
    id: 'usb_generic_hid',
    name: 'Generic USB HID Gamepads, Keyboards & Mice',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Universal Mapping',
    badgeColor: 'gray',
    description:
      'Universal USB Host support allowing you to map any generic gamepad, keyboard, or mouse to your Santroller profile.',
    details: [
      'USB Keyboards: Full NKRO and 6KRO support with custom key-to-button bindings',
      'USB Mice: Bind mouse axes and mouse buttons to analog sticks or inputs',
      'Generic HID Gamepads: Map the first 16 buttons and main axes to any guitar or console function',
    ],
  },

  // --- USB Authentication Dongles ---
  {
    id: 'auth_security_dongles',
    name: 'Authentication Dongles (Mayflash & Besavior)',
    category: 'usb_host',
    interfaceType: 'USB Host Port',
    badge: 'Auth Passthrough',
    badgeColor: 'dark',
    description:
      'Plug security dongles into the USB Host port to satisfy console security handshakes without dedicating a full controller.',
    details: [
      'Mayflash Magicboots PS4 & Mayflash MAGPS4 for PlayStation 4',
      'Besavior P5General for PlayStation 5 native gaming',
      'Official or most third-party wired Xbox One / Series gamepads for Xbox consoles',
      'Santroller passes authentication challenges transparently without interrupting play',
    ],
    guideLink: '/compatibility',
    guideLabel: 'Read Authentication Guide',
  },
  {
    id: 'auth_xone_harvested',
    name: 'Xbox One Security Auth Chip (Harvested)',
    category: 'bus',
    interfaceType: 'I2C Bus (SDA / SCL + Reset)',
    badge: 'Hardware Auth Chip',
    badgeColor: 'green',
    description:
      'Harvest the security authentication chip from an Xbox One controller PCB and wire it directly to the Pico via I2C for completely internal, dongle-free Xbox One/Series authentication.',
    details: [
      'Direct I2C bus wiring (SDA, SCL, 3.3V, GND, and optional reset pin)',
      'Configured as an Xbox One Auth device in the Configurator',
      'Eliminates the need to plug an external controller into a USB host port',
      'Satisfies continuous Xbox One and Series X|S console security handshakes natively',
    ],
    guideLink: '/compatibility',
    guideLabel: 'Read Authentication Guide',
  },

  // --- Direct Inputs & Sensors ---
  {
    id: 'switches_mechanical',
    name: 'Mechanical & Arcade Switches',
    category: 'sensors',
    interfaceType: 'Digital GPIO Pins',
    badge: 'Direct Wiring',
    badgeColor: 'teal',
    description:
      'Wire mechanical switches directly to the Pico pins with hardware debouncing in firmware.',
    details: [
      'Compatible with Cherry MX, Kailh Box, Gateron, and Kailh Low-Profile Choc switches',
      'Original guitar fret silicon membranes and strum microswitches',
      'Internal pull-up resistors enabled automatically (wire switch between GPIO and GND)',
      'Configurable debouncing algorithm to eliminate double-strums and ghost notes',
    ],
    guideLink: '/guides/direct-pico-guitar',
    guideLabel: 'Guitar Wiring Guide',
  },
  {
    id: 'analog_whammy_joystick',
    name: 'Potentiometers, Hall Sensors & Joysticks',
    category: 'sensors',
    interfaceType: 'Analog ADC Pins (GP26-GP28)',
    badge: 'Analog ADC',
    badgeColor: 'blue',
    description:
      'Connect analog potentiometers or contactless Hall-effect sensors to measure whammy bar angle or joystick position.',
    details: [
      '10k Ohm linear potentiometers for whammy bars',
      'Hall-effect magnetic angle sensors for wear-free contactless whammy',
      '2-axis analog thumbstick modules with integrated push button',
      'Piezoelectric transducers with conditioning circuit for electronic drum pads',
    ],
  },
  {
    id: 'sensors_tilt_imu',
    name: 'Tilt Sensors & Digital Accelerometers',
    category: 'sensors',
    interfaceType: 'Digital GPIO or I2C Bus',
    badge: 'Star Power Activation',
    badgeColor: 'violet',
    description: 'Trigger Star Power / Overdrive naturally by tilting the neck of your guitar up.',
    details: [
      'Mechanical ball-roll / mercury tilt switches wired to digital GPIO',
      'Digital I2C Accelerometers / IMUs (MPU6050, ADXL345) for smooth gesture detection',
      'Configurable angle threshold and tilt sensitivity in the Configurator',
    ],
  },

  // --- Lighting & Feedback ---
  {
    id: 'led_addressable_rgb',
    name: 'Addressable RGB LEDs (WS2812B / Neopixels)',
    category: 'lighting',
    interfaceType: 'Single GPIO Pin (via PIO)',
    badge: 'Addressable RGB',
    badgeColor: 'pink',
    description:
      'High-speed addressable LED strip and individual LED support driven seamlessly by RP2040 PIO.',
    details: [
      'Supports WS2812B, SK6812 (RGBW), and WS2813 LED strips',
      'Under-fret lighting: Frets light up with their respective note colors when pressed',
      'Reactive strum lighting and Star Power / Overdrive full-body illumination',
      'Player number indicators and idle animation patterns',
    ],
  },
  // --- Dedicated Instrument Necks, Drums & Faders ---
  {
    id: 'periph_gh5_neck',
    name: 'Guitar Hero 5 / Band Hero Detachable Neck',
    category: 'peripherals',
    interfaceType: 'I2C Bus (150 kHz)',
    badge: 'I2C Neck',
    badgeColor: 'red',
    description:
      'Native digital support for the GH5 / Band Hero neck board. Communicates directly over the original 4-pin neck connector without modifying the neck PCB.',
    details: [
      'Reads 5 frets and the touch-sensitive solo slider strip digitally over I2C',
      'Uses original spring-pin contacts (VCC, GND, SDA, SCL)',
      'Preserves detachable neck functionality on Guitar Hero 5 and Band Hero guitars',
    ],
  },
  {
    id: 'periph_crkd_neck',
    name: 'CRKD Nitro Deck / Guitar Neck Board',
    category: 'peripherals',
    interfaceType: 'UART Bus (460,800 Baud)',
    badge: 'High-Speed UART',
    badgeColor: 'teal',
    description:
      'Serial protocol support for CRKD guitar necks powered by the PY32F002B ARM microcontroller.',
    details: [
      'High-speed 460.8 kbps serial stream with CRC-8 Maxim/Dow integrity verification',
      'Transmits 5 frets, solo tap frets, and neck D-pad axes in a compact frame',
      'Supports CRKD neck WS2812 addressable LED pass-through',
    ],
  },
  {
    id: 'periph_protar_neck',
    name: 'Mad Catz Rock Band 3 Pro Guitar Neck',
    category: 'peripherals',
    interfaceType: 'SPI Bus (100 kHz, Mode 1)',
    badge: 'Pro Guitar SPI',
    badgeColor: 'blue',
    description:
      'Custom SPI communication driver for the 102-button Rock Band 3 Mustang and Squier Pro Guitar necks.',
    details: [
      'Scans all 17 frets across all 6 strings (102 discrete fret switches)',
      'Reads frets, fretboard solo flags, and navigation buttons',
      'Connects via MOSI, MISO, SCK, and Attention / Chip Select pins',
    ],
  },
  {
    id: 'periph_crazy_guitar',
    name: 'Crazy Guitar / RedOctane Custom Neck',
    category: 'peripherals',
    interfaceType: 'I2C Bus (100 kHz)',
    badge: 'I2C Neck',
    badgeColor: 'grape',
    description:
      'Direct protocol support for Crazy Guitar neck boards communicating over standard 2-wire I2C.',
    details: [
      '5-fret digital decoding directly from neck microprocessor',
      'Compatible with 3.3V and 5V signaling topologies',
    ],
  },
  {
    id: 'periph_wt_drum',
    name: 'Guitar Hero World Tour Drum Module',
    category: 'peripherals',
    interfaceType: 'SPI Bus (500 kHz)',
    badge: 'Drum SPI',
    badgeColor: 'orange',
    description:
      'Interfacing driver for the internal SPI microprocessor on Guitar Hero World Tour drum kits.',
    details: [
      'Reads velocity and hit triggers from 3 drum pads, 2 cymbals, and bass kick pedal',
      'Wires to SPI bus with dedicated Chip Select line',
    ],
  },
  {
    id: 'periph_bh_drum',
    name: 'Band Hero / Guitar Hero 5 Drum Module',
    category: 'peripherals',
    interfaceType: 'I2C Bus (100 kHz)',
    badge: 'Drum I2C',
    badgeColor: 'orange',
    description:
      'I2C protocol communication for Band Hero and GH5 drum brain electronics.',
    details: [
      'Decodes dynamic velocity data from drum pads and cymbals over I2C',
      'Allows reusing stock Band Hero drum hardware without replacing piezo sensors',
    ],
  },
  {
    id: 'periph_crkd_drum',
    name: 'CRKD Electronic Drum Interface',
    category: 'peripherals',
    interfaceType: 'UART Bus',
    badge: 'Serial Drum',
    badgeColor: 'teal',
    description:
      'High-speed UART communication for CRKD drum kit modules with digital trigger reporting.',
    details: [
      'Direct hardware serial connection for drum hit reporting',
      'Low-latency drum pad, cymbal, and kick pedal event stream',
    ],
  },
  {
    id: 'periph_djh_turntable',
    name: 'DJ Hero Turntable Platter Sub-Module',
    category: 'peripherals',
    interfaceType: 'I2C Bus (150 kHz)',
    badge: 'Turntable I2C',
    badgeColor: 'violet',
    description:
      'Direct I2C protocol reader for the detachable turntable platter mechanism from DJ Hero controllers.',
    details: [
      'Reads optical quadrature wheel ticks, 3 stream buttons (Green/Red/Blue), and 360° rotation',
      'Configurable left-hand or right-hand platter orientation and 5 ms polling interval',
    ],
  },
  {
    id: 'periph_infinium_fader',
    name: 'Infinium Optical Contactless Crossfader',
    category: 'peripherals',
    interfaceType: 'UART Serial (31,250 Baud)',
    badge: 'Optical Fader',
    badgeColor: 'cyan',
    description:
      'Ultra-precise optical crossfader interface used in professional DJ mixers and custom scratch builds.',
    details: [
      'Wear-free contactless optical sensor tracking with infinite lifespan',
      'Serial data stream polled at zero latency for razor-sharp crossfader cuts',
    ],
  },
  {
    id: 'periph_vtech_guitar',
    name: 'VTech KidiStar Guitar I/O Expander',
    category: 'peripherals',
    interfaceType: 'SPI Bus with Attention',
    badge: 'Custom Expander',
    badgeColor: 'yellow',
    description:
      'Specialized SPI expander protocol for converting toy and rhythm instruments into full-featured Santroller controllers.',
    details: [
      'Dedicated SPI driver with interrupt/attention signaling',
      'Decodes matrixed buttons and fret switches into individual game actions',
    ],
  },
  {
    id: 'periph_secondary_pico',
    name: 'Secondary Pi Pico (I2C Coprocessor)',
    category: 'peripherals',
    interfaceType: 'I2C Bus (400 kHz, Addr 0x75)',
    badge: 'Pico Coprocessor',
    badgeColor: 'teal',
    description:
      'Put a second Raspberry Pi Pico in your guitar neck to scan frets and sensors with zero latency, sharing data over I2C with the main Pico.',
    details: [
      'Secondary Pico runs Santroller Peripheral firmware in the neck or secondary enclosure',
      'Allows ultra-clean 4-wire neck quick-disconnects (VCC, GND, SDA, SCL)',
      'Offloads GPIO button scanning, matrix routing, or LEDs across a high-speed bus',
    ],
    guideLink: '/guides/direct-pico-guitar',
    guideLabel: 'Read Guitar Guide',
  },

  // --- Input Expansion & Analog ICs ---
  {
    id: 'exp_mpr121',
    name: 'MPR121 Capacitive Touch & Slider Sensor',
    category: 'expansion',
    interfaceType: 'I2C Bus (400 kHz)',
    badge: 'Touch Controller',
    badgeColor: 'pink',
    description:
      '12-channel capacitive touch sensor. The gold-standard solution for rewiring the Guitar Hero World Tour touch slider bar.',
    details: [
      '12 independent capacitive electrode channels with auto-calibration',
      'Channels 0-4 map to the 5 touch slider segments; remaining channels can poll frets',
      'Drastically reduces latency and improves reliability over the stock WT slider circuit',
    ],
    guideLink: '/guides/direct-pico-guitar',
    guideLabel: 'World Tour Slider Guide',
  },
  {
    id: 'exp_multiplexer',
    name: 'Analog / Digital Multiplexers (CD4051 & CD4067)',
    category: 'expansion',
    interfaceType: 'GPIO Address Pins (S0-S3 + Signal)',
    badge: 'Pin Expander',
    badgeColor: 'indigo',
    description:
      'Expand a single GPIO or ADC pin into 8 or 16 inputs using affordable CD74HC4051 (8-ch) or CD74HC4067 (16-ch) multiplexers.',
    details: [
      'CD4051: 8 channels controlled with 3 address pins (S0-S2) and 1 input line',
      'CD4067: 16 channels controlled with 4 address pins (S0-S3) and 1 input line',
      'Compatible with analog inputs (potentiometers/whammy) and digital buttons',
      'Built-in configurable scanning loop in Santroller firmware',
    ],
  },
  {
    id: 'exp_matrix_switch_network',
    name: 'Key Matrix & Switch Networks (Dioded)',
    category: 'expansion',
    interfaceType: 'Row / Column Digital GPIOs',
    badge: 'Key Matrix',
    badgeColor: 'blue',
    description:
      'Scan dozens of buttons and mechanical switches using minimal pins via row-and-column matrix scanning or resister networks.',
    details: [
      'Up to 32-pin matrix configurations with anti-ghosting diode support',
      'Switch Network driver for decoded button networks',
      'Ideal for arcade panels, dance stages, and full keyboard layouts',
    ],
  },
  {
    id: 'exp_ads1115',
    name: 'ADS1115 16-Bit Precision ADC',
    category: 'expansion',
    interfaceType: 'I2C Bus (400 kHz + Alert)',
    badge: '16-Bit ADC',
    badgeColor: 'cyan',
    description:
      'Ultra-high precision 16-bit analog-to-digital converter for studio-grade analog whammy, analog stick, and piezo velocity tracking.',
    details: [
      '4 single-ended or 2 differential high-precision analog channels',
      'Programmable gain amplifier and hardware interrupt line',
      'Provides far superior noise rejection and resolution compared to standard 10/12-bit ADCs',
    ],
  },
  {
    id: 'exp_rotary_encoder',
    name: 'Hardware Quadrature Rotary Encoders',
    category: 'expansion',
    interfaceType: 'Dual GPIO Pins (A / B Channels)',
    badge: 'Optical / Mechanical',
    badgeColor: 'teal',
    description:
      'High-speed optical and mechanical rotary encoder decoding for DJ Hero platters, volume dials, and spinner wheels.',
    details: [
      'Hardware interrupt and PIO edge tracking prevents dropped ticks at high spin speeds',
      'Sub-tick direction discrimination and configurable sensitivity multiplier',
    ],
  },

  // --- Lighting & Feedback Controllers ---
  {
    id: 'led_addressable_rgb',
    name: 'Addressable RGB LEDs (WS2812B / Neopixels)',
    category: 'lighting',
    interfaceType: 'Single GPIO Pin (via PIO)',
    badge: 'Addressable RGB',
    badgeColor: 'pink',
    description:
      'High-speed addressable LED strip and individual LED support driven seamlessly by RP2040 PIO.',
    details: [
      'Supports WS2812B, SK6812 (RGBW), and WS2813 LED strips',
      'Under-fret lighting: Frets light up with their respective note colors when pressed',
      'Reactive strum lighting and Star Power / Overdrive full-body illumination',
      'Player number indicators and idle animation patterns',
    ],
  },
  {
    id: 'led_apa102',
    name: 'APA102 / DotStar High-Speed SPI LEDs',
    category: 'lighting',
    interfaceType: 'SPI Bus (12 MHz, Data + Clock)',
    badge: 'High-Speed SPI LED',
    badgeColor: 'pink',
    description:
      'Two-wire SPI addressable LEDs capable of multi-megahertz refresh rates without timing jitter.',
    details: [
      'Hardware SPI driven up to 12 MHz for flicker-free persistence-of-vision effects',
      'Separate Data (MOSI) and Clock (SCK) lines prevent color timing glitches',
      'RGB and BGR byte order configurations',
    ],
  },
  {
    id: 'led_stp16cpc',
    name: 'STP16CPC26 Constant-Current LED Driver',
    category: 'lighting',
    interfaceType: 'SPI Bus (Latch + Output Enable)',
    badge: 'Constant Current',
    badgeColor: 'yellow',
    description:
      '16-channel constant-current LED sink driver for lighting original guitar LEDs, button backlights, or arcade lamps.',
    details: [
      '16 constant-current sink outputs with single-resistor global current setting',
      'Controlled via SPI (MOSI, SCK, LE Latch, OE Output Enable)',
      'Eliminates per-LED resistors; ideal for custom PCB faceplates and illuminated frets',
    ],
  },
  {
    id: 'led_dmx512',
    name: 'DMX512 Stage Lighting Interface',
    category: 'lighting',
    interfaceType: 'Single GPIO (via PIO / RS485)',
    badge: 'Stage Lighting',
    badgeColor: 'violet',
    description:
      'Control real professional stage lights, smoke machines, and strobe fixtures synchronized to your gameplay in real time.',
    details: [
      'Generates genuine DMX512 packet timing (250 kbps RS-485 stream)',
      'Outputs lighting triggers for notes hit, streaks, star power, and game state',
      'Turn your living room or stage into an authentic concert experience while playing',
    ],
  },
  {
    id: 'led_discrete',
    name: 'Discrete Single-Color LEDs',
    category: 'lighting',
    interfaceType: 'Digital GPIO Pins',
    badge: 'Discrete LEDs',
    badgeColor: 'yellow',
    description:
      'Drive original faceplate LEDs, player indicator lights, or custom LEDs with current-limiting resistors.',
    details: [
      'Player 1-4 indicator LEDs',
      'Star Power / Overdrive alert LEDs',
      'Low battery warning indicator (on Pico W wireless builds)',
    ],
  },

  // --- Power Management & Battery Monitoring ---
  {
    id: 'pwr_max1704x',
    name: 'MAX17043 / MAX17048 Fuel Gauge IC',
    category: 'power',
    interfaceType: 'I2C Bus (400 kHz)',
    badge: 'I2C Fuel Gauge',
    badgeColor: 'teal',
    description:
      'Dedicated LiPo / Li-Ion battery fuel gauge IC utilizing Maxim ModelGauge algorithm for accurate state-of-charge tracking.',
    details: [
      'Reports cell voltage and battery percentage directly over I2C',
      'Alert pin threshold triggers when battery drops below low power limit',
      'Provides accurate battery reporting to game consoles (PS3, PS4, Switch, Wii)',
    ],
  },
  {
    id: 'pwr_adc_battery',
    name: 'ADC Voltage Divider Battery Monitor',
    category: 'power',
    interfaceType: 'Analog ADC Pin (GP29 on Pico)',
    badge: 'ADC Divider',
    badgeColor: 'blue',
    description:
      'Monitor single-cell LiPo battery voltage using the Raspberry Pi Pico onboard 3:1 voltage divider circuit.',
    details: [
      'GP29 measures VSYS battery supply voltage (3.3V empty to 4.2V full cell)',
      'Configurable voltage divider ratio and millivolt thresholds in Configurator',
      'Triggers console low-battery indicators and sleep routines without extra ICs',
    ],
  },
  {
    id: 'pwr_management_sleep',
    name: 'Power Management & Inactivity Sleep',
    category: 'power',
    interfaceType: 'Heartbeat & Inactivity GPIOs',
    badge: 'Auto Sleep',
    badgeColor: 'teal',
    description:
      'Advanced firmware power saving that cuts power to external LED strips, peripherals, or sleep ICs during inactivity.',
    details: [
      'Periodic heartbeat pulse pin to keep external power banks awake',
      'Inactivity timeout pin drives high/low to shut down MOSFET switches and save battery',
      'Wakes instantly on any fret, strum, or button press',
    ],
  },

  // --- Console Bus & Retro Controller Adapters ---
  {
    id: 'bus_wii_extension',
    name: 'Wii Extension Bus (I2C Input)',
    category: 'bus',
    interfaceType: 'I2C Bus (3.3V SDA/SCL)',
    badge: 'Console Bus',
    badgeColor: 'red',
    description:
      'Read authentic Wii Guitar Hero guitars, drums, or Nunchuks directly through the 6-pin Wii extension connector.',
    details: [
      'No need to gut your Wii guitar: plugs straight into the Wii Remote extension cable',
      'Reads frets, strum bar, whammy, joystick, and touch slider over standard 3.3V I2C',
      'Allows creating a standalone plug-and-play USB adapter for Wii rhythm controllers',
    ],
    guideLink: '/guides/wii-adapter',
    guideLabel: 'Wii Adapter Guide',
  },
  {
    id: 'bus_wii_emulation',
    name: 'Wii Extension Port Emulation (Hardware Bus)',
    category: 'bus',
    interfaceType: 'I2C Bus (3.3V)',
    badge: 'Extension Output',
    badgeColor: 'red',
    description:
      'Emulate a physical Wii Extension device (Guitar Hero guitar or Classic Controller) to plug Santroller directly into a genuine Wii Remote!',
    details: [
      'Santroller acts as the I2C peripheral speaking the encrypted Nintendo extension protocol',
      'Plugs into physical Wii Remotes to play Wii Guitar Hero games wirelessly on consoles',
    ],
  },
  {
    id: 'bus_ps2_controller',
    name: 'PlayStation 1 & 2 Controller Bus (SPI Input)',
    category: 'bus',
    interfaceType: 'SPI Bus with ACK line',
    badge: 'Console Bus',
    badgeColor: 'indigo',
    description:
      'Directly read original PS1/PS2 DualShock controllers and Guitar Hero SG guitars via their native serial bus.',
    details: [
      'Compatible with PS2 Guitar Hero SG guitars and standard DualShock 2 controllers',
      'Reads button pressure levels and analog stick data with microsecond accuracy',
      'Builds a zero-lag USB adapter for original PS2 rhythm controllers',
    ],
    guideLink: '/guides/ps2-adapter',
    guideLabel: 'PS2 Adapter Guide',
  },
  {
    id: 'bus_ps2_emulation',
    name: 'PlayStation 1 & 2 Port Emulation (Output)',
    category: 'bus',
    interfaceType: 'SPI Pins (CMD, ATT, ACK, DATA, CLK)',
    badge: 'Console Output',
    badgeColor: 'indigo',
    description:
      'Santroller natively emulates a physical PS1/PS2 controller, allowing you to plug your custom instrument into original PlayStation hardware.',
    details: [
      'Full 5-wire hardware emulation of DualShock and Guitar Hero SG controllers',
      'Connects directly to the PS1/PS2 console controller ports with zero latency',
    ],
  },
  {
    id: 'bus_snes_pad',
    name: 'Super Nintendo (SNES) / NES Controller Bus',
    category: 'bus',
    interfaceType: '3-Pin Serial (Clock, Latch, Data)',
    badge: 'Retro Bus',
    badgeColor: 'red',
    description:
      'Direct support for reading Super Nintendo and NES gamepads and rhythm accessories.',
    details: [
      'Reads standard 4021 shift-register serial gamepads over Clock, Latch, and Data lines',
      'Sub-millisecond shift register latching directly into Santroller inputs',
    ],
  },
  {
    id: 'bus_joybus',
    name: 'Nintendo Joybus (N64 & GameCube Controller Bus)',
    category: 'bus',
    interfaceType: 'Single-Wire Joybus (PIO)',
    badge: 'Joybus Input',
    badgeColor: 'purple',
    description:
      'Direct bidirectional communication with original Nintendo 64 and Nintendo GameCube controllers.',
    details: [
      'Single-wire bidirectional Joybus protocol driven with RP2040 PIO',
      'Reads original GameCube controllers, DK Bongos, and N64 gamepads with microsecond timing',
    ],
  },
  {
    id: 'bus_joybus_emulation',
    name: 'GameCube / Joybus Port Emulation (Output)',
    category: 'bus',
    interfaceType: 'Single-Wire Joybus (PIO)',
    badge: 'Joybus Output',
    badgeColor: 'purple',
    description:
      'Santroller can emulate a native GameCube controller, enabling you to plug directly into GameCube and Wii GC controller ports.',
    details: [
      'Works with GameCube consoles, Wii GameCube ports, and Smash Bros USB adapters',
      'Native Joybus response timing generated via high-speed PIO state machines',
    ],
  },
  {
    id: 'bus_xbox360_rf',
    name: 'Xbox 360 RF Wireless Module (Front Panel)',
    category: 'bus',
    interfaceType: '3-Pin Serial (Data, Clock, Sync)',
    badge: 'RF Module',
    badgeColor: 'green',
    description:
      'Wire the front-panel RF board harvested from an Xbox 360 Fat or Slim console to Santroller to build a standalone wireless receiver!',
    details: [
      'Supports Xbox 360 Fat and Slim RF daughterboards',
      'Reads wireless controllers, wireless guitars, and wireless drums directly over RF',
      'Supports the hardware SYNC button and animated Ring of Light LED status',
    ],
  },
  {
    id: 'bus_midi',
    name: 'MIDI 5-Pin DIN & USB-MIDI Devices',
    category: 'bus',
    interfaceType: 'UART / USB / Bluetooth',
    badge: 'Musical MIDI',
    badgeColor: 'grape',
    description:
      'Interface professional electronic drum kits, MIDI keyboards, or synthesizers directly to Santroller.',
    details: [
      'Standard 5-pin DIN MIDI IN with optocoupler circuit via hardware UART (31,250 baud)',
      'USB-MIDI instruments plugged into Santroller USB Host port',
      'MIDI over Bluetooth for wireless electronic drum kits',
      'Map MIDI note numbers and velocity directly to Rock Band Pro Drum pads and cymbals',
    ],
  },
];

export function SupportedHardwarePage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HardwareCategory>('all');

  const filteredHardware = useMemo(() => {
    return HARDWARE_CATALOG.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.interfaceType.toLowerCase().includes(q) ||
        item.details.some((d) => d.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, search]);

  return (
    <Layout>
      <Container size="xl" px="md" pb="xl">
        {/* Page Header */}
        <Stack gap="xs" mb="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Title order={1} size="h2" fw={700}>
                {t('supportedHardware.title', 'Supported Hardware')}
              </Title>
              <Text size="sm" c="dimmed">
                {t(
                  'supportedHardware.subtitle',
                  'Comprehensive catalog of all microcontrollers, USB host devices, sensors, and accessories compatible with Santroller.'
                )}
              </Text>
            </div>

            <Group gap="xs">
              <Button
                variant="light"
                size="xs"
                color="blue"
                component={Link}
                to="/compatibility"
                leftSection={<IconDeviceGamepad size={14} />}
              >
                {t('nav.compatibility', 'Console Compatibility')}
              </Button>
              <Button
                variant="subtle"
                size="xs"
                component={Link}
                to="/guides"
                leftSection={<IconPlug size={14} />}
              >
                {t('guides.catalogTitle', 'Build Guides')}
              </Button>
            </Group>
          </Group>
        </Stack>

        {/* Quick Highlights Alert */}
        <Alert
          icon={<IconInfoCircle size={18} />}
          title={t('supportedHardware.alertTitle', 'Universal Connectivity')}
          color="blue"
          radius="md"
          mb="sm"
        >
          <Text size="xs">
            Santroller turns a Raspberry Pi Pico (RP2040 or RP2350) into an all-in-one controller
            hub. You can wire custom buttons, switches, and LEDs directly to GPIO pins, read legacy
            console buses (like Wii and PS2 controllers), or use the secondary USB Host port to
            connect modern wireless dongles, authentic controllers, and authentication keys.
          </Text>
        </Alert>

        {/* Clone Warning Alert */}
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title={t('supportedHardware.cloneWarningTitle', 'Buyer Beware: Counterfeit AliExpress "Pico W" Clones')}
          color="red"
          radius="md"
          mb="lg"
        >
          <Text size="xs">
            Many ultra-cheap "Pico W" boards sold on AliExpress and similar marketplaces are knock-offs that replace
            the official Infineon CYW43439 chip with an obsolete <strong>ESP8266 or ESP8285</strong> Wi-Fi microcontroller.
            The ESP8266/ESP8285 has <strong>NO Bluetooth hardware</strong> whatsoever. Because Santroller relies on Bluetooth
            Classic for wireless controllers and Wii Remote emulation, <strong>these clone boards will NEVER work with Santroller Bluetooth</strong>.
            Always ensure your board is an authentic Raspberry Pi Pico W / Pico 2 W featuring the official silver metal RF shield stamped with the Raspberry Pi logo.
          </Text>
        </Alert>

        {/* Filter and Search */}
        <Group justify="space-between" align="center" mb="lg" gap="sm">
          <SegmentedControl
            size="xs"
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val as HardwareCategory)}
            data={[
              { label: t('supportedHardware.catAll', 'All Hardware'), value: 'all' },
              { label: t('supportedHardware.catMcu', 'Microcontrollers'), value: 'mcu' },
              { label: t('supportedHardware.catUsb', 'USB Host Devices'), value: 'usb_host' },
              {
                label: t('supportedHardware.catPeriph', 'Instrument Peripherals'),
                value: 'peripherals',
              },
              { label: t('supportedHardware.catSensors', 'Sensors & Switches'), value: 'sensors' },
              {
                label: t('supportedHardware.catExpansion', 'Expansion & ICs'),
                value: 'expansion',
              },
              { label: t('supportedHardware.catLighting', 'LEDs & Stage Lights'), value: 'lighting' },
              { label: t('supportedHardware.catBus', 'Console Buses & MIDI'), value: 'bus' },
              { label: t('supportedHardware.catPower', 'Power & Battery'), value: 'power' },
            ]}
            style={{ overflowX: 'auto', maxWidth: '100%' }}
          />

          <TextInput
            size="xs"
            placeholder={t('supportedHardware.searchPlaceholder', 'Search hardware...')}
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 220 }}
          />
        </Group>

        {/* Hardware Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredHardware.map((item) => (
            <Card
              key={item.id}
              withBorder
              radius="md"
              p="md"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Stack gap="xs">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                    <ThemeIcon
                      variant="light"
                      color={item.badgeColor}
                      size="md"
                      radius="md"
                      style={{ flexShrink: 0 }}
                    >
                      {item.category === 'mcu' && <IconCpu size={16} />}
                      {item.category === 'usb_host' && <IconPlug size={16} />}
                      {item.category === 'peripherals' && <IconFlame size={16} />}
                      {item.category === 'sensors' && <IconTopologyStarRing3 size={16} />}
                      {item.category === 'expansion' && <IconDevices size={16} />}
                      {item.category === 'lighting' && <IconLamp size={16} />}
                      {item.category === 'bus' && <IconDeviceGamepad2 size={16} />}
                      {item.category === 'power' && <IconBatteryCharging size={16} />}
                    </ThemeIcon>
                    <div style={{ minWidth: 0 }}>
                      <Title order={3} size="h5" fw={600} lineClamp={1}>
                        {item.name}
                      </Title>
                      <Text size="xs" c="dimmed">
                        {item.interfaceType}
                      </Text>
                    </div>
                  </Group>

                  <Badge
                    variant="light"
                    color={item.badgeColor}
                    size="xs"
                    style={{ flexShrink: 0 }}
                  >
                    {item.badge}
                  </Badge>
                </Group>

                <Text size="xs" c="dimmed" mt={4}>
                  {item.description}
                </Text>

                <Stack gap={4} mt={6}>
                  {item.details.map((detail, idx) => (
                    <Group key={idx} gap={6} align="flex-start" wrap="nowrap">
                      <ThemeIcon variant="transparent" color={item.badgeColor} size="xs" mt={2}>
                        <IconCheck size={12} stroke={2.5} />
                      </ThemeIcon>
                      <Text size="xs" style={{ flex: 1 }}>
                        {detail}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Stack>

              {item.guideLink && (
                <Group
                  justify="flex-end"
                  mt="md"
                  pt="sm"
                  style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                >
                  <Button
                    size="xs"
                    variant="subtle"
                    color="blue"
                    rightSection={<IconArrowRight size={14} />}
                    component={Link}
                    to={item.guideLink}
                    px={6}
                  >
                    {item.guideLabel ?? 'Open Guide'}
                  </Button>
                </Group>
              )}
            </Card>
          ))}
        </SimpleGrid>

        {filteredHardware.length === 0 && (
          <Card withBorder radius="md" p="xl" ta="center">
            <Text c="dimmed" size="sm">
              {t(
                'supportedHardware.noneFound',
                'No supported hardware found matching "{{query}}".',
                { query: search }
              )}
            </Text>
          </Card>
        )}
      </Container>
    </Layout>
  );
}
