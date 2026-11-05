import React from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Group, List, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { LayoutMarker, LayoutMarkerList } from '@/guides/setup/setupGuideSteps';
import { externalLink, Rich, RichItems, StepTitle } from './guideText';

const K = 'compatibility.pademu';
const OPL_RELEASES = 'https://github.com/ps2homebrew/Open-PS2-Loader/releases';

// ---------------------------------------------------------------------------------------------
// Sketches of OPL's menus (src/menusys.c, src/dialogs.c, text from lng_tmpl/_base.yml). They stand
// in for a TV screen, so they keep OPL's dark look in both themes.
// ---------------------------------------------------------------------------------------------

const SCREEN_BG = '#0e1424';
const SCREEN_TEXT = '#e6ebf5';
const SCREEN_DIM = '#6b7690';
const SCREEN_RULE = '#3a4560';
const HIGHLIGHT = 'var(--mantine-color-orange-5)';

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      radius="md"
      p="md"
      aria-hidden
      style={{ background: SCREEN_BG, color: SCREEN_TEXT, border: `1px solid ${SCREEN_RULE}` }}
    >
      {children}
    </Paper>
  );
}

function Rule() {
  return <Box my={6} style={{ borderTop: `1px solid ${SCREEN_RULE}` }} />;
}

// One row of an OPL dialog: its label, and the value lined up after it
function Row({
  label,
  value,
  marker,
  dim,
}: {
  label: string;
  value?: string;
  marker?: number;
  dim?: boolean;
}) {
  const highlighted = marker !== undefined;
  return (
    <Group gap="xs" wrap="nowrap" py={2} style={{ opacity: dim ? 0.45 : 1 }}>
      <Text size="xs" style={{ flex: 1, minWidth: 0 }} c={SCREEN_TEXT}>
        {label}
      </Text>
      {value !== undefined && (
        <Text
          size="xs"
          fw={highlighted ? 700 : undefined}
          c={highlighted ? HIGHLIGHT : SCREEN_TEXT}
          w={{ base: 110, xs: 150 }}
          style={{ flexShrink: 0 }}
        >
          {value}
        </Text>
      )}
      <Box w={22} style={{ flexShrink: 0 }}>
        {marker !== undefined && <LayoutMarker n={marker} />}
      </Box>
    </Group>
  );
}

// The menu OPL opens on Start
function MainMenuSketch() {
  const items: [string, number?][] = [
    ['Settings'],
    ['Display Settings'],
    ['Audio Settings'],
    ['Controller Settings', 1],
    ['OSD Settings'],
    ['Parental Lock Settings'],
    ['Network Settings'],
    ['Network Update'],
    ['Start NBD Server'],
    ['About'],
    ['Save Changes', 2],
    ['Exit'],
    ['Power Off'],
  ];
  return (
    <Screen>
      <Stack gap={0}>
        {items.map(([label, marker]) => (
          <Group key={label} gap="xs" wrap="nowrap" py={1}>
            <Text
              size="xs"
              style={{ flex: 1 }}
              fw={marker ? 700 : undefined}
              c={marker ? HIGHLIGHT : SCREEN_DIM}
            >
              {label}
            </Text>
            <Box w={22}>{marker !== undefined && <LayoutMarker n={marker} />}</Box>
          </Group>
        ))}
      </Stack>
    </Screen>
  );
}

// diaPadEmuConfig, as it looks in DualShock3/4 USB mode (the bluetooth rows are hidden)
function PadEmuSketch() {
  return (
    <Screen>
      <Text size="sm" fw={700} c={SCREEN_TEXT}>
        Pad Emulator Settings
      </Text>
      <Rule />
      <Row label="Settings Mode" value="Global" />
      <Box h={8} />
      <Row label="Pad Emulator" value="On" marker={1} />
      <Row label="Pad Emulator Mode" value="DualShock3/4 USB" marker={2} />
      <Row label="Multitap Emulation" value="Off" marker={3} />
      <Row label="Multitap Emulator On Port:" value="1" dim />
      <Box h={8} />
      <Row label="Settings For Port:" value="1P" marker={4} />
      <Row label="Emulation" value="On" marker={4} />
      <Row label="Vibration" value="On" />
      <Rule />
      <Group justify="center" gap="xs" mt={4}>
        <Box px="md" py={2} style={{ border: `1px solid ${HIGHLIGHT}`, borderRadius: 4 }}>
          <Text size="xs" fw={700} c={HIGHLIGHT}>
            OK
          </Text>
        </Box>
        <LayoutMarker n={5} />
      </Group>
    </Screen>
  );
}

const MENU_PARTS = ['controller', 'save'] as const;
const DIALOG_PARTS = ['enable', 'mode', 'mtap', 'port', 'ok'] as const;

export function PademuGuide() {
  const { t } = useTranslation();
  const link = externalLink(OPL_RELEASES);

  return (
    <Box id="pademu">
      <Text size="sm" mb="md">
        <Rich i18nKey={`${K}.intro`} />
      </Text>

      <Alert color="blue" icon={<IconInfoCircle size={16} />} mb="lg">
        <Text size="sm">
          <Rich i18nKey={`${K}.note`} />
        </Text>
      </Alert>

      <Stack gap="lg">
        <Stack gap="xs">
          <StepTitle n={1} title={t(`${K}.before.title`)} />
          <List size="sm" spacing="xs">
            <RichItems i18nKey={`${K}.before.steps`} components={link} />
          </List>
        </Stack>

        <Stack gap="sm">
          <StepTitle n={2} title={t(`${K}.menu.title`)} />
          <Text size="sm">
            <Rich i18nKey={`${K}.menu.body`} />
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <MainMenuSketch />
            <LayoutMarkerList
              items={MENU_PARTS.map((part) => ({
                title: t(`${K}.menu.parts.${part}.title`),
                bodyKey: `${K}.menu.parts.${part}.body`,
              }))}
            />
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            <Rich i18nKey={`${K}.menu.perGame`} />
          </Text>
        </Stack>

        <Stack gap="sm">
          <StepTitle n={3} title={t(`${K}.dialog.title`)} />
          <Text size="sm">
            <Rich i18nKey={`${K}.dialog.body`} />
          </Text>
          <PadEmuSketch />
          <LayoutMarkerList
            items={DIALOG_PARTS.map((part) => ({
              title: t(`${K}.dialog.parts.${part}.title`),
              bodyKey: `${K}.dialog.parts.${part}.body`,
            }))}
          />
        </Stack>

        <Stack gap="xs">
          <StepTitle n={4} title={t(`${K}.playTitle`)} />
          <Text size="sm">
            <Rich i18nKey={`${K}.play`} />
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
