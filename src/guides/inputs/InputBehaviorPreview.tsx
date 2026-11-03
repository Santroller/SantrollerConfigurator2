import { ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createStore } from 'zustand/vanilla';
import { Badge, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import {
  ActivationStatus,
  ConfigStoreContext,
  DeviceStatus,
  initialConfig,
  MappingStatus,
} from '@/components/SettingsContext/SettingsContext';
import { CycleDevice, ToggleDevice } from '@/pages/Devices.page';
import {
  ExpandAllAccordionsContext,
  LegendMode,
  SantrollerAssignment,
  SantrollerMapping,
} from '@/pages/Inputs.page';

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
      cycle: { type: proto.CycleType.slots, values: [0, 1, 2] },
    } satisfies proto.IDevice,
    slotNames: ['Guitar Hero Guitar', 'Rock Band Guitar', 'Fortnite Festival'],
    // An assignment rule: the cycling input is the source, and it is active while on slot 1
    assignment: {
      inputAnyTime: {
        input: {
          cycle: {
            deviceid: 1,
            input: { gpio: gpio(2) },
            inputReverse: { gpio: gpio(3) },
          },
        },
        trigger: proto.AnalogToDigitalTriggerType.Exact,
        triggerValue: 1,
      },
    } satisfies proto.IProfileAssignmentInfo,
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

const noop = () => {};

type DemoStoreState = typeof initialConfig;

// The demos render the real editors against this store, so they can't drift from the app and
// never touch the connected controller
function createDemoStore() {
  const cycle = INPUT_BEHAVIOR_EXAMPLES.cycling;
  const toggle = INPUT_BEHAVIOR_EXAMPLES.toggle;
  const cycleStatus = new DeviceStatus('1', 'cycle', cycle.device);
  cycleStatus.cycleState = cycle.state;
  const toggleStatus = new DeviceStatus('2', 'toggle', toggle.device);
  toggleStatus.toggleState = toggle.state;
  const activation = new ActivationStatus(0, cycle.assignment);
  activation.stateRaw = cycle.state;
  const guiDevices: DemoStoreState['guiDevices'] = {};
  cycle.slotNames.forEach((label, slot) => {
    guiDevices[slot + 1] = {
      deviceid: slot + 1,
      cycleSlotLabel: { label, deviceid: 1, slot, showToCustomer: true },
    };
  });
  const state: DemoStoreState = {
    ...initialConfig,
    deviceStatus: { 1: cycleStatus, 2: toggleStatus },
    guiDevices,
    mappingStatus: [{ 0: new MappingStatus(0, toggle.mapping) }],
    activationStatus: [{ 0: [activation] }],
  };
  return createStore(() => state);
}

function DemoStore({ children }: { children: ReactNode }) {
  const store = useMemo(createDemoStore, []);
  return (
    <ConfigStoreContext.Provider value={store as never}>
      <ExpandAllAccordionsContext.Provider value>
        {/* inert, so the real editors can't be used to change anything */}
        <div {...{ inert: true }}>{children}</div>
      </ExpandAllAccordionsContext.Provider>
    </ConfigStoreContext.Provider>
  );
}

const demoProps = {
  profileIdx: 0,
  mode: proto.FaceButtonMappingMode.LegendBased,
  type: proto.SubType.Gamepad,
  legendMode: LegendMode.Xbox360,
};

export function InputBehaviorPreview({ kind }: { kind: InputBehaviorKind }) {
  const { t } = useTranslation();
  const cycle = INPUT_BEHAVIOR_EXAMPLES.cycling;
  const toggle = INPUT_BEHAVIOR_EXAMPLES.toggle;
  const held = INPUT_BEHAVIOR_EXAMPLES.held;
  const mappingProps = {
    ...demoProps,
    mappingIdx: 0,
    dispatch: noop,
    deleteInput: noop,
    copyInput: noop,
    expanded: true,
    onToggleExpanded: noop,
  };
  return (
    <Stack gap="sm">
      <Group gap="xs">
        <Title order={4}>{t(`${K}.title`)}</Title>
        <Badge variant="light">{t(`${K}.badge`)}</Badge>
      </Group>
      <Text size="sm" c="dimmed">
        {t(`${K}.description`)}
      </Text>
      <DemoStore>
        <SimpleGrid cols={{ base: 1, md: kind === 'held' ? 1 : 2 }}>
          {kind === 'cycling' && (
            <>
              <CycleDevice id="1" />
              <SantrollerAssignment
                {...demoProps}
                mapping={cycle.assignment}
                listIdx={0}
                activationIdx={0}
                dispatch={noop}
                deleteAssignment={noop}
                copyAssignment={noop}
              />
            </>
          )}
          {kind === 'toggle' && (
            <>
              <ToggleDevice id="2" />
              <SantrollerMapping {...mappingProps} mapping={toggle.mapping} />
            </>
          )}
          {kind === 'held' && <SantrollerMapping {...mappingProps} mapping={held.mapping} />}
        </SimpleGrid>
      </DemoStore>
      {kind === 'held' && (
        <Text size="sm" c="dimmed">
          {t(`${K}.heldNote`)}
        </Text>
      )}
      <Text size="sm" c="dimmed">
        {t(`${K}.pinsNote`)}
      </Text>
    </Stack>
  );
}
