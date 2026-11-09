/**
 * 用户可见的失败反馈统一入口。
 *
 * 背景：界面里过去大量直接把 `error.message` 交给 toastr 的写法，
 * 会在出错时把 `Failed to fetch`、`HTTP 500`、半截 HTML 直接甩给用户，
 * 用户看不到「是哪个动作失败了」。这里把「动作 + 失败 + 原因」拼成一句话，
 * 并把常见底层错误翻译成中文短句。
 *
 * 只负责措辞，不改变反馈通道：内部仍然走 toastr，
 * 手机面板打开时由 usePhoneToastrBridge 接到手机内通知。
 */

const MAX_DETAIL_LENGTH = 120;

const NETWORK_HINTS = ['failed to fetch', 'load failed', 'networkerror', 'network error', 'fetch failed'];
const TIMEOUT_HINTS = ['timeout', 'timed out'];
const PARSE_HINTS = [
  'unexpected token',
  'json.parse',
  'is not valid json',
  'json at position',
  'expected property name',
  'unexpected end of json',
];
const ABORT_HINTS = ['aborterror', 'the operation was aborted'];

const HTTP_HINTS: Array<{ pattern: RegExp; describe: (code: string) => string }> = [
  { pattern: /\b(?:401|403)\b/u, describe: code => `登录状态失效或没有权限（HTTP ${code}）` },
  { pattern: /\b404\b/u, describe: () => '要访问的内容不存在（HTTP 404）' },
  { pattern: /\b413\b/u, describe: () => '内容太大，超出接口限制（HTTP 413）' },
  { pattern: /\b429\b/u, describe: () => '请求太频繁，请稍后再试（HTTP 429）' },
  { pattern: /\b5\d{2}\b/u, describe: code => `酒馆后端出错（HTTP ${code}）` },
  { pattern: /\b4\d{2}\b/u, describe: code => `请求被拒绝（HTTP ${code}）` },
];

function clamp(text: string) {
  const trimmed = text.trim().replace(/\s+/gu, ' ');
  if (trimmed.length <= MAX_DETAIL_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_DETAIL_LENGTH)}…`;
}

/**
 * 把异常拆成一句给用户看的原因。
 * 已经是中文的提示原样保留——那通常是业务校验写好的文案，再翻译反而失真。
 */
export function describeFailure(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return '已取消';
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error ?? '');
  const text = clamp(message);
  if (!text) return '';

  const lower = text.toLowerCase();
  if (ABORT_HINTS.some(hint => lower.includes(hint))) return '已取消';
  // 业务侧已经写成中文说明的，直接采用，不再包一层猜测。
  if (/[\u4e00-\u9fa5]/u.test(text)) return text;
  if (NETWORK_HINTS.some(hint => lower.includes(hint))) return '网络请求失败，请检查网络或代理';
  if (TIMEOUT_HINTS.some(hint => lower.includes(hint))) return '等待超时，请稍后重试';
  if (PARSE_HINTS.some(hint => lower.includes(hint))) return '返回内容不是有效的 JSON，可能被代理或错误页替换';
  for (const { pattern, describe } of HTTP_HINTS) {
    const matched = pattern.exec(text);
    if (matched) return describe(matched[0]);
  }
  return text;
}

/** 「动作失败：原因」；原因未知时只留「动作失败」。 */
export function formatFailure(action: string, error: unknown): string {
  const detail = describeFailure(error);
  const head = action.trim();
  if (!head) return detail || '操作失败';
  const subject = head.endsWith('失败') ? head : `${head}失败`;
  return detail ? `${subject}：${detail}` : subject;
}

function toast(kind: 'error' | 'warning', message: string) {
  if (typeof toastr === 'undefined') {
    // 宿主还没装上 toastr（例如静态预览）时不让反馈本身抛错。
    if (kind === 'warning') console.warn(message);
    else console.error(message);
    return;
  }
  if (kind === 'warning') toastr.warning(message);
  else toastr.error(message);
}

/** 报错：动作 + 原因，自动走手机通知桥接。 */
export function reportFailure(action: string, error: unknown) {
  toast('error', formatFailure(action, error));
}

/** 警告：用于「主操作成功、附带步骤失败」这类不算报错的情况。 */
export function reportWarning(action: string, error: unknown) {
  toast('warning', formatFailure(action, error));
}
