import { proto } from './config.js';

/**
 * The Pattern Based LED mode is now Static with an effect, which any mode can have. Breathing keeps
 * its colours. A rainbow was as bright as its brightness setting rather than the LED's colours, and
 * rainbows take their brightness from the colour now, so it becomes white at that brightness.
 * The firmware still runs old pattern mappings the same way. Returns whether anything changed.
 */
export function migrateLedPatterns(config: proto.IConfig): boolean {
  let changed = false;
  config.profiles?.forEach((profile) => {
    profile.leds?.forEach((led) => {
      const pattern = led.mapping?.patternMapping;
      if (!pattern) {
        return;
      }
      const rainbow = pattern.pattern === proto.RgbPatternType.PatternRainbow;
      led.mapping = { staticMapping: {} };
      led.effect = {
        type: rainbow ? proto.LedEffectType.EffectRainbow : proto.LedEffectType.EffectBreathing,
        speed: pattern.speed || 1,
      };
      if (rainbow && led.device?.rgb) {
        const brightness = pattern.brightness || 1;
        led.device.rgb = {
          ...led.device.rgb,
          endR: 255,
          endG: 255,
          endB: 255,
          endW: brightness,
          hasStart: false,
        };
      }
      changed = true;
    });
  });
  return changed;
}
