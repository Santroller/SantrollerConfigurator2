import { useTranslation } from 'react-i18next';
import { Switch } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';

// Applies to the whole controller on Xbox One / Series, rather than a single profile
export function XboxOneLegacyAdapterSetting() {
  const { t } = useTranslation();
  const legacyAdapter = useConfigStore((state) => state.config.xboxOneLegacyAdapter);
  const updateConfig = useConfigStore((state) => state.updateConfig);
  const updateProfiles = useConfigStore((state) => state.updateProfiles);
  const setLegacyAdapter = (enabled: boolean) => {
    // The adapter stays authenticated by itself, so rules can't hold on to auth with it on
    const profiles = useConfigStore.getState().config.profiles ?? [];
    if (enabled && profiles.some((p) => p.assignments?.some(hasXboxOneAuth))) {
      updateProfiles(
        profiles.map((profile) => ({
          ...profile,
          assignments: profile.assignments?.map((list) =>
            hasXboxOneAuth(list)
              ? { ...list, assignments: list.assignments!.filter((x) => x.xboxOneAuth == null) }
              : list
          ),
        }))
      );
    }
    updateConfig({ xboxOneLegacyAdapter: enabled });
  };
  return (
    <Switch
      label={t('main.xboxOneLegacyAdapter.label')}
      description={t('main.xboxOneLegacyAdapter.description')}
      checked={!!legacyAdapter}
      onChange={(event) => setLegacyAdapter(event.currentTarget.checked)}
    />
  );
}

function hasXboxOneAuth(list: proto.IProfileAssignment) {
  return !!list.assignments?.some((x) => x.xboxOneAuth != null);
}
