import { SegmentedControl, Input } from '@mantine/core';
import { proto, useConfigStore } from '../SettingsContext/SettingsContext';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';


function FaceButtonMappingMode({ mode, dispatch }: { mode: proto.FaceButtonMappingMode, dispatch: (device: proto.FaceButtonMappingMode) => void }) {
  const { t } = useTranslation();
  const data = [
    { label: t("face_button_mapping_mode.legend_based"), value: proto.FaceButtonMappingMode.LegendBased.toString() },
    { label: t("face_button_mapping_mode.position_based"), value: proto.FaceButtonMappingMode.PositionBased.toString() }
  ]
  return (
    <Input.Wrapper label={t("face_button_mapping_mode.label")} description={t("face_button_mapping_mode.description")}>
      <SegmentedControl
        fullWidth
        data={data}
        value={mode.toString()}
        onChange={(val) => dispatch(Number(val))}
      />
    </Input.Wrapper>
  )
}
export function Settings() {
  const faceButtonMappingMode = useConfigStore((state) => state.config.faceButtonMappingMode);
  const updateConfig = useConfigStore((state) => state.updateConfig);
  return (
    <>
      <FaceButtonMappingMode mode={faceButtonMappingMode} dispatch={(val) => updateConfig({ faceButtonMappingMode: val })} />
    </>
  );
}
