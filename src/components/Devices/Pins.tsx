import { Combobox, Input, InputBase, useCombobox } from '@mantine/core';

import '@/i18n/config';

import { useTranslation } from 'react-i18next';
import { DeviceStatus, proto, useConfigStore } from '../SettingsContext/SettingsContext';
import { TFunction } from 'i18next';

function getLabel(t: TFunction<"translation", undefined>, guiDevices: proto.IGuiConfig[], devices: DeviceStatus[], pin: number) {
  const labels = Object.entries(guiDevices)
    .filter((x) => x[1].label?.pin == pin)
    .map((x) => x[1].label?.label)
    .concat(
      Object.entries(devices)
        .filter((x) => DeviceStatus.pins(x[1]).includes(pin))
        .map((x) => `${t(`devices.${x[1].type}`)}`)
    );
  const labelsText = labels.length > 0 && `- ${labels.join(' - ')}`;
  return labelsText;
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
  const labelsText = getLabel(t, Object.values(guiDevices), [], pin);
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
        {t(valid[pin]?.label, valid[pin])} {labelsText}
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
      {t(valid[pin]?.label, valid[pin]) || (
        <Input.Placeholder>{t('invalid_pin')}</Input.Placeholder>
      )}{' '}
      {labelsText}
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
              <Combobox.Option value={item[0]} key={item[0]} selected={pin == item[1].pin}>
                {t(item[1].label, item[1])} {getLabel(t, Object.values(guiDevices), pin == item[1].pin ? [] : Object.values(devices), item[1].pin)}
              </Combobox.Option>
            ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
