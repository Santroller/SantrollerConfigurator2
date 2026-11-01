import React, { useEffect, useRef } from 'react';
import { IconCheck, IconCornerDownRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, Group, UnstyledButton } from '@mantine/core';
import { GuideStep } from '../types';

interface GuideStepNavProps {
  guideId: string;
  steps: GuideStep[];
  activeStep: number;
  onStepClick: (stepIndex: number) => void;
}

// A run of steps from a guide running inside this one, shown as one item with its own row of steps
interface StepGroup {
  label: string;
  indices: number[];
}

function StepButton({
  number,
  label,
  isActive,
  isPassed,
  onClick,
}: {
  number: React.ReactNode;
  label: React.ReactNode;
  isActive: boolean;
  isPassed: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // Keeps the current step in view when the row is wider than the screen
  useEffect(() => {
    if (isActive) {
      ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [isActive]);

  return (
    <UnstyledButton
      ref={ref}
      onClick={onClick}
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
        {isPassed ? <IconCheck size={10} stroke={3} /> : number}
      </span>
      <span>{label}</span>
    </UnstyledButton>
  );
}

function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      <Group gap="xs" wrap="nowrap" pb={4} style={{ minWidth: 'max-content' }}>
        {children}
      </Group>
    </Box>
  );
}

// Where the active step is among the top level items, counting a nested guide as one
export function topLevelPosition(steps: GuideStep[], activeStep: number) {
  const starts = steps.filter((step, idx) => !step.group || step.group !== steps[idx - 1]?.group);
  const current = steps
    .slice(0, activeStep + 1)
    .filter((step, idx) => !step.group || step.group !== steps[idx - 1]?.group).length;
  return { current, total: starts.length };
}

export function GuideStepNav({ guideId, steps, activeStep, onStepClick }: GuideStepNavProps) {
  const { t } = useTranslation();
  const label = (step: GuideStep) =>
    t(`guides.${guideId}.steps.${step.id}.shortTitle`, step.shortTitle);

  // Each step on its own, except runs of steps from a nested guide, which become one item
  const items: (number | StepGroup)[] = [];
  steps.forEach((step, idx) => {
    const last = items[items.length - 1];
    if (step.group && typeof last === 'object' && last.label === step.group) {
      last.indices.push(idx);
    } else {
      items.push(step.group ? { label: step.group, indices: [idx] } : idx);
    }
  });
  const activeGroup = items.find(
    (item): item is StepGroup => typeof item === 'object' && item.indices.includes(activeStep)
  );

  return (
    <Box mb="lg">
      <ScrollRow>
        {items.map((item, itemIdx) => {
          if (typeof item === 'number') {
            return (
              <StepButton
                key={steps[item].id}
                number={itemIdx + 1}
                label={label(steps[item])}
                isActive={item === activeStep}
                isPassed={item < activeStep}
                onClick={() => onStepClick(item)}
              />
            );
          }
          const first = item.indices[0];
          const last = item.indices[item.indices.length - 1];
          const done = item.indices.filter((idx) => idx < activeStep).length;
          return (
            <StepButton
              key={steps[first].id}
              number={itemIdx + 1}
              label={`${item.label} ${done}/${item.indices.length}`}
              isActive={item === activeGroup}
              isPassed={last < activeStep}
              // Picks up where the nested guide was left, or starts it
              onClick={() => onStepClick(item === activeGroup ? activeStep : first)}
            />
          );
        })}
      </ScrollRow>
      {activeGroup && (
        <Group gap="xs" wrap="nowrap" mt={6} align="center">
          <IconCornerDownRight
            size={16}
            color="var(--mantine-color-dimmed)"
            style={{ flexShrink: 0 }}
          />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <ScrollRow>
              {activeGroup.indices.map((idx, i) => (
                <StepButton
                  key={steps[idx].id}
                  number={i + 1}
                  label={label(steps[idx])}
                  isActive={idx === activeStep}
                  isPassed={idx < activeStep}
                  onClick={() => onStepClick(idx)}
                />
              ))}
            </ScrollRow>
          </Box>
        </Group>
      )}
    </Box>
  );
}
