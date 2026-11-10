import { describe, expect, it } from 'vitest';
import {
  analysePinPairs,
  applyPinPairEvent,
  matrixDeviceFromScan,
  PinPairs,
  switchNetworkFromScan,
} from './pinPairs';

// A plain switch between two pins shows up both ways round
function press(pairs: PinPairs, pin: number, otherPin: number, both = true) {
  applyPinPairEvent(pairs, { drivenPin: pin, sensedPin: otherPin, connected: true });
  if (both) {
    applyPinPairEvent(pairs, { drivenPin: otherPin, sensedPin: pin, connected: true });
  }
}
function release(pairs: PinPairs, pin: number, otherPin: number) {
  applyPinPairEvent(pairs, { drivenPin: pin, sensedPin: otherPin, connected: false });
  applyPinPairEvent(pairs, { drivenPin: otherPin, sensedPin: pin, connected: false });
}

describe('applyPinPairEvent', () => {
  it('counts one press for both directions of a switch', () => {
    const pairs: PinPairs = {};
    press(pairs, 5, 2);
    expect(pairs['2-5']).toMatchObject({ a: 2, b: 5, aToB: true, bToA: true, held: 3, presses: 1 });
    release(pairs, 5, 2);
    expect(pairs['2-5'].held).toBe(0);
    press(pairs, 2, 5);
    expect(pairs['2-5'].presses).toBe(2);
  });

  it('ignores a release for a pair it never saw', () => {
    const pairs: PinPairs = {};
    applyPinPairEvent(pairs, { drivenPin: 1, sensedPin: 2, connected: false });
    expect(pairs).toEqual({});
  });

  it('keeps the order pairs were found in', () => {
    const pairs: PinPairs = {};
    press(pairs, 9, 1);
    press(pairs, 3, 4);
    expect(pairs['1-9'].order).toBe(0);
    expect(pairs['3-4'].order).toBe(1);
  });
});

describe('analysePinPairs', () => {
  it('has nothing to say before anything is pressed', () => {
    expect(analysePinPairs({}).layout).toBe('empty');
  });

  it('splits a matrix without diodes, driving the smaller side', () => {
    const pairs: PinPairs = {};
    // Two rows (0, 1) by three columns (10, 11, 12)
    for (const row of [0, 1]) {
      for (const column of [10, 11, 12]) {
        press(pairs, row, column);
      }
    }
    expect(analysePinPairs(pairs)).toEqual({
      layout: 'matrix',
      pins: [0, 1, 10, 11, 12],
      drive: [0, 1],
      sense: [10, 11, 12],
    });
  });

  it('uses the diode direction for a matrix with diodes', () => {
    const pairs: PinPairs = {};
    // Columns 10 and 11 are driven, rows 0, 1, 2 are read, even though there are more rows
    for (const column of [10, 11]) {
      for (const row of [0, 1, 2]) {
        press(pairs, column, row, false);
      }
    }
    expect(analysePinPairs(pairs)).toMatchObject({
      layout: 'diodeMatrix',
      drive: [10, 11],
      sense: [0, 1, 2],
    });
  });

  it('calls it a switch network when the pins do not split in two', () => {
    const pairs: PinPairs = {};
    press(pairs, 0, 1);
    press(pairs, 1, 2);
    press(pairs, 0, 2);
    expect(analysePinPairs(pairs).layout).toBe('network');
  });
});

describe('devices from a scan', () => {
  it('makes an active low matrix driving the drive pins', () => {
    const pairs: PinPairs = {};
    for (const column of [10, 33]) {
      for (const row of [0, 1, 2]) {
        press(pairs, column, row, false);
      }
    }
    expect(matrixDeviceFromScan(analysePinPairs(pairs))).toEqual({
      inPins: 0b111,
      outPins: 1 << 10,
      inPinsHigh: 0,
      outPinsHigh: 1 << 1,
      activeLow: true,
    });
  });

  it('makes a switch network with the driven pin first for a diode', () => {
    const pairs: PinPairs = {};
    press(pairs, 4, 1);
    press(pairs, 7, 2, false);
    expect(switchNetworkFromScan(pairs)).toEqual({
      buttons: [
        { pin: 1, otherPin: 4 },
        { pin: 7, otherPin: 2 },
      ],
      pins: (1 << 1) | (1 << 2) | (1 << 4) | (1 << 7),
      pinsHigh: 0,
    });
  });
});
