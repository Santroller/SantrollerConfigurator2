import { useEffect, useRef, useState } from 'react';
import {
  IconAlertCircle,
  IconArrowBackUp,
  IconBook,
  IconBuildingStore,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconCopy,
  IconCpu,
  IconDeviceFloppy,
  IconDeviceGamepad2,
  IconDeviceGamepad3,
  IconGitCompare,
  IconGuitarPick,
  IconMoon,
  IconPiano,
  IconPlus,
  IconRocket,
  IconSettings,
  IconSun,
  IconTag,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  useLocation,
  useMatch,
  useNavigate,
} from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  ActionIcon,
  Alert,
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Flex,
  Grid,
  Group,
  Image,
  Modal,
  NavLink,
  Space,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { proto } from '../SettingsContext/config';
import { useConfigStore } from '../SettingsContext/SettingsContext';
import classes from './Layout.module.css';

const DEFAULT_NAVBAR_WIDTH = 340;
const MIN_NAVBAR_WIDTH = 220;
const MAX_NAVBAR_WIDTH = 640;
const NAVBAR_WIDTH_STORAGE_KEY = 'santroller_navbar_width';

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [opened, { toggle, close: closeNavbar }] = useDisclosure();
  const connected = useConfigStore((state) => state.connected);
  const hung = useConfigStore((state) => state.hung);
  const reloadLost = useConfigStore((state) => state.reloadLost && !state.connected);
  const deferredMode = useConfigStore((state) => (state.connected ? state.deferredMode : null));
  const updating = useConfigStore((state) => state.updating);
  const pollInputs = useConfigStore((state) => state.pollInputs);
  const activeProfile = useConfigStore((state) => state.currentProfile);
  const currentProfileInstance = useConfigStore((state) => state.currentProfileInstance);
  const activeProfiles = useConfigStore((state) => state.activeProfiles);
  const profiles = useConfigStore((state) => state.config.profiles!);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const addProfile = useConfigStore((state) => state.addProfile);
  const addStandbyProfile = useConfigStore((state) => state.addStandbyProfile);
  const cloneProfile = useConfigStore((state) => state.cloneProfile);
  const deleteProfile = useConfigStore((state) => state.deleteProfile);
  const moveProfile = useConfigStore((state) => state.moveProfile);
  const toolInfo = useConfigStore((state) => state.toolInfo);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const configModified = useConfigStore((state) => state.configModified && state.connected);
  const nav = useNavigate();
  const location = useLocation();
  const profilePage = useMatch('/profiles');
  const seller = useConfigStore((state) => state.seller);
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const discardChanges = useConfigStore((state) => state.discardChanges);
  const peripheralDevices = useConfigStore(
    useShallow((state) =>
      Object.values(state.deviceStatus).filter((status) => status.device?.peripheral != null)
    )
  );

  // When connected, the setup guide is reached through the Getting Started docs entry
  const isDocPage =
    (connected && location.pathname === '/setup') ||
    location.pathname.startsWith('/guides') ||
    location.pathname === '/guide' ||
    location.pathname === '/supported-hardware' ||
    location.pathname === '/hardware' ||
    location.pathname === '/compatibility' ||
    location.pathname === '/emulation-modes' ||
    location.pathname === '/differences' ||
    location.pathname === '/firmware-differences';

  const [docsOpened, setDocsOpened] = useState(isDocPage);

  useEffect(() => {
    if (isDocPage) {
      setDocsOpened(true);
    }
  }, [isDocPage]);

  const [navbarWidth, setNavbarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(NAVBAR_WIDTH_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_NAVBAR_WIDTH && parsed <= MAX_NAVBAR_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_NAVBAR_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isResizingRef.current = true;
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = navbarWidth;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isResizingRef.current) {
        return;
      }
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.min(
        Math.max(startWidth + delta, MIN_NAVBAR_WIDTH),
        Math.min(MAX_NAVBAR_WIDTH, window.innerWidth - 300)
      );
      setNavbarWidth(nextWidth);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (!isResizingRef.current) {
        return;
      }
      isResizingRef.current = false;
      setIsResizing(false);

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      const delta = upEvent.clientX - startX;
      const finalWidth = Math.min(
        Math.max(startWidth + delta, MIN_NAVBAR_WIDTH),
        Math.min(MAX_NAVBAR_WIDTH, window.innerWidth - 300)
      );
      try {
        localStorage.setItem(NAVBAR_WIDTH_STORAGE_KEY, String(Math.round(finalWidth)));
      } catch {
        // ignore
      }
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleResizeDoubleClick = () => {
    setNavbarWidth(DEFAULT_NAVBAR_WIDTH);
    try {
      localStorage.setItem(NAVBAR_WIDTH_STORAGE_KEY, String(DEFAULT_NAVBAR_WIDTH));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onWindowResize = () => {
      setNavbarWidth((current) => {
        const maxAllowed = Math.min(MAX_NAVBAR_WIDTH, window.innerWidth - 200);
        if (current > maxAllowed && maxAllowed >= MIN_NAVBAR_WIDTH) {
          return maxAllowed;
        }
        return current;
      });
    };
    window.addEventListener('resize', onWindowResize);
    return () => window.removeEventListener('resize', onWindowResize);
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [profileToDelete, setProfileToDelete] = useState<number | null>(null);
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
      await Promise.all([commitConfig(), new Promise((resolve) => setTimeout(resolve, 600))]);
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

  // The navbar covers the page on small screens, so close it once something in it was picked.
  // Picking a profile doesn't change the route, so that has to be watched too.
  useEffect(() => {
    closeNavbar();
  }, [location.pathname, location.search, activeProfile, currentProfileInstance, closeNavbar]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const showSave = configModified || saveStatus !== 'idle';
  const [discardOpened, setDiscardOpened] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const handleDiscard = async () => {
    setDiscarding(true);
    try {
      await discardChanges();
    } catch (e) {
      console.error('Failed to discard changes:', e);
    } finally {
      setDiscarding(false);
      setDiscardOpened(false);
    }
  };
  const targetProfile = profileToDelete !== null ? profiles[profileToDelete] : null;

  // Buttons shown on each profile's nav row; the link itself navigates, so clicks must not reach it
  const profileAction = (
    title: string,
    icon: React.ReactNode,
    onClick: () => void,
    color = 'gray',
    disabled = false
  ) => (
    <ActionIcon
      size="xs"
      variant="subtle"
      color={color}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
    >
      {icon}
    </ActionIcon>
  );
  // Standby lighting is always last, so it can't be moved and nothing moves below it
  const movableProfiles = profiles.filter((x) => !x.opts.standbyLighting).length;
  const profileActions = (i: number) => (
    <>
      {movableProfiles > 1 && !profiles[i]?.opts.standbyLighting && (
        <>
          {profileAction(
            t('main.move_profile_up', 'Move up'),
            <IconChevronUp size={13} />,
            () => moveProfile(i, i - 1),
            'gray',
            i === 0
          )}
          {profileAction(
            t('main.move_profile_down', 'Move down'),
            <IconChevronDown size={13} />,
            () => moveProfile(i, i + 1),
            'gray',
            i === movableProfiles - 1
          )}
        </>
      )}
      {!profiles[i]?.opts.standbyLighting &&
        profileAction(t('main.clone_profile'), <IconCopy size={13} />, () => cloneProfile(i))}
      {profiles.length > 1 &&
        profileAction(
          t('main.delete_profile'),
          <IconTrash size={13} />,
          () => setProfileToDelete(i),
          'red'
        )}
    </>
  );

  return (
    <>
      <Modal
        opened={profileToDelete !== null}
        onClose={() => setProfileToDelete(null)}
        title={t('delete_profile_dialog.title')}
        centered
      >
        {targetProfile?.opts?.name
          ? t('delete_profile_dialog.desc_named', {
              name: targetProfile.opts.name,
              defaultValue: t('delete_profile_dialog.desc'),
            })
          : t('delete_profile_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                if (profileToDelete !== null) {
                  deleteProfile(profileToDelete);
                  setProfileToDelete(null);
                }
              }}
              color="red"
            >
              {t('delete_profile_dialog.confirm')}
            </Button>
            <Button onClick={() => setProfileToDelete(null)}>
              {t('delete_profile_dialog.cancel')}
            </Button>
          </Group>
        </Flex>
      </Modal>
      <Modal
        opened={discardOpened}
        onClose={() => !discarding && setDiscardOpened(false)}
        title={t('save.discardTitle', 'Discard changes')}
        centered
      >
        {t(
          'save.discardDesc',
          'Everything changed since the last save will be lost, and the controller will go back to its saved config.'
        )}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button onClick={handleDiscard} loading={discarding} color="red">
              {t('save.discardConfirm', 'Discard changes')}
            </Button>
            <Button onClick={() => setDiscardOpened(false)} disabled={discarding}>
              {t('save.discardCancel', 'Cancel')}
            </Button>
          </Group>
        </Flex>
      </Modal>
      <AppShell
        // The header never changes height, so the page doesn't jump (eg mid drag) when there's something to save
        header={{ height: 50 }}
        navbar={{
          width: navbarWidth,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
        transitionDuration={isResizing ? 0 : 200}
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
                      : '/Icons/logoSide.png'
                  }
                  height={40}
                  fit="scale-down"
                  alt="santroller"
                />
              </Flex>
            </Grid.Col>
            <Grid.Col span="auto">
              <Flex justify="flex-end" align="center" direction="row" gap="xs" wrap="nowrap">
                {showSave && (
                  <Group gap="xs" wrap="nowrap">
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
                    {saveStatus === 'idle' && (
                      <Button
                        size="xs"
                        radius="md"
                        variant="default"
                        leftSection={<IconArrowBackUp size={16} stroke={1.5} />}
                        onClick={() => setDiscardOpened(true)}
                      >
                        {t('save.discard', 'Discard changes')}
                      </Button>
                    )}
                  </Group>
                )}
                <ActionIcon
                  variant="filled"
                  aria-label={t('layout.theme', 'Theme')}
                  onClick={toggleColorScheme}
                >
                  {colorScheme === 'dark' && <IconSun />}
                  {colorScheme === 'light' && <IconMoon />}
                  {colorScheme === 'auto' && <IconMoon />}
                </ActionIcon>
              </Flex>
            </Grid.Col>
          </Grid>
        </AppShell.Header>
        <AppShell.Navbar p={0} style={{ overflow: 'visible' }}>
          <Box p="md" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', height: '100%' }}>
            <NavLink
              component={RouterNavLink}
              to="/"
              onClick={() => {
                pollInputs(false);
                nav('/');
              }}
              label={t('nav.main', 'Main')}
              leftSection={<IconSettings size={16} stroke={1.5} />}
            />
            {!connected && (
              <NavLink
                component={RouterNavLink}
                to="/setup"
                onClick={() => {
                  nav('/setup');
                }}
                label={t('nav.setup', 'Setup a new device')}
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
                    label={t('nav.devices', 'Devices')}
                    leftSection={<IconSettings size={16} stroke={1.5} />}
                  />
                )}
                {!simpleMode && peripheralDevices.length > 0 && (
                  <NavLink
                    disabled={updating}
                    href="#peripherals"
                    label={t('nav.peripherals', 'Peripherals')}
                    leftSection={<IconCpu size={16} stroke={1.5} />}
                    defaultOpened
                  >
                    {peripheralDevices.map((pStatus) => {
                      const addrHex = (pStatus.device.peripheral?.address || 0x75).toString(16);
                      const currentParamId = new URLSearchParams(location.search).get('id');
                      const isActive =
                        location.pathname === '/peripherals' &&
                        (currentParamId === pStatus.id || (!currentParamId && pStatus.id === '0'));
                      return (
                        <NavLink
                          disabled={updating}
                          key={`peripheral-${pStatus.id}`}
                          component={RouterLink}
                          to={`/peripherals?id=${pStatus.id}`}
                          active={isActive}
                          label={t('nav.peripheralAddress', { address: `0x${addrHex}` })}
                          leftSection={<IconCpu size={16} stroke={1.5} />}
                        />
                      );
                    })}
                  </NavLink>
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
                    label={t('nav.pinLabels', 'Pin Labels')}
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
                    label={t('nav.debug', 'Debug')}
                    leftSection={<IconPiano size={16} stroke={1.5} />}
                  />
                )}
                <NavLink
                  disabled={updating}
                  href="#profiles"
                  label={t('nav.profiles', 'Profiles')}
                  leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
                  defaultOpened
                >
                  {profiles.flatMap((x, i) => {
                    const instanceCount =
                      activeProfiles?.filter((id) => id === x.opts.uid).length ?? 0;

                    if (instanceCount <= 1) {
                      const label = (
                        <Group
                          gap="xs"
                          justify="space-between"
                          wrap="nowrap"
                          style={{ width: '100%' }}
                        >
                          <span>{x.opts.name}</span>
                          <Group gap={4} wrap="nowrap">
                            {instanceCount === 1 && (
                              <Badge>{t('main.profile_active', 'Active')}</Badge>
                            )}
                            {!simpleMode && profileActions(i)}
                          </Group>
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
                          leftSection={
                            x.opts.standbyLighting ? (
                              <IconMoon size={16} stroke={1.5} />
                            ) : (
                              <IconDeviceGamepad3 size={16} stroke={1.5} />
                            )
                          }
                        />,
                      ];
                    }

                    // Profile is assigned multiple times (e.g. 2 gamepads and 2 drum kits) -> show each instance as a nav link item
                    return Array.from({ length: instanceCount }).map((_, instanceIdx) => {
                      const label = (
                        <Group
                          gap="xs"
                          justify="space-between"
                          wrap="nowrap"
                          style={{ width: '100%' }}
                        >
                          <span>{`${x.opts.name} (${instanceIdx + 1})`}</span>
                          <Group gap={4} wrap="nowrap">
                            <Badge>{t('main.profile_active', 'Active')}</Badge>
                            {!simpleMode && profileActions(i)}
                          </Group>
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
                      label={t('nav.addProfile', 'Add profile')}
                      onClick={addProfile}
                      leftSection={<IconPlus size={16} stroke={1.5} />}
                    />
                  )}
                  {!simpleMode && !profiles.some((x) => x.opts.standbyLighting) && (
                    <NavLink
                      disabled={updating}
                      href="#add-standby-lighting"
                      label={t('nav.addStandbyLighting')}
                      onClick={addStandbyProfile}
                      leftSection={<IconPlus size={16} stroke={1.5} />}
                    />
                  )}
                </NavLink>
              </>
            )}
            {/* The commercial tool works on a connected device, so there's nothing to show before one */}
            {connected && (!simpleMode || seller) && (
              <NavLink
                disabled={updating}
                component={RouterNavLink}
                to="/commercial-tool"
                onClick={() => {
                  pollInputs(false);
                  nav('/commercial-tool');
                }}
                label={t('nav.commercial', 'Commercial Tooling')}
                leftSection={<IconBuildingStore size={16} stroke={1.5} />}
              />
            )}
            {!simpleMode && (
              <NavLink
                href="#documentation"
                label={t('nav.documentation', 'Documentation')}
                leftSection={<IconBook size={16} stroke={1.5} />}
                opened={docsOpened}
                onChange={setDocsOpened}
              >
                {connected && (
                  <NavLink
                    component={RouterNavLink}
                    to="/setup"
                    onClick={() => {
                      pollInputs(false);
                      nav('/setup');
                    }}
                    active={location.pathname === '/setup'}
                    label={t('nav.gettingStarted', 'Getting Started')}
                    leftSection={<IconRocket size={16} stroke={1.5} />}
                  />
                )}
                <NavLink
                  component={RouterNavLink}
                  to="/guides"
                  onClick={() => {
                    pollInputs(false);
                    nav('/guides');
                  }}
                  active={location.pathname.startsWith('/guide')}
                  label={t('guides.navTitle', 'Build Guides & Docs')}
                  leftSection={<IconGuitarPick size={16} stroke={1.5} />}
                />
                <NavLink
                  component={RouterNavLink}
                  to="/supported-hardware"
                  onClick={() => {
                    pollInputs(false);
                    nav('/supported-hardware');
                  }}
                  active={
                    location.pathname === '/supported-hardware' || location.pathname === '/hardware'
                  }
                  label={t('nav.supportedHardware', 'Supported Hardware')}
                  leftSection={<IconCpu size={16} stroke={1.5} />}
                />
                <NavLink
                  component={RouterNavLink}
                  to="/compatibility"
                  onClick={() => {
                    pollInputs(false);
                    nav('/compatibility');
                  }}
                  active={
                    location.pathname === '/compatibility' ||
                    location.pathname === '/emulation-modes'
                  }
                  label={t('nav.compatibility', 'Console Compatibility')}
                  leftSection={<IconDeviceGamepad2 size={16} stroke={1.5} />}
                />
                <NavLink
                  component={RouterNavLink}
                  to="/differences"
                  onClick={() => {
                    pollInputs(false);
                    nav('/differences');
                  }}
                  active={
                    location.pathname === '/differences' ||
                    location.pathname === '/firmware-differences'
                  }
                  label={t('nav.differences', 'Firmware Differences')}
                  leftSection={<IconGitCompare size={16} stroke={1.5} />}
                />
              </NavLink>
            )}
          </Box>
          <Box
            visibleFrom="sm"
            className={`${classes.resizer} ${isResizing ? classes.resizerActive : ''}`}
            onPointerDown={handleResizePointerDown}
            onDoubleClick={handleResizeDoubleClick}
            title={t('layout.resizeSidebar', 'Drag to resize sidebar (double-click to reset)')}
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={Math.round(navbarWidth)}
            aria-valuemin={MIN_NAVBAR_WIDTH}
            aria-valuemax={MAX_NAVBAR_WIDTH}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const next = Math.max(MIN_NAVBAR_WIDTH, navbarWidth - 20);
                setNavbarWidth(next);
                try {
                  localStorage.setItem(NAVBAR_WIDTH_STORAGE_KEY, String(next));
                } catch {
                  // ignore
                }
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const next = Math.min(MAX_NAVBAR_WIDTH, navbarWidth + 20);
                setNavbarWidth(next);
                try {
                  localStorage.setItem(NAVBAR_WIDTH_STORAGE_KEY, String(next));
                } catch {
                  // ignore
                }
              } else if (e.key === 'Home') {
                e.preventDefault();
                setNavbarWidth(MIN_NAVBAR_WIDTH);
                try {
                  localStorage.setItem(NAVBAR_WIDTH_STORAGE_KEY, String(MIN_NAVBAR_WIDTH));
                } catch {
                  // ignore
                }
              } else if (e.key === 'End') {
                e.preventDefault();
                setNavbarWidth(MAX_NAVBAR_WIDTH);
                try {
                  localStorage.setItem(NAVBAR_WIDTH_STORAGE_KEY, String(MAX_NAVBAR_WIDTH));
                } catch {
                  // ignore
                }
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleResizeDoubleClick();
              }
            }}
          />
        </AppShell.Navbar>
        <AppShell.Main>
          {deferredMode !== null && (
            <>
              <Alert
                variant="light"
                color="blue"
                title={t('connect.modeDeferredTitle')}
                icon={<IconAlertCircle />}
              >
                {t('connect.modeDeferred', {
                  mode: t(`consoleMode.${proto.ConsoleMode[deferredMode]}`),
                })}
              </Alert>
              <Space h="md" />
            </>
          )}
          {reloadLost && (
            <>
              <Alert
                variant="light"
                color="yellow"
                title={t('connect.reloadLostTitle')}
                icon={<IconAlertCircle />}
                withCloseButton
                onClose={() => useConfigStore.setState({ reloadLost: false })}
              >
                {t('connect.reloadLost')}
              </Alert>
              <Space h="md" />
            </>
          )}
          {children}
        </AppShell.Main>
      </AppShell>
    </>
  );
}
