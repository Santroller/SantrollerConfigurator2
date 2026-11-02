import { createContext, useState } from 'react';
import type { Modifier } from '@dnd-kit/core';
import { getEventCoordinates } from '@dnd-kit/utilities';
import {
  IconArrowBarToLeft,
  IconArrowBarToRight,
  IconSquare,
  IconSquareCheck,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  ActionIconProps,
  Badge,
  Button,
  Card,
  Checkbox,
  Flex,
  Group,
  Modal,
  Space,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { reorderIndexes } from './groupOrder';
import classes from './Selection.module.css';

// Selected cards get a thicker accent border, so the selection reads at a glance
export const selectedCardStyle: React.CSSProperties = {
  borderColor: 'var(--mantine-primary-color-filled)',
  boxShadow: '0 0 0 1px var(--mantine-primary-color-filled)',
};

// For cards that select when their background is clicked
export const selectableCardStyle: React.CSSProperties = { cursor: 'pointer' };

const checkboxClasses = { input: classes.selectInput, label: classes.selectLabel };

// Clicking a card's background toggles its selection. Clicks on its controls don't, and neither
// do clicks in dropdowns, which are portalled outside the card but still bubble up to it in React.
export function toggleOnBackgroundClick(
  e: React.MouseEvent<HTMLElement>,
  selected: boolean,
  onSelect: (selected: boolean) => void
) {
  const target = e.target as HTMLElement;
  if (
    !e.currentTarget.contains(target) ||
    target.closest('input, textarea, select, button, a, label, [role="combobox"]') ||
    // finishing a drag to select text
    window.getSelection()?.toString()
  ) {
    return;
  }
  onSelect(!selected);
}

// A toggle beside a card's other actions. Filled when selected, and by default when not, so it
// stands out next to filled actions; cards with subtle actions pass that variant instead.
export function SelectToggle({
  selected,
  onSelect,
  variant = 'filled',
}: {
  selected: boolean;
  onSelect: (selected: boolean) => void;
  variant?: ActionIconProps['variant'];
}) {
  const { t } = useTranslation();
  const Icon = selected ? IconSquareCheck : IconSquare;
  return (
    <ActionIcon
      variant={selected ? 'filled' : variant}
      color={selected ? undefined : 'gray'}
      aria-label={t('selection.select')}
      aria-pressed={selected}
      title={t('selection.select')}
      onClick={() => onSelect(!selected)}
    >
      <Icon style={{ width: '70%', height: '70%' }} />
    </ActionIcon>
  );
}

// Which cards of a list are selected, by index. Switching to another scope (eg profile) clears it,
// as does the list changing length other than by one card added to the end, since the indexes no
// longer line up. Moves and deletes go through `reorder` to keep the selection on the same cards.
export function useIndexSelection(scope: unknown, count: number) {
  const [state, setState] = useState({ scope, count, selected: new Set<number>() });
  let { selected } = state;
  if (state.scope !== scope || state.count !== count) {
    selected = state.scope === scope && count === state.count + 1 ? selected : new Set();
    setState({ scope, count, selected });
  }
  const indexes = [...selected].sort((a, b) => a - b);
  return {
    selected: indexes,
    isSelected: (idx: number) => selected.has(idx),
    select: (idx: number, on: boolean) =>
      setState((prev) => {
        const next = new Set(prev.selected);
        if (on) {
          next.add(idx);
        } else {
          next.delete(idx);
        }
        return { ...prev, selected: next };
      }),
    selectAll: (on: boolean) =>
      setState((prev) => ({
        ...prev,
        selected: new Set(on ? [...Array(prev.count).keys()] : []),
      })),
    // Call before applying the order to the list
    reorder: (order: number[]) =>
      setState((prev) => ({
        ...prev,
        count: order.length,
        selected: reorderIndexes(prev.selected, order),
      })),
  };
}

// Lets cards rendered deep in a page select themselves by id, where the page provides it
export const IdSelectionContext = createContext<
  { isSelected: (id: string) => boolean; select: (id: string, on: boolean) => void } | undefined
>(undefined);

// Select all, how many are selected, and what can be done with them
export function SelectionBar({
  total,
  selected,
  onSelectAll,
  onMoveToStart,
  onMoveToEnd,
  onDelete,
  deleteTitle,
  deleteDesc,
  children,
  sticky = true,
}: {
  total: number;
  selected: number;
  onSelectAll: (all: boolean) => void;
  onMoveToStart?: () => void;
  onMoveToEnd?: () => void;
  onDelete?: () => void;
  // Translated, and given the count
  deleteTitle?: string;
  deleteDesc?: string;
  // More actions for the selection
  children?: React.ReactNode;
  // Off where it's put in something that already sticks, like a section's sticky header
  sticky?: boolean;
}) {
  const { t } = useTranslation();
  const [deleteOpened, deleteModal] = useDisclosure(false);
  if (!total) {
    return null;
  }
  return (
    <>
      <Modal
        opened={deleteOpened}
        onClose={deleteModal.close}
        title={deleteTitle ?? t('selection.deleteTitle')}
        centered
      >
        {deleteDesc ?? t('selection.deleteDesc', { count: selected })}
        <Space h="md" />
        <Flex justify="flex-end">
          <Group align="flex-end">
            <Button
              color="red"
              onClick={() => {
                onDelete?.();
                deleteModal.close();
              }}
            >
              {t('selection.deleteConfirm')}
            </Button>
            <Button onClick={deleteModal.close}>{t('common.cancel')}</Button>
          </Group>
        </Flex>
      </Modal>
      <Group gap="sm" className={sticky ? classes.sticky : classes.inline}>
        <Checkbox
          size="md"
          classNames={checkboxClasses}
          label={t('selection.selectAll')}
          checked={selected === total}
          indeterminate={selected > 0 && selected < total}
          onChange={(e) => onSelectAll(e.currentTarget.checked)}
        />
        {selected > 0 && (
          <>
            <Text size="sm" c="dimmed">
              {t('selection.selected', { count: selected })}
            </Text>
            {onMoveToStart && (
              <Button
                size="xs"
                variant="light"
                leftSection={<IconArrowBarToLeft size={14} />}
                onClick={onMoveToStart}
              >
                {t('selection.moveToStart')}
              </Button>
            )}
            {onMoveToEnd && (
              <Button
                size="xs"
                variant="light"
                leftSection={<IconArrowBarToRight size={14} />}
                onClick={onMoveToEnd}
              >
                {t('selection.moveToEnd')}
              </Button>
            )}
            {children}
            {onDelete && (
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={deleteModal.open}
              >
                {t('selection.delete')}
              </Button>
            )}
          </>
        )}
      </Group>
    </>
  );
}

// Where the pointer sits on the group preview, from its top left corner
const PREVIEW_GRIP_OFFSET = 16;

// Keeps the group preview under the pointer. The overlay starts at the dragged card's top left,
// and the preview is much smaller than the card, so it would otherwise float away from where the
// card was grabbed.
export const anchorPreviewToPointer: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  const start = activatorEvent && getEventCoordinates(activatorEvent);
  // Keyboard drags have no pointer to follow
  if (!start || !draggingNodeRect) {
    return transform;
  }
  return {
    ...transform,
    x: transform.x + start.x - draggingNodeRect.left - PREVIEW_GRIP_OFFSET,
    y: transform.y + start.y - draggingNodeRect.top - PREVIEW_GRIP_OFFSET,
  };
};

// Follows the pointer while a group of selected cards is dragged, as a stack of what's being moved
export function GroupDragPreview({ titles }: { titles: string[] }) {
  const { t } = useTranslation();
  const shown = titles.slice(0, 4);
  return (
    <div className={classes.dragStack} data-stacked={titles.length > 1 || undefined}>
      <Card shadow="md" padding="md" radius="md" withBorder style={selectedCardStyle}>
        <Group justify="space-between" wrap="nowrap" mb="xs">
          <Text fw={600}>{t('selection.moving', { count: titles.length })}</Text>
          <Badge>{titles.length}</Badge>
        </Group>
        <Stack gap={2}>
          {shown.map((title) => (
            <Text key={title} size="sm" c="dimmed" truncate>
              {title}
            </Text>
          ))}
          {titles.length > shown.length && (
            <Text size="sm" c="dimmed">
              {t('selection.andMore', { count: titles.length - shown.length })}
            </Text>
          )}
        </Stack>
      </Card>
    </div>
  );
}
