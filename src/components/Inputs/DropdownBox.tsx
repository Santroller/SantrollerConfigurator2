import { useTranslation } from 'react-i18next';
import { Combobox, InputBase, useCombobox } from '@mantine/core';

export type StandardEnum<T> = {
  [id: string]: T | string;
  [nu: number]: string;
};

export function DropdownBox<T extends StandardEnum<unknown>>({
  e,
  val,
  title,
  label,
  description,
  dispatch,
}: {
  e: T;
  val: T[keyof T];
  title: string;
  label: string;
  description?: string;
  dispatch: (input: T[keyof T]) => void;
}) {
  const { t } = useTranslation();
  const inputCombobox = useCombobox({
    onDropdownOpen: () =>
      inputCombobox.updateSelectedOptionIndex('selected', { scrollIntoView: true }),
  });
  return (
    <Combobox
      store={inputCombobox}
      onOptionSubmit={(value) => {
        const selected = e[value as keyof T];
        if (selected !== undefined) {
          dispatch(selected);
        }
        inputCombobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label={t(title)}
          description={description && t(description)}
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => inputCombobox.toggleDropdown()}
        >
          {t(`${label}.${e[val as keyof T]}`)}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown mah="300px" style={{ overflow: 'auto' }}>
        <Combobox.Options>
          {inputCombobox.dropdownOpened &&
            Object.keys(e)
              .filter((key) => isNaN(Number(key)))
              .map((item) => (
                <Combobox.Option value={item} key={item} selected={e[val as keyof T] === item}>
                  {t(`${label}.${item}`)}
                </Combobox.Option>
              ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
