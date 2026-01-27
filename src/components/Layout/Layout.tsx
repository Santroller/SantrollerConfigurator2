import { useReducer, useState } from 'react';
import {
  IconActivity,
  IconChevronRight,
  IconCircleOff,
  IconDeviceGamepad3,
  IconGauge,
  IconHome2,
  IconMoon,
  IconPlus,
  IconSettings,
  IconSun,
} from '@tabler/icons-react';
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  useMatch,
  useNavigate,
} from 'react-router-dom';
import {
  ActionIcon,
  AppShell,
  Badge,
  Burger,
  Flex,
  Grid,
  Group,
  Image,
  NavLink,
  Skeleton,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ColorSchemeToggle } from '../ColorSchemeToggle/ColorSchemeToggle';
import { useConfigStore } from '../SettingsContext/SettingsContext';
import classes from './Layout.module.css';

export function Layout({ children }: { children: React.ReactNode }) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [opened, { toggle }] = useDisclosure();
  const connected = useConfigStore((state) => state.connected);
  const pollInputs = useConfigStore((state) => state.pollInputs);
  const activeProfile = useConfigStore((state) => state.currentProfile);
  const activeProfiles = useConfigStore((state) => state.activeProfiles);
  const profiles = useConfigStore((state) => state.config.profiles!);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const addProfile = useConfigStore((state) => state.addProfile);
  const nav = useNavigate();
  const profilePage = useMatch('/profiles');
  return (
    <>
      <AppShell
        header={{ height: 50 }}
        navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header>
          <Grid align="center">
            <Grid.Col span="auto">
              <Burger opened={opened} h={40} onClick={toggle} hiddenFrom="sm" size="sm" />
            </Grid.Col>
            <Grid.Col span={0}>
              <Image src="Icons/logoSide.png" height={40} fit="scale-down" alt="santroller" />
            </Grid.Col>
            <Grid.Col span="auto">
              <Flex justify="flex-end" align="center" direction="row" wrap="wrap">
                <ActionIcon variant="filled" aria-label="Theme" onClick={toggleColorScheme}>
                  {colorScheme == 'dark' && <IconSun />}
                  {colorScheme == 'light' && <IconMoon />}
                  {colorScheme == 'auto' && <IconMoon />}
                </ActionIcon>
              </Flex>
            </Grid.Col>
          </Grid>
        </AppShell.Header>
        <AppShell.Navbar p="md">
          <NavLink
            component={RouterNavLink}
            to="/"
            onClick={() => {
              pollInputs(false);
              nav('/');
            }}
            label="Main"
            leftSection={<IconSettings size={16} stroke={1.5} />}
          />
          {connected && (
            <>
              <NavLink
                component={RouterNavLink}
                to="/devices"
                onClick={() => {
                  pollInputs(false);
                  nav('/devices');
                }}
                label="Devices"
                leftSection={<IconSettings size={16} stroke={1.5} />}
              />
              <NavLink
                href="#profiles"
                label="Profiles"
                leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
                defaultOpened
              >
                {profiles.map((x, i) => (
                  <NavLink
                    key={x.uid}
                    component={RouterLink}
                    to="/profiles"
                    onClick={() => setActiveProfile(i.toString())}
                    active={profilePage != null && activeProfile == i}
                    label={x.name}
                    leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
                    rightSection={activeProfiles?.includes(x.uid) && <Badge>Active</Badge>}
                  />
                ))}
                <NavLink
                  href="#add-profile"
                  label="Add profile"
                  onClick={addProfile}
                  leftSection={<IconPlus size={16} stroke={1.5} />}
                ></NavLink>
              </NavLink>
            </>
          )}
        </AppShell.Navbar>
        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </>
  );
}
