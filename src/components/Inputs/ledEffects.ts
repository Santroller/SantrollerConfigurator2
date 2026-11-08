import { proto } from '@/components/SettingsContext/config';

// The effects an LED device can show: only RGB LEDs have a colour to cycle, and only dimmable ones can
// breathe. LEDs that are only on or off, and display elements, can still blink.
export function supportedLedEffects(device: proto.ILedDevice): proto.LedEffectType[] {
  if (device.rgb) {
    return [
      proto.LedEffectType.EffectBreathing,
      proto.LedEffectType.EffectBlink,
      proto.LedEffectType.EffectRainbow,
    ];
  }
  if (device.dmx || device.gpio?.analog) {
    return [proto.LedEffectType.EffectBreathing, proto.LedEffectType.EffectBlink];
  }
  if (device.gpio || device.stp16 || device.vtechExpander || device.mpr121 || device.display) {
    return [proto.LedEffectType.EffectBlink];
  }
  return [];
}

// Devices with more than one LED, which a player LED mapping can show the whole player number on
export function hasSeveralLeds(device: proto.ILedDevice): boolean {
  return !!(device.rgb || device.stp16 || device.vtechExpander);
}

// Drops what the LED's device can't show, eg an effect or player LED style after switching an RGB LED
// to a GPIO pin
export function withSupportedOptions(led: proto.ILed): proto.ILed {
  let next = led;
  if (next.effect && !supportedLedEffects(next.device).includes(next.effect.type)) {
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
