import { useTranslation } from 'react-i18next';

// The shared steps that end a build guide, whose text is under guides.finish.steps.<id> whichever
// guide they're in
export const finishTextKey = (id: string) => `guides.finish.steps.${id}`;

export function useFinishText(id: string) {
  const { t } = useTranslation();
  return {
    title: t(`${finishTextKey(id)}.title`),
    description: t(`${finishTextKey(id)}.description`),
  };
}
