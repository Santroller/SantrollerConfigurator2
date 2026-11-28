import { useState } from 'react';
import { Input, Slider } from '@mantine/core';

export interface LedBrightnessInputProps {
  label?: React.ReactNode;
  // The colour whose brightness this sets, as the firmware reads it: its brightest channel, scaled by w
  r?: number | null;
  g?: number | null;
  b?: number | null;
  w?: number | null;
  onChange: (val: { r: number; g: number; b: number; w: number }) => void;
}

// A brightness on its own, for effects such as the rainbow that pick their own colours. It writes a
// grey of that brightness, as the firmware only takes the brightest channel of the colour.
export function LedBrightnessInput({ label, r, g, b, w, onChange }: LedBrightnessInputProps) {
  const level = Math.round(
    (Math.max(r ?? 0, g ?? 0, b ?? 0) * Math.max(0, Math.min(255, w ?? 255))) / 255
  );
  // Every config change re-renders the whole inputs page, so only hand the value over once the drag ends
  const [draft, setDraft] = useState<number | null>(null);
  const percent = (val: number) => `${Math.round((val / 255) * 100)}%`;

  return (
    <Input.Wrapper label={label}>
      <Slider
        mt={4}
        min={1}
        max={255}
        value={draft ?? Math.max(1, level)}
        onChange={setDraft}
        onChangeEnd={(val) => {
          setDraft(null);
          onChange({ r: val, g: val, b: val, w: 255 });
        }}
        label={percent}
      />
    </Input.Wrapper>
  );
}
