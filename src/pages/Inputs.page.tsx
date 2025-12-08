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
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconRestore,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from 'react-router-dom';
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
  Overlay,
  Progress,
  ProgressLabel,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Space,
  Tabs,
  Text,
  TextInput,
  Title,
  useCombobox,
} from '@mantine/core';
import { useDisclosure, useMounted, useTimeout } from '@mantine/hooks';
import { PinBox } from '@/components/Devices/Pins';
import { Inputs } from '@/components/Inputs/Inputs';
import { Layout } from '@/components/Layout/Layout';
import { RequireDevice } from '@/components/RequireDevice/RequireDevice';
import { proto } from '@/components/SettingsContext/config';
import { DeviceStatus, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { AllPinsNamed, AnalogPins, AnalogPinsNamed } from '@/devices/pico/pins';

function StateLabel({
  profileIdx,
  mappingIdx,
  raw,
}: {
  profileIdx: number;
  mappingIdx: number;
  raw?: boolean;
}) {
  const state = useConfigStore((state) => state.mappingStatus[profileIdx][mappingIdx].state);
  const stateRaw = useConfigStore((state) => state.mappingStatus[profileIdx][mappingIdx].stateRaw);
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
}: {
  profileIdx: number;
  mappingIdx: number;
  min: number;
  max: number;
  center: number;
  deadzone: number;
  raw?: boolean;
  trigger?: boolean;
}) {
  const stateRaw = useConfigStore((state) => state.mappingStatus[profileIdx][mappingIdx].stateRaw);
  const state = useConfigStore((state) => state.mappingStatus[profileIdx][mappingIdx].state);
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
function StateBox({ profileIdx, mappingIdx }: { profileIdx: number; mappingIdx: number }) {
  const state = useConfigStore((state) => state.mappingStatus[profileIdx][mappingIdx].state);
  return (
    <>
      <Text size="sm">Value</Text>
      <Badge color={state > 0 ? 'blue' : 'gray'}>{state > 0 ? 'Pressed' : 'Released'}</Badge>
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
}: {
  profileIdx: number;
  mappingIdx: number;
  center: number;
  min: number;
  max: number;
  deadzone: number;
  raw?: boolean;
  trigger?: boolean;
}) {
  if (raw) {
    return (
      <>
        <Text size="sm">Raw Value</Text>
        <Progress.Root size={40} transitionDuration={0}>
          <Progress.Label w="100%" h="100%" style={{ position: 'absolute' }}>
            <StateLabel mappingIdx={mappingIdx} profileIdx={profileIdx} raw></StateLabel>
          </Progress.Label>
          <StateSection
            mappingIdx={mappingIdx}
            profileIdx={profileIdx}
            center={center}
            min={min}
            max={max}
            deadzone={deadzone}
            raw
            trigger
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
          <StateLabel mappingIdx={mappingIdx} profileIdx={profileIdx}></StateLabel>
        </Progress.Label>
        <StateSection
          mappingIdx={mappingIdx}
          profileIdx={profileIdx}
          center={center}
          min={min}
          max={max}
          deadzone={deadzone}
        ></StateSection>
      </Progress.Root>
      <Space h="md" />
    </>
  );
}
function OutputBox({
  mapping,
  type,
  label,
  mode,
  dispatch,
}: {
  mapping: proto.IMapping;
  type: proto.SubType;
  label: string;
  mode: proto.FaceButtonMappingMode;
  dispatch: (mapping: proto.IMapping) => void;
}) {
  const { t } = useTranslation();
  const outputCombobox = useCombobox({
    onDropdownClose: () => outputCombobox.resetSelectedOption(),
  });
  const base = useMemo(
    () => (
      <InputBase
        label="Output"
        component="button"
        type="button"
        pointer
        rightSection={<Combobox.Chevron />}
        rightSectionPointerEvents="none"
        onClick={() => outputCombobox.toggleDropdown()}
      >
        {label || <Input.Placeholder>Pick value</Input.Placeholder>}
      </InputBase>
    ),
    [label]
  );
  if (!outputCombobox.dropdownOpened) {
    return base;
  }
  switch (type) {
    case proto.SubType.Gamepad:
    case proto.SubType.Dancepad:
    case proto.SubType.StageKit:
      return (
        <Combobox
          store={outputCombobox}
          onOptionSubmit={(val) => {
            const button = proto.GamepadButtonType[val as keyof typeof proto.GamepadButtonType];
            const axis = proto.GamepadAxisType[val as keyof typeof proto.GamepadAxisType];
            if (button !== undefined) {
              dispatch({ ...mapping, gamepadButton: button, gamepadAxis: null });
            }
            if (axis !== undefined) {
              dispatch({
                ...mapping,
                gamepadAxis: axis,
                gamepadButton: null,
                center: val.includes('Trigger') ? 0 : 32767,
                min: 0,
                max: 65535,
              });
            }
            outputCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.GamepadAxisType)
                .concat(Object.keys(proto.GamepadButtonType))
                .map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {t(`outputs.${FixLabel(mode, item)}`)}
                  </Combobox.Option>
                ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      );
    case proto.SubType.GuitarHeroGuitar:
      return (
        <Combobox
          store={outputCombobox}
          onOptionSubmit={(val) => {
            const button =
              proto.GuitarHeroGuitarButtonType[
                val as keyof typeof proto.GuitarHeroGuitarButtonType
              ];
            const axis =
              proto.GuitarHeroGuitarAxisType[val as keyof typeof proto.GuitarHeroGuitarAxisType];
            if (button !== undefined) {
              dispatch({ ...mapping, ghButton: button, ghAxis: null });
            }
            if (axis !== undefined) {
              dispatch({
                ...mapping,
                ghAxis: axis,
                ghButton: null,
                center: val.includes('Whammy') ? 0 : 32767,
                min: 0,
                max: 65535,
              });
            }
            outputCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.GuitarHeroGuitarAxisType)
                .concat(Object.keys(proto.GuitarHeroGuitarButtonType))
                .map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {item}
                  </Combobox.Option>
                ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      );
    case proto.SubType.RockBandGuitar:
      return (
        <Combobox
          store={outputCombobox}
          onOptionSubmit={(val) => {
            const button =
              proto.RockBandGuitarButtonType[val as keyof typeof proto.RockBandGuitarButtonType];
            const axis =
              proto.RockBandGuitarAxisType[val as keyof typeof proto.RockBandGuitarAxisType];
            if (button !== undefined) {
              dispatch({ ...mapping, rbButton: button, rbAxis: null });
            }
            if (axis !== undefined) {
              dispatch({
                ...mapping,
                rbAxis: axis,
                rbButton: null,
                center: val.includes('Whammy') ? 0 : 32767,
                min: 0,
                max: 65535,
              });
            }
            outputCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.RockBandGuitarAxisType)
                .concat(Object.keys(proto.RockBandGuitarButtonType))
                .map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {item}
                  </Combobox.Option>
                ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      );
      break;
    case proto.SubType.GuitarHeroDrums:
      return (
        <Combobox
          store={outputCombobox}
          onOptionSubmit={(val) => {
            const button =
              proto.GuitarHeroDrumsButtonType[val as keyof typeof proto.GuitarHeroDrumsButtonType];
            const axis =
              proto.GuitarHeroDrumsAxisType[val as keyof typeof proto.GuitarHeroDrumsAxisType];
            if (button !== undefined) {
              dispatch({ ...mapping, ghDrumButton: button, ghDrumAxis: null });
            }
            if (axis !== undefined) {
              dispatch({
                ...mapping,
                ghDrumAxis: axis,
                ghDrumButton: null,
                center: 0,
                min: 0,
                max: 65535,
              });
            }
            outputCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.GuitarHeroDrumsAxisType)
                .concat(Object.keys(proto.GuitarHeroDrumsButtonType))
                .map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {item}
                  </Combobox.Option>
                ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      );
      break;
    case proto.SubType.RockBandDrums:
      return (
        <Combobox
          store={outputCombobox}
          onOptionSubmit={(val) => {
            const button =
              proto.RockBandDrumsButtonType[val as keyof typeof proto.RockBandDrumsButtonType];
            const axis =
              proto.RockBandDrumsAxisType[val as keyof typeof proto.RockBandDrumsAxisType];
            if (button !== undefined) {
              dispatch({ ...mapping, rbDrumButton: button, rbDrumAxis: null });
            }
            if (axis !== undefined) {
              dispatch({
                ...mapping,
                rbDrumAxis: axis,
                rbDrumButton: null,
                center: 0,
                min: 0,
                max: 65535,
              });
            }
            outputCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.RockBandDrumsAxisType)
                .concat(Object.keys(proto.RockBandDrumsButtonType))
                .map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {item}
                  </Combobox.Option>
                ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      );
      break;
    case proto.SubType.LiveGuitar:
      return (
        <Combobox
          store={outputCombobox}
          onOptionSubmit={(val) => {
            const button =
              proto.GuitarHeroLiveGuitarButtonType[
                val as keyof typeof proto.GuitarHeroLiveGuitarButtonType
              ];
            const axis =
              proto.GuitarHeroLiveGuitarAxisType[
                val as keyof typeof proto.GuitarHeroLiveGuitarAxisType
              ];
            if (button !== undefined) {
              dispatch({ ...mapping, ghlButton: button, ghlAxis: null });
            }
            if (axis !== undefined) {
              dispatch({
                ...mapping,
                ghlAxis: axis,
                ghlButton: null,
                center: val.includes('Whammy') ? 0 : 32767,
                min: 0,
                max: 65535,
              });
            }
            outputCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.GuitarHeroLiveGuitarAxisType)
                .concat(Object.keys(proto.GuitarHeroLiveGuitarButtonType))
                .map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {item}
                  </Combobox.Option>
                ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      );
      break;
    case proto.SubType.DjHeroTurntable:
      return (
        <Combobox
          store={outputCombobox}
          onOptionSubmit={(val) => {
            const button =
              proto.DJHTurntableButtonType[val as keyof typeof proto.DJHTurntableButtonType];
            const axis = proto.DJHTurntableAxisType[val as keyof typeof proto.DJHTurntableAxisType];
            if (button !== undefined) {
              dispatch({ ...mapping, djhButton: button, djhAxis: null });
            }
            if (axis !== undefined) {
              dispatch({
                ...mapping,
                djhAxis: axis,
                djhButton: null,
                center: val.includes('Whammy') ? 0 : 32767,
                min: 0,
                max: 65535,
              });
            }
            outputCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.DJHTurntableAxisType)
                .concat(Object.keys(proto.DJHTurntableButtonType))
                .map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {item}
                  </Combobox.Option>
                ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      );
      break;
    case proto.SubType.ProGuitarMustang:
    case proto.SubType.ProGuitarSquire:
      return (
        <Combobox
          store={outputCombobox}
          onOptionSubmit={(val) => {
            const button = proto.ProGuitarButtonType[val as keyof typeof proto.ProGuitarButtonType];
            const axis = proto.ProGuitarAxisType[val as keyof typeof proto.ProGuitarAxisType];
            if (button !== undefined) {
              dispatch({ ...mapping, proButton: button, proAxis: null });
            }
            if (axis !== undefined) {
              dispatch({
                ...mapping,
                proAxis: axis,
                proButton: null,
                center: val.includes('Whammy') ? 0 : 32767,
                min: 0,
                max: 65535,
              });
            }
            outputCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>{base}</Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.ProGuitarAxisType)
                .concat(Object.keys(proto.ProGuitarButtonType))
                .map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {item}
                  </Combobox.Option>
                ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
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
function SantrollerMapping({
  mapping,
  type,
  profileIdx,
  mappingIdx,
  mode,
  dispatch,
  deleteInput,
}: {
  mapping: proto.IMapping;
  type: proto.SubType;
  profileIdx: number;
  mappingIdx: number;
  mode: proto.FaceButtonMappingMode;
  dispatch: (mapping: proto.IMapping) => void;
  deleteInput: () => void;
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
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const deviceCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  const outputCombobox = useCombobox({
    onDropdownClose: () => outputCombobox.resetSelectedOption(),
  });
  const pinModeCombobox = useCombobox({
    onDropdownClose: () => pinModeCombobox.resetSelectedOption(),
  });
  const triggerModeCombobox = useCombobox({
    onDropdownClose: () => triggerModeCombobox.resetSelectedOption(),
  });
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
  console.log(label);
  const inputLabel =
    t(`wii.inputs.${proto.WiiAxisType[mapping.input.wiiAxis?.axis ?? -1]}`) ||
    t(`wii.inputs.${proto.WiiButtonType[mapping.input.wiiButton?.button ?? -1]}`) ||
    t(`crkd.inputs.${proto.CrkdNeckButtonType[mapping.input.crkd?.button ?? -1]}`) ||
    (mapping.input.gpio &&
      t(AllPinsNamed[mapping.input.gpio.pin]?.label, AllPinsNamed[mapping.input.gpio.pin]));
  let fixedLabel = FixLabel(mode, label);
  let img = `Icons/Input/${fixedLabel}.png`;
  const button = Object.entries(mapping).find(([k, v]) => k.endsWith('Button') && v);
  const axis = Object.entries(mapping).find(([k, v]) => k.endsWith('Axis') && v);
  const stick = label?.includes('Stick');
  const trigger = label?.includes('Trigger');
  const whammy = label?.includes('Whammy');
  const analogInput = mapping.input.gpio?.analog || mapping.input.ads1115 || mapping.input.wiiAxis;
  let deviceValue = '';
  let device: DeviceStatus | null = null;
  if (mapping.input.mpr121) {
    device = deviceStatus[mapping.input.mpr121.deviceid];
  } else if (mapping.input.wiiAxis) {
    device = deviceStatus[mapping.input.wiiAxis.deviceid];
  } else if (mapping.input.crkd) {
    device = deviceStatus[mapping.input.crkd.deviceid];
  } else if (mapping.input.wiiButton) {
    device = deviceStatus[mapping.input.wiiButton.deviceid];
  } else if (mapping.input.accelerometer) {
    device = deviceStatus[mapping.input.accelerometer.deviceid];
  } else if (mapping.input.gpio && mapping.input.gpio.analog) {
    deviceValue = t(`devices.gpio_analog`);
  } else if (mapping.input.gpio) {
    deviceValue = t(`devices.gpio_digital`);
  } else if (mapping.input.ads1115) {
    deviceValue = t(`devices.ads1115`);
  } else if (mapping.input.mouseAxis) {
    deviceValue = t(`devices.mouseAxis`);
  } else if (mapping.input.mouseButton) {
    deviceValue = t(`devices.mouseButton`);
  } else if (mapping.input.key) {
    deviceValue = t(`devices.key`);
  }
  if (device) {
    deviceValue = `${t(`devices.${device.type}`)} (${DeviceStatus.label(device)})`;
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
      <Card shadow="sm" padding="lg" radius="md" withBorder w="400px" h="100%">
        <Card.Section h="60px">
          <div {...listeners} style={{ cursor: 'grab', position: 'absolute', top: 0, left: 0 }}>
            <IconGripVertical size={18} stroke={1.5} />
          </div>
          <ActionIcon color="red" style={{ position: 'absolute', top: 0, right: 0 }}>
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
          <Center>
            <Image src={img} height={75} w="auto" fit="contain" alt={img} />
          </Center>
        </Card.Section>
        <OutputBox
          dispatch={dispatch}
          type={type}
          label={t(`outputs.${fixedLabel}`)}
          mode={mode}
          mapping={mapping}
        ></OutputBox>
        <Space h="md" />
        {(deviceCombobox.dropdownOpened && (
          <Combobox
            store={deviceCombobox}
            onOptionSubmit={(val) => {
              deviceCombobox.closeDropdown();
              // setDeviceValue(val);
              if (isNumberLike(val)) {
                switch (deviceStatus[parseInt(val)].type) {
                  case 'wii':
                    if (axis) {
                      dispatch({
                        ...mapping,
                        input: {
                          wiiAxis: {
                            axis: proto.WiiAxisType.WiiAxisClassicLeftStickX,
                            deviceid: parseInt(val),
                          },
                        },
                      });
                    } else if (button) {
                      dispatch({
                        ...mapping,
                        input: {
                          wiiButton: {
                            button: proto.WiiButtonType.WiiButtonClassicA,
                            deviceid: parseInt(val),
                          },
                        },
                      });
                    }
                    break;
                  case 'ads1115':
                    dispatch({
                      ...mapping,
                      input: {
                        ads1115: {
                          channel: 0,
                          deviceid: parseInt(val),
                        },
                      },
                    });
                    break;
                  case 'accelerometer':
                    dispatch({
                      ...mapping,
                      input: {
                        accelerometer: {
                          type: proto.AccelerometerInputType.AccelerometerX,
                          deviceid: parseInt(val),
                        },
                      },
                    });
                    break;
                  case 'crkdNeck':
                    if (button) {
                      dispatch({
                        ...mapping,
                        input: {
                          crkd: {
                            button: proto.CrkdNeckButtonType.CrkdGreen,
                            deviceid: parseInt(val),
                          },
                        },
                      });
                    }
                    break;
                }
                return;
              }
              switch (val) {
                case 'gpio_analog':
                  dispatch({
                    ...mapping,
                    input: {
                      gpio: { pin: -1, analog: true, pinMode: proto.PinMode.Floating },
                    },
                  });
                  break;
                case 'gpio_digital':
                  dispatch({
                    ...mapping,
                    input: {
                      gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp },
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
                {deviceValue || <Input.Placeholder>Pick value</Input.Placeholder>}
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
            {deviceValue || <Input.Placeholder>Pick value</Input.Placeholder>}
          </InputBase>
        )}
        <Space h="md" />
        {mapping.input.wiiAxis &&
          ((inputCombobox.dropdownOpened && (
            <Combobox
              store={inputCombobox}
              onOptionSubmit={(val) => {
                const axis = proto.WiiAxisType[val as keyof typeof proto.WiiAxisType];
                if (axis !== undefined) {
                  dispatch({
                    ...mapping,
                    input: { wiiAxis: { ...mapping.input.wiiAxis!, axis } },
                  });
                }
                inputCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Input"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => inputCombobox.toggleDropdown()}
                >
                  {t(`wii.inputs.${proto.WiiAxisType[mapping.input.wiiAxis?.axis ?? -1]}`)}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.WiiAxisType).map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {t(`wii.inputs.${item}`)}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Input"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => inputCombobox.toggleDropdown()}
            >
              {t(`wii.inputs.${proto.WiiAxisType[mapping.input.wiiAxis?.axis ?? -1]}`)}
            </InputBase>
          ))}
        {mapping.input.wiiButton &&
          ((inputCombobox.dropdownOpened && (
            <Combobox
              store={inputCombobox}
              onOptionSubmit={(val) => {
                const button = proto.WiiButtonType[val as keyof typeof proto.WiiButtonType];
                if (button !== undefined) {
                  dispatch({
                    ...mapping,
                    input: { wiiButton: { ...mapping.input.wiiButton!, button } },
                  });
                }
                inputCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Input"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => inputCombobox.toggleDropdown()}
                >
                  {t(`wii.inputs.${proto.WiiButtonType[mapping.input.wiiButton?.button ?? -1]}`)}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.WiiButtonType).map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {t(`wii.inputs.${item}`)}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Input"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => inputCombobox.toggleDropdown()}
            >
              {t(`wii.inputs.${proto.WiiButtonType[mapping.input.wiiButton?.button ?? -1]}`)}
            </InputBase>
          ))}
        {mapping.input.crkd &&
          ((inputCombobox.dropdownOpened && (
            <Combobox
              store={inputCombobox}
              onOptionSubmit={(val) => {
                const button =
                  proto.CrkdNeckButtonType[val as keyof typeof proto.CrkdNeckButtonType];
                console.log(button);
                if (button !== undefined) {
                  dispatch({
                    ...mapping,
                    input: { crkd: { ...mapping.input.crkd!, button } },
                  });
                }
                inputCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Input"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => inputCombobox.toggleDropdown()}
                >
                  {t(`crkd.inputs.${proto.CrkdNeckButtonType[mapping.input.crkd?.button ?? -1]}`)}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.CrkdNeckButtonType).map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {item}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Input"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => inputCombobox.toggleDropdown()}
            >
              {proto.CrkdNeckButtonType[mapping.input.crkd?.button ?? -1] || (
                <Input.Placeholder>Pick value</Input.Placeholder>
              )}
            </InputBase>
          ))}
        {mapping.input.gpio && (
          <>
            <PinBox
              label="Pin"
              valid={mapping.input.gpio.analog ? AnalogPinsNamed : AllPinsNamed}
              pin={mapping.input.gpio.pin}
              dispatch={(pin) =>
                dispatch({
                  ...mapping,
                  input: { ...mapping.input, gpio: { ...mapping.input.gpio!, pin } },
                })
              }
            />
            {(pinModeCombobox.dropdownOpened && (
              <Combobox
                store={pinModeCombobox}
                onOptionSubmit={(val) => {
                  dispatch({
                    ...mapping,
                    input: {
                      ...mapping.input,
                      gpio: {
                        ...mapping.input.gpio!,
                        pinMode: proto.PinMode[val as keyof typeof proto.PinMode],
                      },
                    },
                  });
                  pinModeCombobox.closeDropdown();
                }}
              >
                <Combobox.Target>
                  <InputBase
                    label="Pin Mode"
                    component="button"
                    type="button"
                    pointer
                    rightSection={<Combobox.Chevron />}
                    rightSectionPointerEvents="none"
                    onClick={() => pinModeCombobox.toggleDropdown()}
                  >
                    {proto.PinMode[mapping.input.gpio.pinMode] || (
                      <Input.Placeholder>Pick value</Input.Placeholder>
                    )}
                  </InputBase>
                </Combobox.Target>

                <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                  <Combobox.Options>
                    {Object.keys(proto.PinMode).map((item) => (
                      <Combobox.Option value={item} key={item}>
                        {item}
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
            )) || (
              <InputBase
                label="Pin Mode"
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => pinModeCombobox.toggleDropdown()}
              >
                {proto.PinMode[mapping.input.gpio.pinMode] || (
                  <Input.Placeholder>Pick value</Input.Placeholder>
                )}
              </InputBase>
            )}
          </>
        )}
        {mapping.input.ads1115 && (
          <>
            {(pinModeCombobox.dropdownOpened && (
              <Combobox
                store={pinModeCombobox}
                onOptionSubmit={(val) => {
                  dispatch({
                    ...mapping,
                    input: {
                      ...mapping.input,
                      ads1115: {
                        ...mapping.input.ads1115!,
                        channel: parseInt(val),
                      },
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
                    {mapping.input.ads1115.channel}
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
                {mapping.input.ads1115.channel}
              </InputBase>
            )}
          </>
        )}
        {mapping.input.accelerometer &&
          ((inputCombobox.dropdownOpened && (
            <Combobox
              store={inputCombobox}
              onOptionSubmit={(val) => {
                const type =
                  proto.AccelerometerInputType[val as keyof typeof proto.AccelerometerInputType];
                console.log(type);
                if (type !== undefined) {
                  dispatch({
                    ...mapping,
                    input: { accelerometer: { ...mapping.input.accelerometer!, type } },
                  });
                }
                inputCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Input"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => inputCombobox.toggleDropdown()}
                >
                  {t(
                    `accelerometer.inputs.${proto.AccelerometerInputType[mapping.input.crkd?.button ?? -1]}`
                  )}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.AccelerometerInputType).map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {item}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Input"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => inputCombobox.toggleDropdown()}
            >
              {proto.AccelerometerInputType[mapping.input.accelerometer?.type ?? -1] || (
                <Input.Placeholder>Pick value</Input.Placeholder>
              )}
            </InputBase>
          ))}
        <Space h="md" />
        {button && analogInput && (
          <>
            {(triggerModeCombobox.dropdownOpened && (
              <Combobox
                store={triggerModeCombobox}
                onOptionSubmit={(val) => {
                  dispatch({
                    ...mapping,
                    trigger:
                      proto.AnalogToDigitalTriggerType[
                        val as keyof typeof proto.AnalogToDigitalTriggerType
                      ],
                  });
                  triggerModeCombobox.closeDropdown();
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
                    onClick={() => triggerModeCombobox.toggleDropdown()}
                  >
                    {proto.AnalogToDigitalTriggerType[mapping.trigger!] || (
                      <Input.Placeholder>Pick value</Input.Placeholder>
                    )}
                  </InputBase>
                </Combobox.Target>

                <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                  <Combobox.Options>
                    {Object.keys(proto.AnalogToDigitalTriggerType).map((item) => (
                      <Combobox.Option value={item} key={item}>
                        {item}
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
            )) || (
              <InputBase
                label="Trigger Type"
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => triggerModeCombobox.toggleDropdown()}
              >
                {proto.AnalogToDigitalTriggerType[mapping.trigger!] || (
                  <Input.Placeholder>Pick value</Input.Placeholder>
                )}
              </InputBase>
            )}
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
            <Text size="sm">Trigger</Text>
            <Slider
              value={mapping.triggerValue!}
              min={0}
              max={65535}
              onChange={(val) => dispatch({ ...mapping, triggerValue: val })}
            />
          </>
        )}
        {button && <StateBox mappingIdx={mappingIdx} profileIdx={profileIdx}></StateBox>}
        {axis && (
          <>
            <StateSlider
              mappingIdx={mappingIdx}
              profileIdx={profileIdx}
              center={mapping.center!}
              min={mapping.min!}
              max={mapping.max!}
              deadzone={mapping.deadzone!}
            ></StateSlider>
            <Space h="md" />
            <Accordion>
              <Accordion.Item value="main">
                <Accordion.Control>Axis Calibration</Accordion.Control>
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
                      <Space h="md" />
                      <Text size="sm">Max</Text>
                      <Slider
                        value={mapping.max!}
                        min={0}
                        max={65535}
                        onChange={(val) => dispatch({ ...mapping, max: val })}
                      />
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

function SantrollerActivationTrigger({
  mapping,
  type,
  profileIdx,
  mappingIdx,
  mode,
  dispatch,
  deleteInput,
}: {
  mapping: proto.IActivationTrigger;
  type: proto.SubType;
  profileIdx: number;
  mappingIdx: number;
  mode: proto.FaceButtonMappingMode;
  dispatch: (mapping: proto.IMapping) => void;
  deleteInput: () => void;
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
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const deviceCombobox = useCombobox({
    onDropdownClose: () => deviceCombobox.resetSelectedOption(),
  });
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  const outputCombobox = useCombobox({
    onDropdownClose: () => outputCombobox.resetSelectedOption(),
  });
  const pinModeCombobox = useCombobox({
    onDropdownClose: () => pinModeCombobox.resetSelectedOption(),
  });
  const inputLabel =
    t(`wii.inputs.${proto.WiiAxisType[mapping.input.wiiAxis?.axis ?? -1]}`) ||
    t(`wii.inputs.${proto.WiiButtonType[mapping.input.wiiButton?.button ?? -1]}`) ||
    t(`crkd.inputs.${proto.CrkdNeckButtonType[mapping.input.crkd?.button ?? -1]}`) ||
    (mapping.input.gpio &&
      t(AllPinsNamed[mapping.input.gpio.pin]?.label, AllPinsNamed[mapping.input.gpio.pin]));
  let fixedLabel = FixLabel(mode, inputLabel!);
  let deviceValue = '';
  let img = '';
  let device: DeviceStatus | null = null;
  if (mapping.input.mpr121) {
    device = deviceStatus[mapping.input.mpr121.deviceid];
  } else if (mapping.input.wiiAxis) {
    device = deviceStatus[mapping.input.wiiAxis.deviceid];
  } else if (mapping.input.wiiExtType) {
    device = deviceStatus[mapping.input.wiiExtType.deviceid];
  } else if (mapping.input.crkd) {
    device = deviceStatus[mapping.input.crkd.deviceid];
  } else if (mapping.input.wiiButton) {
    device = deviceStatus[mapping.input.wiiButton.deviceid];
  } else if (mapping.input.gpio) {
    deviceValue = t(`devices.gpio`);
  } else if (mapping.input.mouseAxis) {
    deviceValue = t(`devices.mouseAxis`);
  } else if (mapping.input.mouseButton) {
    deviceValue = t(`devices.mouseButton`);
  } else if (mapping.input.key) {
    deviceValue = t(`devices.key`);
  }
  if (device) {
    deviceValue = `${t(`devices.${device.type}`)} (${DeviceStatus.label(device)})`;
    img = `Icons/Input/${fixedLabel}.png`;
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
      <Card shadow="sm" padding="lg" radius="md" withBorder w="400px" h="100%">
        <Card.Section h="60px">
          <div {...listeners} style={{ cursor: 'grab', position: 'absolute', top: 0, left: 0 }}>
            <IconGripVertical size={18} stroke={1.5} />
          </div>
          <ActionIcon color="red" style={{ position: 'absolute', top: 0, right: 0 }}>
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
          <Center>
            <Image src={img} height={75} w="auto" fit="contain" alt={img} />
          </Center>
        </Card.Section>
        <Space h="md" />
        {(deviceCombobox.dropdownOpened && (
          <Combobox
            store={deviceCombobox}
            onOptionSubmit={(val) => {
              deviceCombobox.closeDropdown();
              // setDeviceValue(val);
              if (isNumberLike(val)) {
                switch (deviceStatus[parseInt(val)].type) {
                  case 'wii':
                    dispatch({
                      ...mapping,
                      input: {
                        wiiExtType: {
                          ext: proto.WiiExtType.WiiClassicController,
                          deviceid: parseInt(val),
                        },
                      },
                    });
                    break;
                  case 'crkdNeck':
                    dispatch({
                      ...mapping,
                      input: {
                        crkd: {
                          button: proto.CrkdNeckButtonType.CrkdGreen,
                          deviceid: parseInt(val),
                        },
                      },
                    });
                    break;
                  // case 'accelerometer':
                  //   dispatch({
                  //     ...mapping,
                  //     input: {
                  //       accelerometer: {
                  //         button: proto.CrkdNeckButtonType.CrkdGreen,
                  //         deviceid: parseInt(val),
                  //       },
                  //     },
                  //   });
                  //   break;
                }
                return;
              }
              switch (val) {
                case 'gpio':
                  dispatch({
                    ...mapping,
                    input: {
                      gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp },
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
                {deviceValue || <Input.Placeholder>Pick value</Input.Placeholder>}
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
                <Combobox.Option value="gpio">{t('devices.gpio')}</Combobox.Option>
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
            {deviceValue || <Input.Placeholder>Pick value</Input.Placeholder>}
          </InputBase>
        )}
        <Space h="md" />
        {mapping.input.wiiAxis &&
          ((inputCombobox.dropdownOpened && (
            <Combobox
              store={inputCombobox}
              onOptionSubmit={(val) => {
                const axis = proto.WiiAxisType[val as keyof typeof proto.WiiAxisType];
                if (axis !== undefined) {
                  dispatch({
                    ...mapping,
                    input: { wiiAxis: { ...mapping.input.wiiAxis!, axis } },
                  });
                }
                inputCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Input"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => inputCombobox.toggleDropdown()}
                >
                  {t(`wii.inputs.${proto.WiiAxisType[mapping.input.wiiAxis?.axis ?? -1]}`)}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.WiiAxisType).map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {t(`wii.inputs.${item}`)}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Input"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => inputCombobox.toggleDropdown()}
            >
              {t(`wii.inputs.${proto.WiiAxisType[mapping.input.wiiAxis?.axis ?? -1]}`)}
            </InputBase>
          ))}
        {mapping.input.wiiExtType &&
          ((inputCombobox.dropdownOpened && (
            <Combobox
              store={inputCombobox}
              onOptionSubmit={(val) => {
                const ext = proto.WiiExtType[val as keyof typeof proto.WiiExtType];
                if (ext !== undefined) {
                  dispatch({
                    ...mapping,
                    input: { wiiExtType: { ...mapping.input.wiiExtType!, ext } },
                  });
                }
                inputCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Extension"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => inputCombobox.toggleDropdown()}
                >
                  {t(`wii.extensions.${proto.WiiExtType[mapping.input.wiiExtType?.ext ?? -1]}`)}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.WiiExtType).map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {t(`wii.extensions.${item}`)}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Extension"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => inputCombobox.toggleDropdown()}
            >
              {t(`wii.extensions.${proto.WiiExtType[mapping.input.wiiExtType?.ext ?? -1]}`)}
            </InputBase>
          ))}
        {mapping.input.wiiButton &&
          ((inputCombobox.dropdownOpened && (
            <Combobox
              store={inputCombobox}
              onOptionSubmit={(val) => {
                const button = proto.WiiButtonType[val as keyof typeof proto.WiiButtonType];
                if (button !== undefined) {
                  dispatch({
                    ...mapping,
                    input: { wiiButton: { ...mapping.input.wiiButton!, button } },
                  });
                }
                inputCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Input"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => inputCombobox.toggleDropdown()}
                >
                  {t(`wii.inputs.${proto.WiiButtonType[mapping.input.wiiButton?.button ?? -1]}`)}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.WiiButtonType).map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {t(`wii.inputs.${item}`)}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Input"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => inputCombobox.toggleDropdown()}
            >
              {t(`wii.inputs.${proto.WiiButtonType[mapping.input.wiiButton?.button ?? -1]}`)}
            </InputBase>
          ))}
        {mapping.input.crkd &&
          ((inputCombobox.dropdownOpened && (
            <Combobox
              store={inputCombobox}
              onOptionSubmit={(val) => {
                const button =
                  proto.CrkdNeckButtonType[val as keyof typeof proto.CrkdNeckButtonType];
                console.log('submit');
                console.log(button);
                if (button !== undefined) {
                  dispatch({
                    ...mapping,
                    input: { crkd: { ...mapping.input.crkd!, button } },
                  });
                }
                inputCombobox.closeDropdown();
              }}
            >
              <Combobox.Target>
                <InputBase
                  label="Input"
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => inputCombobox.toggleDropdown()}
                >
                  {t(`crkd.inputs.${proto.CrkdNeckButtonType[mapping.input.crkd?.button ?? -1]}`)}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.CrkdNeckButtonType).map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {t(
                        `crkd.inputs.${proto.CrkdNeckButtonType[mapping.input.crkd?.button ?? -1]}`
                      )}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          )) || (
            <InputBase
              label="Input"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => inputCombobox.toggleDropdown()}
            >
              {proto.CrkdNeckButtonType[mapping.input.crkd?.button ?? -1] || (
                <Input.Placeholder>Pick value</Input.Placeholder>
              )}
            </InputBase>
          ))}
        {mapping.input.gpio && (
          <>
            <PinBox
              label="Pin"
              valid={AllPinsNamed}
              pin={mapping.input.gpio.pin}
              dispatch={(pin) =>
                dispatch({
                  ...mapping,
                  input: { ...mapping.input, gpio: { ...mapping.input.gpio!, pin } },
                })
              }
            />
            {(pinModeCombobox.dropdownOpened && (
              <Combobox
                store={pinModeCombobox}
                onOptionSubmit={(val) => {
                  dispatch({
                    ...mapping,
                    input: {
                      ...mapping.input,
                      gpio: {
                        ...mapping.input.gpio!,
                        pinMode: proto.PinMode[val as keyof typeof proto.PinMode],
                      },
                    },
                  });
                  pinModeCombobox.closeDropdown();
                }}
              >
                <Combobox.Target>
                  <InputBase
                    label="Pin Mode"
                    component="button"
                    type="button"
                    pointer
                    rightSection={<Combobox.Chevron />}
                    rightSectionPointerEvents="none"
                    onClick={() => pinModeCombobox.toggleDropdown()}
                  >
                    {proto.PinMode[mapping.input.gpio.pinMode] || (
                      <Input.Placeholder>Pick value</Input.Placeholder>
                    )}
                  </InputBase>
                </Combobox.Target>

                <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                  <Combobox.Options>
                    {Object.keys(proto.PinMode).map((item) => (
                      <Combobox.Option value={item} key={item}>
                        {item}
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
            )) || (
              <InputBase
                label="Pin Mode"
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => pinModeCombobox.toggleDropdown()}
              >
                {proto.PinMode[mapping.input.gpio.pinMode] || (
                  <Input.Placeholder>Pick value</Input.Placeholder>
                )}
              </InputBase>
            )}
          </>
        )}
        <Space h="md" />
        {/* {button && <StateBox mappingIdx={mappingIdx} profileIdx={profileIdx}></StateBox>} */}
      </Card>
    </div>
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
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
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
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('defaults_dialog.title')} centered>
        {t('defaults_dialog.desc')}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              onClick={() => {
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
      <Space h="md" />
      <Title order={2}>Settings</Title>
      <TextInput
        value={profile.name}
        onChange={(e) => updateProfile({ ...profile, name: e.currentTarget.value }, profileIdx)}
        label="Profile name"
      />
      <Button variant="filled" color="red" onClick={() => deleteProfile(profileIdx)}>
        Delete profile
      </Button>
      {(combobox.dropdownOpened && (
        <Combobox
          store={combobox}
          onOptionSubmit={(val) => {
            updateProfile(
              { ...profile, deviceToEmulate: proto.SubType[val as keyof typeof proto.SubType] },
              profileIdx
            );
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <InputBase
              label="Device to emulate"
              component="button"
              type="button"
              pointer
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => combobox.toggleDropdown()}
            >
              {proto.SubType[profile.deviceToEmulate]}
            </InputBase>
          </Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.SubType).map((item) => (
                <Combobox.Option value={item} key={item}>
                  {item}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      )) || (
        <InputBase
          label="Device to emulate"
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
        >
          {proto.SubType[profile.deviceToEmulate] || (
            <Input.Placeholder>Pick value</Input.Placeholder>
          )}
        </InputBase>
      )}

      {profile.deviceToEmulate == proto.SubType.Gamepad && (
        <>
          <Space h="md" />
          <FaceButtonMappingMode
            mode={profile.faceButtonMappingMode}
            dispatch={(val) =>
              updateProfile({ ...profile, faceButtonMappingMode: val }, profileIdx)
            }
          />
        </>
      )}
      <Space h="md" />
      <Title order={3}>Activation method</Title>
      <Group>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={profile.activationMethod?.map((mapping, mappingIdx) => mappingIdx)!}
            strategy={rectSortingStrategy}
          >
            {profile.activationMethod?.map((mapping, mappingIdx) => (
              <SantrollerActivationTrigger
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
                      activationMethod: [
                        ...profile.activationMethod!.map((cMapping, cMappingIdx) =>
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
                      activationMethod: [
                        ...profile.activationMethod!.filter(
                          (_, cMappingIdx) => cMappingIdx != mappingIdx
                        ),
                      ],
                    },
                    profileIdx
                  )
                }
              />
            ))}
          </SortableContext>
        </DndContext>
      </Group>
      <Space h="md" />
      <Title order={3}>Inputs</Title>
      <Group align="stretch">
        {profile.mappings?.length == 0 && (
          <>
            <Button variant="filled" onClick={() => loadDefaults(undefined)}>
              Load defaults (direct)
            </Button>
            {Object.values(deviceStatus)
              .filter(isInput)
              .map((item) => (
                <Button value={item.id} key={item.id} onClick={() => loadDefaults(item)}>
                  Load defaults {t(`devices.${item.type}`)} ({DeviceStatus.label(item)})
                </Button>
              ))}
          </>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                        ...profile.mappings!.filter((_, cMappingIdx) => cMappingIdx != mappingIdx),
                      ],
                    },
                    profileIdx
                  )
                }
              />
            ))}
          </SortableContext>
        </DndContext>
      </Group>

      <Affix position={{ bottom: 40, right: 40 }}>
        <Menu shadow="md" width={150}>
          <Menu.Target>
            <ActionIcon color="blue" radius="xl" size={60}>
              <IconPlus stroke={1.5} size={30} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                updateProfile(
                  {
                    ...profile,
                    activationMethod: [...profile.activationMethod!, { input: {} }],
                  },
                  profileIdx
                );
              }}
            >
              Add Activation Method
            </Menu.Item>
            <Menu.Item
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                updateProfile(
                  {
                    ...profile,
                    mappings: [...profile.mappings!, { input: {} }],
                  },
                  profileIdx
                );
              }}
            >
              Add Input
            </Menu.Item>
            <Menu.Item leftSection={<IconRestore size={14} />}>Load Defaults</Menu.Item>
            <Menu.Item leftSection={<IconTrash size={14} />}>Clear all</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Affix>
    </>
  );
}

export function InputsPage() {
  const activeProfile = useConfigStore((state) => state.currentProfile);
  const profiles = useConfigStore((state) => state.config.profiles!);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const addProfile = useConfigStore((state) => state.addProfile);
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
  if (!loaded) {
    return (
      <Layout>
        <RequireDevice>
          <Loader/>
        </RequireDevice>
      </Layout>
    );
  }
  return (
    <Layout>
      <RequireDevice>
        <Tabs
          value={(activeProfile ?? 0).toString()}
          onChange={setActiveProfile}
          keepMounted={false}
        >
          <Tabs.List>
            {profiles.map((x, i) => (
              <InputsTab value={x.name} idx={i} key={i} />
            ))}
            <Tabs.Tab value="add" onClick={addProfile}>
              <IconPlus size={14} />
            </Tabs.Tab>
          </Tabs.List>
          {profiles.map((x, profileIdx) => (
            <Tabs.Panel value={profileIdx.toString()} key={profileIdx}>
              <Profile profileIdx={profileIdx}></Profile>
            </Tabs.Panel>
          ))}
        </Tabs>
      </RequireDevice>
    </Layout>
  );
}
