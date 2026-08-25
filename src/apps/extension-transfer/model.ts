import { z } from 'zod';

export type ExtensionScope = 'local' | 'global';

export interface ExtensionManifestItem {
  branch: string;
  name: string;
  scope: ExtensionScope;
  url: string;
}

const extensionManifestItemSchema = z
  .object({
    branch: z.string().nullish(),
    global: z.boolean().optional(),
    name: z.string().trim().min(1),
    scope: z.enum(['local', 'global']).optional(),
    url: z.string().nullish(),
  })
  .passthrough();

const extensionManifestSchema = z.union([
  z.array(extensionManifestItemSchema),
  z
    .object({
      extensions: z.array(extensionManifestItemSchema),
    })
    .passthrough(),
]);

export function parseExtensionManifest(value: unknown): ExtensionManifestItem[] {
  const parsed = extensionManifestSchema.parse(value);
  const items = Array.isArray(parsed) ? parsed : parsed.extensions;
  return items.map(item => ({
    branch: item.branch?.trim() ?? '',
    name: item.name,
    scope: item.scope ?? (item.global ? 'global' : 'local'),
    url: item.url?.trim() ?? '',
  }));
}
