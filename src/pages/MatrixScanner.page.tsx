import { useEffect, useMemo, useState } from 'react';
import { IconPlayerPlay, IconPlayerStop, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  MultiSelect,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import { Layout } from '@/components/Layout/Layout';
import {
  analysePinPairs,
  matrixDeviceFromScan,
  PinPair,
  SWITCH_NETWORK_MAX_BUTTONS,
  switchNetworkFromScan,
} from '@/components/PinScanner/pinPairs';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { AllPinsNamed } from '@/devices/pico/pins';

export function MatrixScannerPage() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const gpioCount = useConfigStore((state) => state.gpioCount);
  const hidDevice = useConfigStore((state) => state.hidDevice);
  const scanning = useConfigStore((state) => state.pinPairScanning);
  const pairs = useConfigStore((state) => state.pinPairs);
  const scanPinPairs = useConfigStore((state) => state.scanPinPairs);
  const clearPinPairs = useConfigStore((state) => state.clearPinPairs);
  const addDevice = useConfigStore((state) => state.addDevice);
  const pollInputs = useConfigStore((state) => state.pollInputs);
  const navigate = useNavigate();
  const simpleMode = useConfigStore((state) => state.simpleMode);

  const pinOptions = useMemo(
    () =>
      Object.entries(AllPinsNamed)
        .filter(([, pin]) => pin.pin < gpioCount)
        .map(([value, pin]) => ({ value, label: t(pin.label, pin) })),
    [gpioCount, t]
  );
  const [pins, setPins] = useState<string[] | null>(null);
  const selected = pins ?? pinOptions.map((option) => option.value);
  const selectedPins = selected.map((pin) => parseInt(pin, 10));

  // The device stops scanning when the tool goes away, so ask again once it is back, and stop
  // when leaving the page
  useEffect(() => {
    if (hidDevice && useConfigStore.getState().pinPairScanning) {
      void scanPinPairs(selectedPins);
    }
  }, [hidDevice]);
  useEffect(
    () => () => {
      if (useConfigStore.getState().pinPairScanning) {
        void useConfigStore.getState().scanPinPairs(null);
      }
    },
    []
  );

  const list = Object.values(pairs).sort((x, y) => x.order - y.order);
  const analysis = analysePinPairs(pairs);
  const pinName = (pin: number) => t('pin', { pin });
  const pinList = (list: number[]) => list.map(pinName).join(', ');
  const direction = (pair: PinPair) => {
    if (pair.aToB && pair.bToA) {
      return t('matrixScanner.table.bothWays');
    }
    const [from, to] = pair.aToB ? [pair.a, pair.b] : [pair.b, pair.a];
    return t('matrixScanner.table.oneWay', { from: pinName(from), to: pinName(to) });
  };

  const tooManyButtons = list.length > SWITCH_NETWORK_MAX_BUTTONS;
  // The new device takes over the pins, so the scan has to let go of them first
  const createDevice = async (type: 'matrix' | 'switchNetwork') => {
    if (scanning) {
      await scanPinPairs(null);
    }
    addDevice(type, undefined, (device) => {
      if (type === 'matrix') {
        device.matrix = matrixDeviceFromScan(analysis);
      } else {
        device.switchNetwork = switchNetworkFromScan(pairs);
      }
    });
    pollInputs(false);
    navigate('/devices');
  };

  // A wiring tool for working out unknown boards, so like the sidebar link it isn't offered in simple mode
  if (simpleMode) {
    return <Navigate to="/" />;
  }
  if (!mounted) {
    return <Loader />;
  }
  return (
    <Layout>
      <RequireDevice>
        <Stack gap="md" maw={900}>
          <Title order={3}>{t('matrixScanner.title')}</Title>
          <Text c="dimmed">{t('matrixScanner.intro')}</Text>
          <MultiSelect
            label={t('matrixScanner.pins')}
            description={t('matrixScanner.pinsHint')}
            data={pinOptions}
            value={selected}
            onChange={setPins}
            disabled={scanning}
            searchable
            clearable
          />
          <Group>
            {scanning ? (
              <Button
                color="red"
                leftSection={<IconPlayerStop size={16} />}
                onClick={() => scanPinPairs(null)}
              >
                {t('matrixScanner.stop')}
              </Button>
            ) : (
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                disabled={!selectedPins.length}
                onClick={() => scanPinPairs(selectedPins)}
              >
                {t('matrixScanner.start')}
              </Button>
            )}
            <Button
              variant="default"
              leftSection={<IconTrash size={16} />}
              disabled={!list.length}
              onClick={clearPinPairs}
            >
              {t('matrixScanner.clear')}
            </Button>
          </Group>
          {scanning && <Text size="sm">{t('matrixScanner.scanning')}</Text>}
          {analysis.layout !== 'empty' && (
            <Alert
              color={analysis.layout === 'network' ? 'yellow' : 'teal'}
              title={t('matrixScanner.summary.buttons', {
                count: list.length,
                pins: analysis.pins.length,
              })}
            >
              <Text size="sm">
                {t(`matrixScanner.summary.${analysis.layout}`, {
                  drive: pinList(analysis.drive),
                  sense: pinList(analysis.sense),
                })}
              </Text>
              {analysis.layout !== 'network' && (
                <Text size="sm" mt={4}>
                  {t('matrixScanner.summary.matrixHint')}
                </Text>
              )}
              <Group mt="sm" gap="xs">
                {analysis.layout !== 'network' && (
                  <Button size="xs" onClick={() => createDevice('matrix')}>
                    {t('matrixScanner.create.matrix')}
                  </Button>
                )}
                <Button
                  size="xs"
                  variant={analysis.layout === 'network' ? 'filled' : 'default'}
                  disabled={tooManyButtons}
                  onClick={() => createDevice('switchNetwork')}
                >
                  {t('matrixScanner.create.switchNetwork')}
                </Button>
              </Group>
              {tooManyButtons && (
                <Text size="sm" mt={4} c="red">
                  {t('matrixScanner.create.tooMany', { max: SWITCH_NETWORK_MAX_BUTTONS })}
                </Text>
              )}
            </Alert>
          )}
          {list.length ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>{t('matrixScanner.table.pins')}</Table.Th>
                  <Table.Th>{t('matrixScanner.table.direction')}</Table.Th>
                  <Table.Th>{t('matrixScanner.table.presses')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {list.map((pair) => (
                  <Table.Tr
                    key={`${pair.a}-${pair.b}`}
                    bg={pair.held ? 'var(--mantine-color-teal-light)' : undefined}
                  >
                    <Table.Td>{pair.order + 1}</Table.Td>
                    <Table.Td>
                      {pinName(pair.a)} ↔ {pinName(pair.b)}
                    </Table.Td>
                    <Table.Td>{direction(pair)}</Table.Td>
                    <Table.Td>{pair.presses}</Table.Td>
                    <Table.Td>
                      {pair.held ? (
                        <Badge color="teal">{t('matrixScanner.table.pressed')}</Badge>
                      ) : null}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed">{t('matrixScanner.empty')}</Text>
          )}
        </Stack>
      </RequireDevice>
    </Layout>
  );
}
