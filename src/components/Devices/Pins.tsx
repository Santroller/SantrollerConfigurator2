import { Combobox, Group, Input, InputBase, Text, useCombobox } from '@mantine/core';

import '@/i18n/config';

import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { DeviceStatus, proto, useConfigStore } from '../SettingsContext/SettingsContext';
import { hasDefaultMappings, isLedDeviceKind } from './deviceRegistry';

export function getLabel(
  t: TFunction<'translation', undefined>,
  guiDevices: proto.IGuiConfig[],
  devices: DeviceStatus[],
  pin: number,
  customer: boolean,
  bracketed: boolean = true
) {
  const labels = Object.entries(guiDevices)
    .filter((x) => x[1].label?.pin === pin && (!customer || x[1].label?.showToCustomer))
    .map((x) => x[1].label?.label)
    .concat(
      Object.entries(devices)
        .filter((x) => DeviceStatus.pins(x[1]).includes(pin))
        .map((x) => `${t(`devices.${x[1].type}`)}`)
    );
  return labels.length > 0 && bracketed ? `(${labels.join(', ')})` : labels.join(', ');
}
export function getMultiplexerLabel(
  guiDevices: proto.IGuiConfig[],
  channel: number,
  customer: boolean,
  bracketed: boolean = true
) {
  const labels = Object.entries(guiDevices)
    .filter(
      (x) =>
        x[1].multiplexerLabel?.channel === channel &&
        (!customer || x[1].multiplexerLabel?.showToCustomer)
    )
    .map((x) => x[1].multiplexerLabel?.label);
  return labels.length > 0 && bracketed ? `(${labels.join(', ')})` : labels.join(', ');
}
export function getMatrixLabel(
  guiDevices: proto.IGuiConfig[],
  inPin: number,
  outPin: number,
  customer: boolean,
  bracketed: boolean = true
) {
  const labels = Object.entries(guiDevices)
    .filter(
      (x) =>
        x[1].matrixLabel?.inputPin === inPin &&
        x[1].matrixLabel?.outputPin === outPin &&
        (!customer || x[1].matrixLabel?.showToCustomer)
    )
    .map((x) => x[1].matrixLabel?.label);
  return labels.length > 0 && bracketed ? `(${labels.join(', ')})` : labels.join(', ');
}

export function PinBox({
  pin,
  valid,
  error,
  label,
  dispatch,
}: {
  pin: number;
  valid: { [pin: number]: { label: string; channel?: string; pin: number } };
  error?: string;
  label: string;
  dispatch?: (pin: number) => void;
}) {
  const { t } = useTranslation();
  const guiDevices = useConfigStore((state) => state.guiDevices);
  const devices = useConfigStore((state) => state.deviceStatus);
  const labelsText = getLabel(t, Object.values(guiDevices), [], pin, false);
  const combobox = useCombobox({
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('selected', { scrollIntoView: true }),
  });

  if (!dispatch) {
    return (
      <InputBase
        disabled
        label={t(label)}
        component="button"
        type="button"
        rightSection={<Combobox.Chevron />}
        rightSectionPointerEvents="none"
      >
        <Group gap="2">
          <Text fz="sm" span>
            {t(valid[pin]?.label, valid[pin]) || (
              <Input.Placeholder>{t('invalid_pin')}</Input.Placeholder>
            )}
          </Text>
          <Text fz="xs" span opacity="0.7">
            {labelsText}
          </Text>
        </Group>
      </InputBase>
    );
  }

  const actualError = valid[pin]?.label ? error : 'invalid_pin_message';
  const mainElement = (
    <InputBase
      error={actualError && t(actualError)}
      label={t(label)}
      component="button"
      type="button"
      pointer
      rightSection={<Combobox.Chevron />}
      rightSectionPointerEvents="none"
      onClick={() => combobox.toggleDropdown()}
    >
      <Group gap="2">
        <Text fz="sm" span>
          {t(valid[pin]?.label, valid[pin]) || (
            <Input.Placeholder>{t('invalid_pin')}</Input.Placeholder>
          )}
        </Text>
        <Text fz="xs" span opacity="0.7">
          {labelsText}
        </Text>
      </Group>
    </InputBase>
  );

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        dispatch(Number(val));
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>{mainElement}</Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={200} style={{ overflowY: 'auto' }}>
          {combobox.dropdownOpened &&
            Object.entries(valid).map((item) => (
              <Combobox.Option value={item[0]} key={item[0]} selected={pin === item[1].pin}>
                <Group gap="2">
                  <Text fz="sm" span>
                    {t(item[1].label, item[1])}
                  </Text>
                  <Text fz="xs" span opacity="0.7">
                    {getLabel(
                      t,
                      Object.values(guiDevices),
                      pin === item[1].pin ? [] : Object.values(devices),
                      item[1].pin,
                      false
                    )}
                  </Text>
                </Group>
              </Combobox.Option>
            ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export function isLed(deviceStatus: DeviceStatus) {
  return isLedDeviceKind(deviceStatus.type);
}
export function hasDefaults(deviceStatus: DeviceStatus) {
  return hasDefaultMappings(deviceStatus.type);
}
