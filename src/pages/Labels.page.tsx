import { IconPlus, IconTrash } from '@tabler/icons-react';
import {
  ActionIcon,
  Affix,
  Button,
  Card,
  Flex,
  Group,
  Loader,
  Menu,
  Modal,
  SimpleGrid,
  Space,
  TextInput,
} from '@mantine/core';
import { useDisclosure, useMounted } from '@mantine/hooks';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { proto, useConfigStore } from '../components/SettingsContext/SettingsContext';

import '@/i18n/config';

import { useTranslation } from 'react-i18next';
import { PinBox } from '@/components/Devices/Pins';
import { AllPinsNamed } from '@/devices/pico/pins';

export function Label({
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

export function LabelsPage() {
  const deleteAllLabels = useConfigStore((state) => state.deleteAllLabels);
  const addLabel = useConfigStore((state) => state.addLabel);
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
            {Object.entries(labels).map(([id, label]) => (
              <Label key={id} id={id} label={label} deleteLabel={() => deleteLabel(parseInt(id))} />
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
