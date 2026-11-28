import { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, ScrollArea, SimpleGrid, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { deviceCover, DeviceKind, getDeviceCategory, getGroupedDevices } from './deviceRegistry';
import classes from './AddDevicePicker.module.css';

// Every device that can be added, grouped by what it's for and searchable by name or group. Picking one adds
// it straight away.
export function AddDevicePicker({
  kinds,
  onPick,
}: {
  kinds: DeviceKind[];
  onPick: (kind: DeviceKind) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const matches = (kind: DeviceKind) =>
    !search ||
    t(`devices.${kind}`).toLowerCase().includes(search) ||
    t(`add_device_dialog.categories.${getDeviceCategory(kind)}`)
      .toLowerCase()
      .includes(search);
  const groups = getGroupedDevices(kinds.filter(matches), t);
  const found = groups.flatMap((group) => group.items);
  return (
    <Stack gap="sm">
      <TextInput
        data-autofocus
        placeholder={t('add_device_dialog.search')}
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        // With a single match, enter adds it
        onKeyDown={(event) => {
          if (event.key === 'Enter' && found.length === 1) {
            onPick(found[0]);
          }
        }}
      />
      <ScrollArea.Autosize mah="60vh" offsetScrollbars>
        <Stack gap="md">
          {groups.map((group) => (
            <div key={group.category}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>
                {t(`add_device_dialog.categories.${group.category}`)}
              </Text>
              <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="xs">
                {group.items.map((kind) => {
                  const cover = `/${deviceCover(kind)}`;
                  return (
                    <UnstyledButton
                      key={kind}
                      className={classes.tile}
                      onClick={() => onPick(kind)}
                    >
                      <Box
                        className={classes.icon}
                        aria-hidden
                        style={{
                          mask: `url(${cover}) center / contain no-repeat`,
                          WebkitMask: `url(${cover}) center / contain no-repeat`,
                        }}
                      />
                      <Text size="sm" ta="center" lh={1.25}>
                        {t(`devices.${kind}`)}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </SimpleGrid>
            </div>
          ))}
          {!groups.length && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              {t('add_device_dialog.no_results', { query: query.trim() })}
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
