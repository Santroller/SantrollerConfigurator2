import React from 'react';
import { IconTools } from '@tabler/icons-react';
import { List, ThemeIcon } from '@mantine/core';

// An item can carry sub-steps, as { text, items: [...] }
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
        if (rawItem && typeof rawItem === 'object' && 'text' in rawItem) {
          const { text, items: subItems } = rawItem as { text: string; items?: unknown };
          const colon = String(text).indexOf(':');
          return (
            <List.Item key={idx}>
              {colon === -1 ? (
                text
              ) : (
                <>
                  <strong>{text.slice(0, colon)}:</strong>
                  {text.slice(colon + 1)}
                </>
              )}
              {Array.isArray(subItems) && (
                <List type="unordered" withPadding size="sm" spacing={4} mt={4}>
                  {subItems.map((sub, subIdx) => {
                    const subStr = String(sub);
                    const subColon = subStr.indexOf(':');
                    return (
                      <List.Item key={subIdx}>
                        {subColon === -1 ? (
                          subStr
                        ) : (
                          <>
                            <strong>{subStr.slice(0, subColon)}:</strong>
                            {subStr.slice(subColon + 1)}
                          </>
                        )}
                      </List.Item>
                    );
                  })}
                </List>
              )}
            </List.Item>
          );
        }
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
