import {
  IconBuildingStore,
  IconChevronRight,
  IconDeviceGamepad3,
  IconMoon,
  IconPiano,
  IconPlus,
  IconSettings,
  IconSun,
  IconTag,
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
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useConfigStore } from '../SettingsContext/SettingsContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [opened, { toggle }] = useDisclosure();
  const connected = useConfigStore((state) => state.connected);
  const hung = useConfigStore((state) => state.hung);
  const updating = useConfigStore((state) => state.updating);
  const pollInputs = useConfigStore((state) => state.pollInputs);
  const activeProfile = useConfigStore((state) => state.currentProfile);
  const activeProfiles = useConfigStore((state) => state.activeProfiles);
  const currentProfileSource = useConfigStore((state) => state.currentProfileSource);
  const activeProfileDevices = useConfigStore((state) => state.activeProfileDevices);
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const profiles = useConfigStore((state) => state.config.profiles!);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const addProfile = useConfigStore((state) => state.addProfile);
  const toolInfo = useConfigStore((state) => state.toolInfo);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const nav = useNavigate();
  const profilePage = useMatch('/profiles');
  const seller = useConfigStore((state) => state.seller);
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
              <Image
                src={
                  toolInfo?.logo
                    ? URL.createObjectURL(
                        new Blob([new Uint8Array(toolInfo.logo)], { type: 'image/png' })
                      )
                    : 'Icons/logoSide.png'
                }
                height={40}
                fit="scale-down"
                alt="santroller"
              />
            </Grid.Col>
            <Grid.Col span="auto">
              <Flex justify="flex-end" align="center" direction="row" wrap="wrap">
                <ActionIcon variant="filled" aria-label="Theme" onClick={toggleColorScheme}>
                  {colorScheme === 'dark' && <IconSun />}
                  {colorScheme === 'light' && <IconMoon />}
                  {colorScheme === 'auto' && <IconMoon />}
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
          {!connected && (
            <NavLink
              component={RouterNavLink}
              to="/setup"
              onClick={() => {
                nav('/setup');
              }}
              label="Setup a new device"
              leftSection={<IconChevronRight size={16} stroke={1.5} />}
            />
          )}
          {connected && (
            <>
              {!simpleMode && (
                <NavLink
                  disabled={updating}
                  component={RouterNavLink}
                  to="/devices"
                  onClick={() => {
                    pollInputs(false);
                    nav('/devices');
                  }}
                  label="Devices"
                  leftSection={<IconSettings size={16} stroke={1.5} />}
                />
              )}
              {!simpleMode && (
                <NavLink
                  disabled={updating}
                  component={RouterNavLink}
                  to="/labels"
                  onClick={() => {
                    pollInputs(false);
                    nav('/labels');
                  }}
                  label="Pin Labels"
                  leftSection={<IconTag size={16} stroke={1.5} />}
                />
              )}
              {(!simpleMode || hung) && (
                <NavLink
                  disabled={updating}
                  component={RouterNavLink}
                  to="/debug"
                  onClick={() => {
                    pollInputs(false);
                    nav('/debug');
                  }}
                  label="Debug"
                  leftSection={<IconPiano size={16} stroke={1.5} />}
                />
              )}
              <NavLink
                disabled={updating}
                href="#profiles"
                label="Profiles"
                leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
                defaultOpened
              >
                {profiles.map((x, i) => {
                  const activeDevices = activeProfileDevices.filter(
                    (activeDevice) => activeDevice.profile === x.opts.uid
                  );
                  const label = (
                    <Group gap="xs" justify="space-between" wrap="nowrap">
                      <span>{x.opts.name}</span>
                      {activeProfiles?.includes(x.opts.uid) && <Badge>Active</Badge>}
                    </Group>
                  );
                  if (!activeDevices.length) {
                    return (
                      <NavLink
                        disabled={updating}
                        key={x.opts.uid}
                        component={RouterLink}
                        to="/profiles"
                        onClick={() => setActiveProfile(i.toString(), null)}
                        active={
                          profilePage != null && activeProfile === i && currentProfileSource == null
                        }
                        label={label}
                        leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
                      />
                    );
                  }
                  return (
                    <NavLink
                      disabled={updating}
                      key={x.opts.uid}
                      component={RouterLink}
                      to="/profiles"
                      onClick={() => setActiveProfile(i.toString(), null)}
                      active={profilePage != null && activeProfile === i && currentProfileSource == null}
                      label={label}
                      leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
                      defaultOpened={activeDevices.length > 0}
                    >
                      {activeDevices.map((activeDevice, activeDeviceIdx) => {
                        const device = deviceStatus[activeDevice.device.toString()];
                        const sourceId = activeDevice.sourceId ?? activeDevice.device;
                        const usbDevice = Object.values(device?.usbDevices ?? {}).find(
                          (usbDevice) => usbDevice.sourceId === sourceId
                        );
                        const deviceName = usbDevice?.name?.trim();
                        const label = deviceName
                          ? `${deviceName} (Device ${activeDevice.device})`
                          : `Device ${activeDevice.device}`;
                        return (
                          <NavLink
                            disabled={updating}
                            key={`${sourceId}-${activeDeviceIdx}`}
                            component={RouterLink}
                            to="/profiles"
                            onClick={() => setActiveProfile(i.toString(), sourceId)}
                            active={
                              profilePage != null &&
                              activeProfile === i &&
                              currentProfileSource === sourceId
                            }
                            label={label}
                            leftSection={<IconChevronRight size={16} stroke={1.5} />}
                            rightSection={<Badge>Active</Badge>}
                          />
                        );
                      })}
                    </NavLink>
                  );
                })}
                {!simpleMode && (
                  <NavLink
                    disabled={updating}
                    href="#add-profile"
                    label="Add profile"
                    onClick={addProfile}
                    leftSection={<IconPlus size={16} stroke={1.5} />}
                  />
                )}
              </NavLink>
            </>
          )}
          {(!simpleMode || seller) && (
            <NavLink
              disabled={updating}
              component={RouterNavLink}
              to="/commercial-tool"
              onClick={() => {
                pollInputs(false);
                nav('/commercial-tool');
              }}
              label="Commercial Tooling"
              leftSection={<IconBuildingStore size={16} stroke={1.5} />}
            />
          )}
        </AppShell.Navbar>
        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </>
  );
}
