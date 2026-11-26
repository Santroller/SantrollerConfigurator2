import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { MigrateBackend } from './backend';
import { FlashResult, MigrateScan } from './santroller1';

// The desktop app's side, in src-tauri/src/migrate.rs
export const tauriBackend: MigrateBackend = {
  seesEverything: true,
  readsSavedPresets: true,
  canFlash: () => true,
  scan: () => invoke<MigrateScan>('migrate_scan'),
  watch: (onChange) => {
    void listen('migrate-changed', onChange);
  },
  request: async () => true,
  readSantroller1Config: async (serial) =>
    Uint8Array.from(await invoke<number[]>('s1_read_config', { serial })),
  santroller1Bootloader: (serial) => invoke<void>('s1_bootloader', { serial }),
  readSavedPresets: async () => {
    const data = await invoke<number[] | null>('s1_saved_presets');
    return data ? Uint8Array.from(data) : null;
  },
  backup: (data, name) =>
    invoke<string>('s1_backup_config', data, { headers: { 'x-file-name': name } }),
  flash: async (chip, uf2, driveOnly, onProgress) => {
    const unlisten = onProgress
      ? await listen<number>('flash-progress', ({ payload }) => onProgress(payload))
      : undefined;
    try {
      return await invoke<FlashResult>('flash_uf2', uf2, {
        headers: { 'x-chip': chip, 'x-drive-only': String(driveOnly) },
      });
    } finally {
      unlisten?.();
    }
  },
};
