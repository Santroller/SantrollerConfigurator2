import React from 'react';
import { IconFocusCentered } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Group, Paper, Progress, Select, Stack, Text, Tooltip } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { AllPins, AnalogPins } from '@/devices/pico/pins';
import {
  findMappingIndex,
  getTargetAnalogValue,
  getTargetPin,
  isTargetPressed,
  PinMappingTarget,
  setTargetPin,
} from '../guitar/guitarMappingUtils';

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

  const [isProbingThis, setIsProbingThis] = React.useState(false);

  // If we were probing this input and a pin was detected, set it!
  React.useEffect(() => {
    if (isProbingThis && !detecting && detected !== undefined && detected >= 0) {
      setTargetPin(target, detected, isAnalog);
      setIsProbingThis(false);
    }
  }, [isProbingThis, detecting, detected, target, isAnalog]);

  const handleStartProbe = () => {
    const store = useConfigStore.getState();
    const profile = store.config.profiles?.[store.currentProfile];
    const mappingIdx = findMappingIndex(profile, target);

    setIsProbingThis(true);
    detectPins(
      undefined,
      mappingIdx >= 0 ? mappingIdx : undefined,
      undefined,
      undefined,
      isAnalog ? proto.PinDetectType.DetectAnalog : proto.PinDetectType.DetectDigital
    );
  };

  const pinOptions = (isAnalog ? AnalogPins : AllPins).map((p) => ({
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
        <Group justify="space-between" wrap="nowrap" align="center">
          <Group gap="xs" wrap="nowrap">
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

            <div>
              <Group gap={6} align="center">
                <Text fw={500} size="sm">
                  {label}
                </Text>
                {recommendedPin !== undefined && (
                  <Badge
                    size="xs"
                    variant={isRecommendedMatched ? 'filled' : 'subtle'}
                    color={isRecommendedMatched ? 'teal' : 'gray'}
                    style={{ fontFamily: 'monospace' }}
                  >
                    GP{recommendedPin}
                  </Badge>
                )}
              </Group>

              <Text size="xs" c={isPressed ? 'blue' : 'dimmed'}>
                {isPressed
                  ? t('guides.activePressed')
                  : currentPin >= 0
                    ? t('guides.assignedTo', { pin: currentPin })
                    : t('guides.unassigned')}
              </Text>
            </div>
          </Group>

          <Group gap={6} wrap="nowrap">
            <Select
              size="xs"
              w={105}
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
                variant={isProbingThis && detecting ? 'filled' : 'default'}
                color={isProbingThis && detecting ? 'red' : undefined}
                disabled={!connected}
                loading={isProbingThis && detecting}
                onClick={handleStartProbe}
                leftSection={<IconFocusCentered size={13} />}
                px={8}
              >
                {isProbingThis && detecting ? t('guides.pressNow') : t('guides.probe')}
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
