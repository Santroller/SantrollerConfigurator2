import React from 'react';
import { IconAlertTriangle, IconFile, IconFolder } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Group, List, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { LayoutMarker, LayoutMarkerList } from '@/guides/setup/setupGuideSteps';
import { externalLink, Rich, RichItems, StepTitle } from './guideText';

const K = 'compatibility.brainslug';
const BRAINSLUG_RELEASES = 'https://github.com/Santroller/santroller-bslug/releases/latest';
const HIGHLIGHT = 'var(--mantine-color-orange-filled)';

// ---------------------------------------------------------------------------------------------
// The SD card, as sd.zip leaves it
// ---------------------------------------------------------------------------------------------

interface TreeEntry {
  name: string;
  depth: number;
  folder?: boolean;
  marker?: number;
  highlight?: boolean;
  note?: string;
}

function FileTree({ entries }: { entries: TreeEntry[] }) {
  return (
    <Paper withBorder radius="md" p="sm" aria-hidden>
      <Stack gap={2}>
        {entries.map((entry) => {
          const Icon = entry.folder ? IconFolder : IconFile;
          return (
            <Group key={`${entry.depth}-${entry.name}`} gap={6} wrap="nowrap" pl={entry.depth * 18}>
              <Icon
                size={14}
                style={{ flexShrink: 0 }}
                color={entry.folder ? 'var(--mantine-color-yellow-6)' : undefined}
              />
              <Text
                size="xs"
                ff="monospace"
                fw={entry.highlight ? 700 : undefined}
                c={entry.highlight ? HIGHLIGHT : undefined}
              >
                {entry.name}
              </Text>
              {entry.note && (
                <Text size="xs" c="dimmed" truncate>
                  {entry.note}
                </Text>
              )}
              {entry.marker !== undefined && <LayoutMarker n={entry.marker} />}
            </Group>
          );
        })}
      </Stack>
    </Paper>
  );
}

const SD_TREE: TreeEntry[] = [
  { name: 'SD card', depth: 0, folder: true },
  { name: 'apps', depth: 1, folder: true },
  { name: 'brainslug', depth: 2, folder: true, marker: 1 },
  { name: 'boot.dol', depth: 3 },
  { name: 'bslug', depth: 1, folder: true, marker: 2 },
  { name: 'modules', depth: 2, folder: true },
  { name: 'santroller-bslug.mod', depth: 3 },
  { name: 'symbols', depth: 2, folder: true },
  { name: 'RGHE52.dol', depth: 1, marker: 3 },
];

const RENAMED_TREE: TreeEntry[] = [
  { name: 'SD card', depth: 0, folder: true },
  { name: 'apps', depth: 1, folder: true },
  { name: 'bslug', depth: 1, folder: true },
  { name: 'SXEE52.dol', depth: 1, highlight: true, note: '← RGHE52.dol' },
];

// ---------------------------------------------------------------------------------------------
// USB Loader GX's Game Load settings (source/settings/menus/GameLoadSM.cpp). A TV screen, so it
// keeps its own light look in both themes.
// ---------------------------------------------------------------------------------------------

const ULGX_BG = '#e9eef4';
const ULGX_ROW = '#ffffff';
const ULGX_TEXT = '#1d2430';
const ULGX_DIM = '#7d8796';

function UlgxRow({ name, value, marker }: { name: string; value?: string; marker?: number }) {
  const highlighted = marker !== undefined;
  return (
    <Group
      gap="xs"
      wrap="nowrap"
      px="sm"
      py={4}
      style={{
        background: ULGX_ROW,
        borderRadius: 6,
        border: `1px solid ${highlighted ? HIGHLIGHT : 'transparent'}`,
      }}
    >
      <Text size="xs" c={highlighted ? ULGX_TEXT : ULGX_DIM} style={{ flex: 1, minWidth: 0 }}>
        {name}
      </Text>
      {value !== undefined && (
        <Text size="xs" fw={highlighted ? 700 : undefined} c={highlighted ? ULGX_TEXT : ULGX_DIM}>
          {value}
        </Text>
      )}
      <Box w={22} style={{ flexShrink: 0 }}>
        {highlighted && <LayoutMarker n={marker} />}
      </Box>
    </Group>
  );
}

function Gap() {
  return (
    <Text size="xs" c={ULGX_DIM} ta="center" lh={1}>
      ⋮
    </Text>
  );
}

function GameLoadSketch() {
  return (
    <Paper radius="md" p="sm" aria-hidden style={{ background: ULGX_BG, color: ULGX_TEXT }}>
      <Text size="sm" fw={700} ta="center" c={ULGX_TEXT} mb="xs">
        Game Load
      </Text>
      <Stack gap={4}>
        <UlgxRow name="Video Mode" value="Use global" />
        <Gap />
        <UlgxRow name="Ocarina" value="Use global" />
        <UlgxRow name="Game IOS" value="Custom" marker={1} />
        <UlgxRow name="Custom Game IOS" value="249" marker={2} />
        <UlgxRow name="Block IOS Reload" value="Use global" />
        <Gap />
        <UlgxRow name="Alternate DOL" value="Load from SD/USB" marker={3} />
        <UlgxRow name="Select DOL Offset" />
      </Stack>
      <Group justify="center" gap="xs" mt="sm">
        <Box
          px="lg"
          py={4}
          style={{ background: ULGX_ROW, borderRadius: 16, border: `1px solid ${HIGHLIGHT}` }}
        >
          <Text size="xs" fw={700} c={ULGX_TEXT}>
            Save
          </Text>
        </Box>
        <LayoutMarker n={4} />
      </Group>
    </Paper>
  );
}

const SD_PARTS = ['app', 'modules', 'dol'] as const;
const GAME_LOAD_PARTS = ['ios', 'customIos', 'dol', 'save'] as const;

export function BrainslugGuide() {
  const { t } = useTranslation();
  const link = externalLink(BRAINSLUG_RELEASES);

  return (
    <Box id="brainslug">
      <Text size="sm" mb="sm">
        <Rich i18nKey={`${K}.intro`} />
      </Text>
      <Text size="sm" fw={600} mb={4}>
        {t(`${K}.needTitle`)}
      </Text>
      <List size="sm" spacing={4} mb="lg">
        <RichItems i18nKey={`${K}.need`} />
      </List>

      <Stack gap="lg">
        <Stack gap="sm">
          <StepTitle n={1} title={t(`${K}.sd.title`)} />
          <Text size="sm">
            <Rich i18nKey={`${K}.sd.body`} components={link} />
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <FileTree entries={SD_TREE} />
            <LayoutMarkerList
              items={SD_PARTS.map((part) => ({
                title: t(`${K}.sd.parts.${part}.title`),
                bodyKey: `${K}.sd.parts.${part}.body`,
              }))}
            />
          </SimpleGrid>
        </Stack>

        <Stack gap="sm">
          <StepTitle n={2} title={t(`${K}.playTitle`)} />
          <Text size="sm">{t(`${K}.playBody`)}</Text>
        </Stack>

        <Paper withBorder radius="md" p="md">
          <Title order={4} size="h5" mb="xs">
            {t(`${K}.disc.title`)}
          </Title>
          <List type="ordered" size="sm" spacing="xs">
            <RichItems i18nKey={`${K}.disc.steps`} />
          </List>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Title order={4} size="h5">
              {t(`${K}.usbLoader.title`)}
            </Title>
            <Alert
              color="red"
              icon={<IconAlertTriangle size={16} />}
              title={t(`${K}.usbLoader.alertTitle`)}
            >
              <Text size="sm">
                <Rich i18nKey={`${K}.usbLoader.alertBody`} />
              </Text>
            </Alert>
            <Text size="sm">
              <Rich i18nKey={`${K}.usbLoader.renameBody`} />
            </Text>
            <FileTree entries={RENAMED_TREE} />
            <Text size="sm">
              <Rich i18nKey={`${K}.usbLoader.settingsBody`} />
            </Text>
            <GameLoadSketch />
            <LayoutMarkerList
              items={GAME_LOAD_PARTS.map((part) => ({
                title: t(`${K}.usbLoader.parts.${part}.title`),
                bodyKey: `${K}.usbLoader.parts.${part}.body`,
              }))}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
