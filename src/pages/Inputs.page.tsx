import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconBluetooth,
  IconChevronDown,
  IconCopy,
  IconDeviceGamepad,
  IconExclamationCircle,
  IconGripVertical,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconUsb,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  ColorInput,
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
  Title,
  useCombobox,
} from '@mantine/core';
import { useDisclosure, useTimeout } from '@mantine/hooks';
import { isInputDeviceKind } from '@/components/Devices/deviceRegistry';
import {
  getLabel,
  getMatrixLabel,
  getMultiplexerLabel,
  hasDefaults,
  isLed,
  PinBox,
} from '@/components/Devices/Pins';
import { DropdownBox, StandardEnum } from '@/components/Inputs/DropdownBox';
import { RegisteredInputEditor } from '@/components/Inputs/InputEditorRegistry';
import {
  createDeviceInput,
  createStandaloneInput,
  getInputDeviceId,
  isAnalogInput,
} from '@/components/Inputs/inputRegistry';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { proto } from '@/components/SettingsContext/config';
import {
  DeviceStatus,
  ps4Subtypes,
  useConfigStore,
} from '@/components/SettingsContext/SettingsContext';
import { ASCII_TO_HID } from '@/devices/keyboard';
import { AllPinsNamed, AnalogPinsNamed } from '@/devices/pico/pins';

const hidReverse = Object.fromEntries(Object.entries(ASCII_TO_HID).map(([k, v]) => [v.code, k]));
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
  const state = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.state
      : activationBased
        ? state.activationStatus[profileIdx][listIdx!][mappingIdx]?.state
        : zeroBased
          ? state.mappingStatus[profileIdx][mappingIdx]?.stateNonZero
          : state.mappingStatus[profileIdx][mappingIdx]?.state
  );
  return <span>{raw ? stateRaw : state}</span>;
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
  const state = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.state
      : activationBased
        ? state.activationStatus[profileIdx][listIdx!][mappingIdx]?.state
          ? 65535
          : 0
        : zeroBased
          ? state.mappingStatus[profileIdx][mappingIdx]?.stateNonZero
          : state.mappingStatus[profileIdx][mappingIdx]?.state
  );
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
        <Progress.Section value={(stateRaw / 65535) * 100} />
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
        <Progress.Section value={(stateRaw / 65535) * 100} />
        <Overlay
          gradient={`linear-gradient(90deg, rgba(255, 0, 0, 0.2) ${minPerc}%, rgba(0, 0, 0, 0) ${minPerc}%, rgba(0, 0, 0, 0) ${deadZoneStartPerc}%, rgba(255, 0, 0, 0.2) ${deadZoneStartPerc}%, rgba(255, 0, 0, 0.2) ${deadZoneEndPerc}%,  rgba(255, 0, 0, 0) ${deadZoneEndPerc}%, rgba(0, 0, 0, 0) ${maxPerc}%, rgba(255, 0, 0, 0.2) ${maxPerc}%)`}
          opacity={0.85}
        />
      </>
    );
  }
  return <Progress.Section value={(state / 65535) * 100} />;
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
  if (raw) {
    return (
      <>
        <Text size="sm" fw={700}>
          Raw Value
        </Text>
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
      <Text size="sm" fw={700}>
        Value
      </Text>
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
  dispatch: (mapping: proto.IOutput, trigger: boolean, analog: boolean) => void;
  dispatchMidi?: (input: Omit<proto.IMidiInput, 'deviceid'>) => void;
}) {
  const { t } = useTranslation();
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
    case proto.SubType.Gamepad:
    case proto.SubType.Dancepad:
    case proto.SubType.StageKit:
      return (
        <DropdownOutputBox
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
    case proto.SubType.ProGuitarSquire:
      return (
        <DropdownOutputBox
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
    case proto.SubType.ProKeys:
      return (
        <DropdownOutputBox
          label={label}
          title={title}
          extraOptions={
            midi
              ? undefined
              : [
                  {
                    value: 'ProKeyboard_Keys',
                    label: t('outputs.ProKeyboard_Keys', 'All Keys (Root Note)'),
                  },
                  {
                    value: 'ProKeyboard_Key',
                    label: t('outputs.ProKeyboard_Key', 'Single Key'),
                  },
                ]
          }
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
    case proto.SubType.Taiko:
      break;
    case proto.SubType.KeyboardMouse:
      return (
        <TextInput
          label={t('keyboard.keycode')}
          value={hidReverse[mapping?.keycode ?? 0]}
          onKeyDown={(event) => {
            dispatch({ keycode: ASCII_TO_HID[event.key].code }, true, false);
          }}
        />
      );
    case proto.SubType.Wheel:
      break;
    case proto.SubType.DisneyInfinity:
    case proto.SubType.Skylanders:
    case proto.SubType.LegoDimensions:
      return <></>;
  }
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
  const outputCombobox = useCombobox({
    onDropdownClose: () => outputCombobox.resetSelectedOption(),
  });
  return (
    <OutputBox
      label="outputs"
      title="output"
      mapping={mapping.mapping}
      type={type}
      mode={mode}
      legendMode={legendMode}
      dispatch={(m, trigger, _) =>
        dispatch({
          center: trigger ? 0 : 32767,
          min: 0,
          max: 65535,
          ...mapping,
          pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
          mapping: m,
        })
      }
    />
  );
}
function DropdownOutputBox<
  T extends StandardEnum<unknown>,
  T2 extends StandardEnum<unknown>,
  T3 extends StandardEnum<unknown>,
  T4 extends StandardEnum<unknown>,
>({
  e,
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
}: {
  e?: T;
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
}) {
  const { t } = useTranslation();
  const inputCombobox = useCombobox({
    onDropdownOpen: () =>
      inputCombobox.updateSelectedOptionIndex('selected', { scrollIntoView: true }),
  });
  const v = (valExtra ||
    (e && e[val as keyof T]) ||
    (e2 && e2[val2 as keyof T2]) ||
    (e3 && e3[val3 as keyof T3]) ||
    (e4 && e4[val4 as keyof T4]) ||
    (valMidi && Object.entries(valMidi).find((x) => x[0] !== 'deviceid' && x[1])?.[0])) as string;
  const extraLabel = extraOptions?.find((x) => x.value === v)?.label;
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
        {extraLabel ||
          t(
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
        {extraLabel || t(`${label}.${v}`)}
      </InputBase>
    );
  return (
    <Combobox
      store={inputCombobox}
      onOptionSubmit={(val) => {
        if (extraOptions?.some((x) => x.value === val) && dispatchExtra) {
          dispatchExtra(val);
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
          {midi && (
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
            Object.keys(e).map((item) => (
              <Combobox.Option value={item} key={item} selected={item === v}>
                {t(
                  `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, type, item, legendMode)}`
                )}
              </Combobox.Option>
            ))}
          {e2 &&
            Object.keys(e2).map((item) => (
              <Combobox.Option value={item} key={item} selected={item === v}>
                {t(
                  `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, type, item, legendMode)}`
                )}
              </Combobox.Option>
            ))}
          {e3 &&
            Object.keys(e3).map((item) => (
              <Combobox.Option value={item} key={item} selected={item === v}>
                {t(
                  `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, type, item, legendMode)}`
                )}
              </Combobox.Option>
            ))}
          {e4 &&
            Object.keys(e4).map((item) => (
              <Combobox.Option value={item} key={item} selected={item === v}>
                {t(
                  `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, type, item, legendMode)}`
                )}
              </Combobox.Option>
            ))}
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

function SantrollerLabel({
  input,
  label,
  fallback = true,
}: {
  input: proto.IInput;
  label: string;
  fallback?: boolean;
}) {
  const deviceId = getInputDeviceId(input) ?? -1;
  const { t } = useTranslation();
  const device = useConfigStore((state) => state.deviceStatus[deviceId]);
  const guiDevices = useConfigStore((state) => state.guiDevices);

  if (device) {
    switch (device.type) {
      case 'ads1115': {
        const labelsText = getMultiplexerLabel(
          Object.values(guiDevices),
          input.ads1115!.channel,
          true,
          false
        );
        if (labelsText) {
          return <Text>{labelsText}</Text>;
        }
        return <Text>{t('multiplexer.channel', { channel: input.ads1115?.channel })}</Text>;
      }
      case 'multiplexer': {
        const labelsText2 = getMultiplexerLabel(
          Object.values(guiDevices),
          input.multiplexer!.channel,
          true,
          false
        );
        if (labelsText2) {
          return <Text>{labelsText2}</Text>;
        }
        return <Text>{input.multiplexer?.channel}</Text>;
      }
      case 'vtechExpander':
        return <Text>{input.vtechExpander?.button}</Text>;
      case 'matrix': {
        const labelsText3 = getMatrixLabel(
          Object.values(guiDevices),
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
          return <Text>CC {input.midi.midiControlChange.cc}</Text>;
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
      case 'cycle':
        return <Text>{input.cycle?.input?.gpio?.pin}</Text>;
      case 'toggle':
        return <Text>{input.toggle?.input?.gpio?.pin}</Text>;
    }
  }
  if (input.gpio) {
    const labelsText = getLabel(t, Object.values(guiDevices), [], input.gpio.pin, true, false);
    if (labelsText || !fallback) {
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
  if (input.midi?.midiProGuitarAxis?.axis != null) {
    return (
      <Text>
        {t(`input.midiProGuitarAxis.${proto.ProGuitarAxisType[input.midi.midiProGuitarAxis.axis]}`)}
      </Text>
    );
  }
  return fallback ? <Text>{t(`outputs.${label}`)}</Text> : null;
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
  const deviceStatus = useConfigStore.getState().deviceStatus;
  const detectPins = useConfigStore.getState().detectPins;
  const detected = useConfigStore.getState().detected;
  const detectedMapping = useConfigStore.getState().detectedMapping;
  const detectedInnerMapping = useConfigStore.getState().detectedInnerMapping;
  const detectedActivation = useConfigStore.getState().detectedActivation;
  const detectedLed = useConfigStore.getState().detectedLed;
  const detecting = useConfigStore((state) => state.detecting);
  const device = useConfigStore((state) => state.deviceStatus[deviceId]);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const deviceCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  const pinModeCombobox = useCombobox({
    onDropdownClose: () => pinModeCombobox.resetSelectedOption(),
  });
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
  } else if (input.mouseAxis) {
    deviceValue = <Text>{t(`devices.mouseAxis`)}</Text>;
  } else if (input.mouseButton) {
    deviceValue = <Text>{t(`devices.mouseButton`)}</Text>;
  } else if (input.key) {
    deviceValue = <Text>{t(`devices.key`)}</Text>;
  } else if (input.shortcut) {
    deviceValue = <Text>{t(`devices.shortcut`)}</Text>;
  } else if (input.held) {
    deviceValue = <Text>{t(`devices.held`)}</Text>;
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
  }
  if (
    detectedMapping !== undefined &&
    detectedMapping === mappingIdx &&
    (innerIdx === null || detectedInnerMapping === innerIdx) &&
    detected !== -1 &&
    input.gpio
  ) {
    dispatch({ gpio: { ...input.gpio!, pin: detected } });
  }
  if (
    detectedActivation !== undefined &&
    detectedActivation === activationIdx &&
    (innerIdx === null || detectedInnerMapping === innerIdx) &&
    detected !== -1 &&
    input.gpio
  ) {
    dispatch({ gpio: { ...input.gpio!, pin: detected } });
  }
  if (
    detectedLed !== undefined &&
    detectedLed === ledIdx &&
    detected !== -1 &&
    (innerIdx === null || detectedInnerMapping === innerIdx) &&
    input.gpio
  ) {
    dispatch({ gpio: { ...input.gpio!, pin: detected } });
  }
  return (
    <>
      {(deviceCombobox.dropdownOpened && (
        <Combobox
          store={deviceCombobox}
          onOptionSubmit={(val) => {
            deviceCombobox.closeDropdown();
            if (isNumberLike(val)) {
              const deviceid = parseInt(val, 10);
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
              {Object.values(deviceStatus)
                .filter((status) => isInputDeviceKind(status.type))
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
            <Card shadow="sm" padding="lg" radius="md" withBorder w="380px" h="100%">
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
      {input.cycle && (
        <>
          <SegmentedControl
            data={device.device.cycle!.values!.map((x) => x.toString())}
            value={device.device.cycle!.values![
              deviceStatus[input.cycle.deviceid].cycleState
            ].toString()}
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
          <Switch checked={deviceStatus[input.toggle.deviceid].toggleState} />
          <Switch
            label={t('cycle.forward_input')}
            checked={input.toggle.input !== null}
            onChange={(event) => {
              dispatch({
                toggle: {
                  ...input.toggle!,
                  input: event.currentTarget.checked
                    ? { gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp } }
                    : null,
                },
              });
            }}
          />
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
        device?.type === 'midiSerial') && (
        <DropdownOutputBox
          title="input"
          valMidi={input.midi ?? undefined}
          label={`${device?.type}.inputs`}
          midi
          legendMode={legendMode}
          type={type}
          dispatch={(_) => {}}
          dispatch2={(_) => {}}
          dispatchMidi={(midi) =>
            dispatch({
              midi: { ...midi!, deviceid: deviceId },
            })
          }
        />
      )}
      {device?.type === 'wii' && (
        <DropdownOutputBox
          title="input"
          e={proto.WiiAxisType}
          e2={proto.WiiButtonType}
          legendMode={legendMode}
          type={type}
          val={input.wiiAxis?.axis}
          val2={input.wiiButton?.button}
          valMidi={input.midi ?? undefined}
          label="wii.inputs"
          midi
          dispatch={(axis) =>
            dispatch({ wiiAxis: { ...input.wiiAxis!, axis, deviceid: deviceId } })
          }
          dispatch2={(button) =>
            dispatch({ wiiButton: { ...input.wiiButton!, button, deviceid: deviceId } })
          }
          dispatchMidi={(midi) =>
            dispatch({
              midi: { ...midi!, deviceid: deviceId },
            })
          }
        />
      )}
      {(input.ps2Axis || input.ps2Button) && (
        <DropdownOutputBox
          title="input"
          e={proto.PS2AxisType}
          e2={proto.PS2ButtonType}
          val={input.ps2Axis?.axis}
          val2={input.ps2Button?.button}
          label="ps2.inputs"
          legendMode={legendMode}
          type={type}
          dispatch={(axis) =>
            dispatch({ ps2Axis: { ...input.ps2Axis!, axis, deviceid: deviceId } })
          }
          dispatch2={(button) =>
            dispatch({ ps2Button: { ...input.ps2Button!, button, deviceid: deviceId } })
          }
        />
      )}
      {device?.type === 'usbHost' && (
        <OutputBox
          label="outputs"
          title="input"
          valMidi={input.midi ?? undefined}
          dispatch={(mapping, _, analog) =>
            dispatch(
              analog
                ? {
                    usbAxis: {
                      deviceid: (input.usbAxis?.deviceid || input.usbButton?.deviceid)!,
                      axis: mapping,
                    },
                  }
                : {
                    usbButton: {
                      deviceid: (input.usbAxis?.deviceid || input.usbButton?.deviceid)!,
                      button: mapping,
                    },
                  }
            )
          }
          dispatchMidi={(midi) =>
            dispatch({
              midi: { ...midi!, deviceid: deviceId },
            })
          }
          midi
          type={type}
          mode={mode}
          mapping={input.usbAxis?.axis || input.usbButton?.button}
          legendMode={legendMode}
        />
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
              Object.entries(AllPinsNamed).filter(
                (x) => device.device.matrix!.inPins! & (1 << parseInt(x[0], 10))
              )
            )}
            dispatch={(pin) => dispatch({ matrix: { ...input.matrix!, pin } })}
          />
          <PinBox
            label={t('matrix.output_pin')}
            pin={input.matrix.outputPin}
            valid={Object.fromEntries(
              Object.entries(AllPinsNamed).filter(
                (x) => device.device.matrix!.outPins! & (1 << parseInt(x[0], 10))
              )
            )}
            dispatch={(pin) => dispatch({ matrix: { ...input.matrix!, outputPin: pin } })}
          />
        </>
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
                      {t('multiplexer.channel', { channel: i + 1 })}
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
                  {[...Array(device.device.multiplexer?.sixteenChannel ? 16 : 8)].map((_, i) => (
                    <Combobox.Option key={i} value={i.toString()}>
                      {t('multiplexer.channel', { channel: i + 1 })}
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
        </>
      )}
      {input.midi?.midiPitchBend && (
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
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({
    id: mappingIdx,
  });

  const simpleMode = useConfigStore((state) => state.simpleMode);
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isSorting ? transition : '',
    alignSelf: 'stretch',
  };
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const label =
    proto.GamepadButtonType[mapping.mapping.gamepadButton ?? -1] ||
    proto.GamepadAxisType[mapping.mapping.gamepadAxis ?? -1] ||
    proto.GuitarHeroGuitarButtonType[mapping.mapping.ghButton ?? -1] ||
    proto.GuitarHeroGuitarAxisType[mapping.mapping.ghAxis ?? -1] ||
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
    proto.ProKeyboardButtonType[mapping.mapping.proKeyboardButton ?? -1];
  const fixedLabel = FixLabel(mode, type, label, legendMode);
  const img = `Icons/Input/${FixIcon(mode, type, label, legendMode)}.png`;
  const button = Object.entries(mapping.mapping).find(([k, v]) => k.endsWith('Button') && v);
  const axis =
    mapping.mapping.proKeySingle != null ||
    Object.entries(mapping.mapping).find(([k, v]) => k.endsWith('Axis') && v);
  const stick = label?.includes('Stick');
  const drum =
    label?.includes('Pad') ||
    label?.includes('Cymbal') ||
    mapping.mapping.ghDrumAxis === proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_KickPedal;
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
  const crkdRaw =
    (status?.crkdDrumCalibration &&
      status.crkdDrumCalibration[proto.CrkdDrumCalibrationType.RawValue][crkdAxis]) ||
    0;
  const isPressed = useConfigStore(
    (state) => !!state.mappingStatus[profileIdx]?.[mappingIdx]?.state
  );
  if (drum && crkdDrum) {
    if (mapping.debounce) {
      dispatch({
        ...mapping,
        debounce: 0,
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
      <Card shadow="sm" padding="lg" radius="md" withBorder w="420px" h="100%">
        <Group justify="space-between" align="center" mb="xs">
          <Group gap="xs">
            {!simpleMode && (
              <div {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                <IconGripVertical size={18} stroke={1.5} />
              </div>
            )}
            <Title order={4}>{t('inputs.mapping_title', { num: mappingIdx + 1 })}</Title>
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
          {!simpleMode && (
            <Group gap={4}>
              <ActionIcon variant="subtle" onClick={copyInput} title="Copy">
                <IconCopy size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="red" onClick={open} title="Delete">
                <IconTrash size={18} />
              </ActionIcon>
            </Group>
          )}
        </Group>

        <Card padding="xs" radius="sm" withBorder mb="sm" bg="var(--mantine-color-default-hover)">
          <Group justify="space-between" wrap="nowrap">
            <Text size="xs" fw={500} c="dimmed">
              {t('inputs.target_output')}:
            </Text>
            <Badge variant="light" color="blue" size="sm">
              {fixedLabel ? t(`outputs.${fixedLabel}`) : t('inputs.unmapped')}
            </Badge>
          </Group>
        </Card>

        <Center py="xs">
          <Image src={img} height={70} w="auto" fit="contain" alt={fixedLabel || 'input'} />
        </Center>

        {simpleMode && (
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
            zeroBased={drum && !!analogInput}
          />
        )}
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
                  debounce: drum ? (mapping.debounce ?? 30) : undefined,
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
            value={mapping.debounce ?? 0}
            onChange={(val) => dispatch({ ...mapping, debounce: Number(val) })}
          />
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
                <Accordion.Control>Button Mapping</Accordion.Control>
                <Accordion.Panel>
                  <>
                    {!simpleMode && (
                      <DropdownBox
                        title="trigger_type.label"
                        e={proto.AnalogToDigitalTriggerType}
                        val={mapping.trigger!}
                        label="trigger_type"
                        dispatch={(trigger) => dispatch({ ...mapping, trigger })}
                      />
                    )}

                    {mapping.trigger === proto.AnalogToDigitalTriggerType.JoyHigh && (
                      <StateSlider
                        mappingIdx={mappingIdx}
                        profileIdx={profileIdx}
                        center={32767}
                        min={mapping.triggerValue!}
                        max={65535}
                        deadzone={mapping.deadzone!}
                        raw
                      />
                    )}
                    {mapping.trigger === proto.AnalogToDigitalTriggerType.JoyLow && (
                      <StateSlider
                        mappingIdx={mappingIdx}
                        profileIdx={profileIdx}
                        center={32767}
                        min={0}
                        max={mapping.triggerValue!}
                        deadzone={mapping.deadzone!}
                        raw
                      />
                    )}
                    {mapping.trigger === proto.AnalogToDigitalTriggerType.Range && (
                      <StateSlider
                        mappingIdx={mappingIdx}
                        profileIdx={profileIdx}
                        center={32767}
                        min={mapping.triggerValue!}
                        max={mapping.maxTriggerValue!}
                        deadzone={mapping.deadzone!}
                        raw
                      />
                    )}
                    {(mapping.trigger === proto.AnalogToDigitalTriggerType.Range && (
                      <Text size="sm" fw={700}>
                        {t('trigger.min')}
                      </Text>
                    )) || (
                      <Text size="sm" fw={700}>
                        {t('trigger.trigger')}
                      </Text>
                    )}
                    <Group>
                      <Slider
                        flex={1}
                        value={mapping.triggerValue!}
                        min={0}
                        max={65535}
                        onChange={(val) => dispatch({ ...mapping, triggerValue: val })}
                      />
                      <NumberInput
                        value={mapping.triggerValue!}
                        min={0}
                        max={65535}
                        onChange={(e) =>
                          dispatch({ ...mapping, triggerValue: parseInt(e.toString(), 10) })
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
                              useConfigStore.getState().mappingStatus[profileIdx][mappingIdx]
                                .stateRaw,
                          });
                        }}
                      >
                        {t('pin_use_current')}
                      </Button>
                    </Group>
                    {mapping.trigger === proto.AnalogToDigitalTriggerType.Range && (
                      <>
                        <Text size="sm" fw={700}>
                          {t('trigger.max')}
                        </Text>
                        <Group>
                          <Slider
                            flex={1}
                            value={mapping.maxTriggerValue!}
                            min={0}
                            max={65535}
                            onChange={(val) => dispatch({ ...mapping, maxTriggerValue: val })}
                          />

                          <NumberInput
                            value={mapping.maxTriggerValue!}
                            min={0}
                            max={65535}
                            onChange={(e) =>
                              dispatch({ ...mapping, maxTriggerValue: parseInt(e.toString(), 10) })
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
                                  useConfigStore.getState().mappingStatus[profileIdx][mappingIdx]
                                    .stateRaw,
                              });
                            }}
                          >
                            {t('pin_use_current')}
                          </Button>
                        </Group>
                      </>
                    )}
                  </>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
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
                    onChange={(e) => dispatch({ ...mapping, released: parseInt(e.toString(), 10) })}
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
                      <StateSlider
                        mappingIdx={mappingIdx}
                        profileIdx={profileIdx}
                        center={mapping.center!}
                        min={mapping.min!}
                        max={mapping.max!}
                        deadzone={mapping.deadzone!}
                        raw
                      />
                      {stick && (
                        <>
                          <Text size="sm" fw={700}>
                            Center
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
                                    useConfigStore.getState().mappingStatus[profileIdx][mappingIdx]
                                      .stateRaw,
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
                        Min
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
                              min: useConfigStore.getState().mappingStatus[profileIdx][mappingIdx]
                                .stateRaw,
                            });
                          }}
                        >
                          {t('pin_use_current')}
                        </Button>
                      </Group>
                      <Space h="md" />
                      <Text size="sm" fw={700}>
                        Max
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
                              max: useConfigStore.getState().mappingStatus[profileIdx][mappingIdx]
                                .stateRaw,
                            });
                          }}
                        >
                          {t('pin_use_current')}
                        </Button>
                      </Group>
                      <Space h="md" />
                      <Text size="sm" fw={700}>
                        Deadzone
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
                      />
                      <Text size="sm" fw={700}>
                        Min
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
                              min: useConfigStore.getState().mappingStatus[profileIdx][mappingIdx]
                                .stateRaw,
                            });
                          }}
                        >
                          {t('pin_use_current')}
                        </Button>
                      </Group>
                      <Space h="md" />
                      <Text size="sm" fw={700}>
                        Max
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
                              max: useConfigStore.getState().mappingStatus[profileIdx][mappingIdx]
                                .stateRaw,
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
          </>
        )}
      </Card>
    </div>
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
}: {
  led: proto.ILed;
  profileIdx: number;
  ledIdx: number;
  mode: proto.FaceButtonMappingMode;
  type: proto.SubType;
  legendMode: LegendMode;
  dispatch: (led: proto.ILed) => void;
  deleteLed: () => void;
  copyInput: () => void;
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
    alignSelf: 'stretch',
  };
  let deviceId = -1;
  if (led.device.rgb) {
    deviceId = led.device.rgb.deviceId;
  } else if (led.device.stp16) {
    deviceId = led.device.stp16.deviceId;
  } else if (led.device.vtechExpander) {
    deviceId = led.device.vtechExpander.deviceId;
  }
  const guiDevices = useConfigStore((state) => state.guiDevices);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const device = useConfigStore((state) => state.deviceStatus[deviceId]);
  const mapping = useConfigStore(
    (state) =>
      Object.values(state.mappingStatus[profileIdx]).find(
        (x) => JSON.stringify(x.mapping.input) === JSON.stringify(led.mapping.inputMapping?.input)
      )?.mapping
  );
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
          proto.ProKeyboardButtonType[mapping.mapping.proKeyboardButton ?? -1];

        const fixedLabel = FixLabel(mode, type, label, legendMode);
        return `Icons/Input/${fixedLabel}.png`;
      }
    }
    return `Icons/Generic.png`;
  }, [led, mode, mapping]);
  let labels: string[] = [];
  const allLabels = Object.entries(guiDevices)
    .filter((x) => x[1].ledLabel?.deviceid === deviceId)
    .flatMap((x) =>
      x[1].ledLabel?.activeLed?.map((y) => ({ led: y, label: x[1].ledLabel!.label! }))
    )
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
      labels = Object.entries(guiDevices)
        .filter(
          (x) =>
            x[1].ledLabel?.deviceid === deviceId &&
            new Set(x[1].ledLabel?.activeLed).intersection(new Set(led.device.rgb?.activeLed))
              .size > 0
        )
        .map((x) => x[1].ledLabel!.label!);
    }
  }
  let mappingValue = '';
  if (led.mapping.inputMapping) {
    mappingValue = t(`leds.type.input`);
  } else if (led.mapping.patternMapping) {
    mappingValue = t(`leds.type.pattern`);
  } else if (led.mapping.staticMapping) {
    mappingValue = t(`leds.type.static`);
  }

  const isLedActive = useConfigStore((state) => !!state.ledStatus[profileIdx]?.[ledIdx]?.state);

  let summaryModeText = mappingValue || t('leds.type.static');
  if (led.mapping.inputMapping && mapping) {
    const label =
      proto.GamepadButtonType[mapping.mapping.gamepadButton ?? -1] ||
      proto.GamepadAxisType[mapping.mapping.gamepadAxis ?? -1] ||
      proto.GuitarHeroGuitarButtonType[mapping.mapping.ghButton ?? -1] ||
      proto.GuitarHeroGuitarAxisType[mapping.mapping.ghAxis ?? -1] ||
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
      <Card shadow="sm" padding="lg" radius="md" withBorder w="420px" h="100%">
        <Group justify="space-between" align="center" mb="xs">
          <Group gap="xs">
            {!simpleMode && (
              <div {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                <IconGripVertical size={18} stroke={1.5} />
              </div>
            )}
            <Title order={4}>{t('leds.item_title', { num: ledIdx + 1 })}</Title>
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
          {!simpleMode && (
            <Group gap={4}>
              <ActionIcon variant="subtle" onClick={copyInput} title="Copy">
                <IconCopy size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="red" onClick={open} title="Delete">
                <IconTrash size={18} />
              </ActionIcon>
            </Group>
          )}
        </Group>

        <Card padding="xs" radius="sm" withBorder mb="sm" bg="var(--mantine-color-default-hover)">
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
          <Image src={img} height={70} w="auto" fit="contain" alt="LED icon" />
        </Center>
        {!simpleMode && (
          <>
            {(deviceCombobox.dropdownOpened && (
              <Combobox
                store={deviceCombobox}
                onOptionSubmit={(val) => {
                  deviceCombobox.closeDropdown();
                  if (isNumberLike(val)) {
                    switch (deviceStatus[parseInt(val, 10)].type) {
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
                    {Object.values(deviceStatus)
                      .filter(isLed)
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
              <PinBox
                label="pin_label"
                valid={led.device.gpio.analog ? AnalogPinsNamed : AllPinsNamed}
                pin={led.device.gpio.pin}
                dispatch={(pin) =>
                  dispatch({ ...led, device: { gpio: { ...led.device.gpio!, pin } } })
                }
              />
            )}
            {led.device.dmx && (
              <NumberInput
                value={led.device.dmx.channel}
                min={0}
                max={device.device.dmx!.channelCount}
                onChange={(e) =>
                  dispatch({
                    ...led,
                    device: { dmx: { ...led.device.dmx!, channel: parseInt(e.toString(), 10) } },
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
            {led.mapping.inputMapping?.input && (
              <>
                <DropdownBox
                  title="leds.pattern.label"
                  e={proto.ReactiveRgbPatternType}
                  val={
                    led.mapping.inputMapping.pattern ?? proto.ReactiveRgbPatternType.PatternStatic
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
            <Space h="md" />
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
                  { length: device.device.ws2812?.count || device.device.apa102?.count || 0 },
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
              !simpleMode &&
              led.mapping.patternMapping?.pattern !== proto.RgbPatternType.PatternRainbow && (
                <>
                  <Space h="md" />
                  <Switch
                    label={t('leds.set_off')}
                    checked={led.device.rgb.hasStart}
                    onChange={(event) => {
                      dispatch({
                        ...led,
                        device: {
                          rgb: {
                            ...led.device.rgb!,
                            hasStart: event.currentTarget.checked,
                          },
                        },
                      });
                    }}
                  />
                </>
              )}
            {(led.mapping.patternMapping?.pattern !== proto.RgbPatternType.PatternRainbow &&
              led.device.rgb.hasStart &&
              !led.mapping.staticMapping && (
                <>
                  <Space h="md" />
                  <Group grow>
                    <ColorInput
                      label={t('leds.released')}
                      placeholder="Input placeholder"
                      format="rgba"
                      value={`rgba(${led.device.rgb?.startR}, ${led.device.rgb?.startG}, ${led.device.rgb?.startB}, ${(led.device.rgb!.startW! / 255).toFixed(2)})`}
                      onChange={(val) => {
                        if (!val) {
                          return;
                        }
                        const [r, g, b, w] = val.split('(')[1].split(')')[0].split(', ');
                        dispatch({
                          ...led,
                          device: {
                            ...led.device,
                            rgb: {
                              ...led.device.rgb!,
                              startR: parseInt(r, 10),
                              startG: parseInt(g, 10),
                              startB: parseInt(b, 10),
                              startW: parseFloat(w) * 255,
                            },
                          },
                        });
                      }}
                    />
                    <Input.Wrapper label=" " description=" " error=" ">
                      <Button
                        w="100%"
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
            {led.mapping.patternMapping?.pattern !== proto.RgbPatternType.PatternRainbow && (
              <Group grow>
                <ColorInput
                  label={led.mapping.staticMapping ? t('leds.colour') : t('leds.pressed')}
                  placeholder="Input placeholder"
                  format="rgba"
                  value={`rgba(${led.device.rgb?.endR}, ${led.device.rgb?.endG}, ${led.device.rgb?.endB}, ${(led.device.rgb!.endW! / 255).toFixed(2)})`}
                  onChange={(val) => {
                    if (!val) {
                      return;
                    }
                    const [r, g, b, w] = val.split('(')[1].split(')')[0].split(', ');
                    dispatch({
                      ...led,
                      device: {
                        ...led.device,
                        rgb: {
                          ...led.device.rgb!,
                          endR: parseInt(r, 10),
                          endG: parseInt(g, 10),
                          endB: parseInt(b, 10),
                          endW: parseFloat(w) * 255,
                        },
                      },
                    });
                  }}
                />
                {!led.mapping.staticMapping && led.device.rgb.hasStart && (
                  <Input.Wrapper label=" " description=" " error=" " mr="0">
                    <Button
                      w="100%"
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
            <Text size="sm">{t('calibration.min')}</Text>
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
            <Text size="sm">{t('calibration.max')}</Text>
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
      </Card>
    </div>
  );
}

type ProfileAssignmentTypes = keyof proto.IProfileAssignmentInfo;
const OtherAssignmentTypes: ProfileAssignmentTypes[] = ['input', 'inputAnyTime'];
const HostProfileAssignmentTypes: ProfileAssignmentTypes[] = [
  'wiiExt',
  'ps2Cnt',
  'usbType',
  'usbDevice',
  'midiChannel',
];
const DeviceProfileAssignmentTypes: ProfileAssignmentTypes[] = [
  'ps2Emulation',
  'wiiEmulation',
  'bluetooth',
  'consoleType',
];
const AllProfileAssignmentTypes: ProfileAssignmentTypes[] = OtherAssignmentTypes.concat(
  HostProfileAssignmentTypes
).concat(DeviceProfileAssignmentTypes);
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
              <Text size="sm">{t('trigger.min')}</Text>
            )) || <Text size="sm">{t('trigger.trigger')}</Text>}

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
                <Text size="sm">{t('trigger.max')}</Text>
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
function SantrollerAssignment({
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
            <ActionIcon variant="subtle" onClick={copyAssignment} title="Copy">
              <IconCopy size={18} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" onClick={open} title="Delete">
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
              case 'usbType':
                dispatch({ usbType: proto.SubType.Gamepad });
                break;
              case 'usbDevice':
                dispatch({ usbDevice: { vid: 0, pid: 0 } });
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
            }
            assignmentTypeCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              <Combobox.Group label={t('assignments.generic')}>
                {OtherAssignmentTypes.map((item) => (
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
            e={proto.SubType}
            val={mapping.usbType}
            label="subType"
            dispatch={(usbType) => dispatch({ usbType })}
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
                <Space h="md" />
                <Input.Wrapper
                  label={t('main.xinput_on_windows.label')}
                  description={t('main.xinput_on_windows.description')}
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
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();

  const assignments = useMemo(() => mapping.assignments ?? [], [mapping.assignments]);

  const emulationIdx = assignments.findIndex((x) =>
    DeviceProfileAssignmentTypes.some((y) => x[y] != null)
  );
  const emulationItem = emulationIdx !== -1 ? assignments[emulationIdx] : undefined;

  const hostIdx = assignments.findIndex((x) =>
    HostProfileAssignmentTypes.some((y) => x[y] != null)
  );
  const hostItem = hostIdx !== -1 ? assignments[hostIdx] : undefined;

  const triggerIdx = assignments.findIndex((x) => OtherAssignmentTypes.some((y) => x[y] != null));
  const triggerItem = triggerIdx !== -1 ? assignments[triggerIdx] : undefined;

  const isComplex =
    assignments.filter((x) => DeviceProfileAssignmentTypes.some((y) => x[y] != null)).length > 1 ||
    assignments.filter((x) => HostProfileAssignmentTypes.some((y) => x[y] != null)).length > 1 ||
    assignments.filter((x) => OtherAssignmentTypes.some((y) => x[y] != null)).length > 1;

  const [advancedMode, setAdvancedMode] = useState(isComplex);

  const isActive = useConfigStore(
    (state) => state.activationListStatus[profileIdx]?.[listIdx]?.state ?? false
  );

  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const hasBluetooth = Object.values(deviceStatus).some((d) => d.type === 'bt');
  const hasWiiEmu = Object.values(deviceStatus).some((d) => d.type === 'wiiEmulation');
  const hasPsxEmu = Object.values(deviceStatus).some((d) => d.type === 'psxEmulation');
  const hasWii = Object.values(deviceStatus).some((d) => d.type === 'wii');
  const hasPsx = Object.values(deviceStatus).some((d) => d.type === 'psx');
  const hasUsbHost = Object.values(deviceStatus).some((d) => d.type === 'usbHost');
  const hasMidi = Object.values(deviceStatus).some(
    (d) =>
      d.type === 'midiSerial' ||
      d.type === 'usbHost' ||
      d.type === 'wii' ||
      d.type === 'bhDrum' ||
      d.type === 'worldTourDrum'
  );

  const updateEmulation = (newEmul: proto.IProfileAssignmentInfo) => {
    const next = [...assignments];
    if (emulationIdx !== -1) {
      next[emulationIdx] = newEmul;
    } else {
      next.unshift(newEmul);
    }
    dispatch({ ...mapping, assignments: next });
  };

  const updateHost = (newHost: proto.IProfileAssignmentInfo | null) => {
    const next = [...assignments];
    if (hostIdx !== -1) {
      if (newHost === null) {
        next.splice(hostIdx, 1);
      } else {
        next[hostIdx] = newHost;
      }
    } else if (newHost !== null) {
      next.push(newHost);
    }
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

  const currentEmulMode: 'consoleType' | 'bluetooth' | 'ps2Emulation' | 'wiiEmulation' =
    emulationItem?.bluetooth != null
      ? 'bluetooth'
      : emulationItem?.ps2Emulation != null
        ? 'ps2Emulation'
        : emulationItem?.wiiEmulation != null
          ? 'wiiEmulation'
          : 'consoleType';

  const currentUsbOption: 'auto' | 'forced' | 'specific' =
    emulationItem?.consoleType?.forcedType != null
      ? 'forced'
      : emulationItem?.consoleType?.consoleType != null
        ? 'specific'
        : 'auto';

  const currentSource =
    hostItem?.wiiExt != null
      ? 'wiiExt'
      : hostItem?.ps2Cnt != null
        ? 'ps2Cnt'
        : hostItem?.usbType != null
          ? 'usbType'
          : hostItem?.usbDevice != null
            ? 'usbDevice'
            : hostItem?.midiChannel != null
              ? 'midiChannel'
              : 'builtin';

  const currentTrigger =
    triggerItem?.input != null
      ? 'input'
      : triggerItem?.inputAnyTime != null
        ? 'inputAnyTime'
        : 'always';

  const sourceOptions = [
    { value: 'builtin', label: t('assignments.source.builtin') },
    ...(hasWii || hostItem?.wiiExt != null
      ? [{ value: 'wiiExt', label: t('assignments.source.wiiExt') }]
      : []),
    ...(hasPsx || hostItem?.ps2Cnt != null
      ? [{ value: 'ps2Cnt', label: t('assignments.source.ps2Cnt') }]
      : []),
    ...(hasUsbHost || hostItem?.usbType != null
      ? [{ value: 'usbType', label: t('assignments.source.usbType') }]
      : []),
    ...(hasUsbHost || hostItem?.usbDevice != null
      ? [{ value: 'usbDevice', label: t('assignments.source.usbDevice') }]
      : []),
    ...(hasMidi || hostItem?.midiChannel != null
      ? [{ value: 'midiChannel', label: t('assignments.source.midiChannel') }]
      : []),
  ];

  const targetOptions = [
    { label: t('assignments.emulation_mode.usb'), value: 'consoleType' },
    ...(hasBluetooth
      ? [{ label: t('assignments.emulation_mode.bluetooth'), value: 'bluetooth' }]
      : []),
    ...(hasPsxEmu ? [{ label: t('assignments.emulation_mode.ps2'), value: 'ps2Emulation' }] : []),
    ...(hasWiiEmu ? [{ label: t('assignments.emulation_mode.wii'), value: 'wiiEmulation' }] : []),
  ];

  const summaryText = useMemo(() => {
    let emul = '';
    if (emulationItem?.consoleType) {
      if (emulationItem.consoleType.forcedType) {
        emul = `USB (${t(`consoleMode.${proto.ConsoleMode[emulationItem.consoleType.forcedType]}`)})`;
      } else if (emulationItem.consoleType.consoleType) {
        emul = `USB (${t(`consoleType.${proto.ConsoleType[emulationItem.consoleType.consoleType]}`)})`;
      } else {
        emul = t('assignments.preset_usb_auto');
      }
    } else if (emulationItem?.bluetooth) {
      emul = t('assignments.emulation_mode.bluetooth');
    } else if (emulationItem?.ps2Emulation) {
      emul = t('assignments.emulation_mode.ps2');
    } else if (emulationItem?.wiiEmulation) {
      emul = t('assignments.emulation_mode.wii');
    } else {
      emul = t('assignments.no_emulation');
    }

    let host = '';
    if (hostItem?.wiiExt) {
      host = `Wii (${t(`wiiExt.${proto.WiiExtType[hostItem.wiiExt]}`)})`;
    } else if (hostItem?.ps2Cnt) {
      host = `PS2 (${t(`ps2Cnt.${proto.PS2ControllerType[hostItem.ps2Cnt]}`)})`;
    } else if (hostItem?.usbType) {
      host = `USB (${t(`subType.${proto.SubType[hostItem.usbType]}`)})`;
    } else if (hostItem?.usbDevice) {
      host = t('assignments.source.usbDevice');
    } else if (hostItem?.midiChannel) {
      host = `MIDI Ch ${hostItem.midiChannel}`;
    }

    let trig = '';
    if (triggerItem?.input) {
      trig = t('assignments.trigger.boot');
    } else if (triggerItem?.inputAnyTime) {
      trig = t('assignments.trigger.anytime');
    }

    const parts = [emul];
    if (host) {
      parts.push(host);
    }
    if (trig) {
      parts.push(trig);
    }
    return parts.join(' + ');
  }, [emulationItem, hostItem, triggerItem, t]);

  const hasEmulation = emulationItem !== undefined;
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
      <Card shadow="sm" padding="lg" radius="md" withBorder w="420px">
        <Group justify="space-between" align="center" mb="xs">
          <Group gap="xs">
            <Title order={4}>{t('assignments.rule_title', { num: listIdx + 1 })}</Title>
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
            <ActionIcon variant="subtle" onClick={copyAssignment} title="Copy">
              <IconCopy size={18} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" onClick={open} title="Delete">
              <IconTrash size={18} />
            </ActionIcon>
          </Group>
        </Group>

        <Card padding="xs" radius="sm" withBorder mb="sm" bg="var(--mantine-color-default-hover)">
          <Group justify="space-between" wrap="nowrap">
            <Text size="xs" fw={500} c="dimmed">
              {t('assignments.rule_summary_prefix')}:
            </Text>
            <Badge variant="light" color={hasEmulation ? 'teal' : 'red'} size="sm">
              {summaryText}
            </Badge>
          </Group>
        </Card>

        {!hasEmulation && (
          <Alert
            variant="light"
            color="red"
            title="Missing Emulation"
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

        {!advancedMode ? (
          <Stack gap="sm">
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
                      val={emulationItem?.consoleType?.forcedType ?? proto.ConsoleMode.ModeXbox360}
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
                      <Input.Wrapper
                        size="xs"
                        label={t('main.xinput_on_windows.label')}
                        description={t('main.xinput_on_windows.description')}
                      >
                        <SegmentedControl
                          fullWidth
                          size="xs"
                          data={[
                            { label: t('main.xinput_on_windows.XInput'), value: 'true' },
                            { label: t('main.xinput_on_windows.HID'), value: 'false' },
                          ]}
                          value={
                            (emulationItem?.consoleType?.xinputOnWindows ?? true) ? 'true' : 'false'
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
                              (emulationItem?.consoleType?.ps4OrPs5Mode ?? false) ? 'true' : 'false'
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

            <Stack gap={4}>
              <Input.Wrapper
                size="xs"
                label={t('assignments.step2_title')}
                description={t('assignments.step2_desc')}
              >
                <Select
                  size="xs"
                  value={currentSource}
                  onChange={(val) => {
                    switch (val) {
                      case 'builtin':
                        updateHost(null);
                        break;
                      case 'wiiExt':
                        updateHost({ wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar });
                        break;
                      case 'ps2Cnt':
                        updateHost({ ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeGuitar });
                        break;
                      case 'usbType':
                        updateHost({ usbType: proto.SubType.Gamepad });
                        break;
                      case 'usbDevice':
                        updateHost({ usbDevice: { vid: 0, pid: 0 } });
                        break;
                      case 'midiChannel':
                        updateHost({ midiChannel: 10 });
                        break;
                    }
                  }}
                  data={sourceOptions}
                />
              </Input.Wrapper>
              {currentSource === 'wiiExt' && (
                <DropdownBox
                  title="activation.wiiExt"
                  e={proto.WiiExtType}
                  val={hostItem?.wiiExt ?? proto.WiiExtType.WiiGuitarHeroGuitar}
                  label="wiiExt"
                  dispatch={(wiiExt) => updateHost({ wiiExt })}
                />
              )}
              {currentSource === 'ps2Cnt' && (
                <DropdownBox
                  title="activation.ps2Cnt"
                  e={proto.PS2ControllerType}
                  val={hostItem?.ps2Cnt ?? proto.PS2ControllerType.PS2ControllerTypeGuitar}
                  label="ps2Cnt"
                  dispatch={(ps2Cnt) => updateHost({ ps2Cnt })}
                />
              )}
              {currentSource === 'usbType' && (
                <DropdownBox
                  title="activation.usbType"
                  e={proto.SubType}
                  val={hostItem?.usbType ?? proto.SubType.Gamepad}
                  label="subType"
                  dispatch={(usbType) => updateHost({ usbType })}
                />
              )}
              {currentSource === 'usbDevice' && (
                <Group grow>
                  <TextInput
                    size="xs"
                    label={t('assignments.vendorId')}
                    leftSection="0x"
                    value={(hostItem?.usbDevice?.vid ?? 0).toString(16)}
                    onChange={(e) =>
                      updateHost({
                        usbDevice: {
                          vid: parseInt((e.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                          pid: hostItem?.usbDevice?.pid ?? 0,
                        },
                      })
                    }
                  />
                  <TextInput
                    size="xs"
                    label={t('assignments.productId')}
                    leftSection="0x"
                    value={(hostItem?.usbDevice?.pid ?? 0).toString(16)}
                    onChange={(e) =>
                      updateHost({
                        usbDevice: {
                          vid: hostItem?.usbDevice?.vid ?? 0,
                          pid: parseInt((e.currentTarget.value || '0').substring(0, 4), 16) ?? 0,
                        },
                      })
                    }
                  />
                </Group>
              )}
              {currentSource === 'midiChannel' && (
                <NumberInput
                  size="xs"
                  label={t('assignments.midiChannel')}
                  value={hostItem?.midiChannel ?? 10}
                  min={1}
                  max={16}
                  onChange={(val) => updateHost({ midiChannel: parseInt(val.toString(), 10) ?? 1 })}
                />
              )}
            </Stack>

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
            </Stack>
          </Stack>
        ) : (
          <Stack gap="xs">
            <Button
              size="xs"
              variant="light"
              onClick={() =>
                dispatch({
                  ...mapping,
                  assignments: [
                    ...(mapping.assignments ?? []),
                    {
                      consoleType: {
                        consoleType: null,
                        forcedType: null,
                        xinputOnWindows: true,
                        ps4OrPs5Mode: false,
                      },
                    },
                  ],
                })
              }
            >
              {t('assignments.match')}
            </Button>
            {mapping.assignments?.map((assignment, assignmentIdx) => (
              <SantrollerAssignment
                key={assignmentIdx}
                activationIdx={assignmentIdx}
                listIdx={listIdx}
                mapping={assignment}
                legendMode={legendMode}
                profileIdx={profileIdx}
                type={type}
                mode={mode}
                dispatch={(val) =>
                  dispatch({
                    ...mapping,
                    assignments: [
                      ...mapping.assignments!.map((cAssignment, cAssignmentIdx) =>
                        cAssignmentIdx === assignmentIdx ? val : cAssignment
                      ),
                    ],
                  })
                }
                deleteAssignment={() =>
                  dispatch({
                    ...mapping,
                    assignments: [
                      ...mapping.assignments!.filter(
                        (_, cAssignmentIdx) => cAssignmentIdx !== assignmentIdx
                      ),
                    ],
                  })
                }
                copyAssignment={() =>
                  dispatch({
                    ...mapping,
                    assignments: [...mapping.assignments!, { ...assignment }],
                  })
                }
              />
            ))}
          </Stack>
        )}

        <Divider my="sm" />
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {t('assignments.advanced_toggle')}
          </Text>
          <Switch
            size="xs"
            checked={advancedMode}
            onChange={(e) => setAdvancedMode(e.currentTarget.checked)}
          />
        </Group>
      </Card>
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
function Profile({ profileIdx }: { profileIdx: number }) {
  const errorIcon = <IconExclamationCircle />;
  const [opened, { open, close }] = useDisclosure(false);
  const [opened2, { open: open2, close: close2 }] = useDisclosure(false);
  const [opened3, { open: open3, close: close3 }] = useDisclosure(false);
  const [opened4, { open: open4, close: close4 }] = useDisclosure(false);
  const { t } = useTranslation();
  const profiles = useConfigStore((state) => state.config.profiles!);
  const updateProfile = useConfigStore((state) => state.updateProfile);
  const updateProfiles = useConfigStore((state) => state.updateProfiles);
  const deleteProfile = useConfigStore((state) => state.deleteProfile);
  const loadDefaults = useConfigStore((state) => state.loadDefaults);
  const setSyncMode = useConfigStore((state) => state.setSyncMode);
  const [legendMode, setLegendMode] = useState<LegendMode>(
    LegendMode[(localStorage.getItem('legendMode') ?? 'Xbox') as keyof typeof LegendMode]
  );
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const [defaultTarget, setDefaultTarget] = useState<DeviceStatus | undefined>(undefined);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const syncCalibrations = useConfigStore((state) => state.syncInputs);
  const profile = profiles[profileIdx];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );
  const hasBluetooth = Object.values(deviceStatus).some((d) => d.type === 'bt');
  const hasWiiEmu = Object.values(deviceStatus).some((d) => d.type === 'wiiEmulation');
  const hasPsxEmu = Object.values(deviceStatus).some((d) => d.type === 'psxEmulation');
  const hasWii = Object.values(deviceStatus).some((d) => d.type === 'wii');
  const hasPsx = Object.values(deviceStatus).some((d) => d.type === 'psx');
  const hasUsbHost = Object.values(deviceStatus).some((d) => d.type === 'usbHost');
  useEffect(() => {
    localStorage.setItem('legendMode', LegendMode[legendMode]);
  }, [legendMode]);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    updateProfile(
      {
        ...profile,
        mappings: [...arrayMove(profile.mappings!, active.id as number, over.id as number)],
      },
      profileIdx
    );
  };
  const handleDragEndLed = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    updateProfile(
      {
        ...profile,
        leds: [...arrayMove(profile.leds!, active.id as number, over.id as number)],
      },
      profileIdx
    );
  };
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('defaults_dialog.title')} centered>
        {t('defaults_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                loadDefaults(defaultTarget);
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
      <Modal opened={opened2} onClose={close2} title={t('clear_all_dialog.title')} centered>
        {t('clear_all_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                updateProfile(
                  {
                    ...profile,
                    mappings: [],
                  },
                  profileIdx
                );
                close2();
              }}
              color="red"
            >
              {t('clear_all_dialog.confirm')}
            </Button>
            <Button onClick={close2}>{t('clear_all_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Modal opened={opened3} onClose={close3} title={t('clear_all_assign_dialog.title')} centered>
        {t('clear_all_assign_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                updateProfile(
                  {
                    ...profile,
                    assignments: [],
                  },
                  profileIdx
                );
                close3();
              }}
              color="red"
            >
              {t('clear_all_assign_dialog.confirm')}
            </Button>
            <Button onClick={close3}>{t('clear_all_assign_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Modal opened={opened4} onClose={close4} title={t('clear_all_leds_dialog.title')} centered>
        {t('clear_all_leds_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
                updateProfile(
                  {
                    ...profile,
                    leds: [],
                  },
                  profileIdx
                );
                close4();
              }}
              color="red"
            >
              {t('clear_all_leds_dialog.confirm')}
            </Button>
            <Button onClick={close4}>{t('clear_all_leds_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Space h="md" />
      {!simpleMode && (
        <>
          <Group>
            <Title order={2}>Settings</Title>
            <ActionIcon color="red">
              <IconTrash
                style={{ width: '70%', height: '70%' }}
                onClick={() => deleteProfile(profileIdx)}
              />
            </ActionIcon>
          </Group>
          <Space h="md" />
          <TextInput
            value={profile.opts.name}
            onChange={(e) =>
              updateProfile(
                { ...profile, opts: { ...profile.opts, name: e.currentTarget.value } },
                profileIdx
              )
            }
            label={t('main.profile_name.label')}
          />
          <Space h="md" />
          <DropdownBox
            title="main.device_to_emulate.label"
            description="main.device_to_emulate.description"
            e={proto.SubType}
            val={profile.opts.deviceToEmulate!}
            label="subType"
            dispatch={(deviceToEmulate) =>
              updateProfile({ ...profile, opts: { ...profile.opts, deviceToEmulate } }, profileIdx)
            }
          />
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

      {profile.opts.deviceToEmulate === proto.SubType.Gamepad && (
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

      <Space h="md" />
      <Switch
        label={t('main.syncCalibrations.label')}
        description={t('main.syncCalibrations.description')}
        checked={syncCalibrations}
        onChange={(event) => setSyncMode(event.currentTarget.checked)}
      />
      {!simpleMode && (
        <>
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

          <Space h="md" />
          <Input.Wrapper
            inputWrapperOrder={['label', 'error', 'input', 'description']}
            description={t('assignments.description')}
          >
            <Title order={3}>{t('assignments.title')}</Title>
          </Input.Wrapper>
          <Space h="md" />

          <Table stickyHeader stickyHeaderOffset={60} withRowBorders={false}>
            <Table.Thead>
              <Table.Tr>
                <Table.Td>
                  {profile.assignments?.length === 0 && (
                    <>
                      <Alert variant="light" color="red" title="Error" icon={errorIcon}>
                        {t('assignments.missing')}
                      </Alert>
                      <Space h="md" />
                    </>
                  )}
                  <Group>
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
                                      assignments: [{ bluetooth: proto.BluetoothMode.BTStandard }],
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
                                        { ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeGuitar },
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
                    <Button variant="filled" onClick={open3}>
                      {t('clear_all_button')}
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Space h="md" />
                  <Group align="flex-start" gap="md">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={profile.assignments!.map((_, mappingIdx) => mappingIdx)!}
                        strategy={rectSortingStrategy}
                      >
                        {profile.assignments?.map((mapping, mappingIdx) => (
                          <Group key={mappingIdx} align="center" gap="md">
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
                              deleteAssignment={() =>
                                updateProfile(
                                  {
                                    ...profile,
                                    assignments: [
                                      ...profile.assignments!.filter(
                                        (_, cMappingIdx) => cMappingIdx !== mappingIdx
                                      ),
                                    ],
                                  },
                                  profileIdx
                                )
                              }
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
                    </DndContext>
                  </Group>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </>
      )}

      <Space h="md" />
      <Title order={3}>Inputs</Title>
      <Space h="md" />
      <Table stickyHeader stickyHeaderOffset={60} withRowBorders={false}>
        <Table.Thead>
          {!simpleMode && (
            <Table.Tr>
              <Table.Td>
                <Group align="stretch">
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
                                gpio: { analog: false, pin: 0, pinMode: proto.PinMode.PullUp },
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
                  <Button
                    variant="filled"
                    onClick={() => {
                      setDefaultTarget(undefined);
                      open();
                    }}
                  >
                    Load {t(`subType.${proto.SubType[profile.opts.deviceToEmulate]}`)} defaults
                  </Button>
                  {Object.values(deviceStatus)
                    .filter(hasDefaults)
                    .map((item) => (
                      <Button
                        value={item.id}
                        key={item.id}
                        onClick={() => {
                          setDefaultTarget(item);
                          open();
                        }}
                      >
                        {t(`defaults_dialog.for`, {
                          device: t(`devices.${item.type}`),
                          status: DeviceStatus.label(item),
                        })}
                      </Button>
                    ))}
                  <Button variant="filled" onClick={open2}>
                    {t('clear_all_button')}
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          )}
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
                                    : JSON.stringify(cMapping.input) ===
                                          JSON.stringify(val.input) &&
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
                                      JSON.stringify(cAssignment.input?.input) ===
                                        JSON.stringify(val.input) &&
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
                                  JSON.stringify(cMapping.mapping.inputMapping?.input) ===
                                  JSON.stringify(val.input)
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
                      deleteInput={() =>
                        updateProfile(
                          {
                            ...profile,
                            mappings: [
                              ...profile.mappings!.filter(
                                (_, cMappingIdx) => cMappingIdx !== mappingIdx
                              ),
                            ],
                          },
                          profileIdx
                        )
                      }
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={profile.mappings!.map((_, mappingIdx) => mappingIdx)!}
                      strategy={rectSortingStrategy}
                    >
                      {profile.mappings?.map((mapping, mappingIdx) => (
                        <SantrollerMapping
                          key={mappingIdx}
                          mapping={mapping}
                          type={profile.opts.deviceToEmulate}
                          profileIdx={profileIdx}
                          mappingIdx={mappingIdx}
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
                                        : JSON.stringify(cMapping.input) ===
                                              JSON.stringify(val.input) &&
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
                                          JSON.stringify(cAssignment.input?.input) ===
                                            JSON.stringify(val.input) &&
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
                                      JSON.stringify(cMapping.mapping.inputMapping?.input) ===
                                      JSON.stringify(val.input)
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
                          deleteInput={() =>
                            updateProfile(
                              {
                                ...profile,
                                mappings: [
                                  ...profile.mappings!.filter(
                                    (_, cMappingIdx) => cMappingIdx !== mappingIdx
                                  ),
                                ],
                              },
                              profileIdx
                            )
                          }
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
                  </DndContext>
                )}
              </Group>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Space h="md" />
      <Title order={3}>{t('leds.label')}</Title>
      <Space h="md" />
      <Table stickyHeader stickyHeaderOffset={60} withRowBorders={false}>
        <Table.Thead>
          <Table.Tr>
            <Table.Td>
              <Group align="stretch">
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
                                  gpio: { analog: false, pin: 0, pinMode: proto.PinMode.PullUp },
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
                <Button variant="filled" onClick={open4}>
                  {t('clear_all_button')}
                </Button>
              </Group>
            </Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td>
              <Space h="md" />
              <Group align="stretch">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndLed}
                >
                  <SortableContext
                    items={profile.leds!.map((_, ledIdx) => ledIdx)!}
                    strategy={rectSortingStrategy}
                  >
                    {profile.leds?.map((led, ledIdx) => (
                      <SantrollerLed
                        key={ledIdx}
                        led={led}
                        profileIdx={profileIdx}
                        ledIdx={ledIdx}
                        mode={profile.opts.faceButtonMappingMode}
                        type={profile.opts.deviceToEmulate}
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
                        deleteLed={() =>
                          updateProfile(
                            {
                              ...profile,
                              leds: [...profile.leds!.filter((_, cLedIdx) => cLedIdx !== ledIdx)],
                            },
                            profileIdx
                          )
                        }
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
                </DndContext>
              </Group>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </>
  );
}

export function InputsPage() {
  const activeProfile = useConfigStore((state) => state.currentProfile);
  const profiles = useConfigStore((state) => state.config.profiles!);
  const pollInputs = useConfigStore((state) => state.pollInputs);

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
  return (
    <Layout>
      <RequireDevice>
        <Profile profileIdx={activeProfile} />
      </RequireDevice>
    </Layout>
  );
}
