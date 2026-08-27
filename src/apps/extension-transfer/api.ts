// eslint-disable-next-line import-x/no-nodejs-modules
import { getRequestHeaders } from '@sillytavern/script';
import type { ExtensionManifestItem, ExtensionScope } from './model';

interface DiscoveredExtension {
  name: string;
  type: string;
}

interface ExtensionVersion {
  currentBranchName?: string;
  remoteUrl?: string;
}

export interface InstalledExtension extends ExtensionManifestItem {
  error: string;
  key: string;
}

export class ExtensionRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ExtensionRequestError';
  }
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: 'no-cache', headers: getRequestHeaders(), ...init });
  if (response.ok) return response;
  const detail = (await response.text()).trim();
  throw new ExtensionRequestError(detail || `HTTP ${response.status}`, response.status);
}

async function readVersion(name: string, scope: ExtensionScope) {
  const response = await request('/api/extensions/version', {
    body: JSON.stringify({ extensionName: name, global: scope === 'global' }),
    method: 'POST',
  });
  return (await response.json()) as ExtensionVersion;
}

export async function listInstalledThirdPartyExtensions(): Promise<InstalledExtension[]> {
  const response = await request('/api/extensions/discover');
  const discovered = (await response.json()) as DiscoveredExtension[];
  const targets = discovered
    .filter(item => item.name.startsWith('third-party/'))
    .map(item => ({
      name: item.name.slice('third-party/'.length),
      scope: item.type.toLocaleLowerCase() === 'global' ? ('global' as const) : ('local' as const),
    }))
    .filter(item => item.name);
  const result: InstalledExtension[] = new Array(targets.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(3, targets.length) }, async () => {
    while (nextIndex < targets.length) {
      const index = nextIndex;
      nextIndex += 1;
      const target = targets[index]!;
      try {
        const version = await readVersion(target.name, target.scope);
        result[index] = {
          alias: '',
          branch: version.currentBranchName?.trim() ?? '',
          description: '',
          error: '',
          key: `${target.scope}:${target.name}`,
          name: target.name,
          scope: target.scope,
          url: version.remoteUrl?.trim() ?? '',
        };
      } catch (error) {
        result[index] = {
          alias: '',
          branch: '',
          description: '',
          error: error instanceof Error ? error.message : String(error),
          key: `${target.scope}:${target.name}`,
          name: target.name,
          scope: target.scope,
          url: '',
        };
      }
    }
  });
  await Promise.all(workers);
  return result;
}

export async function installThirdPartyExtension(item: ExtensionManifestItem): Promise<'installed' | 'skipped'> {
  const body: Record<string, unknown> = { global: item.scope === 'global', url: item.url };
  if (item.branch) body.branch = item.branch;
  const response = await fetch('/api/extensions/install', {
    body: JSON.stringify(body),
    cache: 'no-cache',
    headers: getRequestHeaders(),
    method: 'POST',
  });
  if (response.status === 409) return 'skipped';
  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new ExtensionRequestError(detail || `HTTP ${response.status}`, response.status);
  }
  return 'installed';
}

export async function updateThirdPartyExtension(item: ExtensionManifestItem) {
  await request('/api/extensions/update', {
    body: JSON.stringify({ extensionName: item.name, global: item.scope === 'global' }),
    method: 'POST',
  });
}
