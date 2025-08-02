import { useState } from 'react';
import { SegmentedControl, TextInput, Space, Menu, Text, Title, Card, Center, Image, InputBase, Input, Tabs, Group, SimpleGrid, useCombobox, Combobox, ActionIcon, Affix } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconRestore, IconTrash, IconPencil } from '@tabler/icons-react';
import { proto } from '../SettingsContext/config';
import { DeviceStatus, useConfigStore } from '../SettingsContext/SettingsContext';
import { useTranslation } from 'react-i18next';
const validDevices = ["adxl", "wii", "bhdrum", "worldTourDrum", "mpu6050", "mpr121", "crazyGuitarNeck", "gh5Neck", "djhTurntable", "usbHost", "multiplexer", "psx", "snes", "joybus", "peripheral"]
const standardDevices = ["gpio", "midi"]
export function SantrollerInput({ mapping, id }: { mapping: proto.IMapping, id: string }) {
  const { t } = useTranslation();
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  let deviceValue = ""
  let img = ""
  let device: DeviceStatus | null = null
  if (mapping.input.digitalDevice) {
    device = deviceStatus[mapping.input.digitalDevice.deviceid];
  } else if (mapping.input.analogDevice) {
    device = deviceStatus[mapping.input.analogDevice.deviceid];
  } else if (mapping.input.mpr121) {
    device = deviceStatus[mapping.input.mpr121.deviceid];
  } else if (mapping.input.gpio) {
    deviceValue = t(`devices.gpio`)
  } else if (mapping.input.midi) {
    deviceValue = t(`devices.midi`)
  } else if (mapping.input.mouseAxis) {
    deviceValue = t(`devices.mouseAxis`)
  } else if (mapping.input.mouseButton) {
    deviceValue = t(`devices.mouseButton`)
  } else if (mapping.input.key) {
    deviceValue = t(`devices.key`)
  }
  if (device) {
    deviceValue = `${t(`devices.${device.type}`)} (${DeviceStatus.pins(device)?.join(", ")})`
    img = device.type
  }
  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {img && <Card.Section>
          <Center>
            <Image
              src={img}
              height={160}
              w="auto"
              fit="contain"
              alt={deviceValue}
            />
          </Center>
        </Card.Section>}


        <Group justify="space-between" mt="md" mb="xs">
          <Text fw={500}>{deviceValue}</Text>
        </Group>

        <Combobox
          store={combobox}
          onOptionSubmit={(val) => {
            // setDeviceValue(val);
            combobox.closeDropdown();
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

          <Combobox.Dropdown
            mah="300px"
            style={{ "overflow": 'auto' }}
          >
            <Combobox.Options>
              {Object.values(deviceStatus).filter(x => validDevices.includes(x.type)).map((item) => (
                <Combobox.Option value={item.id} key={item.id}>
                  {t(`devices.${item.type}`)} ({DeviceStatus.pins(item)?.join(", ")})
                </Combobox.Option>
              ))}
              {standardDevices.map((item) => (
                <Combobox.Option value={item} key={item}>
                  {t(`devices.${item}`)}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        {/* <Combobox
          store={inputCombobox}
          onOptionSubmit={(val) => {
            // setInputValue(val);
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
              {inputValue || <Input.Placeholder>Pick value</Input.Placeholder>}
            </InputBase>
          </Combobox.Target>

          <Combobox.Dropdown
            mah="300px"
            style={{ "overflow": 'auto' }}
          >
            <Combobox.Options>
              {Object.keys(proto.AxisType).concat(Object.keys(proto.ButtonType)).map((item) => (
                <Combobox.Option value={item} key={item}>
                  {item}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox> */}
      </Card>


    </>
  );
}

export function AxisSantrollerMapping({ mapping, id }: { mapping: proto.IAxisMapping, id: string }) {
  const { t } = useTranslation();
  const inputCombobox = useCombobox({
    onDropdownClose: () => inputCombobox.resetSelectedOption(),
  });
  return (
    <Combobox
      store={inputCombobox}
      onOptionSubmit={(val) => {
        // setInputValue(val);
        // TODO: the setter in config would have to change this to button if a button is picked
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
          {t(`axis.${proto.AxisType[mapping.axis]}`) || <Input.Placeholder>Pick value</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown
        mah="300px"
        style={{ "overflow": 'auto' }}
      >
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
  )
}
export function ButtonSantrollerMapping({ mapping, id }: { mapping: proto.IButtonMapping, id: string }) {
  return <></>
}

export function SantrollerMapping({ mapping, id }: { mapping: proto.Mapping, id: string }) {
  if (mapping.axis) {
    return <AxisSantrollerMapping mapping={mapping.axis} id={id} />
  }
  if (mapping.button) {
    return <ButtonSantrollerMapping mapping={mapping.button} id={id} />
  }
  return <></>
}


export function InputsTab({ value }: { value: string }) {
  const [editing, { toggle }] = useDisclosure();

  return (
    <Tabs.Tab value={value}>
      <Group justify="center" gap="xs">
        {editing && <TextInput
          value={value}
        />}
        {!editing && <Text>{value}</Text>}
        <ActionIcon color="gray" variant="filled" aria-label="Edit" component="a" onClick={toggle}>
          <IconPencil style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
        <ActionIcon color="gray" variant="filled" aria-label="Delete" component="a" onClick={toggle}>
          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </Group>
    </Tabs.Tab>
  )
}
function FaceButtonMappingMode({ mode, dispatch }: { mode: proto.FaceButtonMappingMode, dispatch: (device: proto.FaceButtonMappingMode) => void }) {
  const { t } = useTranslation();
  const data = [
    { label: t("face_button_mapping_mode.legend_based"), value: proto.FaceButtonMappingMode.LegendBased.toString() },
    { label: t("face_button_mapping_mode.position_based"), value: proto.FaceButtonMappingMode.PositionBased.toString() }
  ]
  return (
    <Input.Wrapper label={t("face_button_mapping_mode.label")} description={t("face_button_mapping_mode.description")}>
      <SegmentedControl
        fullWidth
        data={data}
        value={mode.toString()}
        onChange={(val) => dispatch(Number(val))}
      />
    </Input.Wrapper>
  )
}
const devicesToEmulate = ['Guitar Hero Guitar'];
export function Inputs() {
  const profiles = useConfigStore((state) => state.config.profiles!);
  const [deviceValue, setDeviceValue] = useState<string>(devicesToEmulate[0]);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  return (
    <>
      <Tabs defaultValue={profiles[0].name}>
        <Tabs.List>
          {profiles.map(x => <InputsTab value={x.name} key={x.name} />)}
          <Tabs.Tab value="add">
            <IconPlus size={14} />
          </Tabs.Tab>
        </Tabs.List>
        {profiles.map(x => (
          <Tabs.Panel value={x.name} key={x.name}>
            <Space h="md" />
            <Title order={2}>Settings</Title>
            <Combobox
              store={combobox}
              onOptionSubmit={(val) => {
                setDeviceValue(val);
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
                  {proto.SubType[x.deviceToEmulate] || <Input.Placeholder>Pick value</Input.Placeholder>}
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
            <Space h="md" />
            <FaceButtonMappingMode mode={x.faceButtonMappingMode} dispatch={(val) => updateConfig({ faceButtonMappingMode: val })} />
            <Space h="md" />
            <Title order={3}>Activation method</Title>
            <SimpleGrid cols={3}>
              {x.activationMethod?.map((mapping, i) => (
                <SantrollerInput key={i} mapping={mapping} />
              ))}
            </SimpleGrid>
            <Space h="md" />
            <Title order={3}>Inputs</Title>
            <SimpleGrid cols={3}>
              {x.mappings?.map((mapping, i) => (
                <SantrollerInput key={i} mapping={mapping} />
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
            <Menu.Item leftSection={<IconPlus size={14} />}>
              Add Activation Method
            </Menu.Item>
            <Menu.Item leftSection={<IconPlus size={14} />}>
              Add Input
            </Menu.Item>
            <Menu.Item leftSection={<IconRestore size={14} />}>
              Load Defaults
            </Menu.Item>
            <Menu.Item leftSection={<IconTrash size={14} />}>
              Clear all
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Affix>


    </>
  );
}
