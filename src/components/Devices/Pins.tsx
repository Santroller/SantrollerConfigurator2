import { createContext, useContext } from 'react';
import { Combobox, Group, Input, InputBase, Text, useCombobox } from '@mantine/core';

import '@/i18n/config';

import { useTranslation } from 'react-i18next';
import { useConfigStore } from '../SettingsContext/SettingsContext';
import { getLabel } from './pinUtils';

export const DeviceContext = createContext<string | undefined>(undefined);

export function PinBox({
  pin,
  valid,
  error,
  label,
  dispatch,
  deviceId,
}: {
  pin: number;
  valid: { [pin: number]: { label: string; channel?: string; pin: number } };
  error?: string;
  label: string;
  dispatch?: (pin: number) => void;
  deviceId?: string;
}) {
  const { t } = useTranslation();
  const contextDeviceId = useContext(DeviceContext);
  const effectiveDeviceId = deviceId ?? contextDeviceId;

  const guiDevices = useConfigStore((state) => state.guiDevices);
  const devices = useConfigStore((state) => state.deviceStatus);

  const currentDevice = effectiveDeviceId ? devices[effectiveDeviceId] : undefined;
  const parentId = currentDevice?.parentId;

  const relevantDevices = Object.values(devices).filter((d) => d.parentId === parentId);
  const labelsText = getLabel(t, Object.values(guiDevices), relevantDevices, pin, false);
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
                      pin === item[1].pin ? [] : relevantDevices,
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
