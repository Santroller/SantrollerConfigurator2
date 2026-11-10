import { withMatrixPins, withSwitchNetworkPins } from '@/components/Devices/matrixPins';
import { proto } from '@/components/SettingsContext/config';

// How many buttons a switch network device can hold (SwitchNetworkDevice.buttons max_count)
export const SWITCH_NETWORK_MAX_BUTTONS = 32;

// What a pin pair scan has seen of one pair of pins, whichever way round it was found
export interface PinPair {
  // The lower pin first
  a: number;
  b: number;
  // Driving a low pulled b low, and driving b low pulled a low. A plain switch does both,
  // a switch with a diode in series only one
  aToB: boolean;
  bToA: boolean;
  // Which ways round it is connected right now (1: a to b, 2: b to a)
  held: number;
  // How many times it has been pressed
  presses: number;
  // The order pairs were first seen in, so the list keeps the order buttons were pressed in
  order: number;
}

export type PinPairs = Record<string, PinPair>;

export function pinPairKey(pin: number, otherPin: number): string {
  return pin < otherPin ? `${pin}-${otherPin}` : `${otherPin}-${pin}`;
}

// Mutates pairs, so it can be used from inside an immer producer
export function applyPinPairEvent(pairs: PinPairs, event: proto.IPinPairEvent): void {
  const driven = event.drivenPin ?? -1;
  const sensed = event.sensedPin ?? -1;
  if (driven < 0 || sensed < 0 || driven === sensed) {
    return;
  }
  const key = pinPairKey(driven, sensed);
  let pair = pairs[key];
  if (!pair) {
    if (!event.connected) {
      return;
    }
    pair = {
      a: Math.min(driven, sensed),
      b: Math.max(driven, sensed),
      aToB: false,
      bToA: false,
      held: 0,
      presses: 0,
      order: Object.keys(pairs).length,
    };
    pairs[key] = pair;
  }
  const direction = driven === pair.a ? 1 : 2;
  if (event.connected) {
    if (!pair.held) {
      pair.presses++;
    }
    pair.held |= direction;
    if (direction === 1) {
      pair.aToB = true;
    } else {
      pair.bToA = true;
    }
  } else {
    pair.held &= ~direction;
  }
}

export type PinPairLayout =
  // Nothing found yet
  | 'empty'
  // Every pair only conducts one way, from a drive pin to a sense pin: a matrix with diodes
  | 'diodeMatrix'
  // The pins split into two sides with every pair going across: a matrix without diodes
  | 'matrix'
  // Some pins pair with pins on both sides, so any pin can be paired with any other
  | 'network';

export interface PinPairAnalysis {
  layout: PinPairLayout;
  pins: number[];
  // For a matrix, the pins to drive and the pins to read. For one without diodes either side
  // works, so the smaller side is driven
  drive: number[];
  sense: number[];
}

const sorted = (pins: Iterable<number>) => [...pins].sort((x, y) => x - y);

export function analysePinPairs(pairs: PinPairs): PinPairAnalysis {
  const list = Object.values(pairs);
  const pins = sorted(new Set(list.flatMap((pair) => [pair.a, pair.b])));
  if (!list.length) {
    return { layout: 'empty', pins, drive: [], sense: [] };
  }

  // A pair with a diode only conducts from the pin that was driven to the one that was read
  if (list.every((pair) => pair.aToB !== pair.bToA)) {
    const drive = new Set(list.map((pair) => (pair.aToB ? pair.a : pair.b)));
    const sense = new Set(list.map((pair) => (pair.aToB ? pair.b : pair.a)));
    if ([...drive].every((pin) => !sense.has(pin))) {
      return { layout: 'diodeMatrix', pins, drive: sorted(drive), sense: sorted(sense) };
    }
  }

  // Otherwise it's a matrix if the pins can be split into two sides with every pair crossing
  // between them, which is two-colouring the graph of pairs
  const neighbours = new Map<number, number[]>();
  for (const pair of list) {
    neighbours.set(pair.a, [...(neighbours.get(pair.a) ?? []), pair.b]);
    neighbours.set(pair.b, [...(neighbours.get(pair.b) ?? []), pair.a]);
  }
  const side = new Map<number, 0 | 1>();
  const drive: number[] = [];
  const sense: number[] = [];
  for (const start of pins) {
    if (side.has(start)) {
      continue;
    }
    // Each group of connected pins is split on its own
    const group: number[][] = [[], []];
    side.set(start, 0);
    const queue = [start];
    while (queue.length) {
      const pin = queue.shift()!;
      const pinSide = side.get(pin)!;
      group[pinSide].push(pin);
      for (const other of neighbours.get(pin) ?? []) {
        const otherSide = side.get(other);
        if (otherSide === undefined) {
          side.set(other, pinSide === 0 ? 1 : 0);
          queue.push(other);
        } else if (otherSide === pinSide) {
          return { layout: 'network', pins, drive: [], sense: [] };
        }
      }
    }
    const [small, large] = group[0].length <= group[1].length ? group : [group[1], group[0]];
    drive.push(...small);
    sense.push(...large);
  }
  return { layout: 'matrix', pins, drive: sorted(drive), sense: sorted(sense) };
}

// A matrix device for what the scan found. The scan drove each pin low and read the rest with
// pull ups, which is how an active low matrix reads, so a pair with a diode works the same way
export function matrixDeviceFromScan(analysis: PinPairAnalysis): proto.IMatrixDevice {
  return withMatrixPins(
    withMatrixPins({ inPins: 0, outPins: 0, activeLow: true }, 'out', analysis.drive),
    'in',
    analysis.sense
  );
}

// A switch network device with a button for each pair, in the order they were pressed. The
// network drives pin low and reads otherPin, so a pair with a diode keeps its driven pin first
export function switchNetworkFromScan(pairs: PinPairs): proto.ISwitchNetworkDevice {
  const list = Object.values(pairs).sort((x, y) => x.order - y.order);
  const buttons = list
    .slice(0, SWITCH_NETWORK_MAX_BUTTONS)
    .map((pair) =>
      pair.bToA && !pair.aToB
        ? { pin: pair.b, otherPin: pair.a }
        : { pin: pair.a, otherPin: pair.b }
    );
  const pins = sorted(new Set(buttons.flatMap((button) => [button.pin, button.otherPin])));
  return withSwitchNetworkPins({ pins: 0, buttons }, pins);
}
