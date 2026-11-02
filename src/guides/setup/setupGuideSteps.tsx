import {
  IconAdjustments,
  IconAlertTriangle,
  IconBolt,
  IconBook,
  IconBulb,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCpu,
  IconDeviceFloppy,
  IconDeviceGamepad3,
  IconDownload,
  IconExclamationCircle,
  IconFileExport,
  IconHammer,
  IconHistory,
  IconInfoCircle,
  IconListCheck,
  IconMoon,
  IconPiano,
  IconPlug,
  IconPlus,
  IconSettings,
  IconTag,
  IconUpload,
} from '@tabler/icons-react';
import i18next from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Divider,
  FileButton,
  Group,
  Image,
  List,
  NavLink,
  Paper,
  Progress,
  Radio,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { getProfileSlotLabel, getRuleSummaryParts } from '@/components/Inputs/inputRegistry';
import { LEGACY_CONFIG_ACCEPT } from '@/components/Legacy/importLegacyConfig';
import { translateLegacyWarning } from '@/components/Legacy/warnings';
import { proto } from '@/components/SettingsContext/config';
import { truncateProfileName } from '@/components/SettingsContext/profileName';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { Uf2UpdateAlert } from '@/components/Uf2Update/Uf2UpdateAlert';
import { GuideList } from '../components/GuideList';
import { ConnectPrompt, StepActions } from '../components/StepActions';
import { StepWorkbench } from '../components/StepWorkbench';
import { GUIDE_REGISTRY } from '../registry';
import { GuideStepProps } from '../types';
import {
  BUILDS,
  extrasFor,
  MAIN_BUILDS,
  OTHER_BUILD,
  SetupBuild,
  SetupPath,
  useSetupPath,
} from './setupPath';

const strong = { strong: <strong /> };

const SETUP_PATHS = [
  { value: 'fresh', Icon: IconHammer },
  { value: 'santroller1', Icon: IconHistory },
] as const;

const CONCEPT_CARDS = [
  { key: 'firmware', color: 'blue', Icon: IconBolt },
  { key: 'devices', color: 'teal', Icon: IconCpu },
  { key: 'profiles', color: 'violet', Icon: IconAdjustments },
  { key: 'assignments', color: 'orange', Icon: IconListCheck },
] as const;

// One or more of the original getting started steps, each a title and a body
function StepSections({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  return (
    <Stack gap="md">
      {keys.map((key) => (
        <div key={key}>
          <Title order={4} mb={4}>
            {t(`gettingStarted.steps.${key}.title`)}
          </Title>
          <Text size="sm">
            <Trans i18nKey={`gettingStarted.steps.${key}.body`} components={strong} />
          </Text>
        </div>
      ))}
    </Stack>
  );
}

function GoodToKnow({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  return (
    <Accordion variant="separated" radius="md" multiple>
      {keys.map((key) => (
        <Accordion.Item key={key} value={key}>
          <Accordion.Control icon={<IconBulb size={16} />}>
            <Text size="sm" fw={600}>
              {t(`gettingStarted.goodToKnow.${key}.title`)}
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="sm">
              <Trans i18nKey={`gettingStarted.goodToKnow.${key}.body`} components={strong} />
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

function Troubleshooting({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  return (
    <Alert
      icon={<IconAlertTriangle size={18} />}
      title={t('gettingStarted.troubleshooting.title')}
      color="orange"
      radius="md"
    >
      <List size="sm" spacing="xs">
        {keys.map((key) => (
          <List.Item key={key}>
            <Trans i18nKey={`gettingStarted.troubleshooting.items.${key}`} components={strong} />
          </List.Item>
        ))}
      </List>
    </Alert>
  );
}

// Explains a step in terms of how Santroller 1 did the same thing, for those coming from it
export function Santroller1Note({ step }: { step: string }) {
  const { t } = useTranslation();
  const fromSantroller1 = useSetupPath((state) => state.path === 'santroller1');
  if (!fromSantroller1) {
    return null;
  }
  return (
    <Alert
      variant="light"
      color="blue"
      title={t('gettingStarted.santroller1.title')}
      icon={<IconHistory size={18} />}
    >
      <Text size="sm">
        <Trans i18nKey={`gettingStarted.santroller1.${step}`} components={strong} />
      </Text>
    </Alert>
  );
}

export function useStepText(id: string) {
  const { t } = useTranslation();
  return {
    title: t(`guides.setup.steps.${id}.title`),
    description: t(`guides.setup.steps.${id}.description`),
  };
}

// Picks the guide's path. Starting fresh is the default, so the guide works without choosing.
function PathPicker() {
  const { t } = useTranslation();
  const path = useSetupPath((state) => state.path);
  const setPath = useSetupPath((state) => state.setPath);
  return (
    <Stack gap="xs">
      <Title order={4}>{t('guides.setup.path.title')}</Title>
      <Radio.Group value={path} onChange={(value) => setPath(value as SetupPath)}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {SETUP_PATHS.map(({ value, Icon }) => (
            <Radio.Card
              key={value}
              value={value}
              radius="md"
              p="md"
              style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'flex-start' }}
            >
              <Group align="flex-start" gap="sm" wrap="nowrap">
                <Radio.Indicator mt={2} />
                <div>
                  <Group gap={6} mb={4}>
                    <Icon size={16} />
                    <Text size="sm" fw={600}>
                      {t(`guides.setup.path.${value}.title`)}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t(`guides.setup.path.${value}.body`)}
                  </Text>
                </div>
              </Group>
            </Radio.Card>
          ))}
        </SimpleGrid>
      </Radio.Group>
      {path === 'santroller1' && (
        <Alert variant="light" color="orange" icon={<IconAlertTriangle size={18} />}>
          <Text size="sm">
            <Trans
              i18nKey="guides.setup.path.avr"
              components={{
                legacyLink: (
                  <Anchor
                    href="https://legacy.santroller.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    inherit
                  />
                ),
              }}
            />
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

export function SetupOverviewStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const fromSantroller1 = useSetupPath((state) => state.path === 'santroller1');
  const cardDivider = { borderTop: '1px solid var(--mantine-color-default-border)' };

  const guideContent = (
    <Stack gap="md">
      <Alert
        variant="light"
        color="blue"
        title={t('guides.setup.seller.tipTitle')}
        icon={<IconInfoCircle size={18} />}
      >
        <Text size="sm">{t('guides.setup.seller.tip')}</Text>
      </Alert>
      <PathPicker />
      <Title order={4}>{t('gettingStarted.concepts.title')}</Title>
      {fromSantroller1 && <Text size="sm">{t('gettingStarted.santroller1.overview.intro')}</Text>}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {CONCEPT_CARDS.map(({ key, color, Icon }) => (
          <Card key={key} withBorder radius="md" p="md">
            <ThemeIcon color={color} variant="light" size="lg" radius="md" mb="xs">
              <Icon size={20} />
            </ThemeIcon>
            <Title order={5} mb={4}>
              {t(`gettingStarted.concepts.${key}.title`)}
            </Title>
            <Text size="xs" c="dimmed">
              <Trans i18nKey={`gettingStarted.concepts.${key}.body`} components={strong} />
            </Text>
            {/* What this replaces, next to the concept it explains */}
            {fromSantroller1 && (
              <Group align="flex-start" gap="xs" wrap="nowrap" mt="sm" pt="sm" style={cardDivider}>
                <IconHistory size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <Text size="xs">
                  <Trans
                    i18nKey={`gettingStarted.santroller1.overview.${key}`}
                    components={strong}
                  />
                </Text>
              </Group>
            )}
          </Card>
        ))}
      </SimpleGrid>
      {fromSantroller1 && (
        <Button
          component={Link}
          to="/differences"
          variant="subtle"
          size="xs"
          w="fit-content"
          leftSection={<IconHistory size={14} />}
        >
          {t('gettingStarted.santroller1.overview.more')}
        </Button>
      )}
      <div>
        <Title order={4} mb="xs">
          {t('guides.setup.actions.needTitle')}
        </Title>
        <GuideList
          boldAllIfNoColon={false}
          items={t('guides.setup.actions.needItems', { returnObjects: true })}
        />
      </div>
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('overview')} guideContent={guideContent} />;
}

const LAYOUT_REGIONS = ['save', 'main', 'board', 'profiles', 'docs'] as const;

const PROFILE_SECTIONS = [
  { key: 'settings', label: 'main.settings' },
  { key: 'assignments', label: 'assignments.title' },
  { key: 'inputs', label: 'inputs.title' },
  { key: 'leds', label: 'leds.section_title' },
] as const;

// The example profile's rule, built the same way the profile editor builds them
const MOCK_USB_AUTO: proto.IProfileAssignmentInfo = {
  consoleType: { consoleType: null, forcedType: null, xinputOnWindows: true, ps4OrPs5Mode: false },
};
const MOCK_WII_GUITAR: proto.IProfileAssignmentInfo = {
  wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar,
};
const MOCK_INPUTS = ['GuitarHeroGuitar_Green', 'GuitarHeroGuitar_Red', 'GuitarHeroGuitar_Whammy'];

// Marks the Wii guitar in the profile sketch, so its rule and the inputs reading it line up
const SLOT_COLOR = 'grape';

// Numbers a part of the layout sketch, matching the list under it
export function LayoutMarker({ n }: { n: number }) {
  return (
    <Badge circle size="sm" color="orange" style={{ flexShrink: 0 }}>
      {n}
    </Badge>
  );
}

// The numbered list explaining each part of a sketch
export function LayoutMarkerList({
  items,
  start = 1,
}: {
  items: { title: string; bodyKey: string; santroller1Key?: string }[];
  // The first marker's number, for a list carrying on from an earlier one
  start?: number;
}) {
  return (
    <Stack gap="sm">
      {items.map(({ title, bodyKey, santroller1Key }, i) => (
        <Group key={bodyKey} align="flex-start" gap="sm" wrap="nowrap">
          <LayoutMarker n={start + i} />
          <div>
            <Text size="sm" fw={600}>
              {title}
            </Text>
            <Text size="sm">
              <Trans i18nKey={bodyKey} components={strong} />
            </Text>
            {/* How Santroller 1 did the same thing, for those coming from it */}
            {santroller1Key && (
              <Group gap={6} align="flex-start" wrap="nowrap" mt={4}>
                <IconHistory
                  size={14}
                  color="var(--mantine-color-dimmed)"
                  style={{ flexShrink: 0, marginTop: 3 }}
                />
                <Text size="sm" c="dimmed">
                  <Trans i18nKey={santroller1Key} components={strong} />
                </Text>
              </Group>
            )}
          </div>
        </Group>
      ))}
    </Stack>
  );
}

// A profile page section in the sketch: its heading, add button and contents
function MockSection({
  n,
  title,
  add,
  children,
}: {
  n: number;
  title: string;
  add?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="xs">
          <Text size="sm" fw={700}>
            {title}
          </Text>
          {add && (
            <Button component="span" size="compact-xs">
              {add}
            </Button>
          )}
        </Group>
        <LayoutMarker n={n} />
      </Group>
      {children}
    </Stack>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Paper withBorder radius="sm" px="xs" py={4}>
        <Text size="xs" truncate>
          {value}
        </Text>
      </Paper>
    </Stack>
  );
}

function ProfileSketch() {
  const { t } = useTranslation();
  const ruleParts = getRuleSummaryParts([MOCK_USB_AUTO, MOCK_WII_GUITAR], t);
  const wiiSlot = getProfileSlotLabel(MOCK_WII_GUITAR, 1, t);
  const row = { border: '1px solid var(--mantine-color-default-border)', borderRadius: 4 };

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="sm">
        <MockSection n={1} title={t('main.settings')}>
          <SimpleGrid cols={2} spacing="xs">
            <MockField
              label={t('main.profile_name.label')}
              value={t('gettingStarted.layout.mock.profileWii')}
            />
            <MockField
              label={t('main.device_to_emulate.label')}
              value={t('subType.GuitarHeroGuitar')}
            />
          </SimpleGrid>
        </MockSection>
        <Divider />
        <MockSection n={2} title={t('assignments.title')} add={t('assignments.add')}>
          <Group gap={6} px="xs" py={6} style={row}>
            <Text size="xs" fw={700}>
              {t('assignments.rule_title', { num: 1 })}
            </Text>
            <Badge size="xs">{t('state.active')}</Badge>
            {/* The target comes first, then the connected controllers */}
            {ruleParts.map((part, i) => (
              <Badge
                key={part}
                size="sm"
                variant="light"
                color={i === 0 ? 'teal' : SLOT_COLOR}
                tt="none"
              >
                {part}
              </Badge>
            ))}
          </Group>
        </MockSection>
        <Divider />
        <MockSection n={3} title={t('inputs.title')} add={t('inputs.add')}>
          {MOCK_INPUTS.map((output) => (
            <Group key={output} justify="space-between" gap="xs" px="xs" py={4} style={row}>
              <Text size="xs" fw={600}>
                {t(`outputs.${output}`)}
              </Text>
              <Badge size="sm" variant="light" color={SLOT_COLOR} tt="none">
                {wiiSlot}
              </Badge>
            </Group>
          ))}
        </MockSection>
        <Divider />
        <MockSection n={4} title={t('leds.section_title')} add={t('leds.add')}>
          <Group gap="xs" px="xs" py={4} style={row}>
            <Box
              w={10}
              h={10}
              bg="green"
              style={{ borderRadius: '50%', flexShrink: 0 }}
              aria-hidden
            />
            <Text size="xs">{t('gettingStarted.layout.mock.ledRow')}</Text>
          </Group>
        </MockSection>
      </Stack>
    </Paper>
  );
}

// A sidebar entry in the layout sketch, drawn like the real one but not clickable
function MockNavItem({
  Icon,
  label,
  marker,
  indent,
  badge,
}: {
  Icon: typeof IconSettings;
  label: string;
  marker?: number;
  indent?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <Group gap={6} px="xs" py={4} pl={indent ? 'lg' : 'xs'} wrap="nowrap">
      <Icon size={14} stroke={1.5} />
      <Text size="xs" style={{ flex: 1 }} truncate>
        {label}
      </Text>
      {badge}
      {marker !== undefined && <LayoutMarker n={marker} />}
    </Group>
  );
}

export function SetupLayoutStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const border = '1px solid var(--mantine-color-default-border)';

  const sketch = (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <Group justify="space-between" px="xs" py={6} wrap="nowrap" style={{ borderBottom: border }}>
        <Image src="/Icons/logoSide.png" h={20} w="auto" fit="contain" alt="santroller" />
        <Group gap={6} wrap="nowrap">
          <Button
            size="compact-xs"
            color="red"
            leftSection={<IconDeviceFloppy size={12} />}
            tabIndex={-1}
          >
            {t('save.saveChanges', 'Save changes')}
          </Button>
          <LayoutMarker n={1} />
        </Group>
      </Group>
      <Group align="stretch" gap={0} wrap="nowrap">
        {/* Fills the sketch on phones, where the page area is left out */}
        <Stack
          gap={0}
          py={4}
          w={{ base: '100%', xs: 210 }}
          style={{ flexShrink: 0, borderRight: border }}
        >
          <MockNavItem Icon={IconSettings} label={t('nav.main')} marker={2} />
          <MockNavItem Icon={IconSettings} label={t('nav.devices')} marker={3} />
          <MockNavItem Icon={IconTag} label={t('nav.pinLabels')} />
          <MockNavItem Icon={IconPiano} label={t('nav.debug')} />
          <MockNavItem Icon={IconDeviceGamepad3} label={t('nav.profiles')} marker={4} />
          <MockNavItem
            Icon={IconDeviceGamepad3}
            label={t('gettingStarted.layout.mock.profileWii')}
            indent
            badge={<Badge size="xs">{t('main.profile_active', 'Active')}</Badge>}
          />
          <MockNavItem
            Icon={IconDeviceGamepad3}
            label={t('gettingStarted.layout.mock.profileBluetooth')}
            indent
          />
          <MockNavItem Icon={IconPlus} label={t('nav.addProfile')} indent />
          <MockNavItem Icon={IconBook} label={t('nav.documentation')} marker={5} />
        </Stack>
        <Center visibleFrom="xs" p="md" style={{ flex: 1 }}>
          <Text size="xs" c="dimmed" ta="center">
            {t('gettingStarted.layout.mock.page')}
          </Text>
        </Center>
      </Group>
    </Paper>
  );

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t('gettingStarted.layout.intro')}</Text>
      {sketch}
      <LayoutMarkerList
        items={LAYOUT_REGIONS.map((key) => ({
          title: t(`gettingStarted.layout.regions.${key}.title`),
          bodyKey: `gettingStarted.layout.regions.${key}.body`,
        }))}
      />
      <Alert
        variant="light"
        color="blue"
        title={t('gettingStarted.layout.keyIdea.title')}
        icon={<IconBulb size={18} />}
      >
        <Text size="sm">
          <Trans i18nKey="gettingStarted.layout.keyIdea.body" components={strong} />
        </Text>
      </Alert>
      <GoodToKnow keys={['simpleMode']} />
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('layout')} guideContent={guideContent} />;
}

const DEVICE_PARTS = ['status', 'pins', 'add'] as const;

// A device card in the devices sketch, drawn like the real one: its artwork, name and status
function MockDeviceCard({
  image,
  title,
  status,
  connected,
  children,
}: {
  image: string;
  title: string;
  status: string;
  connected: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="xs" align="stretch">
        {/* The covers are monochrome glyphs, masked so they follow the colour scheme */}
        <Box
          h={48}
          aria-hidden
          style={{
            backgroundColor: 'var(--mantine-color-text)',
            mask: `url(${image}) center / contain no-repeat`,
            WebkitMask: `url(${image}) center / contain no-repeat`,
          }}
        />
        <Text size="sm" fw={700} ta="center">
          {title}
        </Text>
        <Group justify="center" gap={6} wrap="nowrap">
          <Badge size="sm" color={connected ? 'blue' : 'red'} tt="none">
            {status}
          </Badge>
          <LayoutMarker n={1} />
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}

// The Devices page, with a Wii guitar plugged into the board and nothing in its USB host port yet
function DevicesSketch() {
  const { t } = useTranslation();
  return (
    <Paper withBorder radius="md" p="sm">
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        <MockDeviceCard
          image="/covers/devices/wii.svg"
          title={t('devices.wii')}
          status={t('connected_with_type', { type: t('wii.extensions.WiiGuitarHeroGuitar') })}
          connected
        >
          <Group align="flex-end" gap="xs" wrap="nowrap">
            <SimpleGrid cols={2} spacing="xs" style={{ flex: 1 }}>
              <MockField
                label={t('i2c.sda.label')}
                value={t('i2c.sda.pin', { pin: 18, channel: 1 })}
              />
              <MockField
                label={t('i2c.scl.label')}
                value={t('i2c.scl.pin', { pin: 19, channel: 1 })}
              />
            </SimpleGrid>
            <LayoutMarker n={2} />
          </Group>
        </MockDeviceCard>
        <MockDeviceCard
          image="/covers/devices/usbHost.svg"
          title={t('devices.usbHost')}
          status={t('disconnected')}
          connected={false}
        />
      </SimpleGrid>
      <Group justify="flex-end" gap={6} mt="sm">
        <LayoutMarker n={3} />
        <ThemeIcon radius="xl" size={36}>
          <IconPlus size={20} stroke={1.5} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

// What the Devices page holds, before any are added, so the build steps that add them make sense
export function SetupDevicesIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const D = 'gettingStarted.devicesPage';

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${D}.intro`)}</Text>
      <DevicesSketch />
      <LayoutMarkerList
        items={DEVICE_PARTS.map((key) => ({
          title: t(`${D}.parts.${key}.title`),
          bodyKey: `${D}.parts.${key}.body`,
        }))}
      />
      <Alert
        variant="light"
        color="blue"
        title={t(`${D}.shared.title`)}
        icon={<IconBulb size={18} />}
      >
        <Text size="sm">
          <Trans i18nKey={`${D}.shared.body`} components={strong} />
        </Text>
      </Alert>
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('devicesIntro')} guideContent={guideContent} />;
}

// What's inside a profile, from top to bottom, ending on the assignments the next step explains
export function SetupProfilesIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const P = 'gettingStarted.profilePage';

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.intro`)}</Text>
      <ProfileSketch />
      <LayoutMarkerList
        items={PROFILE_SECTIONS.map(({ key, label }) => ({
          title: t(label),
          bodyKey: `${P}.sections.${key}`,
        }))}
      />
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('profilesIntro')} guideContent={guideContent} />;
}

export function SetupFlashStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const fromSantroller1 = useSetupPath((state) => state.path === 'santroller1');

  const guideContent = (
    <Stack gap="md">
      {!fromSantroller1 && (
        <Alert
          variant="light"
          color="red"
          title={t('connect.sellerWarningTitle', 'Note')}
          icon={<IconExclamationCircle />}
        >
          {t('connect.sellerWarning')}
        </Alert>
      )}
      <Text size="sm">
        {/* Santroller 1 can put the Pico in its bootloader itself, so there's no BOOTSEL */}
        <Trans
          i18nKey={
            fromSantroller1 ? 'gettingStarted.santroller1.flash' : 'gettingStarted.steps.flash.body'
          }
          components={strong}
        />
      </Text>
      {fromSantroller1 && <Santroller1Sketch focus="revert" />}
      <Group gap="xs">
        <Button
          component="a"
          download="santroller_pico1.uf2"
          href={`santroller_pico1.uf2?v=${__CONFIGURATOR_COMMIT__}`}
          target="_blank"
          leftSection={<IconDownload size={16} />}
        >
          {t('connect.downloadPico1')}
        </Button>
        <Button
          component="a"
          download="santroller_pico2.uf2"
          href={`santroller_pico2.uf2?v=${__CONFIGURATOR_COMMIT__}`}
          target="_blank"
          leftSection={<IconDownload size={16} />}
        >
          {t('connect.downloadPico2')}
        </Button>
      </Group>
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('flash')} guideContent={guideContent} />;
}

// The Santroller 1 configurator's sections, with the icons it used for them
const S1_SECTIONS = [
  { key: 'controllerSettings', icon: 'controller' },
  { key: 'pollSettings', icon: 'poll' },
  { key: 'presets', icon: 'presets' },
  { key: 'ledSettings', icon: 'leds' },
] as const;

const S1_SIDEBAR = [
  'addSetting',
  'saveSettings',
  'loadDefaults',
  'configureAll',
  'revert',
  'backToMenu',
] as const;

// One row of the Santroller 1 presets section: a label on the left and its control on the right
function S1Row({
  label,
  marker,
  children,
}: {
  label: string;
  marker?: number;
  children: React.ReactNode;
}) {
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <Text size="xs" w="45%" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <Box w={22} style={{ flexShrink: 0 }}>
        {marker !== undefined && <LayoutMarker n={marker} />}
      </Box>
    </Group>
  );
}

function S1Button({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <Button
      component="span"
      size="compact-xs"
      variant={color ? 'filled' : 'default'}
      color={color}
      fullWidth
      styles={{ label: { overflow: 'hidden', textOverflow: 'ellipsis' } }}
    >
      {children}
    </Button>
  );
}

// A simplified copy of the Santroller 1 configurator, pointing out the presets section (for exporting)
// or the sidebar's Revert Device to Arduino button (for flashing). On phones only that half is shown.
function Santroller1Sketch({ focus }: { focus: 'presets' | 'revert' }) {
  const { t } = useTranslation();
  const k = (key: string) => `gettingStarted.santroller1.sketch.${key}`;
  const presetName = t(k('presetName'));

  const sidebar = (
    <Stack
      gap={6}
      p="xs"
      w={{ base: '100%', sm: 220 }}
      bg="var(--mantine-color-default-hover)"
      style={{ flexShrink: 0, borderRight: '1px solid var(--mantine-color-default-border)' }}
      visibleFrom={focus === 'presets' ? 'sm' : undefined}
    >
      {S1_SIDEBAR.map((key) => (
        <Group key={key} gap={6} wrap="nowrap">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <S1Button color={key === 'saveSettings' ? 'yellow' : undefined}>{t(k(key))}</S1Button>
          </Box>
          {focus === 'revert' && key === 'revert' && <LayoutMarker n={1} />}
        </Group>
      ))}
    </Stack>
  );

  const sections = (
    <Stack
      gap={4}
      p="xs"
      style={{ flex: 1, minWidth: 0 }}
      visibleFrom={focus === 'revert' ? 'sm' : undefined}
    >
      {S1_SECTIONS.map(({ key, icon }) => {
        const open = focus === 'presets' && key === 'presets';
        return (
          <Paper key={key} withBorder radius="sm" p={6}>
            <Group gap="xs" wrap="nowrap">
              <Image src={`/guides/santroller1/${icon}.png`} w={28} h={28} alt="" />
              <Text size="xs" fw={600} style={{ flex: 1 }}>
                {t(k(key))}
              </Text>
              {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </Group>
            {open && (
              <Stack gap={6} mt="xs" px={4} pb={4}>
                <S1Row label={t(k('importSettings'))}>
                  <S1Button>{t(k('importSettings'))}</S1Button>
                </S1Row>
                <S1Row label={t(k('exportSettings'))} marker={1}>
                  <S1Button>{t(k('exportSettings'))}</S1Button>
                </S1Row>
                <S1Row label={t(k('createPreset'))}>
                  <Paper withBorder radius="sm" h={22} />
                </S1Row>
                <S1Row label={t(k('presets'))} marker={2}>
                  <Paper withBorder radius="sm" px={6} py={2}>
                    <Group justify="space-between" wrap="nowrap" gap={4}>
                      <Text size="xs" truncate>
                        {presetName}
                      </Text>
                      <IconChevronDown size={12} style={{ flexShrink: 0 }} />
                    </Group>
                  </Paper>
                </S1Row>
                <S1Row label={t(k('loadPreset'))} marker={3}>
                  <S1Button>{t(k('loadFrom'), { name: presetName })}</S1Button>
                </S1Row>
                <S1Row label={t(k('deletePreset'))}>
                  <S1Button>{t(k('deleteNamed'), { name: presetName })}</S1Button>
                </S1Row>
              </Stack>
            )}
          </Paper>
        );
      })}
    </Stack>
  );

  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <Group align="stretch" gap={0} wrap="nowrap">
        {sidebar}
        {sections}
      </Group>
    </Paper>
  );
}

const EXPORT_MARKERS = ['export', 'pick', 'load'] as const;

export function SetupExportStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Alert
        variant="light"
        color="orange"
        title={t('gettingStarted.santroller1.export.warningTitle')}
        icon={<IconAlertTriangle size={18} />}
      >
        <Text size="sm">{t('gettingStarted.santroller1.export.warning')}</Text>
      </Alert>
      <Text size="sm">
        <Trans i18nKey="gettingStarted.santroller1.export.body" components={strong} />
      </Text>
      <Santroller1Sketch focus="presets" />
      <LayoutMarkerList
        items={EXPORT_MARKERS.map((key) => ({
          title: t(`gettingStarted.santroller1.export.markers.${key}.title`),
          bodyKey: `gettingStarted.santroller1.export.markers.${key}.body`,
        }))}
      />
      <Text size="sm">
        <Trans i18nKey="gettingStarted.santroller1.export.files" components={strong} />
      </Text>
      <Text size="sm">{t('gettingStarted.santroller1.export.wiring')}</Text>
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('export')} guideContent={guideContent} />;
}

// The device's profiles, each opening its page, with a button to add another
function ProfileList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profiles = useConfigStore((state) => state.config.profiles);
  const activeProfiles = useConfigStore((state) => state.activeProfiles);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const addProfile = useConfigStore((state) => state.addProfile);
  return (
    <Paper withBorder radius="md" p="xs">
      <Text fw={700} size="sm" px="xs" pb={4}>
        {t('guides.setup.actions.profilesTitle')}
      </Text>
      {(profiles ?? []).map((profile, i) => (
        <NavLink
          key={profile.opts?.uid ?? i}
          label={profile.opts?.name}
          leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
          rightSection={
            activeProfiles?.includes(profile.opts?.uid ?? -1) && (
              <Badge>{t('main.profile_active', 'Active')}</Badge>
            )
          }
          onClick={() => {
            setActiveProfile(i.toString(), 0);
            navigate('/profiles');
          }}
        />
      ))}
      <NavLink
        label={t('guides.setup.actions.addProfile')}
        leftSection={<IconPlus size={16} stroke={1.5} />}
        onClick={addProfile}
      />
    </Paper>
  );
}

export function SetupImportStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const updating = useConfigStore((state) => state.updating);
  const importLegacyConfig = useConfigStore((state) => state.importLegacyConfig);
  const warnings = useConfigStore((state) => state.legacyImportWarnings);

  const guideContent = (
    <Stack gap="md">
      <StepSections keys={['santroller1Import']} />
      <StepActions>
        <Group>
          <FileButton onChange={importLegacyConfig} accept={LEGACY_CONFIG_ACCEPT} multiple>
            {(buttonProps) => (
              <Button {...buttonProps} disabled={updating} leftSection={<IconUpload size={16} />}>
                {t('connect.importLegacy')}
              </Button>
            )}
          </FileButton>
        </Group>
      </StepActions>
      <Alert variant="light" color="orange" icon={<IconAlertTriangle size={18} />}>
        <Text size="sm">{t('gettingStarted.santroller1.import.replaces')}</Text>
      </Alert>
      <StepSections keys={['santroller1Warnings']} />
      {warnings.length > 0 && (
        <Alert
          variant="light"
          color="yellow"
          title={t('connect.legacyImportTitle')}
          icon={<IconExclamationCircle />}
        >
          <List size="sm">
            {warnings
              .map((warning) => translateLegacyWarning(t, warning))
              .map((warning) => (
                <List.Item key={warning}>{warning}</List.Item>
              ))}
          </List>
        </Alert>
      )}
      <StepSections keys={['santroller1Check']} />
      <StepActions prompt={false}>
        <Stack gap="sm">
          <Group>
            <Button component={Link} to="/devices" leftSection={<IconCpu size={16} />}>
              {t('guides.setup.actions.openDevices')}
            </Button>
          </Group>
          <ProfileList />
        </Stack>
      </StepActions>
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('import')} guideContent={guideContent} />;
}

export function SetupWireStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">
        <Trans i18nKey="gettingStarted.steps.wire.body" components={strong} />
      </Text>
      <Group gap="xs">
        <Button component={Link} to="/guides" leftSection={<IconPlug size={16} />}>
          {t('gettingStarted.links.guides')}
        </Button>
        <Button
          component={Link}
          to="/supported-hardware"
          variant="light"
          leftSection={<IconCpu size={16} />}
        >
          {t('nav.supportedHardware', 'Supported Hardware')}
        </Button>
      </Group>
      <GoodToKnow keys={['peripherals']} />
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('wire')} guideContent={guideContent} />;
}

export function SetupConnectStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const hung = useConfigStore((state) => state.hung);
  const latest = useConfigStore((state) => state.latest);
  const firmwareNewer = useConfigStore((state) => state.firmwareNewer);
  const updating = useConfigStore((state) => state.updating);
  const updatePercentage = useConfigStore((state) => state.updatePercentage);
  const applyingUpdate = useConfigStore((state) => state.applyingUpdate);
  const firmwareUpdate = useConfigStore((state) => state.firmwareUpdate);
  const bootloaderOutdated = useConfigStore((state) => state.bootloaderOutdated);
  const slowBootStage = useConfigStore((state) => state.slowBootStage);

  // The main page has the full set of update messages; this covers the common case
  const updateStatus = connected && !hung && (
    <>
      {bootloaderOutdated || slowBootStage ? (
        <Uf2UpdateAlert />
      ) : !latest && !firmwareNewer ? (
        <Alert
          variant="light"
          color="red"
          title={t('connect.outdatedTitle')}
          icon={<IconExclamationCircle />}
        >
          <Stack gap="xs">
            <Text size="sm">{t('connect.outdated')}</Text>
            <Button disabled={updating} onClick={firmwareUpdate}>
              {t('connect.startUpdate')}
            </Button>
            <Progress size="xl" value={updatePercentage} />
            {applyingUpdate && <Text size="sm">{t('connect.applyingUpdate')}</Text>}
          </Stack>
        </Alert>
      ) : (
        <Alert variant="light" color="teal" icon={<IconCheck />}>
          {t('guides.setup.actions.upToDate')}
        </Alert>
      )}
    </>
  );

  const guideContent = (
    <Stack gap="md">
      <StepSections keys={['connect']} />
      {!connected && <ConnectPrompt promptKey="guides.setup.actions.connectStepPrompt" />}
      <StepSections keys={['update']} />
      {updateStatus}
      <GoodToKnow keys={['desktopApp', 'simpleMode']} />
      <Troubleshooting keys={['notFound', 'linux', 'newerFirmware']} />
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('connect')} guideContent={guideContent} />;
}

// Adds a profile for a build, named after it. A build that only uses the board's own pins claims
// them, as the profile wizard does for a profile with no connected controller.
function addBuildProfile(build: SetupBuild) {
  const store = useConfigStore.getState();
  store.addProfile();
  const { config, currentProfile } = useConfigStore.getState();
  const profile = config.profiles?.[currentProfile];
  if (!profile) {
    return;
  }
  const rule = profile.assignments?.[0]?.assignments ?? [];
  store.updateProfile(
    {
      ...profile,
      opts: {
        ...profile.opts,
        name: truncateProfileName(i18next.t(`guides.setup.build.names.${build}`)),
      },
      assignments: BUILDS[build]?.wired
        ? [{ assignments: [...rule, { localInputs: {} }] }]
        : profile.assignments,
    },
    currentProfile
  );
}

// Makes sure there's a profile for a build guide to set up, and that it's the one being edited
function useBuildProfile(build: SetupBuild | null) {
  const profiles = useConfigStore((state) => state.config.profiles);
  const currentProfile = useConfigStore((state) => state.currentProfile);
  const current = profiles?.[currentProfile];
  const target = current && !current.opts?.standbyLighting ? current : undefined;

  const ensure = () => {
    const state = useConfigStore.getState();
    if (!state.connected || !build) {
      return;
    }
    const list = state.config.profiles ?? [];
    if (list[state.currentProfile] && !list[state.currentProfile].opts?.standbyLighting) {
      return;
    }
    const first = list.findIndex((profile) => !profile.opts?.standbyLighting);
    if (first === -1) {
      addBuildProfile(build);
    } else {
      state.setActiveProfile(first.toString(), 0);
    }
  };

  return { target, ensure, addNew: () => build && addBuildProfile(build) };
}

export function SetupBuildStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const build = useSetupPath((state) => state.build);
  const setBuild = useSetupPath((state) => state.setBuild);
  const extras = useSetupPath((state) => state.extras);
  const setExtras = useSetupPath((state) => state.setExtras);
  const { target, ensure, addNew } = useBuildProfile(build);
  const guided = build != null && build !== OTHER_BUILD;
  // The USB host and adapter builds only add the driver, and a later step makes a profile for each
  // kind of controller plugged in, so they need no profile of their own. MIDI DIN still does, as
  // its guide sets the drum kit up itself.
  const plugIn = guided ? BUILDS[build]?.plugIn : undefined;
  const needsProfile = guided && (!plugIn || plugIn === 'midi');
  const B = 'guides.setup.build';

  const options = [
    ...MAIN_BUILDS.filter((id) => GUIDE_REGISTRY[id]).map((id) => ({
      value: id,
      title: t(`guides.${id}.title`),
      body: t(`guides.${id}.subtitle`),
    })),
    { value: OTHER_BUILD, title: t(`${B}.other.title`), body: t(`${B}.other.body`) },
  ];

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${B}.intro`)}</Text>
      <Radio.Group value={build ?? ''} onChange={setBuild}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          {options.map(({ value, title, body }) => (
            <Radio.Card
              key={value}
              value={value}
              radius="md"
              p="md"
              style={{ display: 'flex', alignItems: 'flex-start' }}
            >
              <Group align="flex-start" gap="sm" wrap="nowrap">
                <Radio.Indicator mt={2} />
                <div>
                  <Text size="sm" fw={600}>
                    {title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {body}
                  </Text>
                </div>
              </Group>
            </Radio.Card>
          ))}
        </SimpleGrid>
      </Radio.Group>
      {/* Parts that go on top of the build, whose guides then run as part of this one */}
      {build && (
        <div>
          <Title order={4} mb={4}>
            {t(`${B}.extrasTitle`)}
          </Title>
          <Text size="sm" c="dimmed" mb="sm">
            {t(`${B}.extrasIntro`)}
          </Text>
          <Checkbox.Group value={extras} onChange={setExtras}>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
              {extrasFor(build).map((extra) => (
                <Checkbox.Card
                  key={extra}
                  value={extra}
                  radius="md"
                  p="md"
                  style={{ display: 'flex', alignItems: 'flex-start' }}
                >
                  <Group align="flex-start" gap="sm" wrap="nowrap">
                    <Checkbox.Indicator mt={2} />
                    <div>
                      <Text size="sm" fw={600}>
                        {t(`${B}.extras.${extra}.title`)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {/* A USB host build already has the port the controller plugs into */}
                        {t(
                          extra === 'xbox-auth' && BUILDS[build]?.plugIn === 'usb'
                            ? `${B}.extras.${extra}.bodyUsbHost`
                            : `${B}.extras.${extra}.body`
                        )}
                      </Text>
                    </div>
                  </Group>
                </Checkbox.Card>
              ))}
            </SimpleGrid>
          </Checkbox.Group>
        </div>
      )}
      {needsProfile && (
        <StepActions>
          <Paper withBorder radius="md" p="sm">
            <Group justify="space-between" gap="sm">
              <Text size="sm">
                {target ? (
                  <Trans
                    i18nKey={`${B}.profile`}
                    values={{ name: target.opts?.name }}
                    components={strong}
                  />
                ) : (
                  t(`${B}.newProfile`)
                )}
              </Text>
              {target && (
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={addNew}
                >
                  {t(`${B}.useNew`)}
                </Button>
              )}
            </Group>
          </Paper>
        </StepActions>
      )}
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useStepText('build')}
      // The build guide's steps edit the current profile, so there has to be one by then
      onNext={() => {
        if (needsProfile) {
          ensure();
        }
        props.onNext?.();
      }}
      guideContent={guideContent}
    />
  );
}

export function SetupDevicesStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const deviceCount = useConfigStore((state) => Object.keys(state.deviceStatus).length);

  const guideContent = (
    <Stack gap="md">
      <StepSections keys={['devices']} />
      <StepActions>
        <Group gap="sm">
          <Button component={Link} to="/devices" leftSection={<IconCpu size={16} />}>
            {t('guides.setup.actions.openDevices')}
          </Button>
          <Text size="sm" c="dimmed">
            {t('guides.setup.actions.deviceCount', { count: deviceCount })}
          </Text>
        </Group>
      </StepActions>
      <GoodToKnow keys={['peripherals', 'sharedPins', 'labels']} />
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('devices')} guideContent={guideContent} />;
}

export function SetupProfileStep(props: GuideStepProps) {
  const guideContent = (
    <Stack gap="md">
      <StepSections keys={['profile']} />
      <StepActions>
        <ProfileList />
      </StepActions>
      <StepSections keys={['inputs', 'leds']} />
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('profile')} guideContent={guideContent} />;
}

// The parts of the standby profile's page the sketch points out, with the labels the page uses
const STANDBY_PARTS = [
  { key: 'whileSuspended', label: 'main.standbyLighting.whileSuspended.label' },
  { key: 'controllers', label: 'main.standbyLighting.controllers.label' },
  { key: 'wake', label: 'main.standbyLighting.wake.label' },
  { key: 'leds', label: 'leds.section_title' },
] as const;

// A simplified copy of the standby profile's page: its settings, then its LEDs
function StandbySketch() {
  const { t } = useTranslation();
  const S = 'gettingStarted.standby.mock';
  const row = { border: '1px solid var(--mantine-color-default-border)', borderRadius: 4 };
  const wiiSlot = getProfileSlotLabel(MOCK_WII_GUITAR, 1, t);

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="sm">
        <MockField label={t('main.profile_name.label')} value={t('profileDefaults.standbyName')} />
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="xs" wrap="nowrap">
            <Switch size="xs" checked={false} readOnly tabIndex={-1} />
            <Text size="xs" fw={600}>
              {t(STANDBY_PARTS[0].label)}
            </Text>
          </Group>
          <LayoutMarker n={1} />
        </Group>
        <MockSection n={2} title={t(STANDBY_PARTS[1].label)}>
          <Group>
            <Badge size="sm" variant="light" color={SLOT_COLOR} tt="none">
              {wiiSlot}
            </Badge>
          </Group>
        </MockSection>
        <MockSection n={3} title={t(STANDBY_PARTS[2].label)}>
          <Group gap="xs" px="xs" py={4} style={row}>
            <Text size="xs" fw={600}>
              {t('main.standbyLighting.wake.button', { num: 1 })}
            </Text>
            <Text size="xs" c="dimmed">
              {t(`${S}.wakeInput`)}
            </Text>
          </Group>
          <Group>
            <Button component="span" size="compact-xs" variant="light">
              {t('main.standbyLighting.wake.add')}
            </Button>
          </Group>
        </MockSection>
        <Divider />
        <MockSection n={4} title={t(STANDBY_PARTS[3].label)} add={t('leds.add')}>
          <Group gap="xs" px="xs" py={4} style={row}>
            <Box
              w={10}
              h={10}
              bg="blue"
              style={{ borderRadius: '50%', flexShrink: 0 }}
              aria-hidden
            />
            <Text size="xs">{t(`${S}.ledRow`)}</Text>
          </Group>
        </MockSection>
      </Stack>
    </Paper>
  );
}

export function SetupStandbyStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profiles = useConfigStore((state) => state.config.profiles);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const addStandbyProfile = useConfigStore((state) => state.addStandbyProfile);
  const standbyIdx = (profiles ?? []).findIndex((profile) => profile.opts?.standbyLighting);

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">
        <Trans i18nKey="gettingStarted.standby.intro" components={strong} />
      </Text>
      {/* Adding it stays on the guide, so the sketch below can be read before opening it */}
      <StepActions>
        {standbyIdx !== -1 ? (
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<IconMoon size={16} />}
              onClick={() => {
                setActiveProfile(standbyIdx.toString(), 0);
                navigate('/profiles');
              }}
            >
              {t('guides.setup.actions.openStandby')}
            </Button>
            <Text size="sm" c="dimmed">
              {t('gettingStarted.standby.added')}
            </Text>
          </Group>
        ) : (
          <Group>
            <Button leftSection={<IconMoon size={16} />} onClick={addStandbyProfile}>
              {t('nav.addStandbyLighting')}
            </Button>
          </Group>
        )}
      </StepActions>
      <StandbySketch />
      <LayoutMarkerList
        items={STANDBY_PARTS.map(({ key, label }) => ({
          title: t(label),
          bodyKey: `gettingStarted.standby.parts.${key}`,
        }))}
      />
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('standby')} guideContent={guideContent} />;
}

export function SetupSaveStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const configModified = useConfigStore((state) => state.configModified);
  const updating = useConfigStore((state) => state.updating);
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const exportConfig = useConfigStore((state) => state.exportConfig);

  const guideContent = (
    <Stack gap="md">
      <StepSections keys={['save']} />
      <StepActions>
        {configModified ? (
          <Group>
            <Button
              disabled={updating}
              onClick={commitConfig}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              {t('save.saveChanges', 'Save changes')}
            </Button>
          </Group>
        ) : (
          <Alert variant="light" color="teal" icon={<IconCheck />}>
            {t('guides.setup.actions.allSaved')}
          </Alert>
        )}
      </StepActions>
      <StepSections keys={['backup']} />
      <StepActions prompt={false}>
        <Group>
          <Button
            variant="light"
            disabled={updating}
            onClick={exportConfig}
            leftSection={<IconFileExport size={16} />}
          >
            {t('connect.export')}
          </Button>
        </Group>
      </StepActions>
      <Santroller1Note step="save" />
      <Alert
        icon={<IconDeviceFloppy size={18} />}
        title={t('gettingStarted.saveReminder.title')}
        color="blue"
        radius="md"
      >
        <Text size="sm">
          <Trans i18nKey="gettingStarted.saveReminder.body" components={strong} />
        </Text>
      </Alert>
      <Troubleshooting keys={['notResponding', 'profileInactive', 'lostChanges']} />
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('save')} guideContent={guideContent} />;
}
