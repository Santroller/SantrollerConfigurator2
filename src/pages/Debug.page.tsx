import {
  Button,
  Code,
  Loader,
  Table,
  Text,
} from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { useTranslation } from 'react-i18next';

const MIDI_NOTE_OFF = 0x80;
const MIDI_NOTE_ON = 0x90;
const MIDI_POLY_KEYPRESS = 0xA0;
const MIDI_CONTROL_CHANGE = 0xB0;
const MIDI_PROGRAM_CHANGE = 0xC0;
const MIDI_CHANNEL_PRESSURE = 0xD0;
const MIDI_PITCH_BEND_CHANGE = 0xE0;
const MIDI_SYSEX = 0xF0;
const types: { [key: number]: string } = {
  [MIDI_NOTE_OFF]: 'noteOff',
  [MIDI_NOTE_ON]: 'noteOn',
  [MIDI_POLY_KEYPRESS]: 'polyAftertouch',
  [MIDI_CONTROL_CHANGE]: 'controlChange',
  [MIDI_PROGRAM_CHANGE]: 'programChange',
  [MIDI_CHANNEL_PRESSURE]: 'channelAftertouch',
  [MIDI_PITCH_BEND_CHANGE]: 'pitchBend',
  [MIDI_SYSEX]: 'sysEx',
};
function MidiRow({ data, i }: { data: number[]; i: number }) {
  const { t } = useTranslation();
  return (
    <Table.Tr key={i}>
      <Table.Td>{t(types[data[0] & 0xf0] || 'unknown')}</Table.Td>
      <Table.Td>{(data[0] & 0x0f) + 1}</Table.Td>
      <Table.Td>
        <Text>
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
          <Text>{t('debug.title')}</Text> <Button onClick={clearConsole}>{t('debug.clear')}</Button>
          <Code block>{consoleData}</Code>
          <Text>{t('midi.title')}</Text> <Button onClick={clearMidi}>{t('midi.clear')}</Button>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('midi.type')}</Table.Th>
                <Table.Th>{t('midi.channel')}</Table.Th>
                <Table.Th>{t('midi.data')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {midiData.toReversed().map((data, index) => (
                <MidiRow key={index} data={data} i={index} />
              ))}
            </Table.Tbody>
          </Table>
        </RequireDevice>
      </Layout>
    </>
  );
}
