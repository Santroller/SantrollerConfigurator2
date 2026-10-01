import React from 'react';
import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, Group, UnstyledButton } from '@mantine/core';
import { GuideStep } from '../types';

interface GuideStepNavProps {
  guideId: string;
  steps: GuideStep[];
  activeStep: number;
  onStepClick: (stepIndex: number) => void;
}

export function GuideStepNav({ guideId, steps, activeStep, onStepClick }: GuideStepNavProps) {
  const { t } = useTranslation();

  return (
    <Box
      mb="lg"
      style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      <Group
        gap="xs"
        wrap="nowrap"
        pb={4}
        style={{
          minWidth: 'max-content',
        }}
      >
        {steps.map((step, idx) => {
          const isActive = idx === activeStep;
          const isPassed = idx < activeStep;
          const label = t(`guides.${guideId}.steps.${step.id}.shortTitle`, step.shortTitle);

          return (
            <UnstyledButton
              key={step.id}
              onClick={() => onStepClick(idx)}
              style={(theme) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: theme.radius.sm,
                fontSize: theme.fontSizes.xs,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isActive
                  ? 'var(--mantine-color-blue-filled)'
                  : isPassed
                    ? 'var(--mantine-color-default-hover)'
                    : 'transparent',
                color: isActive
                  ? '#ffffff'
                  : isPassed
                    ? 'var(--mantine-color-text)'
                    : 'var(--mantine-color-dimmed)',
                border: isActive
                  ? '1px solid transparent'
                  : '1px solid var(--mantine-color-default-border)',
                '&:hover': {
                  backgroundColor: isActive
                    ? 'var(--mantine-color-blue-filled-hover)'
                    : 'var(--mantine-color-default-hover)',
                  color: 'var(--mantine-color-text)',
                },
              })}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: isActive
                    ? 'rgba(255, 255, 255, 0.25)'
                    : isPassed
                      ? 'var(--mantine-color-teal-filled)'
                      : 'var(--mantine-color-default-border)',
                  color: isActive || isPassed ? '#ffffff' : 'inherit',
                }}
              >
                {isPassed ? <IconCheck size={10} stroke={3} /> : idx + 1}
              </span>
              <span>{label}</span>
            </UnstyledButton>
          );
        })}
      </Group>
    </Box>
  );
}
