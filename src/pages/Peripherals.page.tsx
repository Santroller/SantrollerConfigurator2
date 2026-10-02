import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ActionIcon,
  Affix,
  Button,
  Combobox,
  Flex,
  Group,
  InputBase,
  Loader,
  Menu,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Space,
  Stack,
  Text,
  Title,
  useCombobox,
} from '@mantine/core';
import { useDisclosure, useMounted } from '@mantine/hooks';
import { IconDownload, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { DeviceKind, deviceKinds, isDeviceKind } from '@/components/Devices/deviceRegistry';
import { deviceEditors } from '@/pages/Devices.page';
import { buildUf2FromConfig, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { proto } from '@/components/SettingsContext/config';

const subDeviceKinds = deviceKinds.filter((k) => k !== 'peripheral');

export function PeripheralsPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '0';

  const [deviceType, setDeviceType] = useState<DeviceKind>(subDeviceKinds[0]);
  const [opened, { open, close }] = useDisclosure(false);
  const [uf2Opened, { open: openUf2, close: closeUf2 }] = useDisclosure(false);
  const { t } = useTranslation();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const status = useConfigStore((state) => state.deviceStatus[id]);
  const addDevice = useConfigStore((state) => state.addDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const subDevices = useConfigStore(
    useShallow((state) =>
      Object.values(state.deviceStatus).filter((x) => x.parentId === id)
    )
  );

  const [sdaPin, setSdaPin] = useState<number>(status?.device?.peripheral?.i2c?.sda ?? 0);
  const [sclPin, setSclPin] = useState<number>(status?.device?.peripheral?.i2c?.scl ?? 1);
  const [idPin, setIdPin] = useState<number>(2);
  const [pico2, setPico2] = useState<boolean>(false);

  const mounted = useMounted();

  if (!mounted) {
    return <Loader />;
  }

  if (!status || !status.device || !status.device.peripheral) {
    return (
      <Layout>
        <RequireDevice>
          <Title order={2}>{t('peripherals.not_found', 'Peripheral device not found')}</Title>
        </RequireDevice>
      </Layout>
    );
  }

  const peripheral = status.device.peripheral;

  const addSubDevice = (type: DeviceKind) => {
    addDevice(type, id);
  };

  const deleteAllSubDevices = () => {
    for (const sub of subDevices) {
      deleteDevice(sub.id);
    }
  };

  const handleDownloadUf2 = async () => {
    const config = proto.Config.create({
      peripheralBoot: {
        i2c: {
          block: sdaPin >= 16 ? 1 : 0,
          sda: sdaPin,
          scl: sclPin,
          clock: 400000,
        },
        idPin: idPin,
      },
    });
    const aux = proto.AuxConfigBlock.create({});
    const configBuf = proto.Config.encode(config).finish();
    const auxBuf = proto.AuxConfigBlock.encode(aux).finish();
    const buffer = new Uint8Array(configBuf.length + auxBuf.length);
    buffer.set(configBuf);
    buffer.set(auxBuf, configBuf.length);

    await buildUf2FromConfig(pico2, { buffer, mainLen: configBuf.length, auxLen: auxBuf.length });
    closeUf2();
  };

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
    <Layout>
      <RequireDevice>
        <Group justify="space-between" mb="md">
          <Title order={2}>
            {t('peripherals.title', 'Peripheral (0x{{address}})', {
              address: peripheral.address.toString(16),
            })}
          </Title>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            onClick={openUf2}
          >
            {t('peripherals.download_uf2', 'Download Peripheral UF2')}
          </Button>
        </Group>

        <Modal opened={opened} onClose={close} title={t('add_device_dialog.title')} centered>
          <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
              if (isDeviceKind(val)) {
                setDeviceType(val as DeviceKind);
              }
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>{mainElement}</Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Options mah={200} style={{ overflowY: 'auto' }}>
                {subDeviceKinds.map((item) => (
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
                  addSubDevice(deviceType);
                  close();
                }}
                color="red"
              >
                {t('add_device_dialog.confirm')}
              </Button>
            </Group>
          </Flex>
        </Modal>

        <Modal
          opened={uf2Opened}
          onClose={closeUf2}
          title={t('peripherals.uf2_modal_title', 'Download Peripheral Firmware (UF2)')}
          centered
        >
          <Stack gap="md">
            <NumberInput
              label={t('peripherals.sda_pin', 'SDA Pin')}
              value={sdaPin}
              onChange={(val) => setSdaPin(Number(val))}
              min={0}
              max={29}
            />
            <NumberInput
              label={t('peripherals.scl_pin', 'SCL Pin')}
              value={sclPin}
              onChange={(val) => setSclPin(Number(val))}
              min={0}
              max={29}
            />
            <NumberInput
              label={t('peripherals.id_pin', 'ID Selection Pin')}
              value={idPin}
              onChange={(val) => setIdPin(Number(val))}
              min={0}
              max={29}
            />
            <Select
              label={t('peripherals.target_board', 'Target Board')}
              value={pico2 ? 'pico2' : 'pico1'}
              onChange={(val) => setPico2(val === 'pico2')}
              data={[
                { value: 'pico1', label: 'Raspberry Pi Pico 1 (RP2040)' },
                { value: 'pico2', label: 'Raspberry Pi Pico 2 (RP2350)' },
              ]}
            />
            <Flex justify="flex-end">
              <Button onClick={handleDownloadUf2} color="blue" leftSection={<IconDownload size={16} />}>
                {t('peripherals.download_confirm', 'Download UF2')}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {subDevices.length === 0 ? (
          <Text c="dimmed">
            {t(
              'peripherals.empty',
              'No sub-devices configured on this peripheral coprocessor yet. Click + to add a device.'
            )}
          </Text>
        ) : (
          <SimpleGrid cols={3}>
            {subDevices.map((subStatus) => {
              const DeviceEditor = deviceEditors[subStatus.type];
              if (!DeviceEditor) return null;
              return <DeviceEditor id={subStatus.id} key={subStatus.id} />;
            })}
          </SimpleGrid>
        )}

        <Affix position={{ bottom: 40, right: 40 }}>
          <Menu trigger="click-hover" shadow="md" width={150}>
            <Menu.Target>
              <ActionIcon color="blue" radius="xl" size={60}>
                <IconPlus stroke={1.5} size={30} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPlus size={14} />} onClick={open}>
                {t('add_device_dialog.title')}
              </Menu.Item>
              <Menu.Item leftSection={<IconTrash size={14} />} onClick={deleteAllSubDevices}>
                {t('add_device_dialog.remove_all')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Affix>
      </RequireDevice>
    </Layout>
  );
}
