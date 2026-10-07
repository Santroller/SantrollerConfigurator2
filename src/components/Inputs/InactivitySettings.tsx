import { NumberInput, Space, Switch } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PinBox } from '@/components/Devices/Pins';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { AllPinsNamed } from '@/devices/pico/pins';

// Timeouts for turning the LEDs off and putting the controller to sleep when it isn't used.
// These apply to the whole controller, not a single profile.
export function InactivitySettings({ ledOnly }: { ledOnly?: boolean }) {
  const { t } = useTranslation();
  const inactivity = useConfigStore((state) => state.config.inactivity);
  const updateConfig = useConfigStore((state) => state.updateConfig);
  const update = (changes: Partial<proto.IInactivityConfig>) =>
    updateConfig({ inactivity: { ...inactivity, ...changes } });

  const ledTimeout = (
    <NumberInput
      label={t('main.inactivity.led_timeout.label')}
      description={t('main.inactivity.led_timeout.description')}
      suffix=" s"
      min={0}
      value={inactivity?.ledTimeoutSec ?? 0}
      onChange={(val) => update({ ledTimeoutSec: Number(val) || 0 })}
    />
  );
  if (ledOnly) {
    return ledTimeout;
  }
  const canSleep = (inactivity?.wakePin ?? -1) >= 0;
  return (
    <>
      {ledTimeout}
      <Space h="md" />
      <PinBox
        label="main.inactivity.wake_pin"
        pin={inactivity?.wakePin ?? -1}
        valid={AllPinsNamed}
        dispatch={(wakePin) => update({ wakePin })}
      />
      {canSleep && (
        <>
          <Space h="xs" />
          <NumberInput
            label={t('main.inactivity.sleep_timeout.label')}
            description={t('main.inactivity.sleep_timeout.description')}
            suffix=" s"
            min={0}
            value={inactivity?.sleepTimeoutSec ?? 0}
            onChange={(val) => update({ sleepTimeoutSec: Number(val) || 0 })}
          />
          <Space h="xs" />
          <Switch
            label={t('main.inactivity.wake_active_high.label')}
            description={t('main.inactivity.wake_active_high.description')}
            checked={!!inactivity?.wakeActiveHigh}
            onChange={(event) => update({ wakeActiveHigh: event.currentTarget.checked })}
          />
        </>
      )}
    </>
  );
}
