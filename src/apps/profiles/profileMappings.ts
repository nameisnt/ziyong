import { useChatScopedDomain } from '@/store/chatScoped';
import { validateInplace } from '@/util/zod';

export const profileMappingsField = 'sillytavern_phone_profile_bridge_mappings';

export const ExternalProfileFieldMappingSchema = z.object({
  column: z.string().trim().min(1),
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
});
export type ExternalProfileFieldMapping = z.infer<typeof ExternalProfileFieldMappingSchema>;

export const ExternalProfileMappingSchema = z.object({
  createdAt: z.string(),
  displayColumn: z.string().trim().min(1),
  fields: z.array(ExternalProfileFieldMappingSchema).default([]),
  id: z.string(),
  identityColumn: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sheetKey: z.string().trim().min(1),
  tableName: z.string().trim().min(1),
  updatedAt: z.string(),
});
export type ExternalProfileMapping = z.infer<typeof ExternalProfileMappingSchema>;

export const ExternalProfileMappingsScopeDataSchema = z.object({
  mappings: z.array(ExternalProfileMappingSchema).default([]),
  schemaVersion: z.literal(1).default(1),
});
export type ExternalProfileMappingsScopeData = z.infer<typeof ExternalProfileMappingsScopeDataSchema>;

export type ExternalProfileMappingInput = Pick<
  ExternalProfileMapping,
  'displayColumn' | 'fields' | 'identityColumn' | 'name' | 'sheetKey' | 'tableName'
>;

function nowIso() {
  return new Date().toISOString();
}

function createMappingId() {
  return `profile_mapping_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeInput(input: ExternalProfileMappingInput) {
  const parsed = ExternalProfileMappingSchema.pick({
    displayColumn: true,
    fields: true,
    identityColumn: true,
    name: true,
    sheetKey: true,
    tableName: true,
  }).parse(klona(input));
  const fieldKeys = parsed.fields.map(field => field.key);
  if (new Set(fieldKeys).size !== fieldKeys.length) throw new Error('业务字段标识不能重复');
  const mappedColumns = parsed.fields.map(field => field.column);
  if (new Set(mappedColumns).size !== mappedColumns.length) throw new Error('同一外部列不能映射到多个业务字段');
  if (parsed.identityColumn === parsed.displayColumn) throw new Error('身份列和显示列必须使用不同列');
  if (mappedColumns.includes(parsed.identityColumn) || mappedColumns.includes(parsed.displayColumn)) {
    throw new Error('业务字段列不能重复使用身份列或显示列');
  }
  return parsed;
}

export const useExternalProfileMappingsStore = defineStore('external-profile-mappings', () => {
  const { data, configError, rawConfig, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } =
    useChatScopedDomain({
      field: profileMappingsField,
      schema: ExternalProfileMappingsScopeDataSchema,
      createDefault: () => validateInplace(ExternalProfileMappingsScopeDataSchema, {}),
    });

  const mappings = computed(() => data.value.mappings);

  function getMapping(mappingId: string) {
    return data.value.mappings.find(mapping => mapping.id === mappingId) ?? null;
  }

  function assertUniqueName(name: string, exceptId = '') {
    if (data.value.mappings.some(mapping => mapping.id !== exceptId && mapping.name === name)) {
      throw new Error(`映射名称“${name}”已经存在`);
    }
  }

  function createMapping(input: ExternalProfileMappingInput) {
    const normalized = normalizeInput(input);
    assertUniqueName(normalized.name);
    const timestamp = nowIso();
    const mapping = ExternalProfileMappingSchema.parse({
      ...normalized,
      createdAt: timestamp,
      id: createMappingId(),
      updatedAt: timestamp,
    });
    data.value.mappings.push(mapping);
    return mapping;
  }

  function updateMapping(mappingId: string, input: ExternalProfileMappingInput) {
    const index = data.value.mappings.findIndex(mapping => mapping.id === mappingId);
    if (index < 0) throw new Error('要修改的映射已经不存在');
    const normalized = normalizeInput(input);
    assertUniqueName(normalized.name, mappingId);
    const current = data.value.mappings[index];
    const mapping = ExternalProfileMappingSchema.parse({
      ...current,
      ...normalized,
      updatedAt: nowIso(),
    });
    data.value.mappings[index] = mapping;
    return mapping;
  }

  function removeMapping(mappingId: string) {
    const index = data.value.mappings.findIndex(mapping => mapping.id === mappingId);
    if (index < 0) return false;
    data.value.mappings.splice(index, 1);
    return true;
  }

  return {
    configError,
    createMapping,
    data,
    getMapping,
    mappings,
    rawConfig,
    rehydrateFromSettings,
    removeMapping,
    resetCurrentScope,
    scopeKey,
    switchScope,
    updateMapping,
  };
});
