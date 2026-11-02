import React from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconMusic,
  IconPlugConnected,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import {
  addMidiDinInput,
  DEFAULT_MIDI_CHANNEL,
  ensureMidiDinDevice,
  findMidiDin,
  isMidiDinConfigured,
  MIDI_DIN_PINS,
  midiDinPinConflicts,
  midiDinPinOption,
  MidiDinPinOption,
  midiDinUartInUse,
  midiSlotChannel,
  pickMidiDinPins,
} from './midiDinSetup';

const P = 'guides.midi-din.steps';
const SCHEMATIC = '/guides/midi/diy-midi-receive-3.3v-v2_schem-1.png';

const MIDI_NOTE_ON = 0x90;
// General MIDI drum names for the notes the MIDI drum defaults map
const GM_DRUM_NOTES = new Set([35, 36, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 57, 59]);
const RECENT_HITS = 8;

/** The RX pin the guide shows: the MIDI input's own, or the one setup would pick */
function useCurrentPins(): MidiDinPinOption {
  const configured = useConfigStore((state) =>
    midiDinPinOption(findMidiDin(state)?.device.midiSerial?.uart.rx)
  );
  const picked = useConfigStore(pickMidiDinPins);
  return configured ?? picked;
}

interface ConnectionRow {
  from: string;
  to: string;
}

function ConnectionTable({ rows }: { rows: ConnectionRow[] }) {
  const { t } = useTranslation();
  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t(`${P}.din-wiring.thFrom`)}</Table.Th>
          <Table.Th>{t(`${P}.din-wiring.thTo`)}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr key={row.from}>
            <Table.Td>{row.from}</Table.Td>
            <Table.Td>{row.to}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function useSocketRows(): ConnectionRow[] {
  const { t } = useTranslation();
  const R = `${P}.din-wiring.rows`;
  return [
    { from: t(`${R}.din4`), to: t(`${R}.din4To`) },
    { from: t(`${R}.din5`), to: t(`${R}.din5To`) },
    { from: t(`${R}.dinNc`), to: t(`${R}.dinNcTo`) },
    { from: t(`${R}.diode`), to: t(`${R}.diodeTo`) },
  ];
}

function usePicoRows(pins: MidiDinPinOption): ConnectionRow[] {
  const { t } = useTranslation();
  const R = `${P}.din-wiring.rows`;
  return [
    { from: t(`${R}.opto6`), to: t(`${R}.opto6To`) },
    { from: t(`${R}.opto5`), to: t(`${R}.opto5To`) },
    { from: t(`${R}.opto4`), to: t(`${R}.opto4To`, { rx: pins.rx, physical: pins.rxPhysical }) },
    { from: t(`${R}.r2`), to: t(`${R}.r2To`) },
    { from: t(`${R}.opto3`), to: t(`${R}.opto3To`) },
  ];
}

// Step 1: Supplies & Overview
export function MidiDinIntroStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const socketRows = useSocketRows();
  const picoRows = usePicoRows(useCurrentPins());

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.din-intro.intro`)}</Text>

      <Title order={4}>{t('guides.common.howTitle')}</Title>
      <Text size="sm">{t(`${P}.din-intro.howText`)}</Text>

      <Title order={4}>{t('guides.common.suppliesTitle')}</Title>
      <GuideList iconColor="orange" items={t(`${P}.din-intro.supplies`, { returnObjects: true })} />

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t(`${P}.din-intro.voltageTitle`)}
      >
        {t(`${P}.din-intro.voltageText`)}
      </Alert>

      <Alert color="blue" icon={<IconInfoCircle size={16} />} title={t(`${P}.din-intro.keysTitle`)}>
        {t(`${P}.din-intro.keysText`)}
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${P}.din-intro.glanceTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${P}.din-intro.glanceDesc`)}
        </Text>
        <ConnectionTable rows={[...socketRows, ...picoRows]} />
      </Stack>
    </Card>
  );

  return (
    <StepWorkbench
      title={t(`${P}.din-intro.title`)}
      badge={t(`${P}.din-intro.badge`)}
      badgeColor="orange"
      description={t(`${P}.din-intro.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
    />
  );
}

// Step 2: Circuit & Wiring
// The RX pin picked on the wiring step. Picking one moves the MIDI input there straight away, and
// the wiring shown follows it.
function useMidiPin() {
  const connected = useConfigStore((state) => state.connected);
  const current = useCurrentPins();
  const deviceRx = useConfigStore((state) => findMidiDin(state)?.device.midiSerial?.uart.rx);
  const [rx, setRx] = React.useState(current.rx);
  const option = midiDinPinOption(rx) ?? current;
  // Derived here, as a selector returning a new array each time would re-render forever
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const clashes = (pin: MidiDinPinOption) => ({
    conflicts: midiDinPinConflicts(deviceStatus, pin),
    uartInUse: midiDinUartInUse(deviceStatus, pin),
  });
  const { conflicts, uartInUse } = clashes(option);
  const blocked = conflicts.length > 0 || uartInUse;
  const pick = (value: number) => {
    setRx(value);
    const pin = midiDinPinOption(value);
    const clash = pin && clashes(pin);
    if (connected && pin && clash && !clash.conflicts.length && !clash.uartInUse) {
      ensureMidiDinDevice(pin);
    }
  };
  return {
    connected,
    option,
    conflicts,
    uartInUse,
    blocked,
    applied: deviceRx === option.rx,
    pick,
    apply: () => ensureMidiDinDevice(option),
  };
}

function MidiPinCard({ pin }: { pin: ReturnType<typeof useMidiPin> }) {
  const { t } = useTranslation();
  const S = `${P}.din-setup`;
  const W = `${P}.din-wiring`;
  return (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${W}.pinCardTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${W}.pinCardDesc`)}
        </Text>
        <Select
          label={t(`${S}.pinLabel`)}
          data={MIDI_DIN_PINS.map((option) => ({
            value: String(option.rx),
            label: t(`${S}.pinOption`, {
              rx: option.rx,
              physical: option.rxPhysical,
              block: option.block,
            }),
          }))}
          value={String(pin.option.rx)}
          onChange={(value) => value && pin.pick(parseInt(value, 10))}
          allowDeselect={false}
        />
        {pin.conflicts.length > 0 && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            {t(`${S}.pinConflict`, { pins: pin.conflicts.map((p) => `GP${p}`).join(', ') })}
          </Alert>
        )}
        {pin.uartInUse && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            {t(`${S}.uartInUse`, { block: pin.option.block })}
          </Alert>
        )}
        {pin.applied && (
          <Badge color="teal" variant="filled" leftSection={<IconCheck size={14} />}>
            {t(`${W}.pinApplied`, { rx: pin.option.rx, block: pin.option.block })}
          </Badge>
        )}
        {!pin.applied && !pin.blocked && (
          <Button
            size="xs"
            color="orange"
            leftSection={<IconPlugConnected size={14} />}
            disabled={!pin.connected}
            onClick={pin.apply}
          >
            {t(`${W}.pinApplyBtn`)}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

export function MidiDinWiringStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const pin = useMidiPin();
  const pins = pin.option;
  const socketRows = useSocketRows();
  const picoRows = usePicoRows(pins);

  const guideContent = (
    <Stack gap="md">
      <Stack gap={4}>
        <Image src={SCHEMATIC} radius="md" bg="white" alt={t(`${P}.din-wiring.schematicCaption`)} />
        <Text size="xs" c="dimmed" ta="center">
          {t(`${P}.din-wiring.schematicCaption`)}
        </Text>
      </Stack>

      <Text size="sm">{t(`${P}.din-wiring.schematicText`)}</Text>

      <Alert
        color="orange"
        icon={<IconAlertTriangle size={16} />}
        title={t(`${P}.din-wiring.socketTitle`)}
      >
        {t(`${P}.din-wiring.socketText`)}
      </Alert>

      <Title order={4}>{t(`${P}.din-wiring.buildTitle`)}</Title>
      <GuideList
        type="ordered"
        items={t(`${P}.din-wiring.buildSteps`, {
          returnObjects: true,
          rx: pins.rx,
          rxPhysical: pins.rxPhysical,
        })}
      />

      <Alert color="blue" icon={<IconInfoCircle size={16} />} title={t(`${P}.din-wiring.capTitle`)}>
        {t(`${P}.din-wiring.capText`)}
      </Alert>

      <Title order={4}>{t(`${P}.din-setup.pinTitle`)}</Title>
      <Text size="sm">{t(`${P}.din-setup.pinText`)}</Text>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="sm">
      <MidiPinCard pin={pin} />
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${P}.din-wiring.socketTableTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`${P}.din-wiring.socketTableDesc`)}
          </Text>
          <ConnectionTable rows={socketRows} />
        </Stack>
      </Card>
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
        <Stack gap="xs">
          <Text fw={700} size="sm">
            {t(`${P}.din-wiring.picoTableTitle`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`${P}.din-wiring.picoTableDesc`)}
          </Text>
          <ConnectionTable rows={picoRows} />
        </Stack>
      </Card>
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.din-wiring.title`)}
      badge={t(`${P}.din-wiring.badge`)}
      badgeColor="orange"
      description={t(`${P}.din-wiring.description`)}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on adds the MIDI input on the picked pin too, so it isn't missed. A pin that clashes
      // with another device stops it, and the card says what's in the way.
      onNext={() => {
        if (pin.connected && !pin.applied) {
          if (pin.blocked) {
            return;
          }
          pin.apply();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

const CHANNELS = Array.from({ length: 16 }, (_, i) => String(i + 1));

// The MIDI input card's choices, kept by the step so moving on can set it up with them
function useMidiInputSetup() {
  const connected = useConfigStore((state) => state.connected);
  const configured = useConfigStore(isMidiDinConfigured);
  // The pin is picked on the wiring step, or picked here if that was skipped
  const current = useCurrentPins();
  const slotChannel = useConfigStore(midiSlotChannel);
  const [channel, setChannel] = React.useState(slotChannel ?? DEFAULT_MIDI_CHANNEL);
  const changed = !configured || slotChannel !== channel;
  return {
    connected,
    configured,
    current,
    slotChannel,
    channel,
    setChannel,
    changed,
    apply: () => addMidiDinInput(current, channel),
  };
}

function MidiInputSetup({ setup }: { setup: ReturnType<typeof useMidiInputSetup> }) {
  const { t } = useTranslation();
  const S = `${P}.din-setup`;
  const { connected, configured, current, slotChannel, channel, setChannel, changed, apply } =
    setup;

  return (
    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          {t(`${S}.cardTitle`)}
        </Text>
        <Text size="xs" c="dimmed">
          {t(`${S}.cardDesc`)}
        </Text>
        <Select
          label={t(`${S}.channelLabel`)}
          data={CHANNELS}
          value={String(channel)}
          onChange={(value) => value && setChannel(parseInt(value, 10))}
          allowDeselect={false}
        />
        <Text size="xs">{t(`${S}.pinFromWiring`, { rx: current.rx, block: current.block })}</Text>
        {configured && (
          <Badge color="teal" variant="filled" leftSection={<IconCheck size={14} />}>
            {t(`${S}.added`, { rx: current.rx, block: current.block, channel: slotChannel })}
          </Badge>
        )}
        {changed && (
          <Button
            size="xs"
            color="orange"
            leftSection={<IconPlugConnected size={14} />}
            disabled={!connected}
            onClick={apply}
          >
            {configured ? t(`${S}.updateBtn`) : t(`${S}.addBtn`)}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

// Step 3: MIDI Input Setup
export function MidiDinSetupStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const setup = useMidiInputSetup();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${P}.din-setup.intro`)}</Text>

      <Title order={4}>{t(`${P}.din-setup.channelTitle`)}</Title>
      <Text size="sm">{t(`${P}.din-setup.channelText`)}</Text>

      <Title order={4}>{t(`${P}.din-setup.notesTitle`)}</Title>
      <Text size="sm">{t(`${P}.din-setup.notesText`)}</Text>

      <Title order={4}>{t(`${P}.din-setup.whatTitle`)}</Title>
      <GuideList items={t(`${P}.din-setup.whatList`, { returnObjects: true })} />
    </Stack>
  );

  return (
    <StepWorkbench
      title={t(`${P}.din-setup.title`)}
      badge={t(`${P}.din-setup.badge`)}
      badgeColor="orange"
      description={t(`${P}.din-setup.description`)}
      guideContent={guideContent}
      workbenchContent={<MidiInputSetup setup={setup} />}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      // Moving on sets the MIDI input up too, so it isn't missed by not pressing the button
      onNext={() => {
        if (setup.connected && setup.changed) {
          setup.apply();
        }
        props.onNext?.();
      }}
      onPrevious={props.onPrevious}
    />
  );
}

interface NoteHit {
  channel: number;
  note: number;
  velocity: number;
}

/** Note ons (velocity above 0) in the MIDI monitor stream, newest first */
function useRecentHits(): NoteHit[] {
  const midiData = useConfigStore((state) => state.midiData);
  return React.useMemo(() => {
    const hits: NoteHit[] = [];
    for (let i = midiData.length - 1; i >= 0 && hits.length < RECENT_HITS; i--) {
      const [status, note, velocity] = midiData[i];
      if ((status & 0xf0) === MIDI_NOTE_ON && velocity > 0) {
        hits.push({ channel: (status & 0x0f) + 1, note, velocity });
      }
    }
    return hits;
  }, [midiData]);
}

/** Note numbers the profile's MIDI mappings read on a channel */
function mappedNotes(mappings: proto.IMapping[], channel: number | undefined): Set<number> {
  return new Set(
    mappings.flatMap((m) => {
      const midi = m.input?.midi;
      return midi?.sourceType === proto.MidiInputSourceType.MidiInputSourceType_MIDI &&
        midi.midiNote &&
        midi.midiNote.channel === channel
        ? [midi.midiNote.note]
        : [];
    })
  );
}

function MidiActivity() {
  const { t } = useTranslation();
  const S = 'guides.midi-din.check';
  const connected = useConfigStore((state) => state.connected);
  const device = useConfigStore(findMidiDin);
  const channel = useConfigStore(midiSlotChannel);
  const clearMidi = useConfigStore((state) => state.clearMidi);
  const hits = useRecentHits();
  const mappings = useConfigStore(
    (state) => state.config.profiles?.[state.currentProfile]?.mappings
  );
  const notes = React.useMemo(() => mappedNotes(mappings ?? [], channel), [mappings, channel]);
  const last = hits[0];
  const noteName = (note: number) =>
    GM_DRUM_NOTES.has(note) ? t(`${S}.gm.${note}`) : t(`${S}.unknownNote`);

  const status = !connected
    ? t('guides.common.picoNotConnected')
    : !device
      ? t(`${S}.notAdded`)
      : last
        ? t(`${S}.lastNote`, {
            note: last.note,
            name: noteName(last.note),
            channel: last.channel,
            velocity: last.velocity,
          })
        : t(`${S}.waiting`);

  return (
    <Stack gap="xs">
      <Badge
        size="lg"
        color={connected && device && last ? 'teal' : connected && device ? 'orange' : 'gray'}
        variant="light"
        leftSection={<IconMusic size={16} />}
        style={{ textTransform: 'none' }}
      >
        {status}
      </Badge>
      {last && channel !== undefined && last.channel !== channel && (
        <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
          {t(`${S}.wrongChannel`, { got: last.channel, channel })}
        </Alert>
      )}
      {hits.length > 0 && (
        <>
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t(`${S}.thNote`)}</Table.Th>
                <Table.Th>{t(`${S}.thChannel`)}</Table.Th>
                <Table.Th>{t(`${S}.thVelocity`)}</Table.Th>
                <Table.Th>{t(`${S}.thMapped`)}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {hits.map((hit, i) => (
                <Table.Tr key={i}>
                  <Table.Td>
                    {hit.note} ({noteName(hit.note)})
                  </Table.Td>
                  <Table.Td>{hit.channel}</Table.Td>
                  <Table.Td>{hit.velocity}</Table.Td>
                  <Table.Td>
                    {hit.channel === channel && notes.has(hit.note)
                      ? t(`${S}.mappedYes`)
                      : t(`${S}.mappedNo`)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Group justify="flex-end">
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              leftSection={<IconTrash size={12} />}
              onClick={clearMidi}
            >
              {t(`${S}.clearBtn`)}
            </Button>
          </Group>
        </>
      )}
    </Stack>
  );
}

// The notes arriving from the kit, and what to check if they don't, shown alongside the test step
export function MidiDinCheck() {
  const { t } = useTranslation();
  const C = 'guides.midi-din.check';
  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed">
        {t(`${C}.title`)}
      </Text>
      <Text size="xs" c="dimmed">
        {t(`${C}.activityDesc`)}
      </Text>
      <MidiActivity />
      <Text size="sm" fw={600} mt="xs">
        {t('guides.common.tipsTitle')}
      </Text>
      <GuideList type="ordered" items={t(`${C}.tips`, { returnObjects: true })} />
    </Stack>
  );
}
