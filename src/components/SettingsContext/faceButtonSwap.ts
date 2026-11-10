import { proto } from './config.js';

// Swaps A<->B and X<->Y on a mapping's Wii and SNES input, in place, for moving it between a
// profile that maps face buttons by label and one that maps them by position
export function swapFaceButtonInputs(mapping: proto.IMapping) {
  // Swap A<->B and Y<->X for wii inputs when swapping between label and legend mode
  let wiiButton = mapping.input.wiiButton?.button;
  switch (wiiButton) {
    case proto.WiiButtonType.WiiButtonClassicA:
      wiiButton = proto.WiiButtonType.WiiButtonClassicB;
      break;
    case proto.WiiButtonType.WiiButtonClassicB:
      wiiButton = proto.WiiButtonType.WiiButtonClassicA;
      break;
    case proto.WiiButtonType.WiiButtonClassicX:
      wiiButton = proto.WiiButtonType.WiiButtonClassicY;
      break;
    case proto.WiiButtonType.WiiButtonClassicY:
      wiiButton = proto.WiiButtonType.WiiButtonClassicX;
      break;
  }
  if (wiiButton) {
    mapping.input.wiiButton!.button = wiiButton;
  }
  // SNES pads share the Nintendo layout
  let snesButton = mapping.input.snesButton?.button;
  switch (snesButton) {
    case proto.SNESButtonType.SNESButtonA:
      snesButton = proto.SNESButtonType.SNESButtonB;
      break;
    case proto.SNESButtonType.SNESButtonB:
      snesButton = proto.SNESButtonType.SNESButtonA;
      break;
    case proto.SNESButtonType.SNESButtonX:
      snesButton = proto.SNESButtonType.SNESButtonY;
      break;
    case proto.SNESButtonType.SNESButtonY:
      snesButton = proto.SNESButtonType.SNESButtonX;
      break;
  }
  if (snesButton) {
    mapping.input.snesButton!.button = snesButton;
  }
  return mapping;
}
