import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Anchor } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

// Loaded on demand, as the guide itself renders the Devices and Inputs editors
const InputBehaviorHelp = lazy(() => import('@/guides/inputs/InputBehaviorHelp'));

// mt is 0 when the link shares a row that already sets the spacing
export function InputBehaviorHelpLink({ stepId, mt = 4 }: { stepId?: string; mt?: number }) {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Anchor component="button" type="button" size="xs" mt={mt} onClick={open}>
        {t('inputs.input_behavior_help')}
      </Anchor>
      {opened && (
        <Suspense fallback={null}>
          <InputBehaviorHelp opened={opened} onClose={close} stepId={stepId} />
        </Suspense>
      )}
    </>
  );
}
