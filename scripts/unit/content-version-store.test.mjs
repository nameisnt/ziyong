/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function transpile(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
  }).outputText;
}

function toDataUrl(code) {
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

const versionsUrl = toDataUrl(await transpile('../../src/util/contentVersions.ts'));
const storeCode = (await transpile('../../src/util/contentVersionStore.ts')).replace(
  "'@/util/contentVersions'",
  `'${versionsUrl}'`,
);
const { appendContentVersion, activateContentVersion, updateContentVersion, deleteContentVersion } = await import(
  toDataUrl(storeCode)
);

function createHolder() {
  return {
    activeVersionId: '',
    content: '初始正文',
    title: '初始标题',
    versions: [],
  };
}

function createOptions(holder, overrides = {}) {
  return {
    createOriginal: () => ({ content: holder.content, title: holder.title }),
    buildVersion: () => ({ content: '新正文', title: '新标题' }),
    onVersionsChanged: () => {},
    syncFromVersion: version => {
      holder.content = version.content;
      holder.title = version.title;
    },
    ...overrides,
  };
}

test('appending creates the original version on legacy records first', () => {
  const holder = createHolder();
  const migrated = [];
  const version = appendContentVersion(holder, 'test_version', createOptions(holder, {
    onVersionsChanged: versions => migrated.push(versions.length),
  }));

  assert.equal(holder.versions.length, 2);
  assert.equal(holder.versions[0].origin, 'original');
  assert.equal(holder.versions[0].content, '初始正文');
  assert.equal(version.origin, 'rewrite');
  assert.equal(holder.activeVersionId, version.id);
  assert.equal(holder.content, '新正文');
  assert.equal(holder.title, '新标题');
  assert.deepEqual(migrated, [2]);
});

test('activating another version syncs the holder fields', () => {
  const holder = createHolder();
  appendContentVersion(holder, 'test_version', createOptions(holder));
  const original = holder.versions[0];

  const version = activateContentVersion(holder, original.id, current => {
    holder.content = current.content;
    holder.title = current.title;
  });

  assert.equal(version.id, original.id);
  assert.equal(holder.activeVersionId, original.id);
  assert.equal(holder.content, '初始正文');
});

test('activating a missing version returns null and keeps the active one', () => {
  const holder = createHolder();
  const version = appendContentVersion(holder, 'test_version', createOptions(holder));
  const missing = activateContentVersion(holder, 'missing', () => {
    assert.fail('syncFromVersion should not run for a missing version');
  });
  assert.equal(missing, null);
  assert.equal(holder.activeVersionId, version.id);
});

test('updating an inactive version does not overwrite the holder content', () => {
  const holder = createHolder();
  appendContentVersion(holder, 'test_version', createOptions(holder));
  const original = holder.versions[0];

  const updated = updateContentVersion(holder, original.id, { content: '旧版改动' }, current => {
    holder.content = current.content;
  });

  assert.equal(updated.content, '旧版改动');
  assert.equal(holder.content, '新正文');

  updateContentVersion(holder, holder.versions[1].id, { content: '新版改动' }, current => {
    holder.content = current.content;
  });
  assert.equal(holder.content, '新版改动');
});

test('deleting the active version switches back and cleans the removed version', () => {
  const holder = createHolder();
  const first = appendContentVersion(holder, 'test_version', createOptions(holder));
  const second = appendContentVersion(holder, 'test_version', {
    ...createOptions(holder),
    buildVersion: () => ({ content: '第三次正文', title: '第三次标题' }),
  });
  const removed = [];

  const activeVersion = deleteContentVersion(
    holder,
    second.id,
    current => {
      holder.content = current.content;
      holder.title = current.title;
    },
    { onVersionRemoved: versionId => removed.push(versionId) },
  );

  assert.equal(activeVersion.id, first.id);
  assert.equal(holder.versions.length, 2);
  assert.equal(holder.activeVersionId, first.id);
  assert.equal(holder.content, '新正文');
  assert.deepEqual(removed, [second.id]);
});

test('deleting the last remaining version is refused', () => {
  const holder = createHolder();
  holder.versions = [{ content: '唯一正文', createdAt: '2026-01-01T00:00:00.000Z', id: 'only', origin: 'original', title: '唯一标题' }];
  holder.activeVersionId = 'only';
  const missing = deleteContentVersion(holder, 'only', () => {
    assert.fail('syncFromVersion should not run when the last version is protected');
  });
  assert.equal(missing, null);
  assert.equal(holder.versions.length, 1);
});
