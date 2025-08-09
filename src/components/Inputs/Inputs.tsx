import { useState } from 'react';
import { IconPencil, IconPlus, IconRestore, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Affix,
  Badge,
  Button,
  Card,
  Center,
  Combobox,
  Flex,
  Group,
  Image,
  Input,
  InputBase,
  isNumberLike,
  Menu,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Space,
  Tabs,
  Text,
  TextInput,
  Title,
  useCombobox,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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
  'psx',
  'snes',
  'joybus',
  'peripheral',
];
export function SantrollerInput({
  mapping,
  type,
  state,
  dispatch,
  deleteInput,
}: {
  mapping: proto.IMapping;
  type: proto.SubType;
  state: number;
  dispatch: (mapping: proto.IMapping) => void;
  deleteInput: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
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
    proto.ButtonType[mapping.button?.button ?? -1] || proto.AxisType[mapping.axis?.axis ?? -1];
  let deviceValue = '';
  let img = '';
  let device: DeviceStatus | null = null;
  if (mapping.input.digitalDevice) {
    device = deviceStatus[mapping.input.digitalDevice.deviceid];
  } else if (mapping.input.analogDevice) {
    device = deviceStatus[mapping.input.analogDevice.deviceid];
  } else if (mapping.input.mpr121) {
    device = deviceStatus[mapping.input.mpr121.deviceid];
  } else if (mapping.input.gpio) {
    deviceValue = t(`devices.gpio`);
  } else if (mapping.input.midi) {
    deviceValue = t(`devices.midi`);
  } else if (mapping.input.mouseAxis) {
    deviceValue = t(`devices.mouseAxis`);
  } else if (mapping.input.mouseButton) {
    deviceValue = t(`devices.mouseButton`);
  } else if (mapping.input.key) {
    deviceValue = t(`devices.key`);
  }
  if (device) {
    deviceValue = `${t(`devices.${device.type}`)} (${DeviceStatus.pins(device)
      ?.map((x) => `GP${x}`)
      .join(', ')})`;
    // img = `covers/devices/${device.type}.png`;
  }
  const inputDevice = mapping.input.digitalDevice || mapping.input.analogDevice;
  // TODO: filter outputs so only the ones relevant to the "device to emulate" show
  // for the image, can we get a wireframe of the device to emulate, and then just highlight the input being selected?
  // then that way its much more clear exactly what input is being modified.
  // in gamepad mode we still need a way to display what console is being mapped for, probably just have a legend mode toggle somewhere
  // we can just rely on translations for translating the input labels around

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
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Flex justify="flex-end">
          <ActionIcon color="red">
            <IconTrash style={{ width: '70%', height: '70%' }} onClick={open} />
          </ActionIcon>
        </Flex>
        <Badge size="md" color="blue">
          {state}
        </Badge>
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

        <Combobox
          store={outputCombobox}
          onOptionSubmit={(val) => {
            const button = proto.ButtonType[val as keyof typeof proto.ButtonType];
            const axis = proto.AxisType[val as keyof typeof proto.AxisType];
            if (button !== undefined) {
              dispatch({ ...mapping, button: { button, inverted: false }, axis: null });
            }
            if (axis !== undefined) {
              dispatch({ ...mapping, axis: { axis }, button: null });
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
              {proto.ButtonType[mapping.button?.button ?? -1] ||
                proto.AxisType[mapping.axis?.axis ?? -1] || (
                  <Input.Placeholder>Pick value</Input.Placeholder>
                )}
            </InputBase>
          </Combobox.Target>

          <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
            <Combobox.Options>
              {Object.keys(proto.AxisType)
                .concat(Object.keys(proto.ButtonType))
                .map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {item}
                  </Combobox.Option>
                ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        <Combobox
          store={combobox}
          onOptionSubmit={(val) => {
            combobox.closeDropdown();
            // setDeviceValue(val);
            if (isNumberLike(val)) {
              if (mapping.axis) {
                dispatch({
                  ...mapping,
                  input: { analogDevice: { axis: mapping.axis.axis, deviceid: parseInt(val) } },
                });
              } else if (mapping.button) {
                dispatch({
                  ...mapping,
                  input: {
                    digitalDevice: { button: mapping.button.button, deviceid: parseInt(val) },
                  },
                });
              }
              return;
            }
            switch (val) {
              case 'gpio':
                if (mapping.axis) {
                  dispatch({
                    ...mapping,
                    input: { gpio: { pin: -1, analog: true, pinMode: proto.PinMode.Floating } },
                  });
                } else if (mapping.button) {
                  dispatch({
                    ...mapping,
                    input: { gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullDown } },
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
                    {t(`devices.${item.type}`)} (
                    {DeviceStatus.pins(item)
                      ?.map((x) => `GP${x}`)
                      .join(', ')}
                    )
                  </Combobox.Option>
                ))}
              <Combobox.Option value="gpio">{t('devices.gpio')}</Combobox.Option>
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        {inputDevice && (
          <Combobox
            store={inputCombobox}
            onOptionSubmit={(val) => {
              const button = proto.ButtonType[val as keyof typeof proto.ButtonType];
              const axis = proto.AxisType[val as keyof typeof proto.AxisType];
              if (button !== undefined) {
                dispatch({
                  ...mapping,
                  input: { digitalDevice: { button, deviceid: inputDevice!.deviceid } },
                });
              }
              if (axis !== undefined) {
                dispatch({
                  ...mapping,
                  input: { analogDevice: { axis, deviceid: inputDevice!.deviceid } },
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
                {proto.ButtonType[mapping.input.digitalDevice?.button ?? -1] ||
                  proto.AxisType[mapping.input.analogDevice?.axis ?? -1] || (
                    <Input.Placeholder>Pick value</Input.Placeholder>
                  )}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
              <Combobox.Options>
                {Object.keys(proto.AxisType)
                  .concat(Object.keys(proto.ButtonType))
                  .map((item) => (
                    <Combobox.Option value={item} key={item}>
                      {item}
                    </Combobox.Option>
                  ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )}
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
          </>
        )}
      </Card>
    </>
  );
}

export function AxisSantrollerMapping({
  mapping,
  id,
}: {
  mapping: proto.IAxisMapping;
  id: string;
}) {
  const { t } = useTranslation();
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  return (
    <Combobox
      store={inputCombobox}
      onOptionSubmit={(val) => {
        // setInputValue(val);
        inputCombobox.closeDropdown();
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
          onClick={() => inputCombobox.toggleDropdown()}
        >
          {t(`axis.${proto.AxisType[mapping.axis]}`) || (
            <Input.Placeholder>Pick value</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
        <Combobox.Options>
          {Object.keys(proto.AxisType).map((item) => (
            <Combobox.Option value={item} key={item}>
              {t(`axis.${item}`)}
            </Combobox.Option>
          ))}
          {Object.keys(proto.ButtonType).map((item) => (
            <Combobox.Option value={item} key={item}>
              {t(`button.${item}`)}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
export function ButtonSantrollerMapping({
  mapping,
  id,
}: {
  mapping: proto.IButtonMapping;
  id: string;
}) {
  return <></>;
}

export function SantrollerMapping({ mapping, id }: { mapping: proto.Mapping; id: string }) {
  if (mapping.axis) {
    return <AxisSantrollerMapping mapping={mapping.axis} id={id} />;
  }
  if (mapping.button) {
    return <ButtonSantrollerMapping mapping={mapping.button} id={id} />;
  }
  return <></>;
}

export function InputsTab({ value, idx }: { value: string; idx: number }) {
  const [editing, { toggle }] = useDisclosure();

  return (
    <Tabs.Tab value={idx.toString()}>
      <Group justify="center" gap="xs">
        {editing && <TextInput value={value} />}
        {!editing && <Text>{value}</Text>}
        <ActionIcon color="gray" variant="filled" aria-label="Edit" component="a" onClick={toggle}>
          <IconPencil style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
        <ActionIcon
          color="gray"
          variant="filled"
          aria-label="Delete"
          component="a"
          onClick={toggle}
        >
          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </Group>
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
  const profiles = useConfigStore((state) => state.config.profiles!);
  const mappingStatus = useConfigStore((state) => state.mappingStatus);
  const [activeProfile, setActiveProfile] = useState<string | null>('0');
  const updateProfile = useConfigStore((state) => state.updateProfile);
  const addProfile = useConfigStore((state) => state.addProfile);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  return (
    <>
      <Tabs value={activeProfile} onChange={setActiveProfile}>
        <Tabs.List>
          {profiles.map((x, i) => (
            <InputsTab value={x.name} idx={i} key={i} />
          ))}
          <Tabs.Tab value="add">
            <IconPlus size={14} onClick={addProfile} />
          </Tabs.Tab>
        </Tabs.List>
        {profiles.map((x, profileIdx) => (
          <Tabs.Panel value={profileIdx.toString()} key={profileIdx}>
            <Space h="md" />
            <Title order={2}>Settings</Title>
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
            <SimpleGrid cols={3}>
              {x.activationMethod?.map((mapping, mappingIdx) => (
                <SantrollerInput
                  key={mappingIdx}
                  mapping={mapping}
                  type={x.deviceToEmulate}
                  state={mappingStatus[profileIdx][mappingIdx].state}
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
            </SimpleGrid>
            <Space h="md" />
            <Title order={3}>Inputs</Title>
            <SimpleGrid cols={3}>
              {x.mappings?.map((mapping, mappingIdx) => (
                <SantrollerInput
                  key={mappingIdx}
                  mapping={mapping}
                  type={x.deviceToEmulate}
                  state={mappingStatus[profileIdx][mappingIdx].state}
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
            </SimpleGrid>
          </Tabs.Panel>
        ))}
      </Tabs>
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
                if (!activeProfile) {
                  return;
                }
                const idx = parseInt(activeProfile);
                const profile = profiles[idx];
                updateProfile(
                  {
                    ...profile,
                    mappings: [...profile.mappings!, { input: {} }],
                  },
                  idx
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
