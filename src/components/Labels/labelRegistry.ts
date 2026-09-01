import { proto } from '@/components/SettingsContext/config';

export type LabelKind = 'label' | 'ledLabel' | 'matrixLabel' | 'multiplexerLabel';

type LabelDefinition = {
  create: () => Record<string, unknown>;
};

const labelRegistry: Record<LabelKind, LabelDefinition> = {
  label: { create: () => ({ label: 'Label', pin: -1 }) },
  ledLabel: { create: () => ({ label: 'Label', deviceid: -1, activeLed: [] }) },
  matrixLabel: {
    create: () => ({ label: 'Label', deviceid: -1, inputPin: -1, outputPin: -1 }),
  },
  multiplexerLabel: {
    create: () => ({ label: 'Label', deviceid: -1, channel: 0 }),
  },
};

export const labelKinds = Object.keys(labelRegistry) as LabelKind[];

export function createLabelConfig(kind: LabelKind, deviceid: number): proto.IGuiConfig {
  return { deviceid, [kind]: labelRegistry[kind].create() } as proto.IGuiConfig;
}

export function getLabelKind(config: proto.IGuiConfig): LabelKind | undefined {
  return labelKinds.find((kind) => config[kind] != null);
}

export function getNextLabelId(configs: Record<number, proto.IGuiConfig>): number {
  const ids = Object.values(configs).map((config) => config.deviceid);
  return ids.length ? Math.max(...ids) + 1 : 0;
}
