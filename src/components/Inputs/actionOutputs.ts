import { proto } from '@/components/SettingsContext/config';
import { getSlotSubtype, ProfileSlot } from './inputRegistry';

// Outputs that do something on the device instead of sending an input: the built in actions, and
// turning off the controller in a USB or bluetooth slot
export type ActionOption = { value: string; label: string; output: proto.IOutput };

type Translate = (key: string, options?: Record<string, unknown>) => string;

const TURN_OFF = 'TurnOffController';

export function isActionOutput(output: proto.IOutput | null | undefined): boolean {
  return output?.action != null || output?.turnOffController != null;
}

// The slot a turn off output points at, as a slot key (kind and id)
function turnOffSlot(output: proto.ITurnOffControllerOutput) {
  return output.usb != null
    ? { kind: 'usbHost', slotId: output.usb }
    : { kind: 'bt', slotId: output.bluetooth ?? 0 };
}

// Identifies an action output, so it can be found among the options
export function actionOutputValue(output: proto.IOutput | null | undefined): string | undefined {
  if (output?.action != null) {
    return proto.ActionType[output.action];
  }
  if (output?.turnOffController) {
    const { kind, slotId } = turnOffSlot(output.turnOffController);
    return `${TURN_OFF}:${kind}:${slotId}`;
  }
  return undefined;
}

// Wireless controllers only come in through these, and a keyboard or MIDI device has nothing to turn off
function canTurnOff(slot: ProfileSlot) {
  if (slot.deviceKind !== 'usbHost' && slot.deviceKind !== 'bt') {
    return false;
  }
  return !slot.items.every((item) =>
    [proto.SubType.KeyboardMouse, proto.SubType.Midi].includes(getSlotSubtype(item))
  );
}

function turnOffLabel(slotLabel: string, t: Translate) {
  return t('outputs.TurnOffController', { slot: slotLabel, defaultValue: 'Turn off {{slot}}' });
}

export function getActionOptions(slots: ProfileSlot[], t: Translate): ActionOption[] {
  const actions = Object.entries(proto.ActionType)
    .filter(([, v]) => typeof v === 'number')
    .map(([name, v]) => ({
      value: name,
      label: t(`outputs.${name}`, { defaultValue: name }),
      output: { action: v as proto.ActionType },
    }));
  const turnOff = slots.filter(canTurnOff).map((slot) => {
    const output: proto.IOutput = {
      turnOffController:
        slot.deviceKind === 'bt' ? { bluetooth: slot.slotId } : { usb: slot.slotId },
    };
    return { value: actionOutputValue(output)!, label: turnOffLabel(slot.label, t), output };
  });
  return [...actions, ...turnOff];
}

// The label for an action output, including one for a slot the profile no longer has
export function actionOutputLabel(
  output: proto.IOutput,
  slots: ProfileSlot[],
  t: Translate
): string | undefined {
  const value = actionOutputValue(output);
  if (!value) {
    return undefined;
  }
  const option = getActionOptions(slots, t).find((x) => x.value === value);
  if (option) {
    return option.label;
  }
  if (output.turnOffController) {
    const { slotId } = turnOffSlot(output.turnOffController);
    return turnOffLabel(`${t('assignments.slot')} ${slotId}`, t);
  }
  return value;
}

// How long an action's input has to be held by default, so a stray press can't trigger it
export function actionHoldMs(output: proto.IOutput): number {
  switch (output.action) {
    case proto.ActionType.ActionRestartDeviceStack:
      return 1000;
    case proto.ActionType.ActionBootloader:
      return 3000;
  }
  // About as long as a controller's own guide button hold to turn it off
  return 2000;
}
