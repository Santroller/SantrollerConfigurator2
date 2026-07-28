import { IconPlus, IconTrash } from '@tabler/icons-react';
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
  isNumberLike,
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
        </Flex>
        <TextInput
          value={label.label?.label}
          onChange={(e) =>
            updateLabel(
              {
                deviceid: parseInt(id),
                label: { ...label.label!, label: e.currentTarget.value },
              },
              parseInt(id.toString())
            )
          }
          label="Label"
        />
        <PinBox
          label={'pin_label'}
          pin={label.label?.pin!}
          valid={AllPinsNamed}
          dispatch={(pin) =>
            updateLabel(
              { deviceid: parseInt(id), label: { ...label.label!, pin: pin } },
              parseInt(id.toString())
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
  const device = useConfigStore((state) => state.deviceStatus[label.ledLabel?.deviceid!]);
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
        </Flex>
        {(deviceCombobox.dropdownOpened && (
          <Combobox
            store={deviceCombobox}
            onOptionSubmit={(val) => {
              deviceCombobox.closeDropdown();
              updateLabel(
                {
                  deviceid: label.deviceid,
                  ledLabel: { ...label.ledLabel!, deviceid: parseInt(val) },
                },
                label.deviceid
              );
            }}
          >
            <Combobox.Target>
              <InputBase
                label="LED Device"
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
            label="LED Device"
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
              parseInt(id.toString())
            )
          }
          label="Label"
        />
        {(device?.device.ws2812 || device?.device.apa102) && (
          <MultiSelect
            label="Leds"
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
                  ledLabel: { ...label.ledLabel!, activeLed: val.map((x) => parseInt(x)) },
                },
                parseInt(id.toString())
              )
            }
            searchable
          />
        )}
      </Card>
    </>
  );
}

export function LabelsPage() {
  const deleteAllLabels = useConfigStore((state) => state.deleteAllLabels);
  const addLabel = useConfigStore((state) => state.addLabel);
  const addLedLabel = useConfigStore((state) => state.addLedLabel);
  const deleteLabel = useConfigStore((state) => state.deleteLabel);
  const labels = useConfigStore((state) => state.guiDevices);
  const mounted = useMounted();
  if (!mounted) {
    return <Loader></Loader>;
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
                  deleteLabel={() => deleteLabel(parseInt(id))}
                />
              ))}
            {Object.entries(labels)
              .filter((x) => x[1].ledLabel)
              .map(([id, ledLabel]) => (
                <LedLabel
                  key={id}
                  id={id}
                  label={ledLabel}
                  deleteLabel={() => deleteLabel(parseInt(id))}
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
                  Add Label
                </Menu.Item>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={addLedLabel}>
                  Add LED Label
                </Menu.Item>
                <Menu.Item leftSection={<IconTrash size={14} />} onClick={deleteAllLabels}>
                  Remove all labels
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Affix>
        </RequireDevice>
      </Layout>
    </>
  );
}
