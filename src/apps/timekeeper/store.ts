import { useChatScopedDomain } from '@/store/chatScoped';
import { useSettingsStore } from '@/store/settings';
import { createExternalProfilesRepository } from '@/apps/profiles/externalCrud';
import {
  assertExternalMappingFields,
  readExternalMappedRows,
  type ExternalMappedProfileRow,
} from '@/apps/profiles/profileConsumerBridge';
import { useExternalProfileMappingsStore } from '@/apps/profiles/profileMappings';
import { TimekeeperCalendarTemplateSchema, type TimekeeperCalendarTemplate } from '@/type/settings';
import { validateInplace } from '@/util/zod';

export const timekeeperField = 'sillytavern_phone_timekeeper';

const TimekeeperDateSchema = z.object({
  year: z.number().int().default(2026),
  month: z.number().int().default(1),
  day: z.number().int().default(1),
});
export type TimekeeperDate = z.infer<typeof TimekeeperDateSchema>;

const TimekeeperPersonSchema = z.object({
  id: z.string(),
  name: z.string().default('未命名人物'),
  profileEntryId: z.string().default(''),
  profileIdentityValue: z.string().default(''),
  profileMappingId: z.string().default(''),
  selected: z.boolean().default(true),
  birth: TimekeeperDateSchema.default(() => TimekeeperDateSchema.parse({})),
});
export type TimekeeperPerson = z.infer<typeof TimekeeperPersonSchema>;

const TimekeeperDeltaSchema = z.object({
  years: z.number().int().default(0),
  months: z.number().int().default(0),
  days: z.number().int().default(0),
});
export type TimekeeperDelta = z.infer<typeof TimekeeperDeltaSchema>;

export const TimekeeperSettingsSchema = z.object({
  calendar: TimekeeperCalendarTemplateSchema.default(() => createManualCalendar()),
  calendarProfileEntryId: z.string().default(''),
  calendarProfileIdentityValue: z.string().default(''),
  calendarProfileMappingId: z.string().default(''),
  current: TimekeeperDateSchema.default(() => TimekeeperDateSchema.parse({})),
  delta: TimekeeperDeltaSchema.default(() => TimekeeperDeltaSchema.parse({})),
  people: z.array(TimekeeperPersonSchema).default([]),
  personProfileMappingId: z.string().default(''),
  updateCurrentOnConfirm: z.boolean().default(true),
});
export type TimekeeperSettings = z.infer<typeof TimekeeperSettingsSchema>;

export const GREGORIAN_CALENDAR: TimekeeperCalendarTemplate = {
  eraName: '公历',
  id: 'gregorian',
  kind: 'gregorian',
  monthDaysText: '31,28,31,30,31,30,31,31,30,31,30,31',
  monthsPerYear: 12,
  name: '公历',
};

function createManualCalendar(): TimekeeperCalendarTemplate {
  return {
    eraName: '世界历',
    id: 'manual',
    kind: 'fixed',
    monthDaysText: '30',
    monthsPerYear: 12,
    name: '手动历法',
  };
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getTodayDefaultDate() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

export function parseProfileBirthDate(text: string): TimekeeperDate | null {
  const line = /出生日期\s*[：:]\s*([^\r\n]*)/.exec(text)?.[1] ?? '';
  const normalized = line.replace(/[０-９]/g, digit => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));
  const values = normalized.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
  if (values.length < 3 || values.some(value => !Number.isFinite(value) || value < 1)) return null;
  return {
    day: values[2],
    month: values[1],
    year: values[0],
  };
}

function serializeBirthDate(date: TimekeeperDate) {
  return `${Math.max(1, Math.round(date.year))}-${String(Math.max(1, Math.round(date.month))).padStart(2, '0')}-${String(
    Math.max(1, Math.round(date.day)),
  ).padStart(2, '0')}`;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeCalendar(raw: unknown): TimekeeperCalendarTemplate {
  const parsed = validateInplace(TimekeeperCalendarTemplateSchema, raw);
  if (parsed.kind === 'gregorian') return { ...GREGORIAN_CALENDAR };
  return {
    ...parsed,
    eraName: parsed.eraName.trim() || '世界历',
    id: parsed.id.trim() || 'manual',
    kind: 'fixed',
    monthDaysText: parsed.monthDaysText.trim() || '30',
    monthsPerYear: clampNumber(parsed.monthsPerYear, 1, 24),
    name: parsed.name.trim() || '手动历法',
  };
}

function isGregorianLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function parseFixedMonthLengths(calendar: TimekeeperCalendarTemplate) {
  const rawValues = calendar.monthDaysText
    .split(/[,，]/)
    .map(value => Math.round(Number(value.trim())))
    .filter(value => Number.isFinite(value) && value > 0);
  const source = rawValues.length ? rawValues : [30];
  if (source.length === 1) {
    return Array.from({ length: calendar.monthsPerYear }, () => clampNumber(source[0], 1, 120));
  }

  const result = source.slice(0, calendar.monthsPerYear).map(value => clampNumber(value, 1, 120));
  while (result.length < calendar.monthsPerYear) {
    result.push(result[result.length - 1] ?? 30);
  }
  return result;
}

function getMonthsPerYear(calendar: TimekeeperCalendarTemplate) {
  return calendar.kind === 'gregorian' ? 12 : clampNumber(calendar.monthsPerYear, 1, 24);
}

function getDaysInCalendarMonth(calendar: TimekeeperCalendarTemplate, year: number, month: number) {
  const safeMonth = clampNumber(month, 1, getMonthsPerYear(calendar));
  if (calendar.kind === 'gregorian') {
    const lengths = [31, isGregorianLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return lengths[safeMonth - 1] ?? 30;
  }
  return parseFixedMonthLengths(calendar)[safeMonth - 1] ?? 30;
}

function normalizeDate(date: TimekeeperDate, calendar: TimekeeperCalendarTemplate): TimekeeperDate {
  const year = Math.max(1, Math.round(date.year || 1));
  const month = clampNumber(date.month, 1, getMonthsPerYear(calendar));
  return {
    year,
    month,
    day: clampNumber(date.day, 1, getDaysInCalendarMonth(calendar, year, month)),
  };
}

function normalizeSettings(raw: unknown): TimekeeperSettings {
  if (typeof raw !== 'undefined' && (!raw || typeof raw !== 'object' || Array.isArray(raw))) {
    throw new Error('时间确认数据必须是对象');
  }
  const source = raw && typeof raw === 'object' ? (klona(raw) as Record<string, unknown>) : {};
  if (!source.calendar || typeof source.calendar !== 'object') {
    source.calendar = {
      eraName: typeof source.eraName === 'string' ? source.eraName : '世界历',
      id: 'manual',
      kind: 'fixed',
      monthDaysText:
        typeof source.monthDaysText === 'string' ? source.monthDaysText : String(source.daysPerMonth || 30),
      monthsPerYear: Number(source.monthsPerYear) || 12,
      name: '手动历法',
    };
  }
  const parsed = validateInplace(TimekeeperSettingsSchema, source);
  parsed.calendar = normalizeCalendar(parsed.calendar);
  parsed.current = normalizeDate(parsed.current, parsed.calendar);
  parsed.delta = {
    years: Math.max(0, Math.round(parsed.delta.years || 0)),
    months: Math.max(0, Math.round(parsed.delta.months || 0)),
    days: Math.max(0, Math.round(parsed.delta.days || 0)),
  };
  parsed.people = parsed.people.map(person => ({
    ...person,
    name: person.name.trim() || '未命名人物',
    birth: normalizeDate(person.birth, parsed.calendar),
  }));
  return parsed;
}

const TimekeeperStorageSchema = z.unknown().transform((value): TimekeeperSettings => normalizeSettings(value));

function getFixedYearDays(calendar: TimekeeperCalendarTemplate) {
  return parseFixedMonthLengths(calendar).reduce((sum, days) => sum + days, 0);
}

function getDaysBeforeGregorianYear(year: number) {
  const completedYears = Math.max(0, year - 1);
  return (
    completedYears * 365 +
    Math.floor(completedYears / 4) -
    Math.floor(completedYears / 100) +
    Math.floor(completedYears / 400)
  );
}

function getDaysBeforeYear(year: number, calendar: TimekeeperCalendarTemplate) {
  return calendar.kind === 'gregorian'
    ? getDaysBeforeGregorianYear(year)
    : Math.max(0, year - 1) * getFixedYearDays(calendar);
}

function dateToDays(date: TimekeeperDate, calendar: TimekeeperCalendarTemplate) {
  const normalized = normalizeDate(date, calendar);
  let previousMonthDays = 0;
  for (let month = 1; month < normalized.month; month += 1) {
    previousMonthDays += getDaysInCalendarMonth(calendar, normalized.year, month);
  }
  return getDaysBeforeYear(normalized.year, calendar) + previousMonthDays + normalized.day - 1;
}

function resolveYearFromDayIndex(dayIndex: number, calendar: TimekeeperCalendarTemplate) {
  if (calendar.kind === 'fixed') {
    return Math.floor(dayIndex / getFixedYearDays(calendar)) + 1;
  }

  let low = 1;
  let high = Math.max(2, Math.floor(dayIndex / 365) + 2);
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (getDaysBeforeYear(middle, calendar) <= dayIndex) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

function daysToDate(dayIndex: number, calendar: TimekeeperCalendarTemplate): TimekeeperDate {
  const safeDayIndex = Math.max(0, Math.round(dayIndex));
  const year = resolveYearFromDayIndex(safeDayIndex, calendar);
  let dayOfYear = safeDayIndex - getDaysBeforeYear(year, calendar);
  let month = 1;
  const monthsPerYear = getMonthsPerYear(calendar);
  while (month < monthsPerYear) {
    const monthDays = getDaysInCalendarMonth(calendar, year, month);
    if (dayOfYear < monthDays) break;
    dayOfYear -= monthDays;
    month += 1;
  }
  return { day: dayOfYear + 1, month, year };
}

function compareDates(left: TimekeeperDate, right: TimekeeperDate, calendar: TimekeeperCalendarTemplate) {
  return dateToDays(left, calendar) - dateToDays(right, calendar);
}

function addYearsAndMonths(date: TimekeeperDate, years: number, months: number, calendar: TimekeeperCalendarTemplate) {
  const normalized = normalizeDate(date, calendar);
  const monthsPerYear = getMonthsPerYear(calendar);
  const monthIndex =
    (normalized.year - 1) * monthsPerYear +
    normalized.month -
    1 +
    Math.max(0, years) * monthsPerYear +
    Math.max(0, months);
  const year = Math.floor(monthIndex / monthsPerYear) + 1;
  const month = (monthIndex % monthsPerYear) + 1;
  return {
    day: Math.min(normalized.day, getDaysInCalendarMonth(calendar, year, month)),
    month,
    year,
  };
}

function addDelta(date: TimekeeperDate, delta: TimekeeperDelta, calendar: TimekeeperCalendarTemplate) {
  const shifted = addYearsAndMonths(date, delta.years, delta.months, calendar);
  return daysToDate(dateToDays(shifted, calendar) + Math.max(0, delta.days), calendar);
}

function diffDates(from: TimekeeperDate, to: TimekeeperDate, calendar: TimekeeperCalendarTemplate) {
  const start = normalizeDate(from, calendar);
  const end = normalizeDate(to, calendar);
  if (compareDates(end, start, calendar) <= 0) return { days: 0, months: 0, years: 0 };

  let years = Math.max(0, end.year - start.year);
  let cursor = addYearsAndMonths(start, years, 0, calendar);
  if (compareDates(cursor, end, calendar) > 0) {
    years -= 1;
    cursor = addYearsAndMonths(start, years, 0, calendar);
  }

  const monthsPerYear = getMonthsPerYear(calendar);
  let months = Math.max(0, (end.year - cursor.year) * monthsPerYear + end.month - cursor.month);
  let monthCursor = addYearsAndMonths(cursor, 0, months, calendar);
  if (compareDates(monthCursor, end, calendar) > 0) {
    months -= 1;
    monthCursor = addYearsAndMonths(cursor, 0, months, calendar);
  }

  return {
    days: Math.max(0, dateToDays(end, calendar) - dateToDays(monthCursor, calendar)),
    months,
    years,
  };
}

export const useTimekeeperStore = defineStore('timekeeper', () => {
  const profileMappings = useExternalProfileMappingsStore();
  const profileRepository = createExternalProfilesRepository();
  const settingsStore = useSettingsStore();
  const {
    data: settings,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
  } = useChatScopedDomain({
    field: timekeeperField,
    schema: TimekeeperStorageSchema,
    createDefault: () =>
      normalizeSettings({
        calendar: createManualCalendar(),
        current: getTodayDefaultDate(),
        people: [],
      }),
  });

  const nextDate = computed(() => addDelta(settings.value.current, settings.value.delta, settings.value.calendar));
  const selectedPeople = computed(() => settings.value.people.filter(person => person.selected));
  const mappedPersonRows = ref<ExternalMappedProfileRow[]>([]);
  const mappedCalendarRows = ref<ExternalMappedProfileRow[]>([]);
  const externalProfileError = ref('');

  function getMappedBirthDate(row: ExternalMappedProfileRow) {
    const value = row.fields.birthDate?.trim();
    return value ? parseProfileBirthDate(`出生日期：${value}`) : null;
  }

  function createDefaultBirth() {
    return normalizeDate(
      {
        year: Math.max(1, settings.value.current.year - 18),
        month: settings.value.current.month,
        day: settings.value.current.day,
      },
      settings.value.calendar,
    );
  }

  function syncProfilePeople() {
    const mappingId = settings.value.personProfileMappingId;
    if (!mappingId) return;
    const identities = new Set(mappedPersonRows.value.map(row => row.identityValue.trim()).filter(Boolean));
    mappedPersonRows.value
      .filter(row => row.identityValue.trim())
      .forEach(row => {
        const identityValue = row.identityValue.trim();
        const existing = settings.value.people.find(
          person => person.profileMappingId === mappingId && person.profileIdentityValue === identityValue,
        );
        if (existing) {
          existing.name = row.displayValue.trim() || existing.name;
          const birth = getMappedBirthDate(row);
          if (birth) existing.birth = normalizeDate(birth, settings.value.calendar);
          existing.selected = Boolean(birth);
          return;
        }
        settings.value.people.push({
          birth: normalizeDate(getMappedBirthDate(row) ?? createDefaultBirth(), settings.value.calendar),
          id: createId('time_person'),
          name: row.displayValue.trim() || identityValue,
          profileEntryId: '',
          profileIdentityValue: identityValue,
          profileMappingId: mappingId,
          selected: Boolean(getMappedBirthDate(row)),
        });
      });
    settings.value.people = settings.value.people.filter(
      person => person.profileMappingId !== mappingId || identities.has(person.profileIdentityValue),
    );
  }

  function getProfileCalendar(profileIdentityValue: string) {
    const row = mappedCalendarRows.value.find(item => item.identityValue === profileIdentityValue);
    if (!row) return null;
    const name = row.fields.calendarName?.trim();
    const eraName = row.fields.calendarEraName?.trim();
    const monthsPerYear = Number(row.fields.calendarMonthsPerYear?.match(/\d+/u)?.[0]);
    const monthDaysText = row.fields.calendarMonthDays?.trim();
    if (!name && !eraName && !monthsPerYear && !monthDaysText) return null;
    return normalizeCalendar({
      eraName: eraName || name || '世界历',
      id: `external-calendar:${encodeURIComponent(profileIdentityValue)}`,
      kind: 'fixed',
      monthDaysText: monthDaysText || '30',
      monthsPerYear: monthsPerYear || 12,
      name: name || `${row.displayValue || profileIdentityValue}历法`,
    });
  }

  function syncProfileCalendar() {
    if (settings.value.calendarProfileIdentityValue) {
      const linked = getProfileCalendar(settings.value.calendarProfileIdentityValue);
      if (linked) settings.value.calendar = linked;
      else settings.value.calendarProfileIdentityValue = '';
      return;
    }
    const available = mappedCalendarRows.value
      .map(row => getProfileCalendar(row.identityValue))
      .filter((calendar): calendar is TimekeeperCalendarTemplate => Boolean(calendar));
    if (available.length !== 1) return;
    settings.value.calendarProfileIdentityValue = decodeURIComponent(
      available[0].id.replace(/^external-calendar:/u, ''),
    );
    settings.value.calendar = available[0];
  }

  async function refreshMappedProfiles() {
    externalProfileError.value = '';
    try {
      const personMappingId = settings.value.personProfileMappingId;
      if (personMappingId) {
        const mapping = profileMappings.getMapping(personMappingId);
        if (!mapping) throw new Error('人物资料映射已经不存在');
        assertExternalMappingFields(mapping, ['birthDate']);
        mappedPersonRows.value = readExternalMappedRows(mapping);
        syncProfilePeople();
      } else {
        mappedPersonRows.value = [];
      }

      const calendarMappingId = settings.value.calendarProfileMappingId;
      if (calendarMappingId) {
        const mapping = profileMappings.getMapping(calendarMappingId);
        if (!mapping) throw new Error('历法资料映射已经不存在');
        assertExternalMappingFields(mapping, [
          'calendarName',
          'calendarEraName',
          'calendarMonthsPerYear',
          'calendarMonthDays',
        ]);
        mappedCalendarRows.value = readExternalMappedRows(mapping);
        syncProfileCalendar();
      } else {
        mappedCalendarRows.value = [];
      }
    } catch (error) {
      externalProfileError.value = error instanceof Error ? error.message : '读取外部资料失败';
    }
  }

  watch(
    () => `${profileMappings.scopeKey}|${scopeKey.value}|${settings.value.personProfileMappingId}|${settings.value.calendarProfileMappingId}`,
    () => {
      if (profileMappings.scopeKey !== scopeKey.value) return;
      void refreshMappedProfiles();
    },
    { immediate: true },
  );

  function formatDate(date: TimekeeperDate) {
    const normalized = normalizeDate(date, settings.value.calendar);
    const era = settings.value.calendar.eraName.trim();
    return `${era}${normalized.year}年${normalized.month}月${normalized.day}日`;
  }

  function formatDuration(duration: TimekeeperDelta) {
    const segments = [
      duration.years ? `${duration.years}年` : '',
      duration.months ? `${duration.months}月` : '',
      duration.days ? `${duration.days}日` : '',
    ].filter(Boolean);
    return segments.join('') || '0日';
  }

  function getAgeAt(person: TimekeeperPerson, date: TimekeeperDate) {
    return diffDates(person.birth, date, settings.value.calendar);
  }

  function formatAge(duration: TimekeeperDelta) {
    return `${duration.years}岁${duration.months ? `${duration.months}个月` : ''}${duration.days ? `${duration.days}日` : ''}`;
  }

  function getDaysInMonth(month: number, year = settings.value.current.year) {
    return getDaysInCalendarMonth(settings.value.calendar, year, month);
  }

  function normalizeCurrentDates() {
    settings.value.current = normalizeDate(settings.value.current, settings.value.calendar);
    settings.value.people = settings.value.people.map(person => ({
      ...person,
      birth: normalizeDate(person.birth, settings.value.calendar),
    }));
  }

  async function syncPersonProfile(personId: string) {
    const person = settings.value.people.find(item => item.id === personId);
    if (!person?.profileMappingId || !person.profileIdentityValue) return false;
    const mapping = profileMappings.getMapping(person.profileMappingId);
    if (!mapping) throw new Error('人物资料映射已经不存在');
    assertExternalMappingFields(mapping, ['birthDate']);
    await profileRepository.updateMappedRow(mapping, person.profileIdentityValue, {
      displayValue: person.name,
      fields: { birthDate: serializeBirthDate(person.birth) },
    });
    return true;
  }

  function selectCalendar(calendarId: string) {
    if (calendarId.startsWith('external-calendar:')) {
      const profileIdentityValue = decodeURIComponent(calendarId.slice('external-calendar:'.length));
      const calendar = getProfileCalendar(profileIdentityValue);
      if (!calendar) return;
      settings.value.calendarProfileEntryId = '';
      settings.value.calendarProfileIdentityValue = profileIdentityValue;
      settings.value.calendar = calendar;
      normalizeCurrentDates();
      return;
    }
    settings.value.calendarProfileEntryId = '';
    settings.value.calendarProfileIdentityValue = '';
    if (calendarId === GREGORIAN_CALENDAR.id) {
      settings.value.calendar = { ...GREGORIAN_CALENDAR };
      normalizeCurrentDates();
      return;
    }
    if (calendarId === 'manual') {
      settings.value.calendar =
        settings.value.calendar.kind === 'fixed'
          ? { ...settings.value.calendar, id: 'manual', name: '手动历法' }
          : createManualCalendar();
      normalizeCurrentDates();
      return;
    }
    const template = settingsStore.settings.timekeeperCalendarTemplates.find(item => item.id === calendarId);
    if (!template) return;
    settings.value.calendar = normalizeCalendar(klona(template));
    normalizeCurrentDates();
  }

  function saveCurrentCalendarAsTemplate(name: string) {
    if (settings.value.calendar.kind === 'gregorian') {
      throw new Error('公历已经内置，无需重复保存');
    }
    const template = settingsStore.createTimekeeperCalendarTemplate({
      ...klona(settings.value.calendar),
      kind: settings.value.calendar.kind,
      name,
    });
    settings.value.calendar = klona(template);
    return template;
  }

  function deleteCalendarTemplate(templateId: string) {
    settingsStore.deleteTimekeeperCalendarTemplate(templateId);
  }

  function buildPromptText() {
    const current = settings.value.current;
    const next = nextDate.value;
    const lines = [
      `原时间：${formatDate(current)}`,
      `推进时间：${formatDuration(settings.value.delta)}`,
      `当前时间：${formatDate(next)}`,
    ];

    selectedPeople.value.forEach(person => {
      lines.push(
        `${person.name}：原年龄：${formatAge(getAgeAt(person, current))}，当前年龄：${formatAge(getAgeAt(person, next))}`,
      );
    });
    return lines.join('\n');
  }

  async function createPerson() {
    const name = `人物 ${settings.value.people.length + 1}`;
    const birth = createDefaultBirth();
    const id = createId('time_person');
    const mappingId = settings.value.personProfileMappingId;
    if (mappingId) {
      const mapping = profileMappings.getMapping(mappingId);
      if (!mapping) throw new Error('人物资料映射已经不存在');
      assertExternalMappingFields(mapping, ['birthDate']);
      await profileRepository.insertMappedRow(mapping, {
        displayValue: name,
        fields: { birthDate: serializeBirthDate(birth) },
        identityValue: id,
      });
    }
    const person: TimekeeperPerson = {
      id,
      name,
      profileEntryId: '',
      profileIdentityValue: mappingId ? id : '',
      profileMappingId: mappingId,
      selected: true,
      birth,
    };
    settings.value.people = [...settings.value.people, person];
    return person;
  }

  function linkPersonProfile(personId: string, profileIdentityValue: string) {
    const person = settings.value.people.find(item => item.id === personId);
    if (!person) return { birthImported: false, ok: false };
    if (!profileIdentityValue) {
      person.profileEntryId = '';
      person.profileIdentityValue = '';
      person.profileMappingId = '';
      return { birthImported: false, ok: true };
    }
    const mappingId = settings.value.personProfileMappingId;
    const row = mappedPersonRows.value.find(item => item.identityValue === profileIdentityValue);
    if (!mappingId || !row) return { birthImported: false, ok: false };
    person.profileEntryId = '';
    person.profileIdentityValue = row.identityValue;
    person.profileMappingId = mappingId;
    person.name = row.displayValue.trim() || row.identityValue;
    const birth = getMappedBirthDate(row);
    if (birth) person.birth = normalizeDate(birth, settings.value.calendar);
    return { birthImported: Boolean(birth), ok: true };
  }

  async function deletePerson(personId: string, deleteProfile = true) {
    const person = settings.value.people.find(item => item.id === personId);
    if (deleteProfile && person?.profileMappingId && person.profileIdentityValue) {
      const mapping = profileMappings.getMapping(person.profileMappingId);
      if (!mapping) throw new Error('人物资料映射已经不存在');
      await profileRepository.deleteMappedRow(mapping, person.profileIdentityValue);
    }
    settings.value.people = settings.value.people.filter(person => person.id !== personId);
  }

  function applyNextDate() {
    settings.value.current = nextDate.value;
  }

  return {
    applyNextDate,
    buildPromptText,
    createPerson,
    deleteCalendarTemplate,
    deletePerson,
    externalProfileError,
    formatAge,
    formatDate,
    formatDuration,
    getAgeAt,
    getDaysInMonth,
    getProfileCalendar,
    linkPersonProfile,
    mappedCalendarRows,
    mappedPersonRows,
    nextDate,
    normalizeCurrentDates,
    rehydrateFromSettings,
    refreshMappedProfiles,
    resetCurrentScope,
    saveCurrentCalendarAsTemplate,
    selectCalendar,
    selectedPeople,
    settings,
    syncPersonProfile,
    syncProfilePeople,
    scopeKey,
    switchScope,
  };
});
