/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { computed, ref } from 'vue';
import { useTypeOrganize } from '../../src/apps/prompts/useTypeOrganize.ts';

function createHarness(initialIds = ['a', 'b', 'c']) {
  const items = ref(initialIds.map(id => ({ id })));
  const moved = [];
  const deleted = [];
  const notices = [];
  const confirmed = { value: true };
  const organize = useTypeOrganize({
    items: computed(() => items.value),
    moveToGroup: (promptIds, groupId) => {
      moved.push({ promptIds, groupId });
      return promptIds.length;
    },
    deletePrompt: promptId => deleted.push(promptId),
    confirm: async () => confirmed.value,
    notifySuccess: message => notices.push(message),
  });
  return { confirmed, deleted, items, moved, notices, organize };
}

test('starting and cancelling the organize mode clears the selection', () => {
  const { organize } = createHarness();
  organize.toggleTypePromptSelection('a');
  organize.typeOrganizeTargetGroupId.value = 'group-1';
  organize.startTypeOrganize();
  assert.equal(organize.typeOrganizeMode.value, true);
  assert.equal(organize.selectedTypePromptIds.value.size, 0);
  assert.equal(organize.typeOrganizeTargetGroupId.value, '');
  organize.toggleTypePromptSelection('b');
  organize.cancelTypeOrganize();
  assert.equal(organize.typeOrganizeMode.value, false);
  assert.equal(organize.selectedTypePromptIds.value.size, 0);
});

test('toggling ignores ids that are not in the current item list', () => {
  const { organize } = createHarness();
  organize.toggleTypePromptSelection('missing');
  assert.equal(organize.selectedTypePromptIds.value.size, 0);
  organize.toggleTypePromptSelection('a');
  organize.toggleTypePromptSelection('a');
  assert.equal(organize.selectedTypePromptIds.value.size, 0);
});

test('selecting all follows the current items and group selection toggles the group', () => {
  const { items, organize } = createHarness();
  organize.selectAllTypePrompts();
  assert.deepEqual([...organize.selectedTypePromptIds.value], ['a', 'b', 'c']);
  items.value.push({ id: 'd' });
  organize.selectAllTypePrompts();
  assert.equal(organize.selectedTypePromptIds.value.size, 4);
  assert.equal(organize.isTypePromptGroupSelected(['a', 'b']), true);
  organize.selectTypePromptGroup(['a', 'b']);
  assert.equal(organize.isTypePromptGroupSelected(['a', 'b']), false);
  organize.selectTypePromptGroup(['a', 'b']);
  assert.equal(organize.isTypePromptGroupSelected(['a', 'b']), true);
  organize.clearTypePromptSelection();
  assert.equal(organize.selectedTypePromptIds.value.size, 0);
  assert.equal(organize.isTypePromptGroupSelected([]), false);
});

test('moving the selection calls the store, notifies, and leaves the mode', () => {
  const { moved, notices, organize } = createHarness();
  organize.startTypeOrganize();
  organize.selectTypePromptGroup(['a', 'b']);
  organize.typeOrganizeTargetGroupId.value = 'group-2';
  organize.applyTypeGroupMove();
  assert.deepEqual(moved, [{ promptIds: ['a', 'b'], groupId: 'group-2' }]);
  assert.deepEqual(notices, ['已移动 2 个小剧场类型']);
  assert.equal(organize.typeOrganizeMode.value, false);
  assert.equal(organize.selectedTypePromptIds.value.size, 0);
});

test('removing the selection asks for confirmation before deleting', async () => {
  const { confirmed, deleted, notices, organize } = createHarness();
  organize.startTypeOrganize();
  organize.selectAllTypePrompts();
  confirmed.value = false;
  await organize.removeSelectedTypePrompts();
  assert.deepEqual(deleted, []);
  assert.equal(organize.typeOrganizeMode.value, true);
  confirmed.value = true;
  await organize.removeSelectedTypePrompts();
  assert.deepEqual(deleted, ['a', 'b', 'c']);
  assert.deepEqual(notices, ['已删除 3 个小剧场类型']);
  assert.equal(organize.typeOrganizeMode.value, false);
});

test('removing with an empty selection does nothing', async () => {
  const { deleted, notices, organize } = createHarness();
  await organize.removeSelectedTypePrompts();
  assert.deepEqual(deleted, []);
  assert.deepEqual(notices, []);
});
