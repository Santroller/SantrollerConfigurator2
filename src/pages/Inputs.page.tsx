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
import {
  arrayMove,
  rectSortingStrategy,
  rectSwappingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconCopy,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconRestore,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigation } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  Accordion,
  ActionIcon,
  Affix,
  Badge,
  Button,
  Card,
  Center,
  Checkbox,
  Chip,
  ChipGroup,
  ColorInput,
  Combobox,
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
  ProgressLabel,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Space,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  useCombobox,
} from '@mantine/core';
import { useDisclosure, useMounted, useTimeout } from '@mantine/hooks';
import { PinBox } from '@/components/Devices/Pins';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { proto } from '@/components/SettingsContext/config';
import { DeviceStatus, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { AllPinsNamed, AnalogPins, AnalogPinsNamed } from '@/devices/pico/pins';

function StateLabel({
  profileIdx,
  mappingIdx,
  raw,
  activationBased,
  ledBased,
}: {
  profileIdx: number;
  mappingIdx: number;
  raw?: boolean;
  activationBased?: boolean;
  ledBased?: boolean;
}) {
  const stateRaw = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.stateRaw
      : activationBased
        ? state.activationStatus[profileIdx][mappingIdx]?.stateRaw
        : state.mappingStatus[profileIdx][mappingIdx]?.stateRaw
  );
  const state = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.state
      : activationBased
        ? state.activationStatus[profileIdx][mappingIdx]?.state
        : state.mappingStatus[profileIdx][mappingIdx]?.state
  );
  return <Center h="100%">{raw ? stateRaw : state}</Center>;
}
function StateSection({
  profileIdx,
  mappingIdx,
  min,
  max,
  center,
  deadzone,
  raw,
  trigger,
  activationBased,
  ledBased,
}: {
  profileIdx: number;
  mappingIdx: number;
  min: number;
  max: number;
  center: number;
  deadzone: number;
  raw?: boolean;
  trigger?: boolean;
  activationBased?: boolean;
  ledBased?: boolean;
}) {
  const stateRaw = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.stateRaw
      : activationBased
        ? state.activationStatus[profileIdx][mappingIdx]?.stateRaw
        : state.mappingStatus[profileIdx][mappingIdx]?.stateRaw
  );
  const state = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.state
      : activationBased
        ? state.activationStatus[profileIdx][mappingIdx]?.state
        : state.mappingStatus[profileIdx][mappingIdx]?.state
  );
  if (min > max) {
    const temp = min;
    min = max;
    max = temp;
  }
  if (trigger) {
    const minPerc = (min / 65535) * 100;
    const maxPerc = (max / 65535) * 100;
    return (
      <>
        <Progress.Section value={(stateRaw / 65535) * 100}></Progress.Section>
        <Overlay
          gradient={`linear-gradient(90deg, rgba(255, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) ${minPerc}%, rgba(255, 0, 0, 0.2) ${minPerc}%, rgba(255, 0, 0, 0.2) ${maxPerc}%,  rgba(255, 0, 0, 0) ${maxPerc}%, rgba(0, 0, 0, 0) 100%, rgba(255, 0, 0, 0.2) 100%)`}
          opacity={0.85}
        />
      </>
    );
  }
  if (raw) {
    const minPerc = (min / 65535) * 100;
    const maxPerc = (max / 65535) * 100;
    const deadZoneStartPerc = ((center - deadzone) / 65535) * 100;
    const deadZoneEndPerc = ((center + deadzone) / 65535) * 100;
    return (
      <>
        <Progress.Section value={(stateRaw / 65535) * 100}></Progress.Section>
        <Overlay
          gradient={`linear-gradient(90deg, rgba(255, 0, 0, 0.2) ${minPerc}%, rgba(0, 0, 0, 0) ${minPerc}%, rgba(0, 0, 0, 0) ${deadZoneStartPerc}%, rgba(255, 0, 0, 0.2) ${deadZoneStartPerc}%, rgba(255, 0, 0, 0.2) ${deadZoneEndPerc}%,  rgba(255, 0, 0, 0) ${deadZoneEndPerc}%, rgba(0, 0, 0, 0) ${maxPerc}%, rgba(255, 0, 0, 0.2) ${maxPerc}%)`}
          opacity={0.85}
        />
      </>
    );
  }
  return <Progress.Section value={(state / 65535) * 100}></Progress.Section>;
}
function StateBox({
  profileIdx,
  mappingIdx,
  activationBased,
  ledBased,
}: {
  profileIdx: number;
  mappingIdx: number;
  activationBased?: boolean;
  ledBased?: boolean;
}) {
  const { t } = useTranslation();
  const state = useConfigStore((state) =>
    ledBased
      ? state.ledStatus[profileIdx][mappingIdx]?.state
      : activationBased
        ? state.activationStatus[profileIdx][mappingIdx]?.state
        : state.mappingStatus[profileIdx][mappingIdx]?.state
  );
  return (
    <>
      <Text size="sm">Value</Text>
      <Badge color={state > 0 ? 'blue' : 'gray'}>
        {state > 0
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
}) {
  if (min > max) {
    const temp = min;
    min = max;
    max = temp;
  }
  if (raw) {
    return (
      <>
        <Text size="sm">Raw Value</Text>
        <Progress.Root size={40} transitionDuration={0}>
          <Progress.Label w="100%" h="100%" style={{ position: 'absolute' }}>
            <StateLabel
              mappingIdx={mappingIdx}
              profileIdx={profileIdx}
              activationBased={activationBased}
              ledBased={ledBased}
              raw
            ></StateLabel>
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
            raw
          ></StateSection>
        </Progress.Root>
        <Space h="md" />
      </>
    );
  }
  return (
    <>
      <Text size="sm">Value</Text>
      <Progress.Root size={40} transitionDuration={0}>
        <Progress.Label w="100%" h="100%" style={{ position: 'absolute' }}>
          <StateLabel
            mappingIdx={mappingIdx}
            profileIdx={profileIdx}
            activationBased={activationBased}
          ></StateLabel>
        </Progress.Label>
        <StateSection
          mappingIdx={mappingIdx}
          profileIdx={profileIdx}
          center={center}
          min={min}
          max={max}
          deadzone={deadzone}
          activationBased={activationBased}
        ></StateSection>
      </Progress.Root>
      <Space h="md" />
    </>
  );
}
function OutputBox({
  mapping,
  type,
  mode,
  dispatch,
}: {
  mapping: proto.IMapping;
  type: proto.SubType;
  mode: proto.FaceButtonMappingMode;
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
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 0),
              gamepadAxis: axis,
              gamepadButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, gamepadButton: button, gamepadAxis: null })}
          dispatch3={() => {}}
        ></DropdownOutputBox>
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
          dispatch={(axis) =>
            dispatch({
              min: 0,
              max: 65535,
              ...mapping,
              center: proto.GuitarHeroGuitarAxisType[axis].includes('Whammy') ? 0 : 32767,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 0),
              ghAxis: axis,
              ghButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, ghButton: button, ghAxis: null })}
          dispatch3={() => {}}
        ></DropdownOutputBox>
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
          dispatch={(axis) =>
            dispatch({
              center: proto.RockBandGuitarAxisType[axis].includes('Whammy') ? 0 : 32767,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 0),
              rbAxis: axis,
              rbButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, rbButton: button, rbAxis: null })}
          dispatch3={() => {}}
        ></DropdownOutputBox>
      );
      break;
    case proto.SubType.GuitarHeroDrums:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          e={proto.GuitarHeroDrumsAxisType}
          e2={proto.GuitarHeroDrumsButtonType}
          val={mapping.ghDrumAxis!}
          val2={mapping.ghDrumButton!}
          dispatch={(axis) =>
            dispatch({
              center: proto.GuitarHeroDrumsAxisType[axis].includes('Stick') ? 32767 : 0,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 0),
              ghDrumAxis: axis,
              ghDrumButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, ghDrumButton: button, ghDrumAxis: null })}
          dispatch3={() => {}}
        ></DropdownOutputBox>
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
          dispatch={(axis) =>
            dispatch({
              center: proto.RockBandDrumsAxisType[axis].includes('Stick') ? 32767 : 0,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 0),
              rbDrumAxis: axis,
              rbDrumButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, rbDrumButton: button, rbDrumAxis: null })}
          dispatch3={() => {}}
        ></DropdownOutputBox>
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
          dispatch={(axis) =>
            dispatch({
              center: proto.GuitarHeroLiveGuitarAxisType[axis].includes('Whammy') ? 0 : 32767,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 0),
              ghlAxis: axis,
              ghlButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, ghlButton: button, ghlAxis: null })}
          dispatch3={() => {}}
        ></DropdownOutputBox>
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
          dispatch={(axis) =>
            dispatch({
              center: 32767,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 0),
              djhAxis: axis,
              djhButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, djhButton: button, djhAxis: null })}
          dispatch3={() => {}}
        ></DropdownOutputBox>
      );
      break;
    case proto.SubType.ProGuitarMustang:
    case proto.SubType.ProGuitarSquire:
      return (
        <DropdownOutputBox
          label="outputs"
          title="output"
          e={proto.RockBandGuitarAxisType}
          e2={proto.RockBandGuitarButtonType}
          val={mapping.rbAxis!}
          val2={mapping.rbButton!}
          dispatch={(axis) =>
            dispatch({
              center: proto.RockBandGuitarAxisType[axis].includes('Whammy') ? 0 : 32767,
              min: 0,
              max: 65535,
              ...mapping,
              pressed: isAnalog(mapping.input) ? undefined : (mapping.pressed ?? 0),
              rbAxis: axis,
              rbButton: null,
            })
          }
          dispatch2={(button) => dispatch({ ...mapping, rbButton: button, rbAxis: null })}
          dispatch3={() => {}}
        ></DropdownOutputBox>
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
      return false;
    default:
      return true;
  }
}
function isLed(deviceStatus: DeviceStatus) {
  switch (deviceStatus.type) {
    case 'ws2812':
    case 'apa102':
    case 'stp16cpc':
      return true;
    default:
      return false;
  }
}
function hasDefaults(deviceStatus: DeviceStatus) {
  switch (deviceStatus.type) {
    case 'crkdNeck':
      return true;
    case 'wii':
      return true;
    default:
      return false;
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
  dispatch,
}: {
  e: T;
  val: T[keyof T];
  title: string;
  label: string;
  dispatch: (input: T[keyof T]) => void;
}) {
  const { t } = useTranslation();
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  const base = (
    <InputBase
      label={t(title)}
      component="button"
      type="button"
      pointer
      rightSection={<Combobox.Chevron />}
      rightSectionPointerEvents="none"
      onClick={() => inputCombobox.toggleDropdown()}
    >
      {t(`${label}.${e[val as keyof T]}`)}
    </InputBase>
  );
  if (!inputCombobox.dropdownOpened) {
    return base;
  }
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
      <Combobox.Target>{base}</Combobox.Target>

      <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
        <Combobox.Options>
          {Object.keys(e).map((item) => (
            <Combobox.Option value={item} key={item}>
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
  midi,
  dispatch,
  dispatch2,
  dispatch3,
}: {
  e: T;
  e2: T2;
  val?: T[keyof T];
  val2?: T2[keyof T2];
  val3?: string;
  title: string;
  label: string;
  mode?: proto.FaceButtonMappingMode;
  midi?: boolean;
  dispatch: (input: T[keyof T]) => void;
  dispatch2: (input: T2[keyof T2]) => void;
  dispatch3: (input: string) => void;
}) {
  const { t } = useTranslation();
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  const base = mode ? (
    <InputBase
      label={t(title)}
      component="button"
      type="button"
      pointer
      rightSection={<Combobox.Chevron />}
      rightSectionPointerEvents="none"
      onClick={() => inputCombobox.toggleDropdown()}
    >
      {t(
        `${label}.${FixLabel(mode, (e[val as keyof T] || e2[val2 as keyof T2] || val3) as string)}`
      )}
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
      {t(`${label}.${e[val as keyof T] || e2[val2 as keyof T2] || val3}`)}
    </InputBase>
  );
  if (!inputCombobox.dropdownOpened) {
    return base;
  }
  return (
    <Combobox
      store={inputCombobox}
      onOptionSubmit={(val) => {
        const button = e[val as keyof T];
        const axis = e2[val as keyof T2];
        if (button !== undefined) {
          dispatch(button);
        }
        if (axis !== undefined) {
          dispatch2(axis);
        }
        if (val == 'midiNote' || val == 'midiControlChange' || val == 'midiPitchBend') {
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
              <Combobox.Option value="midiNote">{t('input.midiNote')}</Combobox.Option>
              <Combobox.Option value="midiControlChange">
                {t('input.midiControlChange')}
              </Combobox.Option>
              <Combobox.Option value="midiPitchBend">{t('input.midiPitchBend')}</Combobox.Option>
            </>
          )}
          {Object.keys(e).map((item) => (
            <Combobox.Option value={item} key={item}>
              {t(`${label}.${item}`)}
            </Combobox.Option>
          ))}
          {Object.keys(e2).map((item) => (
            <Combobox.Option value={item} key={item}>
              {t(`${label}.${item}`)}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

function FixLabel(mode: proto.FaceButtonMappingMode, label: string) {
  if (mode == proto.FaceButtonMappingMode.PositionBased) {
    if (label == 'GamepadA') {
      return 'GamepadSouth';
    }
    if (label == 'GamepadB') {
      return 'GamepadEast';
    }
    if (label == 'GamepadX') {
      return 'GamepadWest';
    }
    if (label == 'GamepadY') {
      return 'GamepadNorth';
    }
  }
  return label;
}
function SantrollerInput({
  input,
  axis,
  button,
  mappingIdx,
  activationIdx,
  ledIdx,
  dispatch,
}: {
  input: proto.IInput;
  axis: boolean;
  button: boolean;
  mappingIdx?: number;
  activationIdx?: number;
  ledIdx?: number;
  dispatch: (input: proto.IInput) => void;
}) {
  let deviceId = -1;
  for (const key of Object.keys(input)) {
    const key2 = key as keyof typeof input;
    if (
      key2 != 'fixed' &&
      key2 != 'gpio' &&
      key2 != 'shortcut' &&
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
  const detectedActivation = useConfigStore.getState().detectedActivation;
  const detectedLed = useConfigStore.getState().detectedLed;
  const detecting = useConfigStore((state) => state.detecting);
  const device = useConfigStore((state) => state.deviceStatus[deviceId]);
  const deviceCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  const pinModeCombobox = useCombobox({
    onDropdownClose: () => pinModeCombobox.resetSelectedOption(),
  });

  let deviceValue = '';
  if (input.gpio && input.gpio.analog) {
    deviceValue = t(`devices.gpio_analog`);
  } else if (input.gpio) {
    deviceValue = t(`devices.gpio_digital`);
  } else if (input.mouseAxis) {
    deviceValue = t(`devices.mouseAxis`);
  } else if (input.mouseButton) {
    deviceValue = t(`devices.mouseButton`);
  } else if (input.key) {
    deviceValue = t(`devices.key`);
  } else if (input.shortcut) {
    deviceValue = t(`devices.shortcut`);
  } else if (device) {
    deviceValue = `${t(`devices.${device.type}`)} (${DeviceStatus.label(device)})`;
  }
  if (
    detectedMapping !== undefined &&
    detectedMapping == mappingIdx &&
    detected != -1 &&
    input.gpio
  ) {
    dispatch({ gpio: { ...input.gpio!, pin: detected } });
  }
  if (
    detectedActivation !== undefined &&
    detectedActivation == activationIdx &&
    detected != -1 &&
    input.gpio
  ) {
    dispatch({ gpio: { ...input.gpio!, pin: detected } });
  }
  if (detectedLed !== undefined && detectedLed == ledIdx && detected != -1 && input.gpio) {
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
              switch (deviceStatus[parseInt(val)].type) {
                case 'wii':
                  if (axis) {
                    dispatch({
                      wiiAxis: {
                        axis: proto.WiiAxisType.WiiAxisClassicLeftStickX,
                        deviceid: parseInt(val),
                      },
                    });
                  } else if (button) {
                    dispatch({
                      wiiButton: {
                        button: proto.WiiButtonType.WiiButtonClassicA,
                        deviceid: parseInt(val),
                      },
                    });
                  }
                  break;
                case 'psx':
                  if (axis) {
                    dispatch({
                      ps2Axis: {
                        axis: proto.PS2AxisType.PS2AxisLeftStickX,
                        deviceid: parseInt(val),
                      },
                    });
                  } else if (button) {
                    dispatch({
                      ps2Button: {
                        button: proto.PS2ButtonType.PS2ButtonCross,
                        deviceid: parseInt(val),
                      },
                    });
                  }
                  break;
                case 'ads1115':
                  dispatch({
                    ads1115: {
                      channel: 0,
                      deviceid: parseInt(val),
                    },
                  });
                  break;
                case 'multiplexer':
                  dispatch({
                    multiplexer: {
                      channel: 0,
                      deviceid: parseInt(val),
                    },
                  });
                  break;
                case 'accelerometer':
                  dispatch({
                    accelerometer: {
                      type: proto.AccelerometerInputType.AccelerometerX,
                      deviceid: parseInt(val),
                    },
                  });
                  break;
                case 'crkdNeck':
                  dispatch({
                    crkd: {
                      button: proto.CrkdNeckButtonType.CrkdGreen,
                      deviceid: parseInt(val),
                    },
                  });
                  break;
                case 'gh5Neck':
                  dispatch({
                    gh5Neck: {
                      button: proto.Gh5NeckButtonType.Gh5Green,
                      deviceid: parseInt(val),
                    },
                  });
                  break;
                case 'usbHost':
                  dispatch({
                    usbButton: {
                      button: proto.UsbButtonType.UsbButtonA,
                      deviceid: parseInt(val),
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
            }
          }}
        >
          <Combobox.Target>
            <InputBase
              label="Device"
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
                    {t(`devices.${item.type}`)} ({DeviceStatus.label(item)})
                  </Combobox.Option>
                ))}
              <Combobox.Option value="gpio_analog">{t('devices.gpio_analog')}</Combobox.Option>
              <Combobox.Option value="gpio_digital">{t('devices.gpio_digital')}</Combobox.Option>
              <Combobox.Option value="shortcut">{t('devices.shortcut')}</Combobox.Option>
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      )) || (
        <InputBase
          label="Device"
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
                  ...input.shortcut?.inputs!,
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
                          inputs: input.shortcut?.inputs?.filter((oldX, oldIdx) => idx != oldIdx),
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
                          inputs: [...input.shortcut?.inputs!, { ...innerInput }],
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
                input={innerInput}
                dispatch={(changed) =>
                  dispatch({
                    shortcut: {
                      inputs: input.shortcut?.inputs?.map((oldX, oldIdx) =>
                        idx == oldIdx ? changed : oldX
                      ),
                    },
                  })
                }
                mappingIdx={mappingIdx}
              ></SantrollerInput>
            </Card>
          </div>
        ))}
      {device?.type == 'wii' && (
        <DropdownOutputBox
          title="input"
          e={proto.WiiAxisType}
          e2={proto.WiiButtonType}
          val={input.wiiAxis?.axis}
          val2={input.wiiButton?.button}
          val3={
            input.midiNote
              ? 'midiNote'
              : input.midiControlChange
                ? 'midiControlChange'
                : input.midiPitchBend
                  ? 'midiPitchBend'
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
            }
          }}
        ></DropdownOutputBox>
      )}
      {(input.ps2Axis || input.ps2Button) && (
        <DropdownOutputBox
          title="input"
          e={proto.PS2AxisType}
          e2={proto.PS2ButtonType}
          val={input.ps2Axis?.axis}
          val2={input.ps2Button?.button}
          label="ps2.inputs"
          dispatch={(axis) =>
            dispatch({ ps2Axis: { ...input.ps2Axis!, axis, deviceid: deviceId } })
          }
          dispatch2={(button) =>
            dispatch({ ps2Button: { ...input.ps2Button!, button, deviceid: deviceId } })
          }
          dispatch3={() => {}}
        ></DropdownOutputBox>
      )}
      {device?.type == 'usbHost' && (
        <DropdownOutputBox
          title="input"
          e={proto.UsbAxisType}
          e2={proto.UsbButtonType}
          val={input.usbAxis?.axis}
          val2={input.usbButton?.button}
          val3={
            input.midiNote
              ? 'midiNote'
              : input.midiControlChange
                ? 'midiControlChange'
                : input.midiPitchBend
                  ? 'midiPitchBend'
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
            }
          }}
        ></DropdownOutputBox>
      )}
      {input.crkd && (
        <DropdownBox
          title="input"
          e={proto.CrkdNeckButtonType}
          val={input.crkd?.button}
          label="crkd.inputs"
          dispatch={(button) => dispatch({ crkd: { ...input.crkd!, button } })}
        ></DropdownBox>
      )}
      {input.gh5Neck && (
        <DropdownBox
          title="input"
          e={proto.Gh5NeckButtonType}
          val={input.gh5Neck?.button}
          label="gh5Neck.inputs"
          dispatch={(button) => dispatch({ gh5Neck: { ...input.gh5Neck!, button } })}
        ></DropdownBox>
      )}
      {input.gpio && (
        <>
          <Group>
            <div style={{ flexGrow: 1 }}>
              <PinBox
                label="pin_label"
                valid={input.gpio.analog ? AnalogPinsNamed : AllPinsNamed}
                pin={input.gpio.pin}
                dispatch={(pin) => dispatch({ gpio: { ...input.gpio!, pin } })}
              />
            </div>
            <DropdownBox
              title="gpio.mode.label"
              e={proto.PinMode}
              val={input.gpio?.pinMode}
              label="gpio.mode"
              dispatch={(pinMode) => dispatch({ gpio: { ...input.gpio!, pinMode } })}
            ></DropdownBox>
            <Input.Wrapper label=" " description=" " error=" ">
              <Button
                onClick={() => {
                  detectPins(
                    activationIdx,
                    mappingIdx,
                    ledIdx,
                    input.gpio!.analog
                      ? proto.PinDetectType.DetectAnalog
                      : proto.PinDetectType.DetectDigital
                  );
                }}
                disabled={detecting}
              >
                {t('pin_detect')}
              </Button>
            </Input.Wrapper>
          </Group>
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
                    channel: parseInt(val),
                  },
                });
                pinModeCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Channel"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => pinModeCombobox.toggleDropdown()}
                >
                  {input.ads1115.channel}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  <Combobox.Option value="0">Channel 0</Combobox.Option>
                  <Combobox.Option value="1">Channel 1</Combobox.Option>
                  <Combobox.Option value="2">Channel 2</Combobox.Option>
                  <Combobox.Option value="3">Channel 3</Combobox.Option>
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Channel"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => pinModeCombobox.toggleDropdown()}
            >
              {input.ads1115.channel}
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
                    channel: parseInt(val),
                  },
                });
                pinModeCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Channel"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => pinModeCombobox.toggleDropdown()}
                >
                  {input.multiplexer.channel}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  <Combobox.Option value="0">Channel 0</Combobox.Option>
                  <Combobox.Option value="1">Channel 1</Combobox.Option>
                  <Combobox.Option value="2">Channel 2</Combobox.Option>
                  <Combobox.Option value="3">Channel 3</Combobox.Option>
                  <Combobox.Option value="4">Channel 4</Combobox.Option>
                  <Combobox.Option value="5">Channel 5</Combobox.Option>
                  <Combobox.Option value="6">Channel 6</Combobox.Option>
                  <Combobox.Option value="7">Channel 7</Combobox.Option>

                  {device.device.multiplexer?.sixteenChannel && (
                    <>
                      <Combobox.Option value="8">Channel 8</Combobox.Option>
                      <Combobox.Option value="9">Channel 9</Combobox.Option>
                      <Combobox.Option value="10">Channel 10</Combobox.Option>
                      <Combobox.Option value="11">Channel 11</Combobox.Option>
                      <Combobox.Option value="12">Channel 12</Combobox.Option>
                      <Combobox.Option value="13">Channel 13</Combobox.Option>
                      <Combobox.Option value="14">Channel 14</Combobox.Option>
                      <Combobox.Option value="15">Channel 15</Combobox.Option>
                    </>
                  )}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Channel"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => pinModeCombobox.toggleDropdown()}
            >
              {input.multiplexer.channel}
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
        ></DropdownBox>
      )}
      {input.midiNote && (
        <>
          <NumberInput
            label={t('input.midiNote')}
            value={input.midiNote.note}
            onChange={(val) => dispatch({ midiNote: { ...input.midiNote!, note: Number(val) } })}
          ></NumberInput>
        </>
      )}
    </>
  );
}
function isAnalog(input: proto.IInput) {
  return (
    input.gpio?.analog ||
    input.ads1115 ||
    input.wiiAxis ||
    input.accelerometer ||
    input.usbAxis ||
    input.ps2Axis ||
    input.midiNote ||
    input.midiControlChange ||
    input.midiPitchBend
  );
}
function SantrollerMapping({
  mapping,
  type,
  profileIdx,
  mappingIdx,
  mode,
  dispatch,
  deleteInput,
  copyInput,
}: {
  mapping: proto.IMapping;
  type: proto.SubType;
  profileIdx: number;
  mappingIdx: number;
  mode: proto.FaceButtonMappingMode;
  dispatch: (mapping: proto.IMapping) => void;
  deleteInput: () => void;
  copyInput: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({
    id: mappingIdx,
  });

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
    proto.RockBandGuitarButtonType[mapping.rbButton ?? -1] ||
    proto.RockBandGuitarAxisType[mapping.rbAxis ?? -1] ||
    proto.ProGuitarButtonType[mapping.proButton ?? -1] ||
    proto.ProGuitarAxisType[mapping.proAxis ?? -1] ||
    proto.DJHTurntableButtonType[mapping.djhButton ?? -1] ||
    proto.DJHTurntableAxisType[mapping.djhAxis ?? -1];

  let fixedLabel = FixLabel(mode, label);
  let img = `Icons/Input/${fixedLabel}.png`;
  const button = Object.entries(mapping).find(([k, v]) => k.endsWith('Button') && v);
  const axis = Object.entries(mapping).find(([k, v]) => k.endsWith('Axis') && v);
  const stick = label?.includes('Stick');
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
          <Center>
            <Image src={img} height={75} w="auto" fit="contain" alt={img} />
          </Center>
        </Card.Section>
        {button && <StateBox mappingIdx={mappingIdx} profileIdx={profileIdx}></StateBox>}
        {axis && (
          <StateSlider
            mappingIdx={mappingIdx}
            profileIdx={profileIdx}
            center={mapping.center!}
            min={mapping.min!}
            max={mapping.max!}
            deadzone={mapping.deadzone!}
          ></StateSlider>
        )}
        <OutputBox dispatch={dispatch} type={type} mode={mode} mapping={mapping}></OutputBox>
        <Space h="md" />
        <SantrollerInput
          axis={!!axis}
          button={!!button}
          input={mapping.input}
          dispatch={(input) => {
            dispatch({
              ...mapping,
              input,
              pressed: isAnalog(input) ? undefined : (mapping.pressed ?? 0),
            });
          }}
          mappingIdx={mappingIdx}
        ></SantrollerInput>
        <Space h="md" />
        {button && (
          <NumberInput
            label={t('debounce.label')}
            description={t('debounce.desc')}
            value={mapping.debounce ?? 0}
            onChange={(val) => dispatch({ ...mapping, debounce: Number(val) })}
          ></NumberInput>
        )}
        <Space h="md" />
        {button && analogInput && (
          <>
            <Space h="md" />
            <Accordion>
              <Accordion.Item value="main">
                <Accordion.Control>Button Mapping</Accordion.Control>
                <Accordion.Panel>
                  <>
                    <DropdownBox
                      title="trigger_type.label"
                      e={proto.AnalogToDigitalTriggerType}
                      val={mapping.trigger!}
                      label="trigger_type"
                      dispatch={(trigger) => dispatch({ ...mapping, trigger })}
                    ></DropdownBox>
                    {mapping.trigger == proto.AnalogToDigitalTriggerType.JoyHigh && (
                      <StateSlider
                        mappingIdx={mappingIdx}
                        profileIdx={profileIdx}
                        center={32767}
                        min={mapping.triggerValue!}
                        max={65535}
                        deadzone={mapping.deadzone!}
                        raw
                      ></StateSlider>
                    )}
                    {mapping.trigger == proto.AnalogToDigitalTriggerType.JoyLow && (
                      <StateSlider
                        mappingIdx={mappingIdx}
                        profileIdx={profileIdx}
                        center={32767}
                        min={0}
                        max={mapping.triggerValue!}
                        deadzone={mapping.deadzone!}
                        raw
                      ></StateSlider>
                    )}
                    {mapping.trigger == proto.AnalogToDigitalTriggerType.Range && (
                      <StateSlider
                        mappingIdx={mappingIdx}
                        profileIdx={profileIdx}
                        center={32767}
                        min={mapping.triggerValue!}
                        max={mapping.maxTriggerValue!}
                        deadzone={mapping.deadzone!}
                        raw
                      ></StateSlider>
                    )}
                    {(mapping.trigger == proto.AnalogToDigitalTriggerType.Range && (
                      <Text size="sm">{t('trigger.min')}</Text>
                    )) || <Text size="sm">{t('trigger.trigger')}</Text>}
                    <Slider
                      value={mapping.triggerValue!}
                      min={0}
                      max={65535}
                      onChange={(val) => dispatch({ ...mapping, triggerValue: val })}
                    />
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
                    {mapping.trigger == proto.AnalogToDigitalTriggerType.Range && (
                      <>
                        <Text size="sm">{t('trigger.max')}</Text>
                        <Slider
                          value={mapping.maxTriggerValue!}
                          min={0}
                          max={65535}
                          onChange={(val) => dispatch({ ...mapping, maxTriggerValue: val })}
                        />

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
                      </>
                    )}
                  </>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </>
        )}
        {axis && !analogInput && (
          <>
            <Switch
              label={t('axis.released_toggle')}
              checked={mapping.released !== null}
              onChange={(event) => {
                dispatch({
                  ...mapping,
                  released: event.currentTarget.checked ? (stick ? 32767 : 0) : undefined,
                });
              }}
            />
            <Space h="md" />
            {mapping.released && (
              <>
                <Text size="sm">{t('axis.released')}</Text>
                <Slider
                  value={mapping.released!}
                  min={0}
                  max={65535}
                  onChange={(val) => dispatch({ ...mapping, released: val })}
                />
              </>
            )}
            <Text size="sm">{t('axis.pressed')}</Text>
            <Slider
              value={mapping.pressed!}
              min={0}
              max={65535}
              onChange={(val) => dispatch({ ...mapping, pressed: val })}
            />
          </>
        )}
        {axis && analogInput && (
          <>
            <Space h="md" />
            <Accordion>
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
                      ></StateSlider>
                      {stick && (
                        <>
                          <Text size="sm">Center</Text>
                          <Slider
                            value={mapping.center!}
                            min={0}
                            max={65535}
                            onChange={(val) => dispatch({ ...mapping, center: val })}
                          />
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
                          <Space h="md" />
                        </>
                      )}
                      <Text size="sm">Min</Text>
                      <Slider
                        value={mapping.min!}
                        min={0}
                        max={65535}
                        onChange={(val) => dispatch({ ...mapping, min: val })}
                      />
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
                      <Space h="md" />
                      <Text size="sm">Max</Text>
                      <Slider
                        value={mapping.max!}
                        min={0}
                        max={65535}
                        onChange={(val) => dispatch({ ...mapping, max: val })}
                      />
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
                      <Space h="md" />
                      <Text size="sm">Deadzone</Text>
                      <Slider
                        value={mapping.deadzone!}
                        min={0}
                        max={65535}
                        onChange={(val) => dispatch({ ...mapping, deadzone: val })}
                      />
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
  type,
  profileIdx,
  ledIdx,
  mode,
  dispatch,
  deleteLed,
  copyInput,
}: {
  led: proto.ILed;
  type: proto.SubType;
  profileIdx: number;
  ledIdx: number;
  mode: proto.FaceButtonMappingMode;
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
  }
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const device = useConfigStore((state) => state.deviceStatus[deviceId]);
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  let img = `Icons/Generic.png`;
  const analog = !!(
    led.mapping.inputMapping?.input.gpio?.analog ||
    led.mapping.inputMapping?.input.ads1115 ||
    led.mapping.inputMapping?.input.wiiAxis ||
    led.mapping.inputMapping?.input.accelerometer
  );
  let deviceValue = '';
  if (led.device.gpio && led.device.gpio.analog) {
    deviceValue = t(`devices.gpio_analog`);
  } else if (led.device.gpio) {
    deviceValue = t(`devices.gpio_digital`);
  } else if (device) {
    deviceValue = `${t(`devices.${device.type}`)} (${DeviceStatus.label(device)})`;
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
          <Center>
            <Image src={img} height={75} w="auto" fit="contain" alt={img} />
          </Center>
        </Card.Section>

        {(deviceCombobox.dropdownOpened && (
          <Combobox
            store={deviceCombobox}
            onOptionSubmit={(val) => {
              deviceCombobox.closeDropdown();
              if (isNumberLike(val)) {
                switch (deviceStatus[parseInt(val)].type) {
                  case 'ws2812':
                  case 'apa102':
                    dispatch({
                      ...led,
                      device: {
                        rgb: {
                          activeLed: [],
                          deviceId: parseInt(val),
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
                          deviceId: parseInt(val),
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
                label="LED Device"
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
                      {t(`devices.${item.type}`)} ({DeviceStatus.label(item)})
                    </Combobox.Option>
                  ))}
                <Combobox.Option value="gpio_analog">{t('devices.gpio_analog')}</Combobox.Option>
                <Combobox.Option value="gpio_digital">{t('devices.gpio_digital')}</Combobox.Option>
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )) || (
          <InputBase
            label="LED Device"
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
                label="LED Mode"
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
            label="LED Mode"
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
            dispatch={(pin) => dispatch({ ...led, device: { gpio: { ...led.device.gpio!, pin } } })}
          />
        )}
        {led.mapping.inputMapping?.input && (
          <>
            <DropdownBox
              title="leds.pattern.label"
              e={proto.ReactiveRgbPatternType}
              val={led.mapping.inputMapping.pattern ?? proto.ReactiveRgbPatternType.PatternStatic}
              label="leds.pattern"
              dispatch={(pattern) =>
                dispatch({
                  ...led,
                  mapping: { inputMapping: { ...led.mapping.inputMapping!, pattern } },
                })
              }
            ></DropdownBox>
            <SantrollerInput
              axis={analog}
              button={!analog}
              input={led.mapping.inputMapping?.input}
              dispatch={(input) => {
                dispatch({
                  ...led,
                  mapping: { inputMapping: { ...led.mapping.inputMapping, input } },
                });
              }}
              ledIdx={ledIdx}
            ></SantrollerInput>
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
            ></DropdownBox>
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
            {led.mapping.patternMapping.pattern == proto.RgbPatternType.PatternRainbow && (
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
        {led.device.rgb && (
          <>
            <MultiSelect
              label="Leds"
              value={led.device.rgb?.activeLed?.map((x) => x.toString())}
              data={Array.from(
                { length: device.device.ws2812?.count || device.device.apa102?.count || 0 },
                (_, x) => x.toString()
              )}
              clearable
              maxValues={255}
              onChange={(val) =>
                dispatch({
                  ...led,
                  device: { rgb: { ...led.device.rgb!, activeLed: val.map((x) => parseInt(x)) } },
                })
              }
              searchable
            />
            <Space h="md" />
            {led.mapping.patternMapping?.pattern != proto.RgbPatternType.PatternRainbow && (
              <Switch
                label={t('leds.set_off')}
                checked={led.device.rgb.hasStart}
                onChange={(event) => {
                  console.log(event.currentTarget.checked);
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
            )}
            {(led.mapping.patternMapping?.pattern != proto.RgbPatternType.PatternRainbow &&
              led.device.rgb.hasStart &&
              !led.mapping.staticMapping && (
                <Group>
                  <ColorInput
                    label="Off Colour"
                    placeholder="Input placeholder"
                    format="rgba"
                    value={`rgba(${led.device.rgb?.startR}, ${led.device.rgb?.startG}, ${led.device.rgb?.startB}, ${(led.device.rgb?.startW! / 255).toFixed(2)})`}
                    onChange={(val) => {
                      if (!val) return;
                      const [r, g, b, w] = val.split('(')[1].split(')')[0].split(', ');
                      dispatch({
                        ...led,
                        device: {
                          ...led.device,
                          rgb: {
                            ...led.device.rgb!,
                            startR: parseInt(r),
                            startG: parseInt(g),
                            startB: parseInt(b),
                            startW: parseFloat(w) * 255,
                          },
                        },
                      });
                    }}
                  />
                  <Input.Wrapper label=" " description=" " error=" ">
                    <Button
                      onClick={() =>
                        dispatch({
                          ...led,
                          device: {
                            ...led.device,
                            rgb: {
                              ...led.device.rgb!,
                              endR: led.device.rgb?.startR!,
                              endG: led.device.rgb?.startG!,
                              endB: led.device.rgb?.startB!,
                              endW: led.device.rgb?.startW!,
                            },
                          },
                        })
                      }
                    >
                      Copy to on
                    </Button>
                  </Input.Wrapper>
                </Group>
              )) ||
              undefined}
            <Space h="md" />
            {led.mapping.patternMapping?.pattern != proto.RgbPatternType.PatternRainbow && (
              <Group>
                <ColorInput
                  label="On Colour"
                  placeholder="Input placeholder"
                  format="rgba"
                  value={`rgba(${led.device.rgb?.endR}, ${led.device.rgb?.endG}, ${led.device.rgb?.endB}, ${(led.device.rgb?.endW! / 255).toFixed(2)})`}
                  onChange={(val) => {
                    if (!val) return;
                    const [r, g, b, w] = val.split('(')[1].split(')')[0].split(', ');
                    dispatch({
                      ...led,
                      device: {
                        ...led.device,
                        rgb: {
                          ...led.device.rgb!,
                          endR: parseInt(r),
                          endG: parseInt(g),
                          endB: parseInt(b),
                          endW: parseFloat(w) * 255,
                        },
                      },
                    });
                  }}
                />
                {!led.mapping.staticMapping && led.device.rgb.hasStart && (
                  <Input.Wrapper label=" " description=" " error=" ">
                    <Button
                      onClick={() =>
                        dispatch({
                          ...led,
                          device: {
                            ...led.device,
                            rgb: {
                              ...led.device.rgb!,
                              startR: led.device.rgb?.endR!,
                              startG: led.device.rgb?.endG!,
                              startB: led.device.rgb?.endB!,
                              startW: led.device.rgb?.endW!,
                            },
                          },
                        })
                      }
                    >
                      Copy to off
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
              min={led.mapping.inputMapping?.min!}
              max={led.mapping.inputMapping?.max!}
              deadzone={0}
              raw
              ledBased
            ></StateSlider>
            <Text size="sm">Min</Text>
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
            <Text size="sm">Max</Text>
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
            <Text size="sm">Active</Text>
            <StateBox mappingIdx={ledIdx} profileIdx={profileIdx} ledBased></StateBox>
          </>
        )}
      </Card>
    </div>
  );
}

type ProfileAssignmentTypes = keyof proto.IProfileAssignmentInfo;
const AllProfileAssignmentTypes: ProfileAssignmentTypes[] = [
  'catchall',
  'consoleType',
  'wiiExt',
  'ps2Cnt',
  'usbType',
  'usbDevice',
  'input',
  'inputAnyTime',
  'midiChannel',
];
const SingleProfileAssignmentTypes: ProfileAssignmentTypes[] = [
  'catchall',
  'wiiExt',
  'ps2Cnt',
  'usbType',
  'usbDevice',
  'midiChannel',
];
const MultiProfileAssignmentTypes: ProfileAssignmentTypes[] = AllProfileAssignmentTypes.filter(
  (x) => !SingleProfileAssignmentTypes.includes(x)
);
function ActivationTrigger({
  input,
  profileIdx,
  activationIdx,
  dispatch,
}: {
  input: proto.IInputActivationTrigger;
  profileIdx: number;
  activationIdx: number;
  dispatch: (input: proto.IInputActivationTrigger) => void;
}) {
  const { t } = useTranslation();
  return (
    <Accordion>
      <Accordion.Item value="main">
        <Accordion.Control>Button Mapping</Accordion.Control>
        <Accordion.Panel>
          <>
            <DropdownBox
              title="trigger_type.label"
              e={proto.AnalogToDigitalTriggerType}
              val={input.trigger!}
              label="trigger_type"
              dispatch={(trigger) => dispatch({ ...input, trigger })}
            ></DropdownBox>
            {input.trigger == proto.AnalogToDigitalTriggerType.JoyHigh && (
              <StateSlider
                mappingIdx={activationIdx}
                profileIdx={profileIdx}
                center={32767}
                min={input.triggerValue!}
                max={65535}
                deadzone={0}
                raw
                activationBased
              ></StateSlider>
            )}
            {input.trigger == proto.AnalogToDigitalTriggerType.JoyLow && (
              <StateSlider
                mappingIdx={activationIdx}
                profileIdx={profileIdx}
                center={32767}
                min={0}
                max={input.triggerValue!}
                deadzone={0}
                raw
                activationBased
              ></StateSlider>
            )}
            {input.trigger == proto.AnalogToDigitalTriggerType.Range && (
              <StateSlider
                mappingIdx={activationIdx}
                profileIdx={profileIdx}
                center={32767}
                min={input.triggerValue!}
                max={input.maxTriggerValue!}
                deadzone={0}
                raw
                activationBased
              ></StateSlider>
            )}
            {(input.trigger == proto.AnalogToDigitalTriggerType.Range && (
              <Text size="sm">{t('trigger.min')}</Text>
            )) || <Text size="sm">{t('trigger.trigger')}</Text>}

            <Slider
              value={input.triggerValue!}
              min={0}
              max={65535}
              onChange={(val) => dispatch({ ...input, triggerValue: val })}
            />

            <Button
              onClick={() => {
                dispatch({
                  ...input,
                  triggerValue:
                    useConfigStore.getState().activationStatus[profileIdx][activationIdx].stateRaw,
                });
              }}
            >
              {t('pin_use_current')}
            </Button>
            {input.trigger == proto.AnalogToDigitalTriggerType.Range && (
              <>
                <Text size="sm">{t('trigger.max')}</Text>
                <Slider
                  value={input.maxTriggerValue!}
                  min={0}
                  max={65535}
                  onChange={(val) => dispatch({ ...input, maxTriggerValue: val })}
                />

                <Button
                  onClick={() => {
                    dispatch({
                      ...input,
                      maxTriggerValue:
                        useConfigStore.getState().activationStatus[profileIdx][activationIdx]
                          .stateRaw,
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
function SantrollerAssignment({
  mapping,
  profileIdx,
  activationIdx,
  mode,
  filterSingle,
  dispatch,
  deleteAssignment,
  copyAssignment,
}: {
  mapping: proto.IProfileAssignmentInfo;
  profileIdx: number;
  activationIdx: number;
  mode: proto.FaceButtonMappingMode;
  filterSingle: boolean;
  dispatch: (mapping: proto.IProfileAssignmentInfo) => void;
  deleteAssignment: () => void;
  copyAssignment: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const assignmentTypeCombobox = useCombobox({
    onDropdownClose: () => assignmentTypeCombobox.resetSelectedOption(),
  });
  const types = filterSingle ? MultiProfileAssignmentTypes : AllProfileAssignmentTypes;
  const label = t(
    'assignmentType.' + types.filter((x) => mapping[x] != null && mapping[x] != undefined)
  );
  const base = useMemo(
    () => (
      <InputBase
        label="Assignment Type"
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
    mapping.input?.input.gpio?.analog ||
    mapping.input?.input.ads1115 ||
    mapping.input?.input.wiiAxis ||
    mapping.inputAnyTime?.input.gpio?.analog ||
    mapping.inputAnyTime?.input.ads1115 ||
    mapping.inputAnyTime?.input.wiiAxis;
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
          {!mapping.catchall && (
            <div style={{ position: 'absolute', top: 0, right: 0 }}>
              <ActionIcon color="red">
                <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
              </ActionIcon>
              <ActionIcon>
                <IconCopy style={{ width: '70%', height: '70%' }} onClick={copyAssignment} />
              </ActionIcon>
            </div>
          )}
        </Card.Section>
        <Space h="md" />
        <StateBox mappingIdx={activationIdx} profileIdx={profileIdx} activationBased></StateBox>
        <Combobox
          store={assignmentTypeCombobox}
          onOptionSubmit={(val) => {
            switch (val as ProfileAssignmentTypes) {
              case 'catchall':
                dispatch({ catchall: true });
                break;
              case 'consoleType':
                dispatch({
                  consoleType: proto.ConsoleType.ConsolePC,
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
              {types.map((item) => (
                <Combobox.Option value={item} key={item}>
                  {t(`assignmentType.${FixLabel(mode, item)}`)}
                </Combobox.Option>
              ))}
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
          ></DropdownBox>
        )}
        {mapping.midiChannel && (
          <NumberInput
            label="MIDI Channel"
            value={mapping.midiChannel}
            min={1}
            max={16}
            onChange={(val) => dispatch({ midiChannel: parseInt(val.toString()) ?? 1 })}
          />
        )}
        {mapping.consoleType && (
          <DropdownBox
            title="activation.consoleType"
            e={proto.ConsoleType}
            val={mapping.consoleType}
            label="consoleType"
            dispatch={(consoleType) => dispatch({ consoleType })}
          ></DropdownBox>
        )}
        {mapping.wiiExt !== undefined && mapping.wiiExt != null && (
          <DropdownBox
            title="activation.wiiExt"
            e={proto.WiiExtType}
            val={mapping.wiiExt}
            label="wiiExt"
            dispatch={(wiiExt) => dispatch({ wiiExt })}
          ></DropdownBox>
        )}
        {mapping.ps2Cnt && (
          <DropdownBox
            title="activation.ps2Cnt"
            e={proto.PS2ControllerType}
            val={mapping.ps2Cnt}
            label="ps2Cnt"
            dispatch={(ps2Cnt) => dispatch({ ps2Cnt })}
          ></DropdownBox>
        )}
        {mapping.usbDevice && (
          <>
            <TextInput
              label="Vendor ID"
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
              label="Product ID"
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
        {mapping.input && (
          <SantrollerInput
            axis={false}
            button={true}
            input={mapping.input.input}
            dispatch={(input) => dispatch({ ...mapping, input: { input } })}
            activationIdx={activationIdx}
          ></SantrollerInput>
        )}
        {mapping.inputAnyTime && (
          <>
            <SantrollerInput
              axis={false}
              button={true}
              input={mapping.inputAnyTime.input}
              activationIdx={activationIdx}
              dispatch={(input) => dispatch({ ...mapping, inputAnyTime: { input } })}
            ></SantrollerInput>
            {analogInput && (
              <ActivationTrigger
                input={mapping.inputAnyTime}
                profileIdx={profileIdx}
                activationIdx={activationIdx}
                dispatch={(inputAnyTime) => dispatch({ ...mapping, inputAnyTime })}
              ></ActivationTrigger>
            )}
          </>
        )}
        {mapping.input && (
          <>
            <SantrollerInput
              axis={false}
              button={true}
              input={mapping.input.input}
              dispatch={(input) => dispatch({ ...mapping, input: { input } })}
            ></SantrollerInput>
            {analogInput && (
              <ActivationTrigger
                input={mapping.input}
                profileIdx={profileIdx}
                activationIdx={activationIdx}
                dispatch={(input) => dispatch({ ...mapping, input })}
              ></ActivationTrigger>
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
  mode,
  dispatch,
  deleteAssignment,
  copyAssignment,
}: {
  mapping: proto.IProfileAssignment;
  profileIdx: number;
  mode: proto.FaceButtonMappingMode;
  dispatch: (mapping: proto.IProfileAssignment) => void;
  deleteAssignment: () => void;
  copyAssignment: () => void;
}) {
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
        <Group>
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
        </Group>
        <Space h="md" />
        {mapping.assignments?.map((assignment, assignmentIdx) => (
          <SantrollerAssignment
            key={assignmentIdx}
            activationIdx={assignmentIdx}
            mapping={assignment}
            filterSingle={
              mapping.assignments?.some(
                (x) => x != assignment && SingleProfileAssignmentTypes.some((y) => x[y])
              ) ?? false
            }
            profileIdx={profileIdx}
            mode={mode}
            dispatch={(val) =>
              dispatch({
                ...mapping,
                assignments: [
                  ...mapping.assignments!.map((cAssignment, cAssignmentIdx) =>
                    cAssignmentIdx == assignmentIdx ? val : cAssignment
                  ),
                ],
              })
            }
            deleteAssignment={() =>
              dispatch({
                ...mapping,
                assignments: [
                  ...mapping.assignments!.filter(
                    (_, cAssignmentIdx) => cAssignmentIdx != assignmentIdx
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
function Profile({ profileIdx }: { profileIdx: number }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [opened2, { open: open2, close: close2 }] = useDisclosure(false);
  const [opened3, { open: open3, close: close3 }] = useDisclosure(false);
  const [opened4, { open: open4, close: close4 }] = useDisclosure(false);
  const { t } = useTranslation();
  const profiles = useConfigStore((state) => state.config.profiles!);
  const updateProfile = useConfigStore((state) => state.updateProfile);
  const deleteProfile = useConfigStore((state) => state.deleteProfile);
  const loadDefaults = useConfigStore((state) => state.loadDefaults);
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const profile = profiles[profileIdx];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );
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
                loadDefaults(undefined);
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
        label="Profile name"
      />
      <Space h="md" />
      <Space h="md" />

      <DropdownBox
        title="device_to_emulate"
        e={proto.SubType}
        val={profile.deviceToEmulate!}
        label="subType"
        dispatch={(deviceToEmulate) => updateProfile({ ...profile, deviceToEmulate }, profileIdx)}
      ></DropdownBox>

      {profile.deviceToEmulate == proto.SubType.Gamepad && (
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
            label={t('axis.invert_y_hid')}
            checked={!!profile.invertYAxisHid}
            onChange={(event) =>
              updateProfile({ ...profile, invertYAxisHid: event.currentTarget.checked }, profileIdx)
            }
          />
        </>
      )}
      <Space h="md" />
      <Switch
        label={t('mode.xinput_on_windows')}
        checked={!!profile.xinputOnWindows}
        onChange={(event) =>
          updateProfile({ ...profile, xinputOnWindows: event.currentTarget.checked }, profileIdx)
        }
      />
      <Space h="md" />
      <Switch
        label={t('mode.supportsPs4')}
        checked={!!profile.ps4OrPs5Mode}
        onChange={(event) =>
          updateProfile({ ...profile, ps4OrPs5Mode: event.currentTarget.checked }, profileIdx)
        }
      />
      <Space h="md" />
      <Title order={3}>{t('assignments.title')}</Title>
      <Space h="md" />
      <Input.Description c="dimmed">
        Assigning profiles allows Santroller to pick the right profile depending on what you are
        doing. Each profile can have multiple assignments, and then the profile is assigned if all
        the matches in a profile match.
      </Input.Description>
      <Input.Description c="dimmed">
        The catch all matcher is special in that it will be used in any case where no profiles have
        valid matches.
      </Input.Description>
      <Space h="md" />

      <Table stickyHeader stickyHeaderOffset={60} withRowBorders={false}>
        <Table.Thead>
          <Table.Tr>
            <Table.Td>
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
                    items={profile.assignments?.map((mapping, mappingIdx) => mappingIdx)!}
                    strategy={rectSortingStrategy}
                  >
                    {profile.assignments?.map((mapping, mappingIdx) => (
                      <SantrollerAssignmentList
                        key={mappingIdx}
                        mapping={mapping}
                        profileIdx={profileIdx}
                        mode={profile.faceButtonMappingMode}
                        dispatch={(val) =>
                          updateProfile(
                            {
                              ...profile,
                              assignments: [
                                ...profile.assignments!.map((cMapping, cMappingIdx) =>
                                  cMappingIdx == mappingIdx ? val : cMapping
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
                                  (_, cMappingIdx) => cMappingIdx != mappingIdx
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

      <Space h="md" />
      <Title order={3}>Inputs</Title>
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
                <Button variant="filled" onClick={open}>
                  Load {t(`subType.${proto.SubType[profile.deviceToEmulate]}`)} defaults
                </Button>
                <Button variant="filled" onClick={open2}>
                  {t('clear_all_button')}
                </Button>
                {Object.values(deviceStatus)
                  .filter(hasDefaults)
                  .map((item) => (
                    <Button value={item.id} key={item.id} onClick={() => loadDefaults(item)}>
                      Load defaults for: {t(`devices.${item.type}`)} ({DeviceStatus.label(item)})
                    </Button>
                  ))}
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
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={profile.mappings?.map((mapping, mappingIdx) => mappingIdx)!}
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
                        dispatch={(val) =>
                          updateProfile(
                            {
                              ...profile,
                              mappings: [
                                ...profile.mappings!.map((cMapping, cMappingIdx) =>
                                  cMappingIdx == mappingIdx ? val : cMapping
                                ),
                              ],
                            },
                            profileIdx
                          )
                        }
                        deleteInput={() =>
                          updateProfile(
                            {
                              ...profile,
                              mappings: [
                                ...profile.mappings!.filter(
                                  (_, cMappingIdx) => cMappingIdx != mappingIdx
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
              </Group>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Space h="md" />
      <Title order={3}>Leds</Title>
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
                                pin: 0,
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
                    items={profile.leds?.map((led, ledIdx) => ledIdx)!}
                    strategy={rectSortingStrategy}
                  >
                    {profile.leds?.map((led, ledIdx) => (
                      <SantrollerLed
                        key={ledIdx}
                        led={led}
                        type={profile.deviceToEmulate}
                        profileIdx={profileIdx}
                        ledIdx={ledIdx}
                        mode={profile.faceButtonMappingMode}
                        dispatch={(val) =>
                          updateProfile(
                            {
                              ...profile,
                              leds: [
                                ...profile.leds!.map((cLed, cLedIdx) =>
                                  cLedIdx == ledIdx ? val : cLed
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
                              leds: [...profile.leds!.filter((_, cLedIdx) => cLedIdx != ledIdx)],
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
        <Profile profileIdx={activeProfile}></Profile>
      </RequireDevice>
    </Layout>
  );
}
