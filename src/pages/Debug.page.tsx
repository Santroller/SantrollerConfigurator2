import { IconCheck, IconCopy, IconTrash } from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Code,
  CopyButton,
  Group,
  Loader,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { midiNoteDisplayName } from '@/devices/midi';

const MIDI_NOTE_OFF = 0x80;
const MIDI_NOTE_ON = 0x90;
const MIDI_POLY_KEYPRESS = 0xa0;
const MIDI_CONTROL_CHANGE = 0xb0;
const MIDI_PROGRAM_CHANGE = 0xc0;
const MIDI_CHANNEL_PRESSURE = 0xd0;
const MIDI_PITCH_BEND_CHANGE = 0xe0;
const MIDI_PITCH_BEND_CENTER = 0x2000;
const channelTypes: { [key: number]: string } = {
  [MIDI_NOTE_OFF]: 'noteOff',
  [MIDI_NOTE_ON]: 'noteOn',
  [MIDI_POLY_KEYPRESS]: 'polyAftertouch',
  [MIDI_CONTROL_CHANGE]: 'controlChange',
  [MIDI_PROGRAM_CHANGE]: 'programChange',
  [MIDI_CHANNEL_PRESSURE]: 'channelAftertouch',
  [MIDI_PITCH_BEND_CHANGE]: 'pitchBend',
};
// System messages (0xF0 and up) use the whole status byte and have no channel
const systemTypes: { [key: number]: string } = {
  0xf0: 'sysEx',
  0xf1: 'timeCode',
  0xf2: 'songPosition',
  0xf3: 'songSelect',
  0xf6: 'tuneRequest',
  0xfa: 'start',
  0xfb: 'continue',
  0xfc: 'stop',
  0xff: 'reset',
};

function describeMidi(
  data: number[],
  t: TFunction
): { type: string; channel?: number; details?: string } {
  const status = data[0];
  if (status >= 0xf0) {
    const type = systemTypes[status] || 'unknown';
    switch (status) {
      case 0xf0:
        return { type, details: t('debug.midi.details.sysEx', { count: data.length }) };
      case 0xf2:
        return {
          type,
          details: t('debug.midi.details.songPosition', { value: data[1] | (data[2] << 7) }),
        };
      case 0xf3:
        return { type, details: t('debug.midi.details.song', { value: data[1] }) };
      default:
        return { type };
    }
  }
  const channel = (status & 0x0f) + 1;
  let command = status & 0xf0;
  // A note on with zero velocity is a note off
  if (command === MIDI_NOTE_ON && data[2] === 0) {
    command = MIDI_NOTE_OFF;
  }
  const type = channelTypes[command] || 'unknown';
  const note = () => `${data[1]} (${midiNoteDisplayName(data[1], channel, t)})`;
  switch (command) {
    case MIDI_NOTE_OFF:
    case MIDI_NOTE_ON:
      return {
        type,
        channel,
        details: t('debug.midi.details.note', { note: note(), velocity: data[2] }),
      };
    case MIDI_POLY_KEYPRESS:
      return {
        type,
        channel,
        details: t('debug.midi.details.polyAftertouch', { note: note(), pressure: data[2] }),
      };
    case MIDI_CONTROL_CHANGE:
      return {
        type,
        channel,
        details: t('debug.midi.details.controlChange', { controller: data[1], value: data[2] }),
      };
    case MIDI_PROGRAM_CHANGE:
      return { type, channel, details: t('debug.midi.details.program', { value: data[1] }) };
    case MIDI_CHANNEL_PRESSURE:
      return { type, channel, details: t('debug.midi.details.pressure', { pressure: data[1] }) };
    case MIDI_PITCH_BEND_CHANGE:
      return {
        type,
        channel,
        details: t('debug.midi.details.pitchBend', {
          value: (data[1] | (data[2] << 7)) - MIDI_PITCH_BEND_CENTER,
        }),
      };
    default:
      return { type, channel };
  }
}

// sinceLast is how long after the message before it this one arrived, in ms
function MidiRow({ data, sinceLast }: { data: number[]; sinceLast?: number }) {
  const { t } = useTranslation();
  const { type, channel, details } = describeMidi(data, t);
  return (
    <Table.Tr>
      <Table.Td>
        <Text ff="monospace" size="sm" c="dimmed">
          {sinceLast === undefined ? '-' : `+${Math.round(sinceLast)}`}
        </Text>
      </Table.Td>
      <Table.Td>{t(`debug.midi.${type}`)}</Table.Td>
      <Table.Td>{channel ?? '-'}</Table.Td>
      <Table.Td>{details}</Table.Td>
      <Table.Td>
        <Text ff="monospace" size="sm" c="dimmed">
          {data
            .map((x) => x.toString(16).padStart(2, '0'))
            .join(' ')
            .toUpperCase()}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

export function DebugPage() {
  const midiData = useConfigStore((state) => state.midiData);
  const midiTimes = useConfigStore((state) => state.midiTimes);
  const consoleData = useConfigStore((state) => state.console);
  const clearMidi = useConfigStore((state) => state.clearMidi);
  const clearConsole = useConfigStore((state) => state.clearConsole);
  const { t } = useTranslation();
  const mounted = useMounted();
  if (!mounted) {
    return <Loader />;
  }
  return (
    <>
      <Layout>
        <RequireDevice>
          <Group gap="xs">
            <Title order={4}>{t('debug.logs.title')}</Title>
            <CopyButton value={consoleData}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? t('debug.logs.copied') : t('debug.logs.copy')} withArrow>
                  <ActionIcon
                    color={copied ? 'teal' : undefined}
                    onClick={copy}
                    disabled={!consoleData}
                    aria-label={t('debug.logs.copy')}
                  >
                    {copied ? (
                      <IconCheck style={{ width: '70%', height: '70%' }} />
                    ) : (
                      <IconCopy style={{ width: '70%', height: '70%' }} />
                    )}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
            <Tooltip label={t('debug.logs.clear')} withArrow>
              <ActionIcon color="red" onClick={clearConsole} aria-label={t('debug.logs.clear')}>
                <IconTrash style={{ width: '70%', height: '70%' }} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Code block>{consoleData}</Code>
          <Group gap="xs" mt="md">
            <Title order={4}>{t('debug.midi.title')}</Title>
            <Tooltip label={t('debug.midi.clear')} withArrow>
              <ActionIcon color="red" onClick={clearMidi} aria-label={t('debug.midi.clear')}>
                <IconTrash style={{ width: '70%', height: '70%' }} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('debug.midi.time')}</Table.Th>
                <Table.Th>{t('debug.midi.type')}</Table.Th>
                <Table.Th>{t('debug.midi.channel')}</Table.Th>
                <Table.Th>{t('debug.midi.details.title')}</Table.Th>
                <Table.Th>{t('debug.midi.data')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {midiData
                .map((data, index) => (
                  <MidiRow
                    key={index}
                    data={data}
                    sinceLast={index > 0 ? midiTimes[index] - midiTimes[index - 1] : undefined}
                  />
                ))
                .toReversed()}
            </Table.Tbody>
          </Table>
        </RequireDevice>
      </Layout>
    </>
  );
}
