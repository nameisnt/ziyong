/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

async function readSource(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const retiredIds = ['comfy', 'media', 'cloud-media', 'gallery', 'music', 'video'];

async function loadCleanup() {
  const source = await readSource('src/core/currentDataVersion.ts');
  const output = transpileModule(source, {
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
    fileName: 'currentDataVersion.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

test('all active media App modules are removed from auto registration', async () => {
  for (const appId of retiredIds) {
    await assert.rejects(access(new URL(`../../src/apps/${appId}/index.ts`, import.meta.url)));
  }
});

test('current data-version cleanup owns exact retired fields and shared-record pruning', async () => {
  const cleanup = await readSource('src/core/currentDataVersion.ts');
  for (const field of ['sillytavern_phone_media', 'sillytavern_phone_comfy', 'sillytavern_phone_cloud_media']) {
    assert.match(cleanup, new RegExp(field));
  }
  assert.match(cleanup, /applyCurrentPhoneDataVersion/u);
  assert.match(cleanup, /cleanPromptSettings/u);
  assert.match(cleanup, /cleanWorkbenchSettings/u);
  assert.match(cleanup, /cleanGenerationTasks/u);
  assert.match(cleanup, /cleanPreviewDrafts/u);
});

test('version upgrade deletes retired data without deleting unrelated app data and is idempotent', async () => {
  const { applyCurrentPhoneDataVersion, CURRENT_PHONE_DATA_VERSION } = await loadCleanup();
  const extensionSettings = {
    sillytavern_phone_media: { items: [{ id: 'old-media' }] },
    sillytavern_phone_comfy: { workflows: [{ id: 'old-comfy' }] },
    sillytavern_phone_cloud_media: { profiles: [{ id: 'old-cloud' }] },
    sillytavern_phone_prompt_settings: {
      appPrompts: { comfy: 'old', diary: 'keep', 'cloud-media': 'old' },
      taskTemplates: {
        'cloud-media.generate-prompt': 'old',
        'comfy.generate-prompt': 'old',
        'diary.generate': 'keep',
      },
      outputRules: { 'cloud-media.generate': {}, 'comfy.generate': {}, 'diary.generate': { keep: true } },
    },
    sillytavern_phone_generation_tasks: {
      tasks: [
        { appId: 'media', id: 'remove' },
        { appId: 'diary', id: 'keep' },
      ],
    },
    sillytavern_phone_preview_drafts: {
      scopes: {
        current: {
          drafts: [
            { appId: 'cloud-media', id: 'remove' },
            { appId: 'forum', id: 'keep' },
          ],
        },
      },
    },
    sillytavern_phone_workbench: {
      workflows: [
        { id: 'remove-workflow', steps: [{ appId: 'comfy', id: 'comfy-only' }] },
        {
          id: 'keep-workflow',
          pendingRuns: {
            first: {
              failedDraftIds: { comfy: 'remove', diary: 'keep' },
              failedStepIds: ['comfy', 'diary'],
              steps: [
                { appId: 'comfy', id: 'comfy' },
                { appId: 'diary', id: 'diary' },
              ],
            },
          },
          steps: [
            { appId: 'comfy', id: 'comfy' },
            { appId: 'diary', id: 'diary' },
          ],
        },
      ],
    },
    sillytavern_phone: {
      layout: {
        appOrder: ['diary', 'gallery', 'folder:media', 'folder:keep'],
        dockOrder: ['music', 'settings'],
        folders: [
          { appIds: ['media', 'video'], id: 'media', name: '媒体' },
          { appIds: ['cloud-media', 'forum'], id: 'keep', name: '保留' },
        ],
      },
      visualTheme: {
        appAccentOverrides: { diary: '#fff', media: '#000' },
        appIconAssetIds: { gallery: 'old', forum: 'keep' },
        appIconOverrides: { music: 'old', settings: 'keep' },
      },
    },
    unrelated: { keep: true },
  };

  assert.equal(applyCurrentPhoneDataVersion(extensionSettings), true);
  assert.equal('sillytavern_phone_media' in extensionSettings, false);
  assert.deepEqual(extensionSettings.unrelated, { keep: true });
  assert.deepEqual(extensionSettings.sillytavern_phone_prompt_settings.appPrompts, { diary: 'keep' });
  assert.deepEqual(extensionSettings.sillytavern_phone_generation_tasks.tasks, [{ appId: 'diary', id: 'keep' }]);
  assert.deepEqual(extensionSettings.sillytavern_phone_preview_drafts.scopes.current.drafts, [
    { appId: 'forum', id: 'keep' },
  ]);
  assert.deepEqual(extensionSettings.sillytavern_phone_workbench.workflows, [
    {
      id: 'keep-workflow',
      pendingRuns: {
        first: {
          failedDraftIds: { diary: 'keep' },
          failedStepIds: ['diary'],
          steps: [{ appId: 'diary', id: 'diary' }],
        },
      },
      steps: [{ appId: 'diary', id: 'diary' }],
    },
  ]);
  assert.deepEqual(extensionSettings.sillytavern_phone.layout, {
    appOrder: ['diary', 'folder:keep'],
    dockOrder: ['settings'],
    folders: [{ appIds: ['forum'], id: 'keep', name: '保留' }],
  });
  assert.deepEqual(extensionSettings.sillytavern_phone.visualTheme, {
    appAccentOverrides: { diary: '#fff' },
    appIconAssetIds: { forum: 'keep' },
    appIconOverrides: { settings: 'keep' },
  });
  assert.equal(extensionSettings.sillytavern_phone_data_version, CURRENT_PHONE_DATA_VERSION);
  assert.equal(applyCurrentPhoneDataVersion(extensionSettings), false);
});

test('active layout, prompts and workbench no longer expose media integration', async () => {
  const [layout, prompts, workbench, runner, tutorialCatalog, tutorialData, theme, visualCatalog, visualBaseline] =
    await Promise.all([
      readSource('src/core/appLayout.ts'),
      readSource('src/store/prompts.ts'),
      readSource('src/apps/workbench/WorkbenchApp.vue'),
      readSource('src/apps/workbench/runner.ts'),
      readSource('src/apps/tutorial/appCatalog.ts'),
      readSource('src/apps/tutorial/data.ts'),
      readSource('src/apps/theme/ThemeApp.vue'),
      readSource('src/testing/visual/scenarioCatalog.ts'),
      readSource('scripts/baselines/ui-visual.json'),
    ]);
  assert.doesNotMatch(layout, /home_default_media|媒体工具/u);
  assert.doesNotMatch(prompts, /legacyComfy|currentCloudMedia|comfy\.generate|cloud-media\.generate/u);
  assert.doesNotMatch(workbench, /comfyWorkflowId|ComfyUI|useComfyStore/u);
  assert.doesNotMatch(runner, /apps\/comfy|useMediaStore|appId === 'comfy'/u);
  for (const source of [tutorialCatalog, tutorialData, theme, visualCatalog, visualBaseline]) {
    assert.doesNotMatch(
      source,
      /app:(?:comfy|media|cloud-media|gallery|music|video)|cloud-media-(?:generate|settings|profile-crud)|comfy-(?:action-menu|parameter-modes|workflow-json|workflow-crud)|gallery-editor|media-(?:param-preview|library-crud)|video-(?:editor|viewer)/u,
    );
  }
  assert.doesNotMatch(tutorialCatalog, /appId: '(?:comfy|media|cloud-media|gallery|music|video)'/u);
  assert.doesNotMatch(tutorialData, /ComfyUI|云媒体|媒体生成/u);
  assert.doesNotMatch(theme, /\b(?:comfy|gallery|media|music|video): 'fa-/u);
});

test('general reader and theater media rendering remains available', async () => {
  const [frame, reader, runtime] = await Promise.all([
    readSource('src/util/theaterFrontend.ts'),
    readSource('src/components/ReaderDetailShell.vue'),
    readSource('src/util/runtime.ts'),
  ]);
  assert.match(frame, /img, video, canvas, svg/u);
  assert.match(frame, /audio, video/u);
  assert.match(reader, /'audio'[\s\S]*?'video'/u);
  assert.match(runtime, /image_url[\s\S]*?video_url/u);
});
