import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { GuideStepNav } from '@/guides/components/GuideStepNav';
import { DIRECT_PICO_GUITAR_GUIDE } from '@/guides/guitar/guitarGuide';
import { getLocalizedGuide, useGuideById } from '@/guides/registry';
import { useGuideSteps } from '@/guides/useGuideSteps';

export function GuidePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { guideId } = useParams<{ guideId?: string }>();
  const guide = useGuideById(guideId) ?? getLocalizedGuide(DIRECT_PICO_GUITAR_GUIDE, t);

  // Finishing starts the guide over next time and heads back to the catalog
  const { activeStep, currentStep, setStep, stepProps } = useGuideSteps(guide, () => {
    setStep(0);
    navigate('/guides');
  });
  const StepComponent = currentStep.render;

  return (
    <Layout>
      <Container size="xl" px="md" pb="xl">
        {/* Navigation Breadcrumb & Header */}
        <Stack gap="xs" mb="lg">
          <Group justify="space-between" align="center">
            <Button
              component={Link}
              to="/guides"
              variant="subtle"
              size="xs"
              color="gray"
              leftSection={<IconArrowLeft size={14} />}
              px={0}
            >
              {t('guides.backToCatalog')}
            </Button>

            <Text size="xs" c="dimmed">
              {t('guides.stepOf', {
                current: activeStep + 1,
                total: guide.steps.length,
              })}
            </Text>
          </Group>

          <div>
            <Title order={1} size="h3" fw={700}>
              {guide.title}
            </Title>
            <Text size="sm" c="dimmed" mt={2}>
              {guide.subtitle}
            </Text>
          </div>
        </Stack>

        {/* Step Chapters Navigation */}
        <GuideStepNav
          guideId={guide.id}
          steps={guide.steps}
          activeStep={activeStep}
          onStepClick={setStep}
        />

        {/* Active Step Content */}
        <Box mt="md">
          <StepComponent {...stepProps} />
        </Box>
      </Container>
    </Layout>
  );
}
