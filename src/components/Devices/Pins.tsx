import {
  Combobox,
  Input,
  InputBase,
  useCombobox,
} from '@mantine/core';

import '@/i18n/config';

import { useTranslation } from 'react-i18next';

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
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
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
        {t(valid[pin]?.label, valid[pin])}
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
      )}
    </InputBase>
  );

  if (combobox.dropdownOpened) {
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
            {Object.entries(valid).map((item) => (
              <Combobox.Option value={item[0]} key={item[0]}>
                {t(item[1].label, item[1])}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    );
  }
  return mainElement;
}
