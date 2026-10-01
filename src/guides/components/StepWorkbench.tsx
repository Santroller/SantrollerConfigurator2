import React from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck, IconUsb } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Box, Button, Grid, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

export interface StepWorkbenchProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  description?: string;
  guideContent: React.ReactNode;
  workbenchContent: React.ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isComplete?: boolean;
  onToggleComplete?: () => void;
  nextLabel?: string;
}

export function StepWorkbench({
  title,
  badge,
  badgeColor = 'blue',
  description,
  guideContent,
  workbenchContent,
  onNext,
  onPrevious,
  isFirstStep = false,
  isLastStep = false,
  isComplete = false,
  onToggleComplete,
  nextLabel,
}: StepWorkbenchProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const connect = useConfigStore((state) => state.connect);
  const disconnect = useConfigStore((state) => state.disconnect);
  const updating = useConfigStore((state) => state.updating);

  const effectiveNextLabel = nextLabel ?? t('guides.nextStep');

  return (
    <Stack gap="xl">
      <Grid gap="xl" align="stretch">
        {/* Left Column: Instructions, Documentation & Photos */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="md">
            <div>
              <Group gap="xs" align="center" mb={4}>
                <Title order={2} size="h3">
                  {title}
                </Title>
                {badge && (
                  <Badge color={badgeColor} variant="light" size="sm">
                    {badge}
                  </Badge>
                )}
              </Group>
              {description && (
                <Text c="dimmed" size="sm">
                  {description}
                </Text>
              )}
            </div>

            <Box mt="xs">{guideContent}</Box>
          </Stack>
        </Grid.Col>

        {/* Right Column: Hardware Test Bench & Live Pin Status */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper
            withBorder
            radius="md"
            p="md"
            style={{
              position: 'sticky',
              top: 80,
              backgroundColor: 'var(--mantine-color-body)',
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm">
                  {t('guides.configAndVerification')}
                </Text>

                {connected ? (
                  <Group gap={6}>
                    <Badge
                      leftSection={
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: 'currentColor',
                            display: 'inline-block',
                          }}
                        />
                      }
                      color="teal"
                      variant="light"
                      size="sm"
                    >
                      {t('guides.picoConnectedLive')}
                    </Badge>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="gray"
                      onClick={disconnect}
                      disabled={updating}
                    >
                      {t('guides.disconnect')}
                    </Button>
                  </Group>
                ) : (
                  typeof navigator !== 'undefined' &&
                  'hid' in navigator && (
                    <Button
                      size="xs"
                      variant="light"
                      color="blue"
                      leftSection={<IconUsb size={13} />}
                      onClick={connect}
                      loading={updating}
                    >
                      {t('guides.connectPico')}
                    </Button>
                  )
                )}
              </Group>

              {!connected && (
                <Paper
                  withBorder
                  p="xs"
                  radius="sm"
                  style={{
                    backgroundColor: 'var(--mantine-color-default-hover)',
                  }}
                >
                  <Text size="xs" c="dimmed">
                    {t('guides.plugInPicoPrompt')}
                  </Text>
                </Paper>
              )}

              <Box mt={2}>{workbenchContent}</Box>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Navigation Footer */}
      <Box
        pt="md"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group justify="space-between" align="center">
          <Button
            variant="default"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
            disabled={isFirstStep}
            onClick={onPrevious}
          >
            {t('guides.previous')}
          </Button>

          <Group gap="sm">
            {onToggleComplete && (
              <Button
                variant={isComplete ? 'light' : 'subtle'}
                color={isComplete ? 'teal' : 'gray'}
                size="sm"
                leftSection={isComplete ? <IconCheck size={14} /> : undefined}
                onClick={onToggleComplete}
              >
                {isComplete ? t('guides.completed') : t('guides.markAsDone')}
              </Button>
            )}

            <Button
              color="blue"
              size="sm"
              rightSection={<IconArrowRight size={16} />}
              onClick={onNext}
            >
              {isLastStep ? t('guides.finishGuide') : effectiveNextLabel}
            </Button>
          </Group>
        </Group>
      </Box>
    </Stack>
  );
}
