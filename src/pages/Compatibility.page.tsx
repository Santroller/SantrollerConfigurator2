import React, { useState } from 'react';
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
import { useTranslation } from 'react-i18next';
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

interface CompatibilityRow {
  console: string;
  games: string;
  recommendedMode: string;
  connection: string;
  statusBadge: string;
  statusColor: string;
  notes: string;
  pluginOrAuth?: string;
}

const COMPATIBILITY_TABLE: CompatibilityRow[] = [
  {
    console: 'PC / Windows / Linux / Mac',
    games: 'Clone Hero, YARG, Fortnite Festival, Emulators (RPCS3, PCSX2, Dolphin)',
    recommendedMode: 'XInput or DirectInput (Gamepad / GH Guitar / RB Guitar)',
    connection: 'Direct USB',
    statusBadge: 'Native Plug & Play',
    statusColor: 'teal',
    notes:
      'Zero setup required. Automatic detection with full whammy bar, tilt, and RGB LED lighting support.',
  },
  {
    console: 'PlayStation 3',
    games: 'All Guitar Hero, Rock Band, DJ Hero & standard games',
    recommendedMode: 'PS3 Guitar / PS3 Drums / PS3 Gamepad',
    connection: 'Direct USB',
    statusBadge: 'Native Plug & Play',
    statusColor: 'teal',
    notes: 'Fully supported out of the box. No security checks or console authentication needed.',
  },
  {
    console: 'PlayStation 2',
    games: 'Rock Band 1 & 2, GH World Tour, GH5, Band Hero',
    recommendedMode: 'Rock Band Guitar / Drums or GH Guitar',
    connection: 'Direct USB',
    statusBadge: 'Native USB',
    statusColor: 'teal',
    notes:
      'These later PS2 rhythm titles natively support standard USB instruments without special software.',
  },
  {
    console: 'PlayStation 2',
    games: 'Guitar Hero 1 & 2, standard DualShock games',
    recommendedMode: 'PS3 Gamepad / Guitar (into PADEMU) OR Hardware PS2 Bus',
    connection: 'USB (via PADEMU) or SPI Controller Bus',
    statusBadge: 'Setup Required',
    statusColor: 'orange',
    notes:
      'Early PS2 games only support controllers plugged into the front PS2 port. Use OPL with PADEMU enabled, or wire a hardware PS2 SPI bus.',
    pluginOrAuth: 'PADEMU in Open PS2 Loader',
  },
  {
    console: 'PlayStation 4',
    games: 'Rock Band 4',
    recommendedMode: 'PS3 Guitar / PS3 Drums',
    connection: 'Direct USB',
    statusBadge: 'Legacy Mode',
    statusColor: 'blue',
    notes:
      'Works in-game without authentication via Mad Catz PS3 legacy instrument support (cannot navigate the PS4 home OS menu).',
  },
  {
    console: 'PlayStation 4',
    games: 'Native PS4 Games (Full OS & In-Game Navigation)',
    recommendedMode: 'PS4 Gamepad / Instrument',
    connection: 'USB + USB Host Passthrough',
    statusBadge: 'Auth Required',
    statusColor: 'yellow',
    notes:
      'Requires continuous authentication handshake. Plug a DualShock 4 or Mayflash MAGPS4 dongle into the Santroller USB Host port.',
    pluginOrAuth: 'DualShock 4 / MAGPS4 or GoldHEN OrbisInstrumentalizer',
  },
  {
    console: 'PlayStation 4 / 5',
    games: 'Fortnite Festival (Pro Lead / Bass / Drums)',
    recommendedMode: 'Keyboard Profile (Festival Preset / Custom Keys)',
    connection: 'Direct USB',
    statusBadge: 'No Auth Needed',
    statusColor: 'teal',
    notes:
      'Create a Keyboard Profile in Santroller. Consoles treat it as a standard USB keyboard, bypassing controller authentication completely while letting you fully customize every key.',
  },
  {
    console: 'PlayStation 5',
    games: 'Rock Band 4',
    recommendedMode: 'PS3 Guitar / PS3 Drums',
    connection: 'Direct USB',
    statusBadge: 'Legacy Mode',
    statusColor: 'blue',
    notes:
      'Works inside Rock Band 4 under legacy PS3 instrument mode. No authentication needed in-game.',
  },
  {
    console: 'PlayStation 5',
    games: 'Native PS5 Games',
    recommendedMode: 'PS5 Gamepad / Instrument',
    connection: 'USB + USB Host Passthrough',
    statusBadge: 'Special Auth Dongle',
    statusColor: 'red',
    notes:
      'Native PS5 titles require specialized authentication. Must use a Besavior P5General dongle connected to Santroller USB Host.',
    pluginOrAuth: 'Besavior P5General',
  },
  {
    console: 'Xbox 360',
    games: 'All Guitar Hero, Rock Band, DJ Hero & standard games',
    recommendedMode: 'Xbox 360 Guitar / Drums / Gamepad',
    connection: 'Direct USB',
    statusBadge: 'Native Plug & Play',
    statusColor: 'teal',
    notes:
      'Santroller includes built-in Xbox 360 security keys. Works completely out of the box on all Xbox 360 consoles with zero setup or extra hardware required.',
  },
  {
    console: 'Xbox One / Series X|S',
    games: 'Fortnite Festival (Pro Lead / Bass / Drums)',
    recommendedMode: 'Keyboard Profile (Festival Preset / Custom Keys)',
    connection: 'Direct USB',
    statusBadge: 'No Auth Needed',
    statusColor: 'teal',
    notes:
      'Create a Keyboard Profile in Santroller. Xbox consoles accept USB keyboards without controller security checks, allowing you to map and customize every key freely.',
  },
  {
    console: 'Xbox One / Series X|S',
    games: 'Rock Band 4 & Native Xbox One/Series Games',
    recommendedMode: 'Xbox One Gamepad / Riffmaster',
    connection: 'USB Host Passthrough OR I2C Auth Chip',
    statusBadge: 'Auth Required',
    statusColor: 'yellow',
    notes:
      'Can be authenticated via USB Host using official or most third-party Xbox One controllers, or internally via a harvested Xbox One security chip wired over I2C.',
    pluginOrAuth: 'Xbox One Controller (Official/3rd-Party) OR Harvested I2C Auth Chip',
  },
  {
    console: 'Nintendo Wii & Wii U',
    games: 'Rock Band 1, 2, 3, Beatles',
    recommendedMode: 'Rock Band Guitar / Drums (Wii USB)',
    connection: 'Direct USB',
    statusBadge: 'Native USB',
    statusColor: 'teal',
    notes:
      'Wii Rock Band games use standard USB instruments. Set your emulation mode to Rock Band and plug in.',
  },
  {
    console: 'Nintendo Wii & Wii U',
    games: 'Guitar Hero, Band Hero, DJ Hero',
    recommendedMode: 'Wii Remote Bluetooth Emulation (Pico W or BT Dongle)',
    connection: 'Wireless Bluetooth OR USB (Brainslug) OR Physical Extension',
    statusBadge: 'Native Wireless',
    statusColor: 'teal',
    notes:
      'Santroller can now emulate the entire Wii Remote over Bluetooth using a Pico W or a USB-hosted Bluetooth dongle. This works natively on unmodified Wiis with real discs! Alternatively, use Brainslug on modded Wiis or wire a physical Wii extension cable.',
    pluginOrAuth: 'Bluetooth (Pico W or USB BT Dongle)',
  },
  {
    console: 'Nintendo Switch',
    games: 'All Switch Games (e.g. Taiko, Rhythm Sprout)',
    recommendedMode: 'Nintendo Switch Pro Controller',
    connection: 'Direct USB',
    statusBadge: 'Native Plug & Play',
    statusColor: 'teal',
    notes:
      'Plug-and-play. Remember to enable "Pro Controller Wired Communication" in Switch System Settings -> Controllers and Sensors.',
  },
  {
    console: 'Original Xbox',
    games: 'All Original Xbox titles',
    recommendedMode: 'Original Xbox (ogxbox)',
    connection: 'USB to Xbox Port Adapter',
    statusBadge: 'Native Protocol',
    statusColor: 'teal',
    notes:
      'Santroller natively speaks the Original Xbox USB protocol. Wire a standard USB-to-Xbox controller breakout cable.',
  },
];

export function CompatibilityPage() {
  const { t } = useTranslation();
  const [consoleFilter, setConsoleFilter] = useState<string>('all');

  const filteredRows = COMPATIBILITY_TABLE.filter((row) => {
    if (consoleFilter === 'all') {
      return true;
    }
    if (consoleFilter === 'playstation') {
      return row.console.includes('PlayStation');
    }
    if (consoleFilter === 'xbox') {
      return row.console.includes('Xbox');
    }
    if (consoleFilter === 'nintendo') {
      return row.console.includes('Nintendo') || row.console.includes('Wii');
    }
    if (consoleFilter === 'pc') {
      return row.console.includes('PC');
    }
    return true;
  });

  return (
    <Layout>
      <Container size="xl" px="md" pb="xl">
        {/* Header */}
        <Stack gap="xs" mb="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Title order={1} size="h2" fw={700}>
                {t('compatibility.title', 'Console Compatibility & Emulation Modes')}
              </Title>
              <Text size="sm" c="dimmed">
                {t(
                  'compatibility.subtitle',
                  'Detailed guide to Santroller emulation modes, console security handshakes, and setup guides for Wii Brainslug and PS2 PADEMU.'
                )}
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
              {t('nav.supportedHardware', 'Supported Hardware')}
            </Button>
          </Group>
        </Stack>

        <Tabs defaultValue="matrix" color="blue" radius="md">
          <Tabs.List mb="lg">
            <Tabs.Tab value="matrix" leftSection={<IconDeviceGamepad size={16} />}>
              Compatibility Matrix
            </Tabs.Tab>
            <Tabs.Tab value="modes" leftSection={<IconDeviceGamepad2 size={16} />}>
              Emulation Modes
            </Tabs.Tab>
            <Tabs.Tab value="plugins" leftSection={<IconTerminal2 size={16} />}>
              Console Plugins & Homebrew
            </Tabs.Tab>
            <Tabs.Tab value="auth" leftSection={<IconShieldLock size={16} />}>
              Authentication Passthrough
            </Tabs.Tab>
            <Tabs.Tab value="festival" leftSection={<IconBrandWindows size={16} />}>
              Fortnite Festival Guide
            </Tabs.Tab>
          </Tabs.List>

          {/* ================= TAB 1: COMPATIBILITY MATRIX ================= */}
          <Tabs.Panel value="matrix">
            <Stack gap="md">
              <Group justify="space-between" align="center" wrap="wrap">
                <Text size="sm" fw={600}>
                  Filter by Console Ecosystem:
                </Text>
                <SegmentedControl
                  size="xs"
                  value={consoleFilter}
                  onChange={setConsoleFilter}
                  data={[
                    { label: 'All Consoles', value: 'all' },
                    { label: 'PlayStation (PS2-PS5)', value: 'playstation' },
                    { label: 'Xbox (OG, 360, One, Series)', value: 'xbox' },
                    { label: 'Nintendo (Wii, Switch)', value: 'nintendo' },
                    { label: 'PC / Mac / Linux', value: 'pc' },
                  ]}
                />
              </Group>

              <Card withBorder radius="md" p={0} style={{ overflowX: 'auto' }}>
                <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: '18%' }}>Console</Table.Th>
                      <Table.Th style={{ width: '22%' }}>Game / Scenario</Table.Th>
                      <Table.Th style={{ width: '18%' }}>Emulation Mode</Table.Th>
                      <Table.Th style={{ width: '14%' }}>Connection</Table.Th>
                      <Table.Th style={{ width: '12%' }}>Status</Table.Th>
                      <Table.Th style={{ width: '16%' }}>Requirements</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredRows.map((row, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>
                          <Text size="xs" fw={600}>
                            {row.console}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{row.games}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Code color="blue">{row.recommendedMode}</Code>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {row.connection}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" color={row.statusColor} variant="light">
                            {row.statusBadge}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {row.pluginOrAuth ? (
                            <Text size="xs" fw={500} c="blue">
                              {row.pluginOrAuth}
                            </Text>
                          ) : (
                            <Text size="xs" c="dimmed">
                              None
                            </Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            </Stack>
          </Tabs.Panel>

          {/* ================= TAB 2: EMULATION MODES ================= */}
          <Tabs.Panel value="modes">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Santroller supports several distinct emulation types in firmware. Configure your
                mode under <strong>Controller Settings &rarr; Emulation Type</strong> in the
                Configurator.
              </Text>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Title order={4} size="h5">
                      Guitar Hero Guitar
                    </Title>
                    <Badge color="red" variant="light">
                      Guitar Hero
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="sm">
                    Replicates original Guitar Hero hardware (PS3 / Xbox 360 / Wii / PS2). Includes
                    dedicated mappings for 5 fret buttons (Green, Red, Yellow, Blue, Orange),
                    up/down strum bar, whammy bar potentiometer, tilt sensor, and Star Power button.
                  </Text>
                  <List size="xs" spacing={4}>
                    <List.Item>
                      Compatible with all Guitar Hero games across PS3, 360, Wii
                    </List.Item>
                    <List.Item>Supports touch slider / solo strip on compatible guitars</List.Item>
                    <List.Item>Full whammy axis calibration and deadzone controls</List.Item>
                  </List>
                </Card>

                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Title order={4} size="h5">
                      Rock Band Guitar
                    </Title>
                    <Badge color="blue" variant="light">
                      Rock Band
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="sm">
                    Replicates the Fender Stratocaster. Features 5 primary frets plus 5 lower solo
                    frets (tapping notes without strumming), a 5-way pickup selector switch for
                    audio effects, whammy bar, and Overdrive tilt.
                  </Text>
                  <List size="xs" spacing={4}>
                    <List.Item>
                      Solo frets automatically register as tap notes in Rock Band
                    </List.Item>
                    <List.Item>5-way switch maps to audio effect filters in RB2/3/4</List.Item>
                    <List.Item>Works natively over USB in Rock Band 1-4</List.Item>
                  </List>
                </Card>

                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Title order={4} size="h5">
                      Rock Band Drums & Pro Drums
                    </Title>
                    <Badge color="teal" variant="light">
                      Drums
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="sm">
                    Supports 4 drum pads (Red, Yellow, Blue, Green), bass kick pedals, and optional
                    Pro Drum cymbals (Yellow, Blue, Green cymbals) with independent velocity
                    dynamics.
                  </Text>
                  <List size="xs" spacing={4}>
                    <List.Item>
                      Pro Drums flag signals cymbals independently to Rock Band 3 & 4
                    </List.Item>
                    <List.Item>Supports electronic drum kits via MIDI IN or USB-MIDI</List.Item>
                    <List.Item>Custom crosstalk and piezo debounce filtering in firmware</List.Item>
                  </List>
                </Card>

                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Title order={4} size="h5">
                      DJ Hero Turntable
                    </Title>
                    <Badge color="violet" variant="light">
                      DJ Hero
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="sm">
                    Emulates the DJ Hero turntable controller with left and right platter optical
                    quadrature encoders, 3 stream buttons (Green, Red, Blue), crossfader, Euphoria
                    button, and effects dial.
                  </Text>
                  <List size="xs" spacing={4}>
                    <List.Item>High-resolution rotary encoder tracking</List.Item>
                    <List.Item>Calibratable crossfader center and edge zones</List.Item>
                  </List>
                </Card>

                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Title order={4} size="h5">
                      Fortnite Festival (Profiles & Presets)
                    </Title>
                    <Badge color="grape" variant="light">
                      Fortnite Festival
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="sm">
                    In modern Santroller firmware, Fortnite Festival is handled through customizable
                    Profiles rather than rigid built-in modes. This gives you full control over key
                    bindings, strum keys, and overdrive triggers.
                  </Text>
                  <List size="xs" spacing={4}>
                    <List.Item>
                      <strong>Custom Key Bindings:</strong> Set up your own exact keys for every fret,
                      strum, and navigation button.
                    </List.Item>
                    <List.Item>
                      <strong>1-Click Presets:</strong> Quickly load built-in presets (Lead Guitar,
                      Pro Guitar, Drums, Pro Drums).
                    </List.Item>
                    <List.Item>
                      <strong>Consoles (PS4/PS5/Xbox):</strong> Use a Keyboard profile to play without
                      console controller authentication or dongles!
                    </List.Item>
                    <List.Item>
                      <strong>Overdrive Integration:</strong> Enable 'Select to D-pad Left' in profile
                      options for instant Star Power in game.
                    </List.Item>
                  </List>
                </Card>

                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Title order={4} size="h5">
                      Standard Gamepad & Arcade Modes
                    </Title>
                    <Badge color="gray" variant="light">
                      Universal
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="sm">
                    Standard gaming modes for traditional controllers, dance pads, and Japanese
                    arcade titles.
                  </Text>
                  <List size="xs" spacing={4}>
                    <List.Item>
                      Standard XInput (PC/Xbox), DirectInput (PS3/Switch), and OG Xbox
                    </List.Item>
                    <List.Item>
                      BEMANI modes: Pop'n Music, Beatmania IIDX, and GuitarFreaks
                    </List.Item>
                    <List.Item>Arcade I/O: PDLoader and Spice2x compatibility</List.Item>
                  </List>
                </Card>
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* ================= TAB 3: PLUGINS & HOMEBREW ================= */}
          <Tabs.Panel value="plugins">
            <Stack gap="lg">
              {/* Wireless Wii Remote Emulation Guide (Recommended) */}
              <Paper withBorder radius="md" p="lg" style={{ borderColor: 'var(--mantine-color-teal-6)' }}>
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                      <IconBluetooth size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} size="h4">
                        Nintendo Wii & Wii U: Wireless Wii Remote Emulation (Recommended)
                      </Title>
                      <Text size="xs" c="dimmed">
                        Connect natively via Bluetooth with ZERO console modifications, plugins, or homebrew
                      </Text>
                    </div>
                  </Group>
                  <Badge color="teal" variant="filled">
                    Recommended Method
                  </Badge>
                </Group>

                <Alert
                  color="teal"
                  icon={<IconCheck size={16} />}
                  title="No Softmods or Homebrew Required!"
                  mb="md"
                >
                  <Text size="xs">
                    Modern Santroller firmware can <strong>emulate an entire wireless Nintendo Wii Remote</strong> directly
                    over Bluetooth. This allows you to play <strong>Guitar Hero, Band Hero, and DJ Hero</strong> on completely
                    stock Wii and Wii U consoles running real retail game discs, without needing Brainslug or homebrew.
                  </Text>
                </Alert>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
                  <Card withBorder radius="md" p="sm">
                    <Text size="sm" fw={600} c="teal" mb={4}>
                      Hardware Options
                    </Text>
                    <List size="xs" spacing={4}>
                      <List.Item>
                        <strong>Raspberry Pi Pico W / Pico 2 W:</strong> Built-in CYW43439 Bluetooth radio emulates the Wii Remote wirelessly.
                        <Text size="xs" c="red" fw={500} mt={2}>
                          * Warning: Avoid knockoff AliExpress "Pico W" boards that use an ESP8285/ESP8266 chip. They lack Bluetooth hardware and will not work!
                        </Text>
                      </List.Item>
                      <List.Item>
                        <strong>Standard Pico + USB Host BT Dongle:</strong> Plug a CSR8510 or BCM20702 Bluetooth adapter into your Pico's USB host port.
                      </List.Item>
                    </List>
                  </Card>

                  <Card withBorder radius="md" p="sm">
                    <Text size="sm" fw={600} c="teal" mb={4}>
                      Pairing Instructions
                    </Text>
                    <List type="ordered" size="xs" spacing={4}>
                      <List.Item>
                        Configure your device in Santroller Configurator with <strong>Wii Remote Emulation</strong> enabled.
                      </List.Item>
                      <List.Item>
                        Power on your instrument and your Nintendo Wii / Wii U console.
                      </List.Item>
                      <List.Item>
                        Press the red <strong>SYNC</strong> button on the Wii console, then press SYNC on your controller.
                      </List.Item>
                      <List.Item>
                        The controller connects as Player 1 (or 2/3/4) and behaves as a genuine Wii Remote with guitar/drum extension!
                      </List.Item>
                    </List>
                  </Card>
                </SimpleGrid>
              </Paper>

              {/* Brainslug Wii Guide */}
              <Paper withBorder radius="md" p="lg">
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon color="red" variant="light" size="lg" radius="md">
                      <IconDownload size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} size="h4">
                        Nintendo Wii: Santroller Brainslug (Alternative / USB Option)
                      </Title>
                      <Text size="xs" c="dimmed">
                        Allows Guitar Hero, Band Hero, and DJ Hero on Wii to recognize wired USB
                        instruments as Wii Remotes
                      </Text>
                    </div>
                  </Group>
                  <Badge color="red" variant="light">
                    Wii / Wii U Homebrew
                  </Badge>
                </Group>

                <Text size="xs" mb="md">
                  If you are using a wired USB controller without Bluetooth hardware, Guitar
                  Hero and DJ Hero on Wii expect guitars to be plugged into a Wii Remote extension port.
                  <strong> Santroller Brainslug</strong> is a custom homebrew module that intercepts
                  game controller routines and routes USB instruments directly to the game!
                </Text>

                <Accordion variant="separated" radius="md">
                  <Accordion.Item value="disc">
                    <Accordion.Control>
                      <Text size="sm" fw={600}>
                        Setup with Real Game Discs (Homebrew Channel)
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List type="ordered" size="xs" spacing="xs">
                        <List.Item>
                          Download <Code>sd.zip</Code> from the{' '}
                          <Anchor
                            href="https://github.com/Santroller/santroller-bslug/releases/latest"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Santroller Brainslug Releases <IconExternalLink size={12} />
                          </Anchor>
                        </List.Item>
                        <List.Item>
                          Extract the contents of <Code>sd.zip</Code> directly to the root of your
                          Wii SD card.
                        </List.Item>
                        <List.Item>
                          Plug your Santroller USB instrument into the Wii USB port.
                        </List.Item>
                        <List.Item>
                          Insert your game disc and launch the Homebrew Channel.
                        </List.Item>
                        <List.Item>
                          Launch <strong>Brainslug</strong> from the Homebrew Channel. The game will
                          boot with USB instrument support enabled.
                        </List.Item>
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>

                  <Accordion.Item value="usbloader">
                    <Accordion.Control>
                      <Text size="sm" fw={600}>
                        Setup with USB Loader GX (USB Hard Drive Games)
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Alert
                        color="red"
                        icon={<IconAlertTriangle size={16} />}
                        title="Important Requirement"
                        mb="sm"
                      >
                        <Text size="xs">
                          You <strong>must run the game from a USB hard drive/flash drive</strong>.
                          Booting games from an SD card locks the card and prevents Brainslug from
                          loading its modules.
                        </Text>
                      </Alert>

                      <List type="ordered" size="xs" spacing="xs">
                        <List.Item>
                          Download <Code>sd.zip</Code> from the{' '}
                          <Anchor
                            href="https://github.com/Santroller/santroller-bslug/releases/latest"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Santroller Brainslug Releases <IconExternalLink size={12} />
                          </Anchor>
                        </List.Item>
                        <List.Item>
                          Extract <Code>sd.zip</Code> to the root of your SD card.
                        </List.Item>
                        <List.Item>
                          In <Code>/bcs/dols/</Code>, rename <Code>RGHE52.dol</Code> to the{' '}
                          <strong>Title ID</strong> of the game you want to play (e.g.,{' '}
                          <Code>SXEE52.dol</Code> for Guitar Hero 5). You can duplicate and rename
                          the file for multiple games.
                        </List.Item>
                        <List.Item>Launch USBLoaderGX on your Wii.</List.Item>
                        <List.Item>
                          Select your Guitar Hero game and click <strong>Settings</strong> &rarr;{' '}
                          <strong>Game Load</strong>.
                        </List.Item>
                        <List.Item>
                          Set <strong>Game IOS</strong> to <Code>Custom</Code>.
                        </List.Item>
                        <List.Item>
                          Set <strong>Custom Game IOS</strong> to <Code>249</Code> (or your cIOS
                          slot).
                        </List.Item>
                        <List.Item>
                          Set <strong>Alternate DOL</strong> to <Code>Load from SD/USB</Code>.
                        </List.Item>
                        <List.Item>
                          Save settings, plug in your USB instrument, and launch the game!
                        </List.Item>
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Paper>

              {/* PS2 PADEMU Guide */}
              <Paper withBorder radius="md" p="lg">
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon color="indigo" variant="light" size="lg" radius="md">
                      <IconDeviceGamepad size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} size="h4">
                        PlayStation 2: PADEMU in Open PS2 Loader (OPL)
                      </Title>
                      <Text size="xs" c="dimmed">
                        Emulate standard PS2 controller inputs from USB instruments on modded PS2
                        consoles
                      </Text>
                    </div>
                  </Group>
                  <Badge color="indigo" variant="light">
                    PS2 Homebrew
                  </Badge>
                </Group>

                <Text size="xs" mb="md">
                  Because early PS2 games (such as Guitar Hero 1 & 2 and standard gamepads) only
                  recognize controllers wired to the front DualShock ports, they ignore standard USB
                  inputs. <strong>PADEMU (Pad Emulator)</strong> built into Open PS2 Loader
                  translates USB controllers into virtual PS2 controllers in software!
                </Text>

                <Alert color="blue" icon={<IconInfoCircle size={16} />} mb="md">
                  <Text size="xs">
                    <strong>Note:</strong> Santroller firmware automatically enters PS3 mode when
                    plugged into a PS2. PADEMU detects PS3 guitars and emulates an authentic PS2
                    Guitar Hero SG controller automatically. PADEMU works with ISO/backup games
                    booted through OPL (not retail disc booting).
                  </Text>
                </Alert>

                <List type="ordered" size="xs" spacing="xs">
                  <List.Item>
                    Plug your Santroller guitar or controller into a PS2 USB port.
                  </List.Item>
                  <List.Item>
                    Plug an original PS2 controller into Port 2 (useful for backup menu navigation).
                  </List.Item>
                  <List.Item>
                    Ensure you are running a recent build of{' '}
                    <Anchor
                      href="https://github.com/ps2homebrew/Open-PS2-Loader/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open PS2 Loader (OPL) <IconExternalLink size={12} />
                    </Anchor>
                    .
                  </List.Item>
                  <List.Item>
                    Launch OPL and press Start to open <strong>Settings</strong>.
                  </List.Item>
                  <List.Item>
                    Navigate to <strong>Configure PADEMU</strong>.
                  </List.Item>
                  <List.Item>
                    Set <strong>Pad Emulator</strong> to <Code>On</Code>.
                  </List.Item>
                  <List.Item>
                    Set <strong>Pad Emulator Mode</strong> to <Code>DualShock3/4 USB</Code>.
                  </List.Item>
                  <List.Item>
                    Set <strong>Multitap Emulation</strong> to <Code>Off</Code>.
                  </List.Item>
                  <List.Item>
                    Set <strong>Settings For Port</strong> to <Code>1P</Code> and set{' '}
                    <strong>Emulation</strong> to <Code>On</Code>.
                  </List.Item>
                  <List.Item>
                    Click <strong>OK</strong>, then select <strong>Save Changes</strong>.
                  </List.Item>
                  <List.Item>
                    Launch Guitar Hero or any standard PS2 game from OPL. Your USB instrument will
                    now work!
                  </List.Item>
                </List>
              </Paper>

              {/* Modded Console Plugins */}
              <Paper withBorder radius="md" p="lg">
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <ThemeIcon color="green" variant="light" size="lg" radius="md">
                      <IconShieldLock size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} size="h4">
                        Modded Console Plugins: PS4 OrbisInstrumentalizer
                      </Title>
                      <Text size="xs" c="dimmed">
                        Patch out instrument restrictions on jailbroken PlayStation 4 consoles
                      </Text>
                    </div>
                  </Group>
                  <Badge color="green" variant="light">
                    PS4 Jailbreak Plugin
                  </Badge>
                </Group>

                <Card withBorder radius="md" p="sm">
                  <Title order={4} size="h5" mb={4}>
                    PS4: OrbisInstrumentalizer
                  </Title>
                  <Text size="xs" c="dimmed" mb="xs">
                    GoldHEN plugin for jailbroken PlayStation 4 consoles.
                  </Text>
                  <Text size="xs" mb="xs">
                    Patches Rock Band 4 and Guitar Hero Live to remove instrument restrictions and
                    authentication checks, allowing any USB guitar or drum controller to work without
                    needing an authentic security controller plugged into the USB Host port.
                  </Text>
                  <Anchor
                    href="https://github.com/InvoxiPlayGames/OrbisInstrumentalizer"
                    target="_blank"
                    rel="noopener noreferrer"
                    size="xs"
                  >
                    View on GitHub <IconExternalLink size={10} />
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
                title="How Console Controller Authentication Works"
                color="blue"
                radius="md"
              >
                <Text size="xs">
                  Modern consoles (Xbox One, Xbox Series, PS4, PS5) challenge connected USB
                  controllers with cryptographic challenges every few minutes. If a controller
                  cannot sign the challenge using an official private key, the console disables or
                  disconnects it after 8 minutes.
                </Text>
              </Alert>

              <Title order={3} size="h4">
                Methods to Handle Authentication
              </Title>

              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                <Card withBorder radius="md" p="md">
                  <ThemeIcon color="teal" variant="light" size="lg" radius="md" mb="xs">
                    <IconCheck size={20} />
                  </ThemeIcon>
                  <Title order={4} size="h5" mb={4}>
                    1. Built-in Keys
                  </Title>
                  <Text size="xs" c="dimmed">
                    Santroller includes built-in security keys for the <strong>Xbox 360</strong>. It
                    passes the Xbox 360 security handshake natively without requiring an external
                    dongle or setup.
                  </Text>
                </Card>

                <Card withBorder radius="md" p="md">
                  <ThemeIcon color="blue" variant="light" size="lg" radius="md" mb="xs">
                    <IconPlug size={20} />
                  </ThemeIcon>
                  <Title order={4} size="h5" mb={4}>
                    2. USB Passthrough
                  </Title>
                  <Text size="xs" c="dimmed">
                    Connect an official controller or most third-party Xbox One gamepads / security
                    dongles into the secondary USB Host port. Santroller transparently passes
                    challenges through while you play.
                  </Text>
                </Card>

                <Card withBorder radius="md" p="md">
                  <ThemeIcon color="cyan" variant="light" size="lg" radius="md" mb="xs">
                    <IconCpu size={20} />
                  </ThemeIcon>
                  <Title order={4} size="h5" mb={4}>
                    3. Harvested Chip (I2C)
                  </Title>
                  <Text size="xs" c="dimmed">
                    Harvest the security authentication chip from an Xbox One controller PCB and wire
                    it directly to the Pico via I2C. Enables fully internal, dongle-free Xbox One/Series
                    authentication!
                  </Text>
                </Card>

                <Card withBorder radius="md" p="md">
                  <ThemeIcon color="grape" variant="light" size="lg" radius="md" mb="xs">
                    <IconShieldLock size={20} />
                  </ThemeIcon>
                  <Title order={4} size="h5" mb={4}>
                    4. No-Auth Modes
                  </Title>
                  <Text size="xs" c="dimmed">
                    Use protocol modes that do not require authentication:
                    <br />• <strong>Fortnite Festival:</strong> Keyboard Profiles
                    <br />• <strong>Rock Band 4 on PS4/PS5:</strong> Legacy PS3 mode
                  </Text>
                </Card>
              </SimpleGrid>

              <Paper withBorder radius="md" p="lg" mt="sm">
                <Title order={4} size="h5" mb="xs">
                  Supported Security Hardware for Xbox & PlayStation
                </Title>
                <Text size="xs" c="dimmed" mb="md">
                  When USB Host inputs or an I2C Xbox One auth chip are configured, authentication challenges
                  from the console are automatically handled:
                </Text>

                <Table striped horizontalSpacing="md" verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Console</Table.Th>
                      <Table.Th>Supported Authentication Controller / Chip</Table.Th>
                      <Table.Th>Notes</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Td fw={600}>Xbox One / Series X|S</Table.Td>
                      <Table.Td>
                        Official or most 3rd-party wired Xbox One/Series gamepads, OR harvested Xbox One auth chip (I2C)
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">
                          Most third-party Xbox One gamepads are supported over USB Host. Alternatively, solder a harvested Xbox One security chip directly to Pico I2C pins for an internal, dongle-free build.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td fw={600}>PlayStation 4</Table.Td>
                      <Table.Td>DualShock 4 or Mayflash MAGPS4 / Magicboots PS4 dongle</Table.Td>
                      <Table.Td>
                        <Text size="xs">
                          Keep the dongle or controller connected while playing.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td fw={600}>PlayStation 5</Table.Td>
                      <Table.Td>Besavior P5General</Table.Td>
                      <Table.Td>
                        <Text size="xs">
                          Required for native PS5 titles. Magicboots PS4/S5 do not work on native
                          PS5 games.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
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
                title="Fortnite Festival: Configurable Profiles & Keybindings"
                color="teal"
                radius="md"
              >
                <Text size="xs">
                  In modern Santroller firmware, Fortnite Festival is no longer a rigid, hardcoded mode.
                  Instead, you set it up by creating <strong>Profiles</strong>! This gives you full
                  freedom to configure your own custom keybindings, choose between keyboard and controller
                  emulation, and play on consoles without needing any authentication dongles.
                </Text>
              </Alert>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Card withBorder radius="md" p="md">
                  <Title order={4} size="h5" mb={4}>
                    Why Use a Keyboard Profile on Consoles?
                  </Title>
                  <Text size="xs" c="dimmed" mb="sm">
                    Bypasses all console controller authentication without extra hardware!
                  </Text>
                  <Text size="xs" mb="xs">
                    Consoles (PlayStation 4, PlayStation 5, Xbox One, and Xbox Series X|S) enforce strict
                    cryptographic security handshakes on gamepads, causing unauthenticated devices to
                    disconnect after 8 minutes.
                  </Text>
                  <Text size="xs" mb="xs">
                    However, <strong>all modern consoles natively accept USB keyboards without any authentication checks</strong>.
                    By creating a Keyboard Profile in Santroller, your guitar or drum controller acts as a
                    standard keyboard—allowing you to play Fortnite Festival natively with zero timeouts and
                    no security dongles!
                  </Text>
                  <Badge color="teal" variant="light" size="xs">
                    Works on PS4, PS5, Xbox One & Series
                  </Badge>
                </Card>

                <Card withBorder radius="md" p="md">
                  <Title order={4} size="h5" mb={4}>
                    Playing on PC / Windows
                  </Title>
                  <Text size="xs" c="dimmed" mb="sm">
                    Choose between native controller mode or keyboard emulation
                  </Text>
                  <Text size="xs" mb="xs">
                    On PC, Fortnite Festival supports both native guitar controllers (like the PDP Riffmaster)
                    and standard keyboards:
                  </Text>
                  <List size="xs" spacing={4}>
                    <List.Item>
                      <strong>Native Guitar Mode:</strong> Use a standard Guitar Hero or Rock Band profile with
                      XInput enabled. Enable <strong>Send Select as D-pad Left</strong> in Profile Options so
                      Overdrive activates properly.
                    </List.Item>
                    <List.Item>
                      <strong>Keyboard Mode:</strong> Use a Keyboard profile if you prefer binding custom keys
                      or matching PC keyboard rhythm setups.
                    </List.Item>
                  </List>
                </Card>
              </SimpleGrid>

              <Paper withBorder radius="md" p="lg">
                <Title order={3} size="h4" mb="xs">
                  Step-by-Step: Creating a Fortnite Festival Profile
                </Title>
                <Text size="xs" c="dimmed" mb="md">
                  Follow these steps to create and customize your Fortnite Festival setup in the new configurator:
                </Text>

                <List type="ordered" size="xs" spacing="sm">
                  <List.Item>
                    <strong>Add a New Profile:</strong> In the sidebar under the <strong>Profiles</strong> section,
                    click <strong>Add profile</strong>. Name it something clear, such as <Code>Fortnite Keyboard</Code>.
                  </List.Item>
                  <List.Item>
                    <strong>Set Emulation Type to Keyboard:</strong> In your profile's options, set{' '}
                    <strong>Device to Emulate</strong> to <Code>Keyboard / Mouse</Code>.
                  </List.Item>
                  <List.Item>
                    <strong>Load a Mapping Preset (Optional Quickstart):</strong> Under the <strong>Mappings</strong> section,
                    select <strong>Presets</strong> to populate default bindings:
                    <List size="xs" spacing={2} mt={4}>
                      <List.Item>
                        <Code>Fortnite Festival - Guitar (Lead)</Code>: Binds frets to D, F, J, K, L and Overdrive to Space.
                      </List.Item>
                      <List.Item>
                        <Code>Fortnite Festival - Pro Guitar</Code>: Binds frets to 1-5, strums to Right Shift / Right Ctrl, whammy to Slash, and tilt to PageDown.
                      </List.Item>
                      <List.Item>
                        <Code>Fortnite Festival - Drums / Pro Drums</Code>: Binds pads and cymbals to standard drum keys.
                      </List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <strong>Customize Your Own Key Bindings:</strong> You are not locked into the presets! Click any input row
                    to bind your frets, strum bar, whammy bar, or tilt sensor to whatever keys you prefer in your in-game Fortnite settings.
                  </List.Item>
                  <List.Item>
                    <strong>Add Menu Navigation Bindings:</strong> In the new firmware, you can bind navigation keys
                    (such as Arrow keys, Enter, or Escape) to dedicated buttons or button shortcuts (e.g. Start + Select) so you can navigate Fortnite's menus with ease.
                  </List.Item>
                  <List.Item>
                    <strong>Set Profile Assignments (Triggers):</strong> Under <strong>Assignments</strong>, configure when this profile activates.
                    You can set an activation trigger to hold a button (like the Green fret or Start button) while plugging in to switch into this profile, or set it as default.
                  </List.Item>
                  <List.Item>
                    <strong>Save to Device:</strong> Click <strong>Save Settings</strong>. Your controller will now output your custom keyboard bindings when plugged in!
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
