import { useEffect, useMemo, useState } from 'react';
import { IconPencil, IconPlus, IconRestore, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
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
import { AllPinsNamed } from '@/devices/pico/pins';
import { PinBox } from '../Devices/Devices';
import { proto } from '../SettingsContext/config';
import { DeviceStatus, useConfigStore } from '../SettingsContext/SettingsContext';

const validDevices = [
  'adxl',
  'wii',
  'bhdrum',
  'worldTourDrum',
  'mpu6050',
  'mpr121',
  'crazyGuitarNeck',
  'gh5Neck',
  'djhTurntable',
  'usbHost',
  'multiplexer',
  'crkdNeck',
  'psx',
  'snes',
  'joybus',
  'peripheral',
];
export function StateBadge({ profileIdx, mappingIdx }: { profileIdx: number; mappingIdx: number }) {
  const state = useConfigStore((state) => state.mappingStatus[profileIdx][mappingIdx].state);
  return (
    <Badge size="md" color="blue">
      {state}
    </Badge>
  );
}
export function StateLabel({
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
export function StateSection({
  profileIdx,
  mappingIdx,
  min,
  max,
  center,
  deadzone,
  raw,
}: {
  profileIdx: number;
  mappingIdx: number;
  min: number;
  max: number;
  center: number;
  deadzone: number;
  raw?: boolean;
}) {
  const stateRaw = useConfigStore((state) => state.mappingStatus[profileIdx][mappingIdx].stateRaw);
  const state = useConfigStore((state) => state.mappingStatus[profileIdx][mappingIdx].state);
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
  return <Checkbox checked={state > 0} readOnly></Checkbox>;
}
export function StateSlider({
  profileIdx,
  mappingIdx,
  center,
  min,
  max,
  deadzone,
}: {
  profileIdx: number;
  mappingIdx: number;
  center: number;
  min: number;
  max: number;
  deadzone: number;
}) {
  return (
    <div>
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
        ></StateSection>
      </Progress.Root>
    </div>
  );
}
export function SantrollerInput({
  mapping,
  type,
  profileIdx,
  mappingIdx,
  dispatch,
  deleteInput,
}: {
  mapping: proto.IMapping;
  type: proto.SubType;
  profileIdx: number;
  mappingIdx: number;
  dispatch: (mapping: proto.IMapping) => void;
  deleteInput: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const mounted = useMounted();
  const { t } = useTranslation();
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
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
  const label =
    proto.GamepadButtonType[mapping.gamepadButton ?? -1] ||
    proto.GamepadAxisType[mapping.gamepadAxis ?? -1];
  let deviceValue = '';
  let img = '';
  let device: DeviceStatus | null = null;
  if (mapping.input.mpr121) {
    device = deviceStatus[mapping.input.mpr121.deviceid];
  } else if (mapping.input.wiiAxis) {
    device = deviceStatus[mapping.input.wiiAxis.deviceid];
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
    // img = `covers/devices/${device.type}.png`;
  }
  // TODO: filter outputs so only the ones relevant to the "device to emulate" show
  // for the image, can we get a wireframe of the device to emulate, and then just highlight the input being selected?
  // then that way its much more clear exactly what input is being modified.
  // in gamepad mode we still need a way to display what console is being mapped for, probably just have a legend mode toggle somewhere
  // we can just rely on translations for translating the input labels around
  // figure out some way to delay input updates until after the page has loaded
  return (
    <>
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
      <Card shadow="sm" padding="lg" radius="md" withBorder w="400px">
        <Flex justify="flex-end">
          <ActionIcon color="red">
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
        </Flex>
        {img && (
          <Card.Section>
            <Center>
              <Image src={img} height={160} w="auto" fit="contain" alt={deviceValue} />
            </Center>
          </Card.Section>
        )}

        <Group justify="space-between" mt="md" mb="xs">
          <Text fw={500}>{label}</Text>
        </Group>
        {mapping.gamepadButton && (
          <StateBox mappingIdx={mappingIdx} profileIdx={profileIdx}></StateBox>
        )}
        {mapping.gamepadAxis && (
          <>
            <StateSlider
              mappingIdx={mappingIdx}
              profileIdx={profileIdx}
              center={mapping.center!}
              min={mapping.min!}
              max={mapping.max!}
              deadzone={mapping.deadzone!}
            ></StateSlider>
            {mapping.gamepadAxis != proto.GamepadAxisType.GamepadLeftTrigger &&
              mapping.gamepadAxis != proto.GamepadAxisType.GamepadRightTrigger && (
                <Slider
                  value={mapping.center!}
                  min={0}
                  max={65535}
                  onChange={(val) => dispatch({ ...mapping, center: val })}
                />
              )}
            <Slider
              value={mapping.min!}
              min={0}
              max={65535}
              onChange={(val) => dispatch({ ...mapping, min: val })}
            />
            <Slider
              value={mapping.max!}
              min={0}
              max={65535}
              onChange={(val) => dispatch({ ...mapping, max: val })}
            />
            <Slider
              value={mapping.deadzone!}
              min={0}
              max={65535}
              onChange={(val) => dispatch({ ...mapping, deadzone: val })}
            />
          </>
        )}
        {(outputCombobox.dropdownOpened && (
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
                  center:
                    axis == proto.GamepadAxisType.GamepadLeftTrigger ||
                    axis == proto.GamepadAxisType.GamepadRightTrigger
                      ? 0
                      : 32767,
                  min: 0,
                  max: 65535,
                });
              }
              outputCombobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <InputBase
                label="Output"
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                rightSectionPointerEvents="none"
                onClick={() => outputCombobox.toggleDropdown()}
              >
                {proto.GamepadButtonType[mapping.gamepadButton ?? -1] ||
                  proto.GamepadAxisType[mapping.gamepadAxis ?? -1] || (
                    <Input.Placeholder>Pick value</Input.Placeholder>
                  )}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.keys(proto.GamepadAxisType)
                  .concat(Object.keys(proto.GamepadButtonType))
                  .map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {item}
                    </Combobox.Option>
                  ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )) || (
          <InputBase
            label="Output"
            component="button"
            type="button"
            pointer
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            onClick={() => outputCombobox.toggleDropdown()}
          >
            {proto.GamepadButtonType[mapping.gamepadButton ?? -1] ||
              proto.GamepadAxisType[mapping.gamepadAxis ?? -1] || (
                <Input.Placeholder>Pick value</Input.Placeholder>
              )}
          </InputBase>
        )}

        {(combobox.dropdownOpened && (
          <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
              combobox.closeDropdown();
              // setDeviceValue(val);
              if (isNumberLike(val)) {
                switch (deviceStatus[parseInt(val)].type) {
                  case 'wii':
                    if (mapping.gamepadAxis) {
                      dispatch({
                        ...mapping,
                        input: {
                          wiiAxis: {
                            axis: proto.WiiAxisType.WiiAxisClassicLeftStickX,
                            deviceid: parseInt(val),
                          },
                        },
                      });
                    } else if (mapping.gamepadButton) {
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
                  case 'crkdNeck':
                    if (mapping.gamepadButton) {
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
                case 'gpio':
                  if (mapping.gamepadAxis) {
                    dispatch({
                      ...mapping,
                      input: { gpio: { pin: -1, analog: true, pinMode: proto.PinMode.Floating } },
                    });
                  } else if (mapping.gamepadButton) {
                    dispatch({
                      ...mapping,
                      input: { gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp } },
                    });
                  }
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
                onClick={() => combobox.toggleDropdown()}
              >
                {deviceValue || <Input.Placeholder>Pick value</Input.Placeholder>}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.values(deviceStatus)
                  .filter((x) => validDevices.includes(x.type))
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
            onClick={() => combobox.toggleDropdown()}
          >
            {deviceValue || <Input.Placeholder>Pick value</Input.Placeholder>}
          </InputBase>
        )}
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
                  {proto.WiiAxisType[mapping.input.wiiAxis?.axis ?? -1] || (
                    <Input.Placeholder>Pick value</Input.Placeholder>
                  )}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.WiiAxisType).map((item) => (
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
              {proto.WiiAxisType[mapping.input.wiiAxis?.axis ?? -1] || (
                <Input.Placeholder>Pick value</Input.Placeholder>
              )}
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
                  {proto.WiiButtonType[mapping.input.wiiButton?.button ?? -1] || (
                    <Input.Placeholder>Pick value</Input.Placeholder>
                  )}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
                <Combobox.Options>
                  {Object.keys(proto.WiiButtonType).map((item) => (
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
              {proto.WiiButtonType[mapping.input.wiiButton?.button ?? -1] || (
                <Input.Placeholder>Pick value</Input.Placeholder>
              )}
            </InputBase>
          ))}
        {mapping.input.crkd &&
          ((inputCombobox.dropdownOpened && (
            <Combobox
              store={inputCombobox}
              onOptionSubmit={(val) => {
                const button =
                  proto.CrkdNeckButtonType[val as keyof typeof proto.CrkdNeckButtonType];
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
                  {proto.CrkdNeckButtonType[mapping.input.crkd?.button ?? -1] || (
                    <Input.Placeholder>Pick value</Input.Placeholder>
                  )}
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
export function Inputs() {
  const activeProfile = useConfigStore((state) => state.config.currentProfile);
  const profiles = useConfigStore((state) => state.config.profiles!);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const updateProfile = useConfigStore((state) => state.updateProfile);
  const addProfile = useConfigStore((state) => state.addProfile);
  const deleteProfile = useConfigStore((state) => state.deleteProfile);
  const pollInputs = useConfigStore((state) => state.pollInputs);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
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
    return <Loader></Loader>;
  }
  return (
    <>
      <Tabs value={(activeProfile ?? 0).toString()} onChange={setActiveProfile}>
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
            <Space h="md" />
            <Title order={2}>Settings</Title>
            <TextInput
              value={x.name}
              onChange={(e) => updateProfile({ ...x, name: e.currentTarget.value }, profileIdx)}
              label="Profile name"
            />
            <Button variant="filled" color="red" onClick={() => deleteProfile(profileIdx)}>
              Delete profile
            </Button>
            <Combobox
              store={combobox}
              onOptionSubmit={(val) => {
                updateProfile({ ...x, deviceToEmulate: parseInt(val) }, profileIdx);
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
                  {proto.SubType[x.deviceToEmulate] || (
                    <Input.Placeholder>Pick value</Input.Placeholder>
                  )}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown>
                <Combobox.Options>
                  {Object.entries(proto.SubType).map(([k, v]) => (
                    <Combobox.Option value={v.toString()} key={v}>
                      {k}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
            {x.deviceToEmulate == proto.SubType.Gamepad && (
              <>
                <Space h="md" />
                <FaceButtonMappingMode
                  mode={x.faceButtonMappingMode}
                  dispatch={(val) =>
                    updateProfile({ ...x, faceButtonMappingMode: val }, profileIdx)
                  }
                />
              </>
            )}
            <Space h="md" />
            <Title order={3}>Activation method</Title>
            <Group>
              {x.activationMethod?.map((mapping, mappingIdx) => (
                <SantrollerInput
                  key={mappingIdx}
                  mapping={mapping}
                  type={x.deviceToEmulate}
                  profileIdx={profileIdx}
                  mappingIdx={mappingIdx}
                  dispatch={(val) =>
                    updateProfile(
                      {
                        ...x,
                        mappings: [
                          ...x.mappings!.map((cMapping, cMappingIdx) =>
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
                        ...x,
                        mappings: [
                          ...x.mappings!.filter((_, cMappingIdx) => cMappingIdx != mappingIdx),
                        ],
                      },
                      profileIdx
                    )
                  }
                />
              ))}
            </Group>
            <Space h="md" />
            <Title order={3}>Inputs</Title>
            <Group>
              {x.mappings?.map((mapping, mappingIdx) => (
                <SantrollerInput
                  key={mappingIdx}
                  mapping={mapping}
                  type={x.deviceToEmulate}
                  profileIdx={profileIdx}
                  mappingIdx={mappingIdx}
                  dispatch={(val) =>
                    updateProfile(
                      {
                        ...x,
                        mappings: [
                          ...x.mappings!.map((cMapping, cMappingIdx) =>
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
                        ...x,
                        mappings: [
                          ...x.mappings!.filter((_, cMappingIdx) => cMappingIdx != mappingIdx),
                        ],
                      },
                      profileIdx
                    )
                  }
                />
              ))}
            </Group>
          </Tabs.Panel>
        ))}
      </Tabs>
      {activeProfile !== undefined && (
        <Affix position={{ bottom: 40, right: 40 }}>
          <Menu shadow="md" width={150}>
            <Menu.Target>
              <ActionIcon color="blue" radius="xl" size={60}>
                <IconPlus stroke={1.5} size={30} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPlus size={14} />}>Add Activation Method</Menu.Item>
              <Menu.Item
                leftSection={<IconPlus size={14} />}
                onClick={() => {
                  const profile = profiles[activeProfile!];
                  updateProfile(
                    {
                      ...profile,
                      mappings: [...profile.mappings!, { input: {} }],
                    },
                    activeProfile!
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
      )}
    </>
  );
}
