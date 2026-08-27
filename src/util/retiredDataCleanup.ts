// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

const retiredFields = [
  'sillytavern_phone_relationships',
  'sillytavern_phone_scene_planner',
  'sillytavern_phone_storylines',
] as const;

export function cleanupRetiredPhoneData() {
  const settings = extension_settings as Record<string, unknown>;
  let changed = false;
  retiredFields.forEach(field => {
    if (!(field in settings)) return;
    delete settings[field];
    changed = true;
  });
  if (changed) void saveSettingsDebounced();
}
