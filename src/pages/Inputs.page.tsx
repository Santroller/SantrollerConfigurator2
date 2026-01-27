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
  Switch,
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
function hasDefaults(deviceStatus: DeviceStatus) {
  switch (deviceStatus.type) {
    case 'crkdNeck':
      return true;
    default:
      return false;
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
function SantrollerInput({
  input,
  axis,
  button,
  dispatch,
}: {
  input: proto.IInput;
  axis: boolean;
  button: boolean;
  dispatch: (input: proto.IInput) => void;
}) {
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
  const inputLabel =
    t(`wii.inputs.${proto.WiiAxisType[input.wiiAxis?.axis ?? -1]}`) ||
    t(`wii.inputs.${proto.WiiButtonType[input.wiiButton?.button ?? -1]}`) ||
    t(`crkd.inputs.${proto.CrkdNeckButtonType[input.crkd?.button ?? -1]}`) ||
    (input.gpio && t(AllPinsNamed[input.gpio.pin]?.label, AllPinsNamed[input.gpio.pin]));

  const analogInput = input.gpio?.analog || input.ads1115 || input.wiiAxis;
  let deviceValue = '';
  let device: DeviceStatus | null = null;
  if (input.mpr121) {
    device = deviceStatus[input.mpr121.deviceid];
  } else if (input.wiiAxis) {
    device = deviceStatus[input.wiiAxis.deviceid];
  } else if (input.crkd) {
    device = deviceStatus[input.crkd.deviceid];
  } else if (input.wiiButton) {
    device = deviceStatus[input.wiiButton.deviceid];
  } else if (input.gh5Neck) {
    device = deviceStatus[input.gh5Neck.deviceid];
  } else if (input.accelerometer) {
    device = deviceStatus[input.accelerometer.deviceid];
  } else if (input.gpio && input.gpio.analog) {
    deviceValue = t(`devices.gpio_analog`);
  } else if (input.gpio) {
    deviceValue = t(`devices.gpio_digital`);
  } else if (input.ads1115) {
    deviceValue = t(`devices.ads1115`);
  } else if (input.mouseAxis) {
    deviceValue = t(`devices.mouseAxis`);
  } else if (input.mouseButton) {
    deviceValue = t(`devices.mouseButton`);
  } else if (input.key) {
    deviceValue = t(`devices.key`);
  }
  if (device) {
    deviceValue = `${t(`devices.${device.type}`)} (${DeviceStatus.label(device)})`;
  }
  return (
    <>
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
                case 'ads1115':
                  dispatch({
                    ads1115: {
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
                  if (button) {
                    dispatch({
                      crkd: {
                        button: proto.CrkdNeckButtonType.CrkdGreen,
                        deviceid: parseInt(val),
                      },
                    });
                  }
                  break;
                case 'gh5Neck':
                  if (button) {
                    dispatch({
                      gh5Neck: {
                        button: proto.Gh5NeckButtonType.Gh5Green,
                        deviceid: parseInt(val),
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
                  gpio: { pin: -1, analog: true, pinMode: proto.PinMode.Floating },
                });
                break;
              case 'gpio_digital':
                dispatch({
                  gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp },
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
      {input.wiiAxis &&
        ((inputCombobox.dropdownOpened && (
          <Combobox
            store={inputCombobox}
            onOptionSubmit={(val) => {
              const axis = proto.WiiAxisType[val as keyof typeof proto.WiiAxisType];
              if (axis !== undefined) {
                dispatch({ wiiAxis: { ...input.wiiAxis!, axis } });
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
                {t(`wii.inputs.${proto.WiiAxisType[input.wiiAxis?.axis ?? -1]}`)}
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
            {t(`wii.inputs.${proto.WiiAxisType[input.wiiAxis?.axis ?? -1]}`)}
          </InputBase>
        ))}
      {input.wiiButton &&
        ((inputCombobox.dropdownOpened && (
          <Combobox
            store={inputCombobox}
            onOptionSubmit={(val) => {
              const button = proto.WiiButtonType[val as keyof typeof proto.WiiButtonType];
              if (button !== undefined) {
                dispatch({ wiiButton: { ...input.wiiButton!, button } });
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
                {t(`wii.inputs.${proto.WiiButtonType[input.wiiButton?.button ?? -1]}`)}
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
            {t(`wii.inputs.${proto.WiiButtonType[input.wiiButton?.button ?? -1]}`)}
          </InputBase>
        ))}
      {input.crkd &&
        ((inputCombobox.dropdownOpened && (
          <Combobox
            store={inputCombobox}
            onOptionSubmit={(val) => {
              const button = proto.CrkdNeckButtonType[val as keyof typeof proto.CrkdNeckButtonType];
              console.log(button);
              if (button !== undefined) {
                dispatch({ crkd: { ...input.crkd!, button } });
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
                {t(`crkd.inputs.${proto.CrkdNeckButtonType[input.crkd?.button ?? -1]}`)}
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
            {proto.CrkdNeckButtonType[input.crkd?.button ?? -1] || (
              <Input.Placeholder>Pick value</Input.Placeholder>
            )}
          </InputBase>
        ))}
      {input.gh5Neck &&
        ((inputCombobox.dropdownOpened && (
          <Combobox
            store={inputCombobox}
            onOptionSubmit={(val) => {
              const button = proto.Gh5NeckButtonType[val as keyof typeof proto.Gh5NeckButtonType];
              console.log(button);
              if (button !== undefined) {
                dispatch({ gh5Neck: { ...input.gh5Neck!, button } });
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
                {t(`gh5Neck.inputs.${proto.Gh5NeckButtonType[input.gh5Neck?.button ?? -1]}`)}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.keys(proto.Gh5NeckButtonType).map((item) => (
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
            {proto.Gh5NeckButtonType[input.gh5Neck?.button ?? -1] || (
              <Input.Placeholder>Pick value</Input.Placeholder>
            )}
          </InputBase>
        ))}
      {input.gpio && (
        <>
          <PinBox
            label="Pin"
            valid={input.gpio.analog ? AnalogPinsNamed : AllPinsNamed}
            pin={input.gpio.pin}
            dispatch={(pin) => dispatch({ gpio: { ...input.gpio!, pin } })}
          />
          {(pinModeCombobox.dropdownOpened && (
            <Combobox
              store={pinModeCombobox}
              onOptionSubmit={(val) => {
                dispatch({
                  ...input,
                  gpio: {
                    ...input.gpio!,
                    pinMode: proto.PinMode[val as keyof typeof proto.PinMode],
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
                  {proto.PinMode[input.gpio.pinMode] || (
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
              {proto.PinMode[input.gpio.pinMode] || (
                <Input.Placeholder>Pick value</Input.Placeholder>
              )}
            </InputBase>
          )}
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
      {input.accelerometer &&
        ((inputCombobox.dropdownOpened && (
          <Combobox
            store={inputCombobox}
            onOptionSubmit={(val) => {
              const type =
                proto.AccelerometerInputType[val as keyof typeof proto.AccelerometerInputType];
              console.log(type);
              if (type !== undefined) {
                dispatch({ accelerometer: { ...input.accelerometer!, type } });
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
                  `accelerometer.inputs.${proto.AccelerometerInputType[input.crkd?.button ?? -1]}`
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
            {proto.AccelerometerInputType[input.accelerometer?.type ?? -1] || (
              <Input.Placeholder>Pick value</Input.Placeholder>
            )}
          </InputBase>
        ))}
    </>
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
  } else if (mapping.input.gh5Neck) {
    device = deviceStatus[mapping.input.gh5Neck.deviceid];
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
        <SantrollerInput
          axis={!!axis}
          button={!!button}
          input={mapping.input}
          dispatch={(input) => dispatch({ ...mapping, input })}
        ></SantrollerInput>
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
        {axis && !analogInput && (
          <>
            <Text size="sm">Released value</Text>
            <Slider
              value={mapping.released!}
              min={0}
              max={65535}
              onChange={(val) => dispatch({ ...mapping, released: val })}
            />
            <Text size="sm">Pressed value</Text>
            <Slider
              value={mapping.pressed!}
              min={0}
              max={65535}
              onChange={(val) => dispatch({ ...mapping, pressed: val })}
            />
          </>
        )}
        {button && <StateBox mappingIdx={mappingIdx} profileIdx={profileIdx}></StateBox>}
        {axis && analogInput && (
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
function SantrollerAssignment({
  mapping,
  profileIdx,
  mode,
  filterSingle,
  dispatch,
  deleteAssignment: deleteInput,
}: {
  mapping: proto.IProfileAssignmentInfo;
  profileIdx: number;
  mode: proto.FaceButtonMappingMode;
  filterSingle: boolean;
  dispatch: (mapping: proto.IProfileAssignmentInfo) => void;
  deleteAssignment: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const assignmentTypeCombobox = useCombobox({
    onDropdownClose: () => assignmentTypeCombobox.resetSelectedOption(),
  });
  const typeCombobox = useCombobox({
    onDropdownClose: () => typeCombobox.resetSelectedOption(),
  });
  const types = (filterSingle ? MultiProfileAssignmentTypes : AllProfileAssignmentTypes);
  const label = t('assignmentType.' + types.filter((x) => mapping[x]));
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
        {label || <Input.Placeholder>Pick value</Input.Placeholder>}
      </InputBase>
    ),
    [label]
  );
  return (
    <>
      <Modal opened={opened} onClose={close} title={t('delete_assignment_dialog.title')} centered>
        {t('delete_assignment_dialog.desc')}
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
              {t('delete_assignment_dialog.confirm')}
            </Button>
            <Button onClick={close}>{t('delete_assignment_dialog.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Card shadow="sm" padding="lg" radius="md" withBorder w="350px">
        <Card.Section>
          {!mapping.catchall && (
            <ActionIcon color="red" style={{ position: 'absolute', top: 0, right: 0 }}>
              <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
            </ActionIcon>
          )}
        </Card.Section>
        <Space h="md" />

        <Combobox
          store={assignmentTypeCombobox}
          onOptionSubmit={(val) => {
            switch (val as ProfileAssignmentTypes) {
              case 'catchall':
                dispatch({ catchall: true });
                break;
              case 'consoleType':
                dispatch({
                  catchall: false,
                  consoleType: proto.ConsoleType.ConsolePC,
                });
                break;
              case 'wiiExt':
                dispatch({
                  catchall: false,
                  wiiExt: proto.WiiExtType.WiiClassicController,
                });
                break;
              case 'ps2Cnt':
                dispatch({
                  catchall: false,
                  ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeDigital,
                });
                break;
              case 'usbType':
                dispatch({ catchall: false, usbType: proto.SubType.Gamepad });
                break;
              case 'usbDevice':
                dispatch({ catchall: false, usbDevice: { vid: 0, pid: 0 } });
                break;
              case 'input':
                dispatch({
                  catchall: false,
                  input: { input: {} },
                });
                break;
              case 'inputAnyTime':
                dispatch({
                  catchall: false,
                  inputAnyTime: { input: {} },
                });
                break;
              case 'midiChannel':
                dispatch({
                  catchall: false,
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
          <Combobox
            store={typeCombobox}
            onOptionSubmit={(val) => {
              mapping.usbType = proto.SubType[val as keyof typeof proto.SubType];
              typeCombobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <InputBase
                label="Usb Controller Type"
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => typeCombobox.toggleDropdown()}
              >
                {t(`subType.${proto.SubType[mapping.usbType]}`) || (
                  <Input.Placeholder>Pick value</Input.Placeholder>
                )}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.keys(proto.SubType).map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {t(`subType.${item}`)}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )}
        {mapping.consoleType && (
          <Combobox
            store={typeCombobox}
            onOptionSubmit={(val) => {
              mapping.consoleType = proto.ConsoleType[val as keyof typeof proto.ConsoleType];
              typeCombobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <InputBase
                label="Plugged in device type"
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => typeCombobox.toggleDropdown()}
              >
                {t(`consoleType.${proto.ConsoleType[mapping.consoleType]}`) || (
                  <Input.Placeholder>Pick value</Input.Placeholder>
                )}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.keys(proto.ConsoleType).map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {t(`consoleType.${item}`)}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )}
        {mapping.wiiExt && (
          <Combobox
            store={typeCombobox}
            onOptionSubmit={(val) => {
              mapping.wiiExt = proto.WiiExtType[val as keyof typeof proto.WiiExtType];
              typeCombobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <InputBase
                label="Wii extension type"
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => typeCombobox.toggleDropdown()}
              >
                {t(`wii.extensions.${proto.WiiExtType[mapping.wiiExt]}`) || (
                  <Input.Placeholder>Pick value</Input.Placeholder>
                )}
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
        )}
        {mapping.ps2Cnt && (
          <Combobox
            store={typeCombobox}
            onOptionSubmit={(val) => {
              mapping.ps2Cnt = proto.PS2ControllerType[val as keyof typeof proto.PS2ControllerType];
              typeCombobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <InputBase
                label="PS2 Controller Type"
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => typeCombobox.toggleDropdown()}
              >
                {t(`psx.devices.${proto.PS2ControllerType[mapping.ps2Cnt]}`) || (
                  <Input.Placeholder>Pick value</Input.Placeholder>
                )}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.keys(proto.PS2ControllerType).map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {t(`psx.devices.${item}`)}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )}
        {mapping.usbDevice && (
          <>
            <TextInput label="Vendor ID" leftSection="0x" accept='\w' value={mapping.usbDevice.vid.toString(16)} onChange={(event) => dispatch({ ...mapping, usbDevice: {...mapping.usbDevice!, vid: parseInt((event.currentTarget.value || "0").substring(0,4), 16) ?? 0}})} />
            <TextInput label="Product ID" leftSection="0x" accept='\w' value={mapping.usbDevice.pid.toString(16)} onChange={(event) => dispatch({ ...mapping, usbDevice: {...mapping.usbDevice!, pid: parseInt((event.currentTarget.value || "0").substring(0,4), 16) ?? 0}})} />
          </>
        )}
        {mapping.input && (
          <SantrollerInput
            axis={false}
            button={true}
            input={mapping.input.input}
            dispatch={(input) => dispatch({ ...mapping, input: { input } })}
          ></SantrollerInput>
        )}
        {mapping.inputAnyTime && (
          <SantrollerInput
            axis={false}
            button={true}
            input={mapping.inputAnyTime.input}
            dispatch={(input) => dispatch({ ...mapping, inputAnyTime: { input } })}
          ></SantrollerInput>
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
  deleteAssignment: deleteInput,
}: {
  mapping: proto.IProfileAssignment;
  profileIdx: number;
  mode: proto.FaceButtonMappingMode;
  dispatch: (mapping: proto.IProfileAssignment) => void;
  deleteAssignment: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
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
                deleteInput();
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
      <Card shadow="sm" padding="lg" radius="md" withBorder w="400px" h="100%">
        {mapping.assignments?.map((assignment, assignmentIdx) => (
          <SantrollerAssignment
            key={assignmentIdx}
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
          />
        ))}
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
      <Title order={3}>{t('assignments.title')}</Title>
      <Input.Description c="dimmed">
        Assigning profiles allows Santroller to pick the right profile depending on what you are
        doing. Each profile can have multiple assignments, and then the profile is assigned of all
        the matches in a profile match.
      </Input.Description>
      <Input.Description c="dimmed">
        The catch all matcher is special in that it will be used in any case where no profiles have
        valid matches.
      </Input.Description>
      <Button
        variant="filled"
        onClick={() =>
          updateProfile(
            {
              ...profile,
              assignments: [
                ...profile.assignments!,
                { assignments: [{ catchall: false, input: { input: {} } }] },
              ],
            },
            profileIdx
          )
        }
      >
        {t('assignments.add')}
      </Button>
      <Group>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
              />
            ))}
          </SortableContext>
        </DndContext>
      </Group>
      <Space h="md" />
      <Title order={3}>Inputs</Title>
      <Group align="stretch">
        <Button variant="filled" onClick={() => loadDefaults(undefined)}>
          Load empty defaults
        </Button>
        {Object.values(deviceStatus)
          .filter(hasDefaults)
          .map((item) => (
            <Button value={item.id} key={item.id} onClick={() => loadDefaults(item)}>
              Load defaults for: {t(`devices.${item.type}`)} ({DeviceStatus.label(item)})
            </Button>
          ))}
      </Group>
      <Group align="stretch">
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
