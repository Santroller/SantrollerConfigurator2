import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Flex, Group, Modal, Select, Space, Stack, Text } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import {
  CopyItems,
  copyItemsToProfile,
  defaultSlotChoices,
  getCopiedSlots,
  SlotChoices,
} from './copyToProfile';
import { getProfileSlots } from './inputRegistry';

const LEAVE_OUT = 'leaveOut';

// Copies selected mappings or LEDs to another profile. Slots are numbered per profile, so each
// slot the items read is matched to one of the target's, or the items reading it are left out.
export function CopyToProfileModal({
  opened,
  onClose,
  profileIdx,
  items,
}: {
  opened: boolean;
  onClose: () => void;
  profileIdx: number;
  items: CopyItems;
}) {
  const { t } = useTranslation();
  const profiles = useConfigStore((state) => state.config.profiles!);
  const updateProfile = useConfigStore((state) => state.updateProfile);
  const source = profiles[profileIdx];
  const copyingMappings = !!items.mappings?.length;
  // Standby lighting has no inputs, and a microphone neither inputs nor LEDs
  const targets = profiles.flatMap((profile, idx) =>
    idx === profileIdx ||
    profile.opts.deviceToEmulate === proto.SubType.Microphone ||
    (copyingMappings && profile.opts.standbyLighting)
      ? []
      : [
          {
            value: String(idx),
            label: `${idx + 1}. ${profile.opts.name || t('profileDefaults.name')}`,
          },
        ]
  );
  const [picked, setPicked] = useState<{ target: number; choices: SlotChoices } | null>(null);
  const targetIdx = picked?.target ?? (targets.length ? Number(targets[0].value) : undefined);
  const target = targetIdx == null ? undefined : profiles[targetIdx];
  const slots = useMemo(() => getCopiedSlots(source, items, t), [source, items, t]);
  const targetSlots = useMemo(() => getProfileSlots(target, t), [target, t]);
  const choices = useMemo(
    () => picked?.choices ?? (target ? defaultSlotChoices(source, target, slots) : new Map()),
    [picked, source, target, slots]
  );
  const result = target && copyItemsToProfile(source, target, items, choices);
  const close = () => {
    setPicked(null);
    onClose();
  };
  return (
    <Modal opened={opened} onClose={close} title={t('selection.copyTo.title')} centered>
      {targets.length === 0 ? (
        <Text>{t('selection.copyTo.noTargets')}</Text>
      ) : (
        <Stack gap="sm">
          <Select
            label={t('selection.copyTo.target')}
            data={targets}
            value={String(targetIdx)}
            allowDeselect={false}
            onChange={(value) => {
              const idx = Number(value);
              setPicked({ target: idx, choices: defaultSlotChoices(source, profiles[idx], slots) });
            }}
          />
          {slots.length > 0 && (
            <Text size="sm" c="dimmed">
              {t('selection.copyTo.slotsDesc')}
            </Text>
          )}
          {slots.map((slot) => {
            const options = targetSlots.filter((x) => x.deviceKind === slot.deviceKind);
            const choice = choices.get(slot.key);
            return (
              <Select
                key={slot.key}
                label={t('selection.copyTo.slotFrom', { slot: slot.label })}
                data={[
                  ...options.map((x) => ({ value: String(x.slotId), label: x.label })),
                  { value: LEAVE_OUT, label: t('selection.copyTo.leaveOut') },
                ]}
                value={choice == null ? LEAVE_OUT : String(choice)}
                allowDeselect={false}
                onChange={(value) =>
                  setPicked({
                    target: targetIdx!,
                    choices: new Map(choices).set(
                      slot.key,
                      value === LEAVE_OUT || value == null ? null : Number(value)
                    ),
                  })
                }
              />
            );
          })}
          {result && (
            <Text size="sm">
              {t('selection.copyTo.summary', { count: result.mappings + result.leds })}
              {result.skipped > 0 && ` ${t('selection.copyTo.skipped', { count: result.skipped })}`}
              {result.dropped > 0 && ` ${t('selection.copyTo.dropped', { count: result.dropped })}`}
            </Text>
          )}
        </Stack>
      )}
      <Space h="md" />
      <Flex justify="flex-end">
        <Group align="flex-end">
          <Button
            disabled={!result || result.mappings + result.leds === 0}
            onClick={() => {
              if (result && targetIdx != null) {
                updateProfile(result.profile, targetIdx);
              }
              close();
            }}
          >
            {t('selection.copyTo.confirm')}
          </Button>
          <Button onClick={close}>{t('common.cancel')}</Button>
        </Group>
      </Flex>
    </Modal>
  );
}
