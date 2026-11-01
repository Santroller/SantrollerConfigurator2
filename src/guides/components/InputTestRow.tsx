import React from 'react';
import { IconFocusCentered } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { Badge, Button, Group, Paper, Progress, Select, Stack, Text, Tooltip } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import {
  findMappingIndex,
  getTargetAnalogValue,
  getTargetPin,
  isTargetPressed,
  PinMappingTarget,
  setTargetPin,
} from '../guitar/guitarMappingUtils';

// GPIOs broken out on the Pico header: GP23-25 are internal and GP29 senses VSYS
const HEADER_PINS = [...Array.from({ length: 23 }, (_, i) => i), 26, 27, 28];
const HEADER_ANALOG_PINS = [26, 27, 28];

// The firmware only runs one pin detection at a time, so only the row that started the most
// recent probe may take the detected pin
const useActiveProbe = create<{ id: string | null }>(() => ({ id: null }));

export interface InputTestRowProps {
  label: string;
  target: PinMappingTarget;
  color?: string;
  recommendedPin?: number;
  isAnalog?: boolean;
}

export function InputTestRow({
  label,
  target,
  color = 'blue',
  recommendedPin,
  isAnalog = false,
}: InputTestRowProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const detecting = useConfigStore((state) => state.detecting);
  const detected = useConfigStore((state) => state.detected);
  const detectPins = useConfigStore((state) => state.detectPins);

  const isPressed = useConfigStore((state) => isTargetPressed(state, target));
  const analogValue = useConfigStore((state) =>
    isAnalog ? getTargetAnalogValue(state, target) : 0
  );
  const currentPin = useConfigStore((state) => getTargetPin(state, target));

  const probeId = React.useId();
  const isActiveProbe = useActiveProbe((s) => s.id === probeId);
  const isProbingThis = isActiveProbe && detecting;

  // Once detection ends, take the pin if one was found, and disarm either way (a config save
  // also cuts detection short)
  React.useEffect(() => {
    if (!isActiveProbe || detecting) {
      return;
    }
    useActiveProbe.setState({ id: null });
    if (detected !== undefined && detected >= 0) {
      setTargetPin(target, detected, isAnalog);
    }
  }, [isActiveProbe, detecting, detected, target, isAnalog]);

  React.useEffect(
    () => () => {
      if (useActiveProbe.getState().id === probeId) {
        useActiveProbe.setState({ id: null });
      }
    },
    [probeId]
  );

  const handleStartProbe = () => {
    const store = useConfigStore.getState();
    const profile = store.config.profiles?.[store.currentProfile];
    const mappingIdx = findMappingIndex(profile, target);

    // Start detection first so this row never sees itself armed with detection still off
    detectPins(
      undefined,
      mappingIdx >= 0 ? mappingIdx : undefined,
      undefined,
      undefined,
      isAnalog ? proto.PinDetectType.DetectAnalog : proto.PinDetectType.DetectDigital
    );
    if (useConfigStore.getState().detecting) {
      useActiveProbe.setState({ id: probeId });
    }
  };

  const pinOptions = (isAnalog ? HEADER_ANALOG_PINS : HEADER_PINS).map((p) => ({
    value: String(p),
    label: `GP${p}${isAnalog ? ` (ADC${p - 26})` : ''}`,
  }));

  const isRecommendedMatched = recommendedPin !== undefined && currentPin === recommendedPin;

  return (
    <Paper
      withBorder
      p="xs"
      radius="sm"
      style={{
        backgroundColor: isPressed
          ? 'var(--mantine-color-default-hover)'
          : 'var(--mantine-color-body)',
        borderColor: isPressed ? `var(--mantine-color-${color}-filled)` : undefined,
        transition: 'border-color 0.1s ease, background-color 0.1s ease',
      }}
    >
      <Stack gap={6}>
        {/* The name gets a line of its own, so it's never squeezed by the pin picker */}
        <Group gap="xs" wrap="nowrap" align="center">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: isPressed
                ? `var(--mantine-color-${color}-filled, var(--mantine-color-blue-filled))`
                : 'var(--mantine-color-default-border)',
              flexShrink: 0,
              transition: 'background-color 0.1s ease',
            }}
          />
          <Text fw={500} size="sm">
            {label}
          </Text>
          {recommendedPin !== undefined && (
            <Badge
              size="xs"
              variant={isRecommendedMatched ? 'filled' : 'subtle'}
              color={isRecommendedMatched ? 'teal' : 'gray'}
              style={{ fontFamily: 'monospace', flexShrink: 0 }}
            >
              GP{recommendedPin}
            </Badge>
          )}
        </Group>

        <Group justify="space-between" wrap="wrap" align="center" gap="xs">
          {/* Lines up under the name, past the status dot */}
          <Text size="xs" c={isPressed ? 'blue' : 'dimmed'} pl={20}>
            {isPressed
              ? t('guides.activePressed')
              : currentPin >= 0
                ? t('guides.assignedTo', { pin: currentPin })
                : t('guides.unassigned')}
          </Text>

          <Group gap={6} wrap="nowrap" ml="auto">
            <Select
              size="xs"
              // Fits the placeholder and the longest label (GP28 (ADC2)) beside the chevron
              w={130}
              placeholder={t('guides.selectPin')}
              data={pinOptions}
              value={currentPin >= 0 ? String(currentPin) : null}
              styles={{
                input: { fontFamily: 'monospace', fontSize: 12 },
              }}
              onChange={(val) => {
                if (val !== null) {
                  setTargetPin(target, Number(val), isAnalog);
                }
              }}
            />

            <Tooltip label={t('guides.probeTooltip')}>
              <Button
                size="xs"
                variant={isProbingThis ? 'filled' : 'default'}
                color={isProbingThis ? 'red' : undefined}
                disabled={!connected}
                loading={isProbingThis}
                onClick={handleStartProbe}
                leftSection={<IconFocusCentered size={13} />}
                px={8}
              >
                {isProbingThis ? t('guides.pressNow') : t('guides.probe')}
              </Button>
            </Tooltip>
          </Group>
        </Group>

        {isAnalog && (
          <Stack gap={2} mt={2}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                {t('guides.liveAnalogValue')}
              </Text>
              <Text size="xs" style={{ fontFamily: 'monospace' }}>
                {analogValue} / 65535
              </Text>
            </Group>
            <Progress value={(analogValue / 65535) * 100} color={color} size="xs" radius="sm" />
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
