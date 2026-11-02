import { useEffect, useState } from 'react';
import { IconDeviceGamepad2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Flex, Group, Loader, Modal, Stack, Text, UnstyledButton } from '@mantine/core';
import { closeDevicePicker, useDevicePicker } from './devicePickerStore';
import { NativeHid, NativeHidDevice } from './nativeHid';
import classes from './DevicePicker.module.css';

// The desktop app's stand in for Chrome's device chooser. Keeps up with devices being plugged in
// and out while it is open.
export default function DevicePicker() {
  const { t } = useTranslation();
  const request = useDevicePicker((state) => state.request);
  const [devices, setDevices] = useState<NativeHidDevice[]>([]);

  useEffect(() => {
    if (!request) {
      return undefined;
    }
    const hid = navigator.hid as unknown as NativeHid;
    const update = () => setDevices(hid.matching(request.filters) as unknown as NativeHidDevice[]);
    update();
    hid.addEventListener('connect', update);
    hid.addEventListener('disconnect', update);
    return () => {
      hid.removeEventListener('connect', update);
      hid.removeEventListener('disconnect', update);
    };
  }, [request]);

  return (
    <Modal
      opened={!!request}
      onClose={() => closeDevicePicker()}
      title={t('devicePicker.title')}
      centered
    >
      {devices.length ? (
        <Stack gap="xs">
          {devices.map((device) => (
            <UnstyledButton
              key={device.info.path}
              className={classes.device}
              onClick={() => closeDevicePicker(device as unknown as HIDDevice)}
            >
              <Group wrap="nowrap">
                <IconDeviceGamepad2 size={24} stroke={1.5} />
                <div>
                  <Text size="sm" fw={500}>
                    {device.productName || t('devicePicker.unnamed')}
                  </Text>
                  {device.info.serialNumber && (
                    <Text size="xs" c="dimmed">
                      {t('devicePicker.serial', { serial: device.info.serialNumber })}
                    </Text>
                  )}
                </div>
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      ) : (
        <Group gap="sm">
          <Loader size="sm" />
          <Text size="sm">{t('devicePicker.waiting')}</Text>
        </Group>
      )}
      <Flex justify="flex-end" mt="md">
        <Button variant="default" onClick={() => closeDevicePicker()}>
          {t('common.cancel')}
        </Button>
      </Flex>
    </Modal>
  );
}
