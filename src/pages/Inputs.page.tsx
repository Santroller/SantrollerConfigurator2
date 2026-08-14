import { useEffect, useMemo, useState } from 'react';
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
  IconCopy,
  IconExclamationCircle,
  IconGripVertical,
  IconPlus,
  IconTrash,
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
  Flex,
  Group,
  Image,
  Input,
  InputBase,
  isNumberLike,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Overlay,
  Progress,
  SegmentedControl,
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
import {
  getLabel,
  getMatrixLabel,
  getMultiplexerLabel,
  hasDefaults,
  isLed,
  PinBox,
} from '@/components/Devices/Pins';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { proto } from '@/components/SettingsContext/config';
import {
  DeviceStatus,
  ps4Subtypes,
  useConfigStore,
} from '@/components/SettingsContext/SettingsContext';
import { AllPinsNamed, AnalogPinsNamed } from '@/devices/pico/pins';

function StateLabelLabel({
  profileIdx,
  mappingIdx,
  listIdx,
  raw,
  activationBased,
  ledBased,
  zeroBased,
}: {
  profileIdx: number;
  mappingIdx: number;
  listIdx?: number;
  raw?: boolean;
  activationBased?: boolean;
  ledBased?: boolean;
  zeroBased?: boolean;
}) {
  const stateRaw = useConfigStore((state) =>
    ledBased
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
}: {
  profileIdx: number;
  mappingIdx: number;
  listIdx?: number;
  raw?: boolean;
  activationBased?: boolean;
  ledBased?: boolean;
  zeroBased?: boolean;
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
}) {
  const stateRaw = useConfigStore((state) =>
    ledBased
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
function StateBox({
  profileIdx,
  mappingIdx,
  listIdx,
  activationBased,
  ledBased,
  zeroBased,
}: {
  profileIdx: number;
  mappingIdx: number;
  listIdx?: number;
  activationBased?: boolean;
  ledBased?: boolean;
  zeroBased?: boolean;
}) {
  const { t } = useTranslation();
  const state = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.state
      : activationBased
        ? state.activationStatus[profileIdx][listIdx!][mappingIdx]?.state
        : zeroBased
          ? state.mappingStatus[profileIdx][mappingIdx]?.stateNonZero
          : state.mappingStatus[profileIdx][mappingIdx]?.state
  );
  return (
    <>
      <Text size="sm">State</Text>
      <Badge color={state ? 'blue' : 'gray'}>
        {state
          ? t(activationBased ? 'state.active' : 'state.pressed')
          : t(activationBased ? 'state.inactive' : 'state.released')}
      </Badge>
      <Space h="md" />
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
  switch (type) {
    case proto.SubType.Gamepad:
    case proto.SubType.Dancepad:
    case proto.SubType.StageKit:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          mode={mode}
          legendMode={legendMode}
          e={proto.GamepadAxisType}
          e2={proto.GamepadButtonType}
          val={mapping.gamepadAxis!}
          val2={mapping.gamepadButton!}
          dispatch={(axis) =>
            dispatch({
              center: proto.GamepadAxisType[axis].includes('Trigger') ? 0 : 32767,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
              gamepadAxis: axis,
              gamepadButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, gamepadButton: button, gamepadAxis: null })}
          dispatch3={() => {}}
        />
      );
    case proto.SubType.GuitarHeroGuitar:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          e={proto.GuitarHeroGuitarAxisType}
          e2={proto.GuitarHeroGuitarButtonType}
          val={mapping.ghAxis!}
          val2={mapping.ghButton!}
          legendMode={legendMode}
          dispatch={(axis) =>
            dispatch({
              min: 0,
              max: 65535,
              ...mapping,
              center: proto.GuitarHeroGuitarAxisType[axis].includes('Whammy') ? 0 : 32767,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
              ghAxis: axis,
              ghButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, ghButton: button, ghAxis: null })}
          dispatch3={() => {}}
        />
      );
    case proto.SubType.RockBandGuitar:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          e={proto.RockBandGuitarAxisType}
          e2={proto.RockBandGuitarButtonType}
          val={mapping.rbAxis!}
          val2={mapping.rbButton!}
          legendMode={legendMode}
          dispatch={(axis) =>
            dispatch({
              center: proto.RockBandGuitarAxisType[axis].includes('Whammy') ? 0 : 32767,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
              rbAxis: axis,
              rbButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, rbButton: button, rbAxis: null })}
          dispatch3={() => {}}
        />
      );
      break;
    case proto.SubType.GuitarHeroDrums:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          e={proto.GuitarHeroDrumsAxisType}
          e2={proto.GuitarHeroDrumsButtonType}
          legendMode={legendMode}
          val={mapping.ghDrumAxis!}
          val2={mapping.ghDrumButton!}
          dispatch={(axis) =>
            dispatch({
              center: proto.GuitarHeroDrumsAxisType[axis].includes('Stick') ? 32767 : 0,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
              ghDrumAxis: axis,
              ghDrumButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, ghDrumButton: button, ghDrumAxis: null })}
          dispatch3={() => {}}
        />
      );
      break;
    case proto.SubType.RockBandDrums:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          e={proto.RockBandDrumsAxisType}
          e2={proto.RockBandDrumsButtonType}
          val={mapping.rbDrumAxis!}
          val2={mapping.rbDrumButton!}
          legendMode={legendMode}
          dispatch={(axis) =>
            dispatch({
              center: proto.RockBandDrumsAxisType[axis].includes('Stick') ? 32767 : 0,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
              rbDrumAxis: axis,
              rbDrumButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, rbDrumButton: button, rbDrumAxis: null })}
          dispatch3={() => {}}
        />
      );
      break;
    case proto.SubType.LiveGuitar:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          e={proto.GuitarHeroLiveGuitarAxisType}
          e2={proto.GuitarHeroLiveGuitarButtonType}
          val={mapping.ghlAxis!}
          val2={mapping.ghlButton!}
          legendMode={legendMode}
          dispatch={(axis) =>
            dispatch({
              center: proto.GuitarHeroLiveGuitarAxisType[axis].includes('Whammy') ? 0 : 32767,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
              ghlAxis: axis,
              ghlButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, ghlButton: button, ghlAxis: null })}
          dispatch3={() => {}}
        />
      );
      break;
    case proto.SubType.DjHeroTurntable:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          e={proto.DJHTurntableAxisType}
          e2={proto.DJHTurntableButtonType}
          val={mapping.djhAxis!}
          val2={mapping.djhButton!}
          legendMode={legendMode}
          dispatch={(axis) =>
            dispatch({
              center: 32767,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
              djhAxis: axis,
              djhButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, djhButton: button, djhAxis: null })}
          dispatch3={() => {}}
        />
      );
      break;
    case proto.SubType.ProGuitarMustang:
    case proto.SubType.ProGuitarSquire:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          e={proto.ProGuitarAxisType}
          e2={proto.ProGuitarButtonType}
          val={mapping.proAxis!}
          val2={mapping.proButton!}
          legendMode={legendMode}
          dispatch={(axis) =>
            dispatch({
              center: proto.ProGuitarAxisType[axis].includes('Whammy') ? 0 : 32767,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 65535),
              proAxis: axis,
              proButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, proButton: button, proAxis: null })}
          dispatch3={() => {}}
        />
      );
    case proto.SubType.ProKeys:
      break;
    case proto.SubType.Taiko:
      break;
    case proto.SubType.KeyboardMouse:
      break;
    case proto.SubType.Wheel:
      break;
    case proto.SubType.DisneyInfinity:
    case proto.SubType.Skylanders:
    case proto.SubType.LegoDimensions:
      return <></>;
  }
}
function isInput(deviceStatus: DeviceStatus) {
  switch (deviceStatus.type) {
    case 'debug':
    case 'ws2812':
    case 'apa102':
    case 'stp16cpc':
    case 'bt':
    case 'dmx':
      return false;
    default:
      return true;
  }
}
type StandardEnum<T> = {
  [id: string]: T | string;
  [nu: number]: string;
};
function DropdownBox<T extends StandardEnum<unknown>>({
  e,
  val,
  title,
  label,
  description,
  dispatch,
}: {
  e: T;
  val: T[keyof T];
  title: string;
  label: string;
  description?: string;
  dispatch: (input: T[keyof T]) => void;
}) {
  const { t } = useTranslation();
  const inputCombobox = useCombobox({
    onDropdownOpen: () =>
      inputCombobox.updateSelectedOptionIndex('selected', { scrollIntoView: true }),
  });
  return (
    <Combobox
      store={inputCombobox}
      onOptionSubmit={(val) => {
        const button = e[val as keyof T];
        if (button !== undefined) {
          dispatch(button);
        }
        inputCombobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label={t(title)}
          description={description && t(description)}
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => {
            inputCombobox.toggleDropdown();
          }}
        >
          {t(`${label}.${e[val as keyof T]}`)}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
        <Combobox.Options>
          {inputCombobox.dropdownOpened &&
            Object.keys(e)
              .filter((e) => isNaN(Number(e)))
              .map((item) => (
                <Combobox.Option value={item} key={item} selected={e[val as keyof T] === item}>
                  {t(`${label}.${item}`)}
                </Combobox.Option>
              ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

function DropdownOutputBox<T extends StandardEnum<unknown>, T2 extends StandardEnum<unknown>>({
  e,
  e2,
  val,
  val2,
  val3,
  title,
  label,
  mode,
  legendMode,
  midi,
  dispatch,
  dispatch2,
  dispatch3,
}: {
  e?: T;
  e2?: T2;
  val?: T[keyof T];
  val2?: T2[keyof T2];
  val3?: string;
  title: string;
  label: string;
  mode?: proto.FaceButtonMappingMode;
  legendMode: LegendMode;
  midi?: boolean;
  dispatch: (input: T[keyof T]) => void;
  dispatch2: (input: T2[keyof T2]) => void;
  dispatch3: (input: string) => void;
}) {
  const { t } = useTranslation();
  const inputCombobox = useCombobox({
    onDropdownOpen: () =>
      inputCombobox.updateSelectedOptionIndex('selected', { scrollIntoView: true }),
  });
  const v = ((e && e[val as keyof T]) || (e2 && e2[val2 as keyof T2]) || val3) as string;
  const base =
    label === 'outputs' ? (
      <InputBase
        label={t(title)}
        component="button"
        type="button"
        pointer
        rightSection={<Combobox.Chevron />}
        rightSectionPointerEvents="none"
        onClick={() => inputCombobox.toggleDropdown()}
      >
        {t(`${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, v, legendMode)}`)}
      </InputBase>
    ) : (
      <InputBase
        label={t(title)}
        component="button"
        type="button"
        pointer
        rightSection={<Combobox.Chevron />}
        rightSectionPointerEvents="none"
        onClick={() => inputCombobox.toggleDropdown()}
      >
        {t(`${label}.${v}`)}
      </InputBase>
    );
  return (
    <Combobox
      store={inputCombobox}
      onOptionSubmit={(val) => {
        if (e) {
          const button = e[val as keyof T];
          if (button !== undefined) {
            dispatch(button);
          }
        }
        if (e2) {
          const axis = e2[val as keyof T2];
          if (axis !== undefined) {
            dispatch2(axis);
          }
        }
        if (
          val === 'midiNote' ||
          val === 'midiControlChange' ||
          val === 'midiPitchBend' ||
          val === 'midiProGuitarButton' ||
          val === 'midiProGuitarAxis'
        ) {
          dispatch3(val);
        }
        inputCombobox.closeDropdown();
      }}
    >
      <Combobox.Target>{base}</Combobox.Target>

      <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
        <Combobox.Options>
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
                {t('input.midiProGuitarButton')}
              </Combobox.Option>
              <Combobox.Option value="midiProGuitarAxis" selected={v === 'midiProGuitarAxis'}>
                {t('input.midiProGuitarAxis')}
              </Combobox.Option>
            </>
          )}
          {e &&
            Object.keys(e).map((item) => (
              <Combobox.Option value={item} key={item} selected={item === v}>
                {t(
                  `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, item, legendMode)}`
                )}
              </Combobox.Option>
            ))}
          {e2 &&
            Object.keys(e2).map((item) => (
              <Combobox.Option value={item} key={item} selected={item === v}>
                {t(
                  `${label}.${FixLabel(mode ?? proto.FaceButtonMappingMode.LegendBased, item, legendMode)}`
                )}
              </Combobox.Option>
            ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

function FixIcon(mode: proto.FaceButtonMappingMode, label: string, legendMode: LegendMode) {
  let calcLabel = label;
  if (
    proto.GamepadButtonType[
      `Gamepad_${calcLabel?.split('_')[1]}` as keyof typeof proto.GamepadButtonType
    ] !== undefined
  ) {
    calcLabel = `Gamepad_${calcLabel.split('_')[1]}`;
  }
  if (
    proto.GamepadAxisType[
      `Gamepad_${calcLabel?.split('_')[1]}` as keyof typeof proto.GamepadAxisType
    ] !== undefined
  ) {
    calcLabel = `Gamepad_${calcLabel.split('_')[1]}`;
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
      case 'Gamepad_DpadUp':
      case 'Gamepad_DpadDown':
      case 'Gamepad_DpadLeft':
      case 'Gamepad_DpadRight':
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
function FixLabel(mode: proto.FaceButtonMappingMode, label: string, legendMode: LegendMode) {
  return FixIcon(mode, label, legendMode)?.replace('/', '.');
}

function SantrollerLabel({ input, label }: { input: proto.IInput; label: string }) {
  let deviceId = -1;
  for (const key of Object.keys(input)) {
    const key2 = key as keyof typeof input;
    if (
      key2 !== 'fixed' &&
      key2 !== 'gpio' &&
      key2 !== 'shortcut' &&
      key2 !== 'held' &&
      input[key2]!.deviceid !== undefined
    ) {
      deviceId = input[key2]!.deviceid;
      break;
    }
  }
  const { t } = useTranslation();
  const device = useConfigStore((state) => state.deviceStatus[deviceId]);
  const guiDevices = useConfigStore((state) => state.guiDevices);

  if (device) {
    switch (device.type) {
      case 'ads1115': {
        const labelsText = getMultiplexerLabel(
          Object.values(guiDevices),
          input.ads1115!.channel,
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
        return <Text>{input.midiNote?.note}</Text>;
      case 'worldTourDrum':
        return <Text>{input.midiNote?.note}</Text>;
      case 'cycle':
        return <Text>{input.cycle?.input?.gpio?.pin}</Text>;
      case 'toggle':
        return <Text>{input.toggle?.input?.gpio?.pin}</Text>;
    }
  }
  if (input.gpio) {
    const labelsText = getLabel(t, Object.values(guiDevices), [], input.gpio.pin, false);
    if (labelsText) {
      return <Text>{labelsText}</Text>;
    }
  }
  return <Text>{t(`outputs.${label}`)}</Text>;
}

function SantrollerInput({
  input,
  axis,
  button,
  legendMode,
  mappingIdx,
  activationIdx,
  ledIdx,
  innerIdx,
  dispatch,
}: {
  input: proto.IInput;
  axis: boolean;
  button: boolean;
  legendMode: LegendMode;
  mappingIdx?: number;
  activationIdx?: number;
  ledIdx?: number;
  innerIdx?: number;
  dispatch: (input: proto.IInput) => void;
}) {
  let deviceId = -1;
  for (const key of Object.keys(input)) {
    const key2 = key as keyof typeof input;
    if (
      key2 !== 'fixed' &&
      key2 !== 'gpio' &&
      key2 !== 'shortcut' &&
      key2 !== 'held' &&
      input[key2]!.deviceid !== undefined
    ) {
      deviceId = input[key2]!.deviceid;
      break;
    }
  }
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
  const guiDevices = useConfigStore((state) => state.guiDevices);
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
    if (simpleMode) {
      switch (device.type) {
        case 'ads1115': {
          const labelsText = getMultiplexerLabel(
            Object.values(guiDevices),
            input.ads1115!.channel,
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
          return <Text>{input.midiNote?.note}</Text>;
        case 'worldTourDrum':
          return <Text>{input.midiNote?.note}</Text>;
        case 'cycle':
          return <Text>{input.cycle?.input?.gpio?.pin}</Text>;
        case 'toggle':
          return <Text>{input.toggle?.input?.gpio?.pin}</Text>;
      }
    }
  }
  if (simpleMode) {
    if (input.gpio) {
      const labelsText = getLabel(t, Object.values(guiDevices), [], input.gpio.pin, false);
      return <Text>{labelsText}</Text>;
    }
    return <></>;
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
              switch (deviceStatus[parseInt(val, 10)].type) {
                case 'wii':
                  if (axis) {
                    dispatch({
                      wiiAxis: {
                        axis: proto.WiiAxisType.WiiAxisClassicLeftStickX,
                        deviceid: parseInt(val, 10),
                      },
                    });
                  } else if (button) {
                    dispatch({
                      wiiButton: {
                        button: proto.WiiButtonType.WiiButtonClassicA,
                        deviceid: parseInt(val, 10),
                      },
                    });
                  }
                  break;
                case 'psx':
                  if (axis) {
                    dispatch({
                      ps2Axis: {
                        axis: proto.PS2AxisType.PS2AxisLeftStickX,
                        deviceid: parseInt(val, 10),
                      },
                    });
                  } else if (button) {
                    dispatch({
                      ps2Button: {
                        button: proto.PS2ButtonType.PS2ButtonCross,
                        deviceid: parseInt(val, 10),
                      },
                    });
                  }
                  break;
                case 'ads1115':
                  dispatch({
                    ads1115: {
                      channel: 0,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'multiplexer':
                  dispatch({
                    multiplexer: {
                      channel: 0,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'accelerometer':
                  dispatch({
                    accelerometer: {
                      type: proto.AccelerometerInputType.AccelerometerX,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'vtechExpander':
                  dispatch({
                    vtechExpander: {
                      button: 0,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'matrix':
                  dispatch({
                    matrix: {
                      outputPin: -1,
                      pin: -1,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'crkdNeck':
                  dispatch({
                    crkd: {
                      button: proto.CrkdNeckButtonType.CrkdGreen,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'bhDrum':
                  dispatch({
                    midiNote: {
                      note: 1,
                      channel: 10,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'worldTourDrum':
                  dispatch({
                    midiNote: {
                      note: 1,
                      channel: 10,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'crkdDrum':
                  dispatch({
                    crkdDrum: {
                      axis: proto.CrkdDrumAxisType.CrkdGreenPad,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'gh5Neck':
                  dispatch({
                    gh5Neck: {
                      button: proto.Gh5NeckButtonType.Gh5Green,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'usbHost':
                  dispatch({
                    usbButton: {
                      button: proto.UsbButtonType.UsbButtonA,
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'protarNeck':
                  if (axis) {
                    dispatch({
                      protarNeckAxis: {
                        axis: proto.ProGuitarNeckAxisType.ProGuitarNeckAFret,
                        deviceid: parseInt(val, 10),
                      },
                    });
                  } else {
                    dispatch({
                      protarNeckButton: {
                        button: proto.ProGuitarNeckButtonType.ProGuitarNeckGreen,
                        deviceid: parseInt(val, 10),
                      },
                    });
                  }
                  break;

                case 'cycle':
                  dispatch({
                    cycle: {
                      input: { gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp } },
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
                case 'toggle':
                  dispatch({
                    toggle: {
                      input: { gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp } },
                      deviceid: parseInt(val, 10),
                    },
                  });
                  break;
              }
              return;
            }
            switch (val) {
              case 'gpio_analog':
                dispatch({
                  gpio: { pin: -1, analog: true, pinMode: proto.PinMode.Floating },
                });
                break;
              case 'gpio_digital':
                dispatch({
                  gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp },
                });
                break;
              case 'shortcut':
                dispatch({
                  shortcut: {
                    inputs: [{ gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp } }],
                  },
                });
                break;
              case 'held':
                dispatch({
                  held: {
                    input: { gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp } },
                    time: 1000,
                  },
                });
                break;
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
                .filter(isInput)
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
                legendMode={legendMode}
                input={innerInput}
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
            legendMode={legendMode}
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
              legendMode={legendMode}
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
              legendMode={legendMode}
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
              legendMode={legendMode}
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
      {(device?.type === 'worldTourDrum' || device?.type === 'bhDrum') && (
        <DropdownOutputBox
          title="input"
          val3={
            input.midiNote
              ? 'midiNote'
              : input.midiControlChange
                ? 'midiControlChange'
                : input.midiPitchBend
                  ? 'midiPitchBend'
                  : input.midiProGuitarButton
                    ? 'midiProGuitarButton'
                    : input.midiProGuitarAxis
                      ? 'midiProGuitarAxis'
                      : undefined
          }
          label={`${device?.type}.inputs`}
          midi
          legendMode={legendMode}
          dispatch={(_) => {}}
          dispatch2={(_) => {}}
          dispatch3={(type) => {
            switch (type) {
              case 'midiNote':
                dispatch({
                  midiNote: { ...input.midiNote!, note: 1, deviceid: deviceId },
                });
                break;
              case 'midiControlChange':
                dispatch({
                  midiControlChange: {
                    ...input.midiControlChange!,
                    cc: 1,
                    deviceid: deviceId,
                  },
                });
                break;
              case 'midiPitchBend':
                dispatch({
                  midiPitchBend: { ...input.midiPitchBend!, deviceid: deviceId },
                });
                break;
              case 'midiProGuitarButton':
                dispatch({
                  midiProGuitarButton: {
                    ...input.midiProGuitarButton!,
                    button: proto.ProGuitarButtonType.ProGuitar_A,
                    deviceid: deviceId,
                  },
                });
                break;
              case 'midiProGuitarAxis':
                dispatch({
                  midiProGuitarAxis: {
                    ...input.midiProGuitarAxis!,
                    axis: proto.ProGuitarAxisType.ProGuitar_AFret,
                    deviceid: deviceId,
                  },
                });
                break;
            }
          }}
        />
      )}
      {device?.type === 'wii' && (
        <DropdownOutputBox
          title="input"
          e={proto.WiiAxisType}
          e2={proto.WiiButtonType}
          legendMode={legendMode}
          val={input.wiiAxis?.axis}
          val2={input.wiiButton?.button}
          val3={
            input.midiNote
              ? 'midiNote'
              : input.midiControlChange
                ? 'midiControlChange'
                : input.midiPitchBend
                  ? 'midiPitchBend'
                  : input.midiProGuitarButton
                    ? 'midiProGuitarButton'
                    : input.midiProGuitarAxis
                      ? 'midiProGuitarAxis'
                      : undefined
          }
          label="wii.inputs"
          midi
          dispatch={(axis) =>
            dispatch({ wiiAxis: { ...input.wiiAxis!, axis, deviceid: deviceId } })
          }
          dispatch2={(button) =>
            dispatch({ wiiButton: { ...input.wiiButton!, button, deviceid: deviceId } })
          }
          dispatch3={(type) => {
            switch (type) {
              case 'midiNote':
                dispatch({
                  midiNote: { ...input.midiNote!, note: 1, deviceid: deviceId },
                });
                break;
              case 'midiControlChange':
                dispatch({
                  midiControlChange: {
                    ...input.midiControlChange!,
                    cc: 1,
                    deviceid: deviceId,
                  },
                });
                break;
              case 'midiPitchBend':
                dispatch({
                  midiPitchBend: { ...input.midiPitchBend!, deviceid: deviceId },
                });
                break;
              case 'midiProGuitarButton':
                dispatch({
                  midiProGuitarButton: {
                    ...input.midiProGuitarButton!,
                    button: proto.ProGuitarButtonType.ProGuitar_A,
                    deviceid: deviceId,
                  },
                });
                break;
              case 'midiProGuitarAxis':
                dispatch({
                  midiProGuitarAxis: {
                    ...input.midiProGuitarAxis!,
                    axis: proto.ProGuitarAxisType.ProGuitar_AFret,
                    deviceid: deviceId,
                  },
                });
                break;
            }
          }}
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
          dispatch={(axis) =>
            dispatch({ ps2Axis: { ...input.ps2Axis!, axis, deviceid: deviceId } })
          }
          dispatch2={(button) =>
            dispatch({ ps2Button: { ...input.ps2Button!, button, deviceid: deviceId } })
          }
          dispatch3={() => {}}
        />
      )}
      {device?.type === 'usbHost' && (
        <DropdownOutputBox
          title="input"
          e={proto.UsbAxisType}
          e2={proto.UsbButtonType}
          legendMode={legendMode}
          val={input.usbAxis?.axis}
          val2={input.usbButton?.button}
          val3={
            input.midiNote
              ? 'midiNote'
              : input.midiControlChange
                ? 'midiControlChange'
                : input.midiPitchBend
                  ? 'midiPitchBend'
                  : input.midiProGuitarButton
                    ? 'midiProGuitarButton'
                    : input.midiProGuitarAxis
                      ? 'midiProGuitarAxis'
                      : undefined
          }
          label="usb.inputs"
          midi
          dispatch={(axis) =>
            dispatch({ usbAxis: { ...input.usbAxis!, axis, deviceid: deviceId } })
          }
          dispatch2={(button) =>
            dispatch({ usbButton: { ...input.usbButton!, button, deviceid: deviceId } })
          }
          dispatch3={(type) => {
            switch (type) {
              case 'midiNote':
                dispatch({
                  midiNote: { ...input.midiNote!, note: 1, deviceid: deviceId },
                });
                break;
              case 'midiControlChange':
                dispatch({
                  midiControlChange: {
                    ...input.midiControlChange!,
                    cc: 1,
                    deviceid: deviceId,
                  },
                });
                break;
              case 'midiPitchBend':
                dispatch({
                  midiPitchBend: { ...input.midiPitchBend!, deviceid: deviceId },
                });
                break;
              case 'midiProGuitarButton':
                dispatch({
                  midiProGuitarButton: {
                    ...input.midiProGuitarButton!,
                    button: proto.ProGuitarButtonType.ProGuitar_A,
                    deviceid: deviceId,
                  },
                });
                break;
              case 'midiProGuitarAxis':
                dispatch({
                  midiProGuitarAxis: {
                    ...input.midiProGuitarAxis!,
                    axis: proto.ProGuitarAxisType.ProGuitar_AFret,
                    deviceid: deviceId,
                  },
                });
                break;
            }
          }}
        />
      )}
      {input.crkd && (
        <DropdownBox
          title="input"
          e={proto.CrkdNeckButtonType}
          val={input.crkd?.button}
          label="inputs"
          dispatch={(button) => dispatch({ crkd: { ...input.crkd!, button } })}
        />
      )}
      {input.crkdDrum && (
        <DropdownBox
          title="input"
          e={proto.CrkdDrumAxisType}
          val={input.crkdDrum?.axis}
          label="inputs"
          dispatch={(axis) => dispatch({ crkdDrum: { ...input.crkdDrum!, axis } })}
        />
      )}
      {input.gh5Neck && (
        <DropdownBox
          title="input"
          e={proto.Gh5NeckButtonType}
          val={input.gh5Neck?.button}
          label="inputs"
          dispatch={(button) => dispatch({ gh5Neck: { ...input.gh5Neck!, button } })}
        />
      )}
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
      {input.accelerometer && (
        <DropdownBox
          e={proto.AccelerometerInputType}
          val={input.accelerometer?.type}
          title="input"
          label="accelerometer.inputs"
          dispatch={(type) => dispatch({ accelerometer: { ...input.accelerometer!, type } })}
        />
      )}
      {input.midiNote && (
        <>
          <NumberInput
            label={t('input.midiNote')}
            value={input.midiNote.note}
            onChange={(val) => dispatch({ midiNote: { ...input.midiNote!, note: Number(val) } })}
          />
          <NumberInput
            label={t('input.midiChannel')}
            value={input.midiNote.channel}
            onChange={(val) => dispatch({ midiNote: { ...input.midiNote!, channel: Number(val) } })}
          />
        </>
      )}
      {input.midiControlChange && (
        <>
          <NumberInput
            label={t('input.midiControlChange')}
            value={input.midiControlChange.cc}
            onChange={(val) =>
              dispatch({ midiControlChange: { ...input.midiControlChange!, cc: Number(val) } })
            }
          />
          <NumberInput
            label={t('input.midiChannel')}
            value={input.midiControlChange.channel}
            onChange={(val) =>
              dispatch({ midiControlChange: { ...input.midiControlChange!, channel: Number(val) } })
            }
          />
        </>
      )}
      {input.midiPitchBend && (
        <>
          <NumberInput
            label={t('input.midiPitchBend')}
            value={input.midiPitchBend.channel}
            onChange={(val) =>
              dispatch({ midiPitchBend: { ...input.midiPitchBend!, channel: Number(val) } })
            }
          />
        </>
      )}
      {input.midiProGuitarButton && (
        <DropdownBox
          title="input.midiProGuitarButton"
          e={proto.ProGuitarButtonType}
          val={input.midiProGuitarButton?.button}
          label="input.midiProGuitarButton"
          dispatch={(button) =>
            dispatch({ midiProGuitarButton: { ...input.midiProGuitarButton!, button } })
          }
        />
      )}
      {input.midiProGuitarAxis && (
        <DropdownBox
          title="input.midiProGuitarAxis"
          e={proto.ProGuitarAxisType}
          val={input.midiProGuitarAxis?.axis}
          label="input.midiProGuitarAxis"
          dispatch={(axis) =>
            dispatch({ midiProGuitarAxis: { ...input.midiProGuitarAxis!, axis } })
          }
        />
      )}
      {input.protarNeckButton && (
        <DropdownBox
          title="input.protarNeckButton"
          e={proto.ProGuitarNeckButtonType}
          val={input.protarNeckButton?.button}
          label="input.protarNeckButton"
          dispatch={(button) =>
            dispatch({ protarNeckButton: { ...input.protarNeckButton!, button } })
          }
        />
      )}
      {input.protarNeckAxis && (
        <DropdownBox
          title="input.protarNeckAxis"
          e={proto.ProGuitarNeckAxisType}
          val={input.protarNeckAxis?.axis}
          label="input.protarNeckAxis"
          dispatch={(axis) => dispatch({ protarNeckAxis: { ...input.protarNeckAxis!, axis } })}
        />
      )}
    </>
  );
}
function isAnalog(input: proto.IInput) {
  return (
    input.gpio?.analog ||
    input.ads1115 ||
    input.wiiAxis ||
    input.crkdDrum ||
    input.accelerometer ||
    input.multiplexer ||
    input.usbAxis ||
    input.ps2Axis ||
    input.midiNote ||
    input.midiControlChange ||
    input.midiPitchBend ||
    input.midiProGuitarAxis ||
    input.protarNeckAxis ||
    input.cycle
  );
}
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
    proto.GamepadButtonType[mapping.gamepadButton ?? -1] ||
    proto.GamepadAxisType[mapping.gamepadAxis ?? -1] ||
    proto.GuitarHeroGuitarButtonType[mapping.ghButton ?? -1] ||
    proto.GuitarHeroGuitarAxisType[mapping.ghAxis ?? -1] ||
    proto.GuitarHeroDrumsButtonType[mapping.ghDrumButton ?? -1] ||
    proto.GuitarHeroDrumsAxisType[mapping.ghDrumAxis ?? -1] ||
    proto.RockBandGuitarButtonType[mapping.rbButton ?? -1] ||
    proto.RockBandGuitarAxisType[mapping.rbAxis ?? -1] ||
    proto.RockBandDrumsButtonType[mapping.rbDrumButton ?? -1] ||
    proto.RockBandDrumsAxisType[mapping.rbDrumAxis ?? -1] ||
    proto.ProGuitarButtonType[mapping.proButton ?? -1] ||
    proto.ProGuitarAxisType[mapping.proAxis ?? -1] ||
    proto.DJHTurntableButtonType[mapping.djhButton ?? -1] ||
    proto.DJHTurntableAxisType[mapping.djhAxis ?? -1];

  const fixedLabel = FixLabel(mode, label, legendMode);
  const img = `Icons/Input/${FixIcon(mode, label, legendMode)}.png`;
  const button = Object.entries(mapping).find(([k, v]) => k.endsWith('Button') && v);
  const axis = Object.entries(mapping).find(([k, v]) => k.endsWith('Axis') && v);
  const stick = label?.includes('Stick');
  const drum = label?.includes('Pad') || label?.includes('Cymbal');
  const analogInput = isAnalog(mapping.input);
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
        <Card.Section h="60px">
          {!simpleMode && (
            <>
              <div {...listeners} style={{ cursor: 'grab', position: 'absolute', top: 0, left: 0 }}>
                <IconGripVertical size={18} stroke={1.5} />
              </div>
              <div style={{ position: 'absolute', top: 0, right: 0 }}>
                <ActionIcon color="red">
                  <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
                </ActionIcon>
                <ActionIcon>
                  <IconCopy style={{ width: '70%', height: '70%' }} onClick={copyInput} />
                </ActionIcon>
              </div>
            </>
          )}
          <Center>
            <Image src={img} height={75} w="auto" fit="contain" alt={img} />
          </Center>
        </Card.Section>
        {simpleMode && (
          <>
            <Space h="md" />
            <SantrollerLabel input={mapping.input} label={fixedLabel} />
          </>
        )}
        {button && <StateBox mappingIdx={mappingIdx} profileIdx={profileIdx} />}
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
            <OutputBox
              dispatch={dispatch}
              type={type}
              mode={mode}
              mapping={mapping}
              legendMode={legendMode}
            />
            <Space h="md" />
            <SantrollerInput
              axis={!!axis}
              button={!!button}
              input={mapping.input}
              legendMode={legendMode}
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
            <Space h="md" />
            {(button || drum) && (
              <NumberInput
                label={t('debounce.label')}
                description={t('debounce.desc')}
                value={mapping.debounce ?? 0}
                onChange={(val) => dispatch({ ...mapping, debounce: Number(val) })}
              />
            )}
          </>
        )}
        <Space h="md" />
        {button && analogInput && (
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
                  {axis && (
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
  legendMode,
  dispatch,
  deleteLed,
  copyInput,
}: {
  led: proto.ILed;
  profileIdx: number;
  ledIdx: number;
  mode: proto.FaceButtonMappingMode;
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
          proto.GamepadButtonType[mapping.gamepadButton ?? -1] ||
          proto.GamepadAxisType[mapping.gamepadAxis ?? -1] ||
          proto.GuitarHeroGuitarButtonType[mapping.ghButton ?? -1] ||
          proto.GuitarHeroGuitarAxisType[mapping.ghAxis ?? -1] ||
          proto.GuitarHeroDrumsButtonType[mapping.ghDrumButton ?? -1] ||
          proto.GuitarHeroDrumsAxisType[mapping.ghDrumAxis ?? -1] ||
          proto.RockBandGuitarButtonType[mapping.rbButton ?? -1] ||
          proto.RockBandGuitarAxisType[mapping.rbAxis ?? -1] ||
          proto.RockBandDrumsButtonType[mapping.rbDrumButton ?? -1] ||
          proto.RockBandDrumsAxisType[mapping.rbDrumAxis ?? -1] ||
          proto.ProGuitarButtonType[mapping.proButton ?? -1] ||
          proto.ProGuitarAxisType[mapping.proAxis ?? -1] ||
          proto.DJHTurntableButtonType[mapping.djhButton ?? -1] ||
          proto.DJHTurntableAxisType[mapping.djhAxis ?? -1];

        const fixedLabel = FixLabel(mode, label, legendMode);
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
        <Card.Section h="60px">
          {!simpleMode && (
            <>
              <div {...listeners} style={{ cursor: 'grab', position: 'absolute', top: 0, left: 0 }}>
                <IconGripVertical size={18} stroke={1.5} />
              </div>
              <div style={{ position: 'absolute', top: 0, right: 0 }}>
                <ActionIcon color="red">
                  <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
                </ActionIcon>
                <ActionIcon>
                  <IconCopy style={{ width: '70%', height: '70%' }} onClick={copyInput} />
                </ActionIcon>
              </div>
            </>
          )}
          <Center>
            <Image src={img} height={75} w="auto" fit="contain" alt={img} />
          </Center>
        </Card.Section>
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
                  legendMode={legendMode}
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
        {led.mapping.inputMapping && !analog && (
          <>
            <Space h="md" />
            <StateBox mappingIdx={ledIdx} profileIdx={profileIdx} ledBased />
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
        <Card.Section>
          <div style={{ position: 'absolute', top: 0, right: 0 }}>
            <ActionIcon color="red">
              <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
            </ActionIcon>
            <ActionIcon>
              <IconCopy style={{ width: '70%', height: '70%' }} onClick={copyAssignment} />
            </ActionIcon>
          </div>
        </Card.Section>
        <Space h="md" />
        <StateBox
          mappingIdx={activationIdx}
          profileIdx={profileIdx}
          listIdx={listIdx}
          activationBased
        />
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
                    <AssignmentOption value={FixLabel(mode, item, legendMode)} />
                  </Combobox.Option>
                ))}
              </Combobox.Group>
              <Combobox.Group label={t('assignments.host')}>
                {HostProfileAssignmentTypes.map((item) => (
                  <Combobox.Option value={item} key={item} selected={!!mapping[item]}>
                    <AssignmentOption value={FixLabel(mode, item, legendMode)} />
                  </Combobox.Option>
                ))}
              </Combobox.Group>
              <Combobox.Group label={t('assignments.emulation')}>
                {DeviceProfileAssignmentTypes.map((item) => (
                  <Combobox.Option value={item} key={item} selected={!!mapping[item]}>
                    <AssignmentOption value={FixLabel(mode, item, legendMode)} />
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
                dispatch={(consoleType) => dispatch({ consoleType: { consoleType } })}
              />
            )}
            <Space h="md" />
            <Switch
              label={t('assignments.forcedType')}
              checked={!!mapping.consoleType.forcedType}
              onChange={(event) =>
                dispatch({
                  consoleType: {
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
                dispatch={(forcedType) => dispatch({ consoleType: { forcedType } })}
              />
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
              input={mapping.inputAnyTime.input}
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
              activationIdx={activationIdx}
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
  legendMode,
  dispatch,
  deleteAssignment,
  copyAssignment,
}: {
  mapping: proto.IProfileAssignment;
  profileIdx: number;
  listIdx: number;
  mode: proto.FaceButtonMappingMode;
  legendMode: LegendMode;
  dispatch: (mapping: proto.IProfileAssignment) => void;
  deleteAssignment: () => void;
  copyAssignment: () => void;
}) {
  const errorIcon = <IconExclamationCircle />;
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const assignmentTypeCombobox = useCombobox({
    onDropdownClose: () => assignmentTypeCombobox.resetSelectedOption(),
  });
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
      <Card shadow="sm" padding="lg" radius="md" withBorder w="420px" h="100%">
        <Card.Section>
          <div style={{ position: 'absolute', top: 0, right: 0 }}>
            <ActionIcon color="red">
              <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
            </ActionIcon>
            <ActionIcon>
              <IconCopy style={{ width: '70%', height: '70%' }} onClick={copyAssignment} />
            </ActionIcon>
          </div>
          <Space h="xl" />
        </Card.Section>
        {!mapping.assignments?.some(
          (x) => DeviceProfileAssignmentTypes.some((y) => x[y])
        ) && (
          <>
            <Alert variant="light" color="red" title="Error" icon={errorIcon}>
              {t('assignments.missingDevice')}
            </Alert>
            <Space h="md" />
          </>
        )}
        <Button
          onClick={() =>
            dispatch({
              ...mapping,
              assignments: [...(mapping.assignments ?? []), { input: { input: {} } }],
            })
          }
        >
          {t('assignments.match')}
        </Button>
        <Space h="md" />
        {mapping.assignments?.map((assignment, assignmentIdx) => (
          <SantrollerAssignment
            key={assignmentIdx}
            activationIdx={assignmentIdx}
            listIdx={listIdx}
            mapping={assignment}
            legendMode={legendMode}
            profileIdx={profileIdx}
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
            value={profile.name}
            onChange={(e) => updateProfile({ ...profile, name: e.currentTarget.value }, profileIdx)}
            label={t('main.profile_name.label')}
          />
          <Space h="md" />
          <DropdownBox
            title="main.device_to_emulate.label"
            description="main.device_to_emulate.description"
            e={proto.SubType}
            val={profile.deviceToEmulate!}
            label="subType"
            dispatch={(deviceToEmulate) =>
              updateProfile({ ...profile, deviceToEmulate }, profileIdx)
            }
          />
          <Space h="md" />
          <DropdownBox
            title="main.legendMode.label"
            description="main.legendMode.description"
            e={LegendMode}
            val={legendMode}
            label="legendMode"
            dispatch={(deviceToEmulate) => setLegendMode(deviceToEmulate)}
          />
        </>
      )}

      {profile.deviceToEmulate === proto.SubType.Gamepad && (
        <>
          <Space h="md" />
          <FaceButtonMappingMode
            mode={profile.faceButtonMappingMode}
            dispatch={(val) =>
              updateProfile({ ...profile, faceButtonMappingMode: val }, profileIdx)
            }
          />
          <Space h="md" />
          <Switch
            label={t('main.invert_y_hid.label')}
            description={t('main.invert_y_hid.description')}
            checked={!!profile.invertYAxisHid}
            onChange={(event) =>
              updateProfile({ ...profile, invertYAxisHid: event.currentTarget.checked }, profileIdx)
            }
          />
        </>
      )}
      <Space h="md" />
      <Switch
        label={t('main.xinput_on_windows.label')}
        description={t('main.xinput_on_windows.description')}
        checked={!!profile.xinputOnWindows}
        onChange={(event) =>
          updateProfile({ ...profile, xinputOnWindows: event.currentTarget.checked }, profileIdx)
        }
      />
      <Space h="md" />
      <Switch
        label={t('main.syncCalibrations.label')}
        description={t('main.syncCalibrations.description')}
        checked={syncCalibrations}
        onChange={(event) => setSyncMode(event.currentTarget.checked)}
      />
      {!simpleMode && (
        <>
          {profile.deviceToEmulate === proto.SubType.RockBandDrums && (
            <>
              <Space h="md" />
              <Switch
                label={t('main.cymbalGlitchFix.label')}
                description={t('main.cymbalGlitchFix.description')}
                checked={!!profile.cymbalGlitchFix}
                onChange={(event) =>
                  updateProfile(
                    { ...profile, cymbalGlitchFix: event.currentTarget.checked },
                    profileIdx
                  )
                }
              />
            </>
          )}
          {ps4Subtypes.includes(profile.deviceToEmulate!) && (
            <>
              <Space h="md" />
              <Input.Wrapper
                label={t('main.ps4EmulationMode.label')}
                description={t('main.ps4EmulationMode.description')}
              >
                <SegmentedControl
                  data={[
                    { label: t('main.ps4EmulationMode.PS3'), value: false },
                    { label: t('main.ps4EmulationMode.PS4'), value: true },
                  ]}
                  value={!!profile.ps4OrPs5Mode}
                  onChange={(event) =>
                    updateProfile({ ...profile, ps4OrPs5Mode: event }, profileIdx)
                  }
                />
              </Input.Wrapper>
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
                    <Button
                      variant="filled"
                      onClick={() =>
                        updateProfile(
                          {
                            ...profile,
                            assignments: [
                              ...profile.assignments!,
                              { assignments: [{ input: { input: {} } }] },
                            ],
                          },
                          profileIdx
                        )
                      }
                    >
                      {t('assignments.add')}
                    </Button>
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
                  <Group>
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
                          <SantrollerAssignmentList
                            key={mappingIdx}
                            mapping={mapping}
                            profileIdx={profileIdx}
                            listIdx={mappingIdx}
                            mode={profile.faceButtonMappingMode}
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
                    Load {t(`subType.${proto.SubType[profile.deviceToEmulate]}`)} defaults
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
                      type={profile.deviceToEmulate}
                      profileIdx={profileIdx}
                      mappingIdx={mappingIdx}
                      legendMode={legendMode}
                      mode={profile.faceButtonMappingMode}
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
                          type={profile.deviceToEmulate}
                          profileIdx={profileIdx}
                          mappingIdx={mappingIdx}
                          mode={profile.faceButtonMappingMode}
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
                        mode={profile.faceButtonMappingMode}
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
