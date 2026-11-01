import { GuideSource } from '../types';
import {
  WirelessBatteryStep,
  WirelessBluetoothStep,
  WirelessIntroStep,
  WirelessPowerStep,
  WirelessTestStep,
} from './wirelessGuideSteps';

export const WIRELESS_GUIDE: GuideSource = {
  id: 'wireless',
  category: 'mods',
  steps: [
    { id: 'wireless-intro', render: WirelessIntroStep },
    { id: 'wireless-battery', render: WirelessBatteryStep },
    { id: 'wireless-bluetooth', render: WirelessBluetoothStep },
    { id: 'wireless-power', render: WirelessPowerStep },
    { id: 'wireless-test', render: WirelessTestStep },
  ],
};
