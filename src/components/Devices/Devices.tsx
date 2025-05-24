import { useContext, createElement } from 'react';
import { Flex, SegmentedControl, Menu, Title, Card, Center, Image, Badge, InputBase, Input, SimpleGrid, useCombobox, Combobox, ActionIcon, Affix, NumberInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { DeviceStatus, SettingsContext, SettingsDispatchContext, proto } from '../SettingsContext/SettingsContext';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';
import { AllPinsNamed, I2CGroups, MisoPins, MosiPins, RxPins, SckPins, SclPins, SdaPins, SPIGroups, TxPins, UARTGroups } from '@/devices/pico/pins';


function PinBox({ pin, valid, error, label, dispatch }: { pin: number, valid: { [pin: number]: { label: string, channel?: string, pin: number } }, error?: string, label: string, dispatch?: (pin: number) => void }) {
  const { t } = useTranslation();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  if (!dispatch) {
    return (
      <InputBase
        disabled
        label={t(label)}
        component="button"
        type="button"
        rightSection={<Combobox.Chevron />}
        rightSectionPointerEvents="none"
      >
        {t(valid[pin]?.label, valid[pin])}
      </InputBase>
    );
  }

  const actualError = valid[pin]?.label ? error : "invalid_pin_message"
  const mainElement = (
    <InputBase
      error={actualError && t(actualError)}
      label={t(label)}
      component="button"
      type="button"
      pointer
      rightSection={<Combobox.Chevron />}
      rightSectionPointerEvents="none"
      onClick={() => combobox.toggleDropdown()}
    >
      {t(valid[pin]?.label, valid[pin]) || <Input.Placeholder>{t("invalid_pin")}</Input.Placeholder>}
    </InputBase>
  );

  if (combobox.dropdownOpened) {
    return (
      <Combobox
        store={combobox}
        onOptionSubmit={(val) => {
          dispatch(Number(val))
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          {mainElement}
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options mah={200} style={{ overflowY: 'auto' }}>
            {Object.entries(valid).map((item) => (
              <Combobox.Option value={item[0]} key={item[0]}>
                {t(item[1].label, item[1])}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    );
  }
  return mainElement;
}

function I2CDevice({ device, dispatch }: { device: proto.II2CDevice, dispatch: (device: proto.II2CDevice) => void }) {
  const error = I2CGroups[device.sda] !== I2CGroups[device.scl] && "i2c.incorrect_group" || ""
  return (
    <>
      <PinBox label="i2c.sda.label" error={error} pin={device.sda} valid={SdaPins} dispatch={(pin) => dispatch({ ...device, sda: pin })} />
      <PinBox label="i2c.scl.label" error={error} pin={device.scl} valid={SclPins} dispatch={(pin) => dispatch({ ...device, scl: pin })} />
    </>
  )
}

function SPIDevice({ device, dispatch, mosiLabel = "spi.mosi.label", misoLabel = "spi.miso.label", sckLabel = "spi.sck.label" }: { device: proto.ISPIDevice, dispatch: (device: proto.ISPIDevice) => void, mosiLabel?: string, misoLabel?: string, sckLabel?: string }) {
  const error = new Set([SPIGroups[device.mosi], SPIGroups[device.miso], SPIGroups[device.sck]]).size !== 1 && "spi.incorrect_group" || ""

  return (
    <>
      <PinBox label={mosiLabel} error={error} pin={device.mosi} valid={MosiPins} dispatch={(pin) => dispatch({ ...device, mosi: pin })} />
      <PinBox label={misoLabel} error={error} pin={device.miso} valid={MisoPins} dispatch={(pin) => dispatch({ ...device, miso: pin })} />
      <PinBox label={sckLabel} error={error} pin={device.sck} valid={SckPins} dispatch={(pin) => dispatch({ ...device, sck: pin })} />
    </>
  )
}

function UARTDevice({ device, dispatch }: { device: proto.IUARTDevice, dispatch: (device: proto.IUARTDevice) => void }) {
  const error = UARTGroups[device.tx] !== UARTGroups[device.rx] && "uart.incorrect_group" || ""

  return (
    <>
      <PinBox label="uart.tx.label" error={error} pin={device.tx} valid={TxPins} dispatch={(pin) => dispatch({ ...device, tx: pin })} />
      <PinBox label="uart.rx.label" error={error} pin={device.rx} valid={RxPins} dispatch={(pin) => dispatch({ ...device, rx: pin })} />
    </>
  )
}

function DeviceCard({ connected, title, image, children }: { connected: boolean, title: string, image: string, children: React.ReactNode }) {
  const { t } = useTranslation();
  const badge = connected ?
    <Badge size="md" color="blue">{t("connected")}</Badge> :
    <Badge size="md" color="red">{t("disconnected")}</Badge>;
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Center>
          <Image
            src={image}
            height={160}
            w="auto"
            fit="contain"
            alt={title}
          />
        </Center>
      </Card.Section>
      <Flex mt="md" mb="xs" justify="center" align="center" gap="xs">
        <Title order={2} fw={500} >{t(title)}</Title> {badge}
      </Flex>
      {children}
    </Card>
  )
}

function LabeledSegmentedControl({ data, label, description, value, translateData = true, dispatch }: { data: { label: string, value: string }[], label: string, description: string, value: string, translateData?: boolean, dispatch: ((value: string) => void) }) {
  const { t } = useTranslation();
  return (
    <Input.Wrapper label={t(label)} description={t(description)}>
      <SegmentedControl
        fullWidth
        data={translateData ? data.map(({ label, value }) => ({ label: t(label), value })) : data}
        value={value}
        onChange={(value) => dispatch(value)}
      />
    </Input.Wrapper>
  )
}

function MappingMode({ mode, dispatch }: { mode: proto.MappingMode, dispatch: (device: proto.MappingMode) => void }) {
  const data = [
    { label: "mapping_mode.per_input", value: proto.MappingMode.PerInput.toString() },
    { label: "mapping_mode.per_extension", value: proto.MappingMode.PerExtension.toString() }
  ]
  return (
    <LabeledSegmentedControl data={data} value={mode.toString()} dispatch={(val) => dispatch(Number(val))} label="mapping_mode.label" description="mapping_mode.description" />
  )
}

function WiiExtensionDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.wii) {
    throw new Error("device null!")
  }
  const wii = device.wii
  return (
    <DeviceCard connected={status.connected} title='devices.wii_extension' image="covers/Wii.svg.png">
      <I2CDevice device={wii.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { wii: { ...wii, i2c: val } }, id: status.id })} />
      <MappingMode mode={wii.mappingMode} dispatch={(val) => dispatch({ type: "updateDevice", device: { wii: { ...wii, mappingMode: val } }, id: status.id })} />
    </DeviceCard>
  )
}

function BandHeroDrumDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.bhDrum) {
    throw new Error("device null!")
  }
  const bhDrum = device.bhDrum
  return (
    <DeviceCard connected={status.connected} title='devices.band_hero_drums' image="covers/bandhero.png">
      <I2CDevice device={bhDrum.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { bhDrum: { ...bhDrum, i2c: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function WorldTourDrumDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.worldTourDrum) {
    throw new Error("device null!")
  }
  const worldTourDrum = device.worldTourDrum
  return (
    <DeviceCard connected={status.connected} title='devices.world_tour_drums' image="covers/ghwt.jpg">
      <SPIDevice device={worldTourDrum.spi} dispatch={(val) => dispatch({ type: "updateDevice", device: { worldTourDrum: { ...worldTourDrum, spi: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function MPU6050Device({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.mpu6050) {
    throw new Error("device null!")
  }
  const mpu6050 = device.mpu6050
  return (
    <DeviceCard connected={status.connected} title='devices.mpu6050' image="covers/mpu6050.png">
      <I2CDevice device={mpu6050.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { mpu6050: { ...mpu6050, i2c: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function ADXL345Device({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.adxl) {
    throw new Error("device null!")
  }
  const adxl = device.adxl
  return (
    <DeviceCard connected={status.connected} title='devices.adxl345' image="covers/adxl345.png">
      <I2CDevice device={adxl.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { adxl: { ...adxl, i2c: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function LIS3DHDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.lis3dh) {
    throw new Error("device null!")
  }
  const lis3dh = device.lis3dh
  return (
    <DeviceCard connected={status.connected} title='devices.lis3dh' image="covers/lis3dh.png">
      <I2CDevice device={lis3dh.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { lis3dh: { ...lis3dh, i2c: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function MPR121Device({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  const { t } = useTranslation();
  if (!device.mpr121) {
    throw new Error("device null!")
  }
  const mpr121 = device.mpr121
  return (
    <DeviceCard connected={status.connected} title='devices.mpr121' image="covers/mpr121.png">
      <I2CDevice device={mpr121.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { mpr121: { ...mpr121, i2c: val } }, id: status.id })} />
      <NumberInput label={t("mpr121.touchpad_count")} value={mpr121.touchpadCount} onChange={(val) => dispatch({ type: "updateDevice", device: { mpr121: { ...mpr121, touchpadCount: Number(val) } }, id: status.id })} />
    </DeviceCard>
  )
}
function CrazyGuitarNeckDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.crazyGuitarNeck) {
    throw new Error("device null!")
  }
  const crazyGuitarNeck = device.crazyGuitarNeck
  return (
    <DeviceCard connected={status.connected} title='devices.crazy_guitar_neck' image="covers/crazy_guitar_neck.png">
      <I2CDevice device={crazyGuitarNeck.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { crazyGuitarNeck: { ...crazyGuitarNeck, i2c: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function GH5NeckDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.gh5Neck) {
    throw new Error("device null!")
  }
  const gh5Neck = device.gh5Neck
  return (
    <DeviceCard connected={status.connected} title='devices.gh5_neck' image="covers/gh5Neck.png">
      <I2CDevice device={gh5Neck.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { gh5Neck: { ...gh5Neck, i2c: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function DJHeroTurntableDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.djhTurntable) {
    throw new Error("device null!")
  }
  const djhTurntable = device.djhTurntable
  return (
    <DeviceCard connected={status.connected} title='devices.djh_turntable' image="covers/djh_turntable.png">
      <I2CDevice device={djhTurntable.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { djhTurntable: { ...djhTurntable, i2c: val } }, id: status.id })} />
    </DeviceCard>
  )
}
const peripheralData = [{ label: "0x45", value: "0x45" }, { label: "0x46", value: "0x46" }, { label: "0x47", value: "0x47" }, { label: "0x48", value: "0x48" }]
function PeripheralDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.peripheral) {
    throw new Error("device null!")
  }
  const peripheral = device.peripheral
  return (
    <DeviceCard connected={status.connected} title='devices.peripheral' image="covers/peripheral.png">
      <I2CDevice device={peripheral.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { peripheral: { ...peripheral, i2c: val } }, id: status.id })} />
      <LabeledSegmentedControl data={peripheralData} value={`0x${peripheral.address.toString(16)}`} dispatch={(val) => dispatch({ type: "updateDevice", device: { peripheral: { ...peripheral, address: Number(val) } }, id: status.id })} label="peripheral.address.label" description="peripheral.address.description" />
    </DeviceCard>
  )
}
function MidiSerialDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.midiSerial) {
    throw new Error("device null!")
  }
  const midiSerial = device.midiSerial
  return (
    <DeviceCard connected={status.connected} title='devices.midi_serial' image="covers/midi_serial.png">
      <UARTDevice device={midiSerial.uart} dispatch={(val) => dispatch({ type: "updateDevice", device: { midiSerial: { ...midiSerial, uart: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function Max1704XDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.max1704x) {
    throw new Error("device null!")
  }
  const max1704x = device.max1704x
  return (
    <DeviceCard connected={status.connected} title='devices.max1704x' image="covers/max1704x.png">
      <I2CDevice device={max1704x.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { max1704x: { ...max1704x, i2c: val } }, id: status.id })} />
    </DeviceCard>
  )
}

function PSXDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.psx) {
    throw new Error("device null!")
  }
  const psx = device.psx
  return (
    <DeviceCard connected={status.connected} title='devices.psx' image="covers/psx.png">
      <SPIDevice device={psx.spi} mosiLabel="psx.command.pin" misoLabel="psx.data.pin" sckLabel="psx.clock.pin" dispatch={(val) => dispatch({ type: "updateDevice", device: { psx: { ...psx, spi: val } }, id: status.id })} />
      <PinBox label="psx.attention.pin" pin={psx.attPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { psx: { ...psx, attPin: pin } }, id: status.id })} />
      <PinBox label="psx.acknowledge.pin" pin={psx.ackPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { psx: { ...psx, ackPin: pin } }, id: status.id })} />
      <MappingMode mode={psx.mappingMode} dispatch={(val) => dispatch({ type: "updateDevice", device: { psx: { ...psx, mappingMode: val } }, id: status.id })} />
    </DeviceCard>
  )
}
const multiplexerData = [{ "label": "multiplexer.selector.eightChannel", "value": "false" }, { "label": "multiplexer.selector.sixteenChannel", "value": "true" }]
function MultiplexerDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.multiplexer) {
    throw new Error("device null!")
  }
  const multiplexer = device.multiplexer
  return (
    <DeviceCard connected={status.connected} title='devices.multiplexer' image="covers/multiplexer.png">
      <LabeledSegmentedControl data={multiplexerData} value={multiplexer.sixteenChannel.toString()} dispatch={(val) => dispatch({ type: "updateDevice", device: { multiplexer: { ...multiplexer, sixteenChannel: val === "true" } }, id: status.id })} label="multiplexer.selector.label" description="multiplexer.selector.description" />
      <PinBox label="multiplexer.input.label" pin={multiplexer.s0Pin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { multiplexer: { ...multiplexer, inputPin: pin } }, id: status.id })} />
      <PinBox label="multiplexer.s0.label" pin={multiplexer.s0Pin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { multiplexer: { ...multiplexer, s0Pin: pin } }, id: status.id })} />
      <PinBox label="multiplexer.s1.label" pin={multiplexer.s1Pin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { multiplexer: { ...multiplexer, s1Pin: pin } }, id: status.id })} />
      <PinBox label="multiplexer.s2.label" pin={multiplexer.s2Pin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { multiplexer: { ...multiplexer, s2Pin: pin } }, id: status.id })} />
      {multiplexer.sixteenChannel && <PinBox label="multiplexer.s3.label" pin={multiplexer.s3Pin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { multiplexer: { ...multiplexer, s3Pin: pin } }, id: status.id })} />}
    </DeviceCard>
  )
}
function SNESDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.snes) {
    throw new Error("device null!")
  }
  const snes = device.snes
  return (
    <DeviceCard connected={status.connected} title='devices.snes' image="covers/snes.png">
      <PinBox label="snes.clock_pin" pin={snes.clockPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { snes: { ...snes, clockPin: pin } }, id: status.id })} />
      <PinBox label="snes.data_pin" pin={snes.dataPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { snes: { ...snes, dataPin: pin } }, id: status.id })} />
      <PinBox label="snes.latch_pin" pin={snes.latchPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { snes: { ...snes, latchPin: pin } }, id: status.id })} />
      <MappingMode mode={snes.mappingMode} dispatch={(val) => dispatch({ type: "updateDevice", device: { snes: { ...snes, mappingMode: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function JoybusDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.joybus) {
    throw new Error("device null!")
  }

  const joybus = device.joybus
  return (
    <DeviceCard connected={status.connected} title='devices.joybus' image="covers/joybus.png">
      <PinBox label="joybus.data_pin" pin={joybus.dataPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { joybus: { ...joybus, dataPin: pin } }, id: status.id })} />
      <MappingMode mode={joybus.mappingMode} dispatch={(val) => dispatch({ type: "updateDevice", device: { joybus: { ...joybus, mappingMode: val } }, id: status.id })} />
    </DeviceCard>
  )
}
const usbHostValidPins = Object.fromEntries(Object.entries(AllPinsNamed).filter(([pin, _]) => AllPinsNamed[(Number(pin) + 1).toString()]))
const usbHostData = [{ "label": "usb.selector.dpFirst", "value": "false" }, { "label": "usb.selector.dmFirst", "value": "true" }]
function USBHostDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.usbHost) {
    throw new Error("device null!")
  }
  const usbHost = device.usbHost
  return (
    <DeviceCard connected={status.connected} title='devices.usb_host' image="covers/usbHost.png">
      <PinBox label={usbHost.dmFirst ? "usb.dm.label" : "usb.dp.label"} pin={usbHost.firstPin} valid={usbHostValidPins} dispatch={(pin) => dispatch({ type: "updateDevice", device: { usbHost: { ...usbHost, firstPin: pin } }, id: status.id })} />
      <PinBox label={usbHost.dmFirst ? "usb.dp.label" : "usb.dm.label"} pin={usbHost.firstPin + 1} valid={AllPinsNamed} />
      <LabeledSegmentedControl data={usbHostData} value={usbHost.dmFirst.toString()} dispatch={(val) => dispatch({ type: "updateDevice", device: { usbHost: { ...usbHost, dmFirst: val === "true" } }, id: status.id })} label="usb.selector.label" description="usb.selector.description" />
      <MappingMode mode={usbHost.mappingMode} dispatch={(val) => dispatch({ type: "updateDevice", device: { usbHost: { ...usbHost, mappingMode: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function WiiEmulationDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.wiiEmulation) {
    throw new Error("device null!")
  }
  const wiiEmulation = device.wiiEmulation
  return (
    <DeviceCard connected={status.connected} title='devices.wii_emulation' image="covers/wii.png">
      <I2CDevice device={wiiEmulation.i2c} dispatch={(val) => dispatch({ type: "updateDevice", device: { wiiEmulation: { ...wiiEmulation, i2c: val } }, id: status.id })} />
    </DeviceCard>
  )
}
function JoybusEmulationDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.joybusEmulation) {
    throw new Error("device null!")
  }
  const joybusEmulation = device.joybusEmulation
  return (
    <DeviceCard connected={status.connected} title='devices.joybus_emulation' image="covers/joybus.png">
      <PinBox label="joybus.data_pin" pin={joybusEmulation.dataPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { joybusEmulation: { ...joybusEmulation, dataPin: pin } }, id: status.id })} />
    </DeviceCard>
  )
}

function PSXEmulationDevice({ device, status }: { device: proto.IDevice, status: DeviceStatus }) {
  const dispatch = useContext(SettingsDispatchContext);
  if (!device.psxEmulation) {
    throw new Error("device null!")
  }
  const psxEmulation = device.psxEmulation
  return (
    <DeviceCard connected={status.connected} title='devices.psx_emulation' image="covers/psx.png">
      <PinBox label="psx.data.pin" pin={psxEmulation.dataPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { psxEmulation: { ...psxEmulation, dataPin: pin } }, id: status.id })} />
      <PinBox label="psx.command.pin" pin={psxEmulation.commandPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { psxEmulation: { ...psxEmulation, commandPin: pin } }, id: status.id })} />
      <PinBox label="psx.clock.pin" pin={psxEmulation.clockPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { psxEmulation: { ...psxEmulation, clockPin: pin } }, id: status.id })} />
      <PinBox label="psx.attention.pin" pin={psxEmulation.attentionPin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { psxEmulation: { ...psxEmulation, attentionPin: pin } }, id: status.id })} />
      <PinBox label="psx.acknowledge.pin" pin={psxEmulation.acknowledgePin} valid={AllPinsNamed} dispatch={(pin) => dispatch({ type: "updateDevice", device: { psxEmulation: { ...psxEmulation, acknowledgePin: pin } }, id: status.id })} />
    </DeviceCard>
  )
}

const types: { [type: string]: React.FunctionComponent<{ device: proto.IDevice, status: DeviceStatus }> } = {
  "wii": WiiExtensionDevice,
  "bhDrum": BandHeroDrumDevice,
  "worldTourDrum": WorldTourDrumDevice,
  "adxl": ADXL345Device,
  "lis3dh": LIS3DHDevice,
  "mpu6050": MPU6050Device,
  "max1704x": Max1704XDevice,
  "mpr121": MPR121Device,
  "crazyGuitarNeck": CrazyGuitarNeckDevice,
  "gh5Neck": GH5NeckDevice,
  "djhTurntable": DJHeroTurntableDevice,
  "midiSerial": MidiSerialDevice,
  "usbHost": USBHostDevice,
  "multiplexer": MultiplexerDevice,
  "psx": PSXDevice,
  "snes": SNESDevice,
  "joybus": JoybusDevice,
  "wiiEmulation": WiiEmulationDevice,
  "psxEmulation": PSXEmulationDevice,
  "joybusEmulation": JoybusEmulationDevice,
  "peripheral": PeripheralDevice,
}
export function Devices() {
  const config = useContext(SettingsContext);
  return (
    <>
      <SimpleGrid cols={3}>
        {Object.values(config.deviceStatus).map((status) =>
          createElement(types[status.type], { device: config.devices[status.id], status, key: status.id })
        )}
      </SimpleGrid >
      <Affix position={{ bottom: 40, right: 40 }}>
        <Menu shadow="md" width={150}>
          <Menu.Target>
            <ActionIcon color="blue" radius="xl" size={60}>
              <IconPlus stroke={1.5} size={30} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPlus size={14} />}>
              Add Device
            </Menu.Item>
            <Menu.Item leftSection={<IconTrash size={14} />}>
              Remove all devices
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Affix>
    </>
  );
}
