import { useEffect, useMemo } from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconCpu,
  IconDownload,
  IconExclamationCircle,
  IconHistory,
  IconUpload,
  IconUsb,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Checkbox,
  Code,
  FileButton,
  Group,
  Loader,
  Modal,
  Progress,
  Stack,
  Text,
} from '@mantine/core';
import { desktopOs } from '@/components/DesktopDownload/DesktopDownloadButton';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { isAndroid, WebUsbConfigDevice } from '@/components/SettingsContext/WebUsbConfigDevice';
import { MigrateBackup, useMigrate } from './migrateStore';
import {
  Chip,
  chipForBoard,
  firmwareFileName,
  Santroller1Device,
  SAVED_PRESETS_PATHS,
} from './santroller1';

const SETUP_URL = '/setup?step=overview';

// Offers to put Santroller 2 on Picos: ones waiting in their bootloader, and ones still running
// Santroller 1, bringing their config over. Takes them to the setup guide after. The desktop app
// finds them itself; the website (over WebUSB) has to be shown them first.
export function MigratePrompt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const backend = useMigrate((state) => state.backend);
  const scan = useMigrate((state) => state.scan);
  const flow = useMigrate((state) => state.flow);
  const watch = useMigrate((state) => state.watch);
  const request = useMigrate((state) => state.request);
  const chooseSantroller1 = useMigrate((state) => state.chooseSantroller1);
  const installBootsel = useMigrate((state) => state.installBootsel);
  const connected = useConfigStore((state) => state.connected);

  useEffect(() => {
    watch();
  }, [watch]);

  // The dialog stays put while a controller is connected, as that happens partway through
  if (!backend || connected) {
    return <MigrateModal />;
  }
  const busy = flow.step !== 'idle';
  const toSetup = () => navigate(SETUP_URL);
  const found = !!scan && scan.bootsel.length + scan.santroller1.length > 0;

  return (
    <>
      <MigrateModal />
      {/* Where WebUSB is used for Santroller 2 too, the connect button's chooser covers this */}
      {!backend.seesEverything && !found && !WebUsbConfigDevice.isSupported() && (
        <Alert
          variant="light"
          color="blue"
          mb="md"
          title={t('migrate.web.title')}
          icon={<IconUsb />}
        >
          <Text size="sm">{t('migrate.web.body')}</Text>
          <Button size="xs" mt="sm" disabled={busy} onClick={() => void request()}>
            {t('migrate.web.choose')}
          </Button>
        </Alert>
      )}
      {scan?.bootsel.map((pico, i) => (
        <Alert
          key={`bootsel-${i}`}
          variant="light"
          color="blue"
          mb="md"
          title={t('migrate.bootsel.title')}
          icon={<IconCpu />}
        >
          <Text size="sm">{t(`migrate.bootsel.body.${pico.chip}`)}</Text>
          <Button
            size="xs"
            mt="sm"
            disabled={busy}
            onClick={() => void installBootsel(pico.chip, toSetup)}
          >
            {t('migrate.bootsel.install')}
          </Button>
        </Alert>
      ))}
      {scan?.santroller1.map((device) => (
        <Santroller1Alert
          key={device.serial}
          device={device}
          busy={busy}
          onMove={() => void chooseSantroller1(device)}
        />
      ))}
    </>
  );
}

function Santroller1Alert({
  device,
  busy,
  onMove,
}: {
  device: Santroller1Device;
  busy: boolean;
  onMove: () => void;
}) {
  const { t } = useTranslation();
  if (device.consoleMode) {
    return (
      <Alert
        variant="light"
        color="yellow"
        mb="md"
        title={t('migrate.santroller1.consoleModeTitle')}
        icon={<IconAlertTriangle />}
      >
        <Text size="sm">{t('migrate.santroller1.consoleMode')}</Text>
      </Alert>
    );
  }
  if (device.error) {
    return (
      <Alert
        variant="light"
        color="yellow"
        mb="md"
        title={t('migrate.santroller1.title')}
        icon={<IconAlertTriangle />}
      >
        <Text size="sm">{t('migrate.santroller1.unreadable')}</Text>
        <Code block mt="xs">
          {device.error}
        </Code>
      </Alert>
    );
  }
  if (!chipForBoard(device.board)) {
    return (
      <Alert
        variant="light"
        color="gray"
        mb="md"
        title={t('migrate.santroller1.title')}
        icon={<IconHistory />}
      >
        <Text size="sm">{t('migrate.santroller1.notPico', { board: device.board ?? '?' })}</Text>
      </Alert>
    );
  }
  return (
    <Alert
      variant="light"
      color="blue"
      mb="md"
      title={t('migrate.santroller1.title')}
      icon={<IconHistory />}
    >
      <Text size="sm">{t('migrate.santroller1.body')}</Text>
      <Button size="xs" mt="sm" disabled={busy} onClick={onMove}>
        {t('migrate.santroller1.move')}
      </Button>
    </Alert>
  );
}

function savedPresetsPath() {
  const os = desktopOs();
  return os === 'windows'
    ? SAVED_PRESETS_PATHS.windows
    : os === 'mac'
      ? SAVED_PRESETS_PATHS.macos
      : SAVED_PRESETS_PATHS.linux;
}

// A copy of what was read off the controller, to save if something goes wrong before it's on the
// new firmware
function BackupDownload({ backup }: { backup: MigrateBackup }) {
  const { t } = useTranslation();
  const url = useMemo(
    () => URL.createObjectURL(new Blob([backup.data as BlobPart])),
    [backup.data]
  );
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <Stack gap="xs" mt="xs">
      <Text size="sm">{t('migrate.failed.backup')}</Text>
      {backup.path && <Code block>{backup.path}</Code>}
      <Button
        size="xs"
        variant="default"
        w="fit-content"
        component="a"
        href={url}
        download={backup.name}
        leftSection={<IconDownload size={14} />}
      >
        {t('migrate.failed.downloadBackup')}
      </Button>
    </Stack>
  );
}

function ConnectButton() {
  const { t } = useTranslation();
  const connectByHand = useMigrate((state) => state.connectByHand);
  return (
    <Button size="xs" w="fit-content" onClick={() => void connectByHand()}>
      {t('migrate.progress.connect')}
    </Button>
  );
}

function ManualFlash({ chip, error }: { chip: Chip; error: string }) {
  const { t } = useTranslation();
  const name = firmwareFileName(chip);
  return (
    <Stack gap="sm">
      <Text size="sm">{t(`migrate.manual.body.${chip}`)}</Text>
      {error && (
        <>
          <Text size="xs" c="dimmed">
            {t('migrate.manual.failed')}
          </Text>
          <Code block>{error}</Code>
        </>
      )}
      <Button
        w="fit-content"
        component="a"
        download={name}
        href={`${name}?v=${__CONFIGURATOR_COMMIT__}`}
        leftSection={<IconDownload size={16} />}
      >
        {t('migrate.manual.download')}
      </Button>
      <Text size="sm">{t('migrate.manual.then')}</Text>
      <ConnectButton />
    </Stack>
  );
}

function MigrateModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const backend = useMigrate((state) => state.backend);
  const flow = useMigrate((state) => state.flow);
  const backup = useMigrate((state) => state.backup);
  const toggleSource = useMigrate((state) => state.toggleSource);
  const addPresetsFile = useMigrate((state) => state.addPresetsFile);
  const request = useMigrate((state) => state.request);
  const installSantroller1 = useMigrate((state) => state.installSantroller1);
  const reconnectForImport = useMigrate((state) => state.reconnectForImport);
  const webUsbReconnectNeeded = useConfigStore(
    (state) => state.webUsbReconnectNeeded && !state.hidDevice
  );
  const reconnectWebUsb = useConfigStore((state) => state.reconnectWebUsb);
  const cancel = useMigrate((state) => state.cancel);
  // Stopping halfway through writing the firmware would leave the Pico without any
  const cancellable = flow.step !== 'flashing' && flow.step !== 'importing';

  let content: React.ReactNode = null;
  switch (flow.step) {
    case 'choose':
      content = flow.loading ? (
        <Group gap="sm">
          <Loader size="sm" />
          <Text size="sm">{t('migrate.choose.loading')}</Text>
        </Group>
      ) : (
        <Stack gap="sm">
          <Text size="sm">{t('migrate.choose.intro')}</Text>
          {flow.deviceError && (
            <Alert variant="light" color="yellow" icon={<IconAlertTriangle />}>
              <Text size="sm">{t('migrate.choose.deviceError')}</Text>
              <Code block mt="xs">
                {flow.deviceError}
              </Code>
            </Alert>
          )}
          {flow.sources.length ? (
            <Stack gap="xs">
              {flow.sources.map((source, i) => (
                <Checkbox
                  key={i}
                  checked={source.selected}
                  onChange={() => toggleSource(i)}
                  label={
                    source.fromDevice
                      ? t('migrate.choose.fromDevice')
                      : t('migrate.choose.preset', { name: source.name })
                  }
                />
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              {t('migrate.choose.nothing')}
            </Text>
          )}
          {/* The website can't go looking for Santroller 1's settings, so it's handed them. Santroller 1 had
              no Android configurator, so there are none to hand over there */}
          {!backend?.readsSavedPresets && !isAndroid && (
            <Stack gap={6}>
              <Text size="sm">{t('migrate.choose.presetsFile')}</Text>
              <Code block>{savedPresetsPath()}</Code>
              <FileButton onChange={(file) => void addPresetsFile(file)} accept=".bin">
                {(props) => (
                  <Button
                    {...props}
                    size="xs"
                    variant="default"
                    w="fit-content"
                    leftSection={<IconUpload size={14} />}
                  >
                    {t('migrate.choose.pickPresets')}
                  </Button>
                )}
              </FileButton>
            </Stack>
          )}
          {flow.presetsError && (
            <Alert variant="light" color="yellow" icon={<IconAlertTriangle />}>
              <Text size="sm">{t('migrate.choose.presetsError')}</Text>
              <Code block mt="xs">
                {flow.presetsError}
              </Code>
            </Alert>
          )}
          <Alert variant="light" color="orange" icon={<IconAlertTriangle />}>
            <Text size="sm">{t('migrate.choose.warning')}</Text>
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={cancel}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void installSantroller1(() => navigate(SETUP_URL))}>
              {t('migrate.choose.install')}
            </Button>
          </Group>
        </Stack>
      );
      break;
    case 'bootloader':
    case 'importing':
      content = (
        <Stack gap="sm">
          <Group gap="sm" wrap="nowrap">
            <Loader size="sm" />
            <Text size="sm">{t(`migrate.progress.${flow.step}`)}</Text>
          </Group>
          {/* The restart that applies it needs the controller picked again over WebUSB, and the
              prompt for that elsewhere is behind this dialog */}
          {flow.step === 'importing' && webUsbReconnectNeeded && (
            <>
              <Text size="sm">{t('connect.webUsbReconnect')}</Text>
              <Button w="fit-content" onClick={() => void reconnectWebUsb()}>
                {t('connect.webUsbReconnectButton')}
              </Button>
            </>
          )}
        </Stack>
      );
      break;
    case 'pickBootsel':
      content = (
        <Stack gap="sm">
          <Text size="sm">{t(`migrate.progress.pickBootsel.${flow.chip}`)}</Text>
          <Button w="fit-content" onClick={() => void request(flow.chip)}>
            {t('migrate.progress.pickBootselButton')}
          </Button>
        </Stack>
      );
      break;
    case 'flashing':
      content = (
        <Stack gap="sm">
          <Text size="sm">{t('migrate.progress.flashing')}</Text>
          {flow.progress === undefined ? (
            <Loader size="sm" />
          ) : (
            <Progress value={flow.progress * 100} />
          )}
        </Stack>
      );
      break;
    case 'connecting':
      content = (
        <Stack gap="sm">
          <Group gap="sm" wrap="nowrap">
            <Loader size="sm" />
            <Text size="sm">{t('migrate.progress.connecting')}</Text>
          </Group>
          {flow.showConnect && (
            <>
              <Text size="sm">{t('migrate.progress.connectPrompt')}</Text>
              <ConnectButton />
            </>
          )}
        </Stack>
      );
      break;
    case 'reconnect':
      content = (
        <Stack gap="sm">
          <Text size="sm">{t('migrate.progress.reconnect')}</Text>
          <Button w="fit-content" onClick={() => void reconnectForImport()}>
            {t('migrate.progress.reconnectButton')}
          </Button>
        </Stack>
      );
      break;
    case 'needsMount':
      content = (
        <Stack gap="sm">
          <Group gap="sm" wrap="nowrap">
            <Loader size="sm" />
            <Text size="sm">{t('migrate.mount.waiting')}</Text>
          </Group>
          <Text size="sm">{t(`migrate.mount.body.${flow.chip}`)}</Text>
          {flow.error && (
            <>
              <Text size="xs" c="dimmed">
                {t('migrate.mount.picobootFailed')}
              </Text>
              <Code block>{flow.error}</Code>
            </>
          )}
        </Stack>
      );
      break;
    case 'manual':
      content = <ManualFlash chip={flow.chip} error={flow.error} />;
      break;
    case 'done':
      content = (
        <Stack gap="sm">
          <Alert variant="light" color="teal" icon={<IconCheck />}>
            <Text size="sm">{t('migrate.done.body', { count: flow.imported })}</Text>
          </Alert>
          <Text size="sm">{t('migrate.done.guide')}</Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                cancel();
                navigate(SETUP_URL);
              }}
            >
              {t('migrate.done.openGuide')}
            </Button>
            <Button onClick={cancel}>{t('migrate.done.close')}</Button>
          </Group>
        </Stack>
      );
      break;
    case 'failed':
      content = (
        <Alert variant="light" color="red" icon={<IconExclamationCircle />}>
          <Text size="sm">
            {t(`migrate.failed.${flow.error}`, {
              defaultValue: t('migrate.failed.other', { error: flow.error }),
            })}
          </Text>
          {backup && <BackupDownload backup={backup} />}
          <Text size="sm" mt="xs">
            {t('migrate.failed.manual')}
          </Text>
        </Alert>
      );
      break;
  }

  return (
    <Modal
      opened={flow.step !== 'idle'}
      onClose={cancel}
      withCloseButton={cancellable}
      closeOnClickOutside={false}
      closeOnEscape={cancellable}
      title={t(
        flow.step === 'choose'
          ? 'migrate.choose.title'
          : flow.step === 'done'
            ? 'migrate.done.title'
            : 'migrate.progress.title'
      )}
      centered
    >
      {content}
    </Modal>
  );
}
