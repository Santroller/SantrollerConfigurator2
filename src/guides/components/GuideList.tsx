import React from 'react';
import { IconTools } from '@tabler/icons-react';
import { List, ThemeIcon } from '@mantine/core';

export interface GuideListProps {
  items: unknown;
  type?: 'unordered' | 'ordered';
  iconColor?: string;
  icon?: React.ReactNode;
  boldAllIfNoColon?: boolean;
}

/**
 * Reusable list for guides (Supplies, Wiring steps, Subsystems, What You'll Be Doing).
 * Automatically handles i18n array lookups (`returnObjects: true`).
 * Bolds everything before the first colon (e.g. `<strong>Title:</strong> detail`).
 * For unordered lists without colons (e.g. supplies), bolds the item by default.
 */
export function GuideList({
  items,
  type = 'unordered',
  iconColor = 'blue',
  icon,
  boldAllIfNoColon = type === 'unordered',
}: GuideListProps) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const defaultIcon = (
    <ThemeIcon color={iconColor} size={20} radius="xl">
      {icon ?? <IconTools size={12} />}
    </ThemeIcon>
  );

  return (
    <List
      type={type}
      spacing="xs"
      size="sm"
      center={type === 'unordered'}
      icon={type === 'unordered' ? defaultIcon : undefined}
    >
      {items.map((rawItem, idx) => {
        const itemStr = String(rawItem);
        const colonIdx = itemStr.indexOf(':');

        if (colonIdx !== -1) {
          const title = itemStr.slice(0, colonIdx);
          const detail = itemStr.slice(colonIdx + 1);
          return (
            <List.Item key={idx}>
              <strong>{title}:</strong>
              {detail}
            </List.Item>
          );
        }

        return (
          <List.Item key={idx}>{boldAllIfNoColon ? <strong>{itemStr}</strong> : itemStr}</List.Item>
        );
      })}
    </List>
  );
}
