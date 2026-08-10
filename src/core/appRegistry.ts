import type { Component } from 'vue';
import type { GenerationAdapter } from '@/type/generation';
import type { GenerationReferenceItem } from '@/util/references';

export type PhoneAppComponent = Component;

export type PhoneReferenceLeafNode = {
  id: string;
  item: GenerationReferenceItem;
  kind: 'leaf';
};

export type PhoneReferenceBranchNode = {
  children: PhoneReferenceTreeNode[];
  id: string;
  kind: 'branch';
  label: string;
};

export type PhoneReferenceTreeNode = PhoneReferenceBranchNode | PhoneReferenceLeafNode;
export type PhoneReferenceProvider = () => PhoneReferenceTreeNode | PhoneReferenceTreeNode[] | null | undefined;

export interface PhoneFavoriteItem {
  key: string;
  appId: string;
  bookId?: string;
  entryId: string;
  title: string;
  preview: string;
  bookTitle: string;
  subtitle: string;
  updatedAt: string;
  exists?: () => boolean;
  open?: () => void;
  removeFavorite?: () => void;
}

export type PhoneFavoriteProvider = () => PhoneFavoriteItem[];

export interface PhoneArchiveItem {
  id: string;
  title: string;
  subtitle: string;
}

export interface PhoneArchiveDomain {
  appId: string;
  label: string;
  collectionLabel: string;
  itemLabel: string;
  collections: number;
  items: number;
  entries: PhoneArchiveItem[];
}

export interface PhoneArchiveProvider {
  appId?: string;
  collectionLabel?: string;
  field: string;
  itemLabel?: string;
  label?: string;
  collect: (raw: unknown, context: { currentScopeKey: string; scopeKey: string }) => PhoneArchiveDomain;
}

export interface PhoneContentOverview {
  scopeCount: number;
  collections: number;
  items: number;
  chars: number;
  averageChars: number;
  latestUpdatedAt: string;
}

export interface PhoneContentDomainStat extends PhoneContentOverview {
  id: string;
  label: string;
  collectionLabel: string;
  itemLabel: string;
}

export interface PhoneContentStatsContribution {
  current: PhoneContentOverview;
  domain: PhoneContentDomainStat;
  overview: PhoneContentOverview;
  scopeKeys: string[];
  warnings: string[];
}

export type PhoneContentStatsProvider = (currentScopeKey: string) => PhoneContentStatsContribution;

export type PhoneOutputParserKind = 'json' | 'labels' | 'text' | 'xml';
export type PhoneOutputParserFieldKind = 'object-list' | 'text' | 'text-list';
export type PhoneOutputParserExtraction = 'markup' | 'text';

export interface PhoneOutputParserField {
  children?: PhoneOutputParserField[];
  defaultPath: string;
  extraction?: PhoneOutputParserExtraction;
  key: string;
  kind: PhoneOutputParserFieldKind;
  label: string;
  required?: boolean;
  separator?: string;
}

export interface PhoneOutputParserDefinition {
  fields: PhoneOutputParserField[];
  kind: PhoneOutputParserKind;
  rootPath?: string;
}

export interface PhonePromptOutputFormat {
  id: string;
  label: string;
  content: string;
  parser: PhoneOutputParserDefinition;
}

export interface PhonePromptDefinition {
  key: string;
  label: string;
  defaultPrompt: string;
  outputFormats?: PhonePromptOutputFormat[];
}

export interface PhoneTaskTemplateVariable {
  key: string;
  label: string;
}

export interface PhoneTaskTemplateDefinition {
  actionId: string;
  defaultTemplate: string;
  label: string;
  variables?: PhoneTaskTemplateVariable[];
}

export interface PhoneTypePromptDefinition {
  id: string;
  domain: string;
  name: string;
  prompt: string;
  charReplacement?: string;
  renderMode?: 'frontend' | 'markdown';
  userReplacement?: string;
}

export interface PhoneTypePromptDomain {
  key: string;
  label: string;
  emptyLabel?: string;
  defaultOpen?: boolean;
  defaultPrompts?: PhoneTypePromptDefinition[];
}

export type PhoneGenerationAdapter = GenerationAdapter<any, any, any>;
export type PhoneAppResetHandler = () => void | Promise<void>;

export interface PhoneGenerationAction {
  actionId: string;
  label: string;
  description?: string;
  createAdapter: () => PhoneGenerationAdapter;
}

export type PhoneGenerationProvider = () => PhoneGenerationAction[];
export type PhoneScopeSwitchHandler = (scopeKey: string) => void | Promise<void>;

export type PhoneContentConversionValue = boolean | number | string;
export type PhoneContentConversionValues = Record<string, PhoneContentConversionValue>;
export type PhoneContentConversionBatchMode = 'merge' | 'separate';

export interface PhoneContentConversionSource {
  appId: string;
  appName: string;
  content: string;
  displayMode: 'frontend' | 'markdown' | 'text';
  entryId: string;
  sourceFloorEnd?: number;
  sourceLabel: string;
  tags: string[];
  title: string;
}

export interface PhoneContentConversionOption {
  disabled?: boolean;
  group?: string;
  label: string;
  value: string;
}

export interface PhoneContentConversionField {
  help?: string;
  key: string;
  kind: 'number' | 'select' | 'text' | 'textarea' | 'toggle';
  label: string;
  min?: number;
  options?: PhoneContentConversionOption[];
  placeholder?: string;
  required?: boolean;
  rows?: number;
  step?: number;
}

export interface PhoneContentConversionContext {
  batchMode: PhoneContentConversionBatchMode;
  sources: PhoneContentConversionSource[];
  values: PhoneContentConversionValues;
}

export interface PhoneContentConversionRoute {
  page: string;
  params?: Record<string, string>;
  title: string;
}

export interface PhoneContentConversionResult {
  count: number;
  itemIds: string[];
  message: string;
  openRoute?: PhoneContentConversionRoute;
}

export interface PhoneContentReceiver {
  batchModes?: PhoneContentConversionBatchMode[];
  createDraft: (sources: PhoneContentConversionSource[]) => PhoneContentConversionValues;
  fields: (context: PhoneContentConversionContext) => PhoneContentConversionField[];
  receive: (
    context: PhoneContentConversionContext,
  ) => PhoneContentConversionResult | Promise<PhoneContentConversionResult>;
  scope: 'chat' | 'global';
}

export interface PhoneBackupDomain {
  key: string;
  exportData: (currentScopeKey: string) => unknown;
  importData: (data: unknown) => void;
  rehydrateFromSettings?: () => void;
}

export interface PhoneAppDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  accent: string;
  defaultRoute: string;
  defaultOrder: number;
  defaultVisible?: boolean;
  defaultDock?: boolean;
  tutorialGuideRequired?: boolean;
}

export interface PhoneAppModule extends PhoneAppDefinition {
  archiveProvider?: PhoneArchiveProvider | PhoneArchiveProvider[];
  backupDomains?: PhoneBackupDomain[];
  component: PhoneAppComponent;
  contentReceiver?: PhoneContentReceiver;
  contentStatsProvider?: PhoneContentStatsProvider;
  favoriteProvider?: PhoneFavoriteProvider;
  generationProvider?: PhoneGenerationProvider;
  promptDefinitions?: PhonePromptDefinition[];
  referenceProvider?: PhoneReferenceProvider;
  resetCurrentScope?: PhoneAppResetHandler;
  scopeSwitchHandler?: PhoneScopeSwitchHandler;
  specialPromptDefinitions?: PhonePromptDefinition[];
  taskTemplateDefinitions?: PhoneTaskTemplateDefinition[];
  typePromptDomains?: PhoneTypePromptDomain[];
}

const appIdPattern = /^[a-z][a-z0-9-]*$/;
const modules = new Map<string, PhoneAppModule>();
const moduleProviders = new Set<() => PhoneAppModule[]>();

function assertValidModule(module: PhoneAppModule) {
  if (!appIdPattern.test(module.id)) {
    throw new Error(`Invalid phone app id: ${module.id}`);
  }

  if (modules.has(module.id)) {
    throw new Error(`Duplicate phone app id: ${module.id}`);
  }
}

export function definePhoneApp(module: PhoneAppModule) {
  return module;
}

export function registerPhoneApp(module: PhoneAppModule) {
  assertValidModule(module);
  modules.set(module.id, module);
  return module;
}

export function registerPhoneApps(nextModules: PhoneAppModule[]) {
  nextModules.forEach(module => registerPhoneApp(module));
}

export function registerPhoneAppProvider(provider: () => PhoneAppModule[]) {
  moduleProviders.add(provider);
  return () => moduleProviders.delete(provider);
}

function getProvidedPhoneApps() {
  const knownIds = new Set(modules.keys());
  const provided: PhoneAppModule[] = [];
  moduleProviders.forEach(provider => {
    provider().forEach(module => {
      if (!appIdPattern.test(module.id) || knownIds.has(module.id)) return;
      knownIds.add(module.id);
      provided.push(module);
    });
  });
  return provided;
}

export function getRegisteredPhoneApps() {
  return [...modules.values(), ...getProvidedPhoneApps()].sort(
    (left, right) => left.defaultOrder - right.defaultOrder || left.name.localeCompare(right.name),
  );
}

export function getRegisteredPhoneApp(appId: string) {
  return modules.get(appId) ?? getProvidedPhoneApps().find(module => module.id === appId) ?? null;
}

export function getRegisteredPhoneAppComponent(appId: string) {
  return getRegisteredPhoneApp(appId)?.component ?? null;
}

export function getRegisteredPhoneAppResetHandlers() {
  return getRegisteredPhoneApps()
    .map(module => ({
      app: module,
      resetCurrentScope: module.resetCurrentScope,
    }))
    .filter((item): item is { app: PhoneAppModule; resetCurrentScope: PhoneAppResetHandler } =>
      Boolean(item.resetCurrentScope),
    );
}

export function getRegisteredPhoneAppScopeSwitchHandlers() {
  return getRegisteredPhoneApps()
    .map(module => ({
      app: module,
      switchScope: module.scopeSwitchHandler,
    }))
    .filter((item): item is { app: PhoneAppModule; switchScope: PhoneScopeSwitchHandler } => Boolean(item.switchScope));
}

export function getRegisteredPhoneAppReferenceTrees() {
  return getRegisteredPhoneApps()
    .flatMap(module => {
      const result = module.referenceProvider?.();
      if (!result) return [];
      return Array.isArray(result) ? result : [result];
    })
    .filter((node): node is PhoneReferenceTreeNode => Boolean(node));
}

export function getRegisteredPhoneFavoriteItems() {
  return getRegisteredPhoneApps()
    .flatMap(module => module.favoriteProvider?.() ?? [])
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function getRegisteredPhoneArchiveProviders() {
  return getRegisteredPhoneApps().flatMap(module => {
    const providers = module.archiveProvider ?? [];
    return Array.isArray(providers) ? providers : [providers];
  });
}

export function getRegisteredPhoneContentStats(currentScopeKey: string) {
  return getRegisteredPhoneApps().flatMap(module =>
    module.contentStatsProvider ? [module.contentStatsProvider(currentScopeKey)] : [],
  );
}

export function getRegisteredPhoneContentReceivers() {
  return getRegisteredPhoneApps()
    .filter((module): module is PhoneAppModule & { contentReceiver: PhoneContentReceiver } =>
      Boolean(module.contentReceiver),
    )
    .map(module => ({
      app: module,
      receiver: module.contentReceiver,
    }));
}

export function getRegisteredPhoneGenerationActions(appId?: string) {
  const source = appId
    ? [getRegisteredPhoneApp(appId)].filter((module): module is PhoneAppModule => Boolean(module))
    : getRegisteredPhoneApps();
  return source.flatMap(module =>
    (module.generationProvider?.() ?? []).map(action => ({
      ...action,
      app: module,
      appId: module.id,
    })),
  );
}

export function getRegisteredPhoneGenerationAction(appId: string, actionId: string) {
  return getRegisteredPhoneGenerationActions(appId).find(action => action.actionId === actionId) ?? null;
}

export function getRegisteredPhoneGenerationAdapter<TAdapter extends PhoneGenerationAdapter = PhoneGenerationAdapter>(
  appId: string,
  actionId: string,
) {
  const action = getRegisteredPhoneGenerationAction(appId, actionId);
  if (!action) {
    throw new Error(`Unknown phone generation action: ${appId}/${actionId}`);
  }
  return action.createAdapter() as TAdapter;
}

export function getRegisteredPhonePromptDefinitions() {
  return getRegisteredPhoneApps().flatMap(module => module.promptDefinitions ?? []);
}

export function getRegisteredPhoneSpecialPromptDefinitions() {
  return getRegisteredPhoneApps().flatMap(module => module.specialPromptDefinitions ?? []);
}

export function getRegisteredPhoneTaskTemplateDefinitions() {
  return getRegisteredPhoneApps().flatMap(module =>
    (module.taskTemplateDefinitions ?? []).map(definition => ({
      ...definition,
      appId: module.id,
      appLabel: module.name,
      key: `${module.id}.${definition.actionId}`,
    })),
  );
}

export function getRegisteredPhoneTypePromptDomains() {
  return getRegisteredPhoneApps().flatMap(module => module.typePromptDomains ?? []);
}

export function getRegisteredPhoneBackupDomains() {
  return getRegisteredPhoneApps().flatMap(module => module.backupDomains ?? []);
}

export function getRegisteredPhoneBackupRehydrateHandlers() {
  return getRegisteredPhoneBackupDomains()
    .map(domain => domain.rehydrateFromSettings)
    .filter((handler): handler is () => void => Boolean(handler));
}
