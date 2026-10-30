import { proto } from '@/components/SettingsContext/config';

// The physical LEDs a mapping drives, matching LedId in the firmware: the chip it is on (or the
// Pico's own pins) and its position there
function physicalLeds(device: proto.ILedDevice): string[] {
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
// covers every earlier mapping updated every poll
export function ledOverlaps(leds: proto.ILed[]): LedOverlap[] {
  const physical = leds.map((led) => new Set(physicalLeds(led.device)));
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

// For each mapping, the other PWM mappings on a different pin that shares its PWM output
export function pwmChannelShares(leds: proto.ILed[]): number[][] {
  return leds.map((led) => {
    const gpio = led.device.gpio;
    if (!gpio?.analog || gpio.pin < 0) {
      return [];
    }
    return leds.flatMap((other, otherIdx) => {
      const otherGpio = other.device.gpio;
      return otherGpio?.analog &&
        otherGpio.pin >= 0 &&
        otherGpio.pin !== gpio.pin &&
        pwmOutput(otherGpio.pin) === pwmOutput(gpio.pin)
        ? [otherIdx]
        : [];
    });
  });
}
