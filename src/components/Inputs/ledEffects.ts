import { proto } from '@/components/SettingsContext/config';

// The GPIO LED group an LED is from, undefined for other LEDs or when the group is missing. devices is
// the config's devices.
export function ledGroup(
  device: proto.ILedDevice,
  devices: proto.IDevice[] = []
): proto.IGpioLedGroupDevice | undefined {
  const id = device.gpioGroup?.deviceId;
  if (id == null) {
    return undefined;
  }
  return devices.find((d) => d.deviceid === id)?.gpioLedGroup ?? undefined;
}

// How many LEDs a device with several of them has, which LED mappings and labels pick from by number. 0
// for devices that aren't picked from that way.
export function deviceLedCount(device: proto.IDevice | undefined): number {
  return (
    device?.ws2812?.count ||
    device?.apa102?.count ||
    device?.stp16cpc?.count ||
    device?.gpioLedGroup?.pins?.length ||
    0
  );
}

// The effects an LED device can show: only RGB LEDs have a colour to cycle, and only dimmable ones can
// breathe. LEDs that are only on or off, and display elements, can still blink. devices is the config's
// devices, which say whether a GPIO LED group is dimmable.
export function supportedLedEffects(
  device: proto.ILedDevice,
  devices: proto.IDevice[] = []
): proto.LedEffectType[] {
  if (device.rgb) {
    return [
      proto.LedEffectType.EffectBreathing,
      proto.LedEffectType.EffectBlink,
      proto.LedEffectType.EffectRainbow,
    ];
  }
  if (device.dmx || device.gpio?.analog || ledGroup(device, devices)?.analog) {
    return [proto.LedEffectType.EffectBreathing, proto.LedEffectType.EffectBlink];
  }
  if (
    device.gpio ||
    device.gpioGroup ||
    device.stp16 ||
    device.vtechExpander ||
    device.mpr121 ||
    device.display
  ) {
    return [proto.LedEffectType.EffectBlink];
  }
  return [];
}

// Devices with more than one LED, which a player LED mapping can show the whole player number on
export function hasSeveralLeds(device: proto.ILedDevice): boolean {
  return !!(device.rgb || device.stp16 || device.vtechExpander || device.gpioGroup);
}

// Drops what the LED's device can't show, eg an effect or player LED style after switching an RGB LED
// to a GPIO pin
export function withSupportedOptions(led: proto.ILed, devices: proto.IDevice[] = []): proto.ILed {
  let next = led;
  if (next.effect && !supportedLedEffects(next.device, devices).includes(next.effect.type)) {
    const { effect: _, ...rest } = next;
    next = rest as proto.ILed;
  }
  const player = next.mapping.playerMapping;
  if (player?.style != null && !hasSeveralLeds(next.device)) {
    const { style: _, ...rest } = player;
    next = { ...next, mapping: { playerMapping: rest as proto.IPlayerLedMapping } };
  }
  return next;
}
