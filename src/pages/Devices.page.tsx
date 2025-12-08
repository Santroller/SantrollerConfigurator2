import { createElement, useMemo, useState } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import {
  ActionIcon,
  Affix,
  Badge,
  Button,
  Card,
  Center,
  Combobox,
  Flex,
  Group,
  Image,
  Input,
  InputBase,
  Loader,
  Menu,
  Modal,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Space,
  Title,
  UnstyledButton,
  useCombobox,
} from '@mantine/core';
import { useDisclosure, useMounted } from '@mantine/hooks';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { proto, useConfigStore } from '../components/SettingsContext/SettingsContext';

import '@/i18n/config';

import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { PinBox } from '@/components/Devices/Pins';
import {
  AllPinsNamed,
  I2CGroups,
  MisoPins,
  MosiPins,
  RxPins,
  SckPins,
  SclPins,
  SdaPins,
  SPIGroups,
  TxPins,
  UARTGroups,
} from '@/devices/pico/pins';

function I2CDevice({
  device,
  dispatch,
}: {
  device: proto.II2CDevice;
  dispatch: (device: proto.II2CDevice) => void;
}) {
  const error = (I2CGroups[device.sda] !== I2CGroups[device.scl] && 'i2c.incorrect_group') || '';
  return (
    <>
      <PinBox
        label="i2c.sda.label"
        error={error}
        pin={device.sda}
        valid={SdaPins}
        dispatch={(pin) =>
          dispatch({ ...device, sda: pin, block: parseInt(I2CGroups[pin]), clock: 400000 })
        }
      />
      <PinBox
        label="i2c.scl.label"
        error={error}
        pin={device.scl}
        valid={SclPins}
        dispatch={(pin) =>
          dispatch({ ...device, scl: pin, block: parseInt(I2CGroups[pin]), clock: 400000 })
        }
      />
    </>
  );
}

function SPIDevice({
  device,
  dispatch,
  mosiLabel = 'spi.mosi.label',
  misoLabel = 'spi.miso.label',
  sckLabel = 'spi.sck.label',
  noMosi = false,
  noMiso = false,
  noSck = false,
}: {
  device: proto.ISPIDevice;
  dispatch: (device: proto.ISPIDevice) => void;
  mosiLabel?: string;
  misoLabel?: string;
  sckLabel?: string;
  noMosi?: boolean;
  noMiso?: boolean;
  noSck?: boolean;
}) {
  const error =
    (new Set([SPIGroups[device.mosi], SPIGroups[device.miso], SPIGroups[device.sck]]).size !== 1 &&
      'spi.incorrect_group') ||
    '';

  return (
    <>
      {!noMosi && (
        <PinBox
          label={mosiLabel}
          error={error}
          pin={device.mosi}
          valid={MosiPins}
          dispatch={(pin) => dispatch({ ...device, mosi: pin })}
        />
      )}
      {!noMiso && (
        <PinBox
          label={misoLabel}
          error={error}
          pin={device.miso}
          valid={MisoPins}
          dispatch={(pin) => dispatch({ ...device, miso: pin })}
        />
      )}
      {!noSck && (
        <PinBox
          label={sckLabel}
          error={error}
          pin={device.sck}
          valid={SckPins}
          dispatch={(pin) => dispatch({ ...device, sck: pin })}
        />
      )}
    </>
  );
}

function UARTDevice({
  device,
  dispatch,
}: {
  device: proto.IUARTDevice;
  dispatch: (device: proto.IUARTDevice) => void;
}) {
  const error = (UARTGroups[device.tx] !== UARTGroups[device.rx] && 'uart.incorrect_group') || '';

  return (
    <>
      <PinBox
        label="uart.tx.label"
        error={error}
        pin={device.tx}
        valid={TxPins}
        dispatch={(pin) => dispatch({ ...device, tx: pin, block: parseInt(UARTGroups[pin]) })}
      />
      <PinBox
        label="uart.rx.label"
        error={error}
        pin={device.rx}
        valid={RxPins}
        dispatch={(pin) => dispatch({ ...device, rx: pin, block: parseInt(UARTGroups[pin]) })}
      />
    </>
  );
}

function DeviceCard({
  connected,
  type,
  title,
  image,
  children,
  deleteDevice,
}: {
  connected?: boolean;
  type?: string;
  title: string;
  image: string;
  children: React.ReactNode;
  deleteDevice: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const badge = useMemo(
    () =>
      connected ? (
        <Badge size="md" color="blue">
          {type ? t('connected_with_type', { type: t(`wii.extensions.${type}`) }) : t('connected')}
        </Badge>
      ) : (
        <Badge size="md" color="red">
          {t('disconnected')}
        </Badge>
      ),
    [connected, type]
  );
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('delete_device_dialog.title')} centered>
        {t('delete_device_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteDevice();
                close();
              }}
              color="red"
            >
              {t('delete_device_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('delete_device_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Flex justify="flex-end">
          <ActionIcon color="red">
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
        </Flex>
        <Card.Section>
          <Center>
            <Image src={image} height={160} w="auto" fit="contain" alt={title} />
          </Center>
        </Card.Section>
        <Flex mt="md" mb="xs" justify="center" align="center" gap="xs">
          <Title order={2} fw={500}>
            {t(title)}
          </Title>{' '}
        </Flex>
        <Center>{connected == null ? null : badge}</Center>
        {children}
      </Card>
    </>
  );
}

function LabeledSegmentedControl({
  data,
  label,
  description,
  value,
  translateData = true,
  dispatch,
}: {
  data: { label: string; value: string }[];
  label: string;
  description: string;
  value: string;
  translateData?: boolean;
  dispatch: (value: string) => void;
}) {
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
  );
}

export function LabeledDropdown({
  data,
  label,
  description,
  value,
  dispatch,
}: {
  data: { label: string; value: string }[];
  label: string;
  description: string;
  value: string;
  dispatch: (value: string) => void;
}) {
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
        {t(value)}
      </InputBase>
    );
  }

  const mainElement = (
    <InputBase
      label={t(label)}
      component="button"
      type="button"
      pointer
      rightSection={<Combobox.Chevron />}
      rightSectionPointerEvents="none"
      onClick={() => combobox.toggleDropdown()}
    >
      {t(value)}
    </InputBase>
  );

  if (combobox.dropdownOpened) {
    return (
      <Combobox
        store={combobox}
        onOptionSubmit={(val) => {
          dispatch(val);
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>{mainElement}</Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options mah={200} style={{ overflowY: 'auto' }}>
            {Object.entries(data).map((item) => (
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

function WiiExtensionDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.wii) {
    throw new Error('device null!');
  }
  const wii = device.wii;
  return (
    <DeviceCard
      connected={
        status.wiiExtType != proto.WiiExtType.WiiNoExtension &&
        status.wiiExtType != proto.WiiExtType.WiiNotInitialised
      }
      title="devices.wii"
      type={proto.WiiExtType[status.wiiExtType]}
      image="covers/devices/wii.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={wii.i2c}
        dispatch={(val) => updateDevice({ wii: { ...wii, i2c: val } }, id)}
      />
    </DeviceCard>
  );
}

function BandHeroDrumDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.bhDrum) {
    throw new Error('device null!');
  }
  const bhDrum = device.bhDrum;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.bhDrum"
      image="covers/devices/bandhero.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={bhDrum.i2c}
        dispatch={(val) => updateDevice({ bhDrum: { ...bhDrum, i2c: val } }, id)}
      />
    </DeviceCard>
  );
}
function WorldTourDrumDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.worldTourDrum) {
    throw new Error('device null!');
  }
  const worldTourDrum = device.worldTourDrum;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.worldTourDrum"
      image="covers/devices/ghwt.jpg"
      deleteDevice={() => deleteDevice(id)}
    >
      <SPIDevice
        device={worldTourDrum.spi}
        dispatch={(val) => updateDevice({ worldTourDrum: { ...worldTourDrum, spi: val } }, id)}
      />
    </DeviceCard>
  );
}
function AccelerometerDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.accelerometer) {
    throw new Error('device null!');
  }
  const accelerometer = device.accelerometer;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.accelerometer"
      image="covers/devices/accelerometer.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={accelerometer.i2c}
        dispatch={(val) => updateDevice({ accelerometer: { ...accelerometer, i2c: val } }, id)}
      />
    </DeviceCard>
  );
}
function MPR121Device({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  const { t } = useTranslation();
  if (!device.mpr121) {
    throw new Error('device null!');
  }
  const mpr121 = device.mpr121;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.mpr121"
      image="covers/devices/mpr121.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={mpr121.i2c}
        dispatch={(val) => updateDevice({ mpr121: { ...mpr121, i2c: val } }, id)}
      />
      <NumberInput
        label={t('mpr121.touchpad_count')}
        value={mpr121.touchpadCount}
        onChange={(val) => updateDevice({ mpr121: { ...mpr121, touchpadCount: Number(val) } }, id)}
      />
    </DeviceCard>
  );
}
function CrazyGuitarNeckDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.crazyGuitarNeck) {
    throw new Error('device null!');
  }
  const crazyGuitarNeck = device.crazyGuitarNeck;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.crazyGuitarNeck"
      image="covers/devices/crazyGuitarNeck.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={crazyGuitarNeck.i2c}
        dispatch={(val) => updateDevice({ crazyGuitarNeck: { ...crazyGuitarNeck, i2c: val } }, id)}
      />
    </DeviceCard>
  );
}
function GH5NeckDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.gh5Neck) {
    throw new Error('device null!');
  }
  const gh5Neck = device.gh5Neck;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.gh5Neck"
      image="covers/devices/gh5Neck.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={gh5Neck.i2c}
        dispatch={(val) => updateDevice({ gh5Neck: { ...gh5Neck, i2c: val } }, id)}
      />
    </DeviceCard>
  );
}
function DJHeroTurntableDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.djhTurntable) {
    throw new Error('device null!');
  }
  const djhTurntable = device.djhTurntable;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.djhTurntable"
      image="covers/devices/djhTurntable.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={djhTurntable.i2c}
        dispatch={(val) => updateDevice({ djhTurntable: { ...djhTurntable, i2c: val } }, id)}
      />
    </DeviceCard>
  );
}
const peripheralData = [
  { label: '0x45', value: '0x45' },
  { label: '0x46', value: '0x46' },
  { label: '0x47', value: '0x47' },
  { label: '0x48', value: '0x48' },
];
function PeripheralDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.peripheral) {
    throw new Error('device null!');
  }
  const peripheral = device.peripheral;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.peripheral"
      image="covers/devices/peripheral.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={peripheral.i2c}
        dispatch={(val) => updateDevice({ peripheral: { ...peripheral, i2c: val } }, id)}
      />
      <LabeledSegmentedControl
        data={peripheralData}
        translateData={false}
        value={`0x${peripheral.address.toString(16)}`}
        dispatch={(val) =>
          updateDevice({ peripheral: { ...peripheral, address: Number(val) } }, id)
        }
        label="peripheral.address.label"
        description="peripheral.address.description"
      />
    </DeviceCard>
  );
}
function ADS1115Device({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.ads1115) {
    throw new Error('device null!');
  }
  const ads1115 = device.ads1115;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.ads1115"
      image="covers/devices/ads1115.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={ads1115.i2c}
        dispatch={(val) => updateDevice({ ads1115: { ...ads1115, i2c: val } }, id)}
      />
      <PinBox
        label="ads1115.interrupt.pin"
        pin={ads1115.interrupt}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ ads1115: { ...ads1115, interrupt: pin } }, id)}
      />
      {/* <LabeledSegmentedControl
        data={peripheralData}
        translateData={false}
        value={`0x${peripheral.address.toString(16)}`}
        dispatch={(val) =>
          updateDevice({ peripheral: { ...peripheral, address: Number(val) } }, id)
        }
        label="peripheral.address.label"
        description="peripheral.address.description"
      /> */}
    </DeviceCard>
  );
}
function MidiSerialDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.midiSerial) {
    throw new Error('device null!');
  }
  const midiSerial = device.midiSerial;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.midiSerial"
      image="covers/devices/midiSerial.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <UARTDevice
        device={midiSerial.uart}
        dispatch={(val) => updateDevice({ midiSerial: { ...midiSerial, uart: val } }, id)}
      />
    </DeviceCard>
  );
}
function CrkdNeckDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.crkdNeck) {
    throw new Error('device null!');
  }
  const crkdNeck = device.crkdNeck;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.crkdNeck"
      image="covers/devices/crkdNeck.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <UARTDevice
        device={crkdNeck.uart}
        dispatch={(val) =>
          updateDevice({ crkdNeck: { ...crkdNeck, uart: { ...val, baudrate: 460800 } } }, id)
        }
      />
    </DeviceCard>
  );
}
function DebugDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.debug) {
    throw new Error('device null!');
  }
  const debug = device.debug;
  return (
    <DeviceCard
      title="devices.debug"
      image="covers/devices/debug.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <UARTDevice
        device={debug.uart}
        dispatch={(val) =>
          updateDevice({ debug: { ...debug, uart: { ...val, baudrate: 115200 } } }, id)
        }
      />
    </DeviceCard>
  );
}
const ws2812TypeData = Object.keys(proto.WS2812Type).map((t) => ({
  label: `ws2812.${t.toLowerCase()}`,
  value: t,
}));
function WS2812Device({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const { t } = useTranslation();
  const device = status.device;
  if (!device.ws2812) {
    throw new Error('device null!');
  }
  const ws2812 = device.ws2812;
  return (
    <DeviceCard
      title="devices.ws2812"
      image="covers/devices/ws2812.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <PinBox
        label="ws2812.pin"
        pin={ws2812.pin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ ws2812: { ...ws2812, pin: pin } }, id)}
      />
      <NumberInput
        label={'ws2812.count'}
        value={ws2812.count}
        onChange={(val) => updateDevice({ ws2812: { ...ws2812, count: Number(val) } }, id)}
      />
      <LabeledDropdown
        data={ws2812TypeData}
        label="Type"
        value={`ws2812.${proto.WS2812Type[ws2812.type]}`}
        description="ws2812.description"
        dispatch={(val) => updateDevice({ ws2812: { ...ws2812, type: parseInt(val) + 1 } }, id)}
      />
    </DeviceCard>
  );
}
const apa102TypeData = Object.keys(proto.APA102Type).map((t) => ({
  label: `apa102.${t.toLowerCase()}`,
  value: t,
}));
function APA102Device({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const { t } = useTranslation();
  const device = status.device;
  if (!device.apa102) {
    throw new Error('device null!');
  }
  const apa102 = device.apa102;
  return (
    <DeviceCard
      title="devices.apa102"
      image="covers/devices/apa102.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <SPIDevice
        device={apa102.spi}
        misoLabel="none"
        mosiLabel="apa102.mosi.pin"
        sckLabel="apa102.clock.pin"
        noMiso={true}
        dispatch={(val) => updateDevice({ apa102: { ...apa102, spi: val } }, id)}
      />
      <NumberInput
        label={'apa102.count'}
        value={apa102.count}
        onChange={(val) => updateDevice({ apa102: { ...apa102, count: Number(val) } }, id)}
      />
      <LabeledDropdown
        data={apa102TypeData}
        label="Type"
        value={`apa102.${proto.APA102Type[apa102.type]}`}
        description="apa102.description"
        dispatch={(val) => updateDevice({ apa102: { ...apa102, type: parseInt(val) + 1 } }, id)}
      />
    </DeviceCard>
  );
}
function STP16CPCDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const { t } = useTranslation();
  const device = status.device;
  if (!device.stp16cpc) {
    throw new Error('device null!');
  }
  const stp16cpc = device.stp16cpc;
  return (
    <DeviceCard
      title="devices.stp16cpc"
      image="covers/devices/stp16cpc.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <SPIDevice
        device={stp16cpc.spi}
        misoLabel="none"
        mosiLabel="stp16cpc.mosi.pin"
        sckLabel="stp16cpc.clock.pin"
        noMiso={true}
        dispatch={(val) => updateDevice({ stp16cpc: { ...stp16cpc, spi: val } }, id)}
      />
      <PinBox
        label="stp16cpc.oe.pin"
        pin={stp16cpc.oe}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ stp16cpc: { ...stp16cpc, oe: pin } }, id)}
      />
      <PinBox
        label="stp16cpc.le.pin"
        pin={stp16cpc.le}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ stp16cpc: { ...stp16cpc, le: pin } }, id)}
      />
      <NumberInput
        label={'stp16cpc.count'}
        value={stp16cpc.count}
        onChange={(val) => updateDevice({ stp16cpc: { ...stp16cpc, count: Number(val) } }, id)}
      />
    </DeviceCard>
  );
}
function Max1704XDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.max1704x) {
    throw new Error('device null!');
  }
  const max1704x = device.max1704x;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.max1704x"
      image="covers/devices/max1704x.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={max1704x.i2c}
        dispatch={(val) => updateDevice({ max1704x: { ...max1704x, i2c: val } }, id)}
      />
    </DeviceCard>
  );
}

function PSXDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.psx) {
    throw new Error('device null!');
  }
  const psx = device.psx;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.psx"
      image="covers/devices/psx.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <SPIDevice
        device={psx.spi}
        mosiLabel="psx.command.pin"
        misoLabel="psx.data.pin"
        sckLabel="psx.clock.pin"
        dispatch={(val) => updateDevice({ psx: { ...psx, spi: val } }, id)}
      />
      <PinBox
        label="psx.attention.pin"
        pin={psx.attPin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ psx: { ...psx, attPin: pin } }, id)}
      />
      <PinBox
        label="psx.acknowledge.pin"
        pin={psx.ackPin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ psx: { ...psx, ackPin: pin } }, id)}
      />
    </DeviceCard>
  );
}
const multiplexerData = [
  { label: 'multiplexer.selector.eightChannel', value: 'false' },
  { label: 'multiplexer.selector.sixteenChannel', value: 'true' },
];
function MultiplexerDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.multiplexer) {
    throw new Error('device null!');
  }
  const multiplexer = device.multiplexer;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.multiplexer"
      image="covers/devices/multiplexer.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <LabeledSegmentedControl
        data={multiplexerData}
        value={multiplexer.sixteenChannel.toString()}
        dispatch={(val) =>
          updateDevice({ multiplexer: { ...multiplexer, sixteenChannel: val === 'true' } }, id)
        }
        label="multiplexer.selector.label"
        description="multiplexer.selector.description"
      />
      <PinBox
        label="multiplexer.input.label"
        pin={multiplexer.s0Pin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ multiplexer: { ...multiplexer, inputPin: pin } }, id)}
      />
      <PinBox
        label="multiplexer.s0.label"
        pin={multiplexer.s0Pin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ multiplexer: { ...multiplexer, s0Pin: pin } }, id)}
      />
      <PinBox
        label="multiplexer.s1.label"
        pin={multiplexer.s1Pin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ multiplexer: { ...multiplexer, s1Pin: pin } }, id)}
      />
      <PinBox
        label="multiplexer.s2.label"
        pin={multiplexer.s2Pin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ multiplexer: { ...multiplexer, s2Pin: pin } }, id)}
      />
      {multiplexer.sixteenChannel && (
        <PinBox
          label="multiplexer.s3.label"
          pin={multiplexer.s3Pin}
          valid={AllPinsNamed}
          dispatch={(pin) => updateDevice({ multiplexer: { ...multiplexer, s3Pin: pin } }, id)}
        />
      )}
    </DeviceCard>
  );
}
function SNESDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.snes) {
    throw new Error('device null!');
  }
  const snes = device.snes;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.snes"
      image="covers/devices/snes.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <PinBox
        label="snes.clock_pin"
        pin={snes.clockPin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ snes: { ...snes, clockPin: pin } }, id)}
      />
      <PinBox
        label="snes.data_pin"
        pin={snes.dataPin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ snes: { ...snes, dataPin: pin } }, id)}
      />
      <PinBox
        label="snes.latch_pin"
        pin={snes.latchPin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ snes: { ...snes, latchPin: pin } }, id)}
      />
    </DeviceCard>
  );
}
function JoybusDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.joybus) {
    throw new Error('device null!');
  }

  const joybus = device.joybus;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.joybus"
      image="covers/devices/joybus.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <PinBox
        label="joybus.data_pin"
        pin={joybus.dataPin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ joybus: { ...joybus, dataPin: pin } }, id)}
      />
    </DeviceCard>
  );
}
const usbHostValidPins = Object.fromEntries(
  Object.entries(AllPinsNamed).filter(([pin, _]) => AllPinsNamed[(Number(pin) + 1).toString()])
);
const usbHostData = [
  { label: 'usb.selector.dpFirst', value: 'false' },
  { label: 'usb.selector.dmFirst', value: 'true' },
];
function USBHostDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.usbHost) {
    throw new Error('device null!');
  }
  const usbHost = device.usbHost;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.usbHost"
      image="covers/devices/usbHost.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <PinBox
        label={usbHost.dmFirst ? 'usb.dm.label' : 'usb.dp.label'}
        pin={usbHost.firstPin}
        valid={usbHostValidPins}
        dispatch={(pin) => updateDevice({ usbHost: { ...usbHost, firstPin: pin } }, id)}
      />
      <PinBox
        label={usbHost.dmFirst ? 'usb.dp.label' : 'usb.dm.label'}
        pin={usbHost.firstPin + 1}
        valid={AllPinsNamed}
      />
      <LabeledSegmentedControl
        data={usbHostData}
        value={usbHost.dmFirst.toString()}
        dispatch={(val) => updateDevice({ usbHost: { ...usbHost, dmFirst: val === 'true' } }, id)}
        label="usb.selector.label"
        description="usb.selector.description"
      />
    </DeviceCard>
  );
}
function WiiEmulationDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.wiiEmulation) {
    throw new Error('device null!');
  }
  const wiiEmulation = device.wiiEmulation;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.wiiEmulation"
      image="covers/devices/wii.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <I2CDevice
        device={wiiEmulation.i2c}
        dispatch={(val) => updateDevice({ wiiEmulation: { ...wiiEmulation, i2c: val } }, id)}
      />
    </DeviceCard>
  );
}
function JoybusEmulationDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.joybusEmulation) {
    throw new Error('device null!');
  }
  const joybusEmulation = device.joybusEmulation;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.joybusEmulation"
      image="covers/devices/joybus.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <PinBox
        label="joybus.data_pin"
        pin={joybusEmulation.dataPin}
        valid={AllPinsNamed}
        dispatch={(pin) =>
          updateDevice({ joybusEmulation: { ...joybusEmulation, dataPin: pin } }, id)
        }
      />
    </DeviceCard>
  );
}

function PSXEmulationDevice({ id }: { id: string }) {
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const updateDevice = useConfigStore((state) => state.updateDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const device = status.device;
  if (!device.psxEmulation) {
    throw new Error('device null!');
  }
  const psxEmulation = device.psxEmulation;
  return (
    <DeviceCard
      connected={status.connected}
      title="devices.psxEmulation"
      image="covers/devices/psx.png"
      deleteDevice={() => deleteDevice(id)}
    >
      <PinBox
        label="psx.data.pin"
        pin={psxEmulation.dataPin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ psxEmulation: { ...psxEmulation, dataPin: pin } }, id)}
      />
      <PinBox
        label="psx.command.pin"
        pin={psxEmulation.commandPin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ psxEmulation: { ...psxEmulation, commandPin: pin } }, id)}
      />
      <PinBox
        label="psx.clock.pin"
        pin={psxEmulation.clockPin}
        valid={AllPinsNamed}
        dispatch={(pin) => updateDevice({ psxEmulation: { ...psxEmulation, clockPin: pin } }, id)}
      />
      <PinBox
        label="psx.attention.pin"
        pin={psxEmulation.attentionPin}
        valid={AllPinsNamed}
        dispatch={(pin) =>
          updateDevice({ psxEmulation: { ...psxEmulation, attentionPin: pin } }, id)
        }
      />
      <PinBox
        label="psx.acknowledge.pin"
        pin={psxEmulation.acknowledgePin}
        valid={AllPinsNamed}
        dispatch={(pin) =>
          updateDevice({ psxEmulation: { ...psxEmulation, acknowledgePin: pin } }, id)
        }
      />
    </DeviceCard>
  );
}

const types: { [type: string]: React.FunctionComponent<{ id: string }> } = {
  wii: WiiExtensionDevice,
  bhDrum: BandHeroDrumDevice,
  worldTourDrum: WorldTourDrumDevice,
  accelerometer: AccelerometerDevice,
  max1704x: Max1704XDevice,
  mpr121: MPR121Device,
  crazyGuitarNeck: CrazyGuitarNeckDevice,
  gh5Neck: GH5NeckDevice,
  djhTurntable: DJHeroTurntableDevice,
  midiSerial: MidiSerialDevice,
  crkdNeck: CrkdNeckDevice,
  usbHost: USBHostDevice,
  multiplexer: MultiplexerDevice,
  psx: PSXDevice,
  snes: SNESDevice,
  joybus: JoybusDevice,
  wiiEmulation: WiiEmulationDevice,
  psxEmulation: PSXEmulationDevice,
  joybusEmulation: JoybusEmulationDevice,
  peripheral: PeripheralDevice,
  ads1115: ADS1115Device,
  debug: DebugDevice,
  ws2812: WS2812Device,
  apa102: APA102Device,
  stp16cpc: STP16CPCDevice,
};

export function DevicesPage() {
  const [deviceType, setDeviceType] = useState(Object.keys(types)[0]);
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const config = useConfigStore(
    useShallow((state) =>
      Object.fromEntries(Object.values(state.deviceStatus).map((x) => [x.id, x.type]))
    )
  );
  const deleteAllDevices = useConfigStore((state) => state.deleteAllDevices);
  const addDevice = useConfigStore((state) => state.addDevice);
  const mounted = useMounted();
  if (!mounted) {
    return <Loader></Loader>;
  }
  const mainElement = (
    <InputBase
      component="button"
      type="button"
      pointer
      rightSection={<Combobox.Chevron />}
      rightSectionPointerEvents="none"
      onClick={() => combobox.toggleDropdown()}
    >
      {t(`devices.${deviceType}`)}
    </InputBase>
  );
  return (
    <>
      <Layout>
        <RequireDevice>
          <Modal opened={opened} onClose={close} title={t('add_device_dialog.title')} centered>
            <Combobox
              store={combobox}
              onOptionSubmit={(val) => {
                setDeviceType(val);
                combobox.closeDropdown();
              }}
            >
              <Combobox.Target>{mainElement}</Combobox.Target>

              <Combobox.Dropdown>
                <Combobox.Options mah={200} style={{ overflowY: 'auto' }}>
                  {Object.keys(types).map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {t(`devices.${item}`)}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
            <Space h="md" />
            <Flex justify="flex-end">
              <Group align="flex-end">
                <Button
                  onClick={() => {
                    addDevice(deviceType);
                    close();
                  }}
                  color="red"
                >
                  {t('add_device_dialog.confirm')}
                </Button>
              </Group>
            </Flex>
          </Modal>
          <SimpleGrid cols={3}>
            {Object.entries(config).map(([id, type]) =>
              createElement(types[type], { id, key: id })
            )}
          </SimpleGrid>
          <Affix position={{ bottom: 40, right: 40 }}>
            <Menu trigger="click-hover" shadow="md" width={150}>
              <Menu.Target>
                <ActionIcon color="blue" radius="xl" size={60}>
                  <IconPlus stroke={1.5} size={30} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={open}>
                  Add Device
                </Menu.Item>
                <Menu.Item leftSection={<IconTrash size={14} />} onClick={deleteAllDevices}>
                  Remove all devices
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Affix>
        </RequireDevice>
      </Layout>
    </>
  );
}
