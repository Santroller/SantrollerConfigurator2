import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberInput, Stack } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { DropdownBox } from './DropdownBox';
import { getSelectedInput, InputKind } from './inputRegistry';

type InputEditorProps = {
  input: proto.IInput;
  dispatch: (input: proto.IInput) => void;
};

const inputEditors: Partial<Record<InputKind, ComponentType<InputEditorProps>>> = {
  crkd: ({ input, dispatch }) => (
    <DropdownBox
      title="input.title"
      e={proto.CrkdNeckButtonType}
      val={input.crkd!.button}
      label="inputs"
      dispatch={(button) => dispatch({ crkd: { ...input.crkd!, button } })}
    />
  ),
  crkdDrum: ({ input, dispatch }) => (
    <DropdownBox
      title="input.title"
      e={proto.CrkdDrumAxisType}
      val={input.crkdDrum!.axis}
      label="inputs"
      dispatch={(axis) => dispatch({ crkdDrum: { ...input.crkdDrum!, axis } })}
    />
  ),
  gh5Neck: ({ input, dispatch }) => (
    <DropdownBox
      title="input.title"
      e={proto.Gh5NeckButtonType}
      val={input.gh5Neck!.button}
      label="inputs"
      dispatch={(button) => dispatch({ gh5Neck: { ...input.gh5Neck!, button } })}
    />
  ),
  encoder: ({ input, dispatch }) => <EncoderInputEditor input={input} dispatch={dispatch} />,
  accelerometer: ({ input, dispatch }) => (
    <DropdownBox
      title="input.title"
      e={proto.AccelerometerInputType}
      val={input.accelerometer!.type}
      label="accelerometer.inputs"
      dispatch={(type) => dispatch({ accelerometer: { ...input.accelerometer!, type } })}
    />
  ),
  protarNeckButton: ({ input, dispatch }) => (
    <DropdownBox
      title="input.protarNeckButton.title"
      e={proto.ProGuitarNeckButtonType}
      val={input.protarNeckButton!.button}
      label="input.protarNeckButton"
      dispatch={(button) =>
        dispatch({
          protarNeckButton: { ...input.protarNeckButton!, button },
        })
      }
    />
  ),
  protarNeckAxis: ({ input, dispatch }) => (
    <DropdownBox
      title="input.protarNeckAxis.title"
      e={proto.ProGuitarNeckAxisType}
      val={input.protarNeckAxis!.axis}
      label="input.protarNeckAxis"
      dispatch={(axis) => dispatch({ protarNeckAxis: { ...input.protarNeckAxis!, axis } })}
    />
  ),
};

function EncoderInputEditor({ input, dispatch }: InputEditorProps) {
  const { t } = useTranslation();
  const encoder = input.encoder!;
  return (
    <Stack gap="xs">
      <DropdownBox
        title="input.title"
        e={proto.EncoderInputType}
        val={encoder.type}
        label="encoder.inputs"
        dispatch={(type) => dispatch({ encoder: { ...encoder, type } })}
      />
      {encoder.type === proto.EncoderInputType.EncoderPosition && (
        <NumberInput
          label={t('encoder.positionScale', 'Position scale (per step)')}
          min={1}
          max={65535}
          allowDecimal={false}
          value={encoder.positionScale || 1}
          onChange={(value) => {
            if (typeof value === 'number' && value >= 1 && value <= 65535) {
              dispatch({ encoder: { ...encoder, positionScale: value } });
            }
          }}
        />
      )}
    </Stack>
  );
}

export function RegisteredInputEditor(props: InputEditorProps) {
  const kind = getSelectedInput(props.input)?.kind;
  const Editor = kind ? inputEditors[kind] : undefined;
  return Editor ? <Editor {...props} /> : null;
}
