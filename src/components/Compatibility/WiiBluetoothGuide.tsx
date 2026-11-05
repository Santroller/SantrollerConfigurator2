import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, List, Stack, Text } from '@mantine/core';
import { Rich, RichItems, StepTitle } from './guideText';

const K = 'compatibility.wiiBluetooth';

export function WiiBluetoothGuide() {
  const { t } = useTranslation();
  return (
    <Box id="wii-bluetooth">
      <Alert color="teal" icon={<IconCheck size={16} />} title={t(`${K}.alertTitle`)} mb="lg">
        <Text size="sm">
          <Rich i18nKey={`${K}.alertBody`} />
        </Text>
      </Alert>

      <Stack gap="lg">
        <Stack gap="xs">
          <StepTitle n={1} title={t(`${K}.hardwareTitle`)} />
          <List size="sm" spacing="xs">
            <List.Item>
              <Rich i18nKey={`${K}.hardwarePicoW`} />
            </List.Item>
            <List.Item>
              <Rich i18nKey={`${K}.hardwareDongle`} />
            </List.Item>
          </List>
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm">{t(`${K}.hardwarePicoWWarning`)}</Text>
          </Alert>
        </Stack>

        <Stack gap="xs">
          <StepTitle n={2} title={t(`${K}.pairingTitle`)} />
          <List type="ordered" size="sm" spacing="xs">
            <RichItems i18nKey={`${K}.pairingSteps`} />
          </List>
        </Stack>
      </Stack>
    </Box>
  );
}
