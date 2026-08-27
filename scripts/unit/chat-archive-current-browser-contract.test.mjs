/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/apps/archive/ChatArchiveApp.vue', import.meta.url), 'utf8');
const session = await readFile(
  new URL('../../src/apps/archive/useChatArchiveCatalogSession.ts', import.meta.url),
  'utf8',
);
const list = await readFile(new URL('../../src/apps/archive/ChatArchiveChatList.vue', import.meta.url), 'utf8');

test('current archive page reuses one read-only catalog path for list and random browsing', () => {
  assert.match(root, /pc-section-card pc-current-backup-status/u);
  assert.match(root, /class="pc-page-section pc-current-chat-browser"/u);
  assert.match(root, /<ChatArchiveChatList[\s\S]*?:rows="currentOwnerChatRows"[\s\S]*?@select="openCurrentOwnerChat"/u);
  assert.match(root, /<ChatArchiveChatList :loading="loadingChats" :rows="chatRows" @select="openChat"/u);
  assert.match(list, /v-for="chat in rows"/u);
  assert.match(root, /@click="randomCurrentOwnerChat"/u);
  assert.match(root, /:disabled="!currentOwnerChatRows\.length/u);

  assert.match(session, /const currentOwnerChatRows = ref<ArchiveChatRow\[\]>/u);
  assert.match(session, /async function loadCurrentOwnerChats/u);
  assert.match(session, /async function openChatForOwner\(owner: ArchiveOwner, chat: ArchiveChatRow\)/u);
  assert.match(session, /async function buildChatRowsForOwner/u);
  assert.match(session, /async function loadChatsForActiveOwner[\s\S]*buildChatRowsForOwner/u);
  assert.match(session, /async function loadCurrentOwnerChats[\s\S]*buildChatRowsForOwner/u);
  assert.match(session, /async function openChat\(chat: ArchiveChatRow\)[\s\S]*openChatForOwner/u);
});

test('current archive browser keeps status and list bounded on narrow phones', () => {
  assert.match(root, /\.pc-current-backup-status\s*\{[\s\S]*?min-width:\s*0/u);
  assert.match(root, /\.pc-current-backup-status p\s*\{[\s\S]*?overflow-wrap:\s*anywhere/u);
  assert.match(list, /\.pc-chat-list\.scrollable\s*\{[\s\S]*?overflow-y:\s*auto/u);
  assert.match(list, /\.pc-chat-list\.scrollable\s*\{[\s\S]*?max-height:/u);
});
