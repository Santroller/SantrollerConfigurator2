import { createContext, useContext } from 'react';
import { Combobox, Group, Input, InputBase, Text, useCombobox } from '@mantine/core';

import '@/i18n/config';

import { useTranslation } from 'react-i18next';
import { useProfileLabels } from '@/components/Labels/useProfileLabels';
import { pinAvailable, PinOption } from '@/devices/pico/pins';
import { useConfigStore } from '../SettingsContext/SettingsContext';
import { getLabel } from './pinUtils';

export const DeviceContext = createContext<string | undefined>(undefined);

export function PinBox({
  pin,
  valid: allValid,
  error,
  label,
  dispatch,
  deviceId,
  optional,
}: {
  pin: number;
  // Every option, for any chip: the ones the connected chip doesn't have are left out
  valid: { [pin: number]: PinOption };
  error?: string;
  label: string;
  dispatch?: (pin: number) => void;
  deviceId?: string;
  // Lets the pin be cleared back to none (-1), and doesn't flag an unset pin as an error
  optional?: boolean;
}) {
  const { t } = useTranslation();
  const contextDeviceId = useContext(DeviceContext);
  const effectiveDeviceId = deviceId ?? contextDeviceId;

  const guiDevices = useProfileLabels();
  const devices = useConfigStore((state) => state.deviceStatus);
  const gpioCount = useConfigStore((state) => state.gpioCount);
  const valid: { [pin: number]: PinOption } = Object.fromEntries(
    Object.entries(allValid).filter(([, option]) => pinAvailable(option, gpioCount))
  );

  const currentDevice = effectiveDeviceId ? devices[effectiveDeviceId] : undefined;
  const parentId = currentDevice?.parentId;

  const relevantDevices = Object.values(devices).filter((d) => d.parentId === parentId);
  const labelsText = getLabel(t, guiDevices, relevantDevices, pin, false);
  const combobox = useCombobox({
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('selected', { scrollIntoView: true }),
  });

  // The input has a fixed height, so keep this on one line and truncate the usage text
  const selectedContent = (
    <Group gap="2" wrap="nowrap" title={labelsText || undefined}>
      <Text fz="sm" span style={{ flexShrink: 0 }}>
        {t(valid[pin]?.label, valid[pin]) || (
          <Input.Placeholder>{t('invalid_pin')}</Input.Placeholder>
        )}
      </Text>
      <Text fz="xs" span opacity="0.7" truncate="end" miw={0}>
        {labelsText}
      </Text>
    </Group>
  );

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
        {selectedContent}
      </InputBase>
    );
  }

  const actualError = valid[pin]?.label || optional ? error : 'invalid_pin_message';
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
      {selectedContent}
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
          {combobox.dropdownOpened && optional && (
            <Combobox.Option value="-1" selected={!valid[pin]?.label}>
              <Text fz="sm" span>
                {t('invalid_pin')}
              </Text>
            </Combobox.Option>
          )}
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
                      guiDevices,
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
