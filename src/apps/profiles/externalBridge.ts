import { getOptionalGlobalValue } from '@/util/runtime';

export type ExternalProfilesStatus = 'error' | 'idle' | 'loading' | 'missing' | 'ready';

export type ExternalProfileColumn = {
  index: number;
  label: string;
  sourceLabel: string;
};

export type ExternalProfileRow = {
  cells: string[];
  id: string;
  index: number;
};

export type ExternalProfileTable = {
  columns: ExternalProfileColumn[];
  key: string;
  name: string;
  rows: ExternalProfileRow[];
  uid: string;
};

export type ExternalProfilesViewState = {
  canOpenVisualizer: boolean;
  message: string;
  status: ExternalProfilesStatus;
  subscriptionWarning: string;
  tables: ExternalProfileTable[];
};

export type ExternalProfilesApi = {
  exportTableAsJson: () => unknown;
  openVisualizer?: () => Promise<unknown> | unknown;
  registerTableUpdateCallback?: (callback: (data: unknown) => void) => void;
  unregisterTableUpdateCallback?: (callback: (data: unknown) => void) => void;
};

type ExternalProfilesListener = (state: ExternalProfilesViewState) => void;
type ExternalProfilesApiResolver = () => ExternalProfilesApi | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readableCell(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  try {
    return JSON.stringify(value) || '';
  } catch {
    return '[无法读取的结构化内容]';
  }
}

function uniqueColumnLabel(rawLabel: string, index: number, usedLabels: Set<string>) {
  const baseLabel = rawLabel.trim() || `第 ${index + 1} 列`;
  if (!usedLabels.has(baseLabel)) {
    usedLabels.add(baseLabel);
    return baseLabel;
  }
  let suffix = 2;
  while (usedLabels.has(`${baseLabel}（${suffix}）`)) suffix += 1;
  const label = `${baseLabel}（${suffix}）`;
  usedLabels.add(label);
  return label;
}

export function normalizeExternalProfilesData(rawData: unknown): ExternalProfileTable[] {
  if (!isRecord(rawData)) throw new Error('外部数据库返回的不是表格对象');

  return Object.entries(rawData)
    .filter(([key, value]) => key !== 'mate' && isRecord(value) && Array.isArray(value.content))
    .map(([key, value]) => {
      const sheet = value as Record<string, unknown>;
      const content = (sheet.content as unknown[]).filter(Array.isArray) as unknown[][];
      const header = content[0] ?? [];
      const body = content.slice(1);
      const columnCount = Math.max(header.length, ...body.map(row => row.length), 0);
      const usedLabels = new Set<string>();
      const columns = Array.from({ length: columnCount }, (_, index) => ({
        index,
        label: uniqueColumnLabel(readableCell(header[index]), index, usedLabels),
        sourceLabel: readableCell(header[index]).trim(),
      }));
      const uid = readableCell(sheet.uid).trim() || key;
      const name = readableCell(sheet.name).trim() || uid;
      return {
        columns,
        key,
        name,
        rows: body.map((row, rowIndex) => ({
          cells: columns.map(column => readableCell(row[column.index])),
          id: `${key}:${rowIndex + 1}`,
          index: rowIndex + 1,
        })),
        uid,
      } satisfies ExternalProfileTable;
    });
}

export function resolveExternalProfilesApi(): ExternalProfilesApi | null {
  const api = getOptionalGlobalValue<ExternalProfilesApi>('AutoCardUpdaterAPI');
  return api && typeof api.exportTableAsJson === 'function' ? api : null;
}

function initialState(): ExternalProfilesViewState {
  return {
    canOpenVisualizer: false,
    message: '',
    status: 'idle',
    subscriptionWarning: '',
    tables: [],
  };
}

export function createExternalProfilesBridge(resolveApi: ExternalProfilesApiResolver = resolveExternalProfilesApi) {
  let activeApi: ExternalProfilesApi | null = null;
  let listener: ExternalProfilesListener | null = null;
  let state = initialState();
  let subscriptionWarning = '';
  const updateCallback = () => refresh();

  function publish(nextState: ExternalProfilesViewState) {
    state = nextState;
    listener?.(state);
    return state;
  }

  function detachApi() {
    if (activeApi && typeof activeApi.unregisterTableUpdateCallback === 'function') {
      try {
        activeApi.unregisterTableUpdateCallback(updateCallback);
      } catch {
        // The view is already detaching; a broken external unregister must not retain local state.
      }
    }
    activeApi = null;
    subscriptionWarning = '';
  }

  function attachApi(nextApi: ExternalProfilesApi) {
    if (activeApi === nextApi) return;
    detachApi();
    activeApi = nextApi;
    if (typeof activeApi.registerTableUpdateCallback !== 'function') {
      subscriptionWarning = '当前外部数据库不支持更新监听，可使用刷新按钮重新读取。';
      return;
    }
    try {
      activeApi.registerTableUpdateCallback(updateCallback);
    } catch (error) {
      subscriptionWarning = error instanceof Error ? `更新监听失败：${error.message}` : '更新监听失败';
    }
  }

  function refresh() {
    publish({ ...state, message: '', status: 'loading' });
    const api = resolveApi();
    if (!api) {
      detachApi();
      return publish({
        canOpenVisualizer: false,
        message: '未检测到 SP·数据库/newshujuku，请确认外部插件已经加载。',
        status: 'missing',
        subscriptionWarning: '',
        tables: [],
      });
    }

    attachApi(api);
    try {
      const tables = normalizeExternalProfilesData(api.exportTableAsJson());
      return publish({
        canOpenVisualizer: typeof api.openVisualizer === 'function',
        message: '',
        status: 'ready',
        subscriptionWarning,
        tables,
      });
    } catch (error) {
      return publish({
        canOpenVisualizer: typeof api.openVisualizer === 'function',
        message: error instanceof Error ? error.message : '读取外部数据库失败',
        status: 'error',
        subscriptionWarning,
        tables: [],
      });
    }
  }

  function start(nextListener: ExternalProfilesListener) {
    listener = nextListener;
    refresh();
    return {
      stop,
    };
  }

  function stop() {
    detachApi();
    listener = null;
    state = initialState();
  }

  async function openVisualizer() {
    const api = resolveApi();
    if (!api || typeof api.openVisualizer !== 'function') return false;
    const result = await api.openVisualizer();
    return result !== false;
  }

  return {
    getState: () => state,
    openVisualizer,
    refresh,
    start,
    stop,
  };
}
