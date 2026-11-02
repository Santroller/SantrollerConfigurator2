import { useState } from 'react';
import { IconCopy, IconEye, IconEyeOff, IconPlus, IconTrash } from '@tabler/icons-react';
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
  Switch,
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
import { matrixHasPin } from '@/components/Devices/matrixPins';
import { PinBox } from '@/components/Devices/Pins';
import { isLed } from '@/components/Devices/pinUtils';
import { HidKeyPicker } from '@/components/Inputs/HidKeyPicker';
import { getLabelKind, LabelKind } from '@/components/Labels/labelRegistry';
import {
  selectableCardStyle,
  selectedCardStyle,
  SelectionBar,
  SelectToggle,
  toggleOnBackgroundClick,
} from '@/components/Selection/Selection';
import { AllPinsNamed } from '@/devices/pico/pins';

const cardStyle = (selected: boolean) =>
  selected ? { ...selectableCardStyle, ...selectedCardStyle } : selectableCardStyle;

// Which profiles a label shows in, all of them when none are picked
function LabelProfiles({ id, label }: { id: string; label: proto.IGuiConfig }) {
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const profiles = useConfigStore((state) => state.config.profiles);
  return (
    <MultiSelect
      mt="xs"
      label={t('labels.profiles')}
      placeholder={label.profiles?.length ? undefined : t('labels.allProfiles')}
      data={(profiles ?? []).map((profile) => ({
        value: `${profile.opts.uid}`,
        label: profile.opts.name || t('profileDefaults.name'),
      }))}
      value={(label.profiles ?? []).map((uid) => `${uid}`)}
      onChange={(uids) =>
        updateLabel({ ...label, profiles: uids.map((uid) => parseInt(uid, 10)) }, parseInt(id, 10))
      }
      clearable
    />
  );
}

function Label({ id, label, deleteLabel, selected, onSelect }: LabelEditorProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const copyLabel = useConfigStore((state) => state.copyLabel);
  const seller = useConfigStore((state) => state.seller);
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
            <Button onClick={close}>{t('common.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card
        key={id}
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={cardStyle(selected)}
        onClick={(e) => toggleOnBackgroundClick(e, selected, onSelect)}
      >
        <Flex justify="flex-end" align="center">
          <SelectToggle selected={selected} onSelect={onSelect} />
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
        <LabelProfiles id={id} label={label} />
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
        {seller && (
          <>
            <Space h="md" />{' '}
            <Switch
              checked={label.label!.showToCustomer ?? false}
              onChange={(e) =>
                updateLabel(
                  {
                    deviceid: parseInt(id, 10),
                    label: { ...label.label!, showToCustomer: e.currentTarget.checked },
                  },
                  parseInt(id.toString(), 10)
                )
              }
              label={t('labels.showToCustomer')}
            />
          </>
        )}
      </Card>
    </>
  );
}

function LedLabel({ id, label, deleteLabel, selected, onSelect }: LabelEditorProps) {
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
            <Button onClick={close}>{t('common.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card
        key={id}
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={cardStyle(selected)}
        onClick={(e) => toggleOnBackgroundClick(e, selected, onSelect)}
      >
        <Flex justify="flex-end" align="center">
          <SelectToggle selected={selected} onSelect={onSelect} />
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
        <LabelProfiles id={id} label={label} />
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

function MatrixLabel({ id, label, deleteLabel, selected, onSelect }: LabelEditorProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const copyLabel = useConfigStore((state) => state.copyLabel);
  const device = useConfigStore((state) => state.deviceStatus[label.matrixLabel!.deviceid!]);
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const seller = useConfigStore((state) => state.seller);
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
            <Button onClick={close}>{t('common.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card
        key={id}
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={cardStyle(selected)}
        onClick={(e) => toggleOnBackgroundClick(e, selected, onSelect)}
      >
        <Flex justify="flex-end" align="center">
          <SelectToggle selected={selected} onSelect={onSelect} />
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
        <LabelProfiles id={id} label={label} />
        <PinBox
          label="matrix.input_pin"
          pin={label.matrixLabel!.inputPin!}
          valid={Object.fromEntries(
            Object.entries(AllPinsNamed).filter((x) =>
              matrixHasPin(device?.device.matrix, 'in', parseInt(x[0], 10))
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
            Object.entries(AllPinsNamed).filter((x) =>
              matrixHasPin(device?.device.matrix, 'out', parseInt(x[0], 10))
            )
          )}
          dispatch={(pin) =>
            updateLabel(
              {
                deviceid: parseInt(id, 10),
                matrixLabel: { ...label.matrixLabel!, outputPin: pin },
              },
              parseInt(id.toString(), 10)
            )
          }
        />
        {seller && (
          <>
            <Space h="md" />{' '}
            <Switch
              checked={label.matrixLabel!.showToCustomer ?? false}
              onChange={(e) =>
                updateLabel(
                  {
                    deviceid: parseInt(id, 10),
                    matrixLabel: { ...label.matrixLabel!, showToCustomer: e.currentTarget.checked },
                  },
                  parseInt(id.toString(), 10)
                )
              }
              label={t('labels.showToCustomer')}
            />
          </>
        )}
      </Card>
    </>
  );
}

function SwitchNetworkLabel({ id, label, deleteLabel, selected, onSelect }: LabelEditorProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const copyLabel = useConfigStore((state) => state.copyLabel);
  const seller = useConfigStore((state) => state.seller);
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
            <Button onClick={close}>{t('common.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card
        key={id}
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={cardStyle(selected)}
        onClick={(e) => toggleOnBackgroundClick(e, selected, onSelect)}
      >
        <Flex justify="flex-end" align="center">
          <SelectToggle selected={selected} onSelect={onSelect} />
          <ActionIcon color="red">
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
          <ActionIcon>
            <IconCopy style={{ width: '70%', height: '70%' }} onClick={() => copyLabel(label)} />
          </ActionIcon>
        </Flex>
        <TextInput
          value={label.switchNetworkLabel?.label}
          onChange={(e) =>
            updateLabel(
              {
                ...label,
                switchNetworkLabel: { ...label.switchNetworkLabel!, label: e.currentTarget.value },
              },
              parseInt(id, 10)
            )
          }
          label={t('labels.title')}
        />
        <LabelProfiles id={id} label={label} />
        <PinBox
          label="switchNetwork.pin"
          pin={label.switchNetworkLabel!.pin!}
          valid={AllPinsNamed}
          dispatch={(pin) =>
            updateLabel(
              { ...label, switchNetworkLabel: { ...label.switchNetworkLabel!, pin } },
              parseInt(id, 10)
            )
          }
        />
        <PinBox
          label="switchNetwork.other_pin"
          pin={label.switchNetworkLabel!.otherPin!}
          valid={AllPinsNamed}
          dispatch={(otherPin) =>
            updateLabel(
              { ...label, switchNetworkLabel: { ...label.switchNetworkLabel!, otherPin } },
              parseInt(id, 10)
            )
          }
        />
        {seller && (
          <>
            <Space h="md" />
            <Switch
              checked={label.switchNetworkLabel!.showToCustomer ?? false}
              onChange={(e) =>
                updateLabel(
                  {
                    ...label,
                    switchNetworkLabel: {
                      ...label.switchNetworkLabel!,
                      showToCustomer: e.currentTarget.checked,
                    },
                  },
                  parseInt(id, 10)
                )
              }
              label={t('labels.showToCustomer')}
            />
          </>
        )}
      </Card>
    </>
  );
}

function KeyboardKeyLabel({ id, label, deleteLabel, selected, onSelect }: LabelEditorProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const copyLabel = useConfigStore((state) => state.copyLabel);
  const seller = useConfigStore((state) => state.seller);
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
            <Button onClick={close}>{t('common.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card
        key={id}
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={cardStyle(selected)}
        onClick={(e) => toggleOnBackgroundClick(e, selected, onSelect)}
      >
        <Flex justify="flex-end" align="center">
          <SelectToggle selected={selected} onSelect={onSelect} />
          <ActionIcon color="red">
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
          <ActionIcon>
            <IconCopy style={{ width: '70%', height: '70%' }} onClick={() => copyLabel(label)} />
          </ActionIcon>
        </Flex>
        <TextInput
          value={label.keyboardKeyLabel?.label}
          onChange={(e) =>
            updateLabel(
              {
                ...label,
                keyboardKeyLabel: { ...label.keyboardKeyLabel!, label: e.currentTarget.value },
              },
              parseInt(id, 10)
            )
          }
          label={t('labels.title')}
        />
        <LabelProfiles id={id} label={label} />
        <Space h="md" />
        <HidKeyPicker
          value={label.keyboardKeyLabel!.key}
          onChange={(key) =>
            updateLabel(
              { ...label, keyboardKeyLabel: { ...label.keyboardKeyLabel!, key } },
              parseInt(id, 10)
            )
          }
        />
        {seller && (
          <>
            <Space h="md" />
            <Switch
              checked={label.keyboardKeyLabel!.showToCustomer ?? false}
              onChange={(e) =>
                updateLabel(
                  {
                    ...label,
                    keyboardKeyLabel: {
                      ...label.keyboardKeyLabel!,
                      showToCustomer: e.currentTarget.checked,
                    },
                  },
                  parseInt(id, 10)
                )
              }
              label={t('labels.showToCustomer')}
            />
          </>
        )}
      </Card>
    </>
  );
}

function MultiplexerLabel({ id, label, deleteLabel, selected, onSelect }: LabelEditorProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const updateLabel = useConfigStore((state) => state.updateLabel);
  const copyLabel = useConfigStore((state) => state.copyLabel);
  const device = useConfigStore((state) => state.deviceStatus[label.multiplexerLabel!.deviceid!]);
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const seller = useConfigStore((state) => state.seller);
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
            <Button onClick={close}>{t('common.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card
        key={id}
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={cardStyle(selected)}
        onClick={(e) => toggleOnBackgroundClick(e, selected, onSelect)}
      >
        <Flex justify="flex-end" align="center">
          <SelectToggle selected={selected} onSelect={onSelect} />
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
        <LabelProfiles id={id} label={label} />
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
                {t('multiplexer.channel', { channel: label.multiplexerLabel?.channel })}
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
                    {t('multiplexer.channel', { channel: i })}
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
            {t('multiplexer.channel', { channel: label.multiplexerLabel?.channel })}
          </InputBase>
        )}
        {seller && (
          <>
            <Space h="md" />{' '}
            <Switch
              checked={label.multiplexerLabel!.showToCustomer ?? false}
              onChange={(e) =>
                updateLabel(
                  {
                    deviceid: parseInt(id, 10),
                    multiplexerLabel: {
                      ...label.multiplexerLabel!,
                      showToCustomer: e.currentTarget.checked,
                    },
                  },
                  parseInt(id.toString(), 10)
                )
              }
              label={t('labels.showToCustomer')}
            />
          </>
        )}
      </Card>
    </>
  );
}

type LabelEditorProps = {
  id: string;
  label: proto.IGuiConfig;
  deleteLabel: () => void;
  selected: boolean;
  onSelect: (selected: boolean) => void;
};

const labelEditors: Record<LabelKind, React.FunctionComponent<LabelEditorProps>> = {
  label: Label,
  ledLabel: LedLabel,
  matrixLabel: MatrixLabel,
  multiplexerLabel: MultiplexerLabel,
  switchNetworkLabel: SwitchNetworkLabel,
  keyboardKeyLabel: KeyboardKeyLabel,
};

function RegisteredLabelEditor(props: LabelEditorProps) {
  const kind = getLabelKind(props.label);
  if (!kind) {
    return null;
  }

  const LabelEditor = labelEditors[kind];
  return <LabelEditor {...props} />;
}

// Selects labels and acts on all of them at once
function BulkLabelActions({
  ids,
  selected,
  setSelected,
}: {
  ids: string[];
  selected: string[];
  setSelected: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const deleteLabels = useConfigStore((state) => state.deleteLabels);
  const setLabelProfiles = useConfigStore((state) => state.setLabelProfiles);
  const setLabelShowToCustomer = useConfigStore((state) => state.setLabelShowToCustomer);
  const seller = useConfigStore((state) => state.seller);
  const profiles = useConfigStore((state) => state.config.profiles);
  const [profilesOpened, profilesModal] = useDisclosure(false);
  const [newProfiles, setNewProfiles] = useState<string[]>([]);
  if (!ids.length) {
    return null;
  }
  const selectedIds = selected.map((id) => parseInt(id, 10));
  return (
    <>
      <Modal
        opened={profilesOpened}
        onClose={profilesModal.close}
        title={t('labels.bulk.profilesTitle', { count: selected.length })}
        centered
      >
        <MultiSelect
          label={t('labels.profiles')}
          description={t('labels.bulk.profilesDesc')}
          placeholder={newProfiles.length ? undefined : t('labels.allProfiles')}
          data={(profiles ?? []).map((profile) => ({
            value: `${profile.opts.uid}`,
            label: profile.opts.name || t('profileDefaults.name'),
          }))}
          value={newProfiles}
          onChange={setNewProfiles}
          clearable
        />
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                setLabelProfiles(
                  selectedIds,
                  newProfiles.map((uid) => parseInt(uid, 10))
                );
                profilesModal.close();
              }}
            >
              {t('labels.bulk.apply')}
            </Button>
            <Button variant="default" onClick={profilesModal.close}>
              {t('common.cancel')}
            </Button>
          </Group>
        </Flex>
      </Modal>
      <SelectionBar
        total={ids.length}
        selected={selected.length}
        onSelectAll={(all) => setSelected(all ? ids : [])}
        onDelete={() => {
          deleteLabels(selectedIds);
          setSelected([]);
        }}
        deleteTitle={t('labels.bulk.deleteTitle')}
        deleteDesc={t('labels.bulk.deleteDesc', { count: selected.length })}
      >
        <Button
          size="xs"
          variant="light"
          onClick={() => {
            setNewProfiles([]);
            profilesModal.open();
          }}
        >
          {t('labels.bulk.setProfiles')}
        </Button>
        {seller && (
          <>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconEye size={14} />}
              onClick={() => setLabelShowToCustomer(selectedIds, true)}
            >
              {t('labels.bulk.showToCustomer')}
            </Button>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconEyeOff size={14} />}
              onClick={() => setLabelShowToCustomer(selectedIds, false)}
            >
              {t('labels.bulk.hideFromCustomer')}
            </Button>
          </>
        )}
      </SelectionBar>
    </>
  );
}

export function LabelsPage() {
  const addLabel = useConfigStore((state) => state.addLabel);
  const addLedLabel = useConfigStore((state) => state.addLedLabel);
  const addMultiplexerLabel = useConfigStore((state) => state.addMultiplexerLabel);
  const addMatrixLabel = useConfigStore((state) => state.addMatrixLabel);
  const addSwitchNetworkLabel = useConfigStore((state) => state.addSwitchNetworkLabel);
  const addKeyboardKeyLabel = useConfigStore((state) => state.addKeyboardKeyLabel);
  const deleteLabel = useConfigStore((state) => state.deleteLabel);
  const { t } = useTranslation();
  const labels = useConfigStore((state) => state.guiDevices);
  const [selection, setSelection] = useState<string[]>([]);
  const mounted = useMounted();
  if (!mounted) {
    return <Loader />;
  }
  // Labels deleted elsewhere drop out of the selection
  const selected = selection.filter((id) => labels[parseInt(id, 10)]);

  return (
    <>
      <Layout>
        <RequireDevice>
          <BulkLabelActions
            ids={Object.keys(labels)}
            selected={selected}
            setSelected={setSelection}
          />
          <SimpleGrid cols={3}>
            {Object.entries(labels).map(([id, label]) => (
              <RegisteredLabelEditor
                key={id}
                id={id}
                label={label}
                deleteLabel={() => deleteLabel(parseInt(id, 10))}
                selected={selected.includes(id)}
                onSelect={(checked) =>
                  setSelection(
                    checked ? [...selected, id] : selected.filter((other) => other !== id)
                  )
                }
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
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={addSwitchNetworkLabel}>
                  {t('labels.addSwitchNetwork')}
                </Menu.Item>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={addKeyboardKeyLabel}>
                  {t('labels.addKeyboardKey')}
                </Menu.Item>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={addMultiplexerLabel}>
                  {t('labels.addMultiplexer')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Affix>
        </RequireDevice>
      </Layout>
    </>
  );
}
