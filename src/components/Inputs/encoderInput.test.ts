import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';

describe('encoder position scale', () => {
  it('round-trips per-input scale without changing legacy inputs', () => {
    const position = proto.Input.decode(
      proto.Input.encode({
        encoder: {
          deviceid: 1,
          type: proto.EncoderInputType.EncoderPosition,
          positionScale: 1024,
        },
      }).finish()
    );
    expect(position.encoder?.positionScale).toBe(1024);

    const legacy = proto.Input.decode(
      proto.Input.encode({
        encoder: { deviceid: 1, type: proto.EncoderInputType.EncoderPosition },
      }).finish()
    );
    expect(legacy.encoder?.positionScale).toBeNull();
  });
});
