import i18next from 'i18next';
import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';

// Guides wire every pin they set up through a single input device, so its calibration can sync across
// profiles and it can be named by its pin's label. These look through that (and drum kit pads) to the
// input that's actually wired up, and keep one device per pin.

// The input a mapping's input reads: itself, or what the device it's on holds
export function wiredInput(
  state: Pick<ConfigState, 'deviceStatus'>,
  input: proto.IInput | null | undefined
): proto.IInput | undefined {
  if (input?.singleInput) {
    return state.deviceStatus[input.singleInput.deviceid]?.device.singleInput?.input ?? undefined;
  }
  if (input?.drumKit) {
    const { deviceid, pad } = input.drumKit;
    return (
      state.deviceStatus[deviceid]?.device.drumKit?.pads?.find((p) => p.id === pad)?.input ??
      undefined
    );
  }
  return input ?? undefined;
}

export function wiredGpio(
  state: Pick<ConfigState, 'deviceStatus'>,
  input: proto.IInput | null | undefined
): proto.IGPIOInput | undefined {
  return wiredInput(state, input)?.gpio ?? undefined;
}

// A pin as guides wire it: analog pins float, digital ones are pulled up so a switch to ground presses them
export function guidePin(pin: number, analog: boolean): proto.IGPIOInput {
  return { pin, analog, pinMode: analog ? proto.PinMode.Floating : proto.PinMode.PullUp };
}

function singleInputOn(state: ConfigState, pin: number) {
  return Object.values(state.deviceStatus).find(
    (status) => status.device.singleInput?.input?.gpio?.pin === pin
  );
}

function sameGpio(a: proto.IGPIOInput | null | undefined, b: proto.IGPIOInput) {
  return a?.pin === b.pin && !!a.analog === !!b.analog && a.pinMode === b.pinMode;
}

/**
 * The input for a pin, on a single input device: the one already on that pin, or the one current (what the
 * input being replaced is on) moved to it, as rewiring a target moves its wire in every profile. Otherwise a
 * new one. An unpicked pin (-1) isn't put on a device.
 */
export function singleInputFor(
  gpio: proto.IGPIOInput,
  current?: proto.IInput | null
): proto.IInput {
  if (gpio.pin < 0) {
    return { gpio };
  }
  const store = useConfigStore.getState();
  const update = (id: string, device: proto.IDevice) => {
    if (!sameGpio(device.singleInput?.input?.gpio, gpio)) {
      store.updateDevice({ deviceid: device.deviceid, singleInput: { input: { gpio } } }, id);
    }
    return { singleInput: { deviceid: device.deviceid } };
  };
  const existing = singleInputOn(store, gpio.pin);
  if (existing) {
    return update(existing.id, existing.device);
  }
  const moving = current?.singleInput && store.deviceStatus[current.singleInput.deviceid];
  if (moving?.device.singleInput) {
    return update(moving.id, moving.device);
  }
  const id = store.addDevice('singleInput', undefined, (device) => {
    device.singleInput = { input: { gpio } };
  });
  return { singleInput: { deviceid: Number(id) } };
}

// The single input devices input is on, including inside inputs that wrap others
export function singleInputIds(input: proto.IInput | null | undefined): number[] {
  if (!input) {
    return [];
  }
  return [
    ...(input.singleInput ? [input.singleInput.deviceid] : []),
    ...(input.shortcut?.inputs ?? []).flatMap(singleInputIds),
    ...singleInputIds(input.held?.input),
    ...singleInputIds(input.toggle?.input),
    ...singleInputIds(input.cycle?.input),
    ...singleInputIds(input.cycle?.inputReverse),
    ...singleInputIds(input.shifted?.input),
    ...singleInputIds(input.shifted?.shift),
  ];
}

function profileSingleInputIds(profile: proto.IProfile): number[] {
  return [
    ...(profile.mappings ?? []).flatMap((mapping) => singleInputIds(mapping.input)),
    ...(profile.leds ?? []).flatMap((led) => singleInputIds(led.mapping?.inputMapping?.input)),
    ...(profile.assignments ?? []).flatMap((list) =>
      (list.assignments ?? []).flatMap((assignment) => [
        ...singleInputIds(assignment.input?.input),
        ...singleInputIds(assignment.inputAnyTime?.input),
      ])
    ),
    ...(profile.standbyWake ?? []).flatMap((wake) => singleInputIds(wake.input)),
  ];
}

// Removes those of these single input devices nothing uses any more, eg after a guide moved a target to a
// pin another device was already on
export function releaseSingleInputs(ids: number[]) {
  const store = useConfigStore.getState();
  const used = new Set((store.config.profiles ?? []).flatMap(profileSingleInputIds));
  for (const id of new Set(ids)) {
    if (!used.has(id) && store.deviceStatus[id]?.device.singleInput) {
      store.deleteDevice(`${id}`);
    }
  }
}

// The enums naming each kind of output guides wire
const OUTPUT_ENUMS: Partial<Record<keyof proto.IOutput, Record<number, string>>> = {
  gamepadButton: proto.GamepadButtonType,
  gamepadAxis: proto.GamepadAxisType,
  ghButton: proto.GuitarHeroGuitarButtonType,
  ghAxis: proto.GuitarHeroGuitarAxisType,
  rbButton: proto.RockBandGuitarButtonType,
  rbAxis: proto.RockBandGuitarAxisType,
  djhButton: proto.DJHTurntableButtonType,
  djhAxis: proto.DJHTurntableAxisType,
};

/**
 * What an output is called, as its mapping is: guitars strum on the D-pad, and other gamepad buttons go by
 * their Xbox 360 names.
 */
export function outputName(output: proto.IOutput, subType?: proto.SubType | null): string {
  const field = (Object.keys(OUTPUT_ENUMS) as (keyof proto.IOutput)[]).find(
    (key) => output[key] != null
  );
  const name = field ? OUTPUT_ENUMS[field]![output[field] as number] : undefined;
  if (!name) {
    return '';
  }
  const guitar =
    subType === proto.SubType.GuitarHeroGuitar || subType === proto.SubType.RockBandGuitar;
  if (guitar && (name === 'Gamepad_DpadUp' || name === 'Gamepad_DpadDown')) {
    return i18next.t(`outputs.GuitarHeroGuitar_Strum${name === 'Gamepad_DpadUp' ? 'Up' : 'Down'}`);
  }
  if (field === 'gamepadButton' && i18next.exists(`outputs.Xbox360.${name}`)) {
    return i18next.t(`outputs.Xbox360.${name}`);
  }
  if (field === 'gamepadButton' || field === 'gamepadAxis') {
    return i18next.t(`outputs.Generic.${name}`, name);
  }
  return i18next.t(`outputs.${name}`, name);
}

// Whether anything is still wired to pin: a single input device on it, or a mapping straight on it
function pinInUse(pin: number) {
  const store = useConfigStore.getState();
  return (
    !!singleInputOn(store, pin) ||
    (store.config.profiles ?? []).some((profile) =>
      (profile.mappings ?? []).some((mapping) => mapping.input?.gpio?.pin === pin)
    )
  );
}

/**
 * Names the pin a guide wired, in every profile, unless it already has a name (which may be the user's own).
 * A target moved off fromPin takes its name along when nothing is left there, and a name the guide gave the
 * old pin goes with it either way.
 */
export function labelPin(pin: number, name: string, fromPin?: number) {
  if (pin < 0 || !name) {
    return;
  }
  const store = useConfigStore.getState();
  const labels = Object.values(store.guiDevices);
  const labelled = (p: number) => labels.find((l) => l.label?.pin === p);
  const old = fromPin != null && fromPin >= 0 && fromPin !== pin ? labelled(fromPin) : undefined;
  if (old && !pinInUse(fromPin!)) {
    if (!labelled(pin)) {
      store.updateLabel({ ...old, label: { ...old.label!, pin } }, old.deviceid);
      return;
    }
    if (old.label!.label === name) {
      store.deleteLabel(old.deviceid);
    }
  }
  if (!labelled(pin)) {
    store.addPinLabel(pin, name);
  }
}
