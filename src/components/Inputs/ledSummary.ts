import { TFunction } from 'i18next';
import { getSelectedInput } from '@/components/Inputs/inputRegistry';
import { proto } from '@/components/SettingsContext/config';

// More than this many LEDs are shortened to the first few and how many more there are
const MAX_LISTED_LEDS = 6;

function listLeds(leds: number[], t: TFunction, ledName: (led: number) => string) {
  if (!leds.length) {
    return t('leds.summary.no_leds');
  }
  const names = leds.slice(0, MAX_LISTED_LEDS).map(ledName);
  const more = leds.length - names.length;
  return more > 0
    ? t('leds.summary.leds_more', { leds: names.join(', '), count: more })
    : t('leds.summary.leds', { leds: names.join(', '), count: leds.length });
}

// What a mapping lights, eg "WS2812: LEDs 0, 1 (Green)" or "SH1107 Display: Text "P1" at 0, 0". deviceName
// is the name of the device it's on, undefined when that device is missing. ledName names one of its
// LEDs by number, with any label given to it.
export function ledOutputSummary(
  led: proto.ILed,
  deviceName: string | undefined,
  t: TFunction,
  ledName: (led: number) => string = (n) => `${n}`
): string {
  const device = led.device;
  if (device.gpio) {
    const pin = device.gpio.pin >= 0 ? `GP${device.gpio.pin}` : t('leds.summary.no_pin');
    return `${t('devices.gpio')}: ${pin}`;
  }
  if (!deviceName) {
    return t('leds.summary.no_device');
  }
  let target = '';
  if (device.rgb) {
    target = listLeds(device.rgb.activeLed ?? [], t, ledName);
  } else if (device.stp16) {
    target = listLeds(device.stp16.activeLed ?? [], t, ledName);
  } else if (device.vtechExpander) {
    const leds = Array.from({ length: 8 }, (_, bit) => bit).filter(
      (bit) => device.vtechExpander!.activeLed & (1 << bit)
    );
    target = listLeds(leds, t, ledName);
  } else if (device.mpr121) {
    target = t('leds.mpr121_electrode', { pin: device.mpr121.pin });
  } else if (device.dmx) {
    target = t('leds.summary.channel', { channel: device.dmx.channel });
  } else if (device.display) {
    const element = device.display;
    const at = { x: element.x, y: element.y };
    switch (element.type) {
      case proto.DisplayElementType.DisplayElementText:
        target = t('leds.summary.display_text', { ...at, text: element.text ?? '' });
        break;
      case proto.DisplayElementType.DisplayElementImage:
        target = element.width
          ? t('leds.summary.display_image', { ...at, width: element.width, height: element.height })
          : t('leds.summary.display_no_image');
        break;
      case proto.DisplayElementType.DisplayElementBar:
        target = t('leds.summary.display_bar', {
          ...at,
          width: element.width,
          height: element.height,
        });
        break;
    }
  }
  return target ? `${deviceName}: ${target}` : deviceName;
}

// The setting that says what turns a mapping on, for the mappings that have one beyond their mode
export function ledModeDetail(mapping: proto.ILedMapping, t: TFunction): string | undefined {
  if (mapping.inputMapping) {
    // Inputs bound to an output are shown by that output's name instead
    const selected = getSelectedInput(mapping.inputMapping.input);
    if (selected?.kind === 'gpio') {
      const pin = mapping.inputMapping.input.gpio!.pin;
      return pin >= 0 ? `GP${pin}` : undefined;
    }
    return selected ? t(`devices.${selected.kind}`, { defaultValue: selected.kind }) : undefined;
  }
  if (mapping.playerMapping) {
    return t('leds.summary.player', { player: mapping.playerMapping.playerId });
  }
  if (mapping.statusMapping) {
    const status = t(`leds.status.${proto.StatusLedType[mapping.statusMapping.type]}`);
    return mapping.statusMapping.type === proto.StatusLedType.StatusConsoleMode &&
      mapping.statusMapping.mode != null
      ? `${status} (${t(`consoleMode.${proto.ConsoleMode[mapping.statusMapping.mode]}`)})`
      : status;
  }
  if (mapping.rumbleMapping) {
    return t(`leds.rumble.${proto.LedRumbleType[mapping.rumbleMapping.type]}`);
  }
  if (mapping.stageKitMapping) {
    return t(`leds.stageKit.${proto.StageKitLedType[mapping.stageKitMapping.type]}`);
  }
  if (mapping.keyboardMapping) {
    return t(`leds.keyboard.${proto.KeyboardLedType[mapping.keyboardMapping.type]}`);
  }
  if (mapping.gameFeedbackMapping) {
    return t(`leds.gameFeedback.${proto.GameFeedbackLedType[mapping.gameFeedbackMapping.type]}`);
  }
  return undefined;
}
