import { useMemo, useState } from 'react';
import { IconAlertTriangle, IconDownload, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  ActionIcon,
  Affix,
  Alert,
  Button,
  Flex,
  Group,
  Loader,
  Menu,
  Modal,
  NumberInput,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure, useMounted } from '@mantine/hooks';
import { AddDevicePicker } from '@/components/Devices/AddDevicePicker';
import { canAddDeviceKind, DeviceKind, deviceKinds } from '@/components/Devices/deviceRegistry';
import { downloadPeripheralUf2, peripheralBootValid } from '@/components/Devices/peripheralUf2';
import { DeviceContext } from '@/components/Devices/Pins';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { IdSelectionContext, SelectionBar } from '@/components/Selection/Selection';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { deviceEditors } from '@/pages/Devices.page';

const subDeviceKinds: DeviceKind[] = deviceKinds.filter((k) => k !== 'peripheral');

export function PeripheralsPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '0';
  const { t } = useTranslation();
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const existingTypes = useMemo(
    () => new Set(Object.values(deviceStatus).map((x) => x.type)),
    [deviceStatus]
  );
  const availableSubDeviceKinds = useMemo(
    () => subDeviceKinds.filter((kind) => canAddDeviceKind(kind, existingTypes)),
    [existingTypes]
  );
  const [opened, { open, close }] = useDisclosure(false);
  const [uf2Opened, { open: openUf2, close: closeUf2 }] = useDisclosure(false);
  const status = useConfigStore((state) => state.deviceStatus[id]);
  const addDevice = useConfigStore((state) => state.addDevice);
  const deleteDevice = useConfigStore((state) => state.deleteDevice);
  const subDevices = useConfigStore(
    useShallow((state) => Object.values(state.deviceStatus).filter((x) => x.parentId === id))
  );

  const [sdaPin, setSdaPin] = useState<number>(status?.device?.peripheral?.i2c?.sda ?? 0);
  const [sclPin, setSclPin] = useState<number>(status?.device?.peripheral?.i2c?.scl ?? 1);
  const [idPin, setIdPin] = useState<number>(2);
  const [pico2, setPico2] = useState<boolean>(false);
  const [selection, setSelection] = useState<string[]>([]);

  const mounted = useMounted();

  if (!mounted) {
    return <Loader />;
  }

  if ((!status || !status.device || !status.device.peripheral) && !status?.rebooting) {
    return (
      <Layout>
        <RequireDevice>
          <Title order={2}>{t('peripherals.not_found')}</Title>
        </RequireDevice>
      </Layout>
    );
  }

  const peripheral = status?.device?.peripheral;

  const addSubDevice = (type: DeviceKind) => {
    addDevice(type, id);
  };

  // Devices deleted elsewhere drop out of the selection
  const subDeviceIds = subDevices.map((sub) => sub.id);
  const selected = selection.filter((sel) => subDeviceIds.includes(sel));
  const selectionContext = {
    isSelected: (sel: string) => selected.includes(sel),
    select: (sel: string, on: boolean) =>
      setSelection(on ? [...selected, sel] : selected.filter((other) => other !== sel)),
  };

  const bootPins = { sda: sdaPin, scl: sclPin, idPin, pico2 };
  const handleDownloadUf2 = async () => {
    await downloadPeripheralUf2(bootPins);
    closeUf2();
  };

  const handleOpenAdd = open;

  return (
    <Layout>
      <RequireDevice>
        <Group justify="space-between" mb="md">
          <Title order={2}>
            {t('peripherals.title', {
              address: peripheral?.address != null ? peripheral.address.toString(16) : '??',
            })}
          </Title>
          <Button leftSection={<IconDownload size={16} />} variant="light" onClick={openUf2}>
            {t('peripherals.download_uf2')}
          </Button>
        </Group>

        {status.updating && (
          <Alert
            variant="light"
            color="blue"
            title={t('peripherals.updating_title')}
            icon={<Loader size="sm" />}
            mb="md"
          >
            <Stack gap="xs">
              <Text size="sm">
                {t('peripherals.updating_notice', { percent: status.updateProgress ?? 0 })}
              </Text>
              <Progress
                value={status.updateProgress ?? 0}
                animated
                size="lg"
                radius="xl"
                color="blue"
              />
            </Stack>
          </Alert>
        )}

        {status.rebooting && (
          <Alert
            variant="light"
            color="yellow"
            title={t('peripherals.rebooting_title')}
            icon={<Loader size="sm" />}
            mb="md"
          >
            {t('peripherals.rebooting_notice')}
          </Alert>
        )}

        {status.wrongChip && (
          <Alert
            variant="light"
            color="red"
            title={t('peripherals.wrong_chip_title')}
            icon={<IconAlertTriangle size={16} />}
            mb="md"
          >
            {t('peripherals.wrong_chip_notice')}
          </Alert>
        )}

        <Modal
          opened={opened}
          onClose={close}
          title={t('add_device_dialog.title')}
          size="lg"
          centered
        >
          <AddDevicePicker
            kinds={availableSubDeviceKinds}
            onPick={(kind) => {
              addSubDevice(kind);
              close();
            }}
          />
        </Modal>

        <Modal
          opened={uf2Opened}
          onClose={closeUf2}
          title={t('peripherals.uf2_modal_title')}
          centered
        >
          <Stack gap="md">
            <NumberInput
              label={t('peripherals.sda_pin')}
              value={sdaPin}
              onChange={(val) => setSdaPin(Number(val))}
              min={0}
              max={29}
            />
            <NumberInput
              label={t('peripherals.scl_pin')}
              value={sclPin}
              onChange={(val) => setSclPin(Number(val))}
              min={0}
              max={29}
            />
            <NumberInput
              label={t('peripherals.id_pin')}
              value={idPin}
              onChange={(val) => setIdPin(Number(val))}
              min={0}
              max={29}
            />
            <Select
              label={t('peripherals.target_board')}
              value={pico2 ? 'pico2' : 'pico1'}
              onChange={(val) => setPico2(val === 'pico2')}
              data={[
                { value: 'pico1', label: 'Raspberry Pi Pico 1 (RP2040)' },
                { value: 'pico2', label: 'Raspberry Pi Pico 2 (RP2350)' },
              ]}
            />
            <Flex justify="flex-end">
              <Button
                onClick={handleDownloadUf2}
                disabled={!peripheralBootValid(bootPins)}
                color="blue"
                leftSection={<IconDownload size={16} />}
              >
                {t('peripherals.download_confirm')}
              </Button>
            </Flex>
          </Stack>
        </Modal>

        {subDevices.length === 0 ? (
          <Text c="dimmed">{t('peripherals.empty')}</Text>
        ) : (
          <>
            <SelectionBar
              total={subDeviceIds.length}
              selected={selected.length}
              onSelectAll={(all) => setSelection(all ? subDeviceIds : [])}
              onDelete={() => {
                selected.forEach(deleteDevice);
                setSelection([]);
              }}
              deleteTitle={t('selection.devices.deleteTitle')}
              deleteDesc={t('selection.devices.deleteDesc', { count: selected.length })}
            />
            <IdSelectionContext.Provider value={selectionContext}>
              <SimpleGrid cols={3}>
                {subDevices.map((subStatus) => {
                  const DeviceEditor = deviceEditors[subStatus.type];
                  if (!DeviceEditor) {
                    return null;
                  }
                  return (
                    <DeviceContext.Provider value={subStatus.id} key={subStatus.id}>
                      <DeviceEditor id={subStatus.id} />
                    </DeviceContext.Provider>
                  );
                })}
              </SimpleGrid>
            </IdSelectionContext.Provider>
          </>
        )}

        <Affix position={{ bottom: 40, right: 40 }}>
          <Menu trigger="click-hover" shadow="md" width={150}>
            <Menu.Target>
              <ActionIcon color="blue" radius="xl" size={60}>
                <IconPlus stroke={1.5} size={30} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPlus size={14} />} onClick={handleOpenAdd}>
                {t('add_device_dialog.title')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Affix>
      </RequireDevice>
    </Layout>
  );
}
