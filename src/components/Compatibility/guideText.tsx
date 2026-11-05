import React from 'react';
import { IconExternalLink } from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { Anchor, Badge, Code, Group, List, Title } from '@mantine/core';

// Shared pieces of the console setup guides on the compatibility page

const RICH: Record<string, React.ReactElement> = {
  strong: <strong />,
  code: <Code />,
};

// Components for an <extlink>...<icon /></extlink> link in the translated text
export function externalLink(href: string): Record<string, React.ReactElement> {
  return {
    extlink: <Anchor href={href} target="_blank" rel="noopener noreferrer" />,
    icon: <IconExternalLink size={12} />,
  };
}

export function Rich({
  i18nKey,
  components,
}: {
  i18nKey: string;
  components?: Record<string, React.ReactElement>;
}) {
  return <Trans i18nKey={i18nKey} components={{ ...RICH, ...components }} />;
}

// Each entry of a translated string array as a List.Item
export function RichItems({
  i18nKey,
  components,
}: {
  i18nKey: string;
  components?: Record<string, React.ReactElement>;
}) {
  const { t } = useTranslation();
  const items = t(i18nKey, { returnObjects: true });
  if (!Array.isArray(items)) {
    return null;
  }
  return (
    <>
      {items.map((_, i) => (
        <List.Item key={i}>
          <Rich i18nKey={`${i18nKey}.${i}`} components={components} />
        </List.Item>
      ))}
    </>
  );
}

// A numbered step heading in a guide
export function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Badge circle size="lg" variant="filled" color="blue" style={{ flexShrink: 0 }}>
        {n}
      </Badge>
      <Title order={4} size="h5">
        {title}
      </Title>
    </Group>
  );
}
