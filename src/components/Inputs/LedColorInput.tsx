import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  ColorPicker,
  ColorSwatch,
  Group,
  Input,
  Popover,
  Slider,
  Space,
  Text,
} from '@mantine/core';

export interface LedColorInputProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  r?: number | null;
  g?: number | null;
  b?: number | null;
  w?: number | null; // Brightness channel (0-255)
  onChange: (val: { r: number; g: number; b: number; w: number }) => void;
  disabled?: boolean;
  disallowInput?: boolean;
}

function toHex(c: number): string {
  const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace(/^#/, '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  return null;
}

export function LedColorInput({
  label,
  description,
  error,
  placeholder,
  r = 0,
  g = 0,
  b = 0,
  w = 255,
  onChange,
  disabled = false,
  disallowInput = false,
}: LedColorInputProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  const currentR = Math.max(0, Math.min(255, r ?? 0));
  const currentG = Math.max(0, Math.min(255, g ?? 0));
  const currentB = Math.max(0, Math.min(255, b ?? 0));
  const currentW = Math.max(0, Math.min(255, w ?? 255));

  const hexColor = rgbToHex(currentR, currentG, currentB);
  const [inputValue, setInputValue] = useState(hexColor);

  useEffect(() => {
    setInputValue(hexColor);
  }, [hexColor]);

  // Dimmed color representing the actual LED output taking brightness into account
  const dimmedR = Math.round((currentR * currentW) / 255);
  const dimmedG = Math.round((currentG * currentW) / 255);
  const dimmedB = Math.round((currentB * currentW) / 255);
  const dimmedColorRgb = `rgb(${dimmedR}, ${dimmedG}, ${dimmedB})`;
  const brightnessPercent = Math.round((currentW / 255) * 100);

  const handleColorPickerChange = (newHex: string) => {
    const parsed = hexToRgb(newHex);
    if (parsed) {
      setInputValue(newHex);
      onChange({ r: parsed.r, g: parsed.g, b: parsed.b, w: currentW });
    }
  };

  const handleBrightnessChange = (newW: number) => {
    onChange({ r: currentR, g: currentG, b: currentB, w: newW });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.currentTarget.value;
    setInputValue(val);
    const parsed = hexToRgb(val);
    if (parsed) {
      onChange({ r: parsed.r, g: parsed.g, b: parsed.b, w: currentW });
    }
  };

  const handleInputBlur = () => {
    setInputValue(hexColor);
    setOpened(false);
  };

  return (
    <Input.Wrapper label={label} description={description} error={error}>
      <Popover
        position="bottom-start"
        offset={5}
        opened={opened && !disabled}
        onChange={setOpened}
        shadow="md"
      >
        <Popover.Target>
          <Input
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            disabled={disabled}
            value={inputValue}
            readOnly={disallowInput}
            pointer={disallowInput}
            onChange={handleInputChange}
            onClick={() => setOpened(true)}
            onFocus={() => setOpened(true)}
            onBlur={handleInputBlur}
            leftSection={
              <ColorSwatch
                color={dimmedColorRgb}
                size={18}
                style={{ cursor: disabled ? 'default' : 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) {
                    setOpened((o) => !o);
                  }
                }}
              />
            }
            rightSection={
              <Badge size="sm" variant="light" color="gray">
                {brightnessPercent}%
              </Badge>
            }
            rightSectionWidth={60}
          />
        </Popover.Target>

        <Popover.Dropdown onMouseDown={(e) => e.preventDefault()} w={240}>
          <ColorPicker
            format="hex"
            value={hexColor}
            onChange={handleColorPickerChange}
            focusable={false}
            fullWidth
          />
          <Space h="xs" />
          <Group justify="space-between" mb={4}>
            <Text size="xs" fw={500}>
              {t('leds.brightness')}
            </Text>
            <Text size="xs" c="dimmed">
              {brightnessPercent}%
            </Text>
          </Group>
          <Slider
            min={0}
            max={255}
            value={currentW}
            onChange={handleBrightnessChange}
            label={(val) => `${Math.round((val / 255) * 100)}%`}
            styles={{
              track: {
                backgroundImage: `linear-gradient(to right, #000000, ${hexColor})`,
              },
              bar: {
                backgroundColor: 'transparent',
              },
            }}
          />
        </Popover.Dropdown>
      </Popover>
    </Input.Wrapper>
  );
}
