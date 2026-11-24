import { IconArrowDown } from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Anchor, Badge, Container, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';

const K = 'profilesExplained';
const strong = { strong: <strong /> };

// The sidebar order example, top first
const ORDER_EXAMPLE = ['festival', 'guitar'] as const;
const ISSUES = ['neverUsed', 'holdButton', 'twoControllers'] as const;

export function ProfilesExplainedPage() {
  const { t } = useTranslation();
  return (
    <Layout>
      <Container size="sm" px="md" pb="xl">
        <Stack gap="xl">
          <div>
            <Title order={1} size="h2">
              {t(`${K}.title`)}
            </Title>
            <Text mt="xs">
              <Trans i18nKey={`${K}.intro`} components={strong} />
            </Text>
          </div>

          <Stack gap="sm">
            <Title order={2} size="h4">
              {t(`${K}.order.title`)}
            </Title>
            <Text>
              <Trans i18nKey={`${K}.order.body`} components={strong} />
            </Text>
            <Stack gap={4} maw={360}>
              {ORDER_EXAMPLE.map((key, i) => (
                <Stack key={key} gap={4} align="center">
                  {i > 0 && <IconArrowDown size={16} color="var(--mantine-color-dimmed)" />}
                  <Paper withBorder radius="md" p="sm" w="100%">
                    <Group justify="space-between" wrap="nowrap">
                      <Text fw={600}>{t(`${K}.order.example.${key}.name`)}</Text>
                      <Badge variant="light" color="gray">
                        {i + 1}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {t(`${K}.order.example.${key}.rule`)}
                    </Text>
                  </Paper>
                </Stack>
              ))}
            </Stack>
            <Text size="sm" c="dimmed">
              {t(`${K}.order.caption`)}
            </Text>
          </Stack>

          <Stack gap="sm">
            <Title order={2} size="h4">
              {t(`${K}.issues.title`)}
            </Title>
            {ISSUES.map((key) => (
              <Paper key={key} withBorder radius="md" p="md">
                <Text fw={600}>{t(`${K}.issues.${key}.problem`)}</Text>
                <Text size="sm" mt={4}>
                  <Trans i18nKey={`${K}.issues.${key}.fix`} components={strong} />
                </Text>
              </Paper>
            ))}
          </Stack>

          <Text size="sm" c="dimmed">
            <Trans
              i18nKey={`${K}.more`}
              components={{ guideLink: <Anchor component={Link} to="/setup?step=assignments" /> }}
            />
          </Text>
        </Stack>
      </Container>
    </Layout>
  );
}
