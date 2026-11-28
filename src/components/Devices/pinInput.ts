import { proto } from '@/components/SettingsContext/config';

// A pin read as analog (eg a piezo or a potentiometer), or as digital (a switch, pulled up so it reads pressed
// when shorted to ground). -1 until it's picked.
export function analogPinInput(pin = -1): proto.IInput {
  return { gpio: { pin, analog: true, pinMode: proto.PinMode.Floating } };
}
export function digitalPinInput(pin = -1): proto.IInput {
  return { gpio: { pin, analog: false, pinMode: proto.PinMode.PullUp } };
}
