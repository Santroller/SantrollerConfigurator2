import React, { useEffect, useState } from 'react';
import {
  IconArrowsExchange,
  IconBluetooth,
  IconBrandWindows,
  IconCheck,
  IconCpu,
  IconDeviceGamepad,
  IconDeviceGamepad2,
  IconDisc,
  IconDownload,
  IconExternalLink,
  IconInfoCircle,
  IconKey,
  IconPlug,
  IconShieldLock,
} from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
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
import { BrainslugGuide } from '@/components/Compatibility/BrainslugGuide';
import { PademuGuide } from '@/components/Compatibility/PademuGuide';
import { Rpcs3Guide } from '@/components/Compatibility/Rpcs3Guide';
import { WiiBluetoothGuide } from '@/components/Compatibility/WiiBluetoothGuide';
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
  wii: { tab: 'wii', section: 'wii-bluetooth' },
  brainslug: { tab: 'brainslug', section: 'brainslug' },
  pademu: { tab: 'pademu', section: 'pademu' },
  auth: { tab: 'auth', section: 'auth-hardware' },
  rpcs3: { tab: 'rpcs3', section: 'rpcs3-gh' },
};

const COMPATIBILITY_TABLE: CompatibilityRow[] = [
  { id: 'pc', ecosystem: 'pc', status: 'nativePlugAndPlay', statusColor: 'teal' },
  { id: 'pc_arcade', ecosystem: 'pc', status: 'nativePlugAndPlay', statusColor: 'teal' },
  { id: 'pc_bluetooth', ecosystem: 'pc', status: 'nativeWireless', statusColor: 'teal' },
  { id: 'gh_arcade', ecosystem: 'pc', status: 'nativeProtocol', statusColor: 'teal' },
  { id: 'ps3', ecosystem: 'playstation', status: 'nativePlugAndPlay', statusColor: 'teal' },
  { id: 'ps2_usb', ecosystem: 'playstation', status: 'nativeUsb', statusColor: 'teal' },
  { id: 'ps2_port', ecosystem: 'playstation', status: 'nativeProtocol', statusColor: 'teal' },
  { id: 'ps2_pademu', ecosystem: 'playstation', status: 'setupRequired', statusColor: 'orange' },
  { id: 'ps2_keyboardmania', ecosystem: 'playstation', status: 'nativeUsb', statusColor: 'teal' },
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
  { id: 'wii_ext', ecosystem: 'nintendo', status: 'nativeProtocol', statusColor: 'teal' },
  { id: 'switch', ecosystem: 'nintendo', status: 'nativePlugAndPlay', statusColor: 'teal' },
  { id: 'gamecube', ecosystem: 'nintendo', status: 'nativeProtocol', statusColor: 'teal' },
  { id: 'n64', ecosystem: 'nintendo', status: 'nativeProtocol', statusColor: 'teal' },
  { id: 'snes', ecosystem: 'nintendo', status: 'nativeProtocol', statusColor: 'teal' },
  { id: 'ogxbox', ecosystem: 'xbox', status: 'nativeProtocol', statusColor: 'teal' },
  { id: 'rpcs3', ecosystem: 'pc', status: 'setupRequired', statusColor: 'orange' },
];

const RICH_COMPONENTS: Record<string, React.ReactElement> = {
  strong: <strong />,
  code: <Code />,
  br: <br />,
};

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
  { id: 'ghl', color: 'dark' },
  { id: 'proInstruments', color: 'indigo' },
  { id: 'festival', color: 'grape' },
  { id: 'gamepad', color: 'gray' },
  { id: 'arcadeRhythm', color: 'pink' },
  { id: 'wheel', color: 'orange' },
  { id: 'consolePorts', color: 'cyan' },
  { id: 'pcModes', color: 'lime' },
  { id: 'keyboardMidiMic', color: 'yellow' },
];

const AUTH_METHODS = [
  { id: 'builtIn', color: 'teal', icon: <IconCheck size={20} /> },
  { id: 'usbPassthrough', color: 'blue', icon: <IconPlug size={20} /> },
  { id: 'harvestedChip', color: 'cyan', icon: <IconCpu size={20} /> },
  { id: 'noAuth', color: 'grape', icon: <IconShieldLock size={20} /> },
];

const AUTH_HARDWARE_ROWS = ['xbone', 'ps4', 'ps5'];

const TABS = ['matrix', 'modes', 'wii', 'brainslug', 'pademu', 'auth', 'festival', 'rpcs3'];

export function CompatibilityPage() {
  const { t, i18n } = useTranslation();
  const [consoleFilter, setConsoleFilter] = useState<string>('all');
  // A link can open a tab directly, eg /compatibility#rpcs3
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    const hash = window.location.hash.slice(1);
    return TABS.includes(hash) ? hash : 'matrix';
  });
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

            <Group gap="xs">
              <Button
                variant="light"
                size="xs"
                color="teal"
                component={Link}
                to="/differences"
                leftSection={<IconArrowsExchange size={14} />}
              >
                {t('nav.differences', 'Firmware Differences')}
              </Button>
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
            <Tabs.Tab value="wii" leftSection={<IconBluetooth size={16} />}>
              {t('compatibility.tabs.wii')}
            </Tabs.Tab>
            <Tabs.Tab value="brainslug" leftSection={<IconDownload size={16} />}>
              {t('compatibility.tabs.brainslug')}
            </Tabs.Tab>
            <Tabs.Tab value="pademu" leftSection={<IconDeviceGamepad size={16} />}>
              {t('compatibility.tabs.pademu')}
            </Tabs.Tab>
            <Tabs.Tab value="auth" leftSection={<IconShieldLock size={16} />}>
              {t('compatibility.tabs.auth')}
            </Tabs.Tab>
            <Tabs.Tab value="festival" leftSection={<IconBrandWindows size={16} />}>
              {t('compatibility.tabs.festival')}
            </Tabs.Tab>
            <Tabs.Tab value="rpcs3" leftSection={<IconDisc size={16} />}>
              {t('compatibility.tabs.rpcs3')}
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

          {/* ================= WII BLUETOOTH ================= */}
          <Tabs.Panel value="wii">
            <WiiBluetoothGuide />
          </Tabs.Panel>

          {/* ================= WII BRAINSLUG ================= */}
          <Tabs.Panel value="brainslug">
            <BrainslugGuide />
          </Tabs.Panel>

          {/* ================= PS2 PADEMU ================= */}
          <Tabs.Panel value="pademu">
            <PademuGuide />
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
              <Paper id="xbox-wla" withBorder radius="md" p="lg">
                <Stack gap="sm">
                  <Title order={3} size="h4">
                    {t('compatibility.auth.wla.title')}
                  </Title>
                  <Text size="sm">{t('compatibility.auth.wla.body')}</Text>
                  <List size="sm" spacing="xs">
                    <RichListItems i18nKey="compatibility.auth.wla.games" />
                  </List>
                  <Title order={4} size="h5">
                    {t('compatibility.auth.wla.swapTitle')}
                  </Title>
                  <List type="ordered" size="sm" spacing="xs">
                    <RichListItems i18nKey="compatibility.auth.wla.swapSteps" />
                  </List>
                  <Text size="xs" c="dimmed">
                    {t('compatibility.auth.wla.swapNote')}
                  </Text>
                  <Alert
                    color="blue"
                    variant="light"
                    title={t('compatibility.auth.wla.windowsTitle')}
                  >
                    <Text size="sm">{t('compatibility.auth.wla.windowsBody')}</Text>
                  </Alert>
                  <Button
                    component={Link}
                    to="/guides/xbox-auth"
                    variant="light"
                    size="xs"
                    rightSection={<IconExternalLink size={14} />}
                  >
                    {t('compatibility.auth.wla.buildGuideLink')}
                  </Button>
                </Stack>
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

          {/* ================= TAB 6: RPCS3 ================= */}
          <Tabs.Panel value="rpcs3">
            <Rpcs3Guide />
          </Tabs.Panel>
        </Tabs>
      </Container>
    </Layout>
  );
}
