import React, { useMemo, useState } from 'react';
import { IconArrowRight, IconCpu, IconDeviceGamepad2, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Layout } from '@/components/Layout/Layout';
import { useAllGuides, useGuideCategories } from '@/guides/registry';
import { GuideCategory } from '@/guides/types';

export function GuideCatalogPage() {
  const { t } = useTranslation();
  const categories = useGuideCategories();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory | 'all'>('all');

  const allGuides = useAllGuides();

  const filteredGuides = useMemo(() => {
    return allGuides.filter((guide) => {
      const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        guide.title.toLowerCase().includes(q) ||
        guide.description.toLowerCase().includes(q) ||
        guide.subtitle.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [allGuides, selectedCategory, search]);

  return (
    <Layout>
      <Container size="xl" px="md" pb="xl">
        {/* Header */}
        <Stack gap="xs" mb="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Title order={1} size="h2" fw={700}>
                {t('guides.catalogTitle')}
              </Title>
              <Text size="sm" c="dimmed">
                {t('guides.catalogSubtitle')}
              </Text>
            </div>

            <Group gap="xs">
              <Button
                variant="light"
                size="xs"
                color="blue"
                component={Link}
                to="/supported-hardware"
                leftSection={<IconCpu size={14} />}
              >
                {t('nav.supportedHardware', 'Supported Hardware')}
              </Button>
              <Button
                variant="light"
                size="xs"
                color="indigo"
                component={Link}
                to="/compatibility"
                leftSection={<IconDeviceGamepad2 size={14} />}
              >
                {t('nav.compatibility', 'Console Compatibility')}
              </Button>
            </Group>
          </Group>
        </Stack>

        {/* Filter & Search Bar */}
        <Group justify="space-between" align="center" mb="lg" gap="sm">
          <SegmentedControl
            size="xs"
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val as GuideCategory | 'all')}
            data={categories.map((c) => ({
              label: c.label,
              value: c.id,
            }))}
            style={{ overflowX: 'auto', maxWidth: '100%' }}
          />

          <TextInput
            size="xs"
            placeholder={t('guides.searchPlaceholder')}
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 220 }}
          />
        </Group>

        {/* Guides Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredGuides.map((guide) => (
            <Card
              key={guide.id}
              withBorder
              radius="md"
              p="md"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Badge variant="dot" color="blue" size="xs">
                    {t(`guides.categories.${guide.category}`, guide.category)}
                  </Badge>

                  <Text size="xs" c="dimmed">
                    {t('guides.stepCount', { count: guide.steps.length })}
                  </Text>
                </Group>

                <div>
                  <Title order={3} size="h4" fw={600} mb={4}>
                    {t(`guides.${guide.id}.title`, guide.title)}
                  </Title>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {t(`guides.${guide.id}.subtitle`, guide.subtitle)}
                  </Text>
                </div>

                <Text size="xs" lineClamp={3} c="dimmed">
                  {t(`guides.${guide.id}.description`, guide.description)}
                </Text>
              </Stack>

              <Group
                justify="space-between"
                align="center"
                mt="md"
                pt="sm"
                style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
              >
                <Text size="xs" c="dimmed">
                  {t(`guides.${guide.id}.estimatedTime`, guide.estimatedTime)}
                </Text>

                <Button
                  size="xs"
                  variant="subtle"
                  color="blue"
                  rightSection={<IconArrowRight size={14} />}
                  component={Link}
                  to={`/guides/${guide.id}`}
                  px={6}
                >
                  {t('guides.startGuide')}
                </Button>
              </Group>
            </Card>
          ))}
        </SimpleGrid>

        {filteredGuides.length === 0 && (
          <Card withBorder radius="md" p="xl" ta="center">
            <Text c="dimmed" size="sm">
              {t('guides.noGuidesFound', {
                query: search,
              })}
            </Text>
          </Card>
        )}
      </Container>
    </Layout>
  );
}
