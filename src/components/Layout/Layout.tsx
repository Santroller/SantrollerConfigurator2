import { useReducer, useState } from 'react';
import {
  IconActivity,
  IconChevronRight,
  IconCircleOff,
  IconDeviceGamepad3,
  IconGauge,
  IconHome2,
  IconSettings,
} from '@tabler/icons-react';
import { NavLink as RouterLink } from 'react-router-dom';
import { AppShell, Badge, Burger, Group, Image, NavLink, Skeleton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useConfigStore } from '../SettingsContext/SettingsContext';
import classes from './Layout.module.css';

export function Layout({ children }) {
  const [opened, { toggle }] = useDisclosure();
  const connected = useConfigStore((state) => state.connected);
  return (
    <>
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md">
            <Image src="Icons/logoSide.png" height={40} fit="scale-down" alt="Norway" />
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </Group>
        </AppShell.Header>
        <AppShell.Navbar p="md">
          <NavLink
            component={RouterLink}
            to="/"
            label="Main"
            leftSection={<IconSettings size={16} stroke={1.5} />}
          />
          {connected && (
            <>
              <NavLink
                component={RouterLink}
                to="/devices"
                label="Devices"
                leftSection={<IconSettings size={16} stroke={1.5} />}
              />
              <NavLink
                component={RouterLink}
                to="/profiles"
                label="Profiles"
                leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
              />
            </>
          )}
        </AppShell.Navbar>
        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </>
  );
}
