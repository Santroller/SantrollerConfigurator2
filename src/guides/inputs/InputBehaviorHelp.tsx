import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@mantine/core';
import { INPUT_BEHAVIOR_GUIDE } from './inputBehaviorGuide';

// The input behaviour guide in a modal, so help doesn't take people away from what they're editing
export default function InputBehaviorHelp({
  opened,
  onClose,
  stepId,
}: {
  opened: boolean;
  onClose: () => void;
  // Opens on this step, such as the one for the kind of input being edited
  stepId?: string;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(() =>
    Math.max(
      0,
      INPUT_BEHAVIOR_GUIDE.steps.findIndex((x) => x.id === stepId)
    )
  );
  const steps = INPUT_BEHAVIOR_GUIDE.steps;
  const Step = steps[step].render;
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('inputs.input_behavior_help')}
      size="xl"
      // The link is also inside the rule and mapping editors, which are modals too
      zIndex={1000}
    >
      <Step
        nested
        isFirstStep={step === 0}
        isLastStep={step === steps.length - 1}
        onNext={() => setStep((current) => Math.min(current + 1, steps.length - 1))}
        onPrevious={() => setStep((current) => Math.max(current - 1, 0))}
      />
    </Modal>
  );
}
