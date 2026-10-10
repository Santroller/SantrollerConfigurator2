import React, { useEffect, useState } from 'react';
import {
  IconAlertTriangle,
  IconBluetooth,
  IconBrandWindows,
  IconCheck,
  IconCpu,
  IconDeviceGamepad,
  IconDeviceGamepad2,
  IconDownload,
  IconExternalLink,
  IconInfoCircle,
  IconKey,
  IconPlug,
  IconShieldLock,
  IconTerminal2,
} from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Group,
  List,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';

type ConsoleEcosystem = 'playstation' | 'xbox' | 'nintendo' | 'pc';

// Display text for each row lives in the translation file under compatibility.matrix.rows.<id>
interface CompatibilityRow {
  id: string;
  ecosystem: ConsoleEcosystem;
  status: string;
  statusColor: string;
}

// Sections the requirements column can link to. The translated text marks each link with
// <tag>...</tag>, so a single requirement can point at several sections.
const REQUIREMENT_SECTIONS: Record<string, { tab: string; section: string }> = {
  wii: { tab: 'plugins', section: 'wii-bluetooth' },
  brainslug: { tab: 'plugins', section: 'brainslug' },
  pademu: { tab: 'plugins', section: 'pademu' },
  orbis: { tab: 'plugins', section: 'orbis' },
  auth: { tab: 'auth', section: 'auth-hardware' },
};

const COMPATIBILITY_TABLE: CompatibilityRow[] = [
  { id: 'pc', ecosystem: 'pc', status: 'nativePlugAndPlay', statusColor: 'teal' },
  { id: 'ps3', ecosystem: 'playstation', status: 'nativePlugAndPlay', statusColor: 'teal' },
  { id: 'ps2_usb', ecosystem: 'playstation', status: 'nativeUsb', statusColor: 'teal' },
  { id: 'ps2_pademu', ecosystem: 'playstation', status: 'setupRequired', statusColor: 'orange' },
  { id: 'ps4_rb4', ecosystem: 'playstation', status: 'legacyMode', statusColor: 'blue' },
  { id: 'ps4_native', ecosystem: 'playstation', status: 'authRequired', statusColor: 'yellow' },
  { id: 'ps45_festival', ecosystem: 'playstation', status: 'noAuthNeeded', statusColor: 'teal' },
  { id: 'ps5_rb4', ecosystem: 'playstation', status: 'legacyMode', statusColor: 'blue' },
  { id: 'ps5_native', ecosystem: 'playstation', status: 'specialAuthDongle', statusColor: 'red' },
  { id: 'x360', ecosystem: 'xbox', status: 'nativePlugAndPlay', statusColor: 'teal' },
  { id: 'xbone_festival', ecosystem: 'xbox', status: 'noAuthNeeded', statusColor: 'teal' },
  { id: 'xbone_native', ecosystem: 'xbox', status: 'authRequired', statusColor: 'yellow' },
  { id: 'wii_rb', ecosystem: 'nintendo', status: 'nativeUsb', statusColor: 'teal' },
  { id: 'wii_gh', ecosystem: 'nintendo', status: 'nativeWireless', statusColor: 'teal' },
  { id: 'switch', ecosystem: 'nintendo', status: 'nativePlugAndPlay', statusColor: 'teal' },
  { id: 'ogxbox', ecosystem: 'xbox', status: 'nativeProtocol', statusColor: 'teal' },
];

const RICH_COMPONENTS: Record<string, React.ReactElement> = {
  strong: <strong />,
  code: <Code />,
  br: <br />,
};

const BRAINSLUG_RELEASES = 'https://github.com/Santroller/santroller-bslug/releases/latest';
const OPL_RELEASES = 'https://github.com/ps2homebrew/Open-PS2-Loader/releases';
const ORBIS_INSTRUMENTALIZER = 'https://github.com/InvoxiPlayGames/OrbisInstrumentalizer';

function externalLink(href: string, iconSize = 12): Record<string, React.ReactElement> {
  return {
    extlink: <Anchor href={href} target="_blank" rel="noopener noreferrer" />,
    icon: <IconExternalLink size={iconSize} />,
  };
}

function RichText({
  i18nKey,
  components,
}: {
  i18nKey: string;
  components?: Record<string, React.ReactElement>;
}) {
  return <Trans i18nKey={i18nKey} components={{ ...RICH_COMPONENTS, ...components }} />;
}

// Renders each entry of a translated string array as a List.Item, allowing inline markup
function RichListItems({
  i18nKey,
  components,
}: {
  i18nKey: string;
  components?: Record<string, React.ReactElement>;
}) {
  const { t } = useTranslation();
  const items = t(i18nKey, { returnObjects: true });
  if (!Array.isArray(items)) {
    return null;
  }
  return (
    <>
      {items.map((_, i) => (
        <List.Item key={i}>
          <RichText i18nKey={`${i18nKey}.${i}`} components={components} />
        </List.Item>
      ))}
    </>
  );
}

const EMULATION_MODES = [
  { id: 'ghGuitar', color: 'red' },
  { id: 'rbGuitar', color: 'blue' },
  { id: 'rbDrums', color: 'teal' },
  { id: 'djh', color: 'violet' },
  { id: 'festival', color: 'grape' },
  { id: 'gamepad', color: 'gray' },
];

const AUTH_METHODS = [
  { id: 'builtIn', color: 'teal', icon: <IconCheck size={20} /> },
  { id: 'usbPassthrough', color: 'blue', icon: <IconPlug size={20} /> },
  { id: 'harvestedChip', color: 'cyan', icon: <IconCpu size={20} /> },
  { id: 'noAuth', color: 'grape', icon: <IconShieldLock size={20} /> },
];

const AUTH_HARDWARE_ROWS = ['xbone', 'ps4', 'ps5'];

export function CompatibilityPage() {
  const { t, i18n } = useTranslation();
  const [consoleFilter, setConsoleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string | null>('matrix');
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  // Scroll once the target tab has rendered its panel
  useEffect(() => {
    if (scrollTarget) {
      document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setScrollTarget(null);
    }
  }, [activeTab, scrollTarget]);

  const openSection = ({ tab, section }: { tab: string; section: string }) => {
    setActiveTab(tab);
    setScrollTarget(section);
  };

  const requirementLinks = Object.fromEntries(
    Object.entries(REQUIREMENT_SECTIONS).map(([tag, target]) => [
      tag,
      <Anchor
        component="button"
        type="button"
        inherit
        ta="left"
        onClick={() => openSection(target)}
      />,
    ])
  );

  const filteredRows = COMPATIBILITY_TABLE.filter(
    (row) => consoleFilter === 'all' || row.ecosystem === consoleFilter
  );

  return (
    <Layout>
      <Container size="xl" px="md" pb="xl">
        {/* Header */}
        <Stack gap="xs" mb="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Title order={1} size="h2" fw={700}>
                {t('compatibility.title')}
              </Title>
              <Text size="sm" c="dimmed">
                {t('compatibility.subtitle')}
              </Text>
            </div>

            <Button
              variant="light"
              size="xs"
              color="blue"
              component={Link}
              to="/supported-hardware"
              leftSection={<IconPlug size={14} />}
            >
              {t('nav.supportedHardware')}
            </Button>
          </Group>
        </Stack>

        <Tabs value={activeTab} onChange={setActiveTab} color="blue" radius="md">
          <Tabs.List mb="lg">
            <Tabs.Tab value="matrix" leftSection={<IconDeviceGamepad size={16} />}>
              {t('compatibility.tabs.matrix')}
            </Tabs.Tab>
            <Tabs.Tab value="modes" leftSection={<IconDeviceGamepad2 size={16} />}>
              {t('compatibility.tabs.modes')}
            </Tabs.Tab>
            <Tabs.Tab value="plugins" leftSection={<IconTerminal2 size={16} />}>
              {t('compatibility.tabs.plugins')}
            </Tabs.Tab>
            <Tabs.Tab value="auth" leftSection={<IconShieldLock size={16} />}>
              {t('compatibility.tabs.auth')}
            </Tabs.Tab>
            <Tabs.Tab value="festival" leftSection={<IconBrandWindows size={16} />}>
              {t('compatibility.tabs.festival')}
            </Tabs.Tab>
          </Tabs.List>

          {/* ================= TAB 1: COMPATIBILITY MATRIX ================= */}
          <Tabs.Panel value="matrix">
            <Stack gap="md">
              <Group justify="space-between" align="center" wrap="wrap">
                <Text size="sm" fw={600}>
                  {t('compatibility.matrix.filterLabel')}
                </Text>
                <SegmentedControl
                  size="xs"
                  value={consoleFilter}
                  onChange={setConsoleFilter}
                  data={[
                    { label: t('compatibility.matrix.filters.all'), value: 'all' },
                    { label: t('compatibility.matrix.filters.playstation'), value: 'playstation' },
                    { label: t('compatibility.matrix.filters.xbox'), value: 'xbox' },
                    { label: t('compatibility.matrix.filters.nintendo'), value: 'nintendo' },
                    { label: t('compatibility.matrix.filters.pc'), value: 'pc' },
                  ]}
                />
              </Group>

              <Card withBorder radius="md" p={0} style={{ overflowX: 'auto' }}>
                <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: '18%' }}>
                        {t('compatibility.matrix.columns.console')}
                      </Table.Th>
                      <Table.Th style={{ width: '22%' }}>
                        {t('compatibility.matrix.columns.games')}
                      </Table.Th>
                      <Table.Th style={{ width: '18%' }}>
                        {t('compatibility.matrix.columns.mode')}
                      </Table.Th>
                      <Table.Th style={{ width: '14%' }}>
                        {t('compatibility.matrix.columns.connection')}
                      </Table.Th>
                      <Table.Th style={{ width: '12%' }}>
                        {t('compatibility.matrix.columns.status')}
                      </Table.Th>
                      <Table.Th style={{ width: '16%' }}>
                        {t('compatibility.matrix.columns.requirements')}
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredRows.map((row) => {
                      const key = `compatibility.matrix.rows.${row.id}`;
                      const hasRequirements = i18n.exists(`${key}.pluginOrAuth`);
                      return (
                        <Table.Tr key={row.id}>
                          <Table.Td>
                            <Text size="xs" fw={600}>
                              {t(`${key}.console`)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs">{t(`${key}.games`)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Code color="blue">{t(`${key}.recommendedMode`)}</Code>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {t(`${key}.connection`)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" color={row.statusColor} variant="light">
                              {t(`compatibility.matrix.status.${row.status}`)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {hasRequirements ? (
                              <Text size="xs" fw={500}>
                                <Trans
                                  i18nKey={`${key}.pluginOrAuth`}
                                  components={requirementLinks}
                                />
                              </Text>
                            ) : (
                              <Text size="xs" c="dimmed">
                                {t('compatibility.matrix.noRequirements')}
                              </Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Card>
            </Stack>
          </Tabs.Panel>

          {/* ================= TAB 2: EMULATION MODES ================= */}
          <Tabs.Panel value="modes">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                <RichText i18nKey="compatibility.modes.intro" />
              </Text>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {EMULATION_MODES.map((mode) => {
                  const key = `compatibility.modes.cards.${mode.id}`;
                  return (
                    <Card key={mode.id} withBorder radius="md" p="md">
                      <Group justify="space-between" mb="xs">
                        <Title order={4} size="h5">
                          {t(`${key}.title`)}
                        </Title>
                        <Badge color={mode.color} variant="light">
                          {t(`${key}.badge`)}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed" mb="sm">
                        {t(`${key}.description`)}
                      </Text>
                      <List size="xs" spacing={4}>
                        <RichListItems i18nKey={`${key}.features`} />
                      </List>
                    </Card>
                  );
                })}
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* ================= TAB 3: PLUGINS & HOMEBREW ================= */}
          <Tabs.Panel value="plugins">
            <Stack gap="lg">
              {/* Wireless Wii Remote Emulation Guide (Recommended) */}
              <Paper
                id="wii-bluetooth"
                withBorder
                radius="md"
                p="lg"
                style={{ borderColor: 'var(--mantine-color-teal-6)' }}
              >
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                      <IconBluetooth size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} size="h4">
                        {t('compatibility.plugins.wiiBluetooth.title')}
                      </Title>
                      <Text size="xs" c="dimmed">
                        {t('compatibility.plugins.wiiBluetooth.subtitle')}
                      </Text>
                    </div>
                  </Group>
                  <Badge color="teal" variant="filled">
                    {t('compatibility.plugins.wiiBluetooth.badge')}
                  </Badge>
                </Group>

                <Alert
                  color="teal"
                  icon={<IconCheck size={16} />}
                  title={t('compatibility.plugins.wiiBluetooth.alertTitle')}
                  mb="md"
                >
                  <Text size="xs">
                    <RichText i18nKey="compatibility.plugins.wiiBluetooth.alertBody" />
                  </Text>
                </Alert>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
                  <Card withBorder radius="md" p="sm">
                    <Text size="sm" fw={600} c="teal" mb={4}>
                      {t('compatibility.plugins.wiiBluetooth.hardwareTitle')}
                    </Text>
                    <List size="xs" spacing={4}>
                      <List.Item>
                        <RichText i18nKey="compatibility.plugins.wiiBluetooth.hardwarePicoW" />
                        <Text size="xs" c="red" fw={500} mt={2}>
                          {t('compatibility.plugins.wiiBluetooth.hardwarePicoWWarning')}
                        </Text>
                      </List.Item>
                      <List.Item>
                        <RichText i18nKey="compatibility.plugins.wiiBluetooth.hardwareDongle" />
                      </List.Item>
                    </List>
                  </Card>

                  <Card withBorder radius="md" p="sm">
                    <Text size="sm" fw={600} c="teal" mb={4}>
                      {t('compatibility.plugins.wiiBluetooth.pairingTitle')}
                    </Text>
                    <List type="ordered" size="xs" spacing={4}>
                      <RichListItems i18nKey="compatibility.plugins.wiiBluetooth.pairingSteps" />
                    </List>
                  </Card>
                </SimpleGrid>
              </Paper>

              {/* Brainslug Wii Guide */}
              <Paper id="brainslug" withBorder radius="md" p="lg">
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon color="red" variant="light" size="lg" radius="md">
                      <IconDownload size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} size="h4">
                        {t('compatibility.plugins.brainslug.title')}
                      </Title>
                      <Text size="xs" c="dimmed">
                        {t('compatibility.plugins.brainslug.subtitle')}
                      </Text>
                    </div>
                  </Group>
                  <Badge color="red" variant="light">
                    {t('compatibility.plugins.brainslug.badge')}
                  </Badge>
                </Group>

                <Text size="xs" mb="md">
                  <RichText i18nKey="compatibility.plugins.brainslug.intro" />
                </Text>

                <Accordion variant="separated" radius="md">
                  <Accordion.Item value="disc">
                    <Accordion.Control>
                      <Text size="sm" fw={600}>
                        {t('compatibility.plugins.brainslug.discTitle')}
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List type="ordered" size="xs" spacing="xs">
                        <RichListItems
                          i18nKey="compatibility.plugins.brainslug.discSteps"
                          components={externalLink(BRAINSLUG_RELEASES)}
                        />
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>

                  <Accordion.Item value="usbloader">
                    <Accordion.Control>
                      <Text size="sm" fw={600}>
                        {t('compatibility.plugins.brainslug.usbLoaderTitle')}
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Alert
                        color="red"
                        icon={<IconAlertTriangle size={16} />}
                        title={t('compatibility.plugins.brainslug.usbLoaderAlertTitle')}
                        mb="sm"
                      >
                        <Text size="xs">
                          <RichText i18nKey="compatibility.plugins.brainslug.usbLoaderAlertBody" />
                        </Text>
                      </Alert>

                      <List type="ordered" size="xs" spacing="xs">
                        <RichListItems
                          i18nKey="compatibility.plugins.brainslug.usbLoaderSteps"
                          components={externalLink(BRAINSLUG_RELEASES)}
                        />
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Paper>

              {/* PS2 PADEMU Guide */}
              <Paper id="pademu" withBorder radius="md" p="lg">
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon color="indigo" variant="light" size="lg" radius="md">
                      <IconDeviceGamepad size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} size="h4">
                        {t('compatibility.plugins.pademu.title')}
                      </Title>
                      <Text size="xs" c="dimmed">
                        {t('compatibility.plugins.pademu.subtitle')}
                      </Text>
                    </div>
                  </Group>
                  <Badge color="indigo" variant="light">
                    {t('compatibility.plugins.pademu.badge')}
                  </Badge>
                </Group>

                <Text size="xs" mb="md">
                  <RichText i18nKey="compatibility.plugins.pademu.intro" />
                </Text>

                <Alert color="blue" icon={<IconInfoCircle size={16} />} mb="md">
                  <Text size="xs">
                    <RichText i18nKey="compatibility.plugins.pademu.note" />
                  </Text>
                </Alert>

                <List type="ordered" size="xs" spacing="xs">
                  <RichListItems
                    i18nKey="compatibility.plugins.pademu.steps"
                    components={externalLink(OPL_RELEASES)}
                  />
                </List>
              </Paper>

              {/* Modded Console Plugins */}
              <Paper id="orbis" withBorder radius="md" p="lg">
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon color="green" variant="light" size="lg" radius="md">
                      <IconShieldLock size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} size="h4">
                        {t('compatibility.plugins.orbis.title')}
                      </Title>
                      <Text size="xs" c="dimmed">
                        {t('compatibility.plugins.orbis.subtitle')}
                      </Text>
                    </div>
                  </Group>
                  <Badge color="green" variant="light">
                    {t('compatibility.plugins.orbis.badge')}
                  </Badge>
                </Group>

                <Card withBorder radius="md" p="sm">
                  <Title order={4} size="h5" mb={4}>
                    {t('compatibility.plugins.orbis.cardTitle')}
                  </Title>
                  <Text size="xs" c="dimmed" mb="xs">
                    {t('compatibility.plugins.orbis.cardSubtitle')}
                  </Text>
                  <Text size="xs" mb="xs">
                    {t('compatibility.plugins.orbis.cardBody')}
                  </Text>
                  <Anchor
                    href={ORBIS_INSTRUMENTALIZER}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="xs"
                  >
                    {t('compatibility.plugins.orbis.viewOnGithub')} <IconExternalLink size={10} />
                  </Anchor>
                </Card>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* ================= TAB 4: AUTHENTICATION PASSTHROUGH ================= */}
          <Tabs.Panel value="auth">
            <Stack gap="md">
              <Alert
                icon={<IconKey size={18} />}
                title={t('compatibility.auth.alertTitle')}
                color="blue"
                radius="md"
              >
                <Text size="xs">{t('compatibility.auth.alertBody')}</Text>
              </Alert>

              <Title order={3} size="h4">
                {t('compatibility.auth.methodsTitle')}
              </Title>

              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                {AUTH_METHODS.map((method) => (
                  <Card key={method.id} withBorder radius="md" p="md">
                    <ThemeIcon color={method.color} variant="light" size="lg" radius="md" mb="xs">
                      {method.icon}
                    </ThemeIcon>
                    <Title order={4} size="h5" mb={4}>
                      {t(`compatibility.auth.methods.${method.id}.title`)}
                    </Title>
                    <Text size="xs" c="dimmed">
                      <RichText i18nKey={`compatibility.auth.methods.${method.id}.body`} />
                    </Text>
                  </Card>
                ))}
              </SimpleGrid>

              <Paper id="auth-hardware" withBorder radius="md" p="lg" mt="sm">
                <Title order={4} size="h5" mb="xs">
                  {t('compatibility.auth.hardwareTitle')}
                </Title>
                <Text size="xs" c="dimmed" mb="md">
                  {t('compatibility.auth.hardwareSubtitle')}
                </Text>

                <Table striped horizontalSpacing="md" verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('compatibility.auth.columns.console')}</Table.Th>
                      <Table.Th>{t('compatibility.auth.columns.hardware')}</Table.Th>
                      <Table.Th>{t('compatibility.auth.columns.notes')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {AUTH_HARDWARE_ROWS.map((id) => (
                      <Table.Tr key={id}>
                        <Table.Td fw={600}>{t(`compatibility.auth.rows.${id}.console`)}</Table.Td>
                        <Table.Td>{t(`compatibility.auth.rows.${id}.hardware`)}</Table.Td>
                        <Table.Td>
                          <Text size="xs">{t(`compatibility.auth.rows.${id}.notes`)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* ================= TAB 5: FORTNITE FESTIVAL ================= */}
          <Tabs.Panel value="festival">
            <Stack gap="md">
              <Alert
                icon={<IconInfoCircle size={18} />}
                title={t('compatibility.festival.alertTitle')}
                color="teal"
                radius="md"
              >
                <Text size="xs">
                  <RichText i18nKey="compatibility.festival.alertBody" />
                </Text>
              </Alert>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Card withBorder radius="md" p="md">
                  <Title order={4} size="h5" mb={4}>
                    {t('compatibility.festival.keyboard.title')}
                  </Title>
                  <Text size="xs" c="dimmed" mb="sm">
                    {t('compatibility.festival.keyboard.subtitle')}
                  </Text>
                  <Text size="xs" mb="xs">
                    {t('compatibility.festival.keyboard.body1')}
                  </Text>
                  <Text size="xs" mb="xs">
                    <RichText i18nKey="compatibility.festival.keyboard.body2" />
                  </Text>
                  <Badge color="teal" variant="light" size="xs">
                    {t('compatibility.festival.keyboard.badge')}
                  </Badge>
                </Card>

                <Card withBorder radius="md" p="md">
                  <Title order={4} size="h5" mb={4}>
                    {t('compatibility.festival.pc.title')}
                  </Title>
                  <Text size="xs" c="dimmed" mb="sm">
                    {t('compatibility.festival.pc.subtitle')}
                  </Text>
                  <Text size="xs" mb="xs">
                    {t('compatibility.festival.pc.body')}
                  </Text>
                  <List size="xs" spacing={4}>
                    <RichListItems i18nKey="compatibility.festival.pc.options" />
                  </List>
                </Card>
              </SimpleGrid>

              <Paper withBorder radius="md" p="lg">
                <Title order={3} size="h4" mb="md">
                  {t('compatibility.festival.steps.title')}
                </Title>

                <List type="ordered" size="xs" spacing="sm">
                  <List.Item>
                    <RichText i18nKey="compatibility.festival.steps.addProfile" />
                  </List.Item>
                  <List.Item>
                    <RichText i18nKey="compatibility.festival.steps.setEmulation" />
                  </List.Item>
                  <List.Item>
                    <RichText i18nKey="compatibility.festival.steps.loadPreset" />
                    <List size="xs" spacing={2} mt={4}>
                      <RichListItems i18nKey="compatibility.festival.steps.presets" />
                    </List>
                  </List.Item>
                  <List.Item>
                    <RichText i18nKey="compatibility.festival.steps.customize" />
                  </List.Item>
                  <List.Item>
                    <RichText i18nKey="compatibility.festival.steps.navigation" />
                  </List.Item>
                  <List.Item>
                    <RichText i18nKey="compatibility.festival.steps.assignments" />
                  </List.Item>
                  <List.Item>
                    <RichText i18nKey="compatibility.festival.steps.save" />
                  </List.Item>
                </List>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Container>
    </Layout>
  );
}
