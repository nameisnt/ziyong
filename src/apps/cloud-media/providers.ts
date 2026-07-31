import type { CloudMediaProfile } from './store';
import type { MediaKind } from '@/apps/media/store';

export interface CloudMediaGenerateInput {
  lyrics: string;
  negativePrompt: string;
  note: string;
  prompt: string;
  title: string;
}

export interface CloudMediaGeneratedItem {
  kind: MediaKind;
  note: string;
  title: string;
  url: string;
}

type StatusCallback = (message: string) => void;

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function wait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('生成已停止', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('生成已停止', 'AbortError'));
      },
      { once: true },
    );
  });
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  const base = record.base_resp;
  const baseMessage =
    base && typeof base === 'object' ? String((base as Record<string, unknown>).status_msg || '').trim() : '';
  const detail =
    typeof record.detail === 'string'
      ? record.detail
      : typeof record.message === 'string'
        ? record.message
        : typeof record.error === 'string'
          ? record.error
          : '';
  return baseMessage || detail || fallback;
}

async function fetchJson(url: string, init: RequestInit, fallback: string) {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`${fallback}：浏览器无法访问接口，可能被 CORS 或网络策略拦截`);
    }
    throw error;
  }
  const text = await response.text();
  let payload: unknown = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }
  if (!response.ok) throw new Error(getErrorMessage(payload, `${fallback}：HTTP ${response.status}`));
  return payload as Record<string, unknown>;
}

function authHeaders(profile: CloudMediaProfile, scheme: 'Bearer' | 'Key') {
  if (!profile.apiKey.trim()) throw new Error(`请先填写 ${profile.provider === 'novelai' ? 'NovelAI Token' : 'API Key'}`);
  return {
    Authorization: `${scheme} ${profile.apiKey.trim()}`,
    'Content-Type': 'application/json',
  };
}

function deepMerge(base: Record<string, unknown>, extra: Record<string, unknown>) {
  const result = klona(base);
  Object.entries(extra).forEach(([key, value]) => {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  });
  return result;
}

function parseRequestJson(profile: CloudMediaProfile) {
  const raw = profile.requestJson.trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('高级请求 JSON 必须是对象');
  }
  return parsed as Record<string, unknown>;
}

function extensionKind(url: string): MediaKind | null {
  const clean = url.split(/[?#]/)[0].toLowerCase();
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(clean)) return 'image';
  if (/\.(mp3|wav|ogg|flac|m4a|aac|opus)$/.test(clean)) return 'audio';
  if (/\.(mp4|webm|mov|mkv)$/.test(clean)) return 'video';
  return null;
}

function collectFalUrls(value: unknown, fallbackKind: MediaKind) {
  const result: Array<{ kind: MediaKind; url: string }> = [];
  const seen = new Set<string>();
  const add = (url: string, kind: MediaKind) => {
    if (!/^https?:\/\//i.test(url) || seen.has(url)) return;
    seen.add(url);
    result.push({ kind, url });
  };
  const visit = (current: unknown, hintedKind = fallbackKind) => {
    if (typeof current === 'string') {
      const kind = extensionKind(current);
      if (kind) add(current, kind);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach(item => visit(item, hintedKind));
      return;
    }
    if (!current || typeof current !== 'object') return;
    const record = current as Record<string, unknown>;
    const contentType = String(record.content_type || record.mime_type || '').toLowerCase();
    const typeKind = contentType.startsWith('image/')
      ? 'image'
      : contentType.startsWith('audio/')
        ? 'audio'
        : contentType.startsWith('video/')
          ? 'video'
          : hintedKind;
    if (typeof record.url === 'string') add(record.url, extensionKind(record.url) ?? typeKind);
    Object.entries(record).forEach(([key, child]) => {
      const keyKind = /audio|music/i.test(key)
        ? 'audio'
        : /video/i.test(key)
          ? 'video'
          : /image|picture/i.test(key)
            ? 'image'
            : typeKind;
      visit(child, keyKind);
    });
  };
  visit(value);
  return result;
}

async function generateFal(
  profile: CloudMediaProfile,
  input: CloudMediaGenerateInput,
  onStatus: StatusCallback,
  signal?: AbortSignal,
) {
  const baseUrl = cleanBaseUrl(profile.baseUrl) || 'https://queue.fal.run';
  const endpoint = profile.model.trim().replace(/^\/+/, '');
  if (!endpoint) throw new Error('请填写 fal.ai 模型端点');
  const defaults: Record<string, unknown> = {
    prompt: input.prompt,
  };
  if (input.negativePrompt.trim()) defaults.negative_prompt = input.negativePrompt.trim();
  if (profile.kind === 'image') {
    defaults.image_size = { height: profile.height, width: profile.width };
    defaults.num_images = 1;
  }
  if (profile.kind === 'video') defaults.duration = profile.duration;
  const body = deepMerge(defaults, parseRequestJson(profile));
  onStatus('正在提交 fal.ai 队列');
  const submitted = await fetchJson(
    `${baseUrl}/${endpoint}`,
    {
      body: JSON.stringify(body),
      headers: authHeaders(profile, 'Key'),
      method: 'POST',
      signal,
    },
    'fal.ai 提交失败',
  );
  const statusUrl = String(submitted.status_url || '').trim();
  const responseUrl = String(submitted.response_url || '').trim();
  if (!statusUrl || !responseUrl) {
    const immediate = collectFalUrls(submitted, profile.kind);
    if (immediate.length) return immediate;
    throw new Error('fal.ai 没有返回任务状态地址');
  }

  for (let attempt = 0; attempt < 300; attempt += 1) {
    await wait(2000, signal);
    const status = await fetchJson(
      statusUrl,
      { headers: authHeaders(profile, 'Key'), signal },
      'fal.ai 状态查询失败',
    );
    const state = String(status.status || '').toUpperCase();
    const position = Number(status.queue_position);
    onStatus(
      state === 'IN_QUEUE' && Number.isFinite(position)
        ? `fal.ai 排队中，前方 ${position} 个任务`
        : state === 'IN_PROGRESS'
          ? 'fal.ai 正在生成'
          : 'fal.ai 正在处理',
    );
    if (state === 'COMPLETED') {
      const result = await fetchJson(
        responseUrl,
        { headers: authHeaders(profile, 'Key'), signal },
        'fal.ai 结果读取失败',
      );
      const outputs = collectFalUrls(result, profile.kind);
      if (!outputs.length) throw new Error('fal.ai 已完成，但没有找到媒体 URL');
      return outputs;
    }
  }
  throw new Error('fal.ai 生成超时');
}

function assertMiniMaxSuccess(payload: Record<string, unknown>, fallback: string) {
  const base = payload.base_resp;
  if (!base || typeof base !== 'object') return;
  const statusCode = Number((base as Record<string, unknown>).status_code ?? 0);
  if (statusCode !== 0) throw new Error(getErrorMessage(payload, fallback));
}

async function generateMiniMax(
  profile: CloudMediaProfile,
  input: CloudMediaGenerateInput,
  onStatus: StatusCallback,
  signal?: AbortSignal,
) {
  const baseUrl = cleanBaseUrl(profile.baseUrl) || 'https://api.minimaxi.com';
  const headers = authHeaders(profile, 'Bearer');
  if (profile.kind === 'image') {
    onStatus('MiniMax 正在生成图片');
    const payload = await fetchJson(
      `${baseUrl}/v1/image_generation`,
      {
        body: JSON.stringify({
          aspect_ratio: profile.aspectRatio,
          model: profile.model.trim() || 'image-01',
          n: 1,
          prompt: input.prompt,
          prompt_optimizer: true,
          response_format: 'url',
        }),
        headers,
        method: 'POST',
        signal,
      },
      'MiniMax 图片生成失败',
    );
    assertMiniMaxSuccess(payload, 'MiniMax 图片生成失败');
    const data = payload.data as Record<string, unknown> | undefined;
    const urls = Array.isArray(data?.image_urls) ? data.image_urls.map(String).filter(Boolean) : [];
    if (!urls.length) throw new Error('MiniMax 没有返回图片 URL');
    return urls.map(url => ({ kind: 'image' as const, url }));
  }

  if (profile.kind === 'audio') {
    onStatus('MiniMax 正在生成音乐');
    const payload = await fetchJson(
      `${baseUrl}/v1/music_generation`,
      {
        body: JSON.stringify({
          aigc_watermark: false,
          audio_setting: { bitrate: 256000, format: 'mp3', sample_rate: 44100 },
          is_instrumental: profile.instrumental,
          lyrics: input.lyrics.trim() || undefined,
          lyrics_optimizer: !profile.instrumental && !input.lyrics.trim(),
          model: profile.model.trim() || 'music-2.6',
          output_format: 'url',
          prompt: input.prompt,
          stream: false,
        }),
        headers,
        method: 'POST',
        signal,
      },
      'MiniMax 音乐生成失败',
    );
    assertMiniMaxSuccess(payload, 'MiniMax 音乐生成失败');
    const data = payload.data as Record<string, unknown> | undefined;
    const url = String(data?.audio || data?.audio_url || '').trim();
    if (!url) throw new Error('MiniMax 没有返回音频 URL');
    return [{ kind: 'audio' as const, url }];
  }

  onStatus('正在提交 MiniMax 视频任务');
  const submitted = await fetchJson(
    `${baseUrl}/v1/video_generation`,
    {
      body: JSON.stringify({
        duration: profile.duration,
        model: profile.model.trim() || 'MiniMax-Hailuo-2.3',
        prompt: input.prompt,
        resolution: profile.resolution,
      }),
      headers,
      method: 'POST',
      signal,
    },
    'MiniMax 视频任务提交失败',
  );
  assertMiniMaxSuccess(submitted, 'MiniMax 视频任务提交失败');
  const taskId = String(submitted.task_id || '').trim();
  if (!taskId) throw new Error('MiniMax 没有返回视频任务 ID');

  for (let attempt = 0; attempt < 120; attempt += 1) {
    await wait(5000, signal);
    const queryUrl = new URL(`${baseUrl}/v1/query/video_generation`);
    queryUrl.searchParams.set('task_id', taskId);
    const status = await fetchJson(queryUrl.toString(), { headers, signal }, 'MiniMax 视频状态查询失败');
    assertMiniMaxSuccess(status, 'MiniMax 视频状态查询失败');
    const state = String(status.status || '');
    onStatus(`MiniMax 视频：${state || '处理中'}`);
    if (state === 'Fail') throw new Error(getErrorMessage(status, 'MiniMax 视频生成失败'));
    if (state !== 'Success') continue;
    const fileId = String(status.file_id || '').trim();
    if (!fileId) throw new Error('MiniMax 视频任务完成，但没有文件 ID');
    const retrieveUrl = new URL(`${baseUrl}/v1/files/retrieve`);
    retrieveUrl.searchParams.set('file_id', fileId);
    const filePayload = await fetchJson(
      retrieveUrl.toString(),
      { headers, signal },
      'MiniMax 视频文件读取失败',
    );
    assertMiniMaxSuccess(filePayload, 'MiniMax 视频文件读取失败');
    const file = filePayload.file as Record<string, unknown> | undefined;
    const url = String(file?.download_url || '').trim();
    if (!url) throw new Error('MiniMax 没有返回视频下载地址');
    return [{ kind: 'video' as const, url }];
  }
  throw new Error('MiniMax 视频生成超时');
}

async function generateNovelAi(
  profile: CloudMediaProfile,
  input: CloudMediaGenerateInput,
  onStatus: StatusCallback,
  signal?: AbortSignal,
) {
  if (profile.kind !== 'image') throw new Error('NovelAI 当前只支持图片生成');
  const baseUrl = cleanBaseUrl(profile.baseUrl) || 'https://image.novelai.net';
  const model = profile.model.trim() || 'nai-diffusion-4-5-full';
  const isV4 = model.includes('diffusion-4');
  const caption = {
    caption: { base_caption: input.prompt, char_captions: [] },
    use_coords: false,
    use_order: true,
  };
  const negativeCaption = {
    caption: { base_caption: input.negativePrompt, char_captions: [] },
    legacy_uc: false,
  };
  const parameters: Record<string, unknown> = {
    add_original_image: true,
    cfg_rescale: 0,
    dynamic_thresholding: false,
    height: profile.height,
    image_format: 'png',
    legacy: false,
    n_samples: 1,
    negative_prompt: input.negativePrompt,
    noise_schedule: 'karras',
    params_version: 3,
    prompt: input.prompt,
    qualityToggle: true,
    sampler: profile.sampler || 'k_euler_ancestral',
    scale: profile.guidance,
    seed: Math.floor(Math.random() * 4_294_967_295),
    sm: false,
    sm_dyn: false,
    steps: profile.steps,
    width: profile.width,
  };
  if (isV4) {
    parameters.v4_prompt = caption;
    parameters.v4_negative_prompt = negativeCaption;
  }
  onStatus('NovelAI 正在生成图片');
  const payload = await fetchJson(
    `${baseUrl}/ai/generate-image`,
    {
      body: JSON.stringify({
        action: 'generate',
        input: input.prompt,
        model,
        parameters,
      }),
      headers: {
        ...authHeaders(profile, 'Bearer'),
        Accept: 'application/json',
      },
      method: 'POST',
      signal,
    },
    'NovelAI 图片生成失败',
  );
  const images = Array.isArray(payload.images) ? payload.images : [];
  const urls = images
    .map(image => {
      if (!image || typeof image !== 'object') return '';
      const base64 = String((image as Record<string, unknown>).image || '').trim();
      return base64 ? `data:image/png;base64,${base64}` : '';
    })
    .filter(Boolean);
  if (!urls.length) throw new Error('NovelAI 没有返回图片数据');
  return urls.map(url => ({ kind: 'image' as const, url }));
}

export async function generateCloudMedia(
  profile: CloudMediaProfile,
  input: CloudMediaGenerateInput,
  onStatus: StatusCallback,
  signal?: AbortSignal,
): Promise<CloudMediaGeneratedItem[]> {
  if (!input.prompt.trim()) throw new Error('请先填写生成提示词');
  const outputs =
    profile.provider === 'fal'
      ? await generateFal(profile, input, onStatus, signal)
      : profile.provider === 'minimax'
        ? await generateMiniMax(profile, input, onStatus, signal)
        : await generateNovelAi(profile, input, onStatus, signal);
  const providerName = profile.provider === 'fal' ? 'fal.ai' : profile.provider === 'minimax' ? 'MiniMax' : 'NovelAI';
  return outputs.map((output, index) => ({
    ...output,
    note: [
      `${providerName} · ${profile.model}`,
      input.note.trim(),
      `提示词：${input.prompt.trim()}`,
      input.negativePrompt.trim() ? `负面提示词：${input.negativePrompt.trim()}` : '',
      input.lyrics.trim() ? input.lyrics.trim() : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
    title: input.title.trim() || `${providerName} ${output.kind} ${index + 1}`,
  }));
}
