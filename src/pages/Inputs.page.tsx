import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconBluetooth,
  IconChevronDown,
  IconCopy,
  IconDeviceGamepad,
  IconExclamationCircle,
  IconGripVertical,
  IconMoon,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconUsb,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  Accordion,
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Combobox,
  Divider,
  Flex,
  Group,
  Image,
  Input,
  InputBase,
  isNumberLike,
  Loader,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Overlay,
  Progress,
  SegmentedControl,
  Select,
  Slider,
  Space,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  useCombobox,
} from '@mantine/core';
import { useDisclosure, useTimeout } from '@mantine/hooks';
import {
  DeviceStatusLike,
  getAssignmentHostType,
  getDefaultMappings,
  getOutputSubType,
  USB_HOST_INPUT_SUBTYPES,
  USB_HOST_SUBTYPES,
} from '@/components/Defaults/defaultMappings';
import {
  getPresetKeyLabels,
  getPresetMappings,
  presetsFor,
} from '@/components/Defaults/mappingPresets';
import { hasDefaultMappings, isInputDeviceKind } from '@/components/Devices/deviceRegistry';
import { matrixHasPin } from '@/components/Devices/matrixPins';
import { PinBox } from '@/components/Devices/Pins';
import {
  getKeyboardKeyLabel,
  getLabel,
  getMatrixLabel,
  getMultiplexerLabel,
  getSwitchNetworkLabel,
  hasDefaults,
  isLed,
} from '@/components/Devices/pinUtils';
import { DeviceIdentitySettings } from '@/components/Inputs/DeviceNameSetting';
import { XboxOneLegacyAdapterSetting } from '@/components/Inputs/XboxOneLegacyAdapterSetting';
import { XInputOnWindowsDescription } from '@/components/Inputs/XInputOnWindowsDescription';
import { DropdownBox, StandardEnum } from '@/components/Inputs/DropdownBox';
import { HidKeyPicker } from '@/components/Inputs/HidKeyPicker';
import { InactivitySettings } from '@/components/Inputs/InactivitySettings';
import {
  DetectInputRequest,
  detectInputRequest,
  detectMidiRequest,
} from '@/components/Inputs/inputDetection';
import { RegisteredInputEditor } from '@/components/Inputs/InputEditorRegistry';
import {
  createDeviceInput,
  createSlotInput,
  createStandaloneInput,
  getAssignmentSlotIds,
  getHostSourceType,
  getInputDeviceId,
  getJoybusInputFilters,
  getProfileSlotForInput,
  getProfileSlotIds,
  getProfileSlotLabel,
  getProfileSlots,
  getProfileWideSlotIds,
  getPS2InputFilters,
  getRuleSummaryParts,
  getSelectedInput,
  getSNESInputFilters,
  isAnalogInput,
  isDrumInput,
  isSelectableWiiAxis,
  midiInputSourceType,
  moveWiiDrumNotesToMidiSlot,
  ProfileSlot,
} from '@/components/Inputs/inputRegistry';
import { LedColorInput } from '@/components/Inputs/LedColorInput';
import { ledOverlaps } from '@/components/Inputs/ledOverlap';
import { getInputLocalDeviceId, migrateSlotIds } from '@/components/Inputs/slotRemap';
import { useProfileLabels } from '@/components/Labels/useProfileLabels';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import {
  applyOrder,
  dragOrder,
  groupSortingStrategy,
  groupToEndOrder,
  groupToStartOrder,
  reorderIndexes,
  withoutGroupOrder,
} from '@/components/Selection/groupOrder';
import {
  anchorPreviewToPointer,
  GroupDragPreview,
  selectedCardStyle,
  SelectionBar,
  SelectToggle,
  useIndexSelection,
} from '@/components/Selection/Selection';
import {
  retargetRule,
  TARGET_ASSIGNMENT_TYPES,
} from '@/components/SettingsContext/assignmentTargets';
import { proto } from '@/components/SettingsContext/config';
import { truncateProfileName } from '@/components/SettingsContext/profileName';
import {
  DeviceStatus,
  hidOnlySubtypes,
  isDeviceAssigned,
  isMidiOutDevice,
  ps4Subtypes,
  requiresAssignment,
  useConfigStore,
} from '@/components/SettingsContext/SettingsContext';
import { countMappingsDroppedBySubType } from '@/components/SettingsContext/subTypeMappings';
import { CODE_TO_HID, hidKeyName, MEDIA_KEYS, mediaKeyName } from '@/devices/keyboard';
import {
  GM_PERCUSSION,
  MIDI_PERCUSSION_CHANNEL,
  midiNoteDisplayName,
  midiOutputLabel,
} from '@/devices/midi';
import { AllPinsNamed, AnalogPinsNamed } from '@/devices/pico/pins';

// Lets the browser skip layout and painting for cards that are off screen. A profile can have
// dozens of mapping cards, which made scrolling lag in WebKitGTK (the Linux desktop app). `auto`
// remembers each card's real size once it has been shown, the size here is only a first guess.
const OFFSCREEN_MAPPING_CARD: React.CSSProperties = {
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 420px auto 600px',
};
const OFFSCREEN_RULE_CARD: React.CSSProperties = {
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 420px auto 160px',
};

// Section headers stick just under the app header, which grows when the save bar shows. Wrapped in
// calc() so Mantine passes the variable through instead of trying to convert it to rem
const STICKY_HEADER_OFFSET = 'calc(var(--app-shell-header-offset, 0rem))';

const DRUM_HIT_DISPLAY_MS = 3000;
function useDecayedValue(live: number, enabled?: boolean) {
  const [shown, setShown] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!enabled || !live) {
      return;
    }
    setShown(live);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(0), DRUM_HIT_DISPLAY_MS);
  }, [enabled, live]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return enabled ? shown : live;
}
function StateLabelLabel({
  profileIdx,
  mappingIdx,
  listIdx,
  raw,
  activationBased,
  ledBased,
  zeroBased,
  crkdId,
  crkd,
}: {
  profileIdx: number;
  mappingIdx: number;
  listIdx?: number;
  raw?: boolean;
  activationBased?: boolean;
  ledBased?: boolean;
  zeroBased?: boolean;
  crkdId?: number;
  crkd?: keyof proto.ICrkdCalibrationData;
}) {
  const stateRaw = useConfigStore((state) =>
    crkd
      ? state.deviceStatus[crkdId!].crkdDrumCalibration[proto.CrkdDrumCalibrationType.RawValue][
          crkd
        ]
      : ledBased
        ? state.ledStatus[profileIdx][mappingIdx]?.stateRaw
        : activationBased
          ? state.activationStatus[profileIdx][listIdx!][mappingIdx]?.stateRaw
          : state.mappingStatus[profileIdx][mappingIdx]?.stateRaw
  );
  const liveState = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.state
      : activationBased
        ? state.activationStatus[profileIdx][listIdx!][mappingIdx]?.state
        : state.mappingStatus[profileIdx][mappingIdx]?.state
  );
  const decay = zeroBased && !ledBased && !activationBased;
  const value = useDecayedValue(Number(raw ? stateRaw : liveState) || 0, decay);
  return <span>{value}</span>;
}
function StateLabel({
  profileIdx,
  mappingIdx,
  listIdx,
  raw,
  activationBased,
  ledBased,
  zeroBased,
  crkdId,
  crkd,
}: {
  profileIdx: number;
  mappingIdx: number;
  listIdx?: number;
  raw?: boolean;
  activationBased?: boolean;
  ledBased?: boolean;
  zeroBased?: boolean;
  crkdId?: number;
  crkd?: keyof proto.ICrkdCalibrationData;
}) {
  return (
    <Center h="100%">
      <StateLabelLabel
        profileIdx={profileIdx}
        mappingIdx={mappingIdx}
        listIdx={listIdx}
        raw={raw}
        activationBased={activationBased}
        ledBased={ledBased}
        zeroBased={zeroBased}
        crkdId={crkdId}
        crkd={crkd}
      />
    </Center>
  );
}
function StateSection({
  profileIdx,
  mappingIdx,
  listIdx,
  min,
  max,
  center,
  deadzone,
  raw,
  trigger,
  activationBased,
  ledBased,
  zeroBased,
  crkdId,
  crkd,
}: {
  profileIdx: number;
  mappingIdx: number;
  listIdx?: number;
  min: number;
  max: number;
  center: number;
  deadzone: number;
  raw?: boolean;
  trigger?: boolean;
  activationBased?: boolean;
  ledBased?: boolean;
  zeroBased?: boolean;
  crkdId?: number;
  crkd?: keyof proto.ICrkdCalibrationData;
}) {
  const stateRaw = useConfigStore((state) =>
    crkd
      ? state.deviceStatus[crkdId!].crkdDrumCalibration[proto.CrkdDrumCalibrationType.RawValue][
          crkd
        ]
      : ledBased
        ? state.ledStatus[profileIdx][mappingIdx]?.stateRaw
        : activationBased
          ? state.activationStatus[profileIdx][listIdx!][mappingIdx]?.stateRaw
          : state.mappingStatus[profileIdx][mappingIdx]?.stateRaw
  );
  const liveState = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.state
      : activationBased
        ? state.activationStatus[profileIdx][listIdx!][mappingIdx]?.state
          ? 65535
          : 0
        : state.mappingStatus[profileIdx][mappingIdx]?.state
  );
  const decay = zeroBased && !ledBased && !activationBased;
  const decayedRaw = useDecayedValue(stateRaw ?? 0, decay);
  const state = useDecayedValue(liveState ?? 0, decay);
  let minCalc = min;
  let maxCalc = max;
  if (min > max) {
    minCalc = max;
    maxCalc = min;
  }
  if (trigger) {
    const minPerc = (minCalc / 65535) * 100;
    const maxPerc = (maxCalc / 65535) * 100;
    return (
      <>
        <Progress.Section value={(decayedRaw / 65535) * 100} />
        <Overlay
          gradient={`linear-gradient(90deg, rgba(255, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) ${minPerc}%, rgba(255, 0, 0, 0.2) ${minPerc}%, rgba(255, 0, 0, 0.2) ${maxPerc}%,  rgba(255, 0, 0, 0) ${maxPerc}%, rgba(0, 0, 0, 0) 100%, rgba(255, 0, 0, 0.2) 100%)`}
          opacity={0.85}
        />
      </>
    );
  }
  if (raw) {
    const minPerc = (minCalc / 65535) * 100;
    const maxPerc = (maxCalc / 65535) * 100;
    const deadZoneStartPerc = ((center - deadzone) / 65535) * 100;
    const deadZoneEndPerc = ((center + deadzone) / 65535) * 100;
    return (
      <>
        <Progress.Section value={(decayedRaw / 65535) * 100} />
        <Overlay
          gradient={`linear-gradient(90deg, rgba(255, 0, 0, 0.2) ${minPerc}%, rgba(0, 0, 0, 0) ${minPerc}%, rgba(0, 0, 0, 0) ${deadZoneStartPerc}%, rgba(255, 0, 0, 0.2) ${deadZoneStartPerc}%, rgba(255, 0, 0, 0.2) ${deadZoneEndPerc}%,  rgba(255, 0, 0, 0) ${deadZoneEndPerc}%, rgba(0, 0, 0, 0) ${maxPerc}%, rgba(255, 0, 0, 0.2) ${maxPerc}%)`}
          opacity={0.85}
        />
      </>
    );
  }
  return <Progress.Section value={(state / 65535) * 100} />;
}
// Upper bound of notches 1-4 when the range is split into 5 equal bands (matches the firmware)
const EVEN_PICKUP_THRESHOLDS = [1, 2, 3, 4].map((i) => Math.floor((65536 * i) / 5) - 1);

function pickupNotch(value: number, thresholds?: number[] | null): number {
  if (!thresholds || thresholds.length !== 4) {
    return Math.min(4, Math.floor((value * 5) / 65536));
  }
  const notch = thresholds.findIndex((threshold) => value <= threshold);
  return notch === -1 ? 4 : notch;
}

function PickupNotches({
  mapping,
  mappingIdx,
  profileIdx,
  dispatch,
}: {
  mapping: proto.IMapping;
  mappingIdx: number;
  profileIdx: number;
  dispatch: (mapping: proto.IMapping) => void;
}) {
  const { t } = useTranslation();
  const current = useConfigStore(
    (state) => state.mappingStatus[profileIdx]?.[mappingIdx]?.state ?? 0
  );
  const thresholds =
    mapping.pickupThresholds && mapping.pickupThresholds.length === 4
      ? mapping.pickupThresholds
      : null;
  const setThreshold = (idx: number, value: number) => {
    const next = [...(thresholds ?? EVEN_PICKUP_THRESHOLDS)];
    next[idx] = value;
    dispatch({ ...mapping, pickupThresholds: next });
  };
  return (
    <>
      <Text size="sm" fw={700}>
        {t('pickup.current', { notch: t(`pickup.notch.${pickupNotch(current, thresholds)}`) })}
      </Text>
      <Space h="xs" />
      <Switch
        label={t('pickup.custom.label')}
        description={t('pickup.custom.description')}
        checked={!!thresholds}
        onChange={(event) =>
          dispatch({
            ...mapping,
            pickupThresholds: event.currentTarget.checked ? [...EVEN_PICKUP_THRESHOLDS] : [],
          })
        }
      />
      {thresholds &&
        thresholds.map((threshold, idx) => (
          <div key={idx}>
            <Space h="sm" />
            <Text size="sm" fw={700}>
              {t('pickup.threshold', {
                from: t(`pickup.notch.${idx}`),
                to: t(`pickup.notch.${idx + 1}`),
              })}
            </Text>
            <Group>
              <Slider
                flex={1}
                value={threshold}
                min={0}
                max={65535}
                onChange={(val) => setThreshold(idx, val)}
              />
              <NumberInput
                value={threshold}
                min={0}
                max={65535}
                onChange={(e) => setThreshold(idx, parseInt(e.toString(), 10))}
                w={100}
              />
              <Button onClick={() => setThreshold(idx, current)}>{t('pin_use_current')}</Button>
            </Group>
          </div>
        ))}
      <Space h="md" />
    </>
  );
}

// A 0 - 65535 value as a slider and number input, with an optional "use current" button
function ValueRow({
  label,
  description,
  value,
  onChange,
  current,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  current?: () => number;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Input.Label mb={3}>{label}</Input.Label>
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      <Group>
        <Slider flex={1} value={value} min={0} max={65535} onChange={onChange} />
        <NumberInput
          value={value}
          min={0}
          max={65535}
          onChange={(e) => onChange(parseInt(e.toString(), 10) || 0)}
          w={100}
        />
      </Group>
      {current && (
        <Group>
          <Button onClick={() => onChange(current())}>{t('pin_use_current')}</Button>
        </Group>
      )}
      <Space h="sm" />
    </>
  );
}

// Like ValueRow, but for a 0-65535 value that is a fraction of something (such as calibrated
// travel), so it is shown and edited as a percentage
function PercentRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const percent = Math.round((value / 65535) * 10000) / 100;
  const set = (pct: number) =>
    onChange(Math.round((Math.min(Math.max(pct, 0), 100) / 100) * 65535));
  return (
    <>
      <Input.Label mb={3}>{label}</Input.Label>
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      <Group>
        <Slider
          flex={1}
          value={percent}
          min={0}
          max={100}
          step={0.1}
          label={(v) => `${v}%`}
          onChange={set}
        />
        <NumberInput
          value={percent}
          min={0}
          max={100}
          step={0.1}
          decimalScale={2}
          suffix="%"
          onChange={(e) => set(parseFloat(e.toString()) || 0)}
          w={100}
        />
      </Group>
      <Space h="sm" />
    </>
  );
}

// Filters for an analog input's raw value. High pass and zero point drift settle on a rest
// point, which only axes have, so buttons just get the smoothing filters.
function AnalogFilters({
  mapping,
  dispatch,
  axis,
}: {
  mapping: proto.IMapping;
  dispatch: (mapping: proto.IMapping) => void;
  axis: boolean;
}) {
  const { t } = useTranslation();
  const filter = mapping.filter ?? {};
  const update = (changes: proto.IAnalogFilter) => {
    const next = { ...filter, ...changes };
    const empty =
      next.lowPassCutoff == null &&
      next.highPassCutoff == null &&
      !next.responsive &&
      next.zpdWindow == null;
    dispatch({ ...mapping, filter: empty ? null : next });
  };
  return (
    <Accordion>
      <Accordion.Item value="filters">
        <Accordion.Control>{t('filter.title')}</Accordion.Control>
        <Accordion.Panel>
          <Switch
            label={t('filter.lowPass.label')}
            description={t('filter.lowPass.description')}
            checked={filter.lowPassCutoff != null}
            onChange={(event) => update({ lowPassCutoff: event.currentTarget.checked ? 50 : null })}
          />
          {filter.lowPassCutoff != null && (
            <NumberInput
              mt="xs"
              label={t('filter.cutoff')}
              decimalScale={2}
              min={0.01}
              step={1}
              value={filter.lowPassCutoff}
              onChange={(val) => update({ lowPassCutoff: Number(val) || 0.01 })}
            />
          )}
          <Space h="md" />
          <Switch
            label={t('filter.responsive.label')}
            description={t('filter.responsive.description')}
            checked={!!filter.responsive}
            onChange={(event) =>
              update(
                event.currentTarget.checked
                  ? { responsive: true }
                  : { responsive: null, responsiveSnap: null, responsiveActivityThreshold: null }
              )
            }
          />
          {filter.responsive && (
            <>
              <NumberInput
                mt="xs"
                label={t('filter.responsive.snap.label')}
                description={t('filter.responsive.snap.description')}
                decimalScale={4}
                min={0}
                max={1}
                step={0.001}
                value={filter.responsiveSnap ?? 0.01}
                onChange={(val) => update({ responsiveSnap: Number(val) })}
              />
              <NumberInput
                mt="xs"
                label={t('filter.responsive.threshold.label')}
                description={t('filter.responsive.threshold.description')}
                decimalScale={2}
                min={0}
                step={0.5}
                value={filter.responsiveActivityThreshold ?? 4}
                onChange={(val) => update({ responsiveActivityThreshold: Number(val) })}
              />
            </>
          )}
          {axis && (
            <>
              <Space h="md" />
              <Switch
                label={t('filter.highPass.label')}
                description={t('filter.highPass.description')}
                checked={filter.highPassCutoff != null}
                onChange={(event) =>
                  update({ highPassCutoff: event.currentTarget.checked ? 0.1 : null })
                }
              />
              {filter.highPassCutoff != null && (
                <NumberInput
                  mt="xs"
                  label={t('filter.cutoff')}
                  decimalScale={2}
                  min={0.01}
                  step={0.05}
                  value={filter.highPassCutoff}
                  onChange={(val) => update({ highPassCutoff: Number(val) || 0.01 })}
                />
              )}
              <Space h="md" />
              <Switch
                label={t('filter.zpd.label')}
                description={t('filter.zpd.description')}
                checked={filter.zpdWindow != null}
                onChange={(event) =>
                  update({ zpdWindow: event.currentTarget.checked ? 1000 : null })
                }
              />
              {filter.zpdWindow != null && (
                <NumberInput
                  mt="xs"
                  label={t('filter.zpd.window')}
                  min={1}
                  max={65535}
                  value={filter.zpdWindow}
                  onChange={(val) => update({ zpdWindow: parseInt(val.toString(), 10) || 1 })}
                />
              )}
            </>
          )}
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

// Rapid trigger works on calibrated travel, so it brings its own min / max, and uses
// triggerValue as the actuation point within that travel. A deadzone there just moves where
// travel starts, so older configs that have one get it folded into min instead.
function RapidTriggerSettings({
  mapping,
  mappingIdx,
  profileIdx,
  dispatch,
}: {
  mapping: proto.IMapping;
  mappingIdx: number;
  profileIdx: number;
  dispatch: (mapping: proto.IMapping) => void;
}) {
  const { t } = useTranslation();
  const rapid = mapping.rapidTrigger!;
  const current = () =>
    useConfigStore.getState().mappingStatus[profileIdx]?.[mappingIdx]?.stateRaw ?? 0;
  // the firmware treats min == max as uncalibrated and uses the full raw range
  const uncalibrated = (mapping.min ?? 0) === (mapping.max ?? 65535);
  const min = uncalibrated ? 0 : (mapping.min ?? 0);
  const max = uncalibrated ? 65535 : (mapping.max ?? 65535);
  const deadzone = mapping.deadzone ?? 0;
  const released = min > max ? min - deadzone : min + deadzone;
  const update = (changes: Partial<proto.IMapping>) =>
    dispatch({ ...mapping, ...(deadzone ? { min: released, max, deadzone: 0 } : {}), ...changes });
  const setRapid = (changes: Partial<proto.IRapidTrigger>) =>
    update({ rapidTrigger: { ...rapid, ...changes } });
  return (
    <>
      <StateSlider
        mappingIdx={mappingIdx}
        profileIdx={profileIdx}
        center={0}
        min={released}
        max={max}
        deadzone={0}
        raw
      />
      <ValueRow
        label={t('rapidTrigger.min')}
        value={released}
        onChange={(min) => update({ min })}
        current={current}
      />
      <ValueRow
        label={t('rapidTrigger.max')}
        value={max}
        onChange={(max) => update({ max })}
        current={current}
      />
      <PercentRow
        label={t('rapidTrigger.actuation.label')}
        description={t('rapidTrigger.actuation.description')}
        value={mapping.triggerValue ?? 32767}
        onChange={(triggerValue) => update({ triggerValue })}
      />
      <PercentRow
        label={t('rapidTrigger.down.label')}
        description={t('rapidTrigger.down.description')}
        value={rapid.downSensitivity ?? 0}
        onChange={(downSensitivity) => setRapid({ downSensitivity })}
      />
      <PercentRow
        label={t('rapidTrigger.up.label')}
        description={t('rapidTrigger.up.description')}
        value={rapid.upSensitivity ?? 0}
        onChange={(upSensitivity) => setRapid({ upSensitivity })}
      />
      <Switch
        label={t('rapidTrigger.continuous.label')}
        description={t('rapidTrigger.continuous.description')}
        checked={!!rapid.continuous}
        onChange={(event) => setRapid({ continuous: event.currentTarget.checked })}
      />
    </>
  );
}

function StateSlider({
  profileIdx,
  mappingIdx,
  center,
  min,
  max,
  deadzone,
  raw,
  trigger,
  activationBased,
  ledBased,
  zeroBased,
  crkdId,
  crkd,
}: {
  profileIdx: number;
  mappingIdx: number;
  center: number;
  min: number;
  max: number;
  deadzone: number;
  raw?: boolean;
  trigger?: boolean;
  activationBased?: boolean;
  ledBased?: boolean;
  zeroBased?: boolean;
  crkdId?: number;
  crkd?: keyof proto.ICrkdCalibrationData;
}) {
  const { t } = useTranslation();
  if (raw) {
    return (
      <>
        <Input.Label mb={3}>{t('calibration.rawValue')}</Input.Label>
        <Progress.Root size={40} transitionDuration={0}>
          <Progress.Label w="100%" h="100%" style={{ position: 'absolute' }}>
            <StateLabel
              mappingIdx={mappingIdx}
              profileIdx={profileIdx}
              activationBased={activationBased}
              ledBased={ledBased}
              zeroBased={zeroBased}
              crkdId={crkdId}
              crkd={crkd}
              raw
            />
          </Progress.Label>
          <StateSection
            mappingIdx={mappingIdx}
            profileIdx={profileIdx}
            center={center}
            min={min}
            max={max}
            deadzone={deadzone}
            activationBased={activationBased}
            ledBased={ledBased}
            trigger={trigger}
            zeroBased={zeroBased}
            raw
            crkdId={crkdId}
            crkd={crkd}
          />
        </Progress.Root>
        <Space h="md" />
      </>
    );
  }
  return (
    <>
      <Input.Label mb={3}>{t('calibration.value')}</Input.Label>
      <Progress.Root size={40} transitionDuration={0}>
        <Progress.Label w="100%" h="100%" style={{ position: 'absolute' }}>
          <StateLabel
            mappingIdx={mappingIdx}
            profileIdx={profileIdx}
            activationBased={activationBased}
            zeroBased={zeroBased}
          />
        </Progress.Label>
        <StateSection
          mappingIdx={mappingIdx}
          profileIdx={profileIdx}
          center={center}
          min={min}
          max={max}
          deadzone={deadzone}
          activationBased={activationBased}
          zeroBased={zeroBased}
        />
      </Progress.Root>
      <Space h="md" />
    </>
  );
}
function OutputBox({
  mapping,
  type,
  mode,
  legendMode,
  title,
  label,
  midi,
  valMidi,
  actions,
  hostInput,
  dispatch,
  dispatchMidi,
}: {
  mapping: proto.IOutput | undefined;
  type: proto.SubType;
  mode: proto.FaceButtonMappingMode;
  legendMode: LegendMode;
  title: string;
  label: string;
  midi?: boolean;
  valMidi?: proto.IMidiInput | undefined;
  // Also offer actions (bootloader etc) alongside the outputs
  actions?: boolean;
  // Picking what to read from a USB or Bluetooth controller, so also offer buttons only they have
  hostInput?: boolean;
  dispatch: (mapping: proto.IOutput, trigger: boolean, analog: boolean) => void;
  dispatchMidi?: (input: Omit<proto.IMidiInput, 'deviceid'>) => void;
}) {
  const { t } = useTranslation();
  const actionProps = actions
    ? {
        valAction: mapping?.action ?? undefined,
        dispatchAction: (action: proto.ActionType) => dispatch({ action }, false, false),
      }
    : {};
  const boxProps = { ...actionProps, hostInput };
  const outputCombobox = useCombobox({
    onDropdownClose: () => outputCombobox.resetSelectedOption(),
  });
  const gamepadAxisCallback = useCallback(
    (axis: proto.GamepadAxisType) =>
      dispatch(
        {
          gamepadAxis: axis,
        },
        [
          proto.GamepadAxisType.Gamepad_LeftTrigger,
          proto.GamepadAxisType.Gamepad_RightTrigger,
        ].includes(axis),
        true
      ),
    [dispatch]
  );
  const gamepadButtonCallback = useCallback(
    (button: proto.GamepadButtonType) => dispatch({ gamepadButton: button }, false, false),
    [dispatch]
  );
  switch (type) {
    case proto.SubType.Midi:
      if (!midi) {
        return <MidiOutputBox mapping={mapping} actions={actions} dispatch={dispatch} />;
      }
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          mode={mode}
          legendMode={legendMode}
          type={type}
          midi={midi}
          valMidi={valMidi}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.Gamepad:
    case proto.SubType.Dancepad:
    case proto.SubType.Taiko:
    case proto.SubType.StageKit:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          mode={mode}
          legendMode={legendMode}
          type={type}
          midi={midi}
          e={proto.GamepadAxisType}
          e2={proto.GamepadButtonType}
          val={mapping?.gamepadAxis ?? undefined}
          val2={mapping?.gamepadButton ?? undefined}
          valMidi={valMidi}
          dispatch={gamepadAxisCallback}
          dispatch2={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.GuitarHeroGuitar:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          e={proto.GuitarHeroGuitarAxisType}
          e2={proto.GuitarHeroGuitarButtonType}
          val={mapping?.ghAxis ?? undefined}
          val2={mapping?.ghButton ?? undefined}
          e3={proto.GamepadAxisType}
          e4={proto.GamepadButtonType}
          val3={mapping?.gamepadAxis ?? undefined}
          val4={mapping?.gamepadButton ?? undefined}
          legendMode={legendMode}
          type={type}
          midi={midi}
          valMidi={valMidi}
          dispatch={(axis) =>
            dispatch(
              {
                ghAxis: axis,
              },
              axis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy,
              true
            )
          }
          dispatch2={(button) => dispatch({ ghButton: button }, false, false)}
          dispatch3={gamepadAxisCallback}
          dispatch4={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.RockBandGuitar:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          e={proto.RockBandGuitarAxisType}
          e2={proto.RockBandGuitarButtonType}
          val={mapping?.rbAxis ?? undefined}
          val2={mapping?.rbButton ?? undefined}
          e3={proto.GamepadAxisType}
          e4={proto.GamepadButtonType}
          val3={mapping?.gamepadAxis ?? undefined}
          val4={mapping?.gamepadButton ?? undefined}
          legendMode={legendMode}
          type={type}
          midi={midi}
          valMidi={valMidi}
          dispatch={(axis) =>
            dispatch(
              { rbAxis: axis },
              [
                proto.RockBandGuitarAxisType.RockBandGuitar_Whammy,
                proto.RockBandGuitarAxisType.RockBandGuitar_Pickup,
              ].includes(axis),
              true
            )
          }
          dispatch2={(button) => dispatch({ rbButton: button }, false, false)}
          dispatch3={gamepadAxisCallback}
          dispatch4={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
      break;
    case proto.SubType.GuitarHeroDrums:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          e={proto.GuitarHeroDrumsAxisType}
          legendMode={legendMode}
          type={type}
          midi={midi}
          valMidi={valMidi}
          val={mapping?.ghDrumAxis ?? undefined}
          e3={proto.GamepadAxisType}
          e4={proto.GamepadButtonType}
          val3={mapping?.gamepadAxis ?? undefined}
          val4={mapping?.gamepadButton ?? undefined}
          dispatch={(axis) => dispatch({ ghDrumAxis: axis }, true, true)}
          dispatch3={gamepadAxisCallback}
          dispatch4={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
      break;
    case proto.SubType.RockBandDrums:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          e={proto.RockBandDrumsAxisType}
          e2={proto.RockBandDrumsButtonType}
          val={mapping?.rbDrumAxis ?? undefined}
          val2={mapping?.rbDrumButton ?? undefined}
          e3={proto.GamepadAxisType}
          e4={proto.GamepadButtonType}
          val3={mapping?.gamepadAxis ?? undefined}
          val4={mapping?.gamepadButton ?? undefined}
          legendMode={legendMode}
          type={type}
          midi={midi}
          valMidi={valMidi}
          dispatch={(axis) => dispatch({ rbDrumAxis: axis }, true, true)}
          dispatch2={(button) => dispatch({ rbDrumButton: button }, true, false)}
          dispatch3={gamepadAxisCallback}
          dispatch4={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
      break;
    case proto.SubType.LiveGuitar:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          e={proto.GuitarHeroLiveGuitarAxisType}
          e2={proto.GuitarHeroLiveGuitarButtonType}
          val={mapping?.ghlAxis ?? undefined}
          val2={mapping?.ghlButton ?? undefined}
          e3={proto.GamepadAxisType}
          e4={proto.GamepadButtonType}
          val3={mapping?.gamepadAxis ?? undefined}
          val4={mapping?.gamepadButton ?? undefined}
          midi={midi}
          valMidi={valMidi}
          type={type}
          legendMode={legendMode}
          dispatch={(axis) =>
            dispatch(
              { ghlAxis: axis },
              proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Whammy === axis,
              true
            )
          }
          dispatch2={(button) => dispatch({ ghlButton: button }, true, false)}
          dispatch3={gamepadAxisCallback}
          dispatch4={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
      break;
    case proto.SubType.DjHeroTurntable:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          e={proto.DJHTurntableAxisType}
          e2={proto.DJHTurntableButtonType}
          val={mapping?.djhAxis ?? undefined}
          val2={mapping?.djhButton ?? undefined}
          e3={proto.GamepadAxisType}
          e4={proto.GamepadButtonType}
          val3={mapping?.gamepadAxis ?? undefined}
          val4={mapping?.gamepadButton ?? undefined}
          midi={midi}
          valMidi={valMidi}
          type={type}
          legendMode={legendMode}
          dispatch={(axis) =>
            dispatch(
              { djhAxis: axis },
              proto.DJHTurntableAxisType.DJHTurntable_EffectsKnob !== axis,
              true
            )
          }
          dispatch2={(button) => dispatch({ djhButton: button }, true, false)}
          dispatch3={gamepadAxisCallback}
          dispatch4={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
      break;
    case proto.SubType.ProGuitarMustang:
    case proto.SubType.ProGuitarSquier:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          e={proto.ProGuitarAxisType}
          e2={proto.ProGuitarButtonType}
          val={mapping?.proAxis ?? undefined}
          val2={mapping?.proButton ?? undefined}
          e3={proto.GamepadAxisType}
          e4={proto.GamepadButtonType}
          val3={mapping?.gamepadAxis ?? undefined}
          val4={mapping?.gamepadButton ?? undefined}
          type={type}
          midi={midi}
          valMidi={valMidi}
          legendMode={legendMode}
          dispatch={(axis) =>
            dispatch({ proAxis: axis }, axis !== proto.ProGuitarAxisType.ProGuitar_Tilt, true)
          }
          dispatch2={(button) => dispatch({ proButton: button }, true, false)}
          dispatch3={gamepadAxisCallback}
          dispatch4={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.GuitarFreaks:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          type={type}
          mode={mode}
          legendMode={legendMode}
          midi={midi}
          valMidi={valMidi}
          e={proto.GuitarFreaksButtonType}
          e2={proto.GamepadAxisType}
          e3={proto.GamepadButtonType}
          val={mapping?.gfButton ?? undefined}
          val2={mapping?.gamepadAxis ?? undefined}
          val3={mapping?.gamepadButton ?? undefined}
          dispatch={(button) => dispatch({ gfButton: button }, false, false)}
          dispatch2={gamepadAxisCallback}
          dispatch3={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.DrumMania:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          type={type}
          mode={mode}
          legendMode={legendMode}
          midi={midi}
          valMidi={valMidi}
          e={proto.DrumManiaButtonType}
          e2={proto.GamepadAxisType}
          e3={proto.GamepadButtonType}
          val={mapping?.dmButton ?? undefined}
          val2={mapping?.gamepadAxis ?? undefined}
          val3={mapping?.gamepadButton ?? undefined}
          dispatch={(button) => dispatch({ dmButton: button }, false, false)}
          dispatch2={gamepadAxisCallback}
          dispatch3={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.KeyboardMania:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          type={type}
          mode={mode}
          legendMode={legendMode}
          midi={midi}
          valMidi={valMidi}
          extraOptions={
            midi
              ? undefined
              : [
                  {
                    value: 'ProKeyboard_Keys',
                    label: t('outputs.ProKeyboard_Keys', 'All Keys (Root Note)'),
                  },
                ]
          }
          valExtra={mapping?.proKeyMultiple != null ? 'ProKeyboard_Keys' : undefined}
          dispatchExtra={(val) => {
            if (val === 'ProKeyboard_Keys') {
              // KeyboardMania has two octaves
              dispatch({ proKeyMultiple: 24 }, true, true);
            }
          }}
          e={proto.KeyboardManiaButtonType}
          val={mapping?.kbmButton ?? undefined}
          dispatch={(button) => dispatch({ kbmButton: button }, false, false)}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.BeatMania:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          type={type}
          mode={mode}
          legendMode={legendMode}
          midi={midi}
          valMidi={valMidi}
          e={proto.BeatManiaButtonType}
          e2={proto.GamepadAxisType}
          e3={proto.GamepadButtonType}
          val={mapping?.bmButton ?? undefined}
          val2={mapping?.gamepadAxis ?? undefined}
          val3={mapping?.gamepadButton ?? undefined}
          dispatch={(button) => dispatch({ bmButton: button }, false, false)}
          dispatch2={gamepadAxisCallback}
          dispatch3={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.PopNMusic:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          type={type}
          mode={mode}
          legendMode={legendMode}
          midi={midi}
          valMidi={valMidi}
          e={proto.PopNMusicButtonType}
          e2={proto.GamepadAxisType}
          e3={proto.GamepadButtonType}
          val={mapping?.popnButton ?? undefined}
          val2={mapping?.gamepadAxis ?? undefined}
          val3={mapping?.gamepadButton ?? undefined}
          dispatch={(button) => dispatch({ popnButton: button }, false, false)}
          dispatch2={gamepadAxisCallback}
          dispatch3={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.ProjectDiva:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          type={type}
          mode={mode}
          legendMode={legendMode}
          midi={midi}
          valMidi={valMidi}
          e={proto.ProjectDivaAxisType}
          e2={proto.GamepadAxisType}
          e3={proto.GamepadButtonType}
          val={mapping?.divaAxis ?? undefined}
          val2={mapping?.gamepadAxis ?? undefined}
          val3={mapping?.gamepadButton ?? undefined}
          dispatch={(axis) => dispatch({ divaAxis: axis }, true, true)}
          dispatch2={gamepadAxisCallback}
          dispatch3={gamepadButtonCallback}
          extraOptions={Array.from({ length: 32 }, (_, index) => ({
            value: `divaTouch:${index + 1}`,
            label: t('outputs.projectDivaTouch', { index: index + 1 }),
          }))}
          valExtra={mapping?.divaTouch ? `divaTouch:${mapping.divaTouch}` : undefined}
          dispatchExtra={(value) => {
            const index = Number(value.slice('divaTouch:'.length));
            if (Number.isInteger(index) && index >= 1 && index <= 32) {
              dispatch({ divaTouch: index }, false, false);
            }
          }}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.ProKeys:
      return (
        <DropdownOutputBox
          {...boxProps}
          label={label}
          title={title}
          // Shown for inputs too, so a key on a pro keyboard can drive any output
          extraOptions={[
            {
              value: 'ProKeyboard_Keys',
              label: t('outputs.ProKeyboard_Keys', 'All Keys (Root Note)'),
            },
            {
              value: 'ProKeyboard_Key',
              label: t('outputs.ProKeyboard_Key', 'Single Key'),
            },
          ]}
          valExtra={
            mapping?.proKeyMultiple != null
              ? 'ProKeyboard_Keys'
              : mapping?.proKeySingle != null
                ? 'ProKeyboard_Key'
                : undefined
          }
          dispatchExtra={(val) => {
            if (val === 'ProKeyboard_Keys') {
              dispatch({ proKeyMultiple: 25 }, true, true);
            } else if (val === 'ProKeyboard_Key') {
              dispatch({ proKeySingle: 1 }, true, true);
            }
          }}
          e={proto.ProKeyboardAxisType}
          e2={proto.ProKeyboardButtonType}
          val={mapping?.proKeyboardAxis ?? undefined}
          val2={mapping?.proKeyboardButton ?? undefined}
          e3={proto.GamepadAxisType}
          e4={proto.GamepadButtonType}
          val3={mapping?.gamepadAxis ?? undefined}
          val4={mapping?.gamepadButton ?? undefined}
          type={type}
          midi={midi}
          valMidi={valMidi}
          legendMode={legendMode}
          dispatch={(axis) => dispatch({ proKeyboardAxis: axis }, true, true)}
          dispatch2={(button) => dispatch({ proKeyboardButton: button }, true, false)}
          dispatch3={gamepadAxisCallback}
          dispatch4={gamepadButtonCallback}
          dispatchMidi={dispatchMidi}
        />
      );
    case proto.SubType.KeyboardMouse: {
      const kind =
        mapping?.action != null
          ? `action:${mapping.action}`
          : mapping?.mouseButton != null
            ? `button:${mapping.mouseButton}`
            : mapping?.mouseAxis != null
              ? `axis:${mapping.mouseAxis}`
              : mapping?.consumerKey != null
                ? 'media'
                : mapping?.keyboardPassthrough
                  ? 'passthrough'
                  : 'key';
      return (
        <>
          <Select
            label={title === 'input' ? t('input.title', 'Input') : t('keyboard.output')}
            allowDeselect={false}
            data={[
              { value: 'key', label: t('keyboard.key') },
              { value: 'media', label: t('keyboard.media') },
              // Picked as the output, which makes the input the whole keyboard
              ...(title !== 'input' || kind === 'passthrough'
                ? [{ value: 'passthrough', label: t('keyboard.passthrough') }]
                : []),
              ...Object.entries(proto.MouseButtonType)
                .filter(([, v]) => typeof v === 'number')
                .map(([name, v]) => ({ value: `button:${v}`, label: t(`keyboard.mouse.${name}`) })),
              ...Object.entries(proto.MouseAxisType)
                .filter(([, v]) => typeof v === 'number')
                .map(([name, v]) => ({ value: `axis:${v}`, label: t(`keyboard.mouse.${name}`) })),
              ...(actions
                ? Object.entries(proto.ActionType)
                    .filter(([, v]) => typeof v === 'number')
                    .map(([name, v]) => ({
                      value: `action:${v}`,
                      label: t(`outputs.${name}`, name),
                    }))
                : []),
            ]}
            value={kind}
            onChange={(value) => {
              if (!value || value === kind) {
                return;
              }
              const [type, id] = value.split(':');
              if (type === 'button') {
                dispatch({ mouseButton: parseInt(id, 10) }, false, false);
              } else if (type === 'axis') {
                dispatch({ mouseAxis: parseInt(id, 10) }, false, true);
              } else if (type === 'action') {
                dispatch({ action: parseInt(id, 10) }, false, false);
              } else if (type === 'media') {
                dispatch({ consumerKey: MEDIA_KEYS.PlayPause }, true, false);
              } else if (type === 'passthrough') {
                dispatch({ keyboardPassthrough: true }, false, false);
              } else {
                dispatch({ keycode: CODE_TO_HID.KeyA }, true, false);
              }
            }}
          />
          {kind === 'key' && (
            <HidKeyPicker
              value={mapping?.keycode}
              input={title === 'input'}
              onChange={(code) => dispatch({ keycode: code }, true, false)}
            />
          )}
          {kind === 'media' && (
            <Select
              label={t('keyboard.media')}
              allowDeselect={false}
              data={Object.values(MEDIA_KEYS).map((usage) => ({
                value: `${usage}`,
                label: mediaKeyName(usage) ?? `${usage}`,
              }))}
              value={`${mapping?.consumerKey ?? MEDIA_KEYS.PlayPause}`}
              onChange={(value) =>
                value && dispatch({ consumerKey: parseInt(value, 10) }, true, false)
              }
            />
          )}
        </>
      );
    }
    case proto.SubType.Wheel:
      break;
    case proto.SubType.DisneyInfinity:
    case proto.SubType.Skylanders:
    case proto.SubType.LegoDimensions:
      return <></>;
  }
}
// What a MIDI instrument profile's mappings send
function MidiOutputBox({
  mapping,
  actions,
  dispatch,
}: {
  mapping: proto.IOutput | undefined;
  actions?: boolean;
  dispatch: (mapping: proto.IOutput, trigger: boolean, analog: boolean) => void;
}) {
  const { t } = useTranslation();
  const kind =
    mapping?.action != null
      ? `action:${mapping.action}`
      : mapping?.midiControl
        ? 'control'
        : mapping?.midiPitchBend != null
          ? 'pitchBend'
          : mapping?.midiNote
            ? 'note'
            : null;
  const channel =
    mapping?.midiNote?.channel ?? mapping?.midiControl?.channel ?? mapping?.midiPitchBend ?? 1;
  const note = mapping?.midiNote ?? { channel, note: 60 };
  const control = mapping?.midiControl ?? { channel, control: 4 };
  const setNote = (value: proto.IMidiNoteOutput) =>
    dispatch({ midiNote: value as proto.MidiNoteOutput }, true, false);
  const setControl = (value: proto.IMidiControlOutput) =>
    dispatch({ midiControl: value as proto.MidiControlOutput }, true, true);
  const setChannel = (value: number) => {
    if (kind === 'control') {
      setControl({ ...control, channel: value });
    } else if (kind === 'pitchBend') {
      dispatch({ midiPitchBend: value }, false, true);
    } else {
      setNote({ ...note, channel: value });
    }
  };
  const clamp = (value: string | number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number(value) || 0));
  return (
    <>
      <Select
        label={t('midiOutput.output')}
        placeholder={t('pick_value')}
        allowDeselect={false}
        data={[
          { value: 'note', label: t('midiOutput.note') },
          { value: 'control', label: t('midiOutput.control') },
          { value: 'pitchBend', label: t('midiOutput.pitchBend') },
          ...(actions
            ? Object.entries(proto.ActionType)
                .filter(([, v]) => typeof v === 'number')
                .map(([name, v]) => ({
                  value: `action:${v}`,
                  label: t(`outputs.${name}`, name),
                }))
            : []),
        ]}
        value={kind}
        onChange={(value) => {
          if (!value || value === kind) {
            return;
          }
          const [type, id] = value.split(':');
          if (type === 'action') {
            dispatch({ action: parseInt(id, 10) }, false, false);
          } else if (type === 'control') {
            setControl({ channel, control: 4 });
          } else if (type === 'pitchBend') {
            dispatch({ midiPitchBend: channel }, false, true);
          } else {
            setNote({ channel, note: 60 });
          }
        }}
      />
      {kind != null && mapping?.action == null && (
        <NumberInput
          label={t('midiOutput.channel')}
          description={t('midiOutput.channel_desc')}
          min={1}
          max={16}
          value={channel}
          onChange={(value) => setChannel(clamp(value, 1, 16))}
        />
      )}
      {kind === 'note' && (
        <>
          <NumberInput
            label={t('midiOutput.noteNumber')}
            description={midiNoteDisplayName(note.note, note.channel, t)}
            min={0}
            max={127}
            value={note.note}
            onChange={(value) => setNote({ ...note, note: clamp(value, 0, 127) })}
          />
          <Switch
            mt="sm"
            label={t('midiOutput.fixedVelocity')}
            description={t('midiOutput.fixedVelocity_desc')}
            checked={note.velocity != null}
            onChange={(event) =>
              setNote({ ...note, velocity: event.currentTarget.checked ? 127 : undefined })
            }
          />
          {note.velocity != null && (
            <NumberInput
              label={t('midiOutput.velocity')}
              min={1}
              max={127}
              value={note.velocity}
              onChange={(value) => setNote({ ...note, velocity: clamp(value, 1, 127) })}
            />
          )}
        </>
      )}
      {kind === 'control' && (
        <NumberInput
          label={t('midiOutput.controlNumber')}
          description={t('midiOutput.controlNumber_desc')}
          min={0}
          max={127}
          value={control.control}
          onChange={(value) => setControl({ ...control, control: clamp(value, 0, 127) })}
        />
      )}
    </>
  );
}

// The controller types RPCS3's USB passthrough knows about, matching the firmware
const RPCS3_PASSTHROUGH_SUBTYPES: proto.SubType[] = [
  proto.SubType.Gamepad,
  proto.SubType.GuitarHeroGuitar,
  proto.SubType.RockBandGuitar,
  proto.SubType.RockBandDrums,
  proto.SubType.LiveGuitar,
  proto.SubType.DjHeroTurntable,
  proto.SubType.StageKit,
  proto.SubType.ProKeys,
  proto.SubType.ProGuitarMustang,
  proto.SubType.ProGuitarSquier,
];

// How long an action's input has to be held by default, so a stray press can't trigger it
const ACTION_HOLD_MS: Record<proto.ActionType, number> = {
  [proto.ActionType.ActionRestartDeviceStack]: 1000,
  [proto.ActionType.ActionBootloader]: 3000,
};

function actionInput(mapping: proto.IMapping, action: proto.ActionType): proto.IInput {
  const held = mapping.input.held;
  if (!held) {
    return { held: { input: mapping.input, time: ACTION_HOLD_MS[action] } };
  }
  // Follow the new action's default, unless the time was changed by hand
  const previous = mapping.mapping.action;
  if (previous != null && held.time === ACTION_HOLD_MS[previous]) {
    return { held: { ...held, time: ACTION_HOLD_MS[action] } };
  }
  return mapping.input;
}

// Undo the hold actionInput added, unless the time was changed by hand
function outputInput(mapping: proto.IMapping): proto.IInput {
  const held = mapping.input.held;
  const action = mapping.mapping.action;
  if (held?.input && action != null && held.time === ACTION_HOLD_MS[action]) {
    return held.input;
  }
  return mapping.input;
}

// A keyboard passthrough reads every key on the keyboard, so it replaces the single key a USB input read, and
// goes back to a single key when something else is picked
function passthroughInput(input: proto.IInput, output: proto.IOutput): proto.IInput {
  const usb = input.usbButton;
  if (!usb) {
    return input;
  }
  if (output.keyboardPassthrough) {
    return { usbButton: { ...usb, button: { keyboardPassthrough: true } } };
  }
  if (usb.button?.keyboardPassthrough) {
    return { usbButton: { ...usb, button: { keycode: CODE_TO_HID.KeyA } } };
  }
  return input;
}

function MappingBox({
  mapping,
  type,
  mode,
  legendMode,
  dispatch,
}: {
  mapping: proto.IMapping;
  type: proto.SubType;
  mode: proto.FaceButtonMappingMode;
  legendMode: LegendMode;
  dispatch: (mapping: proto.IMapping) => void;
}) {
  const { t } = useTranslation();
  return (
    <Stack gap="xs">
      <OutputBox
        label="outputs"
        title="output"
        mapping={mapping.mapping}
        type={type}
        mode={mode}
        legendMode={legendMode}
        actions
        dispatch={(m, trigger, _) =>
          m.action != null
            ? dispatch({ ...mapping, input: actionInput(mapping, m.action), mapping: m })
            : dispatch({
                center: trigger ? 0 : 32767,
                min: 0,
                max: 65535,
                ...mapping,
                input: passthroughInput(outputInput(mapping), m),
                pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
                mapping: m,
              })
        }
      />
      {mapping.mapping.action != null && (
        <Text size="xs" c="dimmed">
          {t(
            'inputs.action_hold_hint',
            'Actions default to a held input, so they need holding down for a moment and a stray press does nothing.'
          )}
        </Text>
      )}
    </Stack>
  );
}
const MIDI_INPUT_KINDS = [
  'midiNote',
  'midiControlChange',
  'midiPitchBend',
  'midiProGuitarButton',
  'midiProGuitarAxis',
] as const;
type MidiInputKind = (typeof MIDI_INPUT_KINDS)[number];
const MIDI_INPUT_KIND_LABEL_KEYS: Record<MidiInputKind, string> = {
  midiNote: 'input.midiNote',
  midiControlChange: 'input.midiControlChange',
  midiPitchBend: 'input.midiPitchBend',
  midiProGuitarButton: 'input.midiProGuitarButton.title',
  midiProGuitarAxis: 'input.midiProGuitarAxis.title',
};

// Buttons read from USB and Bluetooth controllers that no emulated controller sends
const HOST_ONLY_OUTPUTS = new Set([
  'Gamepad_LeftPaddle1',
  'Gamepad_RightPaddle1',
  'Gamepad_LeftPaddle2',
  'Gamepad_RightPaddle2',
  'Gamepad_LeftGripTouch',
  'Gamepad_RightGripTouch',
]);

function DropdownOutputBox<
  T extends StandardEnum<unknown>,
  T2 extends StandardEnum<unknown>,
  T3 extends StandardEnum<unknown>,
  T4 extends StandardEnum<unknown>,
>({
  e,
  filterFirstEnum,
  filterSecondEnum,
  e2,
  e3,
  e4,
  val,
  val2,
  val3,
  val4,
  valMidi,
  title,
  label,
  mode,
  type,
  legendMode,
  midi,
  dispatch,
  dispatch2,
  dispatch3,
  dispatch4,
  dispatchMidi,
  extraOptions,
  valExtra,
  dispatchExtra,
  valAction,
  dispatchAction,
  hostInput,
}: {
  e?: T;
  filterFirstEnum?: (key: string, selected?: string) => boolean;
  filterSecondEnum?: (key: string, selected?: string) => boolean;
  e2?: T2;
  e3?: T3;
  e4?: T4;
  val?: T[keyof T];
  val2?: T2[keyof T2];
  val3?: T3[keyof T3];
  val4?: T4[keyof T4];
  valMidi?: proto.IMidiInput;
  title: string;
  label: string;
  mode?: proto.FaceButtonMappingMode;
  type: proto.SubType;
  legendMode: LegendMode;
  midi?: boolean;
  dispatch?: (input: T[keyof T]) => void;
  dispatch2?: (input: T2[keyof T2]) => void;
  dispatch3?: (input: T3[keyof T3]) => void;
  dispatch4?: (input: T4[keyof T4]) => void;
  dispatchMidi?: (input: Omit<proto.IMidiInput, 'deviceid'>) => void;
  extraOptions?: { value: string; label: string }[];
  valExtra?: string;
  dispatchExtra?: (val: string) => void;
  valAction?: proto.ActionType;
  dispatchAction?: (action: proto.ActionType) => void;
  hostInput?: boolean;
}) {
  const { t } = useTranslation();
  const inputCombobox = useCombobox({
    onDropdownOpen: () =>
      inputCombobox.updateSelectedOptionIndex('selected', { scrollIntoView: true }),
  });
  const v = (valExtra ||
    (valAction != null && proto.ActionType[valAction]) ||
    (e && e[val as keyof T]) ||
    (e2 && e2[val2 as keyof T2]) ||
    (e3 && e3[val3 as keyof T3]) ||
    (e4 && e4[val4 as keyof T4]) ||
    (valMidi && MIDI_INPUT_KINDS.find((kind) => valMidi[kind]))) as string;
  const listed = (key: string) => hostInput || key === v || !HOST_ONLY_OUTPUTS.has(key);
  const actionOptions = dispatchAction
    ? Object.entries(proto.ActionType)
        .filter(([, value]) => typeof value === 'number')
        .map(([name, value]) => ({
          value: name,
          action: value as proto.ActionType,
          label: t(`outputs.${name}`, name),
        }))
    : [];
  const extraLabel = [...(extraOptions ?? []), ...actionOptions].find((x) => x.value === v)?.label;
  const midiKindLabel =
    valMidi && MIDI_INPUT_KINDS.includes(v as MidiInputKind)
      ? t(MIDI_INPUT_KIND_LABEL_KEYS[v as MidiInputKind])
      : undefined;
  const titleLabel = title === 'input' ? t('input.title', 'Input') : t(title);
  const base =
    label === 'outputs' ? (
      <InputBase
        label={titleLabel}
        component="button"
        type="button"
        pointer
        rightSection={<Combobox.Chevron />}
        rightSectionPointerEvents="none"
        onClick={() => inputCombobox.toggleDropdown()}
      >
        {extraLabel
          ? extraLabel
          : valMidi && midiKindLabel
            ? midiKindLabel
            : !v
              ? t('inputs.unmapped')
              : t(
                  `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, type, v, legendMode)}`
                )}
      </InputBase>
    ) : (
      <InputBase
        label={titleLabel}
        component="button"
        type="button"
        pointer
        rightSection={<Combobox.Chevron />}
        rightSectionPointerEvents="none"
        onClick={() => inputCombobox.toggleDropdown()}
      >
        {extraLabel || midiKindLabel || (v ? t(`${label}.${v}`) : t('inputs.unmapped'))}
      </InputBase>
    );
  return (
    <Combobox
      store={inputCombobox}
      onOptionSubmit={(val) => {
        if (extraOptions?.some((x) => x.value === val) && dispatchExtra) {
          dispatchExtra(val);
        }
        const action = actionOptions.find((x) => x.value === val);
        if (action && dispatchAction) {
          dispatchAction(action.action);
        }
        if (e && dispatch) {
          const button = e[val as keyof T];
          if (button !== undefined) {
            dispatch(button);
          }
        }
        if (e2 && dispatch2) {
          const axis = e2[val as keyof T2];
          if (axis !== undefined) {
            dispatch2(axis);
          }
        }
        if (e3 && dispatch3) {
          const button = e3[val as keyof T3];
          if (button !== undefined) {
            dispatch3(button);
          }
        }
        if (e4 && dispatch4) {
          const axis = e4[val as keyof T4];
          if (axis !== undefined) {
            dispatch4(axis);
          }
        }
        if (
          (val === 'midiNote' ||
            val === 'midiControlChange' ||
            val === 'midiPitchBend' ||
            val === 'midiProGuitarButton' ||
            val === 'midiProGuitarAxis') &&
          dispatchMidi
        ) {
          dispatchMidi({
            midiNote: val === 'midiNote' ? { note: 0, channel: 0 } : undefined,
            midiControlChange: val === 'midiControlChange' ? { cc: 0, channel: 0 } : undefined,
            midiPitchBend: val === 'midiPitchBend' ? { channel: 0 } : undefined,
            midiProGuitarButton:
              val === 'midiProGuitarButton'
                ? { button: proto.ProGuitarMidiButtonType.ProGuitarMidi_A }
                : undefined,
            midiProGuitarAxis:
              val === 'midiProGuitarAxis'
                ? { axis: proto.ProGuitarAxisType.ProGuitar_AFret }
                : undefined,
          });
        }
        inputCombobox.closeDropdown();
      }}
    >
      <Combobox.Target>{base}</Combobox.Target>

      <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
        <Combobox.Options>
          {extraOptions?.map((item) => (
            <Combobox.Option value={item.value} key={item.value} selected={item.value === v}>
              {item.label}
            </Combobox.Option>
          ))}
          {midi && type === proto.SubType.Midi && (
            <>
              <Combobox.Option value="midiNote" selected={v === 'midiNote'}>
                {t('input.midiNote')}
              </Combobox.Option>
              <Combobox.Option value="midiControlChange" selected={v === 'midiControlChange'}>
                {t('input.midiControlChange')}
              </Combobox.Option>
              <Combobox.Option value="midiPitchBend" selected={v === 'midiPitchBend'}>
                {t('input.midiPitchBend')}
              </Combobox.Option>
              <Combobox.Option value="midiProGuitarButton" selected={v === 'midiProGuitarButton'}>
                {t('input.midiProGuitarButton.title')}
              </Combobox.Option>
              <Combobox.Option value="midiProGuitarAxis" selected={v === 'midiProGuitarAxis'}>
                {t('input.midiProGuitarAxis.title')}
              </Combobox.Option>
            </>
          )}
          {e &&
            Object.keys(e)
              .filter((key) => isNaN(Number(key)))
              .filter((key) => !filterFirstEnum || filterFirstEnum(key, v))
              .map((item) => (
                <Combobox.Option value={item} key={item} selected={item === v}>
                  {t(
                    `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, type, item, legendMode)}`
                  )}
                </Combobox.Option>
              ))}
          {e2 &&
            Object.keys(e2)
              .filter((key) => isNaN(Number(key)))
              .filter((key) => !filterSecondEnum || filterSecondEnum(key, v))
              .filter(listed)
              .map((item) => (
                <Combobox.Option value={item} key={item} selected={item === v}>
                  {t(
                    `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, type, item, legendMode)}`
                  )}
                </Combobox.Option>
              ))}
          {e3 &&
            Object.keys(e3)
              .filter((key) => isNaN(Number(key)))
              .map((item) => (
                <Combobox.Option value={item} key={item} selected={item === v}>
                  {t(
                    `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, type, item, legendMode)}`
                  )}
                </Combobox.Option>
              ))}
          {e4 &&
            Object.keys(e4)
              .filter((key) => isNaN(Number(key)))
              .filter(listed)
              .map((item) => (
                <Combobox.Option value={item} key={item} selected={item === v}>
                  {t(
                    `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, type, item, legendMode)}`
                  )}
                </Combobox.Option>
              ))}
          {actionOptions.length > 0 && (
            <Combobox.Group label={t('inputs.actions', 'Actions')}>
              {actionOptions.map((item) => (
                <Combobox.Option value={item.value} key={item.value} selected={item.value === v}>
                  {item.label}
                </Combobox.Option>
              ))}
            </Combobox.Group>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

function FixIcon(
  mode: proto.FaceButtonMappingMode,
  subtype: proto.SubType,
  label: string,
  legendMode: LegendMode,
  icon: boolean = true
) {
  let calcLabel = label;
  if (
    proto.GamepadAxisType[
      `Gamepad_${calcLabel?.split('_')[1]}` as keyof typeof proto.GamepadAxisType
    ] !== undefined
  ) {
    calcLabel = `Gamepad_${calcLabel.split('_')[1]}`;
  }
  if ([proto.SubType.GuitarHeroGuitar, proto.SubType.RockBandGuitar].includes(subtype)) {
    if (calcLabel === 'Gamepad_DpadUp') {
      calcLabel = 'GuitarHeroGuitar_StrumUp';
    }
    if (calcLabel === 'Gamepad_DpadDown') {
      calcLabel = 'GuitarHeroGuitar_StrumDown';
    }
  }
  // No GHL art of its own, so borrow the GH guitar icons where one fits
  if (
    icon &&
    [
      'GuitarHeroLiveGuitar_Whammy',
      'GuitarHeroLiveGuitar_Tilt',
      'GuitarHeroLiveGuitar_StrumUp',
      'GuitarHeroLiveGuitar_StrumDown',
    ].includes(calcLabel)
  ) {
    calcLabel = calcLabel.replace('GuitarHeroLiveGuitar_', 'GuitarHeroGuitar_');
  }
  if (mode === proto.FaceButtonMappingMode.PositionBased) {
    if (calcLabel === 'Gamepad_A') {
      return 'Generic/Gamepad_South';
    }
    if (calcLabel === 'Gamepad_B') {
      return 'Generic/Gamepad_East';
    }
    if (calcLabel === 'Gamepad_X') {
      return 'Generic/Gamepad_West';
    }
    if (calcLabel === 'Gamepad_Y') {
      return 'Generic/Gamepad_North';
    }
  }
  if (calcLabel?.startsWith('Gamepad_')) {
    switch (calcLabel) {
      case 'Gamepad_DpadUp':
      case 'Gamepad_DpadDown':
      case 'Gamepad_DpadLeft':
      case 'Gamepad_DpadRight':
        if (!icon) {
          return `Generic/${calcLabel}`;
        }
      // eslint-disable-next-line no-fallthrough
      case 'Gamepad_A':
      case 'Gamepad_B':
      case 'Gamepad_X':
      case 'Gamepad_Y':
      case 'Gamepad_Back':
      case 'Gamepad_Start':
      case 'Gamepad_Guide':
      case 'Gamepad_Capture':
      case 'Gamepad_LeftShoulder':
      case 'Gamepad_RightShoulder':
      case 'Gamepad_LeftTrigger':
      case 'Gamepad_RightTrigger':
      case 'Gamepad_LeftThumbClick':
      case 'Gamepad_RightThumbClick':
        switch (legendMode) {
          case LegendMode.Nintendo:
            return `Nintendo/${calcLabel}`;
          case LegendMode.PlayStation:
            return `PlayStation/${calcLabel}`;
          case LegendMode.Xbox360:
            return `Xbox360/${calcLabel}`;
          case LegendMode.XboxOne:
            return `XboxOne/${calcLabel}`;
        }
        break;
      default:
        return `Generic/${calcLabel}`;
    }
  }
  return calcLabel;
}
function FixLabel(
  mode: proto.FaceButtonMappingMode,
  subtype: proto.SubType,
  label: string,
  legendMode: LegendMode
) {
  return FixIcon(mode, subtype, label, legendMode, false)?.replace('/', '.');
}

export function SantrollerLabel({
  input,
  label,
  fallback = true,
}: {
  input: proto.IInput;
  label: string;
  fallback?: boolean;
}) {
  const deviceId = getInputLocalDeviceId(input) ?? -1;
  const { t } = useTranslation();
  const device = useConfigStore((state) => state.deviceStatus[deviceId]);
  const guiDevices = useProfileLabels();

  if (device) {
    switch (device.type) {
      case 'ads1115': {
        const labelsText = getMultiplexerLabel(guiDevices, input.ads1115!.channel, true, false);
        if (labelsText) {
          return <Text>{labelsText}</Text>;
        }
        return <Text>{t('multiplexer.channel', { channel: input.ads1115?.channel })}</Text>;
      }
      case 'multiplexer': {
        const labelsText2 = getMultiplexerLabel(
          guiDevices,
          input.multiplexer!.channel,
          true,
          false
        );
        if (labelsText2) {
          return <Text>{labelsText2}</Text>;
        }
        return <Text>{t('multiplexer.channel', { channel: input.multiplexer?.channel })}</Text>;
      }
      case 'vtechExpander':
        return <Text>{input.vtechExpander?.button}</Text>;
      case 'switchNetwork': {
        const networkButton =
          device?.device.switchNetwork?.buttons?.[input.switchNetwork?.button ?? -1];
        if (networkButton) {
          const label = getSwitchNetworkLabel(
            guiDevices,
            networkButton.pin,
            networkButton.otherPin,
            true,
            false
          );
          if (label) {
            return <Text>{label}</Text>;
          }
        }
        return (
          <Text>
            {t('switchNetwork.button')}: {input.switchNetwork?.button}
          </Text>
        );
      }
      case 'matrix': {
        const labelsText3 = getMatrixLabel(
          guiDevices,
          input.matrix!.pin,
          input.matrix!.outputPin,
          true,
          false
        );
        if (labelsText3) {
          return <Text>{labelsText3}</Text>;
        }
        return (
          <Text>
            {input.matrix?.pin}: {input.matrix?.outputPin}
          </Text>
        );
      }
      case 'bhDrum':
      case 'worldTourDrum':
      case 'midiSerial':
        if (input.midi?.midiNote) {
          return (
            <Text>
              {t('input.midiNote', 'MIDI Note')}: {input.midi.midiNote.note}
            </Text>
          );
        }
        if (input.midi?.midiControlChange) {
          return <Text>{t('input.ccNumber', { cc: input.midi.midiControlChange.cc })}</Text>;
        }
        if (input.midi?.midiPitchBend) {
          return <Text>{t('input.midiPitchBend', 'Pitch Bend')}</Text>;
        }
        if (input.midi?.midiProGuitarButton?.button != null) {
          return (
            <Text>
              {t(
                `input.midiProGuitarButton.${proto.ProGuitarMidiButtonType[input.midi.midiProGuitarButton.button]}`
              )}
            </Text>
          );
        }
        if (input.midi?.midiProGuitarAxis?.axis != null) {
          return (
            <Text>
              {t(
                `input.midiProGuitarAxis.${proto.ProGuitarAxisType[input.midi.midiProGuitarAxis.axis]}`
              )}
            </Text>
          );
        }
        return null;
      case 'protarNeck':
        if (input.protarNeckButton?.button != null) {
          return (
            <Text>
              {t(
                `input.protarNeckButton.${proto.ProGuitarNeckButtonType[input.protarNeckButton.button]}`
              )}
            </Text>
          );
        }
        if (input.protarNeckAxis?.axis != null) {
          return (
            <Text>
              {t(`input.protarNeckAxis.${proto.ProGuitarNeckAxisType[input.protarNeckAxis.axis]}`)}
            </Text>
          );
        }
        return null;
      case 'psx':
        if (input.ps2Button?.button != null) {
          return <Text>{t(`inputs.${proto.PS2ButtonType[input.ps2Button.button]}`)}</Text>;
        }
        if (input.ps2Axis?.axis != null) {
          return <Text>{t(`inputs.${proto.PS2AxisType[input.ps2Axis.axis]}`)}</Text>;
        }
        return null;
      case 'snes':
        if (input.snesButton?.button != null) {
          return <Text>{t(`inputs.${proto.SNESButtonType[input.snesButton.button]}`)}</Text>;
        }
        if (input.snesAxis?.axis != null) {
          return <Text>{t(`inputs.${proto.SNESAxisType[input.snesAxis.axis]}`)}</Text>;
        }
        return null;
      case 'joybus':
        if (input.joybusButton?.button != null) {
          return <Text>{t(`inputs.${proto.JoybusButtonType[input.joybusButton.button]}`)}</Text>;
        }
        if (input.joybusAxis?.axis != null) {
          return <Text>{t(`inputs.${proto.JoybusAxisType[input.joybusAxis.axis]}`)}</Text>;
        }
        return null;
      case 'wii':
        if (input.wiiButton?.button != null) {
          return <Text>{t(`inputs.${proto.WiiButtonType[input.wiiButton.button]}`)}</Text>;
        }
        if (input.wiiAxis?.axis != null) {
          return <Text>{t(`inputs.${proto.WiiAxisType[input.wiiAxis.axis]}`)}</Text>;
        }
        return null;
      case 'cycle':
        return <Text>{input.cycle?.input?.gpio?.pin}</Text>;
      case 'toggle':
        return <Text>{input.toggle?.input?.gpio?.pin}</Text>;
    }
  }
  if (input.ps2Button?.button != null) {
    return <Text>{t(`inputs.${proto.PS2ButtonType[input.ps2Button.button]}`)}</Text>;
  }
  if (input.ps2Axis?.axis != null) {
    return <Text>{t(`inputs.${proto.PS2AxisType[input.ps2Axis.axis]}`)}</Text>;
  }
  if (input.wiiButton?.button != null) {
    return <Text>{t(`inputs.${proto.WiiButtonType[input.wiiButton.button]}`)}</Text>;
  }
  if (input.wiiAxis?.axis != null) {
    return <Text>{t(`inputs.${proto.WiiAxisType[input.wiiAxis.axis]}`)}</Text>;
  }
  if (input.snesButton?.button != null) {
    return <Text>{t(`inputs.${proto.SNESButtonType[input.snesButton.button]}`)}</Text>;
  }
  if (input.snesAxis?.axis != null) {
    return <Text>{t(`inputs.${proto.SNESAxisType[input.snesAxis.axis]}`)}</Text>;
  }
  if (input.joybusButton?.button != null) {
    return <Text>{t(`inputs.${proto.JoybusButtonType[input.joybusButton.button]}`)}</Text>;
  }
  if (input.joybusAxis?.axis != null) {
    return <Text>{t(`inputs.${proto.JoybusAxisType[input.joybusAxis.axis]}`)}</Text>;
  }
  if (input.gpio) {
    const labelsText = getLabel(t, guiDevices, [], input.gpio.pin, true, false);
    if (labelsText || !fallback) {
      return <Text>{labelsText}</Text>;
    }
  }
  if (input.peripheral) {
    const labelsText = getLabel(t, guiDevices, [], input.peripheral.pin, true, false);
    if (labelsText || !fallback) {
      return <Text>{labelsText}</Text>;
    }
  }
  if (input.key) {
    const labelsText = getKeyboardKeyLabel(guiDevices, input.key.key, true, false);
    if (labelsText) {
      return <Text>{labelsText}</Text>;
    }
  }
  if (input.protarNeckButton?.button != null) {
    return (
      <Text>
        {t(
          `input.protarNeckButton.${proto.ProGuitarNeckButtonType[input.protarNeckButton.button]}`
        )}
      </Text>
    );
  }
  if (input.protarNeckAxis?.axis != null) {
    return (
      <Text>
        {t(`input.protarNeckAxis.${proto.ProGuitarNeckAxisType[input.protarNeckAxis.axis]}`)}
      </Text>
    );
  }
  if (input.midi?.midiProGuitarButton?.button != null) {
    return (
      <Text>
        {t(
          `input.midiProGuitarButton.${proto.ProGuitarMidiButtonType[input.midi.midiProGuitarButton.button]}`
        )}
      </Text>
    );
  }
  if (input.midi?.midiNote) {
    return (
      <Text>
        {t('input.midiNote', 'MIDI Note')}: {input.midi.midiNote.note}
      </Text>
    );
  }
  if (input.midi?.midiControlChange) {
    return <Text>{t('input.ccNumber', { cc: input.midi.midiControlChange.cc })}</Text>;
  }
  if (input.midi?.midiPitchBend) {
    return <Text>{t('input.midiPitchBend', 'Pitch Bend')}</Text>;
  }
  return fallback ? <Text>{t(`outputs.${label}`)}</Text> : null;
}

function createBiEnum<T extends number>(map: Record<string, T>): StandardEnum<T> {
  const res: any = { ...map };
  for (const [k, v] of Object.entries(map)) {
    res[v] = k;
  }
  return res as StandardEnum<T>;
}

const USB_HOST_SUBTYPES_ENUM = createBiEnum(
  Object.fromEntries(USB_HOST_SUBTYPES.map((st) => [proto.SubType[st], st]))
);

// The controller types a SNES / joybus slot can be assigned to, without "Disconnected"
const SNES_CONTROLLER_TYPES_ENUM = createBiEnum({
  SNESControllerSNES: proto.SNESControllerType.SNESControllerSNES,
  SNESControllerNES: proto.SNESControllerType.SNESControllerNES,
  SNESControllerMouse: proto.SNESControllerType.SNESControllerMouse,
});
const JOYBUS_CONTROLLER_TYPES_ENUM = createBiEnum({
  JoybusControllerGameCube: proto.JoybusControllerType.JoybusControllerGameCube,
  JoybusControllerN64: proto.JoybusControllerType.JoybusControllerN64,
});

// The Pro Guitars that can be told apart over MIDI, by the sysex they send
const MIDI_PRO_GUITAR_SUBTYPES_ENUM = createBiEnum({
  ProGuitarSquier: proto.SubType.ProGuitarSquier,
  ProGuitarMustang: proto.SubType.ProGuitarMustang,
});

// The types of the configured devices. This only changes when a device is added or removed, while
// deviceStatus changes whenever any device reports its status.
function useDeviceTypes(): string[] {
  return useConfigStore(
    // MIDI out jacks aren't a MIDI source, so they don't count as midiSerial here
    useShallow((state) =>
      Object.values(state.deviceStatus).map((status) =>
        isMidiOutDevice(status.device) ? 'midiSerialOut' : status.type
      )
    )
  );
}

// The device dropdown's options. Only rendered while the dropdown is open, so it's the only part of
// an input that has to follow every device's status.
function ConnectedDeviceOptions() {
  const { t } = useTranslation();
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  return (
    <>
      {Object.values(deviceStatus)
        .filter(
          (status) =>
            status.type !== 'peripheral' &&
            isInputDeviceKind(status.type) &&
            !isMidiOutDevice(status.device) &&
            !requiresAssignment(status.type, status.device)
        )
        .map((item) => {
          const parent = item.parentId ? deviceStatus[item.parentId] : undefined;
          const parentAddr = parent?.device.peripheral?.address
            ? `0x${parent.device.peripheral.address.toString(16)}`
            : undefined;
          return (
            <Combobox.Option value={item.id} key={item.id}>
              <Group justify="space-between" wrap="nowrap" w="100%">
                <Group gap="2">
                  <Text fz="sm" span>
                    {t(`devices.${item.type}`)}
                  </Text>

                  <Text fz="xs" span opacity="0.7">
                    ({DeviceStatus.label(item)})
                    {parentAddr && ` ${t('devices.peripheral_suffix', { address: parentAddr })}`}
                  </Text>
                </Group>
              </Group>
            </Combobox.Option>
          );
        })}
      {Object.values(deviceStatus)
        .filter((status) => status.type === 'peripheral')
        .map((item) => {
          const addr = item.device.peripheral?.address
            ? `0x${item.device.peripheral.address.toString(16)}`
            : '0x75';
          return (
            <Fragment key={item.id}>
              <Combobox.Option value={`peripheral_analog:${item.id}`}>
                <Group gap="2">
                  <Text fz="sm" span>
                    {t('devices.gpio')}
                  </Text>
                  <Text fz="xs" span opacity="0.7">
                    {t('devices.gpio_analog')} {t('devices.peripheral_suffix', { address: addr })}
                  </Text>
                </Group>
              </Combobox.Option>
              <Combobox.Option value={`peripheral_digital:${item.id}`}>
                <Group gap="2">
                  <Text fz="sm" span>
                    {t('devices.gpio')}
                  </Text>
                  <Text fz="xs" span opacity="0.7">
                    {t('devices.gpio_digital')} {t('devices.peripheral_suffix', { address: addr })}
                  </Text>
                </Group>
              </Combobox.Option>
            </Fragment>
          );
        })}
    </>
  );
}

// Compares inputs by value. Decoded inputs stringify enums by name while edited ones are plain objects
// with numeric enums, and either can leave out default fields, so normalise them before stringifying
function inputKey(input: proto.IInput | null | undefined) {
  return input
    ? JSON.stringify(proto.Input.toObject(proto.Input.fromObject(input), { defaults: true }))
    : undefined;
}

// Detects which input of a device gets pressed or moved, for the input at these indices to take
function InputDetectButton({
  request,
  activationIdx,
  mappingIdx,
  ledIdx,
  innerIdx,
}: {
  request: DetectInputRequest | undefined;
  activationIdx?: number;
  mappingIdx?: number;
  ledIdx?: number;
  innerIdx?: number;
}) {
  const { t } = useTranslation();
  const detecting = useConfigStore((state) => state.detecting);
  const detectInput = useConfigStore((state) => state.detectInput);
  if (!request) {
    return null;
  }
  return (
    <Button
      w="100%"
      mt="xs"
      onClick={() => detectInput(activationIdx, mappingIdx, ledIdx, innerIdx, request)}
      disabled={detecting}
    >
      {t('input_detect')}
    </Button>
  );
}

function SantrollerInput({
  input,
  axis,
  button,
  mode,
  legendMode,
  type,
  mappingIdx,
  activationIdx,
  ledIdx,
  innerIdx,
  proKeyCount,
  dispatch,
}: {
  input: proto.IInput;
  axis: boolean;
  button: boolean;
  mode: proto.FaceButtonMappingMode;
  legendMode: LegendMode;
  type: proto.SubType;
  mappingIdx?: number;
  activationIdx?: number;
  ledIdx?: number;
  innerIdx?: number;
  proKeyCount?: number;
  dispatch: (input: proto.IInput) => void;
}) {
  const deviceId = getInputDeviceId(input) ?? -1;
  const { t } = useTranslation();
  const detectPins = useConfigStore.getState().detectPins;
  const detected = useConfigStore.getState().detected;
  const detectedMapping = useConfigStore.getState().detectedMapping;
  const detectedInnerMapping = useConfigStore.getState().detectedInnerMapping;
  const detectedActivation = useConfigStore.getState().detectedActivation;
  const detectedLed = useConfigStore.getState().detectedLed;
  const detectedInputValue = useConfigStore((state) => state.detectedInput);
  useEffect(() => {
    const state = useConfigStore.getState();
    const isDetectTarget =
      (innerIdx === null || state.detectedInnerMapping === innerIdx) &&
      ((state.detectedMapping !== undefined && state.detectedMapping === mappingIdx) ||
        (state.detectedActivation !== undefined && state.detectedActivation === activationIdx) ||
        (state.detectedLed !== undefined && state.detectedLed === ledIdx));
    if (!detectedInputValue || !isDetectTarget) {
      return;
    }
    useConfigStore.setState((state) => {
      state.detectedInput = undefined;
    });
    dispatch(detectedInputValue);
  }, [detectedInputValue, innerIdx, mappingIdx, activationIdx, ledIdx, dispatch]);
  const detecting = useConfigStore((state) => state.detecting);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const currentProfile = useConfigStore((state) => state.currentProfile);
  const profile = useConfigStore((state) => state.config.profiles?.[currentProfile]);
  const guiDevices = useProfileLabels();
  const deviceCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  const pinModeCombobox = useCombobox({
    onDropdownClose: () => pinModeCombobox.resetSelectedOption(),
  });

  const allAssignments = useMemo(
    () => profile?.assignments?.flatMap((x) => x.assignments ?? []) ?? [],
    [profile?.assignments]
  );

  const profileSlots = useMemo(() => getProfileSlots(profile, t), [profile, t]);
  // Every mapping on the page has one of these, so only select what this input uses. Selecting all of
  // deviceStatus re-rendered every input whenever any device's status changed, which stalled the
  // page for seconds while the device reported its status after connecting.
  const hasUnassignedDevice = useConfigStore((state) =>
    Object.values(state.deviceStatus).some(
      (status) =>
        requiresAssignment(status.type, status.device) &&
        !isDeviceAssigned(status.type, profile, status.device)
    )
  );
  const hasSlotDevice = useConfigStore((state) =>
    Object.values(state.deviceStatus).some((status) =>
      requiresAssignment(status.type, status.device)
    )
  );
  const matchingSlot = useMemo(
    () => getProfileSlotForInput(input, profileSlots),
    [profileSlots, input]
  );
  const localDeviceId = getInputLocalDeviceId(input) ?? -1;
  const device = useConfigStore((state) =>
    matchingSlot ? undefined : state.deviceStatus[localDeviceId]
  );
  const parentDevice = useConfigStore((state) => {
    const parentId = matchingSlot ? undefined : state.deviceStatus[localDeviceId]?.parentId;
    return parentId ? state.deviceStatus[parentId] : undefined;
  });
  const peripheralDevice = useConfigStore((state) =>
    input.peripheral ? state.deviceStatus[input.peripheral.deviceid?.toString() ?? ''] : undefined
  );
  const cycleState = useConfigStore((state) =>
    input.cycle ? state.deviceStatus[input.cycle.deviceid]?.cycleState : undefined
  );
  const toggleState = useConfigStore((state) =>
    input.toggle ? state.deviceStatus[input.toggle.deviceid]?.toggleState : undefined
  );
  // Prefer the controller types the slot is assigned to, fall back to whatever is plugged in
  const ps2InputFilters = useMemo(() => {
    const slotTypes = (matchingSlot?.items ?? [])
      .map((item) => item.ps2Cnt)
      .filter((cnt): cnt is proto.PS2ControllerType => cnt != null);
    return getPS2InputFilters(
      slotTypes.length ? slotTypes : device?.ps2CntType != null ? [device.ps2CntType] : []
    );
  }, [matchingSlot, device?.ps2CntType]);
  const snesInputFilters = useMemo(
    () =>
      getSNESInputFilters(
        matchingSlot?.items.find((item) => item.snesCnt != null)?.snesCnt ?? device?.snesCntType
      ),
    [matchingSlot, device?.snesCntType]
  );
  const joybusInputFilters = useMemo(
    () =>
      getJoybusInputFilters(
        matchingSlot?.items.find((item) => item.joybusCnt != null)?.joybusCnt ??
          device?.joybusCntType
      ),
    [matchingSlot, device?.joybusCntType]
  );

  const effectiveUsbType = input.midi
    ? proto.SubType.Midi
    : (matchingSlot?.item.usbType ?? matchingSlot?.item.usbDevice?.subtype ?? type);

  const effectiveBtType = useMemo(() => {
    if (input.midi) {
      return proto.SubType.Midi;
    }
    const currentOutput = input.btAxis?.axis || input.btButton?.button;
    const inferred = getOutputSubType(currentOutput);
    if (inferred != null) {
      return inferred;
    }

    const slotType =
      matchingSlot?.item.bluetoothType ?? matchingSlot?.item.bluetoothDevice?.subtype;
    if (slotType != null) {
      return slotType;
    }

    const assigned = allAssignments
      .map((a) => a.bluetoothType ?? a.bluetoothDevice?.subtype)
      .find((x) => x != null);
    if (assigned != null) {
      return assigned;
    }

    if (USB_HOST_INPUT_SUBTYPES.includes(type)) {
      return type;
    }
    return proto.SubType.Gamepad;
  }, [input.btAxis?.axis, input.btButton?.button, input.midi, matchingSlot, allAssignments, type]);

  if (simpleMode) {
    return <SantrollerLabel input={input} label="" fallback={false} />;
  }
  let deviceValue = <></>;
  if (input.gpio) {
    deviceValue = (
      <Group gap="2">
        <Text fz="sm" span>
          {t('devices.gpio')}
        </Text>
        <Text fz="xs" span opacity="0.7">
          {t(input.gpio.analog ? 'devices.gpio_analog' : 'devices.gpio_digital')}
        </Text>
      </Group>
    );
  } else if (input.peripheral) {
    const addr = peripheralDevice?.device.peripheral?.address
      ? `0x${peripheralDevice.device.peripheral.address.toString(16)}`
      : '0x75';
    deviceValue = (
      <Group gap="2">
        <Text fz="sm" span>
          {t('devices.gpio')}
        </Text>
        <Text fz="xs" span opacity="0.7">
          {t(input.peripheral.analog ? 'devices.gpio_analog' : 'devices.gpio_digital')}{' '}
          {t('devices.peripheral_suffix', { address: addr })}
        </Text>
      </Group>
    );
  } else if (input.shortcut) {
    deviceValue = (
      <Text fz="sm" span>
        {t('devices.shortcut')}
      </Text>
    );
  } else if (input.held) {
    deviceValue = (
      <Text fz="sm" span>
        {t('devices.held')}
      </Text>
    );
  } else if (input.shifted) {
    deviceValue = (
      <Text fz="sm" span>
        {t('devices.shifted')}
      </Text>
    );
  } else if (deviceId !== undefined && deviceId !== -1) {
    if (matchingSlot) {
      deviceValue = (
        <Group gap="2">
          <Text fz="sm" span>
            {matchingSlot.label}
          </Text>
        </Group>
      );
    } else if (device) {
      const parentAddr = parentDevice?.device.peripheral?.address
        ? `0x${parentDevice.device.peripheral.address.toString(16)}`
        : undefined;
      deviceValue = (
        <Group gap="2">
          <Text fz="sm" span>
            {t(`devices.${device.type}`)}
          </Text>
          <Text fz="xs" span opacity="0.7">
            ({DeviceStatus.label(device)})
            {parentAddr && ` ${t('devices.peripheral_suffix', { address: parentAddr })}`}
          </Text>
        </Group>
      );
    } else {
      const isSlotInput =
        input.usbAxis || input.usbButton || input.btAxis || input.btButton || input.midi;
      if (isSlotInput) {
        deviceValue = (
          <Text fz="sm" span>
            {t('assignments.slot', 'Slot')} {deviceId}
          </Text>
        );
      }
    }
  }
  if (
    detectedMapping !== undefined &&
    detectedMapping === mappingIdx &&
    (innerIdx === null || detectedInnerMapping === innerIdx) &&
    detected !== -1 &&
    (input.gpio || input.peripheral)
  ) {
    if (input.gpio) {
      dispatch({ gpio: { ...input.gpio!, pin: detected } });
    } else if (input.peripheral) {
      dispatch({ peripheral: { ...input.peripheral!, pin: detected } });
    }
  }
  if (
    detectedActivation !== undefined &&
    detectedActivation === activationIdx &&
    (innerIdx === null || detectedInnerMapping === innerIdx) &&
    detected !== -1 &&
    (input.gpio || input.peripheral)
  ) {
    if (input.gpio) {
      dispatch({ gpio: { ...input.gpio!, pin: detected } });
    } else if (input.peripheral) {
      dispatch({ peripheral: { ...input.peripheral!, pin: detected } });
    }
  }
  if (
    detectedLed !== undefined &&
    detectedLed === ledIdx &&
    detected !== -1 &&
    (innerIdx === null || detectedInnerMapping === innerIdx) &&
    (input.gpio || input.peripheral)
  ) {
    if (input.gpio) {
      dispatch({ gpio: { ...input.gpio!, pin: detected } });
    } else if (input.peripheral) {
      dispatch({ peripheral: { ...input.peripheral!, pin: detected } });
    }
  }
  const detectProps = { activationIdx, mappingIdx, ledIdx, innerIdx };
  return (
    <>
      {(deviceCombobox.dropdownOpened && (
        <Combobox
          store={deviceCombobox}
          onOptionSubmit={(val) => {
            deviceCombobox.closeDropdown();
            if (val.startsWith('peripheral_digital:')) {
              const deviceid = parseInt(val.slice('peripheral_digital:'.length), 10);
              dispatch({
                peripheral: { pin: -1, pinMode: proto.PinMode.PullUp, analog: false, deviceid },
              });
              return;
            }
            if (val.startsWith('peripheral_analog:')) {
              const deviceid = parseInt(val.slice('peripheral_analog:'.length), 10);
              dispatch({
                peripheral: { pin: -1, pinMode: proto.PinMode.Floating, analog: true, deviceid },
              });
              return;
            }
            if (val.startsWith('slot:')) {
              const slot = profileSlots.find((s) => s.key === val.slice(5));
              if (slot) {
                const nextInput = createSlotInput(slot, { axis, button });
                if (nextInput) {
                  dispatch(nextInput);
                }
              }
              return;
            }
            if (isNumberLike(val)) {
              const deviceid = parseInt(val, 10);
              const { deviceStatus } = useConfigStore.getState();
              const targetDevice = deviceStatus[deviceid];
              if (
                targetDevice &&
                !isDeviceAssigned(targetDevice.type, profile, targetDevice.device)
              ) {
                return;
              }
              const nextInput = createDeviceInput(deviceStatus[deviceid].type, deviceid, {
                axis,
                button,
              });
              if (nextInput) {
                dispatch(nextInput);
              }
              return;
            }
            const nextInput = createStandaloneInput(val);
            if (nextInput) {
              dispatch(nextInput);
            }
          }}
        >
          <Combobox.Target>
            <InputBase
              label={t('device')}
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => deviceCombobox.toggleDropdown()}
            >
              {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
            </InputBase>
          </Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              <ConnectedDeviceOptions />
              {profileSlots.map((slot) => (
                <Combobox.Option value={`slot:${slot.key}`} key={`slot:${slot.key}`}>
                  <Group justify="space-between" wrap="nowrap" w="100%">
                    <Text fz="sm" span>
                      {slot.label}
                    </Text>
                  </Group>
                </Combobox.Option>
              ))}
              {profileSlots.length === 0 && hasSlotDevice && (
                <Combobox.Option value="no_slots" disabled>
                  <Group justify="space-between" wrap="nowrap" w="100%">
                    <Text fz="sm" c="dimmed" span>
                      {t(
                        'assignments.no_slots_assigned',
                        'No controller sources assigned in Profile'
                      )}
                    </Text>
                    <Badge size="xs" color="red" variant="light">
                      {t('assignments.not_assigned')}
                    </Badge>
                  </Group>
                </Combobox.Option>
              )}
              <Combobox.Option value="gpio_analog">
                <Group gap="2">
                  <Text fz="sm" span>
                    {t('devices.gpio')}
                  </Text>
                  <Text fz="xs" span opacity="0.7">
                    {t('devices.gpio_analog')}
                  </Text>
                </Group>
              </Combobox.Option>
              <Combobox.Option value="gpio_digital">
                <Group gap="2">
                  <Text fz="sm" span>
                    {t('devices.gpio')}
                  </Text>
                  <Text fz="xs" span opacity="0.7">
                    {t('devices.gpio_digital')}
                  </Text>
                </Group>
              </Combobox.Option>
              <Combobox.Option value="shortcut">{t('devices.shortcut')}</Combobox.Option>
              <Combobox.Option value="held">{t('devices.held')}</Combobox.Option>
              <Combobox.Option value="shifted">{t('devices.shifted')}</Combobox.Option>
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      )) || (
        <InputBase
          label={t('device')}
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => deviceCombobox.toggleDropdown()}
        >
          {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
        </InputBase>
      )}
      {hasUnassignedDevice && (
        <Text size="xs" c="dimmed" mt={4}>
          {t(
            'assignments.device_slot_hint',
            "Connected controllers and adapters only appear here after you add a matching source in this profile's Connected Controller / Adapter assignments."
          )}
        </Text>
      )}
      <Space h="md" />
      {input.shortcut && (
        <ActionIcon
          onClick={() =>
            dispatch({
              shortcut: {
                inputs: [
                  ...input.shortcut!.inputs!,
                  { gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp } },
                ],
              },
            })
          }
        >
          <IconPlus style={{ width: '70%', height: '70%' }} />
        </ActionIcon>
      )}
      {input.shortcut &&
        input.shortcut.inputs?.map((innerInput, idx) => (
          <div key={idx}>
            <Card shadow="sm" padding="lg" radius="md" withBorder w="380px" maw="100%" h="100%">
              <Card.Section h="20px">
                <div style={{ position: 'absolute', top: 0, right: 0 }}>
                  <ActionIcon
                    color="red"
                    onClick={() =>
                      dispatch({
                        shortcut: {
                          inputs: input.shortcut?.inputs?.filter((_, oldIdx) => idx !== oldIdx),
                        },
                      })
                    }
                  >
                    <IconTrash style={{ width: '70%', height: '70%' }} />
                  </ActionIcon>
                  <ActionIcon
                    onClick={() =>
                      dispatch({
                        shortcut: {
                          inputs: [...input.shortcut!.inputs!, { ...innerInput }],
                        },
                      })
                    }
                  >
                    <IconCopy style={{ width: '70%', height: '70%' }} />
                  </ActionIcon>
                </div>
              </Card.Section>
              <SantrollerInput
                axis={!!axis}
                button={!!button}
                mode={mode}
                legendMode={legendMode}
                input={innerInput}
                type={type}
                dispatch={(changed) =>
                  dispatch({
                    shortcut: {
                      inputs: input.shortcut?.inputs?.map((oldX, oldIdx) =>
                        idx === oldIdx ? changed : oldX
                      ),
                    },
                  })
                }
                mappingIdx={mappingIdx}
                innerIdx={idx}
              />
            </Card>
          </div>
        ))}
      {input.held && (
        <>
          <NumberInput
            label={t('held.time')}
            value={input.held.time}
            onChange={(val) => dispatch({ held: { ...input.held!, time: Number(val) } })}
            min={0}
          />
          <SantrollerInput
            axis={!!axis}
            button={!!button}
            mode={mode}
            legendMode={legendMode}
            type={type}
            input={input.held.input}
            dispatch={(changed) =>
              dispatch({
                held: {
                  ...input.held!,
                  input: changed,
                },
              })
            }
            mappingIdx={mappingIdx}
          />
        </>
      )}
      {input.shifted && (
        <Stack gap="xs" mt="xs">
          <Switch
            label={t('shifted.invertShift')}
            checked={input.shifted.invertShift ?? false}
            onChange={(event) =>
              dispatch({
                shifted: {
                  ...input.shifted!,
                  invertShift: event.currentTarget.checked,
                },
              })
            }
          />
          <Text size="xs" fw={700} c="dimmed">
            {t('shifted.primaryInput')}
          </Text>
          <SantrollerInput
            axis={!!axis}
            button={!!button}
            mode={mode}
            legendMode={legendMode}
            type={type}
            input={input.shifted.input ?? {}}
            dispatch={(changed) =>
              dispatch({
                shifted: {
                  ...input.shifted!,
                  input: changed,
                },
              })
            }
            mappingIdx={mappingIdx}
          />
          <Text size="xs" fw={700} c="dimmed">
            {t('shifted.shiftInput')}
          </Text>
          <SantrollerInput
            axis={!!axis}
            button={!!button}
            mode={mode}
            legendMode={legendMode}
            type={type}
            input={input.shifted.shift ?? {}}
            dispatch={(changed) =>
              dispatch({
                shifted: {
                  ...input.shifted!,
                  shift: changed,
                },
              })
            }
            mappingIdx={mappingIdx}
          />
        </Stack>
      )}
      {input.cycle && (
        <>
          <SegmentedControl
            data={device?.device.cycle?.values?.map((x) => x.toString()) ?? []}
            value={device?.device.cycle?.values?.[cycleState ?? -1]?.toString() ?? ''}
          />
          <Switch
            label={t('cycle.forward_input')}
            checked={input.cycle.input !== null}
            onChange={(event) => {
              dispatch({
                cycle: {
                  ...input.cycle!,
                  input: event.currentTarget.checked
                    ? { gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp } }
                    : null,
                },
              });
            }}
          />
          {input.cycle.input && (
            <SantrollerInput
              axis={!!axis}
              button={!!button}
              mode={mode}
              legendMode={legendMode}
              type={type}
              input={input.cycle.input}
              dispatch={(changed) =>
                dispatch({
                  cycle: {
                    ...input.cycle!,
                    input: changed,
                  },
                })
              }
              innerIdx={0}
              mappingIdx={mappingIdx}
            />
          )}
          <Switch
            label={t('cycle.reverse_input')}
            checked={input.cycle.inputReverse !== null}
            onChange={(event) => {
              dispatch({
                cycle: {
                  ...input.cycle!,
                  inputReverse: event.currentTarget.checked
                    ? { gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp } }
                    : null,
                },
              });
            }}
          />
          {input.cycle.inputReverse && (
            <SantrollerInput
              axis={!!axis}
              button={!!button}
              mode={mode}
              legendMode={legendMode}
              type={type}
              input={input.cycle.inputReverse}
              dispatch={(changed) =>
                dispatch({
                  cycle: {
                    ...input.cycle!,
                    inputReverse: changed,
                  },
                })
              }
              mappingIdx={mappingIdx}
              innerIdx={1}
            />
          )}
        </>
      )}
      {input.toggle && (
        <>
          <Switch label={t('toggle.state')} checked={!!toggleState} />
          {input.toggle.input && (
            <SantrollerInput
              axis={!!axis}
              button={!!button}
              mode={mode}
              legendMode={legendMode}
              type={type}
              input={input.toggle.input}
              dispatch={(changed) =>
                dispatch({
                  toggle: {
                    ...input.toggle!,
                    input: changed,
                  },
                })
              }
              innerIdx={0}
              mappingIdx={mappingIdx}
            />
          )}
        </>
      )}
      {(device?.type === 'worldTourDrum' ||
        device?.type === 'bhDrum' ||
        (device?.type === 'midiSerial' && !isMidiOutDevice(device.device)) ||
        matchingSlot?.deviceKind === 'midi' ||
        (input.midi &&
          !device &&
          !matchingSlot &&
          !input.usbAxis &&
          !input.usbButton &&
          !input.btAxis &&
          !input.btButton)) && (
        <>
          <DropdownOutputBox
            title="input"
            valMidi={input.midi ?? undefined}
            label="outputs"
            midi
            legendMode={legendMode}
            type={proto.SubType.Midi}
            dispatch={(_) => {}}
            dispatch2={(_) => {}}
            dispatchMidi={(midi) =>
              dispatch({
                midi: {
                  ...midi!,
                  deviceid: deviceId,
                  sourceType: midiInputSourceType(matchingSlot?.deviceKind),
                  ...(matchingSlot?.midiChannel != null && {
                    midiNote: midi?.midiNote
                      ? { ...midi.midiNote, channel: matchingSlot.midiChannel }
                      : undefined,
                    midiControlChange: midi?.midiControlChange
                      ? { ...midi.midiControlChange, channel: matchingSlot.midiChannel }
                      : undefined,
                    midiPitchBend: midi?.midiPitchBend
                      ? { ...midi.midiPitchBend, channel: matchingSlot.midiChannel }
                      : undefined,
                  }),
                },
              })
            }
          />
          <InputDetectButton
            {...detectProps}
            request={detectMidiRequest(
              deviceId,
              midiInputSourceType(matchingSlot?.deviceKind),
              matchingSlot?.midiChannel
            )}
          />
        </>
      )}
      {(device?.type === 'wii' ||
        matchingSlot?.deviceKind === 'wii' ||
        input.wiiAxis ||
        input.wiiButton) && (
        <>
          <DropdownOutputBox
            title="input"
            e={proto.WiiAxisType}
            filterFirstEnum={isSelectableWiiAxis}
            e2={proto.WiiButtonType}
            legendMode={legendMode}
            type={type}
            val={input.wiiAxis?.axis}
            val2={input.wiiButton?.button}
            valMidi={input.midi ?? undefined}
            label="inputs"
            midi
            dispatch={(axisVal) =>
              dispatch({
                wiiAxis: {
                  deviceid: (input.wiiAxis?.deviceid || input.wiiButton?.deviceid || deviceId)!,
                  axis: axisVal as proto.WiiAxisType,
                },
              })
            }
            dispatch2={(buttonVal) =>
              dispatch({
                wiiButton: {
                  deviceid: (input.wiiAxis?.deviceid || input.wiiButton?.deviceid || deviceId)!,
                  button: buttonVal as proto.WiiButtonType,
                },
              })
            }
            dispatchMidi={(midi) =>
              dispatch({
                midi: {
                  ...midi!,
                  deviceid: deviceId,
                  sourceType: midiInputSourceType(matchingSlot?.deviceKind),
                },
              })
            }
          />
          <InputDetectButton
            {...detectProps}
            request={detectInputRequest(
              proto.InputDetectKind.DetectWii,
              (input.wiiAxis?.deviceid || input.wiiButton?.deviceid || deviceId)!,
              axis
            )}
          />
        </>
      )}
      {(device?.type === 'psx' ||
        matchingSlot?.deviceKind === 'psx' ||
        input.ps2Axis ||
        input.ps2Button) && (
        <>
          <DropdownOutputBox
            title="input"
            e={proto.PS2AxisType}
            filterFirstEnum={ps2InputFilters.axis}
            e2={proto.PS2ButtonType}
            filterSecondEnum={ps2InputFilters.button}
            val={input.ps2Axis?.axis}
            val2={input.ps2Button?.button}
            label="inputs"
            legendMode={legendMode}
            type={type}
            dispatch={(ps2AxisVal) =>
              dispatch({
                ps2Axis: { axis: ps2AxisVal as proto.PS2AxisType, deviceid: deviceId },
              })
            }
            dispatch2={(ps2ButtonVal) =>
              dispatch({
                ps2Button: { button: ps2ButtonVal as proto.PS2ButtonType, deviceid: deviceId },
              })
            }
          />
          <InputDetectButton
            {...detectProps}
            request={detectInputRequest(proto.InputDetectKind.DetectPS2, deviceId, axis)}
          />
        </>
      )}
      {(device?.type === 'snes' ||
        matchingSlot?.deviceKind === 'snes' ||
        input.snesAxis ||
        input.snesButton) && (
        <>
          <DropdownOutputBox
            title="input"
            e={proto.SNESAxisType}
            filterFirstEnum={snesInputFilters.axis}
            e2={proto.SNESButtonType}
            filterSecondEnum={snesInputFilters.button}
            val={input.snesAxis?.axis}
            val2={input.snesButton?.button}
            label="inputs"
            legendMode={legendMode}
            type={type}
            dispatch={(snesAxisVal) =>
              dispatch({
                snesAxis: { axis: snesAxisVal as proto.SNESAxisType, deviceid: deviceId },
              })
            }
            dispatch2={(snesButtonVal) =>
              dispatch({
                snesButton: { button: snesButtonVal as proto.SNESButtonType, deviceid: deviceId },
              })
            }
          />
          <InputDetectButton
            {...detectProps}
            request={detectInputRequest(proto.InputDetectKind.DetectSNES, deviceId, axis)}
          />
        </>
      )}
      {(device?.type === 'joybus' ||
        matchingSlot?.deviceKind === 'joybus' ||
        input.joybusAxis ||
        input.joybusButton) && (
        <>
          <DropdownOutputBox
            title="input"
            e={proto.JoybusAxisType}
            filterFirstEnum={joybusInputFilters.axis}
            e2={proto.JoybusButtonType}
            filterSecondEnum={joybusInputFilters.button}
            val={input.joybusAxis?.axis}
            val2={input.joybusButton?.button}
            label="inputs"
            legendMode={legendMode}
            type={type}
            dispatch={(joybusAxisVal) =>
              dispatch({
                joybusAxis: { axis: joybusAxisVal as proto.JoybusAxisType, deviceid: deviceId },
              })
            }
            dispatch2={(joybusButtonVal) =>
              dispatch({
                joybusButton: {
                  button: joybusButtonVal as proto.JoybusButtonType,
                  deviceid: deviceId,
                },
              })
            }
          />
          <InputDetectButton
            {...detectProps}
            request={detectInputRequest(proto.InputDetectKind.DetectJoybus, deviceId, axis)}
          />
        </>
      )}
      {(device?.type === 'usbHost' ||
        matchingSlot?.deviceKind === 'usbHost' ||
        input.usbAxis ||
        input.usbButton) && (
        <>
          <Space h="md" />
          <OutputBox
            label="outputs"
            title="input"
            hostInput
            valMidi={input.midi ?? undefined}
            dispatch={(mapping, _, analog) =>
              dispatch(
                analog && !isProKeyOutput(mapping)
                  ? {
                      usbAxis: {
                        deviceid: (input.usbAxis?.deviceid ||
                          input.usbButton?.deviceid ||
                          deviceId)!,
                        axis: mapping,
                      },
                    }
                  : {
                      usbButton: {
                        deviceid: (input.usbAxis?.deviceid ||
                          input.usbButton?.deviceid ||
                          deviceId)!,
                        button: mapping,
                      },
                    }
              )
            }
            dispatchMidi={(midi) =>
              dispatch({
                midi: {
                  ...midi!,
                  deviceid: deviceId,
                  sourceType: midiInputSourceType(matchingSlot?.deviceKind),
                },
              })
            }
            midi
            type={effectiveUsbType}
            mode={mode}
            mapping={input.usbAxis?.axis || input.usbButton?.button}
            legendMode={legendMode}
          />
          <ProKeyInputNumber
            output={input.usbButton?.button}
            dispatch={(button) => dispatch({ usbButton: { ...input.usbButton!, button } })}
          />
          <InputDetectButton
            {...detectProps}
            request={
              effectiveUsbType === proto.SubType.Midi
                ? detectMidiRequest(deviceId, midiInputSourceType(matchingSlot?.deviceKind))
                : detectInputRequest(
                    proto.InputDetectKind.DetectUsb,
                    (input.usbAxis?.deviceid || input.usbButton?.deviceid || deviceId)!,
                    axis,
                    effectiveUsbType
                  )
            }
          />
        </>
      )}
      {(device?.type === 'bt' ||
        matchingSlot?.deviceKind === 'bt' ||
        input.btAxis ||
        input.btButton) && (
        <>
          <Space h="md" />
          <OutputBox
            label="outputs"
            title="input"
            hostInput
            valMidi={input.midi ?? undefined}
            dispatch={(mapping, _, analog) =>
              dispatch(
                analog && !isProKeyOutput(mapping)
                  ? {
                      btAxis: {
                        deviceid: (input.btAxis?.deviceid || input.btButton?.deviceid || deviceId)!,
                        axis: mapping,
                      },
                    }
                  : {
                      btButton: {
                        deviceid: (input.btAxis?.deviceid || input.btButton?.deviceid || deviceId)!,
                        button: mapping,
                      },
                    }
              )
            }
            dispatchMidi={(midi) =>
              dispatch({
                midi: {
                  ...midi!,
                  deviceid: deviceId,
                  sourceType: midiInputSourceType(matchingSlot?.deviceKind),
                },
              })
            }
            midi
            type={effectiveBtType}
            mode={mode}
            mapping={input.btAxis?.axis || input.btButton?.button}
            legendMode={legendMode}
          />
          <ProKeyInputNumber
            output={input.btButton?.button}
            dispatch={(button) => dispatch({ btButton: { ...input.btButton!, button } })}
          />
          <InputDetectButton
            {...detectProps}
            request={
              effectiveBtType === proto.SubType.Midi
                ? detectMidiRequest(deviceId, midiInputSourceType(matchingSlot?.deviceKind))
                : detectInputRequest(
                    proto.InputDetectKind.DetectBluetooth,
                    (input.btAxis?.deviceid || input.btButton?.deviceid || deviceId)!,
                    axis,
                    effectiveBtType
                  )
            }
          />
        </>
      )}
      <RegisteredInputEditor input={input} dispatch={dispatch} />
      {input.vtechExpander && (
        <>
          <NumberInput
            label={t('input.vtechExpander.pin')}
            value={input.vtechExpander.button}
            onChange={(val) =>
              dispatch({ vtechExpander: { ...input.vtechExpander!, button: Number(val) } })
            }
            min={0}
            max={7}
          />
        </>
      )}
      {input.matrix && (
        <>
          <PinBox
            label={t('matrix.input_pin')}
            pin={input.matrix.pin}
            valid={Object.fromEntries(
              Object.entries(AllPinsNamed).filter((x) =>
                matrixHasPin(device?.device.matrix, 'in', parseInt(x[0], 10))
              )
            )}
            dispatch={(pin) => dispatch({ matrix: { ...input.matrix!, pin } })}
          />
          <PinBox
            label={t('matrix.output_pin')}
            pin={input.matrix.outputPin}
            valid={Object.fromEntries(
              Object.entries(AllPinsNamed).filter((x) =>
                matrixHasPin(device?.device.matrix, 'out', parseInt(x[0], 10))
              )
            )}
            dispatch={(pin) => dispatch({ matrix: { ...input.matrix!, outputPin: pin } })}
          />
        </>
      )}
      {input.switchNetwork && (
        <Select
          label={t('switchNetwork.button')}
          value={input.switchNetwork.button?.toString() ?? null}
          data={
            device?.device.switchNetwork?.buttons?.map((networkButton, index) => {
              const label = getSwitchNetworkLabel(
                guiDevices,
                networkButton.pin,
                networkButton.otherPin,
                false,
                true
              );
              return {
                value: index.toString(),
                label: label
                  ? `GPIO ${networkButton.pin} + GPIO ${networkButton.otherPin} ${label}`
                  : `GPIO ${networkButton.pin} + GPIO ${networkButton.otherPin}`,
              };
            }) ?? []
          }
          allowDeselect={false}
          onChange={(button) => {
            if (button !== null) {
              dispatch({
                switchNetwork: {
                  ...input.switchNetwork!,
                  button: Number(button),
                },
              });
            }
          }}
          placeholder={t('switchNetwork.button')}
        />
      )}
      {input.gpio && (
        <>
          <Group grow>
            <PinBox
              label="pin_label"
              valid={input.gpio.analog ? AnalogPinsNamed : AllPinsNamed}
              pin={input.gpio.pin}
              dispatch={(pin) => dispatch({ gpio: { ...input.gpio!, pin } })}
            />
            <DropdownBox
              title="gpio.mode.label"
              e={proto.PinMode}
              val={input.gpio?.pinMode}
              label="gpio.mode"
              dispatch={(pinMode) => dispatch({ gpio: { ...input.gpio!, pinMode } })}
            />
          </Group>
          <Button
            w="100%"
            onClick={() => {
              detectPins(
                activationIdx,
                mappingIdx,
                ledIdx,
                innerIdx,
                input.gpio!.analog
                  ? proto.PinDetectType.DetectAnalog
                  : proto.PinDetectType.DetectDigital
              );
            }}
            disabled={detecting}
          >
            {t('pin_detect')}
          </Button>
        </>
      )}
      {input.peripheral && (
        <>
          <Group grow>
            <PinBox
              label="pin_label"
              valid={input.peripheral.analog ? AnalogPinsNamed : AllPinsNamed}
              pin={input.peripheral.pin}
              dispatch={(pin) => dispatch({ peripheral: { ...input.peripheral!, pin } })}
              deviceId={input.peripheral.deviceid?.toString()}
            />
            <DropdownBox
              title="gpio.mode.label"
              e={proto.PinMode}
              val={input.peripheral?.pinMode}
              label="gpio.mode"
              dispatch={(pinMode) => dispatch({ peripheral: { ...input.peripheral!, pinMode } })}
            />
          </Group>
          <Button
            w="100%"
            onClick={() => {
              detectPins(
                activationIdx,
                mappingIdx,
                ledIdx,
                innerIdx,
                input.peripheral!.analog
                  ? proto.PinDetectType.DetectAnalog
                  : proto.PinDetectType.DetectDigital
              );
            }}
            disabled={detecting}
          >
            {t('pin_detect')}
          </Button>
        </>
      )}
      {input.ads1115 && (
        <>
          {(pinModeCombobox.dropdownOpened && (
            <Combobox
              store={pinModeCombobox}
              onOptionSubmit={(val) => {
                dispatch({
                  ...input,
                  ads1115: {
                    ...input.ads1115!,
                    channel: parseInt(val, 10),
                  },
                });
                pinModeCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label={t('multiplexer.channel_label')}
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => pinModeCombobox.toggleDropdown()}
                >
                  {t('multiplexer.channel', { channel: input.ads1115.channel })}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {[...Array(4)].map((_, i) => (
                    <Combobox.Option key={i} value={i.toString()}>
                      {t('multiplexer.channel', { channel: i })}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label={t('multiplexer.channel_label')}
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => pinModeCombobox.toggleDropdown()}
            >
              {t('multiplexer.channel', { channel: input.ads1115.channel })}
            </InputBase>
          )}
        </>
      )}
      {input.multiplexer && (
        <>
          {(pinModeCombobox.dropdownOpened && (
            <Combobox
              store={pinModeCombobox}
              onOptionSubmit={(val) => {
                dispatch({
                  ...input,
                  multiplexer: {
                    ...input.multiplexer!,
                    channel: parseInt(val, 10),
                  },
                });
                pinModeCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label={t('multiplexer.channel_label')}
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => pinModeCombobox.toggleDropdown()}
                >
                  {t('multiplexer.channel', { channel: input.multiplexer.channel })}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {[...Array(device?.device.multiplexer?.sixteenChannel ? 16 : 8)].map((_, i) => (
                    <Combobox.Option key={i} value={i.toString()}>
                      {t('multiplexer.channel', { channel: i })}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label={t('multiplexer.channel_label')}
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => pinModeCombobox.toggleDropdown()}
            >
              {t('multiplexer.channel', { channel: input.multiplexer.channel })}
            </InputBase>
          )}
        </>
      )}
      {input.midi?.midiNote && (
        <>
          <NumberInput
            label={
              proKeyCount != null
                ? t('input.rootMidiNote', 'Root MIDI Note')
                : t('input.midiNote', 'MIDI Note')
            }
            description={
              proKeyCount != null
                ? t(
                    'input.rootMidiNote_desc',
                    'Keys are mapped sequentially starting from this note (Note {{root}} to {{end}})',
                    {
                      root: input.midi.midiNote.note,
                      end: (input.midi.midiNote.note ?? 0) + proKeyCount - 1,
                    }
                  )
                : undefined
            }
            value={input.midi.midiNote.note}
            onChange={(val) =>
              dispatch({
                midi: { ...input.midi!, midiNote: { ...input.midi!.midiNote!, note: Number(val) } },
              })
            }
          />
          {matchingSlot?.midiChannel == null && (
            <NumberInput
              label={t('input.midiChannel', 'MIDI Channel')}
              value={input.midi.midiNote.channel}
              onChange={(val) =>
                dispatch({
                  midi: {
                    ...input.midi!,
                    midiNote: { ...input.midi!.midiNote!, channel: Number(val) },
                  },
                })
              }
            />
          )}
        </>
      )}
      {input.midi?.midiControlChange && (
        <>
          <NumberInput
            label={t('input.midiControlChange')}
            value={input.midi.midiControlChange.cc}
            onChange={(val) =>
              dispatch({
                midi: {
                  ...input.midi!,
                  midiControlChange: { ...input.midi!.midiControlChange!, cc: Number(val) },
                },
              })
            }
          />
          {matchingSlot?.midiChannel == null && (
            <NumberInput
              label={t('input.midiChannel')}
              value={input.midi.midiControlChange.channel}
              onChange={(val) =>
                dispatch({
                  midi: {
                    ...input.midi!,
                    midiControlChange: { ...input.midi!.midiControlChange!, channel: Number(val) },
                  },
                })
              }
            />
          )}
        </>
      )}
      {input.midi?.midiPitchBend && matchingSlot?.midiChannel == null && (
        <>
          <NumberInput
            label={t('input.midiPitchBend')}
            value={input.midi.midiPitchBend.channel}
            onChange={(val) =>
              dispatch({
                midi: {
                  ...input.midi!,
                  midiPitchBend: { ...input.midi!.midiPitchBend!, channel: Number(val) },
                },
              })
            }
          />
        </>
      )}
      {input.midi?.midiProGuitarButton && (
        <DropdownBox
          title="input.midiProGuitarButton.title"
          e={proto.ProGuitarMidiButtonType}
          val={input.midi!.midiProGuitarButton?.button}
          label="input.midiProGuitarButton"
          dispatch={(button) =>
            dispatch({
              midi: {
                ...input.midi!,
                midiProGuitarButton: { ...input.midi!.midiProGuitarButton!, button },
              },
            })
          }
        />
      )}
      {input.midi?.midiProGuitarAxis && (
        <DropdownBox
          title="input.midiProGuitarAxis.title"
          e={proto.ProGuitarAxisType}
          val={input.midi!.midiProGuitarAxis?.axis}
          label="input.midiProGuitarAxis"
          dispatch={(axis) =>
            dispatch({
              midi: {
                ...input.midi!,
                midiProGuitarAxis: { ...input.midi!.midiProGuitarAxis!, axis },
              },
            })
          }
        />
      )}
    </>
  );
}
function isAnalog(input: proto.IInput) {
  return isAnalogInput(input);
}
// Pro keys keys are read as buttons, the firmware only decodes them from button inputs
function isProKeyOutput(output: proto.IOutput) {
  return output.proKeySingle != null || output.proKeyMultiple != null;
}
// Picks which key of a pro keyboard (or the first key of a range) an input reads, so a key
// can drive any output, and not just a pro keys output
function ProKeyInputNumber({
  output,
  dispatch,
}: {
  output?: proto.IOutput | null;
  dispatch: (output: proto.IOutput) => void;
}) {
  const { t } = useTranslation();
  if (output?.proKeySingle == null) {
    return null;
  }
  return (
    <>
      <Space h="md" />
      <NumberInput
        label={t('inputs.pro_key_index', 'Key Number (1 - 25)')}
        value={output.proKeySingle}
        min={1}
        max={25}
        onChange={(val) => dispatch({ proKeySingle: Number(val) || 1 })}
      />
    </>
  );
}
const crkdDrumMappings: Record<proto.CrkdDrumAxisType, keyof proto.ICrkdCalibrationData> = {
  [proto.CrkdDrumAxisType.CrkdGreenPad]: 'greenPad',
  [proto.CrkdDrumAxisType.CrkdYellowPad]: 'yellowPad',
  [proto.CrkdDrumAxisType.CrkdBluePad]: 'bluePad',
  [proto.CrkdDrumAxisType.CrkdRedPad]: 'redPad',
  [proto.CrkdDrumAxisType.CrkdGreenCymbal]: 'greenCymbal',
  [proto.CrkdDrumAxisType.CrkdYellowCymbal]: 'yellowCymbal',
  [proto.CrkdDrumAxisType.CrkdBlueCymbal]: 'blueCymbal',
  [proto.CrkdDrumAxisType.CrkdKick1]: 'kick1',
  [proto.CrkdDrumAxisType.CrkdKick2]: 'kick2',
};
// Strum outputs, matching how the firmware picks out strums for combined strum debounce
function isStrumOutput(output: proto.IOutput, subtype: proto.SubType) {
  if (
    subtype !== proto.SubType.GuitarHeroGuitar &&
    subtype !== proto.SubType.RockBandGuitar &&
    subtype !== proto.SubType.LiveGuitar
  ) {
    return false;
  }
  return (
    output.gamepadButton === proto.GamepadButtonType.Gamepad_DpadUp ||
    output.gamepadButton === proto.GamepadButtonType.Gamepad_DpadDown ||
    (subtype === proto.SubType.LiveGuitar &&
      (output.ghlButton === proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumUp ||
        output.ghlButton === proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumDown))
  );
}

// Gives every strum mapping in the profile the same debounce, for combined strum debounce
function withStrumDebounce(
  profile: proto.IProfile,
  debounce100us: number,
  debounceMode: proto.DebounceMode | null | undefined
): proto.IProfile {
  const subtype = profile.opts.deviceToEmulate;
  return {
    ...profile,
    mappings: profile.mappings?.map((mapping) =>
      isStrumOutput(mapping.mapping, subtype)
        ? { ...mapping, debounce: undefined, debounce100us, debounceMode }
        : mapping
    ),
  };
}

function mappingDebounce100us(mapping: proto.IMapping) {
  return mapping.debounce100us ?? (mapping.debounce ?? 0) * 10;
}

// Debounce modes in the order the segmented control shows them, with their translation key
const DEBOUNCE_MODES = [
  [proto.DebounceMode.DebounceRelease, 'release'],
  [proto.DebounceMode.DebouncePress, 'press'],
  [proto.DebounceMode.DebounceImpulse, 'impulse'],
] as const;

function SantrollerMapping({
  mapping,
  type,
  profileIdx,
  mappingIdx,
  mode,
  legendMode,
  dispatch,
  deleteInput,
  copyInput,
  expanded,
  onToggleExpanded,
  selected = false,
  onSelect,
  placeholder = false,
}: {
  mapping: proto.IMapping;
  type: proto.SubType;
  profileIdx: number;
  mappingIdx: number;
  mode: proto.FaceButtonMappingMode;
  legendMode: LegendMode;
  dispatch: (mapping: proto.IMapping) => void;
  deleteInput: () => void;
  copyInput: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  // Left out where cards can't be selected
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  // Faded, where a dragged group will land
  placeholder?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({
    id: mappingIdx,
  });

  const simpleMode = useConfigStore((state) => state.simpleMode);
  const guiDevices = useProfileLabels();
  const profile = useConfigStore((state) => state.config.profiles?.[profileIdx]);
  const updateProfile = useConfigStore((state) => state.updateProfile);
  const combinedStrum =
    !!profile?.opts.combinedStrumDebounce && isStrumOutput(mapping.mapping, type);
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isSorting ? transition : '',
    opacity: placeholder ? 0.4 : undefined,
    // Not stretched to the row, so collapsed cards stay short next to an open one
    alignSelf: 'flex-start',
    // lets the card shrink to fit narrow (phone) screens
    maxWidth: '100%',
  };
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const label =
    proto.GamepadButtonType[mapping.mapping.gamepadButton ?? -1] ||
    proto.GamepadAxisType[mapping.mapping.gamepadAxis ?? -1] ||
    proto.GuitarHeroGuitarButtonType[mapping.mapping.ghButton ?? -1] ||
    proto.GuitarHeroGuitarAxisType[mapping.mapping.ghAxis ?? -1] ||
    proto.GuitarHeroLiveGuitarButtonType[mapping.mapping.ghlButton ?? -1] ||
    proto.GuitarHeroLiveGuitarAxisType[mapping.mapping.ghlAxis ?? -1] ||
    proto.GuitarHeroDrumsAxisType[mapping.mapping.ghDrumAxis ?? -1] ||
    proto.RockBandGuitarButtonType[mapping.mapping.rbButton ?? -1] ||
    proto.RockBandGuitarAxisType[mapping.mapping.rbAxis ?? -1] ||
    proto.RockBandDrumsButtonType[mapping.mapping.rbDrumButton ?? -1] ||
    proto.RockBandDrumsAxisType[mapping.mapping.rbDrumAxis ?? -1] ||
    proto.ProGuitarButtonType[mapping.mapping.proButton ?? -1] ||
    proto.ProGuitarAxisType[mapping.mapping.proAxis ?? -1] ||
    proto.DJHTurntableButtonType[mapping.mapping.djhButton ?? -1] ||
    proto.DJHTurntableAxisType[mapping.mapping.djhAxis ?? -1] ||
    (mapping.mapping.proKeyMultiple != null ? 'ProKeyboard_Keys' : undefined) ||
    (mapping.mapping.proKeySingle != null ? 'ProKeyboard_Key' : undefined) ||
    proto.ProKeyboardAxisType[mapping.mapping.proKeyboardAxis ?? -1] ||
    proto.PopNMusicButtonType[mapping.mapping.popnButton ?? -1] ||
    proto.BeatManiaButtonType[mapping.mapping.bmButton ?? -1] ||
    proto.GuitarFreaksButtonType[mapping.mapping.gfButton ?? -1] ||
    proto.DrumManiaButtonType[mapping.mapping.dmButton ?? -1] ||
    proto.KeyboardManiaButtonType[mapping.mapping.kbmButton ?? -1] ||
    proto.ProKeyboardButtonType[mapping.mapping.proKeyboardButton ?? -1] ||
    (mapping.mapping.keycode != null
      ? hidKeyName(mapping.mapping.keycode)
        ? `${hidKeyName(mapping.mapping.keycode)}`
        : t('keyboard.keyFallback', { code: mapping.mapping.keycode })
      : undefined) ||
    (mapping.mapping.consumerKey != null
      ? (mediaKeyName(mapping.mapping.consumerKey) ??
        t('keyboard.mediaFallback', { code: mapping.mapping.consumerKey }))
      : undefined) ||
    (mapping.mapping.keyboardPassthrough ? 'KeyboardPassthrough' : undefined) ||
    midiOutputLabel(mapping.mapping, t) ||
    proto.ActionType[mapping.mapping.action ?? -1];
  const fixedLabel = FixLabel(mode, type, label || '', legendMode);
  const keyLabel =
    mapping.mapping.keycode != null
      ? getKeyboardKeyLabel(guiDevices, mapping.mapping.keycode, simpleMode)
      : '';
  const outputText = fixedLabel
    ? [t(`outputs.${fixedLabel}`, label ?? ''), keyLabel].filter(Boolean).join(' ')
    : t('inputs.unmapped');
  const img = `Icons/Input/${FixIcon(mode, type, label || '', legendMode)}.png`;
  const button =
    mapping.mapping.keycode != null ||
    mapping.mapping.consumerKey != null ||
    !!mapping.mapping.keyboardPassthrough ||
    mapping.mapping.action != null ||
    mapping.mapping.midiNote != null ||
    Object.entries(mapping.mapping).find(([k, v]) => k.endsWith('Button') && v != null);
  const axis =
    mapping.mapping.proKeySingle != null ||
    mapping.mapping.midiControl != null ||
    mapping.mapping.midiPitchBend != null ||
    Object.entries(mapping.mapping).find(([k, v]) => k.endsWith('Axis') && v);
  // pitch bend rests in the middle like a stick does
  const stick = (axis && label?.includes('Stick')) || mapping.mapping.midiPitchBend != null;
  // MIDI labels are translated, so check GM drum names by their (English) key instead
  const midiDrumKey =
    mapping.mapping.midiNote?.channel === MIDI_PERCUSSION_CHANNEL
      ? GM_PERCUSSION[mapping.mapping.midiNote.note]
      : undefined;
  const drum =
    (mapping.mapping.midiNote == null && (label?.includes('Pad') || label?.includes('Cymbal'))) ||
    !!midiDrumKey?.includes('Cymbal') ||
    mapping.mapping.ghDrumAxis === proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal ||
    isDrumInput(mapping.input);
  const analogInput = isAnalog(mapping.input);
  const crkdDrum = mapping.input.crkdDrum;
  const status = useConfigStore((state) => state.deviceStatus[crkdDrum?.deviceid ?? '']);
  const updateCrkdDrumCalibration = useConfigStore((state) => state.updateCrkdDrumCalibration);
  const crkdAxis = crkdDrumMappings[crkdDrum?.axis ?? proto.CrkdDrumAxisType.CrkdGreenPad];
  const crkdMin =
    (status?.crkdDrumCalibration &&
      status.crkdDrumCalibration[proto.CrkdDrumCalibrationType.Min][crkdAxis]) ||
    0;
  const crkdMax =
    (status?.crkdDrumCalibration &&
      status.crkdDrumCalibration[proto.CrkdDrumCalibrationType.Max][crkdAxis]) ||
    0;
  const crkdDebounce =
    (status?.crkdDrumCalibration &&
      status.crkdDrumCalibration[proto.CrkdDrumCalibrationType.Debounce][crkdAxis]) ||
    0;
  const crkdHoldTick =
    (status?.crkdDrumCalibration &&
      status.crkdDrumCalibration[proto.CrkdDrumCalibrationType.HoldTick][crkdAxis]) ||
    0;

  const isPressed = useConfigStore(
    (state) => !!state.mappingStatus[profileIdx]?.[mappingIdx]?.state
  );
  if (drum && crkdDrum) {
    if (mapping.debounce || mapping.debounce100us) {
      dispatch({
        ...mapping,
        debounce: 0,
        debounce100us: undefined,
      });
    }
    if (mapping.min !== 0) {
      dispatch({
        ...mapping,
        min: 0,
      });
    }
    if (mapping.max !== 65535) {
      dispatch({
        ...mapping,
        max: 65535,
      });
    }
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Modal opened={opened} onClose={close} title={t('delete_device_dialog.title')} centered>
        {t('delete_device_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteInput();
                close();
              }}
              color="red"
            >
              {t('delete_device_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('delete_device_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        w="420px"
        maw="100%"
        style={
          selected ? { ...OFFSCREEN_MAPPING_CARD, ...selectedCardStyle } : OFFSCREEN_MAPPING_CARD
        }
      >
        <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
          <Group gap="xs">
            {!simpleMode && (
              <div {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                <IconGripVertical size={18} stroke={1.5} />
              </div>
            )}
            <Title order={4} style={{ cursor: 'pointer' }} onClick={onToggleExpanded}>
              {t('inputs.mapping_title', { num: mappingIdx + 1 })}
            </Title>
            {mapping.mapping.proKeyMultiple != null ? (
              <Badge variant="light" color="teal">
                {t('inputs.pro_keys_range', '{{count}} Keys', {
                  count: mapping.mapping.proKeyMultiple,
                })}
              </Badge>
            ) : mapping.mapping.proKeySingle != null ? (
              <Badge variant="light" color="teal">
                {t('inputs.pro_key_num', 'Key {{num}}', {
                  num: mapping.mapping.proKeySingle,
                })}
              </Badge>
            ) : button ? (
              <Badge color={isPressed ? 'blue' : 'gray'}>
                {isPressed ? t('state.pressed') : t('state.released')}
              </Badge>
            ) : axis ? (
              <Badge variant="light" color="indigo">
                {t('inputs.axis')}
              </Badge>
            ) : null}
          </Group>
          <Group gap={4} wrap="nowrap">
            {!simpleMode && (
              <>
                {onSelect && (
                  <SelectToggle variant="subtle" selected={selected} onSelect={onSelect} />
                )}
                <ActionIcon variant="subtle" onClick={copyInput} title={t('common.copy')}>
                  <IconCopy size={18} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" onClick={open} title={t('common.delete')}>
                  <IconTrash size={18} />
                </ActionIcon>
              </>
            )}
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onToggleExpanded}
              title={expanded ? t('inputs.collapse') : t('inputs.expand')}
            >
              <IconChevronDown
                size={18}
                style={{
                  transform: expanded ? 'rotate(180deg)' : undefined,
                  transition: 'transform 150ms ease',
                }}
              />
            </ActionIcon>
          </Group>
        </Group>

        {expanded ? (
          <>
            <Card
              padding="xs"
              radius="sm"
              withBorder
              mb="sm"
              bg="var(--mantine-color-default-hover)"
            >
              <Group justify="space-between" wrap="nowrap">
                <Text size="xs" fw={500} c="dimmed">
                  {t('inputs.target_output')}:
                </Text>
                <Badge variant="light" color="blue" size="sm">
                  {outputText}
                </Badge>
              </Group>
            </Card>

            <Center py="xs">
              <Image
                src={img}
                height={70}
                w="auto"
                fit="contain"
                alt={fixedLabel || 'input'}
                fallbackSrc="/Icons/Generic.png"
              />
            </Center>
          </>
        ) : (
          <Card
            padding="xs"
            radius="sm"
            withBorder
            mb={axis ? 'sm' : 0}
            bg="var(--mantine-color-default-hover)"
            style={{ cursor: 'pointer' }}
            onClick={onToggleExpanded}
          >
            <Group gap="sm" wrap="nowrap">
              <Image
                src={img}
                h={32}
                w="auto"
                fit="contain"
                alt={fixedLabel || 'input'}
                fallbackSrc="/Icons/Generic.png"
              />
              <Badge variant="light" color="blue" size="sm" style={{ flexShrink: 0 }}>
                {outputText}
              </Badge>
              {/* SantrollerLabel renders plain Text, so size it down through Text's font size var */}
              <Box
                c="dimmed"
                miw={0}
                style={{ '--text-fz': 'var(--mantine-font-size-sm)' } as React.CSSProperties}
              >
                {mapping.input.gpio ? (
                  <Text>{t('pin', { pin: mapping.input.gpio.pin })}</Text>
                ) : (
                  <SantrollerLabel input={mapping.input} label={fixedLabel} fallback={false} />
                )}
              </Box>
            </Group>
          </Card>
        )}

        {expanded && simpleMode && (
          <>
            <Space h="xs" />
            <Center>
              <SantrollerLabel input={mapping.input} label={fixedLabel} />
            </Center>
          </>
        )}
        {axis && (
          <StateSlider
            mappingIdx={mappingIdx}
            profileIdx={profileIdx}
            center={mapping.center!}
            min={mapping.min!}
            max={mapping.max!}
            deadzone={mapping.deadzone!}
            zeroBased={drum}
          />
        )}
        {!expanded && (
          <Button
            size="xs"
            variant="light"
            fullWidth
            mt="xs"
            leftSection={<IconPencil size={14} />}
            rightSection={<IconChevronDown size={14} />}
            onClick={onToggleExpanded}
          >
            {t('inputs.expand')}
          </Button>
        )}
        {expanded && button && (
          <StateSlider
            mappingIdx={mappingIdx}
            profileIdx={profileIdx}
            center={0}
            min={0}
            max={65535}
            deadzone={0}
            raw
            zeroBased={!!mapping.input?.midi}
          />
        )}
        {/* The editor itself, only while the card is open */}
        {expanded && (
          <>
            {!simpleMode && (
              <>
                <MappingBox
                  dispatch={dispatch}
                  type={type}
                  mode={mode}
                  mapping={mapping}
                  legendMode={legendMode}
                />
                {mapping.mapping.proKeyMultiple != null && (
                  <>
                    <Space h="md" />
                    <NumberInput
                      label={t('inputs.pro_keys_count', 'Number of Keys')}
                      value={mapping.mapping.proKeyMultiple}
                      min={1}
                      max={25}
                      onChange={(val) =>
                        dispatch({
                          ...mapping,
                          mapping: {
                            ...mapping.mapping,
                            proKeyMultiple: Number(val) || 25,
                          },
                        })
                      }
                    />
                  </>
                )}
                {mapping.mapping.proKeySingle != null && (
                  <>
                    <Space h="md" />
                    <NumberInput
                      label={t('inputs.pro_key_index', 'Key Number (1 - 25)')}
                      value={mapping.mapping.proKeySingle}
                      min={1}
                      max={25}
                      onChange={(val) =>
                        dispatch({
                          ...mapping,
                          mapping: {
                            ...mapping.mapping,
                            proKeySingle: Number(val) || 1,
                          },
                        })
                      }
                    />
                  </>
                )}
                <Space h="md" />
                <SantrollerInput
                  axis={!!axis}
                  button={!!button}
                  mode={mode}
                  input={mapping.input}
                  legendMode={legendMode}
                  type={type}
                  proKeyCount={mapping.mapping.proKeyMultiple ?? undefined}
                  dispatch={(input) => {
                    dispatch({
                      ...mapping,
                      input,
                      pressed: isAnalog(input) ? undefined : (mapping.pressed ?? 65535),
                      debounce:
                        drum && mapping.debounce100us == null
                          ? (mapping.debounce ?? 30)
                          : undefined,
                      debounce100us: drum ? mapping.debounce100us : undefined,
                      peakBased: drum ? true : undefined,
                    });
                  }}
                  mappingIdx={mappingIdx}
                />
              </>
            )}
            <Space h="md" />
            {(button || (drum && !crkdDrum)) && (
              <NumberInput
                label={t('debounce.label')}
                description={t('debounce.desc')}
                decimalScale={1}
                step={0.1}
                min={0}
                value={
                  mapping.debounce100us != null
                    ? mapping.debounce100us / 10
                    : (mapping.debounce ?? 0)
                }
                onChange={(val) => {
                  const debounce100us = Math.round(Number(val) * 10);
                  if (combinedStrum && profile) {
                    updateProfile(
                      withStrumDebounce(profile, debounce100us, mapping.debounceMode),
                      profileIdx
                    );
                    return;
                  }
                  dispatch({ ...mapping, debounce: undefined, debounce100us });
                }}
              />
            )}
            {(button || (drum && !crkdDrum)) && !simpleMode && (
              <Input.Wrapper
                mt="xs"
                label={t('debounce.mode.label')}
                description={DEBOUNCE_MODES.map(([mode, key]) => (
                  // Spans, since the description renders inside a <p>
                  <Text
                    span
                    display="block"
                    inherit
                    key={key}
                    c={
                      (mapping.debounceMode ?? proto.DebounceMode.DebounceRelease) === mode
                        ? 'var(--mantine-color-bright)'
                        : undefined
                    }
                  >
                    <Text span inherit fw={700}>
                      {t(`debounce.mode.${key}`)}
                    </Text>
                    : {t(`debounce.mode.${key}_desc`)}
                  </Text>
                ))}
              >
                <SegmentedControl
                  fullWidth
                  data={[
                    {
                      value: proto.DebounceMode.DebounceRelease.toString(),
                      label: t('debounce.mode.release'),
                    },
                    {
                      value: proto.DebounceMode.DebouncePress.toString(),
                      label: t('debounce.mode.press'),
                    },
                    {
                      value: proto.DebounceMode.DebounceImpulse.toString(),
                      label: t('debounce.mode.impulse'),
                    },
                  ]}
                  value={(mapping.debounceMode ?? proto.DebounceMode.DebounceRelease).toString()}
                  onChange={(val) => {
                    const num = Number(val);
                    const debounceMode =
                      num === proto.DebounceMode.DebouncePress
                        ? proto.DebounceMode.DebouncePress
                        : num === proto.DebounceMode.DebounceImpulse
                          ? proto.DebounceMode.DebounceImpulse
                          : null;
                    if (combinedStrum && profile) {
                      updateProfile(
                        withStrumDebounce(profile, mappingDebounce100us(mapping), debounceMode),
                        profileIdx
                      );
                      return;
                    }
                    dispatch({ ...mapping, debounceMode });
                  }}
                />
              </Input.Wrapper>
            )}
            {drum && crkdDrum && (
              <>
                <NumberInput
                  label={t('crkd.debounce.label')}
                  description={t('crkd.debounce.desc')}
                  value={crkdDebounce ?? 0}
                  onChange={(val) =>
                    updateCrkdDrumCalibration(
                      mapping.input.crkdDrum!.deviceid.toString(),
                      proto.CrkdDrumCalibrationType.Debounce,
                      crkdAxis,
                      parseInt(val.toString(), 10)
                    )
                  }
                />
                <NumberInput
                  label={t('crkd.holdTick.label')}
                  description={t('crkd.holdTick.desc')}
                  value={crkdHoldTick ?? 0}
                  onChange={(val) =>
                    updateCrkdDrumCalibration(
                      mapping.input.crkdDrum!.deviceid.toString(),
                      proto.CrkdDrumCalibrationType.HoldTick,
                      crkdAxis,
                      parseInt(val.toString(), 10)
                    )
                  }
                />
              </>
            )}
            <Space h="md" />
            {button && analogInput && !crkdDrum && (
              <>
                <Space h="md" />
                <Accordion defaultValue={simpleMode ? 'main' : undefined}>
                  <Accordion.Item value="main">
                    <Accordion.Control>{t('calibration.buttonMapping')}</Accordion.Control>
                    <Accordion.Panel>
                      {!simpleMode && (
                        <>
                          <Switch
                            label={t('rapidTrigger.label')}
                            description={t('rapidTrigger.description')}
                            checked={!!mapping.rapidTrigger}
                            onChange={(event) =>
                              dispatch({
                                ...mapping,
                                rapidTrigger: event.currentTarget.checked
                                  ? { downSensitivity: 3000, upSensitivity: 3000 }
                                  : null,
                                // travel needs a range to calibrate against
                                ...(event.currentTarget.checked && mapping.min === mapping.max
                                  ? { min: 0, max: 65535 }
                                  : {}),
                              })
                            }
                          />
                          <Space h="md" />
                        </>
                      )}
                      {mapping.rapidTrigger ? (
                        <RapidTriggerSettings
                          mapping={mapping}
                          mappingIdx={mappingIdx}
                          profileIdx={profileIdx}
                          dispatch={dispatch}
                        />
                      ) : (
                        <>
                          {!simpleMode && (
                            <DropdownBox
                              title="trigger_type.label"
                              e={proto.AnalogToDigitalTriggerType}
                              val={mapping.trigger ?? proto.AnalogToDigitalTriggerType.JoyHigh}
                              label="trigger_type"
                              dispatch={(trigger) => dispatch({ ...mapping, trigger })}
                            />
                          )}

                          {(mapping.trigger ?? proto.AnalogToDigitalTriggerType.JoyHigh) ===
                            proto.AnalogToDigitalTriggerType.JoyHigh && (
                            <StateSlider
                              mappingIdx={mappingIdx}
                              profileIdx={profileIdx}
                              center={32767}
                              min={mapping.triggerValue ?? 32767}
                              max={65535}
                              deadzone={mapping.deadzone!}
                              raw
                              zeroBased={drum}
                            />
                          )}
                          {mapping.trigger === proto.AnalogToDigitalTriggerType.JoyLow && (
                            <StateSlider
                              mappingIdx={mappingIdx}
                              profileIdx={profileIdx}
                              center={32767}
                              min={0}
                              max={mapping.triggerValue ?? 32767}
                              deadzone={mapping.deadzone!}
                              raw
                              zeroBased={drum}
                            />
                          )}
                          {mapping.trigger === proto.AnalogToDigitalTriggerType.Range && (
                            <StateSlider
                              mappingIdx={mappingIdx}
                              profileIdx={profileIdx}
                              center={32767}
                              min={mapping.triggerValue ?? 32767}
                              max={mapping.maxTriggerValue ?? 65535}
                              deadzone={mapping.deadzone!}
                              raw
                              zeroBased={drum}
                            />
                          )}
                          {(mapping.trigger === proto.AnalogToDigitalTriggerType.Range && (
                            <Input.Label mb={3}>{t('trigger.min')}</Input.Label>
                          )) || <Input.Label mb={3}>{t('trigger.trigger')}</Input.Label>}
                          <Group>
                            <Slider
                              flex={1}
                              value={mapping.triggerValue ?? 32767}
                              min={0}
                              max={65535}
                              onChange={(val) => dispatch({ ...mapping, triggerValue: val })}
                            />
                            <NumberInput
                              value={mapping.triggerValue ?? 32767}
                              min={0}
                              max={65535}
                              onChange={(e) =>
                                dispatch({
                                  ...mapping,
                                  triggerValue: parseInt(e.toString(), 10) || 0,
                                })
                              }
                              w={100}
                            />
                          </Group>
                          <Group>
                            <Button
                              onClick={() => {
                                dispatch({
                                  ...mapping,
                                  triggerValue:
                                    useConfigStore.getState().mappingStatus[profileIdx]?.[
                                      mappingIdx
                                    ]?.stateRaw ?? 0,
                                });
                              }}
                            >
                              {t('pin_use_current')}
                            </Button>
                          </Group>
                          {mapping.trigger === proto.AnalogToDigitalTriggerType.Range && (
                            <>
                              <Input.Label mb={3}>{t('trigger.max')}</Input.Label>
                              <Group>
                                <Slider
                                  flex={1}
                                  value={mapping.maxTriggerValue ?? 65535}
                                  min={0}
                                  max={65535}
                                  onChange={(val) => dispatch({ ...mapping, maxTriggerValue: val })}
                                />

                                <NumberInput
                                  value={mapping.maxTriggerValue ?? 65535}
                                  min={0}
                                  max={65535}
                                  onChange={(e) =>
                                    dispatch({
                                      ...mapping,
                                      maxTriggerValue: parseInt(e.toString(), 10) || 0,
                                    })
                                  }
                                  w={100}
                                />
                              </Group>
                              <Group>
                                <Button
                                  onClick={() => {
                                    dispatch({
                                      ...mapping,
                                      maxTriggerValue:
                                        useConfigStore.getState().mappingStatus[profileIdx]?.[
                                          mappingIdx
                                        ]?.stateRaw ?? 0,
                                    });
                                  }}
                                >
                                  {t('pin_use_current')}
                                </Button>
                              </Group>
                            </>
                          )}
                        </>
                      )}
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </>
            )}
            {button && analogInput && !crkdDrum && !simpleMode && (
              <>
                <Space h="md" />
                <AnalogFilters mapping={mapping} dispatch={dispatch} axis={false} />
              </>
            )}
            {axis && !analogInput && !simpleMode && (
              <>
                <Switch
                  label={t('axis.released_toggle')}
                  checked={mapping.released !== null}
                  onChange={(event) => {
                    dispatch({
                      ...mapping,
                      released: event.currentTarget.checked ? (stick ? 32767 : 0) : null,
                    });
                  }}
                />
                <Space h="md" />
                {mapping.released !== null && (
                  <>
                    <Text size="sm" fw={700}>
                      {t('axis.released')}
                    </Text>
                    <Group>
                      <Slider
                        flex={1}
                        value={mapping.released!}
                        min={0}
                        max={65535}
                        onChange={(val) => dispatch({ ...mapping, released: val })}
                      />

                      <NumberInput
                        value={mapping.released!}
                        min={0}
                        max={65535}
                        onChange={(e) =>
                          dispatch({ ...mapping, released: parseInt(e.toString(), 10) })
                        }
                        w={100}
                      />
                    </Group>
                  </>
                )}
                <Text size="sm" fw={700}>
                  {t('axis.pressed')}
                </Text>
                <Group>
                  <Slider
                    flex={1}
                    value={mapping.pressed!}
                    min={0}
                    max={65535}
                    onChange={(val) => dispatch({ ...mapping, pressed: val })}
                  />

                  <NumberInput
                    value={mapping.pressed!}
                    min={0}
                    max={65535}
                    onChange={(e) => dispatch({ ...mapping, pressed: parseInt(e.toString(), 10) })}
                    w={100}
                  />
                </Group>
              </>
            )}
            {axis && analogInput && (
              <>
                <Space h="md" />
                <Accordion defaultValue={simpleMode ? 'main' : undefined}>
                  <Accordion.Item value="main">
                    <Accordion.Control>{t('axis.calibration')}</Accordion.Control>
                    <Accordion.Panel>
                      {axis && !crkdDrum && (
                        <>
                          {/* pro keys keys don't calibrate like an axis, so a range can't apply */}
                          {mapping.mapping.proKeySingle == null && !simpleMode && (
                            <>
                              <Input.Wrapper
                                label={t('axis.section.label')}
                                description={t('axis.section.description')}
                              >
                                <SegmentedControl
                                  fullWidth
                                  data={[
                                    {
                                      value: proto.AxisSection.AxisSectionFull.toString(),
                                      label: t('axis.section.full'),
                                    },
                                    {
                                      value: proto.AxisSection.AxisSectionPositive.toString(),
                                      label: t('axis.section.positive'),
                                    },
                                    {
                                      value: proto.AxisSection.AxisSectionNegative.toString(),
                                      label: t('axis.section.negative'),
                                    },
                                    {
                                      value: proto.AxisSection.AxisSectionCustom.toString(),
                                      label: t('axis.section.custom'),
                                    },
                                  ]}
                                  value={(
                                    mapping.section ?? proto.AxisSection.AxisSectionFull
                                  ).toString()}
                                  onChange={(value) => {
                                    const section = parseInt(value, 10) as proto.AxisSection;
                                    const custom = section === proto.AxisSection.AxisSectionCustom;
                                    dispatch({
                                      ...mapping,
                                      section:
                                        section === proto.AxisSection.AxisSectionFull
                                          ? undefined
                                          : section,
                                      sectionStart: custom
                                        ? (mapping.sectionStart ?? 0)
                                        : undefined,
                                      sectionEnd: custom
                                        ? (mapping.sectionEnd ?? 65535)
                                        : undefined,
                                    });
                                  }}
                                />
                              </Input.Wrapper>
                              {mapping.section === proto.AxisSection.AxisSectionCustom && (
                                <>
                                  <Space h="sm" />
                                  <Text size="sm" fw={700}>
                                    {t('axis.section.min')}
                                  </Text>
                                  <Group>
                                    <Slider
                                      flex={1}
                                      value={mapping.sectionStart ?? 0}
                                      min={0}
                                      max={65535}
                                      onChange={(val) =>
                                        dispatch({ ...mapping, sectionStart: val })
                                      }
                                    />
                                    <NumberInput
                                      value={mapping.sectionStart ?? 0}
                                      min={0}
                                      max={65535}
                                      onChange={(e) =>
                                        dispatch({
                                          ...mapping,
                                          sectionStart: parseInt(e.toString(), 10),
                                        })
                                      }
                                      w={100}
                                    />
                                  </Group>
                                  <Text size="sm" fw={700}>
                                    {t('axis.section.max')}
                                  </Text>
                                  <Group>
                                    <Slider
                                      flex={1}
                                      value={mapping.sectionEnd ?? 65535}
                                      min={0}
                                      max={65535}
                                      onChange={(val) => dispatch({ ...mapping, sectionEnd: val })}
                                    />
                                    <NumberInput
                                      value={mapping.sectionEnd ?? 65535}
                                      min={0}
                                      max={65535}
                                      onChange={(e) =>
                                        dispatch({
                                          ...mapping,
                                          sectionEnd: parseInt(e.toString(), 10),
                                        })
                                      }
                                      w={100}
                                    />
                                  </Group>
                                </>
                              )}
                              <Space h="md" />
                            </>
                          )}
                          <StateSlider
                            mappingIdx={mappingIdx}
                            profileIdx={profileIdx}
                            center={mapping.center!}
                            min={mapping.min!}
                            max={mapping.max!}
                            deadzone={mapping.deadzone!}
                            raw
                            zeroBased={drum}
                          />
                          {stick && !mapping.section && (
                            <>
                              <Text size="sm" fw={700}>
                                {t('calibration.center')}
                              </Text>
                              <Group>
                                <Slider
                                  flex={1}
                                  value={mapping.center!}
                                  min={0}
                                  max={65535}
                                  onChange={(val) => dispatch({ ...mapping, center: val })}
                                />

                                <NumberInput
                                  value={mapping.center!}
                                  min={0}
                                  max={65535}
                                  onChange={(e) =>
                                    dispatch({ ...mapping, center: parseInt(e.toString(), 10) })
                                  }
                                  w={100}
                                />
                              </Group>

                              <Group>
                                <Button
                                  onClick={() => {
                                    dispatch({
                                      ...mapping,
                                      center:
                                        useConfigStore.getState().mappingStatus[profileIdx][
                                          mappingIdx
                                        ].stateRaw,
                                    });
                                  }}
                                >
                                  {t('pin_use_current')}
                                </Button>
                              </Group>
                              <Space h="md" />
                            </>
                          )}
                          <Text size="sm" fw={700}>
                            {t('calibration.min')}
                          </Text>
                          <Group>
                            <Slider
                              flex={1}
                              value={mapping.min!}
                              min={0}
                              max={65535}
                              onChange={(val) => dispatch({ ...mapping, min: val })}
                            />

                            <NumberInput
                              value={mapping.min!}
                              min={0}
                              max={65535}
                              onChange={(e) =>
                                dispatch({ ...mapping, min: parseInt(e.toString(), 10) })
                              }
                              w={100}
                            />
                          </Group>
                          <Group>
                            <Button
                              onClick={() => {
                                dispatch({
                                  ...mapping,
                                  min: useConfigStore.getState().mappingStatus[profileIdx][
                                    mappingIdx
                                  ].stateRaw,
                                });
                              }}
                            >
                              {t('pin_use_current')}
                            </Button>
                          </Group>
                          <Space h="md" />
                          <Text size="sm" fw={700}>
                            {t('calibration.max')}
                          </Text>
                          <Group>
                            <Slider
                              flex={1}
                              value={mapping.max!}
                              min={0}
                              max={65535}
                              onChange={(val) => dispatch({ ...mapping, max: val })}
                            />
                            <NumberInput
                              value={mapping.max!}
                              min={0}
                              max={65535}
                              onChange={(e) =>
                                dispatch({ ...mapping, max: parseInt(e.toString(), 10) })
                              }
                              w={100}
                            />
                          </Group>
                          <Group>
                            <Button
                              onClick={() => {
                                dispatch({
                                  ...mapping,
                                  max: useConfigStore.getState().mappingStatus[profileIdx][
                                    mappingIdx
                                  ].stateRaw,
                                });
                              }}
                            >
                              {t('pin_use_current')}
                            </Button>
                          </Group>
                          <Space h="md" />
                          <Text size="sm" fw={700}>
                            {t('calibration.deadzone')}
                          </Text>
                          <Group>
                            <Slider
                              flex={1}
                              value={mapping.deadzone!}
                              min={0}
                              max={65535}
                              onChange={(val) => dispatch({ ...mapping, deadzone: val })}
                            />

                            <NumberInput
                              value={mapping.deadzone!}
                              min={0}
                              max={65535}
                              onChange={(e) =>
                                dispatch({ ...mapping, deadzone: parseInt(e.toString(), 10) })
                              }
                              w={100}
                            />
                          </Group>
                          <Space h="md" />
                          {mapping.mapping.rbAxis ===
                            proto.RockBandGuitarAxisType.RockBandGuitar_Pickup && (
                            <PickupNotches
                              mapping={mapping}
                              mappingIdx={mappingIdx}
                              profileIdx={profileIdx}
                              dispatch={dispatch}
                            />
                          )}
                        </>
                      )}
                      {axis && crkdDrum && (
                        <>
                          <StateSlider
                            mappingIdx={mappingIdx}
                            profileIdx={profileIdx}
                            center={mapping.center!}
                            min={crkdMin}
                            max={crkdMax}
                            deadzone={mapping.deadzone!}
                            crkd={crkdAxis}
                            crkdId={mapping.input.crkdDrum!.deviceid}
                            raw
                            zeroBased={drum}
                          />
                          <Text size="sm" fw={700}>
                            {t('calibration.min')}
                          </Text>
                          <Group>
                            <Slider
                              flex={1}
                              value={crkdMin}
                              min={0}
                              max={255}
                              onChange={(val) =>
                                updateCrkdDrumCalibration(
                                  mapping.input.crkdDrum!.deviceid.toString(),
                                  proto.CrkdDrumCalibrationType.Min,
                                  crkdAxis,
                                  parseInt(val.toString(), 10)
                                )
                              }
                            />

                            <NumberInput
                              value={crkdMin}
                              min={0}
                              max={255}
                              onChange={(val) =>
                                updateCrkdDrumCalibration(
                                  mapping.input.crkdDrum!.deviceid.toString(),
                                  proto.CrkdDrumCalibrationType.Min,
                                  crkdAxis,
                                  parseInt(val.toString(), 10)
                                )
                              }
                              w={100}
                            />
                          </Group>
                          <Group>
                            <Button
                              onClick={() => {
                                dispatch({
                                  ...mapping,
                                  min: useConfigStore.getState().mappingStatus[profileIdx][
                                    mappingIdx
                                  ].stateRaw,
                                });
                              }}
                            >
                              {t('pin_use_current')}
                            </Button>
                          </Group>
                          <Space h="md" />
                          <Text size="sm" fw={700}>
                            {t('calibration.max')}
                          </Text>
                          <Group>
                            <Slider
                              flex={1}
                              value={crkdMax}
                              min={0}
                              max={255}
                              onChange={(val) =>
                                updateCrkdDrumCalibration(
                                  mapping.input.crkdDrum!.deviceid.toString(),
                                  proto.CrkdDrumCalibrationType.Max,
                                  crkdAxis,
                                  parseInt(val.toString(), 10)
                                )
                              }
                            />
                            <NumberInput
                              value={crkdMax}
                              min={0}
                              max={255}
                              onChange={(val) =>
                                updateCrkdDrumCalibration(
                                  mapping.input.crkdDrum!.deviceid.toString(),
                                  proto.CrkdDrumCalibrationType.Max,
                                  crkdAxis,
                                  parseInt(val.toString(), 10)
                                )
                              }
                              w={100}
                            />
                          </Group>
                          <Group>
                            <Button
                              onClick={() => {
                                dispatch({
                                  ...mapping,
                                  max: useConfigStore.getState().mappingStatus[profileIdx][
                                    mappingIdx
                                  ].stateRaw,
                                });
                              }}
                            >
                              {t('pin_use_current')}
                            </Button>
                          </Group>
                        </>
                      )}
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
                {!crkdDrum && !simpleMode && (
                  <>
                    <Space h="md" />
                    <AnalogFilters mapping={mapping} dispatch={dispatch} axis />
                  </>
                )}
              </>
            )}
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              fullWidth
              mt="md"
              rightSection={<IconChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />}
              onClick={onToggleExpanded}
            >
              {t('inputs.collapse')}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

// Note numbering for the note hit LED, as the Santroller LED protocol numbers them
function noteHitNames(type: proto.SubType): string[] | undefined {
  switch (type) {
    case proto.SubType.GuitarHeroGuitar:
    case proto.SubType.RockBandGuitar:
      return ['open', 'green', 'red', 'yellow', 'blue', 'orange'];
    case proto.SubType.LiveGuitar:
      return ['open', 'black1', 'black2', 'black3', 'white1', 'white2', 'white3'];
    case proto.SubType.RockBandDrums:
      return [
        'kick',
        'redPad',
        'yellowPad',
        'bluePad',
        'greenPad',
        'yellowCymbal',
        'blueCymbal',
        'greenCymbal',
      ];
    case proto.SubType.GuitarHeroDrums:
      return ['kick', 'redPad', 'yellowCymbal', 'bluePad', 'orangeCymbal', 'greenPad'];
    case proto.SubType.DjHeroTurntable:
      return [
        'leftScratch',
        'leftGreen',
        'leftRed',
        'leftBlue',
        'rightScratch',
        'rightGreen',
        'rightRed',
        'rightBlue',
      ];
  }
  return undefined;
}

function GameFeedbackLedEditor({
  mapping,
  type,
  dispatch,
}: {
  mapping: proto.IGameFeedbackLedMapping;
  type: proto.SubType;
  dispatch: (mapping: proto.IGameFeedbackLedMapping) => void;
}) {
  const { t } = useTranslation();
  const notes = noteHitNames(type);
  return (
    <>
      <DropdownBox
        title="leds.gameFeedback.label"
        e={proto.GameFeedbackLedType}
        val={mapping.type}
        label="leds.gameFeedback"
        dispatch={(feedbackType) => dispatch({ ...mapping, type: feedbackType, value: 1 })}
      />
      {mapping.type === proto.GameFeedbackLedType.FeedbackMultiplier && (
        <NumberInput
          mt="xs"
          label={t('leds.gameFeedback.multiplier')}
          description={t('leds.gameFeedback.multiplier_description')}
          min={1}
          max={255}
          value={mapping.value ?? 1}
          onChange={(val) => dispatch({ ...mapping, value: Number(val) || 1 })}
        />
      )}
      {mapping.type === proto.GameFeedbackLedType.FeedbackNoteHit && (
        <Select
          mt="xs"
          label={t('leds.gameFeedback.note')}
          allowDeselect={false}
          data={(notes ?? Array.from({ length: 8 }, (_, i) => `${i}`)).map((name, i) => ({
            value: `${i}`,
            label: notes ? t(`leds.gameFeedback.notes.${name}`) : name,
          }))}
          value={`${mapping.value ?? 0}`}
          onChange={(val) => val != null && dispatch({ ...mapping, value: parseInt(val, 10) })}
        />
      )}
    </>
  );
}

// Electrodes the MPR121 can use as GPIO
const MPR121_GPIO_PINS = [4, 5, 6, 7, 8, 9, 10, 11];

// The LED device dropdown's options, so only the open dropdown follows every device's status
function LedDeviceOptions() {
  const { t } = useTranslation();
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  return (
    <>
      {Object.values(deviceStatus)
        .filter((item) => isLed(item) || item.type === 'mpr121')
        .map((item) => (
          <Combobox.Option value={item.id} key={item.id}>
            <Group gap="2">
              <Text fz="sm" span>
                {t(`devices.${item.type}`)}
              </Text>

              <Text fz="xs" span opacity="0.7">
                ({DeviceStatus.label(item)})
              </Text>
            </Group>
          </Combobox.Option>
        ))}
    </>
  );
}

function SantrollerLed({
  led,
  profileIdx,
  ledIdx,
  mode,
  type,
  legendMode,
  dispatch,
  deleteLed,
  copyInput,
  expanded,
  onToggleExpanded,
  selected = false,
  onSelect,
  placeholder = false,
  standby = false,
}: {
  led: proto.ILed;
  profileIdx: number;
  ledIdx: number;
  mode: proto.FaceButtonMappingMode;
  type: proto.SubType;
  // The standby lighting profile has no host, so nothing drives the LED types that come from one
  standby?: boolean;
  legendMode: LegendMode;
  dispatch: (led: proto.ILed) => void;
  deleteLed: () => void;
  copyInput: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  // Left out where cards can't be selected
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  // Faded, where a dragged group will land
  placeholder?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({
    id: ledIdx,
  });

  const deviceCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  const typeCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isSorting ? transition : '',
    opacity: placeholder ? 0.4 : undefined,
    // Not stretched to the row, so collapsed cards stay short next to an open one
    alignSelf: 'flex-start',
    // lets the card shrink to fit narrow (phone) screens
    maxWidth: '100%',
  };
  let deviceId = -1;
  if (led.device.rgb) {
    deviceId = led.device.rgb.deviceId;
  } else if (led.device.stp16) {
    deviceId = led.device.stp16.deviceId;
  } else if (led.device.vtechExpander) {
    deviceId = led.device.vtechExpander.deviceId;
  } else if (led.device.mpr121) {
    deviceId = led.device.mpr121.deviceId;
  }
  const guiDevices = useProfileLabels();
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const device = useConfigStore((state) => state.deviceStatus[deviceId]);
  // Selectors rerun on every input report, so only select the mappings (which only change on
  // edits) and do the stringify compare outside the store
  const profileMappings = useConfigStore((state) => state.config.profiles?.[profileIdx]?.mappings);
  const profileLeds = useConfigStore((state) => state.config.profiles?.[profileIdx]?.leds);
  // the other mappings (by index) this one covers up by sharing an LED with them
  const overlap = useMemo(
    () => (profileLeds ? ledOverlaps(profileLeds)[ledIdx] : undefined),
    [profileLeds, ledIdx]
  );
  const ledInput = led.mapping.inputMapping?.input;
  const mapping = useMemo(() => {
    const key = inputKey(ledInput);
    return profileMappings?.find((x) => inputKey(x.input) === key);
  }, [profileMappings, ledInput]);
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const analog = led.mapping.inputMapping && isAnalog(led.mapping.inputMapping.input);
  const img = useMemo(() => {
    if (led.mapping.inputMapping) {
      if (mapping) {
        const label =
          proto.GamepadButtonType[mapping.mapping.gamepadButton ?? -1] ||
          proto.GamepadAxisType[mapping.mapping.gamepadAxis ?? -1] ||
          proto.GuitarHeroGuitarButtonType[mapping.mapping.ghButton ?? -1] ||
          proto.GuitarHeroGuitarAxisType[mapping.mapping.ghAxis ?? -1] ||
          proto.GuitarHeroLiveGuitarButtonType[mapping.mapping.ghlButton ?? -1] ||
          proto.GuitarHeroLiveGuitarAxisType[mapping.mapping.ghlAxis ?? -1] ||
          proto.GuitarHeroDrumsAxisType[mapping.mapping.ghDrumAxis ?? -1] ||
          proto.RockBandGuitarButtonType[mapping.mapping.rbButton ?? -1] ||
          proto.RockBandGuitarAxisType[mapping.mapping.rbAxis ?? -1] ||
          proto.RockBandDrumsButtonType[mapping.mapping.rbDrumButton ?? -1] ||
          proto.RockBandDrumsAxisType[mapping.mapping.rbDrumAxis ?? -1] ||
          proto.ProGuitarButtonType[mapping.mapping.proButton ?? -1] ||
          proto.ProGuitarAxisType[mapping.mapping.proAxis ?? -1] ||
          proto.DJHTurntableButtonType[mapping.mapping.djhButton ?? -1] ||
          proto.DJHTurntableAxisType[mapping.mapping.djhAxis ?? -1] ||
          (mapping.mapping.proKeyMultiple != null ? 'ProKeyboard_Keys' : undefined) ||
          (mapping.mapping.proKeySingle != null ? 'ProKeyboard_Key' : undefined) ||
          proto.ProKeyboardAxisType[mapping.mapping.proKeyboardAxis ?? -1] ||
          proto.PopNMusicButtonType[mapping.mapping.popnButton ?? -1] ||
          proto.BeatManiaButtonType[mapping.mapping.bmButton ?? -1] ||
          proto.GuitarFreaksButtonType[mapping.mapping.gfButton ?? -1] ||
          proto.DrumManiaButtonType[mapping.mapping.dmButton ?? -1] ||
          proto.KeyboardManiaButtonType[mapping.mapping.kbmButton ?? -1] ||
          proto.ProKeyboardButtonType[mapping.mapping.proKeyboardButton ?? -1];

        // FixIcon, not FixLabel: the label joins the folder and name with a dot, for translations
        return `Icons/Input/${FixIcon(mode, type, label, legendMode)}.png`;
      }
    }
    return `Icons/Generic.png`;
  }, [led, mode, type, legendMode, mapping]);
  let labels: string[] = [];
  const allLabels = guiDevices
    .filter((x) => x.ledLabel?.deviceid === deviceId)
    .flatMap((x) => x.ledLabel?.activeLed?.map((y) => ({ led: y, label: x.ledLabel!.label! })))
    .reduce(
      (prev, next) => ({ ...prev, [next!.led]: [...(prev[next!.led] ?? []), next!.label] }),
      {} as Record<number, string[]>
    );
  const getLedLabel = (led: number) => {
    if (allLabels[led]) {
      return ` - ${allLabels[led].join(' - ')}`;
    }
    return '';
  };
  let deviceValue = <></>;
  if (led.device.gpio) {
    deviceValue = (
      <Group gap="2">
        <Text fz="sm" span>
          {t('devices.gpio')}
        </Text>
        <Text fz="xs" span opacity="0.7">
          {t(led.device.gpio.analog ? 'devices.gpio_analog' : 'devices.gpio_digital')}
        </Text>
      </Group>
    );
  } else if (device) {
    deviceValue = (
      <Group gap="2">
        <Text fz="sm" span>
          {t(`devices.${device.type}`)}
        </Text>

        <Text fz="xs" span opacity="0.7">
          ({DeviceStatus.label(device)})
        </Text>
      </Group>
    );
    if (led.device.rgb) {
      labels = guiDevices
        .filter(
          (x) =>
            x.ledLabel?.deviceid === deviceId &&
            new Set(x.ledLabel?.activeLed).intersection(new Set(led.device.rgb?.activeLed)).size > 0
        )
        .map((x) => x.ledLabel!.label!);
    }
  }
  // These modes write the colour the host sends straight to the LEDs, so the configured colours are unused
  const hostSetsColour =
    !!led.mapping.playstationMapping ||
    (!!led.mapping.stageKitMapping &&
      ![proto.StageKitLedType.StageKitFog, proto.StageKitLedType.StageKitStrobe].includes(
        led.mapping.stageKitMapping.type
      ));
  let mappingValue = '';
  if (led.mapping.inputMapping) {
    mappingValue = t(`leds.type.input`);
  } else if (led.mapping.patternMapping) {
    mappingValue = t(`leds.type.pattern`);
  } else if (led.mapping.staticMapping) {
    mappingValue = t(`leds.type.static`);
  } else if (led.mapping.euphoriaMapping) {
    mappingValue = t(`leds.type.euphoria`);
  } else if (led.mapping.playerMapping) {
    mappingValue = t(`leds.type.player`);
  } else if (led.mapping.playstationMapping) {
    mappingValue = t(`leds.type.playstation`);
  } else if (led.mapping.rumbleMapping) {
    mappingValue = t(`leds.type.rumble`);
  } else if (led.mapping.stageKitMapping) {
    mappingValue = t(`leds.type.stageKit`);
  } else if (led.mapping.keyboardMapping) {
    mappingValue = t(`leds.type.keyboard`);
  } else if (led.mapping.gameFeedbackMapping) {
    mappingValue = t(`leds.type.gameFeedback`);
  } else if (led.mapping.statusMapping) {
    mappingValue = t(`leds.type.status`);
  }

  // An RGB input or status mapping can be made an overlay to stop covering the others
  const offColourWarning = !!(
    led.device.rgb &&
    (led.mapping.inputMapping || led.mapping.statusMapping)
  );
  const ledNames = (idxs: number[]) =>
    idxs.map((idx) => t('leds.item_title', { num: idx + 1 })).join(', ');

  const isLedActive = useConfigStore((state) => !!state.ledStatus[profileIdx]?.[ledIdx]?.state);
  const connected = useConfigStore((state) => state.connected);
  const testLed = useConfigStore((state) => state.testLed);

  let summaryModeText = mappingValue || t('leds.type.static');
  if (led.mapping.inputMapping && mapping) {
    const label =
      proto.GamepadButtonType[mapping.mapping.gamepadButton ?? -1] ||
      proto.GamepadAxisType[mapping.mapping.gamepadAxis ?? -1] ||
      proto.GuitarHeroGuitarButtonType[mapping.mapping.ghButton ?? -1] ||
      proto.GuitarHeroGuitarAxisType[mapping.mapping.ghAxis ?? -1] ||
      proto.GuitarHeroLiveGuitarButtonType[mapping.mapping.ghlButton ?? -1] ||
      proto.GuitarHeroLiveGuitarAxisType[mapping.mapping.ghlAxis ?? -1] ||
      proto.GuitarHeroDrumsAxisType[mapping.mapping.ghDrumAxis ?? -1] ||
      proto.RockBandGuitarButtonType[mapping.mapping.rbButton ?? -1] ||
      proto.RockBandGuitarAxisType[mapping.mapping.rbAxis ?? -1] ||
      proto.RockBandDrumsButtonType[mapping.mapping.rbDrumButton ?? -1] ||
      proto.RockBandDrumsAxisType[mapping.mapping.rbDrumAxis ?? -1] ||
      proto.ProGuitarButtonType[mapping.mapping.proButton ?? -1] ||
      proto.ProGuitarAxisType[mapping.mapping.proAxis ?? -1] ||
      proto.DJHTurntableButtonType[mapping.mapping.djhButton ?? -1] ||
      proto.DJHTurntableAxisType[mapping.mapping.djhAxis ?? -1] ||
      (mapping.mapping.proKeyMultiple != null ? 'ProKeyboard_Keys' : undefined) ||
      (mapping.mapping.proKeySingle != null ? 'ProKeyboard_Key' : undefined) ||
      proto.ProKeyboardAxisType[mapping.mapping.proKeyboardAxis ?? -1] ||
      proto.PopNMusicButtonType[mapping.mapping.popnButton ?? -1] ||
      proto.BeatManiaButtonType[mapping.mapping.bmButton ?? -1] ||
      proto.GuitarFreaksButtonType[mapping.mapping.gfButton ?? -1] ||
      proto.DrumManiaButtonType[mapping.mapping.dmButton ?? -1] ||
      proto.KeyboardManiaButtonType[mapping.mapping.kbmButton ?? -1] ||
      proto.ProKeyboardButtonType[mapping.mapping.proKeyboardButton ?? -1];
    const fixedLabel = FixLabel(mode, type, label, legendMode);
    if (fixedLabel) {
      summaryModeText = `${mappingValue}: ${t(`outputs.${fixedLabel}`)}`;
    }
  } else if (led.mapping.patternMapping) {
    const pat = proto.RgbPatternType[led.mapping.patternMapping.pattern ?? -1];
    if (pat) {
      summaryModeText = `${mappingValue}: ${t(`leds.pattern.${pat}`)}`;
    }
  }

  const testButton = (
    <Button
      fullWidth
      size={expanded ? undefined : 'xs'}
      variant={isLedActive ? 'filled' : 'light'}
      color={isLedActive ? 'blue' : 'gray'}
      disabled={!connected}
      onClick={() => {
        if (isLedActive) {
          testLed(profileIdx, ledIdx, 0);
        } else {
          testLed(profileIdx, ledIdx, 2000);
        }
      }}
    >
      {isLedActive ? t('leds.testing') : t('leds.test')}
    </Button>
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Modal opened={opened} onClose={close} title={t('delete_device_dialog.title')} centered>
        {t('delete_device_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteLed();
                close();
              }}
              color="red"
            >
              {t('delete_device_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('delete_device_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        w="420px"
        maw="100%"
        style={
          selected ? { ...OFFSCREEN_MAPPING_CARD, ...selectedCardStyle } : OFFSCREEN_MAPPING_CARD
        }
      >
        <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
          <Group gap="xs">
            {!simpleMode && (
              <div {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                <IconGripVertical size={18} stroke={1.5} />
              </div>
            )}
            <Title order={4} style={{ cursor: 'pointer' }} onClick={onToggleExpanded}>
              {t('leds.item_title', { num: ledIdx + 1 })}
            </Title>
            {led.mapping.inputMapping && !analog ? (
              <Badge color={isLedActive ? 'blue' : 'gray'}>
                {isLedActive ? t('state.active') : t('state.inactive')}
              </Badge>
            ) : led.mapping.inputMapping && analog ? (
              <Badge variant="light" color="indigo">
                {t('inputs.axis')}
              </Badge>
            ) : led.mapping.patternMapping ? (
              <Badge variant="light" color="cyan">
                {t('leds.type.pattern')}
              </Badge>
            ) : led.mapping.staticMapping ? (
              <Badge variant="light" color="teal">
                {t('leds.type.static')}
              </Badge>
            ) : (
              <Badge color={isLedActive ? 'blue' : 'gray'}>
                {isLedActive ? t('state.active') : t('state.inactive')}
              </Badge>
            )}
          </Group>
          <Group gap={4} wrap="nowrap">
            {!simpleMode && (
              <>
                {onSelect && (
                  <SelectToggle variant="subtle" selected={selected} onSelect={onSelect} />
                )}
                <ActionIcon variant="subtle" onClick={copyInput} title={t('common.copy')}>
                  <IconCopy size={18} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" onClick={open} title={t('common.delete')}>
                  <IconTrash size={18} />
                </ActionIcon>
              </>
            )}
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onToggleExpanded}
              title={expanded ? t('leds.collapse') : t('leds.expand')}
            >
              <IconChevronDown
                size={18}
                style={{
                  transform: expanded ? 'rotate(180deg)' : undefined,
                  transition: 'transform 150ms ease',
                }}
              />
            </ActionIcon>
          </Group>
        </Group>

        {overlap && overlap.hides.length > 0 && (
          <Alert
            variant="light"
            color="yellow"
            title={t('leds.hides.title')}
            icon={<IconExclamationCircle size={16} />}
            mb="sm"
          >
            <Text size="xs">
              {offColourWarning
                ? t('leds.hides.off_colour', { leds: ledNames(overlap.hides) })
                : t('leds.hides.always', { leds: ledNames(overlap.hides) })}
            </Text>
          </Alert>
        )}
        {overlap && overlap.cutsShort.length > 0 && (
          <Alert
            variant="light"
            color="yellow"
            title={t('leds.cutsShort.title')}
            icon={<IconExclamationCircle size={16} />}
            mb="sm"
          >
            <Text size="xs">
              {offColourWarning
                ? t('leds.cutsShort.off_colour', { leds: ledNames(overlap.cutsShort) })
                : t('leds.cutsShort.always', { leds: ledNames(overlap.cutsShort) })}
            </Text>
          </Alert>
        )}

        {expanded ? (
          <>
            <Card
              padding="xs"
              radius="sm"
              withBorder
              mb="sm"
              bg="var(--mantine-color-default-hover)"
            >
              <Group justify="space-between" wrap="nowrap">
                <Text size="xs" fw={500} c="dimmed">
                  {t('leds.summary_mode')}:
                </Text>
                <Badge variant="light" color="blue" size="sm">
                  {summaryModeText}
                </Badge>
              </Group>
            </Card>

            <Center py="xs">
              <Image
                src={img}
                height={70}
                w="auto"
                fit="contain"
                alt={t('inputs.led_icon')}
                fallbackSrc="/Icons/Generic.png"
              />
            </Center>
          </>
        ) : (
          <Card
            padding="xs"
            radius="sm"
            withBorder
            bg="var(--mantine-color-default-hover)"
            style={{ cursor: 'pointer' }}
            onClick={onToggleExpanded}
          >
            <Group gap="sm" wrap="nowrap">
              <Image
                src={img}
                h={32}
                w="auto"
                fit="contain"
                alt={t('inputs.led_icon')}
                fallbackSrc="/Icons/Generic.png"
              />
              <Text size="xs" fw={500} c="dimmed">
                {t('leds.summary_mode')}:
              </Text>
              <Badge variant="light" color="blue" size="sm" miw={0}>
                {summaryModeText}
              </Badge>
            </Group>
          </Card>
        )}
        {/* The editor itself, only while the card is open */}
        {expanded && (
          <>
            {!simpleMode && (
              <>
                {(deviceCombobox.dropdownOpened && (
                  <Combobox
                    store={deviceCombobox}
                    onOptionSubmit={(val) => {
                      deviceCombobox.closeDropdown();
                      if (isNumberLike(val)) {
                        switch (useConfigStore.getState().deviceStatus[parseInt(val, 10)].type) {
                          case 'ws2812':
                          case 'apa102':
                            dispatch({
                              ...led,
                              device: {
                                rgb: {
                                  activeLed: [],
                                  deviceId: parseInt(val, 10),
                                  startR: 0,
                                  startG: 0,
                                  startB: 0,
                                  startW: 255,
                                  endR: 0,
                                  endG: 0,
                                  endB: 0,
                                  endW: 255,
                                  hasStart: true,
                                },
                              },
                            });
                            break;
                          case 'stp16cpc':
                            dispatch({
                              ...led,
                              device: {
                                stp16: {
                                  activeLed: [],
                                  deviceId: parseInt(val, 10),
                                },
                              },
                            });
                            break;
                          case 'dmx':
                            dispatch({
                              ...led,
                              device: {
                                dmx: {
                                  channel: 0,
                                  deviceId: parseInt(val, 10),
                                },
                              },
                            });
                            break;
                          case 'vtechExpander':
                            dispatch({
                              ...led,
                              device: {
                                vtechExpander: {
                                  activeLed: 0,
                                  deviceId: parseInt(val, 10),
                                },
                              },
                            });
                            break;
                          case 'mpr121':
                            dispatch({
                              ...led,
                              device: {
                                mpr121: {
                                  pin: MPR121_GPIO_PINS[0],
                                  deviceId: parseInt(val, 10),
                                },
                              },
                            });
                            break;
                        }
                        return;
                      }
                      switch (val) {
                        case 'gpio_analog':
                          dispatch({
                            ...led,
                            device: {
                              gpio: { pin: -1, analog: true },
                            },
                          });
                          break;
                        case 'gpio_digital':
                          dispatch({
                            ...led,
                            device: {
                              gpio: { pin: -1, analog: false },
                            },
                          });
                          break;
                      }
                    }}
                  >
                    <Combobox.Target>
                      <InputBase
                        label={t('leds.device')}
                        component="button"
                        type="button"
                        pointer
                        rightSection={<Combobox.Chevron />}
                        rightSectionPointerEvents="none"
                        onClick={() => deviceCombobox.toggleDropdown()}
                      >
                        {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
                      </InputBase>
                    </Combobox.Target>

                    <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                      <Combobox.Options>
                        <LedDeviceOptions />
                        <Combobox.Option value="gpio_analog">
                          <Group gap="2">
                            <Text fz="sm" span>
                              {t('devices.gpio')}
                            </Text>
                            <Text fz="xs" span opacity="0.7">
                              {t('devices.gpio_analog')}
                            </Text>
                          </Group>
                        </Combobox.Option>
                        <Combobox.Option value="gpio_digital">
                          <Group gap="2">
                            <Text fz="sm" span>
                              {t('devices.gpio')}
                            </Text>
                            <Text fz="xs" span opacity="0.7">
                              {t('devices.gpio_digital')}
                            </Text>
                          </Group>
                        </Combobox.Option>
                      </Combobox.Options>
                    </Combobox.Dropdown>
                  </Combobox>
                )) || (
                  <InputBase
                    label={t('leds.device')}
                    component="button"
                    type="button"
                    pointer
                    rightSection={<Combobox.Chevron />}
                    rightSectionPointerEvents="none"
                    onClick={() => deviceCombobox.toggleDropdown()}
                  >
                    {deviceValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
                  </InputBase>
                )}
                <Space h="md" />
                {(typeCombobox.dropdownOpened && (
                  <Combobox
                    store={typeCombobox}
                    onOptionSubmit={(val) => {
                      typeCombobox.closeDropdown();

                      switch (val) {
                        case 'input':
                          dispatch({
                            ...led,
                            mapping: {
                              inputMapping: {
                                input: {
                                  gpio: {
                                    analog: false,
                                    pin: -1,
                                    pinMode: proto.PinMode.PullUp,
                                  },
                                },
                                max: 65535,
                                min: 0,
                              },
                            },
                          });
                          break;
                        case 'pattern':
                          dispatch({
                            ...led,
                            mapping: {
                              patternMapping: {
                                pattern: proto.RgbPatternType.PatternRainbow,
                                speed: 4,
                                brightness: 255,
                              },
                            },
                          });
                          break;
                        case 'static':
                          dispatch({
                            ...led,
                            mapping: {
                              staticMapping: {},
                            },
                          });
                          break;
                        case 'euphoria':
                          dispatch({
                            ...led,
                            mapping: {
                              euphoriaMapping: {},
                            },
                          });
                          break;
                        case 'player':
                          dispatch({
                            ...led,
                            mapping: {
                              playerMapping: { playerId: 1 },
                            },
                          });
                          break;
                        case 'playstation':
                          dispatch({
                            ...led,
                            mapping: {
                              playstationMapping: {},
                            },
                          });
                          break;
                        case 'rumble':
                          dispatch({
                            ...led,
                            mapping: {
                              rumbleMapping: { type: proto.LedRumbleType.RumbleLeft },
                            },
                          });
                          break;
                        case 'stageKit':
                          dispatch({
                            ...led,
                            mapping: {
                              stageKitMapping: {
                                index: 0,
                                indexMappingMode:
                                  proto.StageKitIndexMappingMode.StageKitIndexSequential,
                                type: proto.StageKitLedType.StageKitStrobe,
                              },
                            },
                          });
                          break;
                        case 'keyboard':
                          dispatch({
                            ...led,
                            mapping: {
                              keyboardMapping: { type: proto.KeyboardLedType.KeyboardLedCapsLock },
                            },
                          });
                          break;
                        case 'gameFeedback':
                          dispatch({
                            ...led,
                            mapping: {
                              gameFeedbackMapping: {
                                type: proto.GameFeedbackLedType.FeedbackStarPowerGauge,
                                value: 1,
                              },
                            },
                          });
                          break;
                        case 'status':
                          dispatch({
                            ...led,
                            mapping: {
                              statusMapping: {
                                type: proto.StatusLedType.StatusBluetoothConnected,
                                mode: proto.ConsoleMode.ModeHid,
                              },
                            },
                          });
                          break;
                      }
                    }}
                  >
                    <Combobox.Target>
                      <InputBase
                        label={t('leds.mode')}
                        component="button"
                        type="button"
                        pointer
                        rightSection={<Combobox.Chevron />}
                        rightSectionPointerEvents="none"
                        onClick={() => typeCombobox.toggleDropdown()}
                      >
                        {mappingValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
                      </InputBase>
                    </Combobox.Target>

                    <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                      <Combobox.Options>
                        <Combobox.Option value="input">{t('leds.type.input')}</Combobox.Option>
                        <Combobox.Option value="pattern">{t('leds.type.pattern')}</Combobox.Option>
                        <Combobox.Option value="static">{t('leds.type.static')}</Combobox.Option>
                        {!standby && (
                          <>
                            <Combobox.Option value="euphoria">
                              {t('leds.type.euphoria')}
                            </Combobox.Option>
                            <Combobox.Option value="player">
                              {t('leds.type.player')}
                            </Combobox.Option>
                            <Combobox.Option value="playstation">
                              {t('leds.type.playstation')}
                            </Combobox.Option>
                            <Combobox.Option value="rumble">
                              {t('leds.type.rumble')}
                            </Combobox.Option>
                            <Combobox.Option value="stageKit">
                              {t('leds.type.stageKit')}
                            </Combobox.Option>
                            <Combobox.Option value="gameFeedback">
                              {t('leds.type.gameFeedback')}
                            </Combobox.Option>
                          </>
                        )}
                        <Combobox.Option value="status">{t('leds.type.status')}</Combobox.Option>
                        {!standby && type === proto.SubType.KeyboardMouse && (
                          <Combobox.Option value="keyboard">
                            {t('leds.type.keyboard')}
                          </Combobox.Option>
                        )}
                      </Combobox.Options>
                    </Combobox.Dropdown>
                  </Combobox>
                )) || (
                  <InputBase
                    label={t('leds.mode')}
                    component="button"
                    type="button"
                    pointer
                    rightSection={<Combobox.Chevron />}
                    rightSectionPointerEvents="none"
                    onClick={() => typeCombobox.toggleDropdown()}
                  >
                    {mappingValue || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
                  </InputBase>
                )}
                <Space h="md" />
                {led.device.gpio && (
                  <>
                    <PinBox
                      label="pin_label"
                      valid={led.device.gpio.analog ? AnalogPinsNamed : AllPinsNamed}
                      pin={led.device.gpio.pin}
                      dispatch={(pin) =>
                        dispatch({ ...led, device: { gpio: { ...led.device.gpio!, pin } } })
                      }
                    />
                    <Space h="sm" />
                    <Switch
                      label={t('leds.invert')}
                      description={t('leds.invert_desc')}
                      checked={!!led.device.gpio.inverted}
                      onChange={(event) =>
                        dispatch({
                          ...led,
                          device: {
                            gpio: {
                              ...led.device.gpio!,
                              inverted: event.currentTarget.checked,
                            },
                          },
                        })
                      }
                    />
                  </>
                )}
                {led.device.mpr121 && (
                  <Select
                    label={t('leds.mpr121_pin')}
                    description={t('leds.mpr121_pin_description')}
                    allowDeselect={false}
                    data={MPR121_GPIO_PINS.map((pin) => ({
                      value: `${pin}`,
                      label: t('leds.mpr121_electrode', { pin }),
                    }))}
                    value={`${led.device.mpr121.pin}`}
                    onChange={(val) =>
                      val != null &&
                      dispatch({
                        ...led,
                        device: { mpr121: { ...led.device.mpr121!, pin: parseInt(val, 10) } },
                      })
                    }
                  />
                )}
                {led.device.dmx && (
                  <NumberInput
                    value={led.device.dmx.channel}
                    min={0}
                    max={device?.device.dmx?.channelCount}
                    onChange={(e) =>
                      dispatch({
                        ...led,
                        device: {
                          dmx: { ...led.device.dmx!, channel: parseInt(e.toString(), 10) },
                        },
                      })
                    }
                  />
                )}
                {led.device.vtechExpander && (
                  <MultiSelect
                    label={t('leds.label')}
                    value={Array.from(Array(8).keys())
                      .filter((x) => led.device.vtechExpander!.activeLed! & (1 << x))
                      .map((x) => x.toString())}
                    data={Array.from({ length: 8 }, (_, x) => x.toString())}
                    clearable
                    maxValues={8}
                    onChange={(val) =>
                      dispatch({
                        ...led,
                        device: {
                          vtechExpander: {
                            ...led.device.vtechExpander!,
                            activeLed: val.reduce(
                              (prev, current) => prev | (1 << parseInt(current, 10)),
                              0
                            ),
                          },
                        },
                      })
                    }
                    searchable
                  />
                )}
                <Space h="md" />
                {led.mapping.inputMapping?.input && (
                  <>
                    <DropdownBox
                      title="leds.pattern.label"
                      e={proto.ReactiveRgbPatternType}
                      val={
                        led.mapping.inputMapping.pattern ??
                        proto.ReactiveRgbPatternType.PatternStatic
                      }
                      label="leds.pattern"
                      dispatch={(pattern) =>
                        dispatch({
                          ...led,
                          mapping: { inputMapping: { ...led.mapping.inputMapping!, pattern } },
                        })
                      }
                    />
                    <SantrollerInput
                      axis={!!analog}
                      button={!analog}
                      mode={mode}
                      legendMode={legendMode}
                      type={type}
                      input={led.mapping.inputMapping?.input}
                      dispatch={(input) => {
                        dispatch({
                          ...led,
                          mapping: { inputMapping: { ...led.mapping.inputMapping, input } },
                        });
                      }}
                      ledIdx={ledIdx}
                    />
                  </>
                )}
                {led.mapping.playerMapping && (
                  <>
                    <Text size="sm">{t('leds.playerId')}</Text>
                    <NumberInput
                      value={led.mapping.playerMapping.playerId}
                      min={1}
                      max={8}
                      onChange={(e) =>
                        dispatch({
                          ...led,
                          mapping: {
                            playerMapping: {
                              ...led.mapping.playerMapping,
                              playerId: parseInt(e.toString(), 10),
                            },
                          },
                        })
                      }
                    />
                  </>
                )}
                {led.mapping.keyboardMapping && (
                  <DropdownBox
                    title="leds.keyboard.label"
                    e={proto.KeyboardLedType}
                    val={led.mapping.keyboardMapping.type}
                    label="leds.keyboard"
                    dispatch={(kbType) =>
                      dispatch({ ...led, mapping: { keyboardMapping: { type: kbType } } })
                    }
                  />
                )}
                {led.mapping.gameFeedbackMapping && (
                  <GameFeedbackLedEditor
                    mapping={led.mapping.gameFeedbackMapping}
                    type={type}
                    dispatch={(gameFeedbackMapping) =>
                      dispatch({ ...led, mapping: { gameFeedbackMapping } })
                    }
                  />
                )}
                {led.mapping.statusMapping && (
                  <>
                    <DropdownBox
                      title="leds.status.label"
                      e={proto.StatusLedType}
                      val={led.mapping.statusMapping.type}
                      label="leds.status"
                      dispatch={(statusType) =>
                        dispatch({
                          ...led,
                          mapping: {
                            statusMapping: { ...led.mapping.statusMapping!, type: statusType },
                          },
                        })
                      }
                    />
                    {led.mapping.statusMapping.type === proto.StatusLedType.StatusConsoleMode && (
                      <>
                        <Space h="xs" />
                        <DropdownBox
                          title="leds.status.mode"
                          e={proto.ConsoleMode}
                          val={led.mapping.statusMapping.mode ?? proto.ConsoleMode.ModeHid}
                          label="consoleMode"
                          dispatch={(consoleMode) =>
                            dispatch({
                              ...led,
                              mapping: {
                                statusMapping: { ...led.mapping.statusMapping!, mode: consoleMode },
                              },
                            })
                          }
                        />
                      </>
                    )}
                  </>
                )}
                {led.mapping.rumbleMapping && (
                  <DropdownBox
                    title="leds.rumble.label"
                    e={proto.LedRumbleType}
                    val={led.mapping.rumbleMapping.type}
                    label="leds.rumble"
                    dispatch={(type) =>
                      dispatch({
                        ...led,
                        mapping: { rumbleMapping: { ...led.mapping.rumbleMapping!, type } },
                      })
                    }
                  />
                )}
                {led.mapping.stageKitMapping && (
                  <>
                    <DropdownBox
                      title="leds.stageKit.label"
                      e={proto.StageKitLedType}
                      val={led.mapping.stageKitMapping.type}
                      label="leds.stageKit"
                      dispatch={(type) =>
                        dispatch({
                          ...led,
                          mapping: { stageKitMapping: { ...led.mapping.stageKitMapping!, type } },
                        })
                      }
                    />
                    {[
                      proto.StageKitLedType.StageKitBlue,
                      proto.StageKitLedType.StageKitRed,
                      proto.StageKitLedType.StageKitGreen,
                      proto.StageKitLedType.StageKitYellow,
                      proto.StageKitLedType.StageKitRGBY,
                    ].includes(led.mapping.stageKitMapping.type) && (
                      <>
                        <DropdownBox
                          title="leds.stageKit.index_mapping_mode.label"
                          e={proto.StageKitIndexMappingMode}
                          val={led.mapping.stageKitMapping.indexMappingMode}
                          label="leds.stageKit.index_mapping_mode"
                          dispatch={(indexMappingMode) =>
                            dispatch({
                              ...led,
                              mapping: {
                                stageKitMapping: {
                                  ...led.mapping.stageKitMapping!,
                                  indexMappingMode,
                                },
                              },
                            })
                          }
                        />
                        <MultiSelect
                          label={t('leds.stagekit.index_label')}
                          value={Array.from(Array(8).keys())
                            .filter((x) => (led.mapping.stageKitMapping!.index ?? 0) & (1 << x))
                            .map((x) => x.toString())}
                          data={Array.from({ length: 8 }, (_, x) => x.toString())}
                          clearable
                          maxValues={8}
                          onChange={(val) =>
                            dispatch({
                              ...led,
                              mapping: {
                                stageKitMapping: {
                                  ...led.mapping.stageKitMapping!,
                                  index: val.reduce(
                                    (prev, current) => (prev ?? 0) | (1 << parseInt(current, 10)),
                                    0
                                  ),
                                },
                              },
                            })
                          }
                          searchable
                        />
                      </>
                    )}
                  </>
                )}
                {led.mapping.patternMapping && (
                  <>
                    <DropdownBox
                      title="leds.pattern.label"
                      e={proto.RgbPatternType}
                      val={led.mapping.patternMapping.pattern}
                      label="leds.pattern"
                      dispatch={(pattern) =>
                        dispatch({
                          ...led,
                          mapping: { patternMapping: { ...led.mapping.patternMapping!, pattern } },
                        })
                      }
                    />
                    <Text size="sm">{t('leds.speed')}</Text>
                    <Slider
                      value={led.mapping.patternMapping?.speed}
                      min={1}
                      max={20}
                      onChange={(speed) =>
                        dispatch({
                          ...led,
                          mapping: {
                            patternMapping: { ...led.mapping.patternMapping!, speed },
                          },
                        })
                      }
                    />
                    <Text size="sm">{t('leds.brightness')}</Text>
                    {led.mapping.patternMapping.pattern === proto.RgbPatternType.PatternRainbow && (
                      <Slider
                        value={led.mapping.patternMapping?.brightness}
                        min={1}
                        max={255}
                        onChange={(brightness) =>
                          dispatch({
                            ...led,
                            mapping: {
                              patternMapping: { ...led.mapping.patternMapping!, brightness },
                            },
                          })
                        }
                      />
                    )}
                  </>
                )}
                <Space h="md" />
              </>
            )}

            {led.device.rgb && (
              <>
                {(simpleMode && labels.length && (
                  <>
                    <Text fz="sm" fw={700}>
                      {t('leds.label')}
                    </Text>
                    {labels.map((x) => (
                      <Text size="sm">{x}</Text>
                    ))}
                  </>
                )) ||
                  undefined}
                {!simpleMode && (
                  <MultiSelect
                    label={t('leds.label')}
                    value={led.device.rgb?.activeLed?.map((x) => x.toString())}
                    data={Array.from(
                      { length: device?.device.ws2812?.count || device?.device.apa102?.count || 0 },
                      (_, x) => ({ value: x.toString(), label: x.toString() + getLedLabel(x) })
                    )}
                    clearable
                    maxValues={255}
                    onChange={(val) =>
                      dispatch({
                        ...led,
                        device: {
                          rgb: { ...led.device.rgb!, activeLed: val.map((x) => parseInt(x, 10)) },
                        },
                      })
                    }
                    searchable
                  />
                )}
                {!led.mapping.staticMapping &&
                  !hostSetsColour &&
                  !simpleMode &&
                  led.mapping.patternMapping?.pattern !== proto.RgbPatternType.PatternRainbow && (
                    <>
                      <Space h="md" />
                      <Switch
                        label={t('leds.overlay.label')}
                        description={t('leds.overlay.description')}
                        checked={!led.device.rgb.hasStart}
                        onChange={(event) => {
                          dispatch({
                            ...led,
                            device: {
                              rgb: {
                                ...led.device.rgb!,
                                // an overlay has no released colour to write
                                hasStart: !event.currentTarget.checked,
                              },
                            },
                          });
                        }}
                      />
                    </>
                  )}
                {(led.mapping.patternMapping?.pattern !== proto.RgbPatternType.PatternRainbow &&
                  led.device.rgb.hasStart &&
                  !led.mapping.staticMapping &&
                  !hostSetsColour && (
                    <>
                      <Space h="md" />
                      <Group grow>
                        <LedColorInput
                          label={t('leds.released')}
                          r={led.device.rgb?.startR}
                          g={led.device.rgb?.startG}
                          b={led.device.rgb?.startB}
                          w={led.device.rgb?.startW}
                          onChange={({ r, g, b, w }) => {
                            dispatch({
                              ...led,
                              device: {
                                ...led.device,
                                rgb: {
                                  ...led.device.rgb!,
                                  startR: r,
                                  startG: g,
                                  startB: b,
                                  startW: w,
                                },
                              },
                            });
                          }}
                        />
                        <Input.Wrapper label=" " description=" " error=" ">
                          <Button
                            w="100%"
                            h="auto"
                            mih={36}
                            styles={{ label: { whiteSpace: 'normal', textAlign: 'center' } }}
                            onClick={() =>
                              dispatch({
                                ...led,
                                device: {
                                  ...led.device,
                                  rgb: {
                                    ...led.device.rgb!,
                                    endR: led.device.rgb!.startR,
                                    endG: led.device.rgb!.startG,
                                    endB: led.device.rgb!.startB,
                                    endW: led.device.rgb!.startW,
                                  },
                                },
                              })
                            }
                          >
                            {t('leds.copyToPressed')}
                          </Button>
                        </Input.Wrapper>
                      </Group>
                    </>
                  )) ||
                  undefined}
                <Space h="md" />
                {led.mapping.patternMapping?.pattern !== proto.RgbPatternType.PatternRainbow &&
                  !hostSetsColour && (
                    <Group grow>
                      <LedColorInput
                        label={led.mapping.staticMapping ? t('leds.colour') : t('leds.pressed')}
                        r={led.device.rgb?.endR}
                        g={led.device.rgb?.endG}
                        b={led.device.rgb?.endB}
                        w={led.device.rgb?.endW}
                        onChange={({ r, g, b, w }) => {
                          dispatch({
                            ...led,
                            device: {
                              ...led.device,
                              rgb: {
                                ...led.device.rgb!,
                                endR: r,
                                endG: g,
                                endB: b,
                                endW: w,
                              },
                            },
                          });
                        }}
                      />
                      {!led.mapping.staticMapping && led.device.rgb.hasStart && (
                        <Input.Wrapper label=" " description=" " error=" " mr="0">
                          <Button
                            w="100%"
                            h="auto"
                            mih={36}
                            styles={{ label: { whiteSpace: 'normal', textAlign: 'center' } }}
                            onClick={() =>
                              dispatch({
                                ...led,
                                device: {
                                  ...led.device,
                                  rgb: {
                                    ...led.device.rgb!,
                                    startR: led.device.rgb!.endR,
                                    startG: led.device.rgb!.endG,
                                    startB: led.device.rgb!.endB,
                                    startW: led.device.rgb!.endW,
                                  },
                                },
                              })
                            }
                          >
                            {t('leds.copyToReleased')}
                          </Button>
                        </Input.Wrapper>
                      )}
                    </Group>
                  )}
              </>
            )}
            {led.mapping.inputMapping && analog && (
              <>
                <Space h="md" />
                <StateSlider
                  mappingIdx={ledIdx}
                  profileIdx={profileIdx}
                  center={32767}
                  min={led.mapping.inputMapping!.min!}
                  max={led.mapping.inputMapping!.max!}
                  deadzone={0}
                  raw
                  ledBased
                />
                <Input.Label mb={3}>{t('calibration.min')}</Input.Label>
                <Slider
                  value={led.mapping.inputMapping!.min!}
                  min={0}
                  max={65535}
                  onChange={(val) =>
                    dispatch({
                      ...led,
                      mapping: {
                        inputMapping: {
                          ...led.mapping.inputMapping!,
                          min: val,
                        },
                      },
                    })
                  }
                />
                <Button
                  onClick={() => {
                    dispatch({
                      ...led,
                      mapping: {
                        inputMapping: {
                          ...led.mapping.inputMapping!,
                          min: useConfigStore.getState().ledStatus[profileIdx][ledIdx].stateRaw,
                        },
                      },
                    });
                  }}
                >
                  {t('pin_use_current')}
                </Button>
                <Input.Label mb={3}>{t('calibration.max')}</Input.Label>
                <Slider
                  value={led.mapping.inputMapping!.max!}
                  min={0}
                  max={65535}
                  onChange={(val) =>
                    dispatch({
                      ...led,
                      mapping: {
                        inputMapping: {
                          ...led.mapping.inputMapping!,
                          max: val,
                        },
                      },
                    })
                  }
                />
                <Button
                  onClick={() => {
                    dispatch({
                      ...led,
                      mapping: {
                        inputMapping: {
                          ...led.mapping.inputMapping!,
                          max: useConfigStore.getState().ledStatus[profileIdx][ledIdx].stateRaw,
                        },
                      },
                    });
                  }}
                >
                  {t('pin_use_current')}
                </Button>
              </>
            )}
          </>
        )}
        {expanded ? (
          <>
            <Space h="sm" />
            {testButton}
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              fullWidth
              mt="md"
              rightSection={<IconChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />}
              onClick={onToggleExpanded}
            >
              {t('leds.collapse')}
            </Button>
          </>
        ) : (
          // Testing stays one click away, since lighting LEDs up is how you find which is which
          <Group grow gap="xs" mt="xs">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPencil size={14} />}
              rightSection={<IconChevronDown size={14} />}
              onClick={onToggleExpanded}
            >
              {t('leds.expand')}
            </Button>
            {testButton}
          </Group>
        )}
      </Card>
    </div>
  );
}

type ProfileAssignmentTypes = keyof proto.IProfileAssignmentInfo;
const OtherAssignmentTypes: ProfileAssignmentTypes[] = ['input', 'inputAnyTime'];
const LocalAssignmentTypes: ProfileAssignmentTypes[] = ['localInputs'];
const HostProfileAssignmentTypes: ProfileAssignmentTypes[] = [
  'wiiExt',
  'ps2Cnt',
  'snesCnt',
  'joybusCnt',
  'usbType',
  'usbDevice',
  'bluetoothDevice',
  'bluetoothType',
  'midiChannel',
  'midiProGuitar',
];
const DeviceProfileAssignmentTypes = TARGET_ASSIGNMENT_TYPES;
type EmulationMode =
  | 'consoleType'
  | 'bluetooth'
  | 'ps2Emulation'
  | 'wiiEmulation'
  | 'joybusEmulation'
  | 'snesEmulation';
const AllProfileAssignmentTypes: ProfileAssignmentTypes[] = OtherAssignmentTypes.concat(
  LocalAssignmentTypes
)
  .concat(HostProfileAssignmentTypes)
  .concat(DeviceProfileAssignmentTypes);
function ActivationTrigger({
  input,
  profileIdx,
  listIdx,
  activationIdx,
  dispatch,
}: {
  input: proto.IInputActivationTrigger;
  profileIdx: number;
  listIdx: number;
  activationIdx: number;
  dispatch: (input: proto.IInputActivationTrigger) => void;
}) {
  const { t } = useTranslation();
  return (
    <Accordion>
      <Accordion.Item value="main">
        <Accordion.Control>{t('calibration.buttonMapping')}</Accordion.Control>
        <Accordion.Panel>
          <>
            <DropdownBox
              title="trigger_type.label"
              e={proto.AnalogToDigitalTriggerType}
              val={input.trigger!}
              label="trigger_type"
              dispatch={(trigger) => dispatch({ ...input, trigger })}
            />
            {input.trigger === proto.AnalogToDigitalTriggerType.JoyHigh && (
              <StateSlider
                mappingIdx={activationIdx}
                profileIdx={profileIdx}
                center={32767}
                min={input.triggerValue!}
                max={65535}
                deadzone={0}
                raw
                activationBased
              />
            )}
            {input.trigger === proto.AnalogToDigitalTriggerType.JoyLow && (
              <StateSlider
                mappingIdx={activationIdx}
                profileIdx={profileIdx}
                center={32767}
                min={0}
                max={input.triggerValue!}
                deadzone={0}
                raw
                activationBased
              />
            )}
            {input.trigger === proto.AnalogToDigitalTriggerType.Range && (
              <StateSlider
                mappingIdx={activationIdx}
                profileIdx={profileIdx}
                center={32767}
                min={input.triggerValue!}
                max={input.maxTriggerValue!}
                deadzone={0}
                raw
                activationBased
              />
            )}
            {(input.trigger === proto.AnalogToDigitalTriggerType.Range && (
              <Input.Label mb={3}>{t('trigger.min')}</Input.Label>
            )) || <Input.Label mb={3}>{t('trigger.trigger')}</Input.Label>}

            <Slider
              value={input.triggerValue!}
              min={0}
              max={65535}
              onChange={(val) => dispatch({ ...input, triggerValue: val })}
            />

            <NumberInput
              value={input.triggerValue!}
              min={0}
              max={65535}
              onChange={(e) => dispatch({ ...input, triggerValue: parseInt(e.toString(), 10) })}
            />
            <Button
              onClick={() => {
                dispatch({
                  ...input,
                  triggerValue:
                    useConfigStore.getState().activationStatus[profileIdx][listIdx][activationIdx]
                      .stateRaw,
                });
              }}
            >
              {t('pin_use_current')}
            </Button>
            {input.trigger === proto.AnalogToDigitalTriggerType.Range && (
              <>
                <Input.Label mb={3}>{t('trigger.max')}</Input.Label>
                <Slider
                  value={input.maxTriggerValue!}
                  min={0}
                  max={65535}
                  onChange={(val) => dispatch({ ...input, maxTriggerValue: val })}
                />
                <NumberInput
                  value={input.maxTriggerValue!}
                  min={0}
                  max={65535}
                  onChange={(e) =>
                    dispatch({ ...input, maxTriggerValue: parseInt(e.toString(), 10) })
                  }
                />

                <Button
                  onClick={() => {
                    dispatch({
                      ...input,
                      maxTriggerValue:
                        useConfigStore.getState().activationStatus[profileIdx][listIdx][
                          activationIdx
                        ].stateRaw,
                    });
                  }}
                >
                  {t('pin_use_current')}
                </Button>
              </>
            )}
          </>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
function AssignmentOption({ value }: { value: string }) {
  const { t } = useTranslation();
  return (
    <Stack gap="0">
      <Text fz="sm" fw={500}>
        {t(`assignmentType.${value}`)}
      </Text>
      <Text fz="xs" opacity={0.5}>
        {t(`assignmentTypeDesc.${value}`)}
      </Text>
    </Stack>
  );
}
export function SantrollerAssignment({
  mapping,
  profileIdx,
  listIdx,
  activationIdx,
  mode,
  type,
  legendMode,
  dispatch,
  deleteAssignment,
  copyAssignment,
}: {
  mapping: proto.IProfileAssignmentInfo;
  profileIdx: number;
  listIdx: number;
  activationIdx: number;
  mode: proto.FaceButtonMappingMode;
  type: proto.SubType;
  legendMode: LegendMode;
  dispatch: (mapping: proto.IProfileAssignmentInfo) => void;
  deleteAssignment: () => void;
  copyAssignment: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const assignmentTypeCombobox = useCombobox({
    onDropdownOpen: () =>
      assignmentTypeCombobox.updateSelectedOptionIndex('selected', { scrollIntoView: true }),
  });
  const label = t(
    `assignmentType.${AllProfileAssignmentTypes.filter(
      (x) => mapping[x] != null && mapping[x] !== undefined
    )}`
  );
  const base = useMemo(
    () => (
      <InputBase
        label={t('assignments.type')}
        component="button"
        type="button"
        pointer
        rightSection={<Combobox.Chevron />}
        rightSectionPointerEvents="none"
        onClick={() => assignmentTypeCombobox.toggleDropdown()}
      >
        {label || <Input.Placeholder>{t('pick_value')}</Input.Placeholder>}
      </InputBase>
    ),
    [label]
  );

  const analogInput =
    (mapping.input?.input && isAnalog(mapping.input?.input)) ||
    (mapping.inputAnyTime?.input && isAnalog(mapping.inputAnyTime?.input));
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('delete_assignment_dialog.title')} centered>
        {t('delete_assignment_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteAssignment();
                close();
              }}
              color="red"
            >
              {t('delete_assignment_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('delete_assignment_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" align="center" mb="xs">
          <Text size="sm" fw={600}>
            {label || t('pick_value')}
          </Text>
          <Group gap={4}>
            <ActionIcon variant="subtle" onClick={copyAssignment} title={t('common.copy')}>
              <IconCopy size={18} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" onClick={open} title={t('common.delete')}>
              <IconTrash size={18} />
            </ActionIcon>
          </Group>
        </Group>
        <Combobox
          store={assignmentTypeCombobox}
          onOptionSubmit={(val) => {
            switch (val as ProfileAssignmentTypes) {
              case 'bluetooth':
                dispatch({ bluetooth: proto.BluetoothMode.BTStandard });
                break;
              case 'ps2Emulation':
                dispatch({ ps2Emulation: {} });
                break;
              case 'wiiEmulation':
                dispatch({ wiiEmulation: {} });
                break;
              case 'joybusEmulation':
                dispatch({ joybusEmulation: {} });
                break;
              case 'snesEmulation':
                dispatch({ snesEmulation: {} });
                break;
              case 'consoleType':
                dispatch({
                  consoleType: { consoleType: null },
                });
                break;
              case 'wiiExt':
                dispatch({
                  wiiExt: proto.WiiExtType.WiiClassicController,
                });
                break;
              case 'ps2Cnt':
                dispatch({
                  ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeDigital,
                });
                break;
              case 'snesCnt':
                dispatch({ snesCnt: proto.SNESControllerType.SNESControllerSNES });
                break;
              case 'joybusCnt':
                dispatch({ joybusCnt: proto.JoybusControllerType.JoybusControllerGameCube });
                break;
              case 'usbType':
                dispatch({ usbType: proto.SubType.Gamepad });
                break;
              case 'usbDevice':
                dispatch({ usbDevice: { vid: 0, pid: 0, subtype: proto.SubType.Gamepad } });
                break;
              case 'bluetoothDevice':
                dispatch({ bluetoothDevice: { vid: 0, pid: 0, subtype: proto.SubType.Gamepad } });
                break;
              case 'bluetoothType':
                dispatch({ bluetoothType: proto.SubType.Gamepad });
                break;
              case 'input':
                dispatch({
                  input: { input: {} },
                });
                break;
              case 'inputAnyTime':
                dispatch({
                  inputAnyTime: { input: {} },
                });
                break;
              case 'midiChannel':
                dispatch({
                  midiChannel: 10,
                });
                break;
              case 'midiProGuitar':
                dispatch({ midiProGuitar: proto.SubType.ProGuitarSquier });
                break;
              case 'localInputs':
                dispatch({ localInputs: {} });
                break;
            }
            assignmentTypeCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              <Combobox.Group label={t('assignments.generic')}>
                {OtherAssignmentTypes.concat(LocalAssignmentTypes).map((item) => (
                  <Combobox.Option value={item} key={item} selected={!!mapping[item]}>
                    <AssignmentOption value={FixLabel(mode, type, item, legendMode)} />
                  </Combobox.Option>
                ))}
              </Combobox.Group>
              <Combobox.Group label={t('assignments.host')}>
                {HostProfileAssignmentTypes.map((item) => (
                  <Combobox.Option value={item} key={item} selected={!!mapping[item]}>
                    <AssignmentOption value={FixLabel(mode, type, item, legendMode)} />
                  </Combobox.Option>
                ))}
              </Combobox.Group>
              <Combobox.Group label={t('assignments.emulation')}>
                {DeviceProfileAssignmentTypes.map((item) => (
                  <Combobox.Option value={item} key={item} selected={!!mapping[item]}>
                    <AssignmentOption value={FixLabel(mode, type, item, legendMode)} />
                  </Combobox.Option>
                ))}
              </Combobox.Group>
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        {mapping.usbType && (
          <DropdownBox
            title="activation.usbType"
            e={USB_HOST_SUBTYPES_ENUM}
            val={mapping.usbType}
            label="subType"
            dispatch={(usbType) => dispatch({ usbType })}
          />
        )}
        {mapping.bluetoothType && (
          <DropdownBox
            title="activation.bluetoothType"
            e={USB_HOST_SUBTYPES_ENUM}
            val={mapping.bluetoothType}
            label="subType"
            dispatch={(bluetoothType) => dispatch({ bluetoothType })}
          />
        )}
        {mapping.midiChannel && (
          <NumberInput
            label={t('assignments.midiChannel')}
            value={mapping.midiChannel}
            min={1}
            max={17}
            onChange={(val) => dispatch({ midiChannel: parseInt(val.toString(), 10) ?? 1 })}
          />
        )}
        {mapping.midiProGuitar && (
          <DropdownBox
            title="activation.midiProGuitar"
            e={MIDI_PRO_GUITAR_SUBTYPES_ENUM}
            val={mapping.midiProGuitar}
            label="subType"
            dispatch={(midiProGuitar) => dispatch({ midiProGuitar })}
          />
        )}
        {mapping.consoleType && (
          <>
            <Space h="md" />
            <Switch
              label={t('assignments.specificConsole')}
              checked={!!mapping.consoleType.consoleType}
              onChange={(event) =>
                dispatch({
                  consoleType: {
                    ...mapping.consoleType,
                    consoleType: event.currentTarget.checked ? proto.ConsoleType.ConsolePC : null,
                  },
                })
              }
            />
            <Text fz="xs" opacity="0.7">
              {t('assignments.specificConsoleDesc')}
            </Text>
            <Space h="md" />
            {mapping.consoleType.consoleType && (
              <DropdownBox
                title="activation.consoleType"
                e={proto.ConsoleType}
                val={mapping.consoleType!.consoleType!}
                label="consoleType"
                dispatch={(consoleType) =>
                  dispatch({ consoleType: { ...mapping.consoleType, consoleType } })
                }
              />
            )}
            <Space h="md" />
            <Switch
              label={t('assignments.forcedType')}
              checked={!!mapping.consoleType.forcedType}
              onChange={(event) =>
                dispatch({
                  consoleType: {
                    ...mapping.consoleType,
                    forcedType: event.currentTarget.checked ? proto.ConsoleMode.ModeXbox360 : null,
                  },
                })
              }
            />
            <Text fz="xs" opacity="0.7">
              {t('assignments.forcedTypeDesc')}
            </Text>
            <Space h="md" />

            {mapping.consoleType.forcedType && (
              <DropdownBox
                title="activation.forcedType"
                e={proto.ConsoleMode}
                val={mapping.consoleType!.forcedType!}
                label="consoleMode"
                dispatch={(forcedType) =>
                  dispatch({ consoleType: { ...mapping.consoleType, forcedType } })
                }
              />
            )}
            {!mapping.consoleType.forcedType && (
              <>
                {!hidOnlySubtypes.includes(type) && (
                  <>
                    <Space h="md" />
                    <Input.Wrapper
                      label={t('main.xinput_on_windows.label')}
                      description={<XInputOnWindowsDescription />}
                    >
                      <SegmentedControl
                        fullWidth
                        data={[
                          { label: t('main.xinput_on_windows.XInput'), value: 'true' },
                          { label: t('main.xinput_on_windows.HID'), value: 'false' },
                        ]}
                        value={(mapping.consoleType.xinputOnWindows ?? true) ? 'true' : 'false'}
                        onChange={(val) =>
                          dispatch({
                            consoleType: {
                              ...mapping.consoleType,
                              xinputOnWindows: val === 'true',
                            },
                          })
                        }
                      />
                    </Input.Wrapper>
                  </>
                )}
                {ps4Subtypes.includes(type) && (
                  <>
                    <Space h="md" />
                    <Input.Wrapper
                      label={t('main.ps4EmulationMode.label')}
                      description={t('main.ps4EmulationMode.description')}
                    >
                      <SegmentedControl
                        fullWidth
                        data={[
                          { label: t('main.ps4EmulationMode.PS3'), value: 'false' },
                          { label: t('main.ps4EmulationMode.PS4'), value: 'true' },
                        ]}
                        value={(mapping.consoleType.ps4OrPs5Mode ?? false) ? 'true' : 'false'}
                        onChange={(val) =>
                          dispatch({
                            consoleType: {
                              ...mapping.consoleType,
                              ps4OrPs5Mode: val === 'true',
                            },
                          })
                        }
                      />
                    </Input.Wrapper>
                  </>
                )}
              </>
            )}
          </>
        )}

        {mapping.bluetooth && (
          <DropdownBox
            title="activation.bluetooth"
            e={proto.BluetoothMode}
            val={mapping.bluetooth}
            label="bluetooth"
            dispatch={(bluetooth) => dispatch({ bluetooth })}
          />
        )}
        {mapping.wiiExt && (
          <DropdownBox
            title="activation.wiiExt"
            e={proto.WiiExtType}
            val={mapping.wiiExt}
            label="wiiExt"
            dispatch={(wiiExt) => dispatch({ wiiExt })}
          />
        )}
        {mapping.ps2Cnt && (
          <DropdownBox
            title="activation.ps2Cnt"
            e={proto.PS2ControllerType}
            val={mapping.ps2Cnt}
            label="ps2Cnt"
            dispatch={(ps2Cnt) => dispatch({ ps2Cnt })}
          />
        )}
        {mapping.snesCnt && (
          <DropdownBox
            title="activation.snesCnt"
            e={SNES_CONTROLLER_TYPES_ENUM}
            val={mapping.snesCnt}
            label="snesCnt"
            dispatch={(snesCnt) => dispatch({ snesCnt })}
          />
        )}
        {mapping.joybusCnt && (
          <DropdownBox
            title="activation.joybusCnt"
            e={JOYBUS_CONTROLLER_TYPES_ENUM}
            val={mapping.joybusCnt}
            label="joybusCnt"
            dispatch={(joybusCnt) => dispatch({ joybusCnt })}
          />
        )}
        {mapping.usbDevice && (
          <>
            <TextInput
              label={t('assignments.vendorId')}
              leftSection="0x"
              accept="\w"
              value={mapping.usbDevice.vid.toString(16)}
              onChange={(event) =>
                dispatch({
                  usbDevice: {
                    ...mapping.usbDevice!,
                    vid: parseInt((event.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                  },
                })
              }
            />
            <TextInput
              label={t('assignments.productId')}
              leftSection="0x"
              accept="\w"
              value={mapping.usbDevice.pid.toString(16)}
              onChange={(event) =>
                dispatch({
                  usbDevice: {
                    ...mapping.usbDevice!,
                    pid: parseInt((event.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                  },
                })
              }
            />
            <DropdownBox
              title="activation.usbType"
              e={USB_HOST_SUBTYPES_ENUM}
              val={mapping.usbDevice.subtype ?? proto.SubType.Gamepad}
              label="subType"
              dispatch={(subtype) => dispatch({ usbDevice: { ...mapping.usbDevice!, subtype } })}
            />
          </>
        )}
        {mapping.bluetoothDevice && (
          <>
            <TextInput
              label={t('assignments.vendorId')}
              leftSection="0x"
              accept="\w"
              value={mapping.bluetoothDevice.vid.toString(16)}
              onChange={(event) =>
                dispatch({
                  bluetoothDevice: {
                    ...mapping.bluetoothDevice!,
                    vid: parseInt((event.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                  },
                })
              }
            />
            <TextInput
              label={t('assignments.productId')}
              leftSection="0x"
              accept="\w"
              value={mapping.bluetoothDevice.pid.toString(16)}
              onChange={(event) =>
                dispatch({
                  bluetoothDevice: {
                    ...mapping.bluetoothDevice!,
                    pid: parseInt((event.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                  },
                })
              }
            />
            <DropdownBox
              title="activation.bluetoothType"
              e={USB_HOST_SUBTYPES_ENUM}
              val={mapping.bluetoothDevice.subtype ?? proto.SubType.Gamepad}
              label="subType"
              dispatch={(subtype) =>
                dispatch({ bluetoothDevice: { ...mapping.bluetoothDevice!, subtype } })
              }
            />
          </>
        )}
        {mapping.inputAnyTime && (
          <>
            <SantrollerInput
              axis={false}
              button
              type={type}
              input={mapping.inputAnyTime.input}
              mode={mode}
              legendMode={legendMode}
              activationIdx={activationIdx}
              dispatch={(input) => dispatch({ ...mapping, inputAnyTime: { input } })}
            />
            {(analogInput && (
              <ActivationTrigger
                input={mapping.inputAnyTime}
                profileIdx={profileIdx}
                listIdx={listIdx}
                activationIdx={activationIdx}
                dispatch={(inputAnyTime) => dispatch({ ...mapping, inputAnyTime })}
              />
            )) || (
              <Switch
                label={t('calibration.inverted')}
                checked={!!mapping.inputAnyTime.inverted}
                onChange={(evt) =>
                  dispatch({
                    ...mapping,
                    inputAnyTime: { ...mapping.inputAnyTime!, inverted: evt.currentTarget.checked },
                  })
                }
              />
            )}
          </>
        )}
        {mapping.input && (
          <>
            <SantrollerInput
              axis={false}
              button
              type={type}
              activationIdx={activationIdx}
              mode={mode}
              legendMode={legendMode}
              input={mapping.input.input}
              dispatch={(input) => dispatch({ ...mapping, input: { input } })}
            />
            {(analogInput && (
              <ActivationTrigger
                input={mapping.input}
                profileIdx={profileIdx}
                listIdx={listIdx}
                activationIdx={activationIdx}
                dispatch={(input) => dispatch({ ...mapping, input })}
              />
            )) || (
              <Switch
                label={t('calibration.inverted')}
                checked={!!mapping.input.inverted}
                onChange={(evt) =>
                  dispatch({
                    ...mapping,
                    input: { ...mapping.input!, inverted: evt.currentTarget.checked },
                  })
                }
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}

type ConnectedSpecificDevice = { vid: number; pid: number; subtype: proto.SubType; name: string };

// Connected USB host / bluetooth devices, so a specific device can be picked instead of typing its VID / PID
function useConnectedSpecificDevices(kind: 'usb' | 'bt'): ConnectedSpecificDevice[] {
  // Selected as JSON, so this only re-renders when the list itself changes and not on every status
  // update from every device
  const json = useConfigStore((state) => {
    const found = new Map<string, ConnectedSpecificDevice>();
    for (const status of Object.values(state.deviceStatus)) {
      const events: (proto.IUsbDeviceHotplugEvent | proto.IBtDeviceHotplugEvent)[] =
        kind === 'usb'
          ? Object.values(status.usbDevices ?? {}).filter((x) => !x.bluetoothAdapter)
          : Object.values(status.btDevices ?? {});
      for (const event of events) {
        // Older firmware doesn't report the VID / PID
        if (
          event.vid === null ||
          event.vid === undefined ||
          event.pid === null ||
          event.pid === undefined
        ) {
          continue;
        }
        const key = `${event.vid}:${event.pid}:${event.subtype}`;
        if (!found.has(key)) {
          found.set(key, {
            vid: event.vid,
            pid: event.pid,
            subtype: event.subtype,
            name: event.name,
          });
        }
      }
    }
    return JSON.stringify([...found.values()]);
  });
  return useMemo(() => JSON.parse(json) as ConnectedSpecificDevice[], [json]);
}

function ConnectedDevicePicker({
  kind,
  current,
  onPick,
}: {
  kind: 'usb' | 'bt';
  current: proto.ISpecificUsbDevice | proto.ISpecificBluetoothDevice | null | undefined;
  onPick: (device: { vid: number; pid: number; subtype?: proto.SubType }) => void;
}) {
  const { t } = useTranslation();
  const devices = useConnectedSpecificDevices(kind);
  if (devices.length === 0) {
    return null;
  }
  const hex = (val: number) => val.toString(16).padStart(4, '0');
  const keyOf = (x: ConnectedSpecificDevice) => `${x.vid}:${x.pid}:${x.subtype}`;
  const selected = devices.find(
    (x) =>
      x.vid === current?.vid &&
      x.pid === current?.pid &&
      (current?.subtype === null || current?.subtype === undefined || current.subtype === x.subtype)
  );
  return (
    <Select
      size="xs"
      label={t('assignments.connected_device', 'Connected Device')}
      placeholder={t('assignments.connected_device_placeholder', 'Pick a connected device')}
      value={selected ? keyOf(selected) : null}
      data={devices.map((x) => {
        const subtypeName = proto.SubType[x.subtype];
        const type =
          x.subtype !== proto.SubType.Unknown && subtypeName !== undefined
            ? ` - ${t(`subType.${subtypeName}`, subtypeName)}`
            : '';
        return {
          value: keyOf(x),
          label: `${x.name || '-'}${type} (${hex(x.vid)}:${hex(x.pid)})`,
        };
      })}
      onChange={(val) => {
        const device = devices.find((x) => keyOf(x) === val);
        if (device) {
          onPick({
            vid: device.vid,
            pid: device.pid,
            subtype: device.subtype !== proto.SubType.Unknown ? device.subtype : undefined,
          });
        }
      }}
    />
  );
}

// What a newly added controller source starts as, by its ControllerSourcesEditor type
function defaultHostSource(sourceType: string): proto.IProfileAssignmentInfo | null {
  switch (sourceType) {
    case 'wiiExt':
      return { wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar };
    case 'ps2Cnt':
      return { ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeGuitar };
    case 'snesCnt':
      return { snesCnt: proto.SNESControllerType.SNESControllerSNES };
    case 'joybusCnt':
      return { joybusCnt: proto.JoybusControllerType.JoybusControllerGameCube };
    case 'usbType':
      return { usbType: proto.SubType.Gamepad };
    case 'usbDevice':
      return { usbDevice: { vid: 0, pid: 0, subtype: proto.SubType.Gamepad } };
    case 'bluetoothType':
      return { bluetoothType: proto.SubType.Gamepad };
    case 'bluetoothDevice':
      return { bluetoothDevice: { vid: 0, pid: 0, subtype: proto.SubType.Gamepad } };
    case 'midiChannel':
      return { midiChannel: 10 };
    case 'midiProGuitar':
      return { midiProGuitar: proto.SubType.ProGuitarSquier };
    default:
      return null;
  }
}

export function ControllerSourcesEditor({
  assignments,
  slotIds,
  onAddSource,
  onRemoveSource,
  onUpdateSource,
  hasUsbHost,
  hasBluetooth,
  hasMidi,
  hasWii,
  hasPsx,
  hasSnes,
  hasJoybus,
  showTitle = true,
  wrap = false,
}: {
  assignments: proto.IProfileAssignmentInfo[];
  // The slot id of each assignment
  slotIds: number[];
  onAddSource: (type: string) => void;
  onRemoveSource: (idx: number) => void;
  onUpdateSource: (idx: number, updated: proto.IProfileAssignmentInfo) => void;
  hasUsbHost: boolean;
  hasBluetooth: boolean;
  hasMidi: boolean;
  hasWii: boolean;
  hasPsx: boolean;
  hasSnes: boolean;
  hasJoybus: boolean;
  // Left out where the surrounding page labels the section itself, as the step number only fits a rule
  showTitle?: boolean;
  // Cards sit side by side and wrap, like the LEDs, where there's the width for it
  wrap?: boolean;
}) {
  const { t } = useTranslation();
  const hostIndices = useMemo(() => {
    return assignments
      .map((item, idx) => ({ item, idx, slotId: slotIds[idx], type: getHostSourceType(item) }))
      .filter(
        (
          x
        ): x is {
          item: proto.IProfileAssignmentInfo;
          idx: number;
          slotId: number;
          type: string;
        } => x.type !== null
      );
  }, [assignments, slotIds]);

  const showUsbHost =
    hasUsbHost || assignments.some((x) => x.usbType != null || x.usbDevice != null);
  const showBluetooth =
    hasBluetooth || assignments.some((x) => x.bluetoothType != null || x.bluetoothDevice != null);
  const showMidi =
    hasMidi || assignments.some((x) => x.midiChannel != null || x.midiProGuitar != null);
  const showWii = hasWii || assignments.some((x) => x.wiiExt != null);
  const showPsx = hasPsx || assignments.some((x) => x.ps2Cnt != null);
  const showSnes = hasSnes || assignments.some((x) => x.snesCnt != null);
  const showJoybus = hasJoybus || assignments.some((x) => x.joybusCnt != null);
  const hasAnySource =
    showUsbHost || showBluetooth || showMidi || showWii || showPsx || showSnes || showJoybus;

  const cards = hostIndices.map(({ item, idx, slotId, type: hType }) => (
    <Card
      key={idx}
      padding="xs"
      radius="sm"
      withBorder
      bg="var(--mantine-color-default-hover)"
      w={wrap ? 420 : undefined}
      maw="100%"
    >
      <Stack gap={4}>
        <Group justify="space-between" align="center">
          <Badge size="sm" variant="light" color="blue">
            {getProfileSlotLabel(item, slotId, t)}
          </Badge>
          <ActionIcon
            size="xs"
            variant="subtle"
            color="red"
            onClick={() => onRemoveSource(idx)}
            title={t('assignments.removeSource')}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>

        {hType === 'wiiExt' && (
          <DropdownBox
            title="activation.wiiExt"
            e={proto.WiiExtType}
            val={item.wiiExt ?? proto.WiiExtType.WiiGuitarHeroGuitar}
            label="wiiExt"
            dispatch={(wiiExt) => onUpdateSource(idx, { wiiExt })}
          />
        )}
        {hType === 'ps2Cnt' && (
          <DropdownBox
            title="activation.ps2Cnt"
            e={proto.PS2ControllerType}
            val={item.ps2Cnt ?? proto.PS2ControllerType.PS2ControllerTypeGuitar}
            label="ps2Cnt"
            dispatch={(ps2Cnt) => onUpdateSource(idx, { ps2Cnt })}
          />
        )}
        {hType === 'snesCnt' && (
          <DropdownBox
            title="activation.snesCnt"
            e={SNES_CONTROLLER_TYPES_ENUM}
            val={item.snesCnt ?? proto.SNESControllerType.SNESControllerSNES}
            label="snesCnt"
            dispatch={(snesCnt) => onUpdateSource(idx, { snesCnt })}
          />
        )}
        {hType === 'joybusCnt' && (
          <DropdownBox
            title="activation.joybusCnt"
            e={JOYBUS_CONTROLLER_TYPES_ENUM}
            val={item.joybusCnt ?? proto.JoybusControllerType.JoybusControllerGameCube}
            label="joybusCnt"
            dispatch={(joybusCnt) => onUpdateSource(idx, { joybusCnt })}
          />
        )}
        {hType === 'usbType' && (
          <DropdownBox
            title="activation.usbType"
            e={USB_HOST_SUBTYPES_ENUM}
            val={item.usbType ?? proto.SubType.Gamepad}
            label="subType"
            dispatch={(usbType) => onUpdateSource(idx, { usbType })}
          />
        )}
        {hType === 'usbDevice' && (
          <ConnectedDevicePicker
            kind="usb"
            current={item.usbDevice}
            onPick={({ vid, pid, subtype }) =>
              onUpdateSource(idx, {
                usbDevice: {
                  ...item.usbDevice,
                  vid,
                  pid,
                  subtype: subtype ?? item.usbDevice?.subtype,
                },
              })
            }
          />
        )}
        {hType === 'usbDevice' && (
          <Group grow>
            <TextInput
              size="xs"
              label={t('assignments.vendorId')}
              leftSection="0x"
              value={(item.usbDevice?.vid ?? 0).toString(16)}
              onChange={(e) =>
                onUpdateSource(idx, {
                  usbDevice: {
                    ...item.usbDevice,
                    vid: parseInt((e.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                    pid: item.usbDevice?.pid ?? 0,
                  },
                })
              }
            />
            <TextInput
              size="xs"
              label={t('assignments.productId')}
              leftSection="0x"
              value={(item.usbDevice?.pid ?? 0).toString(16)}
              onChange={(e) =>
                onUpdateSource(idx, {
                  usbDevice: {
                    ...item.usbDevice,
                    vid: item.usbDevice?.vid ?? 0,
                    pid: parseInt((e.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                  },
                })
              }
            />
          </Group>
        )}
        {hType === 'usbDevice' && (
          <DropdownBox
            title="activation.usbType"
            e={USB_HOST_SUBTYPES_ENUM}
            val={item.usbDevice?.subtype ?? proto.SubType.Gamepad}
            label="subType"
            dispatch={(subtype) =>
              onUpdateSource(idx, {
                usbDevice: { vid: 0, pid: 0, ...item.usbDevice, subtype },
              })
            }
          />
        )}
        {hType === 'bluetoothType' && (
          <DropdownBox
            title="activation.bluetoothType"
            e={USB_HOST_SUBTYPES_ENUM}
            val={item.bluetoothType ?? proto.SubType.Gamepad}
            label="subType"
            dispatch={(bluetoothType) => onUpdateSource(idx, { bluetoothType })}
          />
        )}
        {hType === 'bluetoothDevice' && (
          <ConnectedDevicePicker
            kind="bt"
            current={item.bluetoothDevice}
            onPick={({ vid, pid, subtype }) =>
              onUpdateSource(idx, {
                bluetoothDevice: {
                  ...item.bluetoothDevice,
                  vid,
                  pid,
                  subtype: subtype ?? item.bluetoothDevice?.subtype,
                },
              })
            }
          />
        )}
        {hType === 'bluetoothDevice' && (
          <Group grow>
            <TextInput
              size="xs"
              label={t('assignments.vendorId')}
              leftSection="0x"
              value={(item.bluetoothDevice?.vid ?? 0).toString(16)}
              onChange={(e) =>
                onUpdateSource(idx, {
                  bluetoothDevice: {
                    ...item.bluetoothDevice,
                    vid: parseInt((e.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                    pid: item.bluetoothDevice?.pid ?? 0,
                  },
                })
              }
            />
            <TextInput
              size="xs"
              label={t('assignments.productId')}
              leftSection="0x"
              value={(item.bluetoothDevice?.pid ?? 0).toString(16)}
              onChange={(e) =>
                onUpdateSource(idx, {
                  bluetoothDevice: {
                    ...item.bluetoothDevice,
                    vid: item.bluetoothDevice?.vid ?? 0,
                    pid: parseInt((e.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                  },
                })
              }
            />
          </Group>
        )}
        {hType === 'bluetoothDevice' && (
          <DropdownBox
            title="activation.bluetoothType"
            e={USB_HOST_SUBTYPES_ENUM}
            val={item.bluetoothDevice?.subtype ?? proto.SubType.Gamepad}
            label="subType"
            dispatch={(subtype) =>
              onUpdateSource(idx, {
                bluetoothDevice: { vid: 0, pid: 0, ...item.bluetoothDevice, subtype },
              })
            }
          />
        )}
        {hType === 'midiChannel' && (
          <NumberInput
            size="xs"
            label={t('assignments.midiChannel')}
            value={item.midiChannel ?? 10}
            min={1}
            max={16}
            onChange={(val) =>
              onUpdateSource(idx, {
                midiChannel: parseInt(val?.toString() ?? '1', 10) || 1,
              })
            }
          />
        )}
        {hType === 'midiProGuitar' && (
          <DropdownBox
            title="activation.midiProGuitar"
            e={MIDI_PRO_GUITAR_SUBTYPES_ENUM}
            val={item.midiProGuitar ?? proto.SubType.ProGuitarSquier}
            label="subType"
            dispatch={(midiProGuitar) => onUpdateSource(idx, { midiProGuitar })}
          />
        )}
      </Stack>
    </Card>
  ));

  return (
    <Stack gap="xs" align={wrap ? 'flex-start' : undefined}>
      {showTitle && (
        <Text size="xs" fw={500}>
          {t('assignments.step2_title')}
        </Text>
      )}

      {wrap ? (
        <Group align="flex-start" gap="xs">
          {cards}
        </Group>
      ) : (
        cards
      )}

      <Menu shadow="md" width={220}>
        <Menu.Target>
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />}>
            {hostIndices.length === 0
              ? t('assignments.add_source')
              : t('assignments.add_another_source')}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {!hasAnySource && (
            <Text size="xs" c="dimmed" px="sm" py={6}>
              {t(
                'assignments.no_source_devices',
                'No controller or adapter devices are set up yet. Add a USB Host, Bluetooth, MIDI, Wii or PS1/2 device on the Devices page and it will show up here.'
              )}
            </Text>
          )}
          {showUsbHost && (
            <>
              <Menu.Item onClick={() => onAddSource('usbType')}>
                {t('assignments.source.usbType')}
              </Menu.Item>
              <Menu.Item onClick={() => onAddSource('usbDevice')}>
                {t('assignments.source.usbDevice')}
              </Menu.Item>
            </>
          )}
          {showBluetooth && (
            <>
              <Menu.Item onClick={() => onAddSource('bluetoothType')}>
                {t('assignments.source.bluetoothType')}
              </Menu.Item>
              <Menu.Item onClick={() => onAddSource('bluetoothDevice')}>
                {t('assignments.source.bluetoothDevice')}
              </Menu.Item>
            </>
          )}
          {showMidi && (
            <>
              <Menu.Item onClick={() => onAddSource('midiChannel')}>
                {t('assignments.source.midiChannel')}
              </Menu.Item>
              <Menu.Item onClick={() => onAddSource('midiProGuitar')}>
                {t('assignments.source.midiProGuitar')}
              </Menu.Item>
            </>
          )}
          {showWii && (
            <Menu.Item onClick={() => onAddSource('wiiExt')}>
              {t('assignments.source.wiiExt')}
            </Menu.Item>
          )}
          {showPsx && (
            <Menu.Item onClick={() => onAddSource('ps2Cnt')}>
              {t('assignments.source.ps2Cnt')}
            </Menu.Item>
          )}
          {showSnes && (
            <Menu.Item onClick={() => onAddSource('snesCnt')}>
              {t('assignments.source.snesCnt')}
            </Menu.Item>
          )}
          {showJoybus && (
            <Menu.Item onClick={() => onAddSource('joybusCnt')}>
              {t('assignments.source.joybusCnt')}
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </Stack>
  );
}

function SantrollerAssignmentList({
  mapping,
  profileIdx,
  listIdx,
  mode,
  type,
  legendMode,
  dispatch,
  deleteAssignment,
  copyAssignment,
  expanded,
  onToggleExpanded,
  selected = false,
  onSelect,
  placeholder = false,
}: {
  mapping: proto.IProfileAssignment;
  profileIdx: number;
  listIdx: number;
  mode: proto.FaceButtonMappingMode;
  type: proto.SubType;
  legendMode: LegendMode;
  dispatch: (mapping: proto.IProfileAssignment) => void;
  deleteAssignment: () => void;
  copyAssignment: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  // Left out where cards can't be selected
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  // Faded, where a dragged group will land
  placeholder?: boolean;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [triggerOpened, { open: openTrigger, close: closeTrigger }] = useDisclosure(false);
  const [authTriggerOpened, { open: openAuthTrigger, close: closeAuthTrigger }] =
    useDisclosure(false);
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({
    id: listIdx,
  });
  const sortStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isSorting ? transition : '',
    opacity: placeholder ? 0.4 : undefined,
    maxWidth: '100%',
  };

  const assignments = useMemo(() => mapping.assignments ?? [], [mapping.assignments]);

  const emulationIdx = assignments.findIndex((x) =>
    DeviceProfileAssignmentTypes.some((y) => x[y] != null)
  );
  const emulationItem = emulationIdx !== -1 ? assignments[emulationIdx] : undefined;
  const profileForSlots = useConfigStore((state) => state.config.profiles?.[profileIdx]);
  // Slot ids can depend on the profile's other lists, so number this list as it is being edited
  // along with them
  const slotIds = useMemo(() => {
    if (!profileForSlots) {
      return getAssignmentSlotIds(assignments);
    }
    const lists = [...(profileForSlots.assignments ?? [])];
    lists[listIdx] = { ...lists[listIdx], assignments };
    return getProfileSlotIds({ ...profileForSlots, assignments: lists })[listIdx];
  }, [profileForSlots, assignments, listIdx]);

  const triggerIdx = assignments.findIndex((x) => OtherAssignmentTypes.some((y) => x[y] != null));
  const triggerItem = triggerIdx !== -1 ? assignments[triggerIdx] : undefined;
  const localInputsIdx = assignments.findIndex((x) => x.localInputs != null);

  const isActive = useConfigStore(
    (state) => state.activationListStatus[profileIdx]?.[listIdx]?.state ?? false
  );

  const deviceTypes = useDeviceTypes();
  const hasBluetooth = deviceTypes.includes('bt');
  const hasWiiEmu = deviceTypes.includes('wiiEmulation');
  const hasPsxEmu = deviceTypes.includes('psxEmulation');
  const hasJoybusEmu = deviceTypes.includes('joybusEmulation');
  const hasSnesEmu = deviceTypes.includes('snesEmulation');
  const hasWii = deviceTypes.includes('wii');
  const hasPsx = deviceTypes.includes('psx');
  const hasSnes = deviceTypes.includes('snes');
  const hasJoybus = deviceTypes.includes('joybus');
  const hasUsbHost = deviceTypes.includes('usbHost');
  const hasMidi = deviceTypes.some(
    (type) =>
      type === 'midiSerial' ||
      type === 'usbHost' ||
      type === 'wii' ||
      type === 'bhDrum' ||
      type === 'worldTourDrum'
  );

  // A rule has one output, so this replaces any others along with it
  const updateEmulation = (newEmul: proto.IProfileAssignmentInfo) => {
    dispatch({ ...mapping, assignments: retargetRule(assignments, newEmul) });
  };

  const addHostSource = (sourceType: string) => {
    const source = defaultHostSource(sourceType);
    if (source) {
      dispatch({ ...mapping, assignments: [...assignments, source] });
    }
  };

  const removeHostSource = (targetIdx: number) => {
    const next = assignments.filter((_, idx) => idx !== targetIdx);
    dispatch({ ...mapping, assignments: next });
  };

  const updateHostSource = (targetIdx: number, updated: proto.IProfileAssignmentInfo) => {
    const next = assignments.map((x, idx) => (idx === targetIdx ? updated : x));
    dispatch({ ...mapping, assignments: next });
  };

  const updateTrigger = (newTrigger: proto.IProfileAssignmentInfo | null) => {
    const next = [...assignments];
    if (triggerIdx !== -1) {
      if (newTrigger === null) {
        next.splice(triggerIdx, 1);
      } else {
        next[triggerIdx] = newTrigger;
      }
    } else if (newTrigger !== null) {
      next.push(newTrigger);
    }
    dispatch({ ...mapping, assignments: next });
  };

  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'usb_auto':
        dispatch({
          ...mapping,
          assignments: [
            {
              consoleType: {
                consoleType: null,
                forcedType: null,
                xinputOnWindows: true,
                ps4OrPs5Mode: false,
              },
            },
          ],
        });
        break;
      case 'usb_xbox':
        dispatch({
          ...mapping,
          assignments: [
            { consoleType: { consoleType: null, forcedType: proto.ConsoleMode.ModeXbox360 } },
          ],
        });
        break;
      case 'usb_ps3':
        dispatch({
          ...mapping,
          assignments: [
            { consoleType: { consoleType: null, forcedType: proto.ConsoleMode.ModePs3 } },
          ],
        });
        break;
      case 'usb_ps4':
        dispatch({
          ...mapping,
          assignments: [
            { consoleType: { consoleType: null, forcedType: proto.ConsoleMode.ModePs4 } },
          ],
        });
        break;
      case 'bluetooth':
        dispatch({
          ...mapping,
          assignments: [{ bluetooth: proto.BluetoothMode.BTStandard }],
        });
        break;
      case 'wii_adapter':
        dispatch({
          ...mapping,
          assignments: [
            {
              consoleType: {
                consoleType: null,
                forcedType: null,
                xinputOnWindows: true,
                ps4OrPs5Mode: false,
              },
            },
            { wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar },
          ],
        });
        break;
      case 'ps2_adapter':
        dispatch({
          ...mapping,
          assignments: [
            {
              consoleType: {
                consoleType: null,
                forcedType: null,
                xinputOnWindows: true,
                ps4OrPs5Mode: false,
              },
            },
            { ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeGuitar },
          ],
        });
        break;
      case 'boot_switch':
        dispatch({
          ...mapping,
          assignments: [
            {
              consoleType: {
                consoleType: null,
                forcedType: null,
                xinputOnWindows: true,
                ps4OrPs5Mode: false,
              },
            },
            { input: { input: {} } },
          ],
        });
        break;
    }
  };

  const currentEmulMode: EmulationMode =
    emulationItem?.bluetooth != null
      ? 'bluetooth'
      : emulationItem?.ps2Emulation != null
        ? 'ps2Emulation'
        : emulationItem?.wiiEmulation != null
          ? 'wiiEmulation'
          : emulationItem?.joybusEmulation != null
            ? 'joybusEmulation'
            : emulationItem?.snesEmulation != null
              ? 'snesEmulation'
              : 'consoleType';

  const currentUsbOption: 'auto' | 'forced' | 'specific' =
    emulationItem?.consoleType?.forcedType != null
      ? 'forced'
      : emulationItem?.consoleType?.consoleType != null
        ? 'specific'
        : 'auto';

  const xboxOneLegacyAdapter = useConfigStore((state) => !!state.config.xboxOneLegacyAdapter);
  const xboxOneAuthIdx = assignments.findIndex((x) => x.xboxOneAuth != null);
  const xboxOneAuth = xboxOneAuthIdx !== -1 ? assignments[xboxOneAuthIdx].xboxOneAuth : undefined;
  // Holding auth is only useful on a rule that can end up as an Xbox One device, and not when WLA emulation is active
  const canHoldXboxOneAuth =
    !xboxOneLegacyAdapter &&
    currentEmulMode === 'consoleType' &&
    hasUsbHost &&
    (currentUsbOption === 'auto' ||
      emulationItem?.consoleType?.forcedType === proto.ConsoleMode.ModeXboxOne ||
      emulationItem?.consoleType?.consoleType === proto.ConsoleType.ConsoleXboxOne);
  const updateXboxOneAuth = (value: proto.IXboxOneAuthAssignment | null) => {
    if (value && xboxOneAuthIdx !== -1) {
      const next = assignments.map((x, idx) =>
        idx === xboxOneAuthIdx ? { xboxOneAuth: value } : x
      );
      dispatch({ ...mapping, assignments: next });
      return;
    }
    const rest = assignments.filter((_, idx) => idx !== xboxOneAuthIdx);
    dispatch({ ...mapping, assignments: value ? [...rest, { xboxOneAuth: value }] : rest });
  };
  const xboxOneAuthTrigger = xboxOneAuth?.trigger ?? undefined;
  const xboxOneAuthInputSet = getSelectedInput(xboxOneAuthTrigger?.input) !== undefined;
  const updateXboxOneAuthTrigger = (trigger: proto.IInputActivationTrigger) =>
    updateXboxOneAuth({ ...xboxOneAuth, trigger });

  const currentTrigger =
    triggerItem?.input != null
      ? 'input'
      : triggerItem?.inputAnyTime != null
        ? 'inputAnyTime'
        : 'always';

  const targetOptions = [
    { label: t('assignments.emulation_mode.usb'), value: 'consoleType' },
    ...(hasBluetooth
      ? [{ label: t('assignments.emulation_mode.bluetooth'), value: 'bluetooth' }]
      : []),
    ...(hasPsxEmu ? [{ label: t('assignments.emulation_mode.ps2'), value: 'ps2Emulation' }] : []),
    ...(hasWiiEmu ? [{ label: t('assignments.emulation_mode.wii'), value: 'wiiEmulation' }] : []),
    ...(hasJoybusEmu
      ? [{ label: t('assignments.emulation_mode.joybus'), value: 'joybusEmulation' }]
      : []),
    ...(hasSnesEmu
      ? [{ label: t('assignments.emulation_mode.snes'), value: 'snesEmulation' }]
      : []),
  ];

  const summaryParts = useMemo(() => getRuleSummaryParts(assignments, t), [assignments, t]);

  const hasEmulation = emulationItem !== undefined;
  // A rule with no target can never match, so keep its editor open until that is fixed
  const showEditor = expanded || !hasEmulation;
  const triggerInput =
    currentTrigger === 'input' ? triggerItem?.input?.input : triggerItem?.inputAnyTime?.input;
  const triggerSet = getSelectedInput(triggerInput) !== undefined;
  const triggerAnalog =
    (triggerItem?.input?.input && isAnalog(triggerItem.input.input)) ||
    (triggerItem?.inputAnyTime?.input && isAnalog(triggerItem.inputAnyTime.input));

  return (
    <>
      <Modal opened={opened} onClose={close} title={t('delete_assignment_dialog.title')} centered>
        {t('delete_assignment_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteAssignment();
                close();
              }}
              color="red"
            >
              {t('delete_assignment_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('delete_assignment_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <div ref={setNodeRef} style={sortStyle} {...attributes}>
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          w="420px"
          maw="100%"
          style={selected ? { ...OFFSCREEN_RULE_CARD, ...selectedCardStyle } : OFFSCREEN_RULE_CARD}
        >
          <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
            <Group gap="xs">
              {onSelect && (
                <div
                  {...listeners}
                  style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}
                >
                  <IconGripVertical size={18} stroke={1.5} />
                </div>
              )}
              <Title order={4} style={{ cursor: 'pointer' }} onClick={onToggleExpanded}>
                {t('assignments.rule_title', { num: listIdx + 1 })}
              </Title>
              <Badge color={isActive ? 'blue' : 'gray'}>
                {isActive ? t('state.active') : t('state.inactive')}
              </Badge>
            </Group>
            <Group gap={4}>
              <Menu shadow="md" width={220}>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="blue" title={t('assignments.presets_title')}>
                    <IconSparkles size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{t('assignments.presets_title')}</Menu.Label>
                  <Menu.Item
                    leftSection={<IconUsb size={14} />}
                    onClick={() => applyPreset('usb_auto')}
                  >
                    {t('assignments.preset_usb_auto')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDeviceGamepad size={14} />}
                    onClick={() => applyPreset('usb_xbox')}
                  >
                    {t('assignments.preset_usb_xbox')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDeviceGamepad size={14} />}
                    onClick={() => applyPreset('usb_ps3')}
                  >
                    {t('assignments.preset_usb_ps3')}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDeviceGamepad size={14} />}
                    onClick={() => applyPreset('usb_ps4')}
                  >
                    {t('assignments.preset_usb_ps4')}
                  </Menu.Item>
                  {hasBluetooth && (
                    <Menu.Item
                      leftSection={<IconBluetooth size={14} />}
                      onClick={() => applyPreset('bluetooth')}
                    >
                      {t('assignments.preset_bluetooth')}
                    </Menu.Item>
                  )}
                  {hasWii && (
                    <Menu.Item
                      leftSection={<IconSparkles size={14} />}
                      onClick={() => applyPreset('wii_adapter')}
                    >
                      {t('assignments.preset_wii_adapter')}
                    </Menu.Item>
                  )}
                  {hasPsx && (
                    <Menu.Item
                      leftSection={<IconSparkles size={14} />}
                      onClick={() => applyPreset('ps2_adapter')}
                    >
                      {t('assignments.preset_ps2_adapter')}
                    </Menu.Item>
                  )}
                  <Menu.Item
                    leftSection={<IconSparkles size={14} />}
                    onClick={() => applyPreset('boot_switch')}
                  >
                    {t('assignments.preset_boot_switch')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              {onSelect && (
                <SelectToggle variant="subtle" selected={selected} onSelect={onSelect} />
              )}
              <ActionIcon variant="subtle" onClick={copyAssignment} title={t('common.copy')}>
                <IconCopy size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="red" onClick={open} title={t('common.delete')}>
                <IconTrash size={18} />
              </ActionIcon>
              {hasEmulation && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={onToggleExpanded}
                  title={showEditor ? t('assignments.collapse') : t('assignments.expand')}
                >
                  <IconChevronDown
                    size={18}
                    style={{
                      transform: showEditor ? 'rotate(180deg)' : undefined,
                      transition: 'transform 150ms ease',
                    }}
                  />
                </ActionIcon>
              )}
            </Group>
          </Group>

          <Card
            padding="xs"
            radius="sm"
            withBorder
            mb={showEditor ? 'sm' : 0}
            bg="var(--mantine-color-default-hover)"
            style={showEditor ? undefined : { cursor: 'pointer' }}
            onClick={showEditor ? undefined : onToggleExpanded}
          >
            <Group gap={6} wrap="wrap">
              <Text size="xs" fw={500} c="dimmed">
                {t('assignments.rule_summary_prefix')}:
              </Text>
              {summaryParts.map((part, idx) => (
                <Badge
                  key={idx}
                  variant="light"
                  color={hasEmulation ? 'teal' : 'red'}
                  size="sm"
                  maw="100%"
                >
                  {part}
                </Badge>
              ))}
            </Group>
          </Card>

          {!showEditor && (
            <Button
              size="xs"
              variant="light"
              fullWidth
              mt="xs"
              leftSection={<IconPencil size={14} />}
              rightSection={<IconChevronDown size={14} />}
              onClick={onToggleExpanded}
            >
              {t('assignments.expand')}
            </Button>
          )}

          {showEditor && !hasEmulation && (
            <Alert
              variant="light"
              color="red"
              title={t('assignments.missingEmulation')}
              icon={<IconExclamationCircle size={16} />}
              mb="xs"
            >
              <Text size="xs">{t('assignments.missingDevice')}</Text>
              <Button
                size="xs"
                variant="outline"
                color="red"
                mt="xs"
                onClick={() =>
                  updateEmulation({
                    consoleType: {
                      consoleType: null,
                      forcedType: null,
                      xinputOnWindows: true,
                      ps4OrPs5Mode: false,
                    },
                  })
                }
              >
                {t('assignments.set_default_usb')}
              </Button>
            </Alert>
          )}

          {showEditor && (
            <Stack gap="sm">
              <Stack gap={4}>
                <Input.Wrapper size="xs" label={t('assignments.step1_title')}>
                  <SegmentedControl
                    fullWidth
                    size="xs"
                    value={currentEmulMode}
                    onChange={(val) => {
                      switch (val) {
                        case 'consoleType':
                          updateEmulation({
                            consoleType: {
                              consoleType: null,
                              forcedType: null,
                              xinputOnWindows: emulationItem?.consoleType?.xinputOnWindows ?? true,
                              ps4OrPs5Mode: emulationItem?.consoleType?.ps4OrPs5Mode ?? false,
                            },
                          });
                          break;
                        case 'bluetooth':
                          updateEmulation({ bluetooth: proto.BluetoothMode.BTStandard });
                          break;
                        case 'ps2Emulation':
                          updateEmulation({ ps2Emulation: {} });
                          break;
                        case 'wiiEmulation':
                          updateEmulation({ wiiEmulation: {} });
                          break;
                        case 'joybusEmulation':
                          updateEmulation({ joybusEmulation: {} });
                          break;
                        case 'snesEmulation':
                          updateEmulation({ snesEmulation: {} });
                          break;
                      }
                    }}
                    data={targetOptions}
                  />
                </Input.Wrapper>
                {currentEmulMode === 'consoleType' && (
                  <Stack gap={4} mt="xs">
                    <Select
                      size="xs"
                      label={t('assignments.usb_mode.label')}
                      value={currentUsbOption}
                      onChange={(val) => {
                        const prevConsole = emulationItem?.consoleType;
                        switch (val) {
                          case 'auto':
                            updateEmulation({
                              consoleType: {
                                consoleType: null,
                                forcedType: null,
                                xinputOnWindows: prevConsole?.xinputOnWindows ?? true,
                                ps4OrPs5Mode: prevConsole?.ps4OrPs5Mode ?? false,
                              },
                            });
                            break;
                          case 'forced':
                            updateEmulation({
                              consoleType: {
                                consoleType: null,
                                forcedType: proto.ConsoleMode.ModeXbox360,
                                xinputOnWindows: prevConsole?.xinputOnWindows ?? true,
                                ps4OrPs5Mode: prevConsole?.ps4OrPs5Mode ?? false,
                              },
                            });
                            break;
                          case 'specific':
                            updateEmulation({
                              consoleType: {
                                consoleType: proto.ConsoleType.ConsolePC,
                                forcedType: null,
                                xinputOnWindows: prevConsole?.xinputOnWindows ?? true,
                                ps4OrPs5Mode: prevConsole?.ps4OrPs5Mode ?? false,
                              },
                            });
                            break;
                        }
                      }}
                      data={[
                        { value: 'auto', label: t('assignments.usb_mode.auto') },
                        { value: 'forced', label: t('assignments.usb_mode.forced') },
                        { value: 'specific', label: t('assignments.usb_mode.specific') },
                      ]}
                    />
                    {currentUsbOption === 'forced' && (
                      <DropdownBox
                        title="activation.forcedType"
                        e={proto.ConsoleMode}
                        val={
                          emulationItem?.consoleType?.forcedType ?? proto.ConsoleMode.ModeXbox360
                        }
                        label="consoleMode"
                        dispatch={(forcedType) =>
                          updateEmulation({
                            consoleType: {
                              ...emulationItem?.consoleType,
                              consoleType: null,
                              forcedType,
                            },
                          })
                        }
                      />
                    )}
                    {currentUsbOption === 'specific' && (
                      <DropdownBox
                        title="activation.consoleType"
                        e={proto.ConsoleType}
                        val={emulationItem?.consoleType?.consoleType ?? proto.ConsoleType.ConsolePC}
                        label="consoleType"
                        dispatch={(consoleType) =>
                          updateEmulation({
                            consoleType: {
                              ...emulationItem?.consoleType,
                              consoleType,
                              forcedType: null,
                            },
                          })
                        }
                      />
                    )}
                    {currentUsbOption === 'auto' && (
                      <>
                        {!hidOnlySubtypes.includes(type) && (
                          <Input.Wrapper
                            size="xs"
                            label={t('main.xinput_on_windows.label')}
                            description={<XInputOnWindowsDescription />}
                          >
                            <SegmentedControl
                              fullWidth
                              size="xs"
                              data={[
                                { label: t('main.xinput_on_windows.XInput'), value: 'true' },
                                { label: t('main.xinput_on_windows.HID'), value: 'false' },
                              ]}
                              value={
                                (emulationItem?.consoleType?.xinputOnWindows ?? true)
                                  ? 'true'
                                  : 'false'
                              }
                              onChange={(val) =>
                                updateEmulation({
                                  consoleType: {
                                    ...emulationItem?.consoleType,
                                    consoleType: null,
                                    forcedType: null,
                                    xinputOnWindows: val === 'true',
                                  },
                                })
                              }
                            />
                          </Input.Wrapper>
                        )}
                        {ps4Subtypes.includes(type) && (
                          <Input.Wrapper
                            size="xs"
                            label={t('main.ps4EmulationMode.label')}
                            description={t('main.ps4EmulationMode.description')}
                          >
                            <SegmentedControl
                              fullWidth
                              size="xs"
                              data={[
                                { label: t('main.ps4EmulationMode.PS3'), value: 'false' },
                                { label: t('main.ps4EmulationMode.PS4'), value: 'true' },
                              ]}
                              value={
                                (emulationItem?.consoleType?.ps4OrPs5Mode ?? false)
                                  ? 'true'
                                  : 'false'
                              }
                              onChange={(val) =>
                                updateEmulation({
                                  consoleType: {
                                    ...emulationItem?.consoleType,
                                    consoleType: null,
                                    forcedType: null,
                                    ps4OrPs5Mode: val === 'true',
                                  },
                                })
                              }
                            />
                          </Input.Wrapper>
                        )}
                      </>
                    )}
                  </Stack>
                )}
                {currentEmulMode === 'bluetooth' && (
                  <DropdownBox
                    title="activation.bluetooth"
                    e={proto.BluetoothMode}
                    val={emulationItem?.bluetooth ?? proto.BluetoothMode.BTStandard}
                    label="bluetooth"
                    dispatch={(bluetooth) => updateEmulation({ bluetooth })}
                  />
                )}
              </Stack>

              <Divider my={2} />

              <ControllerSourcesEditor
                assignments={assignments}
                slotIds={slotIds}
                onAddSource={addHostSource}
                onRemoveSource={removeHostSource}
                onUpdateSource={updateHostSource}
                hasUsbHost={hasUsbHost}
                hasBluetooth={hasBluetooth}
                hasMidi={hasMidi}
                hasWii={hasWii}
                hasPsx={hasPsx}
                hasSnes={hasSnes}
                hasJoybus={hasJoybus}
              />

              <Switch
                size="xs"
                label={t('assignments.localInputs')}
                description={t('assignments.localInputsDesc')}
                checked={localInputsIdx !== -1}
                onChange={(evt) =>
                  dispatch({
                    ...mapping,
                    assignments: evt.currentTarget.checked
                      ? [...assignments, { localInputs: {} }]
                      : assignments.filter((_, idx) => idx !== localInputsIdx),
                  })
                }
              />

              {!xboxOneLegacyAdapter && (canHoldXboxOneAuth || xboxOneAuth) && (
                <Stack gap={4}>
                  <Switch
                    size="xs"
                    label={t('assignments.xboxOneAuth')}
                    description={t('assignments.xboxOneAuthDesc')}
                    checked={xboxOneAuth != null}
                    onChange={(evt) => updateXboxOneAuth(evt.currentTarget.checked ? {} : null)}
                  />
                  {xboxOneAuth && (
                    <Stack gap={2} ml="lg">
                      <Text size="xs" c="dimmed">
                        {t('assignments.xboxOneAuthInputDesc')}
                      </Text>
                      <Group gap="xs" grow>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconPencil size={14} />}
                          onClick={openAuthTrigger}
                        >
                          {xboxOneAuthInputSet
                            ? t('assignments.trigger_edit')
                            : t('assignments.xboxOneAuthInputPick')}
                        </Button>
                        {xboxOneAuthInputSet && (
                          <Button
                            size="xs"
                            variant="light"
                            color="gray"
                            onClick={() => updateXboxOneAuth({ ...xboxOneAuth, trigger: null })}
                          >
                            {t('assignments.xboxOneAuthInputClear')}
                          </Button>
                        )}
                      </Group>
                    </Stack>
                  )}
                </Stack>
              )}

              <Divider my={2} />

              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  {t('assignments.step3_title')}
                </Text>
                <Select
                  size="xs"
                  value={currentTrigger}
                  onChange={(val) => {
                    switch (val) {
                      case 'always':
                        updateTrigger(null);
                        break;
                      case 'input':
                        updateTrigger({ input: { input: {} } });
                        break;
                      case 'inputAnyTime':
                        updateTrigger({ inputAnyTime: { input: {} } });
                        break;
                    }
                  }}
                  data={[
                    { value: 'always', label: t('assignments.trigger.always') },
                    { value: 'input', label: t('assignments.trigger.boot') },
                    { value: 'inputAnyTime', label: t('assignments.trigger.anytime') },
                  ]}
                />
                {currentTrigger !== 'always' && (
                  <Button
                    size="xs"
                    variant="light"
                    color={triggerSet ? 'blue' : 'red'}
                    leftSection={<IconPencil size={14} />}
                    onClick={openTrigger}
                  >
                    {triggerSet ? t('assignments.trigger_edit') : t('assignments.trigger_pick')}
                  </Button>
                )}
              </Stack>
              {hasEmulation && (
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  fullWidth
                  rightSection={
                    <IconChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                  }
                  onClick={onToggleExpanded}
                >
                  {t('assignments.collapse')}
                </Button>
              )}
            </Stack>
          )}
        </Card>
      </div>
      <Modal
        opened={authTriggerOpened && xboxOneAuth != null && !xboxOneLegacyAdapter}
        onClose={closeAuthTrigger}
        size="lg"
        title={`${t('assignments.rule_title', { num: listIdx + 1 })}: ${t('assignments.xboxOneAuth')}`}
      >
        <Stack gap={4}>
          <SantrollerInput
            axis={false}
            button
            type={type}
            activationIdx={xboxOneAuthIdx !== -1 ? xboxOneAuthIdx : 0}
            mode={mode}
            legendMode={legendMode}
            input={xboxOneAuthTrigger?.input ?? {}}
            dispatch={(input) => updateXboxOneAuthTrigger({ ...(xboxOneAuthTrigger ?? {}), input })}
          />
          {xboxOneAuthTrigger?.input && isAnalog(xboxOneAuthTrigger.input) ? (
            <ActivationTrigger
              input={xboxOneAuthTrigger}
              profileIdx={profileIdx}
              listIdx={listIdx}
              activationIdx={xboxOneAuthIdx !== -1 ? xboxOneAuthIdx : 0}
              dispatch={updateXboxOneAuthTrigger}
            />
          ) : (
            <Switch
              size="xs"
              label={t('calibration.inverted')}
              checked={!!xboxOneAuthTrigger?.inverted}
              onChange={(evt) =>
                updateXboxOneAuthTrigger({
                  ...(xboxOneAuthTrigger ?? {}),
                  input: xboxOneAuthTrigger?.input ?? {},
                  inverted: evt.currentTarget.checked,
                })
              }
            />
          )}
        </Stack>
      </Modal>
      <Modal
        opened={triggerOpened && currentTrigger !== 'always'}
        onClose={closeTrigger}
        size="lg"
        title={`${t('assignments.rule_title', { num: listIdx + 1 })}: ${t(`assignments.trigger.${currentTrigger === 'input' ? 'boot' : 'anytime'}`)}`}
      >
        {currentTrigger === 'input' && (
          <Stack gap={4}>
            <SantrollerInput
              axis={false}
              button
              type={type}
              activationIdx={triggerIdx !== -1 ? triggerIdx : 0}
              mode={mode}
              legendMode={legendMode}
              input={triggerItem?.input?.input ?? {}}
              dispatch={(input) =>
                updateTrigger({ input: { ...(triggerItem?.input ?? {}), input } })
              }
            />
            {triggerAnalog ? (
              <ActivationTrigger
                input={triggerItem?.input ?? { input: {} }}
                profileIdx={profileIdx}
                listIdx={listIdx}
                activationIdx={triggerIdx !== -1 ? triggerIdx : 0}
                dispatch={(input) => updateTrigger({ input })}
              />
            ) : (
              <Switch
                size="xs"
                label={t('calibration.inverted')}
                checked={!!triggerItem?.input?.inverted}
                onChange={(evt) =>
                  updateTrigger({
                    input: {
                      ...(triggerItem?.input ?? {}),
                      input: triggerItem?.input?.input ?? {},
                      inverted: evt.currentTarget.checked,
                    },
                  })
                }
              />
            )}
          </Stack>
        )}
        {currentTrigger === 'inputAnyTime' && (
          <Stack gap={4}>
            <SantrollerInput
              axis={false}
              button
              type={type}
              activationIdx={triggerIdx !== -1 ? triggerIdx : 0}
              mode={mode}
              legendMode={legendMode}
              input={triggerItem?.inputAnyTime?.input ?? {}}
              dispatch={(input) =>
                updateTrigger({
                  inputAnyTime: { ...(triggerItem?.inputAnyTime ?? {}), input },
                })
              }
            />
            {triggerAnalog ? (
              <ActivationTrigger
                input={triggerItem?.inputAnyTime ?? { input: {} }}
                profileIdx={profileIdx}
                listIdx={listIdx}
                activationIdx={triggerIdx !== -1 ? triggerIdx : 0}
                dispatch={(inputAnyTime) => updateTrigger({ inputAnyTime })}
              />
            ) : (
              <Switch
                size="xs"
                label={t('calibration.inverted')}
                checked={!!triggerItem?.inputAnyTime?.inverted}
                onChange={(evt) =>
                  updateTrigger({
                    inputAnyTime: {
                      ...(triggerItem?.inputAnyTime ?? {}),
                      input: triggerItem?.inputAnyTime?.input ?? {},
                      inverted: evt.currentTarget.checked,
                    },
                  })
                }
              />
            )}
          </Stack>
        )}
      </Modal>
    </>
  );
}

export function InputsTab({ value, idx }: { value: string; idx: number }) {
  return (
    <Tabs.Tab value={idx.toString()}>
      <Text>{value}</Text>
    </Tabs.Tab>
  );
}
function FaceButtonMappingMode({
  mode,
  dispatch,
}: {
  mode: proto.FaceButtonMappingMode;
  dispatch: (device: proto.FaceButtonMappingMode) => void;
}) {
  const { t } = useTranslation();
  const data = [
    {
      label: t('face_button_mapping_mode.legend_based'),
      value: proto.FaceButtonMappingMode.LegendBased.toString(),
    },
    {
      label: t('face_button_mapping_mode.position_based'),
      value: proto.FaceButtonMappingMode.PositionBased.toString(),
    },
  ];
  return (
    <Input.Wrapper
      label={t('face_button_mapping_mode.label')}
      description={t('face_button_mapping_mode.description')}
    >
      <SegmentedControl
        fullWidth
        data={data}
        value={mode.toString()}
        onChange={(val) => dispatch(Number(val))}
      />
    </Input.Wrapper>
  );
}
enum LegendMode {
  Xbox360 = 1,
  XboxOne = 2,
  Nintendo = 3,
  PlayStation = 4,
}

function readStoredLegendMode(): LegendMode {
  const stored = localStorage.getItem('legendMode');
  const mode = stored ? LegendMode[stored as keyof typeof LegendMode] : undefined;
  return typeof mode === 'number' ? mode : LegendMode.Xbox360;
}

function BlankProfileWizard({
  profile,
  profileIdx,
  onSkip,
  updateProfile,
}: {
  profile: proto.IProfile;
  profileIdx: number;
  onSkip: () => void;
  updateProfile: (profile: proto.IProfile, index: number) => void;
}) {
  const { t } = useTranslation();
  const deviceTypes = useDeviceTypes();

  const hasBluetooth = deviceTypes.includes('bt');
  const hasWiiEmu = deviceTypes.includes('wiiEmulation');
  const hasPsxEmu = deviceTypes.includes('psxEmulation');
  const hasJoybusEmu = deviceTypes.includes('joybusEmulation');
  const hasSnesEmu = deviceTypes.includes('snesEmulation');
  const hasWii = deviceTypes.includes('wii');
  const hasPsx = deviceTypes.includes('psx');
  const hasSnes = deviceTypes.includes('snes');
  const hasJoybus = deviceTypes.includes('joybus');
  const hasUsbHost = deviceTypes.includes('usbHost');
  const hasMidi = deviceTypes.some(
    (type) =>
      type === 'midiSerial' ||
      type === 'usbHost' ||
      type === 'wii' ||
      type === 'bhDrum' ||
      type === 'worldTourDrum'
  );

  const initialRule = profile.assignments?.[0]?.assignments ?? [];
  const initialEmul = initialRule.find((x) =>
    DeviceProfileAssignmentTypes.some((y) => x[y] != null)
  );
  const initialHost = initialRule.filter((x) => getHostSourceType(x) !== null);
  const initialTrigger = initialRule.find((x) => OtherAssignmentTypes.some((y) => x[y] != null));

  const [name, setName] = useState<string>(profile.opts?.name ?? 'Device');
  const [deviceToEmulate, setDeviceToEmulate] = useState<proto.SubType>(
    profile.opts?.deviceToEmulate ?? proto.SubType.Gamepad
  );
  const [defaultPreset, setDefaultPreset] = useState('');
  const presets = presetsFor(deviceToEmulate);
  const preset = presets.find((p) => p.id === defaultPreset);

  // Step 1: Target Connection
  const [currentEmulMode, setCurrentEmulMode] = useState<EmulationMode>(
    initialEmul?.bluetooth != null
      ? 'bluetooth'
      : initialEmul?.ps2Emulation != null
        ? 'ps2Emulation'
        : initialEmul?.wiiEmulation != null
          ? 'wiiEmulation'
          : initialEmul?.joybusEmulation != null
            ? 'joybusEmulation'
            : initialEmul?.snesEmulation != null
              ? 'snesEmulation'
              : 'consoleType'
  );
  const [usbMode, setUsbMode] = useState<'auto' | 'forced' | 'specific'>(
    initialEmul?.consoleType?.forcedType != null
      ? 'forced'
      : initialEmul?.consoleType?.consoleType != null
        ? 'specific'
        : 'auto'
  );
  const [forcedConsole, setForcedConsole] = useState<proto.ConsoleMode>(
    initialEmul?.consoleType?.forcedType ?? proto.ConsoleMode.ModeXbox360
  );
  const [specificConsole, setSpecificConsole] = useState<proto.ConsoleType>(
    initialEmul?.consoleType?.consoleType ?? proto.ConsoleType.ConsolePC
  );
  const [xinputOnWindows, setXinputOnWindows] = useState<boolean>(
    initialEmul?.consoleType?.xinputOnWindows ?? true
  );
  const [ps4OrPs5Mode, setPs4OrPs5Mode] = useState<boolean>(
    initialEmul?.consoleType?.ps4OrPs5Mode ?? false
  );
  const [bluetoothMode, setBluetoothMode] = useState<proto.BluetoothMode>(
    initialEmul?.bluetooth ?? proto.BluetoothMode.BTStandard
  );

  // Step 2: Controller Sources
  const [hostAssignments, setHostAssignments] =
    useState<proto.IProfileAssignmentInfo[]>(initialHost);

  const buildAssignments = (
    emulMode: EmulationMode,
    uMode: 'auto' | 'forced' | 'specific',
    forced: proto.ConsoleMode,
    specific: proto.ConsoleType,
    xinput: boolean,
    ps4: boolean,
    btMode: proto.BluetoothMode,
    hosts: proto.IProfileAssignmentInfo[],
    tType: 'always' | 'input' | 'inputAnyTime',
    tInput: proto.IInput | undefined
  ): proto.IProfileAssignmentInfo[] => {
    const assignments: proto.IProfileAssignmentInfo[] = [];

    // Emulation
    switch (emulMode) {
      case 'consoleType':
        assignments.push({
          consoleType: {
            consoleType: uMode === 'specific' ? specific : null,
            forcedType: uMode === 'forced' ? forced : null,
            xinputOnWindows: xinput,
            ps4OrPs5Mode: ps4,
          },
        });
        break;
      case 'bluetooth':
        assignments.push({ bluetooth: btMode });
        break;
      case 'ps2Emulation':
        assignments.push({ ps2Emulation: {} });
        break;
      case 'wiiEmulation':
        assignments.push({ wiiEmulation: {} });
        break;
      case 'joybusEmulation':
        assignments.push({ joybusEmulation: {} });
        break;
      case 'snesEmulation':
        assignments.push({ snesEmulation: {} });
        break;
    }

    // Host sources
    hosts.forEach((item) => {
      assignments.push(item);
    });

    // Trigger
    if (tType === 'input') {
      assignments.push({ input: { input: tInput || {} } });
    } else if (tType === 'inputAnyTime') {
      assignments.push({ inputAnyTime: { input: tInput || {} } });
    }

    return assignments;
  };

  const syncToProfile = (params?: {
    name?: string;
    deviceToEmulate?: proto.SubType;
    currentEmulMode?: EmulationMode;
    usbMode?: 'auto' | 'forced' | 'specific';
    forcedConsole?: proto.ConsoleMode;
    specificConsole?: proto.ConsoleType;
    xinputOnWindows?: boolean;
    ps4OrPs5Mode?: boolean;
    bluetoothMode?: proto.BluetoothMode;
    hostAssignments?: proto.IProfileAssignmentInfo[];
    triggerType?: 'always' | 'input' | 'inputAnyTime';
    triggerInput?: proto.IInput | undefined;
  }) => {
    const updatedName = params && 'name' in params ? params.name! : name;
    const updatedDeviceToEmulate =
      params && 'deviceToEmulate' in params ? params.deviceToEmulate! : deviceToEmulate;
    const updatedEmulMode =
      params && 'currentEmulMode' in params ? params.currentEmulMode! : currentEmulMode;
    const updatedUsbMode = params && 'usbMode' in params ? params.usbMode! : usbMode;
    const updatedForcedConsole =
      params && 'forcedConsole' in params ? params.forcedConsole! : forcedConsole;
    const updatedSpecificConsole =
      params && 'specificConsole' in params ? params.specificConsole! : specificConsole;
    const updatedXinputOnWindows =
      params && 'xinputOnWindows' in params ? params.xinputOnWindows! : xinputOnWindows;
    const updatedPs4OrPs5Mode =
      params && 'ps4OrPs5Mode' in params ? params.ps4OrPs5Mode! : ps4OrPs5Mode;
    const updatedBluetoothMode =
      params && 'bluetoothMode' in params ? params.bluetoothMode! : bluetoothMode;
    const updatedHostAssignments =
      params && 'hostAssignments' in params ? params.hostAssignments! : hostAssignments;
    const updatedTriggerType =
      params && 'triggerType' in params ? params.triggerType! : triggerType;
    const updatedTriggerInput =
      params && 'triggerInput' in params ? params.triggerInput : triggerInput;

    const finalAssignments = buildAssignments(
      updatedEmulMode,
      updatedUsbMode,
      updatedForcedConsole,
      updatedSpecificConsole,
      updatedXinputOnWindows,
      updatedPs4OrPs5Mode,
      updatedBluetoothMode,
      updatedHostAssignments,
      updatedTriggerType,
      updatedTriggerInput
    );

    const currentProfile = useConfigStore.getState().config.profiles![profileIdx] || profile;
    updateProfile(
      {
        ...currentProfile,
        opts: {
          ...currentProfile.opts,
          deviceSlotIdVersion: 2,
          name: truncateProfileName(updatedName),
          deviceToEmulate: updatedDeviceToEmulate,
        },
        assignments: [{ assignments: finalAssignments }],
      },
      profileIdx
    );
  };

  const addHostSource = (sourceType: string) => {
    const next = defaultHostSource(sourceType);
    if (next) {
      const updated = [...hostAssignments, next];
      setHostAssignments(updated);
      syncToProfile({ hostAssignments: updated });
    }
  };

  const removeHostSource = (idx: number) => {
    const updated = hostAssignments.filter((_, i) => i !== idx);
    setHostAssignments(updated);
    syncToProfile({ hostAssignments: updated });
  };

  const updateHostSource = (idx: number, updated: proto.IProfileAssignmentInfo) => {
    const next = hostAssignments.map((item, i) => (i === idx ? updated : item));
    setHostAssignments(next);
    syncToProfile({ hostAssignments: next });
  };

  // Step 3: Activation Trigger
  const [triggerType, setTriggerType] = useState<'always' | 'input' | 'inputAnyTime'>(
    initialTrigger?.input != null
      ? 'input'
      : initialTrigger?.inputAnyTime != null
        ? 'inputAnyTime'
        : 'always'
  );
  const [triggerInput, setTriggerInput] = useState<proto.IInput | undefined>(
    initialTrigger?.input?.input ?? initialTrigger?.inputAnyTime?.input ?? undefined
  );

  const targetOptions = [
    { label: t('assignments.emulation_mode.usb'), value: 'consoleType' },
    ...(hasBluetooth
      ? [{ label: t('assignments.emulation_mode.bluetooth'), value: 'bluetooth' }]
      : []),
    ...(hasPsxEmu ? [{ label: t('assignments.emulation_mode.ps2'), value: 'ps2Emulation' }] : []),
    ...(hasWiiEmu ? [{ label: t('assignments.emulation_mode.wii'), value: 'wiiEmulation' }] : []),
    ...(hasJoybusEmu
      ? [{ label: t('assignments.emulation_mode.joybus'), value: 'joybusEmulation' }]
      : []),
    ...(hasSnesEmu
      ? [{ label: t('assignments.emulation_mode.snes'), value: 'snesEmulation' }]
      : []),
  ];

  const handleApply = () => {
    const { deviceStatus } = useConfigStore.getState();
    const finalAssignments = buildAssignments(
      currentEmulMode,
      usbMode,
      forcedConsole,
      specificConsole,
      xinputOnWindows,
      ps4OrPs5Mode,
      bluetoothMode,
      hostAssignments,
      triggerType,
      triggerInput
    );

    // Generate mappings, converted by the chosen preset if there is one, which also labels the
    // keys it sends
    const keyLabels: { key: number; names: string[] }[] = [];
    const defaultsFor = (
      type: string,
      deviceId?: number,
      status?: DeviceStatusLike,
      hostType?: proto.SubType
    ) => {
      if (!preset) {
        return getDefaultMappings(type, deviceToEmulate, deviceId, status, hostType);
      }
      keyLabels.push(...getPresetKeyLabels(preset, type, deviceId, status));
      return getPresetMappings(preset, type, deviceId, status);
    };
    const newMappings: proto.IMapping[] = [];
    if (hostAssignments.length === 0) {
      newMappings.push(...defaultsFor('gpio'));
    } else {
      const hostSlotIds = getProfileWideSlotIds([hostAssignments])[0];
      hostAssignments.forEach((item, idx) => {
        const slotId = hostSlotIds[idx];
        if (item.wiiExt != null) {
          const wiiDev = Object.values(deviceStatus).find((d) => d.type === 'wii');
          const wiiSlotId = slotId !== -1 ? slotId : wiiDev ? parseInt(wiiDev.id, 10) : 0;
          newMappings.push(
            ...moveWiiDrumNotesToMidiSlot(
              [finalAssignments],
              2,
              wiiSlotId,
              defaultsFor(
                'wii',
                wiiSlotId,
                wiiDev ? { ...wiiDev, wiiExtType: item.wiiExt } : { wiiExtType: item.wiiExt }
              )
            )
          );
        } else if (item.ps2Cnt != null) {
          const psxDev = Object.values(deviceStatus).find((d) => d.type === 'psx');
          newMappings.push(
            ...defaultsFor(
              'psx',
              slotId !== -1 ? slotId : psxDev ? parseInt(psxDev.id, 10) : 0,
              psxDev ? { ...psxDev, ps2CntType: item.ps2Cnt } : { ps2CntType: item.ps2Cnt }
            )
          );
        } else if (item.midiChannel != null) {
          const midiDev = Object.values(deviceStatus).find(
            (d) =>
              !isMidiOutDevice(d.device) &&
              (d.type === 'midiSerial' || d.type === 'bhDrum' || d.type === 'worldTourDrum')
          );
          newMappings.push(
            ...defaultsFor(
              midiDev ? midiDev.type : 'midiSerial',
              slotId !== -1 ? slotId : midiDev ? parseInt(midiDev.id, 10) : 0,
              midiDev
            )
          );
        } else if (item.usbType != null || item.usbDevice != null) {
          const usbDev = Object.values(deviceStatus).find((d) => d.type === 'usbHost');
          const hostType = getAssignmentHostType(item, deviceToEmulate);
          newMappings.push(
            ...defaultsFor(
              'usbHost',
              slotId !== -1 ? slotId : usbDev ? parseInt(usbDev.id, 10) : 0,
              usbDev,
              hostType
            )
          );
        } else if (item.bluetoothType != null || item.bluetoothDevice != null) {
          const btDev = Object.values(deviceStatus).find((d) => d.type === 'bt');
          const hostType = getAssignmentHostType(item, deviceToEmulate);
          newMappings.push(
            ...defaultsFor(
              'bt',
              slotId !== -1 ? slotId : btDev ? parseInt(btDev.id, 10) : 0,
              btDev,
              hostType
            )
          );
        }
      });
      if (newMappings.length === 0) {
        newMappings.push(...defaultsFor('gpio'));
      }
    }

    if (keyLabels.length) {
      useConfigStore.getState().addPresetKeyLabels(keyLabels, profile.opts.uid);
    }
    const currentProfile = useConfigStore.getState().config.profiles![profileIdx] || profile;
    updateProfile(
      {
        ...currentProfile,
        opts: {
          ...currentProfile.opts,
          deviceSlotIdVersion: 2,
          name: truncateProfileName(name),
          deviceToEmulate,
        },
        assignments: [{ assignments: finalAssignments }],
        mappings: newMappings,
      },
      profileIdx
    );
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder maw={560} mx="auto" my="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group gap="xs">
            <ThemeIcon size="lg" radius="md" variant="light" color="blue">
              <IconSparkles size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={4}>{t('assignments.setup_wizard_title')}</Title>
              <Text size="xs" c="dimmed">
                {t('assignments.setup_wizard_desc')}
              </Text>
            </Stack>
          </Group>
        </Group>

        <Divider />

        <TextInput
          value={name}
          onChange={(e) => {
            const next = truncateProfileName(e.currentTarget.value);
            setName(next);
            syncToProfile({ name: next });
          }}
          label={t('main.profile_name.label')}
          size="xs"
        />

        <DropdownBox
          title="main.device_to_emulate.label"
          description="main.device_to_emulate.description"
          e={proto.SubType}
          exclude={[proto.SubType.Unknown]}
          val={deviceToEmulate}
          label="subType"
          dispatch={(val) => {
            setDeviceToEmulate(val);
            setDefaultPreset('');
            syncToProfile({ deviceToEmulate: val });
          }}
        />

        {presets.length > 0 && (
          <Select
            label={t('defaults_dialog.preset')}
            description={t('defaults_dialog.preset_desc')}
            data={[
              { value: '', label: t('defaults_dialog.preset_none') },
              ...presets.map((p) => ({
                value: p.id,
                label: t(`defaults_dialog.presets.${p.id}`),
              })),
            ]}
            value={defaultPreset}
            onChange={(value) => setDefaultPreset(value ?? '')}
            allowDeselect={false}
          />
        )}

        <Divider />

        {/* Step 1: Target Connection */}
        <Stack gap={4}>
          <Input.Wrapper
            size="xs"
            label={t('assignments.step1_title')}
            description={t('assignments.step1_desc')}
          >
            <SegmentedControl
              fullWidth
              size="xs"
              value={currentEmulMode}
              onChange={(val) => {
                const mode = val as EmulationMode;
                setCurrentEmulMode(mode);
                syncToProfile({ currentEmulMode: mode });
              }}
              data={targetOptions}
            />
          </Input.Wrapper>
          {currentEmulMode === 'consoleType' && (
            <Stack gap={4} mt="xs">
              <Select
                size="xs"
                label={t('assignments.usb_mode.label')}
                value={usbMode}
                onChange={(val) => {
                  const mode = (val as 'auto' | 'forced' | 'specific') ?? 'auto';
                  setUsbMode(mode);
                  syncToProfile({ usbMode: mode });
                }}
                data={[
                  { value: 'auto', label: t('assignments.usb_mode.auto') },
                  { value: 'forced', label: t('assignments.usb_mode.forced') },
                  { value: 'specific', label: t('assignments.usb_mode.specific') },
                ]}
              />
              {usbMode === 'forced' && (
                <DropdownBox
                  title="activation.forcedType"
                  e={proto.ConsoleMode}
                  val={forcedConsole}
                  label="consoleMode"
                  dispatch={(mode) => {
                    setForcedConsole(mode);
                    syncToProfile({ forcedConsole: mode });
                  }}
                />
              )}
              {usbMode === 'specific' && (
                <DropdownBox
                  title="activation.consoleType"
                  e={proto.ConsoleType}
                  val={specificConsole}
                  label="consoleType"
                  dispatch={(tVal) => {
                    setSpecificConsole(tVal);
                    syncToProfile({ specificConsole: tVal });
                  }}
                />
              )}
              {usbMode === 'auto' && (
                <>
                  {!hidOnlySubtypes.includes(deviceToEmulate) && (
                    <Input.Wrapper
                      size="xs"
                      label={t('main.xinput_on_windows.label')}
                      description={<XInputOnWindowsDescription />}
                    >
                      <SegmentedControl
                        fullWidth
                        size="xs"
                        data={[
                          { label: t('main.xinput_on_windows.XInput'), value: 'true' },
                          { label: t('main.xinput_on_windows.HID'), value: 'false' },
                        ]}
                        value={xinputOnWindows ? 'true' : 'false'}
                        onChange={(val) => {
                          const isXinput = val === 'true';
                          setXinputOnWindows(isXinput);
                          syncToProfile({ xinputOnWindows: isXinput });
                        }}
                      />
                    </Input.Wrapper>
                  )}
                  {ps4Subtypes.includes(deviceToEmulate) && (
                    <Input.Wrapper
                      size="xs"
                      label={t('main.ps4EmulationMode.label')}
                      description={t('main.ps4EmulationMode.description')}
                    >
                      <SegmentedControl
                        fullWidth
                        size="xs"
                        data={[
                          { label: t('main.ps4EmulationMode.PS3'), value: 'false' },
                          { label: t('main.ps4EmulationMode.PS4'), value: 'true' },
                        ]}
                        value={ps4OrPs5Mode ? 'true' : 'false'}
                        onChange={(val) => {
                          const isPs4 = val === 'true';
                          setPs4OrPs5Mode(isPs4);
                          syncToProfile({ ps4OrPs5Mode: isPs4 });
                        }}
                      />
                    </Input.Wrapper>
                  )}
                </>
              )}
            </Stack>
          )}
          {currentEmulMode === 'bluetooth' && (
            <DropdownBox
              title="activation.bluetooth"
              e={proto.BluetoothMode}
              val={bluetoothMode}
              label="bluetooth"
              dispatch={(mode) => {
                setBluetoothMode(mode);
                syncToProfile({ bluetoothMode: mode });
              }}
            />
          )}
        </Stack>

        <Divider />

        {/* Step 2: Controller Sources */}
        <ControllerSourcesEditor
          assignments={hostAssignments}
          slotIds={getProfileWideSlotIds([hostAssignments])[0]}
          onAddSource={addHostSource}
          onRemoveSource={removeHostSource}
          onUpdateSource={updateHostSource}
          hasUsbHost={hasUsbHost}
          hasBluetooth={hasBluetooth}
          hasMidi={hasMidi}
          hasWii={hasWii}
          hasPsx={hasPsx}
          hasSnes={hasSnes}
          hasJoybus={hasJoybus}
        />

        <Divider />

        {/* Step 3: Activation Trigger */}
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {t('assignments.step3_title')}
          </Text>
          <Select
            size="xs"
            value={triggerType}
            onChange={(val) => {
              const mode = (val as 'always' | 'input' | 'inputAnyTime') ?? 'always';
              setTriggerType(mode);
              syncToProfile({ triggerType: mode });
            }}
            data={[
              { value: 'always', label: t('assignments.trigger.always') },
              { value: 'input', label: t('assignments.trigger.boot') },
              { value: 'inputAnyTime', label: t('assignments.trigger.anytime') },
            ]}
          />
          {triggerType !== 'always' && (
            <Stack gap={4} mt="xs">
              <SantrollerInput
                axis={false}
                button
                type={deviceToEmulate}
                mode={
                  profile.opts?.faceButtonMappingMode ?? proto.FaceButtonMappingMode.LegendBased
                }
                legendMode={readStoredLegendMode()}
                input={triggerInput ?? {}}
                dispatch={(input) => {
                  setTriggerInput(input);
                  syncToProfile({ triggerInput: input });
                }}
              />
            </Stack>
          )}
        </Stack>

        <Divider />

        <Group justify="space-between" mt="sm">
          <Button variant="subtle" color="gray" onClick={onSkip}>
            {t('assignments.setup_wizard_skip')}
          </Button>
          <Button
            variant="filled"
            color="blue"
            leftSection={<IconSparkles size={16} />}
            onClick={handleApply}
          >
            {t('assignments.setup_wizard_apply')}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

// Buttons to load the defaults for each device. Device labels show live status, so this is its own
// component to keep status updates from re-rendering the whole profile.
// The devices and profile slots defaults can be loaded for, under one heading in the load
// defaults menu. Devices that need assigning first are shown, but can't be picked.
function DeviceDefaultsItems({
  profile,
  slots,
  onPick,
}: {
  profile: proto.IProfile;
  slots: ProfileSlot[];
  onPick: (target: DeviceStatus | ProfileSlot) => void;
}) {
  const { t } = useTranslation();
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const slotsWithDefaults = slots.filter(
    (slot) =>
      hasDefaultMappings(slot.deviceKind === 'midi' ? 'midiSerial' : slot.deviceKind) ||
      hasDefaultMappings(slot.deviceKind)
  );
  const unassigned = Object.values(deviceStatus).filter(
    (item) =>
      hasDefaults(item) &&
      requiresAssignment(item.type, item.device) &&
      !isDeviceAssigned(item.type, profile, item.device)
  );
  const devices = Object.values(deviceStatus).filter(
    (item) =>
      hasDefaults(item) &&
      !isMidiOutDevice(item.device) &&
      !requiresAssignment(item.type, item.device)
  );
  if (!slotsWithDefaults.length && !unassigned.length && !devices.length) {
    return null;
  }
  const deviceLabel = (item: DeviceStatus) =>
    t('defaults_dialog.device', {
      device: t(`devices.${item.type}`),
      status: DeviceStatus.label(item),
    });
  return (
    <>
      <Menu.Label>{t('defaults_dialog.for_device')}</Menu.Label>
      {slotsWithDefaults.map((slot) => (
        <Menu.Item key={slot.key} onClick={() => onPick(slot)}>
          {slot.label}
        </Menu.Item>
      ))}
      {unassigned.map((item) => (
        <Menu.Item
          key={`unassigned-${item.id}`}
          disabled
          title={t('assignments.device_not_assigned')}
        >
          {deviceLabel(item)}
        </Menu.Item>
      ))}
      {devices.map((item) => (
        <Menu.Item key={`nonslot-${item.id}`} onClick={() => onPick(item)}>
          {deviceLabel(item)}
        </Menu.Item>
      ))}
    </>
  );
}

// The droppable closest to the pointer, or to the dragged rect for keyboard drags
const closestToPointer: CollisionDetection = (args) =>
  closestCenter(
    args.pointerCoordinates
      ? {
          ...args,
          collisionRect: {
            ...args.pointerCoordinates,
            top: args.pointerCoordinates.y,
            left: args.pointerCoordinates.x,
            right: args.pointerCoordinates.x,
            bottom: args.pointerCoordinates.y,
            width: 0,
            height: 0,
          },
        }
      : args
  );

// Which cards in a list are open for editing. A single card added to the end (new or copied)
// opens so it can be filled in. Adding several at once or switching profile closes them all, since
// the indexes no longer line up, so deletes and drags go through `reorder` to keep them matched up
function useExpandedCards(profileIdx: number, count: number) {
  const [state, setState] = useState<{ profileIdx: number; count: number; open: Set<number> }>({
    profileIdx,
    count,
    open: new Set(),
  });
  let { open } = state;
  if (state.profileIdx !== profileIdx || state.count !== count) {
    open =
      state.profileIdx === profileIdx && count === state.count + 1
        ? new Set([...state.open, count - 1])
        : new Set();
    setState({ profileIdx, count, open });
  }
  return {
    isOpen: (idx: number) => open.has(idx),
    allOpen: count > 0 && open.size === count,
    noneOpen: open.size === 0,
    toggle: (idx: number) =>
      setState((prev) => {
        const next = new Set(prev.open);
        if (!next.delete(idx)) {
          next.add(idx);
        }
        return { ...prev, open: next };
      }),
    setAll: (expanded: boolean) =>
      setState((prev) => ({
        ...prev,
        open: new Set(expanded ? [...Array(prev.count).keys()] : []),
      })),
    // Call before reordering or deleting from the profile's list, so the cards keep their state
    reorder: (order: number[]) =>
      setState((prev) => ({
        ...prev,
        count: order.length,
        open: reorderIndexes(prev.open, order),
      })),
  };
}

function ExpandCollapseAll({ cards }: { cards: ReturnType<typeof useExpandedCards> }) {
  const { t } = useTranslation();
  return (
    <Group gap={4}>
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconChevronDown size={14} />}
        disabled={cards.allOpen}
        onClick={() => cards.setAll(true)}
      >
        {t('main.expand_all')}
      </Button>
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />}
        disabled={cards.noneOpen}
        onClick={() => cards.setAll(false)}
      >
        {t('main.collapse_all')}
      </Button>
    </Group>
  );
}

function Profile({ profileIdx }: { profileIdx: number }) {
  const errorIcon = <IconExclamationCircle />;
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteProfileOpened, { open: openDeleteProfile, close: closeDeleteProfile }] =
    useDisclosure(false);
  // A device type change that would drop mappings the new type has no outputs for, held until confirmed
  const [pendingSubType, setPendingSubType] = useState<{
    subType: proto.SubType;
    dropped: number;
  } | null>(null);
  const { t } = useTranslation();
  const profiles = useConfigStore((state) => state.config.profiles!);
  const updateProfile = useConfigStore((state) => state.updateProfile);
  const updateProfiles = useConfigStore((state) => state.updateProfiles);
  const deleteProfile = useConfigStore((state) => state.deleteProfile);
  const cloneProfile = useConfigStore((state) => state.cloneProfile);
  const loadDefaults = useConfigStore((state) => state.loadDefaults);
  const setSyncMode = useConfigStore((state) => state.setSyncMode);
  const connected = useConfigStore((state) => state.connected);
  const testLed = useConfigStore((state) => state.testLed);
  const [legendMode, setLegendMode] = useState<LegendMode>(readStoredLegendMode);
  const deviceTypes = useDeviceTypes();
  const [defaultTarget, setDefaultTarget] = useState<DeviceStatus | ProfileSlot | undefined>(
    undefined
  );
  const [defaultPreset, setDefaultPreset] = useState<string>('');
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const syncCalibrations = useConfigStore((state) => state.syncInputs);
  const profile = profiles[profileIdx];
  // Only lights its LEDs while no other profile is active, so it has no rules or inputs
  const standby = !!profile?.opts.standbyLighting;
  const standbySources = (profile?.assignments ?? []).flatMap((list) => list.assignments ?? []);
  const standbyWake = profile?.standbyWake ?? [];
  const updateStandbyWake = (wake: proto.IInputActivationTrigger[]) =>
    updateProfile({ ...profile, standbyWake: wake }, profileIdx);
  const updateStandbyWakeAt = (idx: number, wake: proto.IInputActivationTrigger) =>
    updateStandbyWake(standbyWake.map((x, i) => (i === idx ? wake : x)));
  const updateStandbySources = (sources: proto.IProfileAssignmentInfo[]) =>
    updateProfile(
      { ...profile, assignments: sources.map((source) => ({ assignments: [source] })) },
      profileIdx
    );
  const profileSlots = useMemo(() => getProfileSlots(profile, t), [profile, t]);
  const ruleCards = useExpandedCards(profileIdx, profile?.assignments?.length ?? 0);
  const mappingCards = useExpandedCards(profileIdx, profile?.mappings?.length ?? 0);
  const ledCards = useExpandedCards(profileIdx, profile?.leds?.length ?? 0);
  const ruleSelection = useIndexSelection(profileIdx, profile?.assignments?.length ?? 0);
  const mappingSelection = useIndexSelection(profileIdx, profile?.mappings?.length ?? 0);
  const ledSelection = useIndexSelection(profileIdx, profile?.leds?.length ?? 0);
  const [groupDrag, setGroupDrag] = useState<{
    key: 'assignments' | 'mappings' | 'leds';
    active: number;
    group: number[];
  } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );
  const hasBluetooth = deviceTypes.includes('bt');
  const hasWii = deviceTypes.includes('wii');
  const hasPsx = deviceTypes.includes('psx');
  useEffect(() => {
    localStorage.setItem('legendMode', LegendMode[legendMode]);
  }, [legendMode]);
  const lists = {
    assignments: {
      cards: ruleCards,
      selection: ruleSelection,
      i18n: 'rules',
      title: 'assignments.rule_title',
    },
    mappings: {
      cards: mappingCards,
      selection: mappingSelection,
      i18n: 'inputs',
      title: 'inputs.mapping_title',
    },
    leds: { cards: ledCards, selection: ledSelection, i18n: 'leds', title: 'leds.item_title' },
  } as const;
  type ListKey = keyof typeof lists;
  // Reorders (or deletes from) one of the profile's lists, keeping the open and selected cards on
  // the items they were on
  const reorderList = (key: ListKey, order: number[]) => {
    lists[key].cards.reorder(order);
    lists[key].selection.reorder(order);
    updateProfile(
      { ...profile, [key]: applyOrder<unknown>(profile[key] ?? [], order) },
      profileIdx
    );
  };
  const deleteFromList = (key: ListKey, idx: number) =>
    reorderList(key, withoutGroupOrder(profile[key]?.length ?? 0, [idx]));
  // Dragging a selected card brings the rest of the selection with it
  const dragEndFor = (key: ListKey) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    reorderList(
      key,
      dragOrder(
        profile[key]?.length ?? 0,
        lists[key].selection.selected,
        active.id as number,
        over.id as number
      )
    );
  };
  const selectionBar = (key: ListKey) => {
    const { selection, i18n } = lists[key];
    const count = profile[key]?.length ?? 0;
    return (
      !simpleMode && (
        <SelectionBar
          total={count}
          selected={selection.selected.length}
          onSelectAll={selection.selectAll}
          onMoveToStart={() => reorderList(key, groupToStartOrder(count, selection.selected))}
          onMoveToEnd={() => reorderList(key, groupToEndOrder(count, selection.selected))}
          onDelete={() => reorderList(key, withoutGroupOrder(count, selection.selected))}
          deleteTitle={t(`selection.${i18n}.deleteTitle`)}
          deleteDesc={t(`selection.${i18n}.deleteDesc`, { count: selection.selected.length })}
          sticky={false}
        />
      )
    );
  };
  // Props that make a list's card selectable, outside the customer tool
  const selectProps = (key: ListKey, idx: number) =>
    simpleMode
      ? {}
      : {
          selected: lists[key].selection.isSelected(idx),
          onSelect: (on: boolean) => lists[key].selection.select(idx, on),
          placeholder: inGroupDrag(key, idx),
        };
  // Dragging a selected card while others are selected moves them all. They stay where they are,
  // faded, while a preview of the group follows the pointer.
  const inGroupDrag = (key: ListKey, idx: number) =>
    groupDrag?.key === key && groupDrag.group.includes(idx);
  // Group drags preview the whole group moving, the way it'll be dropped
  const sortingStrategy = (key: ListKey) =>
    groupDrag?.key === key ? groupSortingStrategy(groupDrag.group) : rectSortingStrategy;
  const dndProps = (key: ListKey) => ({
    sensors,
    // The group preview hangs off the pointer rather than standing in for the card, so its centre
    // isn't where the group is being dropped. Aim with the pointer instead.
    collisionDetection: groupDrag?.key === key ? closestToPointer : closestCenter,
    onDragStart: ({ active }: DragStartEvent) => {
      const group = lists[key].selection.selected;
      if (group.length > 1 && group.includes(active.id as number)) {
        setGroupDrag({ key, active: active.id as number, group });
      }
    },
    onDragCancel: () => setGroupDrag(null),
    onDragEnd: (event: DragEndEvent) => {
      setGroupDrag(null);
      dragEndFor(key)(event);
    },
  });
  // Only mounted for group drags, as a mounted overlay replaces the card that follows the pointer
  // when dragging a single card
  const dragPreview = (key: ListKey) =>
    groupDrag?.key === key && (
      <DragOverlay modifiers={[anchorPreviewToPointer]}>
        <GroupDragPreview
          titles={groupDrag.group.map((idx) => t(lists[key].title, { num: idx + 1 }))}
        />
      </DragOverlay>
    );
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('defaults_dialog.title')} centered>
        {t('defaults_dialog.desc')}
        <Space h="md" />
        {presetsFor(profile.opts.deviceToEmulate).length > 0 && (
          <>
            <Select
              label={t('defaults_dialog.preset')}
              description={t('defaults_dialog.preset_desc')}
              data={[
                { value: '', label: t('defaults_dialog.preset_none') },
                ...presetsFor(profile.opts.deviceToEmulate).map((preset) => ({
                  value: preset.id,
                  label: t(`defaults_dialog.presets.${preset.id}`),
                })),
              ]}
              value={defaultPreset}
              onChange={(value) => setDefaultPreset(value ?? '')}
              allowDeselect={false}
            />
            <Space h="md" />
          </>
        )}
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                loadDefaults(defaultTarget, defaultPreset || undefined);
                close();
              }}
              color="red"
            >
              {t('defaults_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('defaults_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Modal
        opened={pendingSubType != null}
        onClose={() => setPendingSubType(null)}
        title={t('change_subtype_dialog.title')}
        centered
      >
        {pendingSubType &&
          t('change_subtype_dialog.desc', {
            count: pendingSubType.dropped,
            subType: t(`subType.${proto.SubType[pendingSubType.subType]}`),
          })}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                if (pendingSubType) {
                  updateProfile(
                    {
                      ...profile,
                      opts: { ...profile.opts, deviceToEmulate: pendingSubType.subType },
                    },
                    profileIdx
                  );
                }
                setPendingSubType(null);
              }}
              color="red"
            >
              {t('change_subtype_dialog.confirm')}
            </Button>
            <Button onClick={() => setPendingSubType(null)}>
              {t('change_subtype_dialog.cancel')}
            </Button>
          </Group>
        </Flex>
      </Modal>
      <Modal
        opened={deleteProfileOpened}
        onClose={closeDeleteProfile}
        title={t('delete_profile_dialog.title')}
        centered
      >
        {profile?.opts?.name
          ? t('delete_profile_dialog.desc_named', {
              name: profile.opts.name,
              defaultValue: t('delete_profile_dialog.desc'),
            })
          : t('delete_profile_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                deleteProfile(profileIdx);
                closeDeleteProfile();
              }}
              color="red"
            >
              {t('delete_profile_dialog.confirm')}
            </Button>
            <Button onClick={closeDeleteProfile}>{t('delete_profile_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Space h="md" />
      {!simpleMode && (
        <>
          <Group gap="xs" align="center">
            <Title order={2}>{t('main.settings')}</Title>
            {!standby && (
              <ActionIcon
                color="blue"
                title={t('main.clone_profile')}
                onClick={() => cloneProfile(profileIdx)}
              >
                <IconCopy style={{ width: '70%', height: '70%' }} />
              </ActionIcon>
            )}
            <ActionIcon color="red" title={t('main.delete_profile')} onClick={openDeleteProfile}>
              <IconTrash style={{ width: '70%', height: '70%' }} />
            </ActionIcon>
          </Group>
          {/* Device wide settings that are about the controller, which is never standby lighting */}
          {!standby && (
            <>
              <Space h="md" />
              <DeviceIdentitySettings />
              <Space h="md" />
              <XboxOneLegacyAdapterSetting />
            </>
          )}
          <Space h="md" />
          <TextInput
            value={profile.opts.name}
            onChange={(e) =>
              updateProfile(
                {
                  ...profile,
                  opts: { ...profile.opts, name: truncateProfileName(e.currentTarget.value) },
                },
                profileIdx
              )
            }
            label={t('main.profile_name.label')}
          />
          {!standby && (
            <>
              <Space h="md" />
              <DropdownBox
                title="main.device_to_emulate.label"
                description="main.device_to_emulate.description"
                e={proto.SubType}
                exclude={[proto.SubType.Unknown]}
                val={profile.opts.deviceToEmulate!}
                label="subType"
                dispatch={(deviceToEmulate) => {
                  const dropped = countMappingsDroppedBySubType(profile, deviceToEmulate);
                  if (dropped > 0) {
                    setPendingSubType({ subType: deviceToEmulate, dropped });
                    return;
                  }
                  updateProfile(
                    { ...profile, opts: { ...profile.opts, deviceToEmulate } },
                    profileIdx
                  );
                }}
              />
            </>
          )}
        </>
      )}
      {standby && (
        <Alert variant="light" icon={<IconMoon size={16} />} mt="md">
          {t('main.standbyLighting.description')}
        </Alert>
      )}
      {standby && !simpleMode && (
        <>
          <Space h="md" />
          <Switch
            label={t('main.standbyLighting.whileSuspended.label')}
            description={t('main.standbyLighting.whileSuspended.description')}
            checked={!!profile.opts.standbyWhileSuspended}
            onChange={(event) =>
              updateProfile(
                {
                  ...profile,
                  opts: { ...profile.opts, standbyWhileSuspended: event.currentTarget.checked },
                },
                profileIdx
              )
            }
          />
          <Space h="md" />
          <Input.Wrapper
            label={t('main.standbyLighting.controllers.label')}
            description={t('main.standbyLighting.controllers.description')}
          >
            {/* Each controller is a rule of its own, so it's claimed whether or not the others are connected */}
            <ControllerSourcesEditor
              assignments={standbySources}
              slotIds={getProfileSlotIds(profile).flat()}
              onAddSource={(type) => {
                const source = defaultHostSource(type);
                if (source) {
                  updateStandbySources([...standbySources, source]);
                }
              }}
              onRemoveSource={(idx) =>
                updateStandbySources(standbySources.filter((_, i) => i !== idx))
              }
              onUpdateSource={(idx, updated) =>
                updateStandbySources(standbySources.map((x, i) => (i === idx ? updated : x)))
              }
              hasUsbHost={deviceTypes.includes('usbHost')}
              hasBluetooth={hasBluetooth}
              hasMidi={deviceTypes.some(
                (type) =>
                  type === 'midiSerial' ||
                  type === 'usbHost' ||
                  type === 'wii' ||
                  type === 'bhDrum' ||
                  type === 'worldTourDrum'
              )}
              hasWii={hasWii}
              hasPsx={hasPsx}
              hasSnes={deviceTypes.includes('snes')}
              hasJoybus={deviceTypes.includes('joybus')}
              showTitle={false}
              wrap
            />
          </Input.Wrapper>
          <Space h="md" />
          <Input.Wrapper
            label={t('main.standbyLighting.wake.label')}
            description={t('main.standbyLighting.wake.description')}
          >
            <Stack gap="xs" mt={4} align="flex-start">
              <Group align="flex-start" gap="xs">
                {standbyWake.map((wake, wakeIdx) => (
                  <Card key={wakeIdx} padding="xs" radius="sm" withBorder w={420} maw="100%">
                    <Stack gap={4}>
                      <Group justify="space-between" align="center">
                        <Text size="xs" fw={500}>
                          {t('main.standbyLighting.wake.button', { num: wakeIdx + 1 })}
                        </Text>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          title={t('main.standbyLighting.wake.remove')}
                          onClick={() =>
                            updateStandbyWake(standbyWake.filter((_, i) => i !== wakeIdx))
                          }
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                      {/* Standby lighting has no rules, so detecting an input can use the activation slots */}
                      <SantrollerInput
                        axis={false}
                        button
                        type={profile.opts.deviceToEmulate}
                        activationIdx={wakeIdx}
                        mode={profile.opts.faceButtonMappingMode}
                        legendMode={legendMode}
                        input={wake.input ?? {}}
                        dispatch={(input) => updateStandbyWakeAt(wakeIdx, { ...wake, input })}
                      />
                      {wake.input && isAnalog(wake.input) ? (
                        <ActivationTrigger
                          input={wake}
                          profileIdx={profileIdx}
                          listIdx={0}
                          activationIdx={wakeIdx}
                          dispatch={(updated) => updateStandbyWakeAt(wakeIdx, updated)}
                        />
                      ) : (
                        <Switch
                          size="xs"
                          label={t('calibration.inverted')}
                          checked={!!wake.inverted}
                          onChange={(evt) =>
                            updateStandbyWakeAt(wakeIdx, {
                              ...wake,
                              inverted: evt.currentTarget.checked,
                            })
                          }
                        />
                      )}
                    </Stack>
                  </Card>
                ))}
              </Group>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => updateStandbyWake([...standbyWake, { input: {} }])}
              >
                {t('main.standbyLighting.wake.add')}
              </Button>
            </Stack>
          </Input.Wrapper>
        </>
      )}

      <Space h="md" />
      <DropdownBox
        title="main.legendMode.label"
        description="main.legendMode.description"
        e={LegendMode}
        val={legendMode}
        label="legendMode"
        dispatch={(deviceToEmulate) => setLegendMode(deviceToEmulate)}
      />

      {!standby && profile.opts.deviceToEmulate === proto.SubType.Gamepad && (
        <>
          <Space h="md" />
          <FaceButtonMappingMode
            mode={profile.opts.faceButtonMappingMode}
            dispatch={(val) =>
              updateProfile(
                { ...profile, opts: { ...profile.opts, faceButtonMappingMode: val } },
                profileIdx
              )
            }
          />
          <Space h="md" />
          <Switch
            label={t('main.invert_y_hid.label')}
            description={t('main.invert_y_hid.description')}
            checked={!!profile.opts.invertYAxisHid}
            onChange={(event) =>
              updateProfile(
                {
                  ...profile,
                  opts: { ...profile.opts, invertYAxisHid: event.currentTarget.checked },
                },
                profileIdx
              )
            }
          />
        </>
      )}

      {!standby && (
        <>
          <Space h="md" />
          <Switch
            label={t('main.syncCalibrations.label')}
            description={t('main.syncCalibrations.description')}
            checked={syncCalibrations}
            onChange={(event) => setSyncMode(event.currentTarget.checked)}
          />
        </>
      )}
      {!simpleMode && (
        <>
          <Space h="md" />
          <InactivitySettings />
        </>
      )}
      {hasBluetooth && !simpleMode && !standby && (
        <>
          <Space h="md" />
          <Switch
            label={t('main.disconnectBluetoothOnSuspend.label')}
            description={t('main.disconnectBluetoothOnSuspend.description')}
            checked={!!profile.opts.disconnectBluetoothOnSuspend}
            onChange={(event) =>
              updateProfile(
                {
                  ...profile,
                  opts: {
                    ...profile.opts,
                    disconnectBluetoothOnSuspend: event.currentTarget.checked,
                  },
                },
                profileIdx
              )
            }
          />
        </>
      )}
      {!simpleMode && !standby && (
        <>
          {(profile.opts.deviceToEmulate === proto.SubType.GuitarHeroGuitar ||
            profile.opts.deviceToEmulate === proto.SubType.RockBandGuitar ||
            profile.opts.deviceToEmulate === proto.SubType.LiveGuitar) && (
            <>
              <Space h="md" />
              <Switch
                label={t('main.combinedStrumDebounce.label')}
                description={t('main.combinedStrumDebounce.description')}
                checked={!!profile.opts.combinedStrumDebounce}
                onChange={(event) => {
                  const updated = {
                    ...profile,
                    opts: { ...profile.opts, combinedStrumDebounce: event.currentTarget.checked },
                  };
                  // Start both strums off with the first strum's debounce
                  const strum = profile.mappings?.find((m) =>
                    isStrumOutput(m.mapping, profile.opts.deviceToEmulate)
                  );
                  updateProfile(
                    event.currentTarget.checked && strum
                      ? withStrumDebounce(updated, mappingDebounce100us(strum), strum.debounceMode)
                      : updated,
                    profileIdx
                  );
                }}
              />
              <Space h="md" />
              <Switch
                label={t('main.queueInputs.label')}
                description={t('main.queueInputs.description')}
                checked={!!profile.opts.queueInputs}
                onChange={(event) =>
                  updateProfile(
                    {
                      ...profile,
                      opts: { ...profile.opts, queueInputs: event.currentTarget.checked },
                    },
                    profileIdx
                  )
                }
              />
              {profile.opts.queueInputs && (
                <>
                  <Space h="md" />
                  <NumberInput
                    label={t('main.dequeueInterval.label')}
                    description={t('main.dequeueInterval.description', {
                      fps: Math.floor(10000 / Math.max(profile.opts.dequeueInterval100us ?? 10, 1)),
                    })}
                    decimalScale={1}
                    step={0.1}
                    min={0.1}
                    value={(profile.opts.dequeueInterval100us ?? 10) / 10}
                    onChange={(val) =>
                      updateProfile(
                        {
                          ...profile,
                          opts: {
                            ...profile.opts,
                            dequeueInterval100us: Math.max(1, Math.round(Number(val) * 10)),
                          },
                        },
                        profileIdx
                      )
                    }
                  />
                </>
              )}
            </>
          )}
          {(profile.opts.deviceToEmulate === proto.SubType.GuitarHeroGuitar ||
            profile.opts.deviceToEmulate === proto.SubType.RockBandGuitar) && (
            <>
              <Space h="md" />
              <Switch
                label={t('main.selectToDpadLeft.label')}
                description={t('main.selectToDpadLeft.description')}
                checked={!!profile.opts.selectToDpadLeft}
                onChange={(event) =>
                  updateProfile(
                    {
                      ...profile,
                      opts: { ...profile.opts, selectToDpadLeft: event.currentTarget.checked },
                    },
                    profileIdx
                  )
                }
              />
            </>
          )}
          {RPCS3_PASSTHROUGH_SUBTYPES.includes(profile.opts.deviceToEmulate) && (
            <>
              <Space h="md" />
              <Switch
                label={t('main.ps3OnRpcs3.label')}
                description={t('main.ps3OnRpcs3.description')}
                checked={profile.opts.ps3OnRpcs3 ?? true}
                onChange={(event) =>
                  updateProfile(
                    {
                      ...profile,
                      opts: { ...profile.opts, ps3OnRpcs3: event.currentTarget.checked },
                    },
                    profileIdx
                  )
                }
              />
            </>
          )}
          {profile.opts.deviceToEmulate === proto.SubType.DjHeroTurntable && (
            <>
              <Space h="md" />
              <Switch
                label={t('main.fullRangeTurntableOnPc.label')}
                description={t('main.fullRangeTurntableOnPc.description')}
                checked={!!profile.opts.fullRangeTurntableOnPc}
                onChange={(event) =>
                  updateProfile(
                    {
                      ...profile,
                      opts: {
                        ...profile.opts,
                        fullRangeTurntableOnPc: event.currentTarget.checked,
                      },
                    },
                    profileIdx
                  )
                }
              />
            </>
          )}
          {profile.opts.deviceToEmulate === proto.SubType.RockBandDrums && (
            <>
              <Space h="md" />
              <Switch
                label={t('main.cymbalGlitchFix.label')}
                description={t('main.cymbalGlitchFix.description')}
                checked={!!profile.opts.cymbalGlitchFix}
                onChange={(event) =>
                  updateProfile(
                    {
                      ...profile,
                      opts: { ...profile.opts, cymbalGlitchFix: event.currentTarget.checked },
                    },
                    profileIdx
                  )
                }
              />
            </>
          )}

          <Divider my="xl" />
          <Table
            stickyHeader
            stickyHeaderOffset={STICKY_HEADER_OFFSET}
            withRowBorders={false}
            layout="fixed"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  {/* Section header, sticky so adding stays in reach on long lists */}
                  <Group justify="space-between" align="center" gap="sm">
                    <Group gap="sm" align="center">
                      <Title order={2} size="h3">
                        {t('assignments.title')}
                      </Title>
                      <Menu shadow="md" width={240}>
                        <Menu.Target>
                          <Button variant="filled" rightSection={<IconChevronDown size={14} />}>
                            {t('assignments.add')}
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Label>{t('assignments.presets_title')}</Menu.Label>
                          <Menu.Item
                            leftSection={<IconUsb size={14} />}
                            onClick={() =>
                              updateProfile(
                                {
                                  ...profile,
                                  assignments: [
                                    ...profile.assignments!,
                                    {
                                      assignments: [
                                        {
                                          consoleType: {
                                            consoleType: null,
                                            forcedType: null,
                                            xinputOnWindows: true,
                                            ps4OrPs5Mode: false,
                                          },
                                        },
                                      ],
                                    },
                                  ],
                                },
                                profileIdx
                              )
                            }
                          >
                            {t('assignments.preset_usb_auto')}
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconDeviceGamepad size={14} />}
                            onClick={() =>
                              updateProfile(
                                {
                                  ...profile,
                                  assignments: [
                                    ...profile.assignments!,
                                    {
                                      assignments: [
                                        {
                                          consoleType: {
                                            consoleType: null,
                                            forcedType: proto.ConsoleMode.ModeXbox360,
                                          },
                                        },
                                      ],
                                    },
                                  ],
                                },
                                profileIdx
                              )
                            }
                          >
                            {t('assignments.preset_usb_xbox')}
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconDeviceGamepad size={14} />}
                            onClick={() =>
                              updateProfile(
                                {
                                  ...profile,
                                  assignments: [
                                    ...profile.assignments!,
                                    {
                                      assignments: [
                                        {
                                          consoleType: {
                                            consoleType: null,
                                            forcedType: proto.ConsoleMode.ModePs3,
                                          },
                                        },
                                      ],
                                    },
                                  ],
                                },
                                profileIdx
                              )
                            }
                          >
                            {t('assignments.preset_usb_ps3')}
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconDeviceGamepad size={14} />}
                            onClick={() =>
                              updateProfile(
                                {
                                  ...profile,
                                  assignments: [
                                    ...profile.assignments!,
                                    {
                                      assignments: [
                                        {
                                          consoleType: {
                                            consoleType: null,
                                            forcedType: proto.ConsoleMode.ModePs4,
                                          },
                                        },
                                      ],
                                    },
                                  ],
                                },
                                profileIdx
                              )
                            }
                          >
                            {t('assignments.preset_usb_ps4')}
                          </Menu.Item>
                          {hasBluetooth && (
                            <Menu.Item
                              leftSection={<IconBluetooth size={14} />}
                              onClick={() =>
                                updateProfile(
                                  {
                                    ...profile,
                                    assignments: [
                                      ...profile.assignments!,
                                      {
                                        assignments: [
                                          { bluetooth: proto.BluetoothMode.BTStandard },
                                        ],
                                      },
                                    ],
                                  },
                                  profileIdx
                                )
                              }
                            >
                              {t('assignments.preset_bluetooth')}
                            </Menu.Item>
                          )}
                          {hasWii && (
                            <Menu.Item
                              leftSection={<IconSparkles size={14} />}
                              onClick={() =>
                                updateProfile(
                                  {
                                    ...profile,
                                    assignments: [
                                      ...profile.assignments!,
                                      {
                                        assignments: [
                                          {
                                            consoleType: {
                                              consoleType: null,
                                              forcedType: null,
                                              xinputOnWindows: true,
                                              ps4OrPs5Mode: false,
                                            },
                                          },
                                          { wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar },
                                        ],
                                      },
                                    ],
                                  },
                                  profileIdx
                                )
                              }
                            >
                              {t('assignments.preset_wii_adapter')}
                            </Menu.Item>
                          )}

                          {hasPsx && (
                            <Menu.Item
                              leftSection={<IconSparkles size={14} />}
                              onClick={() =>
                                updateProfile(
                                  {
                                    ...profile,
                                    assignments: [
                                      ...profile.assignments!,
                                      {
                                        assignments: [
                                          {
                                            consoleType: {
                                              consoleType: null,
                                              forcedType: null,
                                              xinputOnWindows: true,
                                              ps4OrPs5Mode: false,
                                            },
                                          },
                                          {
                                            ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeGuitar,
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                  profileIdx
                                )
                              }
                            >
                              {t('assignments.preset_ps2_adapter')}
                            </Menu.Item>
                          )}
                          <Menu.Item
                            leftSection={<IconSparkles size={14} />}
                            onClick={() =>
                              updateProfile(
                                {
                                  ...profile,
                                  assignments: [
                                    ...profile.assignments!,
                                    {
                                      assignments: [
                                        {
                                          consoleType: {
                                            consoleType: null,
                                            forcedType: null,
                                            xinputOnWindows: true,
                                            ps4OrPs5Mode: false,
                                          },
                                        },
                                        { input: { input: {} } },
                                      ],
                                    },
                                  ],
                                },
                                profileIdx
                              )
                            }
                          >
                            {t('assignments.preset_boot_switch')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                    <Group gap="md" align="center">
                      <ExpandCollapseAll cards={ruleCards} />
                      <Anchor component={Link} to="/setup?step=assignments" size="sm">
                        {t('assignments.learnMore')}
                      </Anchor>
                    </Group>
                  </Group>
                  {selectionBar('assignments')}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Space h="md" />
                  {(profile.opts?.deviceSlotIdVersion ?? 0) < 2 && (
                    <>
                      <Alert
                        variant="light"
                        color="yellow"
                        title={t('assignments.oldSlotIdsTitle')}
                        icon={errorIcon}
                      >
                        <Stack gap="xs" align="flex-start">
                          {t('assignments.oldSlotIds')}
                          <Button
                            size="xs"
                            onClick={() => updateProfile(migrateSlotIds(profile), profileIdx)}
                          >
                            {t('assignments.migrateSlotIds')}
                          </Button>
                        </Stack>
                      </Alert>
                      <Space h="md" />
                    </>
                  )}
                  {profile.assignments?.length === 0 && (
                    <>
                      <Alert variant="light" color="red" title={t('common.error')} icon={errorIcon}>
                        {t('assignments.missing')}
                      </Alert>
                      <Space h="md" />
                    </>
                  )}
                  <Group align="flex-start" gap="md">
                    <DndContext {...dndProps('assignments')}>
                      <SortableContext
                        items={profile.assignments!.map((_, mappingIdx) => mappingIdx)}
                        strategy={sortingStrategy('assignments')}
                      >
                        {profile.assignments?.map((mapping, mappingIdx) => (
                          <Group key={mappingIdx} align="center" gap="md" maw="100%">
                            {mappingIdx > 0 && (
                              <Badge size="lg" variant="filled" color="gray">
                                {t('assignments.logic_or')}
                              </Badge>
                            )}
                            <SantrollerAssignmentList
                              key={mappingIdx}
                              mapping={mapping}
                              profileIdx={profileIdx}
                              listIdx={mappingIdx}
                              expanded={ruleCards.isOpen(mappingIdx)}
                              onToggleExpanded={() => ruleCards.toggle(mappingIdx)}
                              mode={profile.opts.faceButtonMappingMode}
                              type={profile.opts.deviceToEmulate}
                              legendMode={legendMode}
                              dispatch={(val) =>
                                updateProfile(
                                  {
                                    ...profile,
                                    assignments: [
                                      ...profile.assignments!.map((cMapping, cMappingIdx) =>
                                        cMappingIdx === mappingIdx ? val : cMapping
                                      ),
                                    ],
                                  },
                                  profileIdx
                                )
                              }
                              deleteAssignment={() => deleteFromList('assignments', mappingIdx)}
                              {...selectProps('assignments', mappingIdx)}
                              copyAssignment={() =>
                                updateProfile(
                                  {
                                    ...profile,
                                    assignments: [...profile.assignments!, { ...mapping }],
                                  },
                                  profileIdx
                                )
                              }
                            />
                          </Group>
                        ))}
                      </SortableContext>
                      {dragPreview('assignments')}
                    </DndContext>
                  </Group>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </>
      )}

      {!standby && (
        <>
          <Divider my="xl" />
          <Table
            stickyHeader
            stickyHeaderOffset={STICKY_HEADER_OFFSET}
            withRowBorders={false}
            layout="fixed"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <Group justify="space-between" align="center" gap="sm">
                    <Group gap="sm" align="center">
                      <Title order={2} size="h3">
                        {t('inputs.title')}
                      </Title>
                      {!simpleMode && (
                        <>
                          <Button
                            variant="filled"
                            onClick={() =>
                              updateProfile(
                                {
                                  ...profile,
                                  mappings: [
                                    ...profile.mappings!,
                                    {
                                      mapping: {},
                                      input: {
                                        gpio: {
                                          analog: false,
                                          pin: -1,
                                          pinMode: proto.PinMode.PullUp,
                                        },
                                      },
                                    },
                                  ],
                                },
                                profileIdx
                              )
                            }
                          >
                            {t('inputs.add')}
                          </Button>
                          <Menu shadow="md" width={320}>
                            <Menu.Target>
                              <Button variant="filled" rightSection={<IconChevronDown size={14} />}>
                                {t('defaults_dialog.load')}
                              </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                onClick={() => {
                                  setDefaultTarget(undefined);
                                  open();
                                }}
                              >
                                {t('defaults_dialog.type', {
                                  type: t(`subType.${proto.SubType[profile.opts.deviceToEmulate]}`),
                                })}
                              </Menu.Item>
                              <DeviceDefaultsItems
                                profile={profile}
                                slots={profileSlots}
                                onPick={(item) => {
                                  setDefaultTarget(item);
                                  open();
                                }}
                              />
                            </Menu.Dropdown>
                          </Menu>
                        </>
                      )}
                    </Group>
                    <ExpandCollapseAll cards={mappingCards} />
                  </Group>
                  {selectionBar('mappings')}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Space h="md" />
                  <Group align="stretch">
                    {simpleMode &&
                      profile.mappings?.map((mapping, mappingIdx) => (
                        <SantrollerMapping
                          key={mappingIdx}
                          mapping={mapping}
                          type={profile.opts.deviceToEmulate}
                          profileIdx={profileIdx}
                          mappingIdx={mappingIdx}
                          expanded={mappingCards.isOpen(mappingIdx)}
                          onToggleExpanded={() => mappingCards.toggle(mappingIdx)}
                          legendMode={legendMode}
                          mode={profile.opts.faceButtonMappingMode}
                          dispatch={(val) => {
                            if (syncCalibrations) {
                              updateProfiles([
                                ...profiles.map((profilea) => ({
                                  ...profilea,
                                  mappings: [
                                    ...profilea.mappings!.map((cMapping, cMappingIdx) =>
                                      cMappingIdx === mappingIdx
                                        ? val
                                        : inputKey(cMapping.input) === inputKey(val.input) &&
                                            cMapping.trigger === val.trigger
                                          ? {
                                              ...cMapping,
                                              center: val.center,
                                              deadzone: val.deadzone,
                                              min: val.min,
                                              max: val.max,
                                            }
                                          : cMapping
                                    ),
                                  ],
                                  assignments: [
                                    ...profilea.assignments!.map((cMapping, _) => ({
                                      ...cMapping,
                                      assignments: [
                                        ...cMapping.assignments!.map((cAssignment, _) =>
                                          inputKey(cAssignment.input?.input) ===
                                            inputKey(val.input) &&
                                          cAssignment.input?.trigger === val.trigger
                                            ? {
                                                ...cAssignment,
                                                input: {
                                                  ...cAssignment!.input!,
                                                  center: val.center,
                                                  deadzone: val.deadzone,
                                                  min: val.min,
                                                  max: val.max,
                                                },
                                              }
                                            : cAssignment
                                        ),
                                      ],
                                    })),
                                  ],
                                  leds: [
                                    ...profilea.leds!.map((cMapping, _) =>
                                      inputKey(cMapping.mapping.inputMapping?.input) ===
                                      inputKey(val.input)
                                        ? {
                                            ...cMapping,
                                            mapping: {
                                              ...cMapping.mapping,
                                              inputMapping: {
                                                ...cMapping.mapping.inputMapping!,
                                                center: val.center,
                                                deadzone: val.deadzone,
                                                min: val.min,
                                                max: val.max,
                                              },
                                            },
                                          }
                                        : cMapping
                                    ),
                                  ],
                                })),
                              ]);
                            } else {
                              updateProfile(
                                {
                                  ...profile,
                                  mappings: [
                                    ...profile.mappings!.map((cMapping, cMappingIdx) =>
                                      cMappingIdx === mappingIdx ? val : cMapping
                                    ),
                                  ],
                                },
                                profileIdx
                              );
                            }
                          }}
                          deleteInput={() => deleteFromList('mappings', mappingIdx)}
                          copyInput={() =>
                            updateProfile(
                              {
                                ...profile,
                                mappings: [...profile.mappings!, { ...mapping }],
                              },
                              profileIdx
                            )
                          }
                        />
                      ))}
                    {!simpleMode && (
                      <DndContext {...dndProps('mappings')}>
                        <SortableContext
                          items={profile.mappings!.map((_, mappingIdx) => mappingIdx)}
                          strategy={sortingStrategy('mappings')}
                        >
                          {profile.mappings?.map((mapping, mappingIdx) => (
                            <SantrollerMapping
                              key={mappingIdx}
                              mapping={mapping}
                              type={profile.opts.deviceToEmulate}
                              profileIdx={profileIdx}
                              mappingIdx={mappingIdx}
                              expanded={mappingCards.isOpen(mappingIdx)}
                              onToggleExpanded={() => mappingCards.toggle(mappingIdx)}
                              mode={profile.opts.faceButtonMappingMode}
                              legendMode={legendMode}
                              dispatch={(val) => {
                                if (syncCalibrations) {
                                  updateProfiles([
                                    ...profiles.map((profilea, profileIdxa) => ({
                                      ...profilea,
                                      mappings: [
                                        ...profilea.mappings!.map((cMapping, cMappingIdx) =>
                                          cMappingIdx === mappingIdx && profileIdxa === profileIdx
                                            ? val
                                            : inputKey(cMapping.input) === inputKey(val.input) &&
                                                cMapping.trigger === val.trigger
                                              ? {
                                                  ...cMapping,
                                                  center: val.center,
                                                  deadzone: val.deadzone,
                                                  min: val.min,
                                                  max: val.max,
                                                }
                                              : cMapping
                                        ),
                                      ],
                                      assignments: [
                                        ...profilea.assignments!.map((cMapping, _) => ({
                                          ...cMapping,
                                          assignments: [
                                            ...cMapping.assignments!.map((cAssignment, _) =>
                                              inputKey(cAssignment.input?.input) ===
                                                inputKey(val.input) &&
                                              cAssignment.input?.trigger === val.trigger
                                                ? {
                                                    ...cAssignment,
                                                    input: {
                                                      ...cAssignment!.input!,
                                                      center: val.center,
                                                      deadzone: val.deadzone,
                                                      min: val.min,
                                                      max: val.max,
                                                    },
                                                  }
                                                : cAssignment
                                            ),
                                          ],
                                        })),
                                      ],
                                      leds: [
                                        ...profilea.leds!.map((cMapping, _) =>
                                          inputKey(cMapping.mapping.inputMapping?.input) ===
                                          inputKey(val.input)
                                            ? {
                                                ...cMapping,
                                                mapping: {
                                                  ...cMapping.mapping,
                                                  inputMapping: {
                                                    ...cMapping.mapping.inputMapping!,
                                                    center: val.center,
                                                    deadzone: val.deadzone,
                                                    min: val.min,
                                                    max: val.max,
                                                  },
                                                },
                                              }
                                            : cMapping
                                        ),
                                      ],
                                    })),
                                  ]);
                                } else {
                                  updateProfile(
                                    {
                                      ...profile,
                                      mappings: [
                                        ...profile.mappings!.map((cMapping, cMappingIdx) =>
                                          cMappingIdx === mappingIdx ? val : cMapping
                                        ),
                                      ],
                                    },
                                    profileIdx
                                  );
                                }
                              }}
                              deleteInput={() => deleteFromList('mappings', mappingIdx)}
                              {...selectProps('mappings', mappingIdx)}
                              copyInput={() =>
                                updateProfile(
                                  {
                                    ...profile,
                                    mappings: [...profile.mappings!, { ...mapping }],
                                  },
                                  profileIdx
                                )
                              }
                            />
                          ))}
                        </SortableContext>
                        {dragPreview('mappings')}
                      </DndContext>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </>
      )}
      {(!simpleMode || !!profile.leds?.length) && (
        <>
          <Divider my="xl" />
          <Table
            stickyHeader
            stickyHeaderOffset={STICKY_HEADER_OFFSET}
            withRowBorders={false}
            layout="fixed"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <Group justify="space-between" align="center" gap="sm">
                    <Group gap="sm" align="center">
                      <Title order={2} size="h3">
                        {t('leds.label')}
                      </Title>
                      {!simpleMode && (
                        <>
                          <Button
                            variant="filled"
                            onClick={() =>
                              updateProfile(
                                {
                                  ...profile,
                                  leds: [
                                    ...profile.leds!,
                                    {
                                      device: {
                                        gpio: {
                                          analog: false,
                                          pin: -1,
                                        },
                                      },
                                      mapping: {
                                        inputMapping: {
                                          input: {
                                            gpio: {
                                              analog: false,
                                              pin: 0,
                                              pinMode: proto.PinMode.PullUp,
                                            },
                                          },
                                          max: 65535,
                                          min: 0,
                                        },
                                      },
                                    },
                                  ],
                                },
                                profileIdx
                              )
                            }
                          >
                            {t('leds.add')}
                          </Button>
                          <Button
                            variant="filled"
                            disabled={!connected || !profile.leds?.length}
                            onClick={() => testLed(profileIdx, undefined, 2000)}
                          >
                            {t('leds.test_all')}
                          </Button>
                        </>
                      )}
                    </Group>
                    <ExpandCollapseAll cards={ledCards} />
                  </Group>
                  {selectionBar('leds')}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Space h="md" />
                  <Group align="stretch">
                    <DndContext {...dndProps('leds')}>
                      <SortableContext
                        items={profile.leds!.map((_, ledIdx) => ledIdx)}
                        strategy={sortingStrategy('leds')}
                      >
                        {profile.leds?.map((led, ledIdx) => (
                          <SantrollerLed
                            key={ledIdx}
                            led={led}
                            profileIdx={profileIdx}
                            ledIdx={ledIdx}
                            expanded={ledCards.isOpen(ledIdx)}
                            onToggleExpanded={() => ledCards.toggle(ledIdx)}
                            mode={profile.opts.faceButtonMappingMode}
                            type={profile.opts.deviceToEmulate}
                            standby={standby}
                            legendMode={legendMode}
                            dispatch={(val) =>
                              updateProfile(
                                {
                                  ...profile,
                                  leds: [
                                    ...profile.leds!.map((cLed, cLedIdx) =>
                                      cLedIdx === ledIdx ? val : cLed
                                    ),
                                  ],
                                },
                                profileIdx
                              )
                            }
                            deleteLed={() => deleteFromList('leds', ledIdx)}
                            {...selectProps('leds', ledIdx)}
                            copyInput={() =>
                              updateProfile(
                                {
                                  ...profile,
                                  leds: [...profile.leds!, { ...led }],
                                },
                                profileIdx
                              )
                            }
                          />
                        ))}
                      </SortableContext>
                      {dragPreview('leds')}
                    </DndContext>
                  </Group>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </>
      )}
    </>
  );
}

const skippedProfileUids = new Set<number>();

export function InputsPage() {
  const activeProfile = useConfigStore((state) => state.currentProfile);
  const profiles = useConfigStore((state) => state.config.profiles!);
  const updateProfile = useConfigStore((state) => state.updateProfile);
  const pollInputs = useConfigStore((state) => state.pollInputs);
  const [, setSkippedProfilesVersion] = useState(0);

  const [loaded, setLoaded] = useState(false);
  // Give the loader a sec to render before rendering the rest of the page
  useTimeout(
    () => {
      setLoaded(true);
      pollInputs(true);
    },
    1,
    { autoInvoke: true }
  );
  if (!profiles[activeProfile]) {
    return <Navigate to="/" />;
  }
  if (!loaded) {
    return (
      <Layout>
        <RequireDevice>
          <Loader />
        </RequireDevice>
      </Layout>
    );
  }

  const profile = profiles[activeProfile];
  // Standby lighting never has mappings, and has nothing for the wizard to set up
  const isBlank =
    !profile.opts?.standbyLighting &&
    (!profile.mappings || profile.mappings.length === 0) &&
    !skippedProfileUids.has(profile.opts?.uid ?? activeProfile);

  return (
    <Layout>
      <RequireDevice>
        {isBlank ? (
          <BlankProfileWizard
            key={`wizard-${profile.opts?.uid ?? activeProfile}`}
            profile={profile}
            profileIdx={activeProfile}
            onSkip={() => {
              skippedProfileUids.add(profile.opts?.uid ?? activeProfile);
              setSkippedProfilesVersion((v) => v + 1);
            }}
            updateProfile={updateProfile}
          />
        ) : (
          <Profile
            key={`profile-${profile.opts?.uid ?? activeProfile}`}
            profileIdx={activeProfile}
          />
        )}
      </RequireDevice>
    </Layout>
  );
}
