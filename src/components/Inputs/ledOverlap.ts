import { proto } from '@/components/SettingsContext/config';
import { ledGroup } from './ledEffects';

// The pins of the LEDs a GPIO group LED picks, leaving out any past the end of the group as the firmware does
function groupPins(device: proto.ILedDevice, devices: proto.IDevice[]): number[] {
  const pins = ledGroup(device, devices)?.pins ?? [];
  return (device.gpioGroup?.activeLed ?? []).filter((i) => i < pins.length).map((i) => pins[i]);
}

// The physical LEDs a mapping drives, matching LedId in the firmware: the chip it is on (or the
// Pico's own pins) and its position there. Grouped GPIO LEDs share the Pico's pins with the others.
function physicalLeds(device: proto.ILedDevice, devices: proto.IDevice[]): string[] {
  if (device.rgb) {
    return (device.rgb.activeLed ?? []).map((i) => `${device.rgb!.deviceId}:${i}`);
  }
  if (device.stp16) {
    return (device.stp16.activeLed ?? []).map((i) => `${device.stp16!.deviceId}:${i}`);
  }
  if (device.vtechExpander) {
    const leds: string[] = [];
    for (let bit = 0; bit < 8; bit++) {
      if (device.vtechExpander.activeLed & (1 << bit)) {
        leds.push(`${device.vtechExpander.deviceId}:${bit}`);
      }
    }
    return leds;
  }
  if (device.mpr121) {
    return [`${device.mpr121.deviceId}:${device.mpr121.pin}`];
  }
  if (device.dmx) {
    return [`${device.dmx.deviceId}:${device.dmx.channel}`];
  }
  if (device.gpio) {
    return [`gpio:${device.gpio.pin}`];
  }
  if (device.gpioGroup) {
    return groupPins(device, devices).map((pin) => `gpio:${pin}`);
  }
  return [];
}

// Mappings the firmware updates every poll, rather than only when the host sends something
function drivenByController(led: proto.ILed): boolean {
  const m = led.mapping;
  return !!(m.inputMapping || m.statusMapping || m.staticMapping || m.patternMapping);
}

// Whether this mapping writes its LEDs on every poll. An RGB input or status mapping without an
// off colour skips the write while released, so mappings before it still show through
function alwaysWrites(led: proto.ILed): boolean {
  const m = led.mapping;
  if (m.staticMapping || m.patternMapping) {
    return true;
  }
  if (m.inputMapping || m.statusMapping) {
    return !led.device.rgb || led.device.rgb.hasStart;
  }
  return false;
}

export interface LedOverlap {
  // earlier mappings updated every poll, which this one always writes over
  hides: number[];
  // mappings the host drives, which only show until this one takes the LED back once
  // COMMAND_HOLD_MS has passed since the host last changed them, wherever they are in the list
  cutsShort: number[];
}

// For each mapping, the other mappings sharing one of its LEDs that it covers up. The firmware
// updates mappings in order and the last write to an LED wins, so a mapping that always writes
// covers every earlier mapping updated every poll. devices is the config's devices, for the pins of GPIO
// LED groups.
export function ledOverlaps(leds: proto.ILed[], devices: proto.IDevice[] = []): LedOverlap[] {
  const physical = leds.map((led) => new Set(physicalLeds(led.device, devices)));
  return leds.map((led, idx) => {
    const overlap: LedOverlap = { hides: [], cutsShort: [] };
    if (!alwaysWrites(led)) {
      return overlap;
    }
    leds.forEach((other, otherIdx) => {
      if (otherIdx === idx || physical[otherIdx].intersection(physical[idx]).size === 0) {
        return;
      }
      if (!drivenByController(other)) {
        overlap.cutsShort.push(otherIdx);
      } else if (otherIdx < idx) {
        overlap.hides.push(otherIdx);
      }
    });
    return overlap;
  });
}

// The PWM output (slice and channel) driving a pin, as in the SDK's pwm_gpio_to_slice_num. GP0 - GP31
// share 16 outputs, so pins 16 apart (GP0 and GP16) always show the same brightness. That's the same
// on the RP2350, whose extra outputs are only on the RP2350B's GP32 - GP47, there shared by pins 8 apart.
function pwmOutput(pin: number): number {
  return pin < 32 ? pin % 16 : 16 + ((pin - 32) % 8);
}

// The pins a mapping dims through PWM
function pwmPins(device: proto.ILedDevice, devices: proto.IDevice[]): number[] {
  if (device.gpio?.analog && device.gpio.pin >= 0) {
    return [device.gpio.pin];
  }
  if (ledGroup(device, devices)?.analog) {
    return groupPins(device, devices).filter((pin) => pin >= 0);
  }
  return [];
}

// For each mapping, the other PWM mappings on a different pin that shares one of its PWM outputs
export function pwmChannelShares(leds: proto.ILed[], devices: proto.IDevice[] = []): number[][] {
  const pins = leds.map((led) => pwmPins(led.device, devices));
  return leds.map((_, idx) =>
    leds.flatMap((_other, otherIdx) =>
      otherIdx !== idx &&
      pins[idx].some((pin) =>
        pins[otherIdx].some(
          (otherPin) => otherPin !== pin && pwmOutput(otherPin) === pwmOutput(pin)
        )
      )
        ? [otherIdx]
        : []
    )
  );
}

// Pins in a GPIO LED group that would show the same brightness as an earlier one in it, as they share a
// PWM output
export function groupPwmShares(pins: number[]): number[] {
  return pins.filter(
    (pin, i) =>
      pin >= 0 &&
      pins
        .slice(0, i)
        .some((other) => other >= 0 && other !== pin && pwmOutput(other) === pwmOutput(pin))
  );
}
