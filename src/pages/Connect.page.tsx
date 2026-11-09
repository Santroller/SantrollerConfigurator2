import { useEffect, useState } from 'react';
import {
  IconAlertTriangle,
  IconBrandDiscord,
  IconCheck,
  IconDownload,
  IconExclamationCircle,
  IconHistory,
  IconInfoCircle,
  IconRefresh,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Alert,
  Button,
  Code,
  CopyButton,
  FileButton,
  Flex,
  Group,
  List,
  Modal,
  Progress,
  Space,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  DesktopDownloadButton,
  desktopOs,
  RELEASES_URL,
} from '@/components/DesktopDownload/DesktopDownloadButton';
import { Layout } from '@/components/Layout/Layout';
import { LEGACY_CONFIG_ACCEPT } from '@/components/Legacy/importLegacyConfig';
import { translateLegacyWarning } from '@/components/Legacy/warnings';
import { NixosUdevSnippet } from '@/components/NixosUdev/NixosUdevSnippet';
import { BluetoothConfigDevice } from '@/components/SettingsContext/BluetoothConfigDevice';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { RadioFirmwareAlert } from '@/components/Uf2Update/RadioFirmwareAlert';
import { Uf2UpdateAlert } from '@/components/Uf2Update/Uf2UpdateAlert';
import { checkUdevRules, installUdevRules, UdevStatus } from '@/desktop/nativeHid';
import { requestUpdateCheck, useUpdateCheck } from '@/desktop/updateCheckStore';

const isDesktop = 'isTauri' in window;
const isLinuxWeb = !isDesktop && desktopOs() === 'linux';

export function ConnectPage() {
  const connect = useConfigStore((state) => state.connect);
  const connectBluetooth = useConfigStore((state) => state.connectBluetooth);
  const disconnect = useConfigStore((state) => state.disconnect);
  const bootloader = useConfigStore((state) => state.bootloader);
  const exportConfig = useConfigStore((state) => state.exportConfig);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const importLegacy = useConfigStore((state) => state.importLegacyConfig);
  const legacyImportWarnings = useConfigStore((state) => state.legacyImportWarnings);
  const clearLegacyImportWarnings = useConfigStore((state) => state.clearLegacyImportWarnings);
  const firmwareUpdate = useConfigStore((state) => state.firmwareUpdate);
  const factoryReset = useConfigStore((state) => state.factoryReset);
  const connected = useConfigStore((state) => state.connected);
  const firmwareVersion = useConfigStore((state) => state.firmwareVersion);
  const firmwareBuild = useConfigStore((state) => state.firmwareBuild);
  const firmwareNewer = useConfigStore((state) => state.firmwareNewer);
  const hung = useConfigStore((state) => state.hung);
  const configLoadError = useConfigStore((state) => state.configLoadError);
  const configLoadErrorMessage = useConfigStore((state) => state.configLoadErrorMessage);
  const hidDevice = useConfigStore((state) => state.hidDevice);
  const connectDevice = useConfigStore((state) => state.connectDevice);
  const hungOnConnect = useConfigStore((state) => state.hungOnConnect);
  // The config here isn't the controller's, so there's nothing to export or replace
  const noConfig = hung || !!configLoadError;
  // A controller that stopped responding after its config was read still has that config here, and
  // exporting it may be the only way to keep changes that never got saved
  const canExport = !configLoadError && !hungOnConnect;
  const updating = useConfigStore((state) => state.updating);
  const updatePercentage = useConfigStore((state) => state.updatePercentage);
  const applyingUpdate = useConfigStore((state) => state.applyingUpdate);
  const updateError = useConfigStore((state) => state.updateError);
  const latest = useConfigStore((state) => state.latest);
  const simpleMode = useConfigStore((state) => state.simpleMode);
  const setSimpleMode = useConfigStore((state) => state.setSimpleMode);
  const uf2Required = useConfigStore((state) => state.uf2Required);
  const flashTooSmallForOta = useConfigStore((state) => state.flashTooSmallForOta);
  const [advancedModalOpened, { open: openAdvancedModal, close: closeAdvancedModal }] =
    useDisclosure(false);
  const [udevModalOpened, { open: openUdevModal, close: closeUdevModal }] = useDisclosure(false);
  const [resetModalOpened, { open: openResetModal, close: closeResetModal }] = useDisclosure(false);
  const updateCheckStatus = useUpdateCheck((state) => state.status);
  const { t } = useTranslation();
  const bluetoothSupported = BluetoothConfigDevice.isSupported();
  const [udevStatus, setUdevStatus] = useState<UdevStatus | null>(null);
  const [installingUdev, setInstallingUdev] = useState(false);
  const [udevInstallError, setUdevInstallError] = useState<string | null>(null);
  const [udevInstalledSuccess, setUdevInstalledSuccess] = useState(false);

  useEffect(() => {
    checkUdevRules().then(setUdevStatus);
  }, []);
  return (
    <>
      <Layout>
        <Modal
          opened={advancedModalOpened}
          onClose={closeAdvancedModal}
          title={t('connect.advancedMode.title')}
          centered
        >
          <Text size="sm">{t('connect.advancedMode.desc')}</Text>
          <Space h="md" />
          <Alert
            variant="light"
            color="orange"
            title={t('connect.advancedMode.warningTitle')}
            icon={<IconAlertTriangle size={16} />}
          >
            {t('connect.advancedMode.warningDesc')}
          </Alert>
          <Space h="md" />
          <Flex justify="flex-end">
            <Group align="flex-end">
              <Button
                onClick={() => {
                  setSimpleMode(false);
                  closeAdvancedModal();
                }}
                color="orange"
              >
                {t('connect.advancedMode.confirm')}
              </Button>
              <Button variant="default" onClick={closeAdvancedModal}>
                {t('connect.advancedMode.cancel')}
              </Button>
            </Group>
          </Flex>
        </Modal>
        <Modal
          opened={resetModalOpened}
          onClose={closeResetModal}
          title={t('connect.factoryReset.title')}
          centered
        >
          <Text size="sm">{t('connect.factoryReset.desc')}</Text>
          <Space h="md" />
          <Flex justify="flex-end">
            <Group align="flex-end">
              <Button
                onClick={() => {
                  factoryReset();
                  closeResetModal();
                }}
                color="red"
              >
                {t('connect.factoryReset.confirm')}
              </Button>
              <Button variant="default" onClick={closeResetModal}>
                {t('common.cancel')}
              </Button>
            </Group>
          </Flex>
        </Modal>
        <Modal
          opened={udevModalOpened}
          onClose={closeUdevModal}
          title={t('connect.linuxWebUdevModalTitle')}
          size="lg"
          centered
        >
          <Text size="sm">{t('connect.linuxWebUdevModalIntro')}</Text>
          <Space h="md" />
          <Text size="sm" fw={600}>
            {t('connect.linuxWebUdevOption1')}
          </Text>
          <Space h="xs" />
          <Text size="xs" c="dimmed">
            {t('connect.linuxWebUdevOption1Desc')}
          </Text>
          <Space h="xs" />
          <Group align="flex-start" gap="xs">
            <Code block style={{ flex: 1 }}>
              {`curl -fsSL ${window.location.origin}/70-santroller.rules | sudo tee /etc/udev/rules.d/70-santroller.rules\nsudo udevadm control --reload-rules && sudo udevadm trigger`}
            </Code>
            <CopyButton
              value={`curl -fsSL ${window.location.origin}/70-santroller.rules | sudo tee /etc/udev/rules.d/70-santroller.rules\nsudo udevadm control --reload-rules && sudo udevadm trigger`}
            >
              {({ copied, copy }) => (
                <Button size="xs" variant="default" color={copied ? 'teal' : 'gray'} onClick={copy}>
                  {copied ? t('connect.copied') : t('connect.copy')}
                </Button>
              )}
            </CopyButton>
          </Group>
          <Space h="md" />
          <Text size="sm" fw={600}>
            {t('connect.linuxWebUdevOption2')}
          </Text>
          <Space h="xs" />
          <List type="ordered" size="sm" spacing="xs">
            <List.Item>
              {t('connect.linuxWebUdevManualStep1')}{' '}
              <Button
                size="compact-xs"
                variant="subtle"
                component="a"
                href="70-santroller.rules"
                download="70-santroller.rules"
                leftSection={<IconDownload size={12} />}
              >
                70-santroller.rules
              </Button>
            </List.Item>
            <List.Item>
              <Text size="sm">{t('connect.linuxWebUdevManualStep2')}</Text>
              <Space h="xs" />
              <Code block>
                {`sudo cp ~/Downloads/70-santroller.rules /etc/udev/rules.d/\nsudo udevadm control --reload-rules && sudo udevadm trigger`}
              </Code>
            </List.Item>
            <List.Item>{t('connect.linuxWebUdevManualStep3')}</List.Item>
          </List>
          <Space h="xs" />
          <Text size="xs" c="dimmed">
            {t('connect.linuxWebUdevNoLogind')}
          </Text>
          <Space h="xs" />
          <Code block>sudo usermod -aG input $USER</Code>
          <Space h="md" />
          <Text size="sm" fw={600}>
            {t('connect.linuxWebUdevOptionNixos')}
          </Text>
          <Space h="xs" />
          <Text size="xs" c="dimmed">
            {t('connect.nixosUdevDesc')}
          </Text>
          <Space h="xs" />
          <NixosUdevSnippet />
        </Modal>
        {!navigator.hid && !bluetoothSupported && (
          <Alert
            variant="light"
            color="red"
            title={t('connect.browserNotSupported')}
            icon={<IconExclamationCircle />}
          >
            {t('connect.webHidNotSupported')}
            <Space h="md" />
            <DesktopDownloadButton />
          </Alert>
        )}
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {t('connect.configuratorVersion', {
              version: `${__CONFIGURATOR_VERSION__} (${__CONFIGURATOR_COMMIT__})`,
            })}
          </Text>
          {/* the website is always the latest version, only the desktop app needs updating */}
          {isDesktop && (
            <>
              <Button
                size="compact-xs"
                variant="default"
                leftSection={<IconRefresh size={14} />}
                loading={updateCheckStatus === 'checking'}
                onClick={requestUpdateCheck}
              >
                {t('connect.checkForUpdates')}
              </Button>
              {updateCheckStatus === 'upToDate' && (
                <Text size="sm" c="dimmed">
                  {t('connect.upToDate')}
                </Text>
              )}
              {updateCheckStatus === 'failed' && (
                <Text size="sm" c="red">
                  {t('connect.updateCheckFailed')}
                </Text>
              )}
            </>
          )}
        </Group>
        {connected && firmwareVersion && (
          <Text size="sm" c="dimmed">
            {t('connect.firmwareVersion', {
              version: firmwareBuild ? `${firmwareBuild} (${firmwareVersion})` : firmwareVersion,
            })}
          </Text>
        )}
        {connected && (
          <>
            <Space h="md" />
            <Button disabled={updating} onClick={disconnect}>
              {t('connect.disconnect')}
            </Button>
          </>
        )}
        {connected && !simpleMode && (
          <>
            <Space h="md" />
            <Button disabled={updating || hung || configLoadError === 'inUse'} onClick={bootloader}>
              {t('connect.bootloader')}
            </Button>
            <Space h="md" />
            <Button disabled={updating || !canExport} onClick={exportConfig}>
              {t('connect.export')}
            </Button>
            <Space h="md" />
            <FileButton
              disabled={updating || noConfig}
              onChange={loadConfig}
              accept="application/json"
            >
              {(props) => (
                <Button disabled={updating || noConfig} {...props}>
                  {t('connect.load')}
                </Button>
              )}
            </FileButton>
            <Space h="md" />
            <FileButton
              disabled={updating || noConfig}
              onChange={importLegacy}
              accept={LEGACY_CONFIG_ACCEPT}
              multiple
            >
              {(props) => (
                <Button disabled={updating || noConfig} {...props}>
                  {t('connect.importLegacy')}
                </Button>
              )}
            </FileButton>
            <Space h="md" />
            <Button disabled={updating || noConfig} color="red" onClick={openResetModal}>
              {t('connect.factoryReset.button')}
            </Button>
          </>
        )}
        {connected && simpleMode && (
          <>
            <Space h="md" />
            <Button disabled={updating || hung} variant="default" onClick={openAdvancedModal}>
              {t('connect.advancedMode.button')}
            </Button>
          </>
        )}
        {legacyImportWarnings.length > 0 && (
          <>
            <Space h="md" />
            <Alert
              variant="light"
              color="yellow"
              title={t('connect.legacyImportTitle')}
              icon={<IconExclamationCircle />}
              withCloseButton
              closeButtonLabel={t('connect.legacyImportDismiss')}
              onClose={clearLegacyImportWarnings}
            >
              <List size="sm">
                {legacyImportWarnings
                  .map((warning) => translateLegacyWarning(t, warning))
                  .map((warning) => (
                    <List.Item key={warning}>{warning}</List.Item>
                  ))}
              </List>
            </Alert>
          </>
        )}
        {hung && (
          <Alert
            variant="light"
            color="red"
            title={t('connect.hungTitle')}
            icon={<IconExclamationCircle />}
          >
            {t('connect.hung')}
            {canExport && (
              <>
                <Space h="xs" />
                {t('connect.hungExport')}
                {simpleMode && (
                  <>
                    <Space h="xs" />
                    <Button size="xs" disabled={updating} onClick={exportConfig}>
                      {t('connect.export')}
                    </Button>
                  </>
                )}
              </>
            )}
          </Alert>
        )}
        {!hung && configLoadError === 'inUse' && (
          <Alert
            variant="light"
            color="yellow"
            title={t('connect.inUseTitle')}
            icon={<IconAlertTriangle />}
          >
            {t('connect.inUse')}
          </Alert>
        )}
        {!hung && configLoadError === 'failed' && (
          <Alert
            variant="light"
            color="red"
            title={t('connect.configLoadFailedTitle')}
            icon={<IconExclamationCircle />}
          >
            {t('connect.configLoadFailed')}
            {configLoadErrorMessage && (
              <>
                <Space h="xs" />
                <Code block>{configLoadErrorMessage}</Code>
              </>
            )}
            <Space h="xs" />
            <Button
              size="xs"
              variant="default"
              disabled={!hidDevice}
              onClick={() => hidDevice && connectDevice(hidDevice)}
            >
              {t('connect.configLoadRetry')}
            </Button>
          </Alert>
        )}
        {!connected && (
          <>
            <Space h="md" />
            <Alert
              variant="light"
              color="yellow"
              title={t('connect.oldFirmwareTitle')}
              icon={<IconAlertTriangle />}
            >
              {t('connect.oldFirmware')}
            </Alert>
          </>
        )}
        {udevStatus?.rulesNeeded && (
          <>
            <Space h="md" />
            <Alert
              variant="light"
              color="blue"
              title={t('connect.udevRulesTitle')}
              icon={<IconAlertTriangle />}
            >
              <Text size="sm">{t('connect.udevRulesDesc')}</Text>
              {udevStatus.isNixos && (
                <>
                  <Space h="xs" />
                  <Text size="sm">{t('connect.nixosUdevDesc')}</Text>
                  <Space h="xs" />
                  <NixosUdevSnippet />
                </>
              )}
              {udevInstallError && (
                <>
                  <Space h="xs" />
                  <Text size="sm" c="red">
                    {udevInstallError}
                  </Text>
                </>
              )}
              {!udevStatus.isNixos && (
                <>
                  <Space h="sm" />
                  <Button
                    size="xs"
                    loading={installingUdev}
                    onClick={async () => {
                      setInstallingUdev(true);
                      setUdevInstallError(null);
                      try {
                        await installUdevRules();
                        const status = await checkUdevRules();
                        setUdevStatus(status);
                        setUdevInstalledSuccess(true);
                      } catch (e) {
                        setUdevInstallError(String(e));
                      } finally {
                        setInstallingUdev(false);
                      }
                    }}
                  >
                    {t('connect.installUdevRules')}
                  </Button>
                </>
              )}
            </Alert>
          </>
        )}

        {udevStatus?.needsInputGroup && (
          <>
            <Space h="md" />
            <Alert
              variant="light"
              color="blue"
              title={t('connect.inputGroupTitle')}
              icon={<IconAlertTriangle />}
            >
              <Text size="sm">{t('connect.inputGroupDesc')}</Text>
              <Space h="xs" />
              <Group align="flex-start" gap="xs">
                <Code block style={{ flex: 1 }}>
                  sudo usermod -aG input $USER
                </Code>
                <CopyButton value="sudo usermod -aG input $USER">
                  {({ copied, copy }) => (
                    <Button
                      size="xs"
                      variant="default"
                      color={copied ? 'teal' : 'gray'}
                      onClick={copy}
                    >
                      {copied ? t('connect.copied') : t('connect.copy')}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Alert>
          </>
        )}

        {udevInstalledSuccess && (
          <>
            <Space h="md" />
            <Alert
              variant="light"
              color="green"
              title={t('connect.udevRulesInstalledTitle')}
              icon={<IconCheck />}
              withCloseButton
              onClose={() => setUdevInstalledSuccess(false)}
            >
              <Text size="sm">{t('connect.udevRulesInstalledDesc')}</Text>
            </Alert>
          </>
        )}

        {isLinuxWeb && !connected && (
          <>
            <Space h="md" />
            <Alert
              variant="light"
              color="blue"
              title={t('connect.linuxWebUdevTitle')}
              icon={<IconInfoCircle />}
            >
              <Text size="sm">{t('connect.linuxWebUdevDesc')}</Text>
              <Space h="sm" />
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="default"
                  component="a"
                  href="70-santroller.rules"
                  download="70-santroller.rules"
                  leftSection={<IconDownload size={14} />}
                >
                  {t('connect.downloadUdevRules')}
                </Button>
                <Button size="xs" variant="default" onClick={openUdevModal}>
                  {t('connect.udevInstructionsButton')}
                </Button>
              </Group>
            </Alert>
          </>
        )}

        <Space h="md" />
        {navigator.hid && !connected && (
          <Button disabled={updating} onClick={connect}>
            {t('connect.connect')}
          </Button>
        )}
        {/* Only for browsers without WebHID (like Android), as USB works everywhere else */}
        {bluetoothSupported && !navigator.hid && !connected && (
          <>
            <Space h="md" />
            <Button disabled={updating} onClick={connectBluetooth}>
              {t('connect.connectBluetooth')}
            </Button>
          </>
        )}
        {!connected && (
          <>
            <Space h="md" />
            <Button component={Link} to="/setup">
              {t('connect.setup')}
            </Button>
          </>
        )}
        {!connected && simpleMode && (
          <>
            <Space h="md" />
            <Button disabled={updating} variant="default" onClick={openAdvancedModal}>
              {t('connect.advancedMode.button')}
            </Button>
          </>
        )}

        {firmwareNewer && connected && !hung && (
          <Alert
            variant="light"
            color="yellow"
            title={t('connect.firmwareNewerTitle')}
            icon={<IconExclamationCircle />}
          >
            {t('connect.firmwareNewer')}
            {isDesktop && (
              <>
                <Space h="md" />
                <Button component="a" href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
                  {t('connect.getLatestConfigurator')}
                </Button>
              </>
            )}
          </Alert>
        )}

        {!latest && !firmwareNewer && !uf2Required && connected && !hung && (
          <Alert
            variant="light"
            color="red"
            title={t('connect.outdatedTitle')}
            icon={<IconExclamationCircle />}
          >
            {t('connect.outdated')}
            <Space h="md" />
            <Button disabled={updating} onClick={firmwareUpdate}>
              {t('connect.startUpdate')}
            </Button>
            <Progress size="xl" value={updatePercentage} />
            {applyingUpdate && (
              <>
                <Space h="xs" />
                {t('connect.applyingUpdate')}
              </>
            )}
            {updateError && (
              <>
                <Space h="xs" />
                {updateError === 'notApplied'
                  ? t('connect.updateNotApplied')
                  : t('connect.updateNoReconnect')}
              </>
            )}
          </Alert>
        )}

        {uf2Required && connected && !hung && (
          <>
            <Space h="md" />
            <Uf2UpdateAlert flashTooSmall={flashTooSmallForOta} />
          </>
        )}

        <RadioFirmwareAlert />

        {navigator.hid && !isDesktop && (
          <>
            <Space h="md" />
            <DesktopDownloadButton />
          </>
        )}
        {/* for anyone who hasn't moved their controllers over yet */}
        <Space h="md" />
        <Button
          component="a"
          href="https://s1.santroller.com"
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          leftSection={<IconHistory size={18} />}
        >
          {t('connect.santroller1')}
        </Button>
        <Space h="md" />
        <Button
          component="a"
          href="https://discord.gg/CmdYpXKcEU"
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          leftSection={<IconBrandDiscord size={18} />}
        >
          {t('connect.discord')}
        </Button>
      </Layout>
    </>
  );
}
