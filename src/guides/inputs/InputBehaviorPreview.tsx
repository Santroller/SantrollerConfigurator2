import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Card,
  Group,
  InputBase,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  Text,
  Title,
} from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';

export type InputBehaviorKind = 'cycling' | 'toggle' | 'held';

const gpio = (pin: number): proto.IGPIOInput => ({
  pin,
  pinMode: proto.PinMode.PullUp,
  analog: false,
});

export const INPUT_BEHAVIOR_EXAMPLES = {
  cycling: {
    device: {
      deviceid: 1,
      cycle: { type: proto.CycleType.custom, values: [0, 32768, 65535] },
    } satisfies proto.IDevice,
    mapping: {
      input: {
        cycle: {
          deviceid: 1,
          input: { gpio: gpio(2) },
          inputReverse: { gpio: gpio(3) },
        },
      },
      mapping: { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickX },
    } satisfies proto.IMapping,
    state: 1,
  },
  toggle: {
    device: { deviceid: 2, toggle: {} } satisfies proto.IDevice,
    mapping: {
      input: { toggle: { deviceid: 2, input: { gpio: gpio(2) } } },
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
    } satisfies proto.IMapping,
    state: true,
  },
  held: {
    mapping: {
      input: { held: { time: 1000, input: { gpio: gpio(2) } } },
      mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
    } satisfies proto.IMapping,
  },
};

const K = 'guides.input-behavior.preview';

function GpioPreview({ input, title }: { input: proto.IGPIOInput; title: string }) {
  const { t } = useTranslation();
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          {title}
        </Text>
        <InputBase
          readOnly
          label={t('device')}
          value={`${t('devices.gpio')} ${t('devices.gpio_digital')}`}
        />
        <Group grow>
          <InputBase readOnly label={t('pin_label')} value={t('pin', { pin: input.pin })} />
          <Select
            readOnly
            label={t('gpio.mode.label')}
            value={String(input.pinMode)}
            data={[
              {
                value: String(input.pinMode),
                label: t(`gpio.mode.${proto.PinMode[input.pinMode]}`),
              },
            ]}
          />
        </Group>
      </Stack>
    </Card>
  );
}

function MappingPreview({
  device,
  output,
  children,
}: {
  device: string;
  output: { gamepadAxis: proto.GamepadAxisType } | { gamepadButton: proto.GamepadButtonType };
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const name =
    'gamepadAxis' in output
      ? proto.GamepadAxisType[output.gamepadAxis]
      : proto.GamepadButtonType[output.gamepadButton];
  return (
    <Card withBorder shadow="sm" padding="lg" radius="md">
      <Stack gap="sm">
        <Title order={4}>{t(`${K}.mappingTitle`)}</Title>
        <InputBase
          readOnly
          label={t('inputs.target_output')}
          value={t([`outputs.${name}`, `outputs.Xbox360.${name}`, `outputs.Generic.${name}`])}
        />
        <InputBase readOnly label={t('device')} value={device} />
        {children}
      </Stack>
    </Card>
  );
}

export function InputBehaviorPreview({ kind }: { kind: InputBehaviorKind }) {
  const { t } = useTranslation();
  const cycle = INPUT_BEHAVIOR_EXAMPLES.cycling;
  const toggle = INPUT_BEHAVIOR_EXAMPLES.toggle;
  const held = INPUT_BEHAVIOR_EXAMPLES.held;
  const cycleName = t('cycle.title', { id: cycle.device.deviceid });
  const toggleName = t(`${K}.toggleName`, { id: toggle.device.deviceid });
  return (
    <Stack gap="sm">
      <Group gap="xs">
        <Title order={4}>{t(`${K}.title`)}</Title>
        <Badge variant="light">{t(`${K}.badge`)}</Badge>
      </Group>
      <Text size="sm" c="dimmed">
        {t(`${K}.description`)}
      </Text>
      <SimpleGrid cols={{ base: 1, md: kind === 'held' ? 1 : 2 }}>
        {kind === 'cycling' && (
          <>
            <Card withBorder shadow="sm" padding="lg" radius="md">
              <Stack gap="sm">
                <Title order={4}>{t(`${K}.deviceTitle`)}</Title>
                <Text fw={600}>{cycleName}</Text>
                <Select
                  readOnly
                  label={t('cycle.type')}
                  value={String(cycle.device.cycle.type)}
                  data={[
                    { value: String(proto.CycleType.custom), label: t('cycle.label.custom') },
                    { value: String(proto.CycleType.pickup), label: t('cycle.label.pickup') },
                  ]}
                />
                <TagsInput
                  readOnly
                  label={t('cycle.enter_value')}
                  value={cycle.device.cycle.values.map(String)}
                />
                <SegmentedControl
                  readOnly
                  fullWidth
                  value={String(cycle.state)}
                  data={cycle.device.cycle.values.map((value, index) => ({
                    value: String(index),
                    label: String(value),
                  }))}
                />
              </Stack>
            </Card>
            <MappingPreview device={cycleName} output={cycle.mapping.mapping}>
              <Switch readOnly checked label={t('cycle.forward_input')} />
              <GpioPreview input={cycle.mapping.input.cycle.input.gpio} title={t(`${K}.forward`)} />
              <Switch readOnly checked label={t('cycle.reverse_input')} />
              <GpioPreview
                input={cycle.mapping.input.cycle.inputReverse.gpio}
                title={t(`${K}.reverse`)}
              />
            </MappingPreview>
          </>
        )}
        {kind === 'toggle' && (
          <>
            <Card withBorder shadow="sm" padding="lg" radius="md">
              <Stack gap="sm">
                <Title order={4}>{t(`${K}.deviceTitle`)}</Title>
                <Text fw={600}>{toggleName}</Text>
                <Switch readOnly checked={toggle.state} label={t('toggle.state')} />
              </Stack>
            </Card>
            <MappingPreview device={toggleName} output={toggle.mapping.mapping}>
              <Switch readOnly checked={toggle.state} label={t('toggle.state')} />
              <GpioPreview
                input={toggle.mapping.input.toggle.input.gpio}
                title={t(`${K}.source`)}
              />
            </MappingPreview>
          </>
        )}
        {kind === 'held' && (
          <MappingPreview device={t('devices.held')} output={held.mapping.mapping}>
            <NumberInput readOnly label={t('held.time')} value={held.mapping.input.held.time} />
            <GpioPreview input={held.mapping.input.held.input.gpio} title={t(`${K}.source`)} />
            <Text size="sm" c="dimmed">
              {t(`${K}.heldNote`)}
            </Text>
          </MappingPreview>
        )}
      </SimpleGrid>
      <Text size="sm" c="dimmed">
        {t(`${K}.pinsNote`)}
      </Text>
    </Stack>
  );
}
