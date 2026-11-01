import { useMemo } from 'react';
import { IconCheck, IconCpu, IconPlug } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { GuideStepNav, topLevelPosition } from '@/guides/components/GuideStepNav';
import { getLocalizedGuide, GUIDE_REGISTRY } from '@/guides/registry';
import { getSetupGuide, withBuildGuide } from '@/guides/setup/setupGuide';
import { useSetupPath } from '@/guides/setup/setupPath';
import { useGuideSteps } from '@/guides/useGuideSteps';

export function SetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const path = useSetupPath((state) => state.path);
  const build = useSetupPath((state) => state.build);
  const guide = useMemo(() => {
    const buildGuide = path === 'fresh' && build ? GUIDE_REGISTRY[build] : undefined;
    return withBuildGuide(
      getLocalizedGuide(getSetupGuide(path, build), t),
      buildGuide && getLocalizedGuide(buildGuide, t),
      build ? t(`guides.setup.build.names.${build}`, '') || undefined : undefined
    );
  }, [t, path, build]);
  // A controller that came from a seller is already configured and mapped. Sellers setting
  // up their own devices don't need telling.
  const sellerName = useConfigStore((state) => state.toolInfo?.name);
  const fromSeller = useConfigStore(
    (state) => state.connected && state.toolInfo != null && !state.seller
  );

  // Finishing starts the guide over next time and heads to the main page
  const { activeStep, currentStep, setStep, stepProps } = useGuideSteps(guide, () => {
    setStep(0);
    navigate('/');
  });
  const StepComponent = currentStep.render;

  return (
    <Layout>
      <Container size="xl" px="md" pb="xl">
        <Stack gap="xs" mb="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Title order={1} size="h3" fw={700}>
                {guide.title}
              </Title>
              <Text size="sm" c="dimmed" mt={2}>
                {guide.subtitle}
              </Text>
            </div>

            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed">
                {t('guides.stepOf', topLevelPosition(guide.steps, activeStep))}
              </Text>
              <Button
                variant="light"
                size="xs"
                component={Link}
                to="/supported-hardware"
                leftSection={<IconCpu size={14} />}
              >
                {t('nav.supportedHardware', 'Supported Hardware')}
              </Button>
              <Button
                variant="subtle"
                size="xs"
                component={Link}
                to="/guides"
                leftSection={<IconPlug size={14} />}
              >
                {t('guides.catalogTitle', 'Build Guides')}
              </Button>
            </Group>
          </Group>
        </Stack>

        {fromSeller && (
          <Alert
            variant="light"
            color="teal"
            radius="md"
            mb="lg"
            icon={<IconCheck />}
            title={t('guides.setup.seller.connectedTitle')}
          >
            <Text size="sm">
              {sellerName
                ? t('guides.setup.seller.connectedNamed', { name: sellerName })
                : t('guides.setup.seller.connected')}
            </Text>
            <Button component={Link} to="/" size="xs" mt="sm">
              {t('guides.setup.seller.goToMain')}
            </Button>
          </Alert>
        )}

        <GuideStepNav
          guideId={guide.id}
          steps={guide.steps}
          activeStep={activeStep}
          onStepClick={setStep}
        />

        <Box mt="md">
          <StepComponent {...stepProps} />
        </Box>
      </Container>
    </Layout>
  );
}
