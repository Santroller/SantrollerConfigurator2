import React, { useEffect, useState } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Box, Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { GuideStepNav } from '@/guides/components/GuideStepNav';
import { DIRECT_PICO_GUITAR_GUIDE } from '@/guides/guitar/guitarGuide';
import { getGuideById } from '@/guides/registry';

export function GuidePage() {
  const { t } = useTranslation();
  const { guideId } = useParams<{ guideId?: string }>();
  const guide = getGuideById(guideId) ?? DIRECT_PICO_GUITAR_GUIDE;

  const storageKey = `santroller_guide_step_${guide.id}`;

  const [activeStep, setActiveStep] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`santroller_guide_step_${guide.id}`);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < guide.steps.length) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return 0;
  });

  // Reset or load step when guideId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`santroller_guide_step_${guide.id}`);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < guide.steps.length) {
          setActiveStep(parsed);
          return;
        }
      }
    } catch {
      // Ignore storage errors
    }
    setActiveStep(0);
  }, [guide.id, guide.steps.length]);

  const handleStepChange = (nextStep: number) => {
    const clamped = Math.max(0, Math.min(guide.steps.length - 1, nextStep));
    setActiveStep(clamped);
    try {
      localStorage.setItem(storageKey, String(clamped));
    } catch {
      // Ignore storage errors
    }
  };

  const currentStep = guide.steps[activeStep] ?? guide.steps[0];
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
              {t(`guides.${guide.id}.title`, guide.title)}
            </Title>
            <Text size="sm" c="dimmed" mt={2}>
              {t(`guides.${guide.id}.subtitle`, guide.subtitle)}
            </Text>
          </div>
        </Stack>

        {/* Step Chapters Navigation */}
        <GuideStepNav
          guideId={guide.id}
          steps={guide.steps}
          activeStep={activeStep}
          onStepClick={handleStepChange}
        />

        {/* Active Step Content */}
        <Box mt="md">
          <StepComponent
            isFirstStep={activeStep === 0}
            isLastStep={activeStep === guide.steps.length - 1}
            onNext={() => handleStepChange(activeStep + 1)}
            onPrevious={() => handleStepChange(activeStep - 1)}
          />
        </Box>
      </Container>
    </Layout>
  );
}
