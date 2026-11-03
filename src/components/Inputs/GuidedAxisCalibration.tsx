import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Group, Modal, Progress, Stack, Stepper, Switch, Text } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { calibratesAsTrigger } from '@/components/SettingsContext/triggerDeadzone';

export function GuidedAxisCalibration({
  mapping,
  profileIdx,
  mappingIdx,
  dispatch,
}: {
  mapping: proto.IMapping;
  profileIdx: number;
  mappingIdx: number;
  dispatch: (mapping: proto.IMapping) => void;
}) {
  const { t } = useTranslation();
  const raw = useConfigStore((state) => state.mappingStatus[profileIdx]?.[mappingIdx]?.stateRaw);
  const connected = useConfigStore((state) => state.connected);
  const trigger = calibratesAsTrigger(mapping);
  const output = mapping.mapping;
  const triggerKind =
    output.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy ||
    output.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Whammy ||
    output.ghlAxis === proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Whammy
      ? 'whammy'
      : output.gamepadAxis === proto.GamepadAxisType.Gamepad_LeftTrigger ||
          output.gamepadAxis === proto.GamepadAxisType.Gamepad_RightTrigger
        ? 'trigger'
        : output.wheelAxis === proto.WheelAxisType.Wheel_Accelerator ||
            output.wheelAxis === proto.WheelAxisType.Wheel_Brake ||
            output.wheelAxis === proto.WheelAxisType.Wheel_Clutch ||
            output.proKeyboardAxis === proto.ProKeyboardAxisType.ProKeyboardPedal
          ? 'pedal'
          : undefined;
  const axisKind =
    output.gamepadAxis === proto.GamepadAxisType.Gamepad_LeftStickX ||
    output.gamepadAxis === proto.GamepadAxisType.Gamepad_RightStickX
      ? 'stickX'
      : output.gamepadAxis === proto.GamepadAxisType.Gamepad_LeftStickY ||
          output.gamepadAxis === proto.GamepadAxisType.Gamepad_RightStickY
        ? 'stickY'
        : output.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt ||
            output.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Tilt ||
            output.ghlAxis === proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Tilt ||
            output.proAxis === proto.ProGuitarAxisType.ProGuitar_Tilt
          ? 'tilt'
          : output.wheelAxis === proto.WheelAxisType.Wheel_Steering
            ? 'steering'
            : output.djhAxis === proto.DJHTurntableAxisType.DJHTurntable_Crossfader
              ? 'crossfader'
              : undefined;
  const stepKey = (name: string, field: string) =>
    trigger && triggerKind && field === 'description' && (name === 'released' || name === 'pressed')
      ? `calibration.guided.triggers.${triggerKind}.${name}`
      : !trigger && axisKind && (name === 'low' || name === 'high' || name === 'neutral')
        ? `calibration.guided.axes.${axisKind}.${name}.${field}`
        : `calibration.guided.${name}.${field}`;
  const lowLabel = t(trigger ? 'calibration.released' : stepKey('low', 'label'));
  const highLabel = t(trigger ? 'calibration.pressed' : stepKey('high', 'label'));
  const firstStep = trigger ? 'released' : 'low';
  const [step, setStep] = useState<
    'idle' | 'released' | 'pressed' | 'low' | 'high' | 'neutral' | 'review'
  >('idle');
  const [released, setReleased] = useState<number | undefined>();
  const [pressed, setPressed] = useState<number | undefined>();
  const [measuring, setMeasuring] = useState(false);
  const [measurementInterrupted, setMeasurementInterrupted] = useState(false);
  const [noise, setNoise] = useState<{ min: number; max: number }>();
  const noiseSamples = useRef<{ min: number; max: number } | undefined>(undefined);
  const [compensateNoise, setCompensateNoise] = useState(true);
  const available = connected && raw != null && Number.isInteger(raw) && raw >= 0 && raw <= 65535;
  const center = noise ? Math.round((noise.min + noise.max) / 2) : undefined;
  // Stick calibration uses a strict deadzone comparison, so include the measured edges.
  const deadzone =
    noise && center != null ? Math.max(center - noise.min, noise.max - center) + 1 : 0;
  const hasTravel = trigger
    ? pressed != null && noise != null && (pressed < noise.min || pressed > noise.max)
    : released != null &&
      pressed != null &&
      center != null &&
      center - deadzone > Math.min(released, pressed) &&
      center + deadzone < Math.max(released, pressed);
  const releasedEndpoint =
    trigger && compensateNoise && hasTravel && noise && pressed != null
      ? pressed > noise.max
        ? noise.max
        : noise.min
      : released;
  let preview: number | undefined;
  if (available && hasTravel && releasedEndpoint != null && pressed != null) {
    const scale = (value: number, start: number, end: number, low: number, high: number) =>
      low + ((value - start) * (high - low)) / (end - start);
    if (trigger) {
      preview = scale(raw, releasedEndpoint, pressed, 0, 65535);
    } else if (center != null && released != null) {
      const margin = compensateNoise ? deadzone : 0;
      const inverted = released > pressed;
      if (Math.abs(raw - center) < margin) {
        preview = 32767;
      } else if (raw < center) {
        preview = inverted
          ? scale(raw, center - margin, pressed, 32767, 65535)
          : scale(raw, released, center - margin, 0, 32767);
      } else {
        preview = inverted
          ? scale(raw, released, center + margin, 0, 32767)
          : scale(raw, center + margin, pressed, 32767, 65535);
      }
    }
    if (preview != null) {
      preview = Math.trunc(Math.max(0, Math.min(65535, preview)));
      const section = mapping.section ?? proto.AxisSection.AxisSectionFull;
      if (section !== proto.AxisSection.AxisSectionFull) {
        const start =
          section === proto.AxisSection.AxisSectionCustom ? (mapping.sectionStart ?? 0) : 32767;
        const end =
          section === proto.AxisSection.AxisSectionCustom
            ? (mapping.sectionEnd ?? 65535)
            : section === proto.AxisSection.AxisSectionNegative
              ? 0
              : 65535;
        preview = start + Math.trunc(((end - start) * preview) / 65535);
      }
    }
  }
  const displayedValue = step === 'review' ? preview : available ? raw : undefined;

  useEffect(() => {
    if (!measuring) {
      return;
    }
    if (!available) {
      noiseSamples.current = undefined;
      setMeasuring(false);
      setReleased(undefined);
      setMeasurementInterrupted(true);
      return;
    }
    const samples = noiseSamples.current;
    if (samples) {
      samples.min = Math.min(samples.min, raw);
      samples.max = Math.max(samples.max, raw);
    }
  }, [measuring, available, raw]);

  useEffect(() => {
    if (!measuring) {
      return;
    }
    const timer = setTimeout(() => {
      const samples = noiseSamples.current;
      if (samples) {
        setNoise({ ...samples });
        setStep(trigger ? 'pressed' : 'review');
      } else {
        setMeasurementInterrupted(true);
      }
      setMeasuring(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [measuring, trigger]);

  const reset = () => {
    setMeasuring(false);
    setMeasurementInterrupted(false);
    noiseSamples.current = undefined;
    setNoise(undefined);
    setCompensateNoise(true);
    setReleased(undefined);
    setPressed(undefined);
    setStep('idle');
  };

  return (
    <>
      <Button variant="light" onClick={() => setStep(firstStep)}>
        {t('calibration.guided.start')}
      </Button>
      <Modal
        opened={step !== 'idle'}
        onClose={reset}
        title={t('calibration.guided.start')}
        size="lg"
        closeButtonProps={{ 'aria-label': t('common.cancel') }}
        centered
      >
        {step !== 'idle' && (
          <Stack gap="md">
            <Stepper
              active={
                step === 'released' || step === 'low'
                  ? 0
                  : step === 'pressed' || step === 'high'
                    ? 1
                    : step === 'neutral'
                      ? 2
                      : trigger
                        ? 2
                        : 3
              }
              size="sm"
              allowNextStepsSelect={false}
            >
              <Stepper.Step label={lowLabel} />
              <Stepper.Step label={highLabel} />
              {!trigger && <Stepper.Step label={t('calibration.center')} />}
              <Stepper.Step label={t('calibration.guided.review.label')} />
            </Stepper>
            {displayedValue != null && (
              <div>
                <Text size="sm" fw={700} mb={3}>
                  {t(step === 'review' ? 'calibration.value' : 'calibration.rawValue')}
                </Text>
                <Progress.Root size={40} transitionDuration={0}>
                  <Progress.Section value={(displayedValue / 65535) * 100} />
                  <Progress.Label
                    w="100%"
                    h="100%"
                    style={{ position: 'absolute', display: 'grid', placeItems: 'center' }}
                  >
                    {displayedValue}
                  </Progress.Label>
                </Progress.Root>
              </div>
            )}
            <Stack gap="sm">
              <Text fw={700}>{t(stepKey(step, 'title'))}</Text>
              <Text size="sm">{t(stepKey(step, 'description'))}</Text>
              {!available && <Alert color="yellow">{t('calibration.guided.unavailable')}</Alert>}
              {measurementInterrupted && (
                <Alert color="yellow">{t('calibration.guided.noise.interrupted')}</Alert>
              )}
              {step === 'review' && (
                <>
                  {noise && (
                    <>
                      <Text size="sm">
                        {`${t('calibration.guided.noise.range')}: ${noise.min} - ${noise.max} (${noise.max - noise.min})`}
                      </Text>
                      <Switch
                        label={t('calibration.guided.noise.compensate')}
                        description={t(
                          trigger
                            ? 'calibration.guided.noise.description'
                            : 'calibration.guided.neutral.compensation'
                        )}
                        checked={compensateNoise}
                        onChange={(event) => setCompensateNoise(event.currentTarget.checked)}
                      />
                    </>
                  )}
                  <Text size="sm">
                    {lowLabel}: {trigger ? releasedEndpoint : released}
                  </Text>
                  <Text size="sm">
                    {highLabel}: {pressed}
                  </Text>
                  {!trigger && (
                    <>
                      <Text size="sm">
                        {t('calibration.center')}: {center}
                      </Text>
                      <Text size="sm">
                        {t('calibration.deadzone')}: {compensateNoise ? deadzone : 0}
                      </Text>
                    </>
                  )}
                  {!hasTravel && (
                    <Alert color="red">
                      {t(
                        trigger
                          ? 'calibration.guided.noise.noTravel'
                          : 'calibration.guided.neutral.invalid'
                      )}
                    </Alert>
                  )}
                </>
              )}
              <Group>
                {step !== 'review' ? (
                  <Button
                    disabled={!available || measuring}
                    loading={measuring}
                    onClick={() => {
                      if (!available || measuring) {
                        return;
                      }
                      if (step === 'released' || step === 'neutral') {
                        if (step === 'released') {
                          setReleased(raw);
                        }
                        setNoise(undefined);
                        noiseSamples.current = { min: raw, max: raw };
                        setMeasurementInterrupted(false);
                        setMeasuring(true);
                      } else if (step === 'low') {
                        setReleased(raw);
                        setStep('high');
                      } else if (step === 'high') {
                        setPressed(raw);
                        setStep('neutral');
                      } else {
                        setPressed(raw);
                        setStep('review');
                      }
                    }}
                  >
                    {t(measuring ? 'calibration.guided.noise.measuring' : stepKey(step, 'capture'))}
                  </Button>
                ) : (
                  <>
                    <Button
                      disabled={!available || releasedEndpoint == null || !hasTravel}
                      onClick={() => {
                        if (
                          !available ||
                          releasedEndpoint == null ||
                          pressed == null ||
                          !hasTravel
                        ) {
                          return;
                        }
                        dispatch({
                          ...mapping,
                          min: trigger ? releasedEndpoint : released,
                          max: pressed,
                          ...(!trigger ? { center, deadzone: compensateNoise ? deadzone : 0 } : {}),
                        });
                        reset();
                      }}
                    >
                      {t('calibration.guided.apply')}
                    </Button>
                    <Button
                      variant="light"
                      onClick={() => {
                        reset();
                        setStep(firstStep);
                      }}
                    >
                      {t('calibration.guided.restart')}
                    </Button>
                  </>
                )}
                <Button variant="subtle" onClick={reset}>
                  {t('common.cancel')}
                </Button>
              </Group>
            </Stack>
          </Stack>
        )}
      </Modal>
    </>
  );
}
