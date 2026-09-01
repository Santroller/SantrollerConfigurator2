import type { ComponentType } from 'react';
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
      title="input"
      e={proto.CrkdNeckButtonType}
      val={input.crkd!.button}
      label="inputs"
      dispatch={(button) => dispatch({ crkd: { ...input.crkd!, button } })}
    />
  ),
  crkdDrum: ({ input, dispatch }) => (
    <DropdownBox
      title="input"
      e={proto.CrkdDrumAxisType}
      val={input.crkdDrum!.axis}
      label="inputs"
      dispatch={(axis) => dispatch({ crkdDrum: { ...input.crkdDrum!, axis } })}
    />
  ),
  gh5Neck: ({ input, dispatch }) => (
    <DropdownBox
      title="input"
      e={proto.Gh5NeckButtonType}
      val={input.gh5Neck!.button}
      label="inputs"
      dispatch={(button) => dispatch({ gh5Neck: { ...input.gh5Neck!, button } })}
    />
  ),
  accelerometer: ({ input, dispatch }) => (
    <DropdownBox
      title="input"
      e={proto.AccelerometerInputType}
      val={input.accelerometer!.type}
      label="accelerometer.inputs"
      dispatch={(type) => dispatch({ accelerometer: { ...input.accelerometer!, type } })}
    />
  ),
  protarNeckButton: ({ input, dispatch }) => (
    <DropdownBox
      title="input.protarNeckButton"
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
      title="input.protarNeckAxis"
      e={proto.ProGuitarNeckAxisType}
      val={input.protarNeckAxis!.axis}
      label="input.protarNeckAxis"
      dispatch={(axis) => dispatch({ protarNeckAxis: { ...input.protarNeckAxis!, axis } })}
    />
  ),
};

export function RegisteredInputEditor(props: InputEditorProps) {
  const kind = getSelectedInput(props.input)?.kind;
  const Editor = kind ? inputEditors[kind] : undefined;
  return Editor ? <Editor {...props} /> : null;
}
