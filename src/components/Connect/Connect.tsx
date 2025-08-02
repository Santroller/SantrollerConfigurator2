import { useState } from 'react';
import { IconPencil, IconPlus, IconRestore, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Affix,
  Button,
  Card,
  Center,
  Combobox,
  Group,
  Image,
  Input,
  InputBase,
  Menu,
  SegmentedControl,
  SimpleGrid,
  Space,
  Tabs,
  Text,
  TextInput,
  Title,
  useCombobox,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { proto } from '../SettingsContext/config';
import { DeviceStatus, useConfigStore } from '../SettingsContext/SettingsContext';

export function Connect() {
  const connect = useConfigStore((state) => state.connect);
  const disconnect = useConfigStore((state) => state.disconnect);
  const connected = useConfigStore((state) => state.connected);
  if (connected) {
    return (
      <>
        <Button onClick={disconnect}>Disconnect from Santroller</Button>
      </>
    );
  }
  return (
    <>
      <Button onClick={connect}>Connect to Santroller</Button>
    </>
  );
}
