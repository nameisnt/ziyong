import { validateInplace } from '@/util/zod';
// SillyTavern exposes this browser runtime module through the extension bundler.
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

type SchemaLike<T> = {
  safeParse: (input: unknown) => { success: true; data: T } | { success: false };
};

export function readMiniGameSettings<T>(field: string, schema: SchemaLike<T>, fallback: () => T): T {
  const result = schema.safeParse(_.get(extension_settings, field, {}));
  return result.success ? result.data : fallback();
}

export function writeMiniGameSettings<T>(field: string, schema: SchemaLike<T>, data: T) {
  _.set(extension_settings, field, validateInplace(schema as never, data));
  void saveSettingsDebounced();
}
