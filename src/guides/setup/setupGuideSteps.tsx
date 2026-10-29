import {
  IconAdjustments,
  IconAlertTriangle,
  IconBolt,
  IconBulb,
  IconCheck,
  IconCpu,
  IconDeviceFloppy,
  IconDeviceGamepad3,
  IconDownload,
  IconExclamationCircle,
  IconFileExport,
  IconInfoCircle,
  IconListCheck,
  IconMoon,
  IconPlug,
} from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  List,
  NavLink,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { Uf2UpdateAlert } from '@/components/Uf2Update/Uf2UpdateAlert';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';

const strong = { strong: <strong /> };

const CONCEPT_CARDS = [
  { key: 'firmware', color: 'blue', Icon: IconBolt },
  { key: 'devices', color: 'teal', Icon: IconCpu },
  { key: 'profiles', color: 'violet', Icon: IconAdjustments },
  { key: 'assignments', color: 'orange', Icon: IconListCheck },
] as const;

// One or more of the original getting started steps, each a title and a body
function StepSections({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  return (
    <Stack gap="md">
      {keys.map((key) => (
        <div key={key}>
          <Title order={4} mb={4}>
            {t(`gettingStarted.steps.${key}.title`)}
          </Title>
          <Text size="sm">
            <Trans i18nKey={`gettingStarted.steps.${key}.body`} components={strong} />
          </Text>
        </div>
      ))}
    </Stack>
  );
}

function GoodToKnow({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  return (
    <Accordion variant="separated" radius="md" multiple>
      {keys.map((key) => (
        <Accordion.Item key={key} value={key}>
          <Accordion.Control icon={<IconBulb size={16} />}>
            <Text size="sm" fw={600}>
              {t(`gettingStarted.goodToKnow.${key}.title`)}
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="sm">
              <Trans i18nKey={`gettingStarted.goodToKnow.${key}.body`} components={strong} />
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

function Troubleshooting({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  return (
    <Alert
      icon={<IconAlertTriangle size={18} />}
      title={t('gettingStarted.troubleshooting.title')}
      color="orange"
      radius="md"
    >
      <List size="sm" spacing="xs">
        {keys.map((key) => (
          <List.Item key={key}>
            <Trans i18nKey={`gettingStarted.troubleshooting.items.${key}`} components={strong} />
          </List.Item>
        ))}
      </List>
    </Alert>
  );
}

function useStepText(id: string) {
  const { t } = useTranslation();
  return {
    title: t(`guides.setup.steps.${id}.title`),
    description: t(`guides.setup.steps.${id}.description`),
  };
}

export function SetupOverviewStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Title order={4}>{t('gettingStarted.concepts.title')}</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {CONCEPT_CARDS.map(({ key, color, Icon }) => (
          <Card key={key} withBorder radius="md" p="md">
            <ThemeIcon color={color} variant="light" size="lg" radius="md" mb="xs">
              <Icon size={20} />
            </ThemeIcon>
            <Title order={5} mb={4}>
              {t(`gettingStarted.concepts.${key}.title`)}
            </Title>
            <Text size="xs" c="dimmed">
              <Trans i18nKey={`gettingStarted.concepts.${key}.body`} components={strong} />
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="md">
      <div>
        <Text fw={700} size="sm" mb="xs">
          {t('guides.setup.workbench.needTitle')}
        </Text>
        <GuideList
          boldAllIfNoColon={false}
          items={t('guides.setup.workbench.needItems', { returnObjects: true })}
        />
      </div>
      <Alert
        variant="light"
        color="blue"
        title={t('guides.setup.seller.tipTitle')}
        icon={<IconInfoCircle size={18} />}
      >
        <Text size="sm">{t('guides.setup.seller.tip')}</Text>
      </Alert>
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useStepText('overview')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
    />
  );
}

export function SetupFlashStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Alert
        variant="light"
        color="red"
        title={t('connect.sellerWarningTitle', 'Note')}
        icon={<IconExclamationCircle />}
      >
        {t('connect.sellerWarning')}
      </Alert>
      <Text size="sm">
        <Trans i18nKey="gettingStarted.steps.flash.body" components={strong} />
      </Text>
      <Alert
        variant="light"
        color="blue"
        title={t('gettingStarted.santroller1.title')}
        icon={<IconInfoCircle size={18} />}
      >
        <Text size="sm">{t('gettingStarted.santroller1.body')}</Text>
      </Alert>
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="xs">
      <Text fw={700} size="sm">
        {t('guides.setup.workbench.downloadTitle')}
      </Text>
      <Button
        component="a"
        download="santroller_pico1.uf2"
        href={`santroller_pico1.uf2?v=${__CONFIGURATOR_COMMIT__}`}
        target="_blank"
        leftSection={<IconDownload size={16} />}
      >
        {t('connect.downloadPico1')}
      </Button>
      <Button
        component="a"
        download="santroller_pico2.uf2"
        href={`santroller_pico2.uf2?v=${__CONFIGURATOR_COMMIT__}`}
        target="_blank"
        leftSection={<IconDownload size={16} />}
      >
        {t('connect.downloadPico2')}
      </Button>
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useStepText('flash')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
    />
  );
}

export function SetupWireStep(props: GuideStepProps) {
  const { t } = useTranslation();

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">
        <Trans i18nKey="gettingStarted.steps.wire.body" components={strong} />
      </Text>
      <GoodToKnow keys={['peripherals']} />
    </Stack>
  );

  const workbenchContent = (
    <Stack gap="xs">
      <Button component={Link} to="/guides" leftSection={<IconPlug size={16} />}>
        {t('gettingStarted.links.guides')}
      </Button>
      <Button
        component={Link}
        to="/supported-hardware"
        variant="light"
        leftSection={<IconCpu size={16} />}
      >
        {t('nav.supportedHardware', 'Supported Hardware')}
      </Button>
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useStepText('wire')}
      guideContent={guideContent}
      workbenchContent={workbenchContent}
    />
  );
}

export function SetupConnectStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const hung = useConfigStore((state) => state.hung);
  const latest = useConfigStore((state) => state.latest);
  const firmwareNewer = useConfigStore((state) => state.firmwareNewer);
  const updating = useConfigStore((state) => state.updating);
  const updatePercentage = useConfigStore((state) => state.updatePercentage);
  const applyingUpdate = useConfigStore((state) => state.applyingUpdate);
  const firmwareUpdate = useConfigStore((state) => state.firmwareUpdate);
  const bootloaderOutdated = useConfigStore((state) => state.bootloaderOutdated);
  const slowBootStage = useConfigStore((state) => state.slowBootStage);

  const guideContent = (
    <Stack gap="md">
      <StepSections keys={['connect', 'update']} />
      <GoodToKnow keys={['desktopApp', 'simpleMode']} />
      <Troubleshooting keys={['notFound', 'linux', 'newerFirmware']} />
    </Stack>
  );

  // The main page has the full set of update messages; this covers the common case
  const workbenchContent = connected && !hung && (
    <>
      {bootloaderOutdated || slowBootStage ? (
        <Uf2UpdateAlert />
      ) : !latest && !firmwareNewer ? (
        <Alert
          variant="light"
          color="red"
          title={t('connect.outdatedTitle')}
          icon={<IconExclamationCircle />}
        >
          <Stack gap="xs">
            <Text size="sm">{t('connect.outdated')}</Text>
            <Button disabled={updating} onClick={firmwareUpdate}>
              {t('connect.startUpdate')}
            </Button>
            <Progress size="xl" value={updatePercentage} />
            {applyingUpdate && <Text size="sm">{t('connect.applyingUpdate')}</Text>}
          </Stack>
        </Alert>
      ) : (
        <Alert variant="light" color="teal" icon={<IconCheck />}>
          {t('guides.setup.workbench.upToDate')}
        </Alert>
      )}
    </>
  );

  return (
    <StepWorkbench
      {...props}
      {...useStepText('connect')}
      guideContent={guideContent}
      workbenchContent={workbenchContent || <></>}
    />
  );
}

export function SetupDevicesStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const deviceCount = useConfigStore((state) => Object.keys(state.deviceStatus).length);

  const guideContent = (
    <Stack gap="md">
      <StepSections keys={['devices']} />
      <GoodToKnow keys={['peripherals', 'labels']} />
    </Stack>
  );

  const workbenchContent = connected && (
    <Stack gap="xs">
      <Text size="sm">{t('guides.setup.workbench.deviceCount', { count: deviceCount })}</Text>
      <Button component={Link} to="/devices" leftSection={<IconCpu size={16} />}>
        {t('guides.setup.workbench.openDevices')}
      </Button>
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useStepText('devices')}
      guideContent={guideContent}
      workbenchContent={workbenchContent || <></>}
    />
  );
}

export function SetupProfileStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const connected = useConfigStore((state) => state.connected);
  const profiles = useConfigStore((state) => state.config.profiles);
  const activeProfiles = useConfigStore((state) => state.activeProfiles);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const addProfile = useConfigStore((state) => state.addProfile);

  const guideContent = <StepSections keys={['profile', 'inputs', 'leds']} />;

  const workbenchContent = connected && (
    <Stack gap="xs">
      <Text fw={700} size="sm">
        {t('guides.setup.workbench.profilesTitle')}
      </Text>
      <Stack gap={0}>
        {(profiles ?? []).map((profile, i) => (
          <NavLink
            key={profile.opts?.uid ?? i}
            label={profile.opts?.name}
            leftSection={<IconDeviceGamepad3 size={16} stroke={1.5} />}
            rightSection={
              activeProfiles?.includes(profile.opts?.uid ?? -1) && (
                <Badge>{t('main.profile_active', 'Active')}</Badge>
              )
            }
            onClick={() => {
              setActiveProfile(i.toString(), 0);
              navigate('/profiles');
            }}
          />
        ))}
      </Stack>
      <Button variant="light" onClick={addProfile}>
        {t('guides.setup.workbench.addProfile')}
      </Button>
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useStepText('profile')}
      guideContent={guideContent}
      workbenchContent={workbenchContent || <></>}
    />
  );
}

export function SetupStandbyStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const connected = useConfigStore((state) => state.connected);
  const profiles = useConfigStore((state) => state.config.profiles);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const addStandbyProfile = useConfigStore((state) => state.addStandbyProfile);
  const standbyIdx = (profiles ?? []).findIndex((profile) => profile.opts?.standbyLighting);

  const guideContent = <StepSections keys={['standby', 'standbyWake']} />;

  const openStandby = (idx: number) => {
    setActiveProfile(idx.toString(), 0);
    navigate('/profiles');
  };
  const workbenchContent = connected && (
    <Stack gap="xs">
      {standbyIdx !== -1 ? (
        <Button
          variant="light"
          leftSection={<IconMoon size={16} />}
          onClick={() => openStandby(standbyIdx)}
        >
          {t('guides.setup.workbench.openStandby')}
        </Button>
      ) : (
        <Button
          variant="light"
          leftSection={<IconMoon size={16} />}
          onClick={() => {
            addStandbyProfile();
            // It's added at the end, where it always stays
            openStandby(useConfigStore.getState().config.profiles!.length - 1);
          }}
        >
          {t('nav.addStandbyLighting')}
        </Button>
      )}
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useStepText('standby')}
      guideContent={guideContent}
      workbenchContent={workbenchContent || <></>}
    />
  );
}

export function SetupSaveStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const configModified = useConfigStore((state) => state.configModified);
  const updating = useConfigStore((state) => state.updating);
  const hung = useConfigStore((state) => state.hung);
  const commitConfig = useConfigStore((state) => state.commitConfig);
  const exportConfig = useConfigStore((state) => state.exportConfig);

  const guideContent = (
    <Stack gap="md">
      <StepSections keys={['save', 'backup']} />
      <Alert
        icon={<IconDeviceFloppy size={18} />}
        title={t('gettingStarted.saveReminder.title')}
        color="blue"
        radius="md"
      >
        <Text size="sm">
          <Trans i18nKey="gettingStarted.saveReminder.body" components={strong} />
        </Text>
      </Alert>
      <Troubleshooting keys={['notResponding', 'profileInactive', 'lostChanges']} />
    </Stack>
  );

  const workbenchContent = connected && (
    <Stack gap="xs">
      {configModified ? (
        <Button
          disabled={updating || hung}
          onClick={commitConfig}
          leftSection={<IconDeviceFloppy size={16} />}
        >
          {t('save.saveChanges', 'Save changes')}
        </Button>
      ) : (
        <Alert variant="light" color="teal" icon={<IconCheck />}>
          {t('guides.setup.workbench.allSaved')}
        </Alert>
      )}
      <Button
        variant="light"
        disabled={updating || hung}
        onClick={exportConfig}
        leftSection={<IconFileExport size={16} />}
      >
        {t('connect.export')}
      </Button>
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useStepText('save')}
      guideContent={guideContent}
      workbenchContent={workbenchContent || <></>}
    />
  );
}
