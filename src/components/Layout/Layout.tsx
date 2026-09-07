import {
  IconAlertCircle,
  IconBuildingStore,
  IconCheck,
  IconChevronRight,
  IconDeviceFloppy,
  IconDeviceGamepad3,
  IconMoon,
  IconPiano,
  IconPlus,
  IconSettings,
  IconSun,
  IconTag,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Button,
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
  const { t } = useTranslation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [opened, { toggle }] = useDisclosure();
  const connected = useConfigStore((state) => state.connected);
  const hung = useConfigStore((state) => state.hung);
  const updating = useConfigStore((state) => state.updating);
  const pollInputs = useConfigStore((state) => state.pollInputs);
  const activeProfile = useConfigStore((state) => state.currentProfile);
  const currentProfileInstance = useConfigStore((state) => state.currentProfileInstance);
  const activeProfiles = useConfigStore((state) => state.activeProfiles);
  const profiles = useConfigStore((state) => state.config.profiles!);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const addProfile = useConfigStore((state) => state.addProfile);
  const toolInfo = useConfigStore((state) => state.toolInfo);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const configModified = useConfigStore((state) => state.configModified && state.connected);
  const nav = useNavigate();
  const profilePage = useMatch('/profiles');
  const seller = useConfigStore((state) => state.seller);
  const commitConfig = useConfigStore((state) => state.commitConfig);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = async () => {
    if (saveStatus === 'saving') {
      return;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveStatus('saving');
    try {
      await Promise.all([
        commitConfig(),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
      setSaveStatus('saved');
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);
    } catch (e) {
      console.error('Failed to save configuration:', e);
      setSaveStatus('error');
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  };

  useEffect(() => {
    if (configModified && saveStatus === 'saved') {
      setSaveStatus('idle');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    }
  }, [configModified, saveStatus]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const showSave = configModified || saveStatus !== 'idle';

  return (
    <>
      <AppShell
        header={{ height: showSave ? 80 : 50 }}
        navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header>
          <Grid align="center">
            <Grid.Col span="auto">
              <Burger opened={opened} h={40} onClick={toggle} hiddenFrom="sm" size="sm" />
            </Grid.Col>
            <Grid.Col span={0}>
              <Flex direction="column" align="center" gap={4}>
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
                {showSave && (
                  <Button
                    size="xs"
                    radius="md"
                    color={
                      saveStatus === 'saved'
                        ? 'teal'
                        : saveStatus === 'error'
                        ? 'red'
                        : saveStatus === 'saving'
                        ? 'blue'
                        : 'red'
                    }
                    loading={saveStatus === 'saving'}
                    loaderProps={{ type: 'dots' }}
                    leftSection={
                      saveStatus === 'saved' ? (
                        <IconCheck size={16} stroke={2.5} />
                      ) : saveStatus === 'error' ? (
                        <IconAlertCircle size={16} stroke={2} />
                      ) : saveStatus === 'saving' ? undefined : (
                        <IconDeviceFloppy size={16} stroke={1.5} />
                      )
                    }
                    onClick={
                      saveStatus === 'saved' || saveStatus === 'saving' ? undefined : handleSave
                    }
                    style={{
                      transition: 'all 200ms ease',
                      cursor: saveStatus === 'saved' ? 'default' : undefined,
                    }}
                  >
                    {saveStatus === 'saving'
                      ? t('save.saving', 'Saving...')
                      : saveStatus === 'saved'
                      ? t('save.saved', 'Saved!')
                      : saveStatus === 'error'
                      ? t('save.failed', 'Save failed')
                      : t('save.saveChanges', 'Save changes')}
                  </Button>
                )}
              </Flex>
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
                {profiles.flatMap((x, i) => {
                  const instanceCount =
                    activeProfiles?.filter((id) => id === x.opts.uid).length ?? 0;

                  if (instanceCount <= 1) {
                    const label = (
                      <Group gap="xs" justify="space-between" wrap="nowrap">
                        <span>{x.opts.name}</span>
                        {instanceCount === 1 && <Badge>Active</Badge>}
                      </Group>
                    );
                    return [
                      <NavLink
                        disabled={updating}
                        key={x.opts.uid}
                        component={RouterLink}
                        to="/profiles"
                        onClick={() => setActiveProfile(i.toString(), 0)}
                        active={
                          profilePage != null &&
                          activeProfile === i &&
                          currentProfileInstance === 0
                        }
                        label={label}
                        leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
                      />,
                    ];
                  }

                  // Profile is assigned multiple times (e.g. 2 gamepads and 2 drum kits) -> show each instance as a nav link item
                  return Array.from({ length: instanceCount }).map((_, instanceIdx) => {
                    const label = (
                      <Group gap="xs" justify="space-between" wrap="nowrap">
                        <span>{`${x.opts.name} (${instanceIdx + 1})`}</span>
                        <Badge>Active</Badge>
                      </Group>
                    );
                    return (
                      <NavLink
                        disabled={updating}
                        key={`${x.opts.uid}-instance-${instanceIdx}`}
                        component={RouterLink}
                        to="/profiles"
                        onClick={() => setActiveProfile(i.toString(), instanceIdx)}
                        active={
                          profilePage != null &&
                          activeProfile === i &&
                          currentProfileInstance === instanceIdx
                        }
                        label={label}
                        leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
                      />
                    );
                  });
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
