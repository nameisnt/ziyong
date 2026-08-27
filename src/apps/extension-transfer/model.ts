import { z } from 'zod';

export type ExtensionScope = 'local' | 'global';

export interface ExtensionManifestItem {
  alias: string;
  branch: string;
  description: string;
  name: string;
  scope: ExtensionScope;
  url: string;
}

const extensionManifestItemSchema = z
  .object({
    branch: z.string().nullish(),
    alias: z.string().nullish(),
    description: z.string().nullish(),
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
    alias: item.alias?.trim() ?? '',
    branch: item.branch?.trim() ?? '',
    description: item.description?.trim() ?? '',
    name: item.name,
    scope: item.scope ?? (item.global ? 'global' : 'local'),
    url: item.url?.trim() ?? '',
  }));
}
