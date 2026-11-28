import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberInput, Select, Stack } from '@mantine/core';
import { DRUM_PAD_TYPES, padLabel } from '@/components/Devices/drumKit';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { DropdownBox } from './DropdownBox';
import { getSelectedInput, InputKind } from './inputRegistry';

type InputEditorProps = {
  input: proto.IInput;
  dispatch: (input: proto.IInput) => void;
};

const inputEditors: Partial<Record<InputKind, ComponentType<InputEditorProps>>> = {
  mpr121: ({ input, dispatch }) => <Mpr121InputEditor input={input} dispatch={dispatch} />,
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
  crazyGuitarNeck: ({ input, dispatch }) => (
    <DropdownBox
      title="input.title"
      e={proto.CrazyGuitarNeckButtonType}
      val={input.crazyGuitarNeck!.button}
      label="inputs"
      dispatch={(button) => dispatch({ crazyGuitarNeck: { ...input.crazyGuitarNeck!, button } })}
    />
  ),
  djhPlatter: ({ input, dispatch }) => (
    <DropdownBox
      title="input.title"
      e={proto.DJHeroPlatterInputType}
      val={input.djhPlatter!.type}
      label="inputs"
      dispatch={(type) => dispatch({ djhPlatter: { ...input.djhPlatter!, type } })}
    />
  ),
  encoder: ({ input, dispatch }) => <EncoderInputEditor input={input} dispatch={dispatch} />,
  drumKit: ({ input, dispatch }) => <DrumKitInputEditor input={input} dispatch={dispatch} />,
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

function Mpr121InputEditor({ input, dispatch }: InputEditorProps) {
  const { t } = useTranslation();
  const mpr121 = input.mpr121!;
  const digital = mpr121.mode === proto.Mpr121PinMode.Digital;
  const firstPin = digital ? 4 : 0;
  return (
    <Stack gap="xs">
      <DropdownBox
        title="mpr121.mode"
        e={proto.Mpr121PinMode}
        val={mpr121.mode}
        label="mpr121.modes"
        dispatch={(mode) =>
          dispatch({
            mpr121: {
              ...mpr121,
              mode,
              pin: mode === proto.Mpr121PinMode.Digital ? Math.max(4, mpr121.pin) : mpr121.pin,
            },
          })
        }
      />
      <Select
        label={t('mpr121.pin')}
        description={digital ? t('mpr121.digital_description') : undefined}
        data={Array.from({ length: 12 - firstPin }, (_, index) => {
          const pin = firstPin + index;
          return { value: `${pin}`, label: t('leds.mpr121_electrode', { pin }) };
        })}
        value={`${mpr121.pin}`}
        allowDeselect={false}
        onChange={(value) => {
          if (value !== null) {
            dispatch({ mpr121: { ...mpr121, pin: Number(value) } });
          }
        }}
      />
      {digital && (
        <Select
          label={t('gpio.mode.label')}
          data={[proto.PinMode.PullUp, proto.PinMode.PullDown, proto.PinMode.Floating].map(
            (pinMode) => ({
              value: `${pinMode}`,
              label: t(`gpio.mode.${proto.PinMode[pinMode]}`),
            })
          )}
          value={`${mpr121.pinMode}`}
          allowDeselect={false}
          onChange={(value) => {
            if (value !== null) {
              dispatch({ mpr121: { ...mpr121, pinMode: Number(value) } });
            }
          }}
        />
      )}
    </Stack>
  );
}

// Picks which of a drum kit's pads the input is
function DrumKitInputEditor({ input, dispatch }: InputEditorProps) {
  const { t } = useTranslation();
  const drumKit = input.drumKit!;
  const pads = useConfigStore(
    (state) => state.deviceStatus[drumKit.deviceid]?.device.drumKit?.pads ?? NO_PADS
  );
  return (
    <Select
      label={t('drumKit.input_pad')}
      data={pads.map((pad) => ({
        value: `${pad.id}`,
        label: padLabel(pads, pad, (type) => t(`drumKit.types.${DRUM_PAD_TYPES[type].key}`)),
      }))}
      value={`${drumKit.pad}`}
      allowDeselect={false}
      onChange={(value) => {
        if (value !== null) {
          dispatch({ ...input, drumKit: { ...drumKit, pad: Number(value) } });
        }
      }}
    />
  );
}
const NO_PADS: proto.IDrumPad[] = [];

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
