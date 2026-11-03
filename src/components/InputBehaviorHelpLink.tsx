import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Anchor } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

// Loaded on demand, as the guide itself renders the Devices and Inputs editors
const InputBehaviorHelp = lazy(() => import('@/guides/inputs/InputBehaviorHelp'));

export function InputBehaviorHelpLink({ stepId }: { stepId?: string }) {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Anchor component="button" type="button" size="xs" mt={4} onClick={open}>
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
