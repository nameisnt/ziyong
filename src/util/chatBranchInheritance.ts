import { usePresetLinkStore } from '@/apps/preset-link/store';
import { useWorldbookLinkStore } from '@/apps/worldbook-link/store';
import { useWorldSlotsStore } from '@/apps/world-slots/store';
import { useStatusDisplayStore } from '@/apps/status-display/store';
import { useGenerationAliasesStore } from '@/store/generationAliases';
import {
  getCurrentChatScopeKey,
  isPlaceholderChatScopeKey,
  parseChatScopeKey,
  normalizeChatScopeId,
} from '@/store/chatScoped';
import { getSillyTavernContext, getTavernEventName } from '@/util/runtime';
import type { Pinia } from 'pinia';
import { nextTick } from 'vue';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettings } from '@sillytavern/script';

async function saveInheritedSettings() {
  const events = getSillyTavernContext()?.eventSource;
  const name = getTavernEventName('SETTINGS_UPDATED');
  if (!events?.on || !name) throw new Error('酒馆未提供设置保存确认接口');
  let saved = false;
  const confirm = () => {
    saved = true;
  };
  events.on(name, confirm);
  try {
    await saveSettings();
    if (!saved) throw new Error('酒馆尚未成功保存分支配置');
  } finally {
    events.off?.(name, confirm);
  }
}

const metadataKey = 'phone_branch_origin';
type BranchStamp = { scope: string; source?: string; completed?: string[] };

export function getBranchSource(stamp: BranchStamp | undefined, target: string, mainChat: unknown) {
  if (!stamp || stamp.scope === target) return stamp?.scope === target ? stamp.source : undefined;
  const source = parseChatScopeKey(stamp.scope);
  const destination = parseChatScopeKey(target);
  if (
    source.kind !== destination.kind ||
    source.ownerId !== destination.ownerId ||
    typeof mainChat !== 'string' ||
    normalizeChatScopeId(mainChat) !== source.chatId
  )
    return undefined;
  return stamp.scope;
}

export function installChatBranchInheritance(pinia: Pinia, applyCurrentScope: () => Promise<void>) {
  async function prepare() {
    const target = getCurrentChatScopeKey();
    if (isPlaceholderChatScopeKey(target)) return;
    const context = getSillyTavernContext();
    const metadata = context?.chatMetadata as Record<string, unknown> | undefined;
    const saveMetadata = context?.saveMetadata as (() => Promise<void>) | undefined;
    if (!metadata || !saveMetadata) return;
    const previous = metadata[metadataKey] as BranchStamp | undefined;
    if (previous?.scope === target && !previous.source) return;
    const source = getBranchSource(previous, target, metadata.main_chat);
    const stamp: BranchStamp = previous?.scope === target ? previous : { scope: target, source, completed: [] };
    metadata[metadataKey] = stamp;
    try {
      if (source) {
        const steps: Array<[string, () => unknown]> = [
          ['preset', () => usePresetLinkStore(pinia).inheritBinding(source, target)],
          ['worldbook', () => useWorldbookLinkStore(pinia).inheritProfiles(source, target)],
          ['slots', () => useWorldSlotsStore(pinia).inheritScope(source, target)],
          ['aliases', () => useGenerationAliasesStore(pinia).inheritScope(source, target)],
          ['status', () => useStatusDisplayStore(pinia).inheritScope(source, target)],
        ];
        for (const [id, copy] of steps) {
          if (stamp.completed?.includes(id)) continue;
          copy();
          (stamp.completed ??= []).push(id);
        }
      }
      await nextTick();
      if (getCurrentChatScopeKey() !== target) return;
      if (source) {
        await saveInheritedSettings();
        if (getCurrentChatScopeKey() !== target) return;
        delete stamp.source;
        delete stamp.completed;
      }
      await saveMetadata();
      if (source && getCurrentChatScopeKey() === target) {
        await applyCurrentScope();
        toastr.success('分支配置已继承，后续修改各自独立');
      }
    } catch (error) {
      toastr.error(
        `分支配置继承未完成：${error instanceof Error ? error.message : String(error)}。请重新进入该分支重试。`,
      );
    }
  }
  const events = getSillyTavernContext()?.eventSource;
  const name = getTavernEventName('CHAT_CHANGED');
  // Run before scoped stores and native binding synchronization see the new chat.
  if (name && events?.makeFirst) events.makeFirst(name, prepare);
  void prepare();
  return () => {
    if (name) events?.off?.(name, prepare);
  };
}
