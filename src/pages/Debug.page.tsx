import {
  Loader,
  Table,
  Text,
} from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

const MIDI_NOTE_OFF = 0x80;
const MIDI_NOTE_ON = 0x90;
const MIDI_POLY_KEYPRESS = 0xA0;
const MIDI_CONTROL_CHANGE = 0xB0;
const MIDI_PROGRAM_CHANGE = 0xC0;
const MIDI_CHANNEL_PRESSURE = 0xD0;
const MIDI_PITCH_BEND_CHANGE = 0xE0;
const MIDI_SYSEX = 0xF0;
const types: { [key: number]: string } = {
  [MIDI_NOTE_OFF]: 'Note Off',
  [MIDI_NOTE_ON]: 'Note On',
  [MIDI_POLY_KEYPRESS]: 'Poly Key Pressure',
  [MIDI_CONTROL_CHANGE]: 'Control Change',
  [MIDI_PROGRAM_CHANGE]: 'Program Change',
  [MIDI_CHANNEL_PRESSURE]: 'Channel Pressure',
  [MIDI_PITCH_BEND_CHANGE]: 'Pitch Bend Change',
  [MIDI_SYSEX]: 'SysEx',
};
function MidiRow({ data, i }: { data: number[]; i: number }) {
  return (
    <Table.Tr key={i}>
      <Table.Td>{types[data[0] & 0xf0] || 'Unknown'}</Table.Td>
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
  const mounted = useMounted();
  if (!mounted) {
    return <Loader></Loader>;
  }
  return (
    <>
      <Layout>
        <RequireDevice>
          <Text>MIDI Monitor</Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>Channel</Table.Th>
                <Table.Th>Data</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {midiData.map((data, index) => (
                <MidiRow key={index} data={data} i={index} />
              ))}
            </Table.Tbody>
          </Table>
        </RequireDevice>
      </Layout>
    </>
  );
}
