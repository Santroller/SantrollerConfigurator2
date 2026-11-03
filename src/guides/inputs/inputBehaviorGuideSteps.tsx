import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core';
import { GuideList } from '../components/GuideList';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import { InputBehaviorKind, InputBehaviorPreview } from './InputBehaviorPreview';

function InputBehaviorStep({
  kind,
  ...props
}: GuideStepProps & { kind: 'intro' | InputBehaviorKind }) {
  const { t } = useTranslation();
  const key = `guides.input-behavior.steps.${kind}`;
  return (
    <StepWorkbench
      title={t(`${key}.title`)}
      description={t(`${key}.description`)}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
      isFirstStep={props.isFirstStep}
      isLastStep={props.isLastStep}
      guideContent={
        <Stack gap="md">
          <Text size="sm">{t(`${key}.intro`)}</Text>
          <Title order={4}>{t('guides.input-behavior.setupTitle')}</Title>
          <GuideList type="ordered" items={t(`${key}.instructions`, { returnObjects: true })} />
          <Alert color="blue" title={t('guides.input-behavior.exampleTitle')}>
            {t(`${key}.example`)}
          </Alert>
          {kind !== 'intro' && <InputBehaviorPreview kind={kind} />}
          <Title order={4}>{t('guides.input-behavior.verifyTitle')}</Title>
          <GuideList items={t(`${key}.checks`, { returnObjects: true })} boldAllIfNoColon={false} />
          <Text size="sm" c="dimmed">
            {t(`${key}.note`)}
          </Text>
          <Group>
            {(kind === 'intro' || kind === 'cycling' || kind === 'toggle') && (
              <Button component={Link} to="/devices" target="_blank" rel="noopener noreferrer">
                {t('guides.input-behavior.openDevices')}
              </Button>
            )}
            <Button
              component={Link}
              to="/profiles"
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
            >
              {t('guides.input-behavior.openProfiles')}
            </Button>
          </Group>
          {!props.nested && <Text size="sm">{t('guides.input-behavior.save')}</Text>}
        </Stack>
      }
    />
  );
}

export function InputBehaviorIntroStep(props: GuideStepProps) {
  return <InputBehaviorStep kind="intro" {...props} />;
}

export function CyclingInputStep(props: GuideStepProps) {
  return <InputBehaviorStep kind="cycling" {...props} />;
}

export function ToggleInputStep(props: GuideStepProps) {
  return <InputBehaviorStep kind="toggle" {...props} />;
}

export function HeldInputStep(props: GuideStepProps) {
  return <InputBehaviorStep kind="held" {...props} />;
}
