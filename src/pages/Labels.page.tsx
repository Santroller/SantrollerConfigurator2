import { IconCopy, IconPlus, IconTrash } from '@tabler/icons-react';
import {
  ActionIcon,
  Affix,
  Button,
  Card,
  Combobox,
  Flex,
  Group,
  Input,
  InputBase,
  Loader,
  Menu,
  Modal,
  MultiSelect,
  SimpleGrid,
  Space,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { useDisclosure, useMounted } from '@mantine/hooks';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { DeviceStatus, proto, useConfigStore } from '../components/SettingsContext/SettingsContext';

import '@/i18n/config';

import { useTranslation } from 'react-i18next';
import { isLed, PinBox } from '@/components/Devices/Pins';
import { AllPinsNamed } from '@/devices/pico/pins';

function Label({
  id,
  label,
  deleteLabel,
}: {
  id: string;
  label: proto.IGuiConfig;
  deleteLabel: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const copyLabel = useConfigStore((state) => state.copyLabel);
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('labels.remove.title')} centered>
        {t('labels.remove.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteLabel();
                close();
              }}
              color="red"
            >
              {t('labels.remove.confirm')}
            </Button>
            <Button onClick={close}>{t('labels.remove.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card key={id} shadow="sm" padding="lg" radius="md" withBorder>
        <Flex justify="flex-end">
          <ActionIcon color="red">
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
          <ActionIcon>
            <IconCopy style={{ width: '70%', height: '70%' }} onClick={() => copyLabel(label)} />
          </ActionIcon>
        </Flex>
        <TextInput
          value={label.label?.label}
          onChange={(e) =>
            updateLabel(
              {
                deviceid: parseInt(id, 10),
                label: { ...label.label!, label: e.currentTarget.value },
              },
              parseInt(id.toString(), 10)
            )
          }
          label={t('labels.title')}
        />
        <PinBox
          label="pin_label"
          pin={label.label!.pin!}
          valid={AllPinsNamed}
          dispatch={(pin) =>
            updateLabel(
              { deviceid: parseInt(id, 10), label: { ...label.label!, pin } },
              parseInt(id.toString(), 10)
            )
          }
        />
      </Card>
    </>
  );
}

function LedLabel({
  id,
  label,
  deleteLabel,
}: {
  id: string;
  label: proto.IGuiConfig;
  deleteLabel: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const copyLabel = useConfigStore((state) => state.copyLabel);
  const device = useConfigStore((state) => state.deviceStatus[label.ledLabel!.deviceid!]);
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const deviceCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  let deviceValue = <> </>;
  if (device) {
    deviceValue = (
      <Group gap="2">
        <Text fz="sm" span>
          {t(`devices.${device.type}`)}
        </Text>

        <Text fz="xs" span opacity="0.7">
          ({DeviceStatus.label(device)})
        </Text>
      </Group>
    );
  }
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('delete_label_dialog.title')} centered>
        {t('delete_label_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteLabel();
                close();
              }}
              color="red"
            >
              {t('delete_label_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('delete_label_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card key={id} shadow="sm" padding="lg" radius="md" withBorder>
        <Flex justify="flex-end">
          <ActionIcon color="red">
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
          <ActionIcon>
            <IconCopy style={{ width: '70%', height: '70%' }} onClick={() => copyLabel(label)} />
          </ActionIcon>
        </Flex>
        {(deviceCombobox.dropdownOpened && (
          <Combobox
            store={deviceCombobox}
            onOptionSubmit={(val) => {
              deviceCombobox.closeDropdown();
              updateLabel(
                {
                  deviceid: label.deviceid,
                  ledLabel: { ...label.ledLabel!, deviceid: parseInt(val, 10) },
                },
                label.deviceid
              );
            }}
          >
            <Combobox.Target>
              <InputBase
                label={t('leds.device')}
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => deviceCombobox.toggleDropdown()}
              >
                {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.values(deviceStatus)
                  .filter(isLed)
                  .map((item) => (
                    <Combobox.Option value={item.id} key={item.id}>
                      <Group gap="2">
                        <Text fz="sm" span>
                          {t(`devices.${item.type}`)}
                        </Text>

                        <Text fz="xs" span opacity="0.7">
                          ({DeviceStatus.label(item)})
                        </Text>
                      </Group>
                    </Combobox.Option>
                  ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )) || (
          <InputBase
            label={t('leds.device')}
            component="button"
            type="button"
            pointer
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            onClick={() => deviceCombobox.toggleDropdown()}
          >
            {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
          </InputBase>
        )}
        <TextInput
          value={label.ledLabel?.label}
          onChange={(e) =>
            updateLabel(
              {
                ...label,
                ledLabel: { ...label.ledLabel!, label: e.currentTarget.value },
              },
              parseInt(id.toString(), 10)
            )
          }
          label={t('labels.title')}
        />
        {(device?.device.ws2812 || device?.device.apa102) && (
          <MultiSelect
            label={t('leds.label')}
            value={label.ledLabel!.activeLed?.map((x) => x.toString())}
            data={Array.from(
              { length: device.device.ws2812?.count || device.device.apa102?.count || 0 },
              (_, x) => x.toString()
            )}
            clearable
            maxValues={255}
            onChange={(val) =>
              updateLabel(
                {
                  ...label,
                  ledLabel: { ...label.ledLabel!, activeLed: val.map((x) => parseInt(x, 10)) },
                },
                parseInt(id.toString(), 10)
              )
            }
            searchable
          />
        )}
      </Card>
    </>
  );
}

function MatrixLabel({
  id,
  label,
  deleteLabel,
}: {
  id: string;
  label: proto.IGuiConfig;
  deleteLabel: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const copyLabel = useConfigStore((state) => state.copyLabel);
  const device = useConfigStore((state) => state.deviceStatus[label.matrixLabel!.deviceid!]);
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const deviceCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  let deviceValue = <> </>;
  if (device) {
    deviceValue = (
      <Group gap="2">
        <Text fz="sm" span>
          {t(`devices.${device.type}`)}
        </Text>

        <Text fz="xs" span opacity="0.7">
          ({DeviceStatus.label(device)})
        </Text>
      </Group>
    );
  }
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('delete_label_dialog.title')} centered>
        {t('delete_label_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteLabel();
                close();
              }}
              color="red"
            >
              {t('delete_label_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('delete_label_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card key={id} shadow="sm" padding="lg" radius="md" withBorder>
        <Flex justify="flex-end">
          <ActionIcon color="red">
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
          <ActionIcon>
            <IconCopy style={{ width: '70%', height: '70%' }} onClick={() => copyLabel(label)} />
          </ActionIcon>
        </Flex>
        {(deviceCombobox.dropdownOpened && (
          <Combobox
            store={deviceCombobox}
            onOptionSubmit={(val) => {
              deviceCombobox.closeDropdown();
              updateLabel(
                {
                  deviceid: label.deviceid,
                  matrixLabel: { ...label.matrixLabel!, deviceid: parseInt(val, 10) },
                },
                label.deviceid
              );
            }}
          >
            <Combobox.Target>
              <InputBase
                label={t('matrix.device')}
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => deviceCombobox.toggleDropdown()}
              >
                {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.values(deviceStatus)
                  .filter((x) => x.type === 'matrix')
                  .map((item) => (
                    <Combobox.Option value={item.id} key={item.id}>
                      <Group gap="2">
                        <Text fz="sm" span>
                          {t(`devices.${item.type}`)}
                        </Text>

                        <Text fz="xs" span opacity="0.7">
                          ({DeviceStatus.label(item)})
                        </Text>
                      </Group>
                    </Combobox.Option>
                  ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )) || (
          <InputBase
            label={t('matrix.device')}
            component="button"
            type="button"
            pointer
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            onClick={() => deviceCombobox.toggleDropdown()}
          >
            {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
          </InputBase>
        )}
        <TextInput
          value={label.matrixLabel?.label}
          onChange={(e) =>
            updateLabel(
              {
                ...label,
                matrixLabel: { ...label.matrixLabel!, label: e.currentTarget.value },
              },
              parseInt(id.toString(), 10)
            )
          }
          label={t('labels.title')}
        />
        <PinBox
          label="matrix.input_pin"
          pin={label.matrixLabel!.inputPin!}
          valid={Object.fromEntries(
            Object.entries(AllPinsNamed).filter(
              (x) => device!.device.matrix!.inPins! & (1 << parseInt(x[0], 10))
            )
          )}
          dispatch={(pin) =>
            updateLabel(
              { deviceid: parseInt(id, 10), matrixLabel: { ...label.matrixLabel!, inputPin: pin } },
              parseInt(id.toString(), 10)
            )
          }
        />
        <PinBox
          label="matrix.output_pin"
          pin={label.matrixLabel!.outputPin!}
          valid={Object.fromEntries(
            Object.entries(AllPinsNamed).filter(
              (x) => device!.device.matrix!.outPins! & (1 << parseInt(x[0], 10))
            )
          )}
          dispatch={(pin) =>
            updateLabel(
              { deviceid: parseInt(id, 10), matrixLabel: { ...label.matrixLabel!, outputPin: pin } },
              parseInt(id.toString(), 10)
            )
          }
        />
      </Card>
    </>
  );
}

function MultiplexerLabel({
  id,
  label,
  deleteLabel,
}: {
  id: string;
  label: proto.IGuiConfig;
  deleteLabel: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const copyLabel = useConfigStore((state) => state.copyLabel);
  const device = useConfigStore((state) => state.deviceStatus[label.multiplexerLabel!.deviceid!]);
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const deviceCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  const pinModeCombobox = useCombobox({
    onDropdownClose: () => pinModeCombobox.resetSelectedOption(),
  });
  let deviceValue = <> </>;
  if (device) {
    deviceValue = (
      <Group gap="2">
        <Text fz="sm" span>
          {t(`devices.${device.type}`)}
        </Text>

        <Text fz="xs" span opacity="0.7">
          ({DeviceStatus.label(device)})
        </Text>
      </Group>
    );
  }
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('delete_label_dialog.title')} centered>
        {t('delete_label_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteLabel();
                close();
              }}
              color="red"
            >
              {t('delete_label_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('delete_label_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card key={id} shadow="sm" padding="lg" radius="md" withBorder>
        <Flex justify="flex-end">
          <ActionIcon color="red">
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
          <ActionIcon>
            <IconCopy style={{ width: '70%', height: '70%' }} onClick={() => copyLabel(label)} />
          </ActionIcon>
        </Flex>
        {(deviceCombobox.dropdownOpened && (
          <Combobox
            store={deviceCombobox}
            onOptionSubmit={(val) => {
              deviceCombobox.closeDropdown();
              updateLabel(
                {
                  deviceid: label.deviceid,
                  multiplexerLabel: { ...label.multiplexerLabel!, deviceid: parseInt(val, 10) },
                },
                label.deviceid
              );
            }}
          >
            <Combobox.Target>
              <InputBase
                label={t('multiplexer.device')}
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => deviceCombobox.toggleDropdown()}
              >
                {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.values(deviceStatus)
                  .filter((x) => x.type === 'ads1115' || x.type === 'multiplexer')
                  .map((item) => (
                    <Combobox.Option value={item.id} key={item.id}>
                      <Group gap="2">
                        <Text fz="sm" span>
                          {t(`devices.${item.type}`)}
                        </Text>

                        <Text fz="xs" span opacity="0.7">
                          ({DeviceStatus.label(item)})
                        </Text>
                      </Group>
                    </Combobox.Option>
                  ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )) || (
          <InputBase
            label={t('multiplexer.device')}
            component="button"
            type="button"
            pointer
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            onClick={() => deviceCombobox.toggleDropdown()}
          >
            {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
          </InputBase>
        )}
        <TextInput
          value={label.multiplexerLabel?.label}
          onChange={(e) =>
            updateLabel(
              {
                ...label,
                multiplexerLabel: { ...label.multiplexerLabel!, label: e.currentTarget.value },
              },
              parseInt(id.toString(), 10)
            )
          }
          label={t('labels.title')}
        />
        {(pinModeCombobox.dropdownOpened && (
          <Combobox
            store={pinModeCombobox}
            onOptionSubmit={(val) => {
              updateLabel(
                {
                  ...label,
                  multiplexerLabel: { ...label.multiplexerLabel!, channel: parseInt(val, 10) },
                },
                parseInt(id.toString(), 10)
              );
              pinModeCombobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <InputBase
                label={t('multiplexer.channel_label')}
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => pinModeCombobox.toggleDropdown()}
              >
                {label.multiplexerLabel?.channel}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {[
                  ...Array(
                    device?.device.multiplexer?.sixteenChannel
                      ? 16
                      : device?.device.multiplexer
                        ? 8
                        : 4
                  ),
                ].map((_, i) => (
                  <Combobox.Option key={i} value={i.toString()}>
                    {t('multiplexer.channel', { channel: i + 1 })}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )) || (
          <InputBase
            label={t('multiplexer.channel_label')}
            component="button"
            type="button"
            pointer
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            onClick={() => pinModeCombobox.toggleDropdown()}
          >
            {label.multiplexerLabel?.channel}
          </InputBase>
        )}
      </Card>
    </>
  );
}

export function LabelsPage() {
  const deleteAllLabels = useConfigStore((state) => state.deleteAllLabels);
  const addLabel = useConfigStore((state) => state.addLabel);
  const addLedLabel = useConfigStore((state) => state.addLedLabel);
  const addMultiplexerLabel = useConfigStore((state) => state.addMultiplexerLabel);
  const addMatrixLabel = useConfigStore((state) => state.addMatrixLabel);
  const deleteLabel = useConfigStore((state) => state.deleteLabel);
  const { t } = useTranslation();
  const labels = useConfigStore((state) => state.guiDevices);
  const mounted = useMounted();
  if (!mounted) {
    return <Loader />;
  }

  return (
    <>
      <Layout>
        <RequireDevice>
          <SimpleGrid cols={3}>
            {Object.entries(labels)
              .filter((x) => x[1].label)
              .map(([id, label]) => (
                <Label
                  key={id}
                  id={id}
                  label={label}
                  deleteLabel={() => deleteLabel(parseInt(id, 10))}
                />
              ))}
            {Object.entries(labels)
              .filter((x) => x[1].ledLabel)
              .map(([id, ledLabel]) => (
                <LedLabel
                  key={id}
                  id={id}
                  label={ledLabel}
                  deleteLabel={() => deleteLabel(parseInt(id, 10))}
                />
              ))}
            {Object.entries(labels)
              .filter((x) => x[1].matrixLabel)
              .map(([id, matrixLabel]) => (
                <MatrixLabel
                  key={id}
                  id={id}
                  label={matrixLabel}
                  deleteLabel={() => deleteLabel(parseInt(id, 10))}
                />
              ))}
            {Object.entries(labels)
              .filter((x) => x[1].multiplexerLabel)
              .map(([id, multiplexerLabel]) => (
                <MultiplexerLabel
                  key={id}
                  id={id}
                  label={multiplexerLabel}
                  deleteLabel={() => deleteLabel(parseInt(id, 10))}
                />
              ))}
          </SimpleGrid>
          <Affix position={{ bottom: 40, right: 40 }}>
            <Menu trigger="click-hover" shadow="md" width={150}>
              <Menu.Target>
                <ActionIcon color="blue" radius="xl" size={60}>
                  <IconPlus stroke={1.5} size={30} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={addLabel}>
                  {t('labels.add')}
                </Menu.Item>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={addLedLabel}>
                  {t('labels.addLed')}
                </Menu.Item>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={addMatrixLabel}>
                  {t('labels.addMatrix')}
                </Menu.Item>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={addMultiplexerLabel}>
                  {t('labels.addMultiplexer')}
                </Menu.Item>
                <Menu.Item leftSection={<IconTrash size={14} />} onClick={deleteAllLabels}>
                  {t('labels.removeAll')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Affix>
        </RequireDevice>
      </Layout>
    </>
  );
}
