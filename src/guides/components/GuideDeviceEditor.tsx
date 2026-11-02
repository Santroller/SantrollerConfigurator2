import { DeviceKind } from '@/components/Devices/deviceRegistry';
import { DeviceContext } from '@/components/Devices/Pins';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { deviceEditors } from '@/pages/Devices.page';

/**
 * The Devices page's editor for the driver a guide adds, so its pins can be changed on the step
 * that wires it up. Shows nothing until the driver has been added.
 */
export function GuideDeviceEditor({ kind }: { kind: keyof proto.IDevice }) {
  // Several devices of a kind, like the turntable's two platters, each get their own
  const deviceStatus = useConfigStore((state) => state.deviceStatus);
  const statuses = Object.values(deviceStatus).filter(
    (status) => !status.parentId && status.device[kind] != null
  );
  return (
    <>
      {statuses.map((status) => {
        const Editor = deviceEditors[status.type as DeviceKind];
        return (
          <DeviceContext.Provider key={status.id} value={status.id}>
            <Editor id={status.id} />
          </DeviceContext.Provider>
        );
      })}
    </>
  );
}
