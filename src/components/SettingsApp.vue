<template>
  <section class="pc-settings-app">
    <nav class="pc-settings-tabs" aria-label="设置分类">
      <button
        v-for="tab in settingsTabs"
        :key="tab.id"
        :class="['pc-segment-btn', { active: activeSettingsTab === tab.id }]"
        type="button"
        @click="activeSettingsTab = tab.id"
      >
        <i :class="tab.icon"></i>
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <div class="pc-settings-panels">
      <section v-if="activeSettingsTab === 'general'" class="pc-settings-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`当前聊天数据` }}
            </strong>
            <p>{{ `${currentChatLabel}。可导出或导入当前聊天 / 全部数据。` }}</p>
          </div>
          <span class="pc-tag">{{ formatSize(approxBytes) }}</span>
        </div>

        <div class="pc-data-grid">
          <article v-for="domain in currentContentCards" :key="domain.id" class="pc-data-card">
            <span>{{ domain.label }}</span>
            <strong>{{ domain.current.items }}</strong>
          </article>
          <article v-if="!currentContentCards.length" class="pc-data-card">
            <span>{{ t`创作内容` }}</span>
            <strong>0</strong>
          </article>
        </div>

        <div class="pc-action-grid">
          <button class="pc-soft-btn compact" type="button" @click="downloadBackup">
            <i class="fa-solid fa-file-export"></i>
            <span>{{ t`导出全部` }}</span>
          </button>
          <button class="pc-soft-btn compact" type="button" @click="downloadCurrentBackup">
            <i class="fa-solid fa-file-arrow-up"></i>
            <span>{{ t`导出当前` }}</span>
          </button>
          <button class="pc-soft-btn compact" type="button" @click="openBackupImport('scope')">
            <i class="fa-solid fa-file-import"></i>
            <span>{{ t`导入当前` }}</span>
          </button>
          <button class="pc-soft-btn compact" type="button" @click="openBackupImport('full')">
            <i class="fa-solid fa-rotate-left"></i>
            <span>{{ t`导入全部` }}</span>
          </button>
        </div>
        <input
          ref="backupInputEl"
          class="pc-hidden-input"
          type="file"
          accept="application/json,.json"
          @change="onBackupSelected"
        />
      </section>

      <section v-if="activeSettingsTab === 'general'" class="pc-settings-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`壁纸` }}
            </strong>
            <p>{{ `${wallpaperSummary}。支持 PNG / JPEG / WebP / GIF。` }}</p>
          </div>
          <button class="pc-soft-btn compact" type="button" @click="clearWallpaperSelection">
            <i class="fa-solid fa-ban"></i>
            <span>{{ t`关闭` }}</span>
          </button>
        </div>

        <div class="pc-asset-field">
          <select :value="wallpaperSelectionValue" class="pc-select" @change="onWallpaperSelect">
            <option value="none">{{ t`默认渐变背景` }}</option>
            <optgroup :label="t`预设壁纸`">
              <option v-for="preset in WALLPAPER_PRESETS" :key="preset.id" :value="`preset:${preset.id}`">
                {{ preset.name }}
              </option>
            </optgroup>
            <optgroup v-if="settings.wallpaper.customWallpapers.length" :label="t`自定义壁纸`">
              <option
                v-for="wallpaper in settings.wallpaper.customWallpapers"
                :key="wallpaper.id"
                :value="`custom:${wallpaper.id}`"
              >
                {{ wallpaper.name }}
              </option>
            </optgroup>
          </select>

          <div class="pc-asset-actions">
            <button class="pc-icon-btn" type="button" :title="t`导入壁纸`" @click="openWallpaperPicker">
              <i class="fa-solid fa-file-import"></i>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="!selectedCustomWallpaper"
              :title="t`导出壁纸`"
              @click="exportSelectedWallpaper"
            >
              <i class="fa-solid fa-file-export"></i>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="!selectedCustomWallpaper"
              :title="t`编辑壁纸名字`"
              @click="renameSelectedWallpaper"
            >
              <i class="fa-solid fa-pen"></i>
            </button>
            <button
              class="pc-icon-btn danger"
              type="button"
              :disabled="!selectedCustomWallpaper"
              :title="t`删除壁纸`"
              @click="deleteSelectedWallpaper"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <input
          ref="wallpaperInputEl"
          class="pc-hidden-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          @change="onWallpaperSelected"
        />
      </section>

      <section v-if="activeSettingsTab === 'general'" class="pc-settings-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`字体` }}
            </strong>
            <p>{{ t`支持 TTF / OTF / WOFF / WOFF2。` }}</p>
          </div>
          <button class="pc-soft-btn compact" type="button" @click="settingsStore.resetFontFamily()">
            <i class="fa-solid fa-rotate-left"></i>
            <span>{{ t`默认` }}</span>
          </button>
        </div>
        <div class="pc-asset-field">
          <select :value="fontSelectionValue" class="pc-select" @change="onFontSelect">
            <option v-for="option in builtinFontOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
            <optgroup v-if="settings.customFont.fonts.length" :label="t`自定义字体`">
              <option v-for="font in settings.customFont.fonts" :key="font.id" :value="`custom:${font.id}`">
                {{ font.name }}
              </option>
            </optgroup>
          </select>

          <div class="pc-asset-actions">
            <button class="pc-icon-btn" type="button" :title="t`导入字体`" @click="openFontPicker">
              <i class="fa-solid fa-file-import"></i>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="!selectedCustomFont"
              :title="t`导出字体`"
              @click="exportSelectedFont"
            >
              <i class="fa-solid fa-file-export"></i>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="!selectedCustomFont"
              :title="t`编辑字体名字`"
              @click="renameSelectedFont"
            >
              <i class="fa-solid fa-pen"></i>
            </button>
            <button
              class="pc-icon-btn danger"
              type="button"
              :disabled="!selectedCustomFont"
              :title="t`删除字体`"
              @click="deleteSelectedFont"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
        <input
          ref="fontInputEl"
          class="pc-hidden-input"
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
          multiple
          @change="onFontSelected"
        />
      </section>

      <section v-if="activeSettingsTab === 'interface'" class="pc-settings-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`阅读器` }}
            </strong>
            <p>{{ t`影响日记、番外、总结、书信、论坛、小剧场和阅读聊天的详情正文。` }}</p>
          </div>
          <button class="pc-soft-btn compact" type="button" @click="settingsStore.resetReaderAppearance()">
            <i class="fa-solid fa-rotate-left"></i>
            <span>{{ t`默认` }}</span>
          </button>
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">{{ t`使用字体` }}</label>
          <select :value="readerFontSelectionValue" class="pc-select" @change="onReaderFontSelect">
            <option value="">{{ t`跟随手机字体` }}</option>
            <option
              v-for="option in builtinFontOptions.filter(option => option.value)"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
            <optgroup v-if="settings.customFont.fonts.length" :label="t`自定义字体`">
              <option v-for="font in settings.customFont.fonts" :key="font.id" :value="`custom:${font.id}`">
                {{ font.name }}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="pc-control-row">
          <div>
            <strong>{{ t`字号` }}</strong>
            <p>{{ `${settings.reader.fontSize}px` }}</p>
          </div>
          <input
            :value="settings.reader.fontSize"
            type="range"
            min="14"
            max="24"
            step="1"
            @input="onReaderFontSizeInput"
          />
        </div>

        <div class="pc-control-row">
          <div>
            <strong>{{ t`行高` }}</strong>
            <p>{{ settings.reader.lineHeight.toFixed(1) }}</p>
          </div>
          <input
            :value="settings.reader.lineHeight"
            type="range"
            min="1.4"
            max="2.2"
            step="0.1"
            @input="onReaderLineHeightInput"
          />
        </div>

        <label class="pc-toggle-row">
          <span>
            <strong>
              {{ t`首行缩进` }}
            </strong>
          </span>
          <input :checked="settings.reader.firstLineIndent" type="checkbox" @change="onReaderFirstLineIndentChange" />
        </label>

        <label class="pc-toggle-row">
          <span>
            <strong>
              {{ t`每行空行` }}
            </strong>
          </span>
          <input :checked="settings.reader.blankLineBetweenLines" type="checkbox" @change="onReaderBlankLineChange" />
        </label>

        <div class="pc-reader-version-position">
          <span class="pc-field-label">{{ t`版本切换位置` }}</span>
          <div class="pc-segment" role="group" :aria-label="t`版本切换位置`">
            <button
              :class="['pc-segment-btn', { active: settings.reader.versionNavigatorPosition === 'before' }]"
              type="button"
              @click="settingsStore.setReaderVersionNavigatorPosition('before')"
            >
              {{ t`正文上方` }}
            </button>
            <button
              :class="['pc-segment-btn', { active: settings.reader.versionNavigatorPosition === 'after' }]"
              type="button"
              @click="settingsStore.setReaderVersionNavigatorPosition('after')"
            >
              {{ t`正文下方` }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="activeSettingsTab === 'interface'" class="pc-settings-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`界面尺寸` }}
            </strong>
            <p>{{ t`调整手机窗口固定宽高，阅读器比例会影响详情正文宽度。` }}</p>
          </div>
          <div class="pc-settings-actions">
            <button class="pc-soft-btn compact" type="button" @click="fitPhoneWindowToViewport">
              <i class="fa-solid fa-expand"></i>
              <span>{{ t`适配` }}</span>
            </button>
            <button class="pc-soft-btn compact" type="button" @click="settingsStore.resetInterfaceSize()">
              <i class="fa-solid fa-rotate-left"></i>
              <span>{{ t`默认` }}</span>
            </button>
          </div>
        </div>

        <div class="pc-control-row">
          <div>
            <strong>{{ t`手机宽度` }}</strong>
            <p>{{ `${settings.interfaceSize.phoneWidth}px` }}</p>
          </div>
          <div class="pc-range-with-number">
            <input
              :value="settings.interfaceSize.phoneWidth"
              type="range"
              min="320"
              max="720"
              step="10"
              @input="onPhoneWidthInput"
            />
            <input
              :value="settings.interfaceSize.phoneWidth"
              class="pc-number-input"
              type="number"
              min="320"
              max="720"
              step="10"
              @change="onPhoneWidthInput"
            />
          </div>
        </div>

        <div class="pc-control-row">
          <div>
            <strong>{{ t`手机高度` }}</strong>
            <p>{{ `${settings.interfaceSize.phoneHeight}px` }}</p>
          </div>
          <div class="pc-range-with-number">
            <input
              :value="settings.interfaceSize.phoneHeight"
              type="range"
              min="560"
              max="980"
              step="10"
              @input="onPhoneHeightInput"
            />
            <input
              :value="settings.interfaceSize.phoneHeight"
              class="pc-number-input"
              type="number"
              min="560"
              max="980"
              step="10"
              @change="onPhoneHeightInput"
            />
          </div>
        </div>

        <div class="pc-control-row">
          <div>
            <strong>{{ t`阅读器比例` }}</strong>
            <p>{{ `${settings.interfaceSize.readerScale}%` }}</p>
          </div>
          <div class="pc-range-with-number">
            <input
              :value="settings.interfaceSize.readerScale"
              type="range"
              min="80"
              max="120"
              step="5"
              @input="onReaderScaleInput"
            />
            <input
              :value="settings.interfaceSize.readerScale"
              class="pc-number-input"
              type="number"
              min="80"
              max="120"
              step="5"
              @change="onReaderScaleInput"
            />
          </div>
        </div>

        <div class="pc-layout-summary">
          <strong>{{ t`主界面布局` }}</strong>
          <span>{{
            `${settings.interfaceSize.homeColumns} 列 × ${settings.interfaceSize.homeRows} 行，每页 ${homePageCapacity} 个 App`
          }}</span>
        </div>

        <div class="pc-inline-grid three-cols">
          <label class="pc-select-field">
            <span class="pc-field-label">{{ t`主界面列数` }}</span>
            <input
              :value="settings.interfaceSize.homeColumns"
              class="pc-field pc-number-control"
              type="number"
              min="3"
              max="5"
              step="1"
              @change="onHomeColumnsInput"
            />
          </label>
          <label class="pc-select-field">
            <span class="pc-field-label">{{ t`主界面行数` }}</span>
            <input
              :value="settings.interfaceSize.homeRows"
              class="pc-field pc-number-control"
              type="number"
              min="2"
              max="5"
              step="1"
              @change="onHomeRowsInput"
            />
          </label>
          <label class="pc-select-field">
            <span class="pc-field-label">{{ t`Dock 列数` }}</span>
            <input
              :value="settings.interfaceSize.dockColumns"
              class="pc-field pc-number-control"
              type="number"
              min="3"
              max="5"
              step="1"
              @change="onDockColumnsInput"
            />
          </label>
        </div>

        <button class="pc-soft-btn" type="button" @click="settingsStore.resetPhoneWindowPosition()">
          <i class="fa-solid fa-location-crosshairs"></i>
          <span>{{ t`重置手机位置` }}</span>
        </button>
      </section>

      <section v-if="activeSettingsTab === 'connection'" class="pc-settings-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`生成默认值` }}
            </strong>
            <p>{{ generationSummary }}</p>
          </div>
          <button class="pc-soft-btn compact" type="button" @click="settingsStore.resetGenerationDefaults()">
            <i class="fa-solid fa-rotate-left"></i>
            <span>{{ t`默认` }}</span>
          </button>
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">{{ t`来源楼层模式` }}</label>
          <select v-model="settings.generation.sourceMode" class="pc-select">
            <option value="none">{{ t`不使用聊天楼层` }}</option>
            <option value="latest">{{ t`最新楼层` }}</option>
            <option value="fromStart">{{ t`从 0 到指定楼层` }}</option>
            <option value="all">{{ t`全部楼层` }}</option>
            <option value="single">{{ t`指定单层` }}</option>
            <option value="recent">{{ t`最近 N 楼` }}</option>
            <option value="range">{{ t`自定义范围` }}</option>
          </select>
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">{{ t`酒馆预设` }}</label>
          <div class="pc-preset-select-row">
            <select v-model="settings.generation.tavernPresetName" class="pc-select">
              <option value="">{{ t`跟随酒馆当前预设` }}</option>
              <option v-for="presetName in tavernPresetNames" :key="presetName" :value="presetName">
                {{ presetName }}
              </option>
            </select>
            <button class="pc-soft-btn compact" type="button" @click="refreshTavernPresetNames">
              <i class="fa-solid fa-rotate"></i>
              <span>{{ t`刷新` }}</span>
            </button>
          </div>
        </div>

        <div class="pc-number-field">
          <label class="pc-field-label">
            {{ t`RPM 请求限制` }}
            <InfoHint :text="t`限制任意连续 60 秒内的生成请求数，0 表示不限制。重试和批量任务共享计数。`" />
          </label>
          <input v-model.number="settings.generation.rpmLimit" class="pc-field" type="number" min="0" max="120" />
        </div>

        <div class="pc-select-field">
          <label class="pc-field-label">{{ t`结果去向` }}</label>
          <div class="pc-segment">
            <button
              :class="['pc-segment-btn', { active: settings.generation.resultMode === 'preview' }]"
              type="button"
              @click="settings.generation.resultMode = 'preview'"
            >
              {{ t`预览` }}
            </button>
            <button
              :class="['pc-segment-btn', { active: settings.generation.resultMode === 'save' }]"
              type="button"
              @click="settings.generation.resultMode = 'save'"
            >
              {{ t`直接保存` }}
            </button>
          </div>
        </div>

        <label class="pc-switch-row top-gap">
          <div>
            <strong>{{ t`默认开启流式` }}</strong>
          </div>
          <span class="pc-checkbox">
            <input v-model="settings.generation.stream" type="checkbox" />
          </span>
        </label>
      </section>

      <section v-if="activeSettingsTab === 'connection'" class="pc-settings-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`文本通道` }}
            </strong>
            <p>{{ textProviderSummary }}</p>
          </div>
          <button class="pc-soft-btn compact" type="button" @click="settingsStore.resetTextProvider()">
            <i class="fa-solid fa-rotate-left"></i>
            <span>{{ t`默认` }}</span>
          </button>
        </div>

        <div class="pc-segment top-gap">
          <button
            :class="['pc-segment-btn', { active: settings.textProvider.mode === 'tavern' }]"
            type="button"
            @click="settings.textProvider.mode = 'tavern'"
          >
            {{ t`酒馆当前 API` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: settings.textProvider.mode === 'external' }]"
            type="button"
            @click="enableExternalMode"
          >
            {{ t`外部兼容 API` }}
          </button>
        </div>

        <template v-if="settings.textProvider.mode === 'external'">
          <div class="pc-select-field">
            <label class="pc-field-label">{{ t`外部 API 配置` }}</label>
            <div class="pc-asset-field">
              <select
                class="pc-select"
                :value="settings.textProvider.activeExternalProfileId"
                @change="onExternalProfileSelect"
              >
                <option value="">{{ t`请选择配置` }}</option>
                <option v-for="profile in settings.textProvider.externalProfiles" :key="profile.id" :value="profile.id">
                  {{ profile.name }}
                </option>
              </select>
              <div class="pc-asset-actions">
                <button class="pc-icon-btn" type="button" :title="t`新建外部 API 配置`" @click="createExternalProfile">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
          </div>

          <EmptyState v-if="!activeExternalProfile" compact :title="t`还没有外部 API 配置，请先新建`" />

          <template v-else>
            <div class="pc-select-field">
              <label class="pc-field-label">{{ t`配置名称` }}</label>
              <input
                :value="activeExternalProfile.name"
                class="pc-field"
                type="text"
                :placeholder="t`例如 DeepSeek 写作`"
                @change="onExternalProfileNameChange"
              />
            </div>

            <div class="pc-select-field">
              <label class="pc-field-label">{{ t`服务类型` }}</label>
              <select class="pc-select" :value="activeExternalProfile.presetId" @change="onExternalProfilePresetChange">
                <option v-for="preset in EXTERNAL_API_PRESETS" :key="preset.id" :value="preset.id">
                  {{ preset.label }}
                </option>
              </select>
            </div>

            <div class="pc-select-field">
              <label class="pc-field-label">{{ t`接口地址` }}</label>
              <input
                :value="resolvedExternalApiUrl"
                class="pc-field"
                type="text"
                :disabled="activeExternalProfile.presetId !== 'custom'"
                :placeholder="t`例如 https://api.example.com/v1`"
                @change="onExternalApiUrlChange"
              />
              <p v-if="externalUrlStatus" class="pc-field-note">{{ externalUrlStatus }}</p>
            </div>

            <div class="pc-select-field">
              <label class="pc-field-label">{{ t`API Key` }}</label>
              <div class="pc-secret-field">
                <input
                  v-model="activeExternalProfile.apiKey"
                  class="pc-field"
                  :type="apiKeyVisible ? 'text' : 'password'"
                  :placeholder="t`仅保存在本机设置，备份不会包含 Key。`"
                />
                <button
                  class="pc-icon-btn"
                  type="button"
                  :title="apiKeyVisible ? t`隐藏 API Key` : t`显示 API Key`"
                  @click="apiKeyVisible = !apiKeyVisible"
                >
                  <i class="fa-solid" :class="apiKeyVisible ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
            </div>

            <div class="pc-select-field">
              <label class="pc-field-label">{{ t`模型` }}</label>
              <div class="pc-asset-field pc-model-field">
                <SearchableCombobox
                  v-model="activeExternalProfile.model"
                  allow-custom
                  input-label="选择或填写模型"
                  :options="externalModelSelectOptions"
                  :placeholder="t`获取模型或直接填写模型名`"
                />
                <div class="pc-asset-actions">
                  <button
                    class="pc-icon-btn"
                    type="button"
                    :disabled="externalModelLoading"
                    :title="t`获取模型列表`"
                    @click="refreshExternalModels"
                  >
                    <i
                      class="fa-solid"
                      :class="externalModelLoading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'"
                    ></i>
                  </button>
                </div>
              </div>
            </div>

            <button class="pc-soft-btn danger" type="button" @click="deleteActiveExternalProfile">
              <i class="fa-solid fa-trash"></i>
              <span>{{ t`删除当前配置` }}</span>
            </button>
          </template>
        </template>
      </section>

      <section v-if="activeSettingsTab === 'interface'" class="pc-settings-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`悬浮球` }}
            </strong>
            <p>{{ t`关闭手机后显示在页面右下角，可拖拽打开。` }}</p>
          </div>
          <label class="pc-toggle">
            <input v-model="settings.floatBallEnabled" type="checkbox" />
            <span></span>
          </label>
        </div>

        <div class="pc-control-row">
          <div>
            <strong>{{ t`尺寸` }}</strong>
            <p>{{ settings.floatBallSize }}px</p>
          </div>
          <input v-model="settings.floatBallSize" type="range" min="28" max="80" step="1" />
        </div>

        <div class="pc-control-row">
          <div>
            <strong>{{ t`颜色` }}</strong>
            <p>{{ settings.floatBallColor }}</p>
          </div>
          <input v-model="settings.floatBallColor" type="color" />
        </div>

        <button class="pc-soft-btn" type="button" @click="settingsStore.resetFloatBallPosition()">
          <i class="fa-solid fa-location-crosshairs"></i>
          <span>{{ t`重置悬浮球位置` }}</span>
        </button>
      </section>

      <section v-if="activeSettingsTab === 'advanced'" class="pc-settings-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`数据恢复` }}
              <InfoHint
                :text="
                  recoveryEntries.length
                    ? `当前有 ${recoveryEntries.length} 条待处理恢复日志`
                    : t`当前没有待处理的来源隐藏恢复日志。统一生成底座接入后，这里会显示需要人工处理的恢复事务。`
                "
              />
            </strong>
          </div>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="!recoveryEntries.length"
            :title="t`导出日志`"
            @click="exportRecoveries"
          >
            <i class="fa-solid fa-file-export"></i>
          </button>
        </div>

        <div v-if="recoveryEntries.length" class="pc-recovery-list">
          <article v-for="entry in recoveryEntries" :key="entry.scopeId" class="pc-recovery-card">
            <div class="pc-recovery-head">
              <div>
                <strong>{{ entry.scopeId }}</strong>
                <p>{{ `${entry.messages.length} 条楼层快照 · ${entry.generationId}` }}</p>
              </div>
              <button
                class="pc-icon-btn danger"
                type="button"
                :title="t`删除恢复日志`"
                @click="deleteRecovery(entry.scopeId)"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </article>
        </div>

        <button
          class="pc-soft-btn danger top-gap"
          type="button"
          :disabled="!recoveryEntries.length"
          @click="clearAllRecoveries"
        >
          <i class="fa-solid fa-trash-can"></i>
          <span>{{ t`清空全部恢复日志` }}</span>
        </button>
      </section>

      <section v-if="activeSettingsTab === 'advanced'" class="pc-settings-card pc-danger-card">
        <div class="pc-row pc-row-top">
          <div>
            <strong>
              {{ t`危险操作` }}
              <InfoHint :text="t`这些操作会清空已生成内容，执行前会再次确认。`" />
            </strong>
          </div>
        </div>

        <div class="pc-action-grid">
          <button class="pc-soft-btn danger compact" type="button" @click="clearCurrentChatData">
            <i class="fa-solid fa-trash"></i>
            <span>{{ t`清空当前` }}</span>
          </button>
          <button class="pc-soft-btn danger compact" type="button" @click="clearAllGeneratedContent">
            <i class="fa-solid fa-trash-can"></i>
            <span>{{ t`清空全部` }}</span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { WALLPAPER_PRESETS } from '@/data/wallpapers';
import {
  getRegisteredPhoneAppResetHandlers,
  getRegisteredPhoneBackupDomains,
  getRegisteredPhoneBackupRehydrateHandlers,
  getRegisteredPhoneContentStats,
  type PhoneContentStatsContribution,
} from '@/core/appRegistry';
import { useBaguStore } from '@/store/bagu';
import { useFavoritesStore } from '@/store/favorites';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import { usePromptStore } from '@/store/prompts';
import { useRecoveryStore } from '@/store/recovery';
import { useReaderStore } from '@/store/reader';
import { useSettingsStore } from '@/store/settings';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { parseChatScopeKey } from '@/util/chatArchive';
import {
  applyPhoneBackup,
  clearAllPhoneGeneratedContent,
  downloadCurrentChatPhoneBackup,
  downloadPhoneBackup,
  importPhoneBackupScopeToCurrentChat,
  listPhoneBackupScopeOptions,
  parsePhoneBackupFile,
  type PhoneBackupScopeOption,
} from '@/util/backup';
import { getLoadedPresetNameSafe, getOptionalGlobalValue, getPresetNamesSafe } from '@/util/runtime';
import {
  EXTERNAL_API_PRESETS,
  formatTextProviderSummary,
  getActiveExternalApiProfile,
  resolveExternalApiProfileUrl,
} from '@/util/textProvider';
import type { ExternalApiPresetId } from '@/type/settings';
import { storeToRefs } from 'pinia';

const bagu = useBaguStore();
const favorites = useFavoritesStore();
const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const previewDrafts = usePreviewDraftStore();
const prompts = usePromptStore();
const recovery = useRecoveryStore();
const reader = useReaderStore();
const settingsStore = useSettingsStore();
const backupInputEl = ref<HTMLInputElement | null>(null);
const backupImportMode = ref<'full' | 'scope'>('scope');
const fontInputEl = ref<HTMLInputElement | null>(null);
const wallpaperInputEl = ref<HTMLInputElement | null>(null);
const tavernPresetNames = ref<string[]>([]);
const externalModelLoading = ref(false);
const externalModelOptions = ref<Record<string, string[]>>({});
type SettingsTabId = 'advanced' | 'connection' | 'general' | 'interface';
const activeSettingsTab = ref<SettingsTabId>('general');
const apiKeyVisible = ref(false);
const { settings } = storeToRefs(settingsStore);
const { entries: recoveryEntries } = storeToRefs(recovery);

const settingsTabs = [
  { icon: 'fa-solid fa-database', id: 'general', label: '常规' },
  { icon: 'fa-solid fa-mobile-screen', id: 'interface', label: '界面' },
  { icon: 'fa-solid fa-plug', id: 'connection', label: '连接' },
  { icon: 'fa-solid fa-sliders', id: 'advanced', label: '高级' },
] as const;
const settingsTabIds: SettingsTabId[] = settingsTabs.map(tab => tab.id);

type CurrentContentCard = PhoneContentStatsContribution & {
  current: PhoneContentStatsContribution['current'];
  id: string;
  itemLabel: string;
  label: string;
};

const currentChatLabel = computed(() => {
  const scope = parseChatScopeKey(currentScopeKey.value);
  const owner =
    phone.viewingScopeKey === currentScopeKey.value
      ? phone.viewingScopeMeta.ownerName
      : formatScopeOwner(scope.ownerId);
  const chat = scope.chatId && scope.chatId !== '__no_chat__' ? scope.chatId : '未识别到聊天文件';
  return `酒馆当前：${owner} / ${chat}`;
});
const currentScopeKey = computed(() => getCurrentChatScopeKey());
const currentContentCards = computed<CurrentContentCard[]>(() =>
  getRegisteredPhoneContentStats(currentScopeKey.value)
    .map(contribution => ({
      ...contribution,
      current: contribution.current,
      id: contribution.domain.id,
      itemLabel: contribution.domain.itemLabel,
      label: contribution.domain.label,
    }))
    .filter(item => item.current.collections || item.current.items || item.current.chars),
);
const generationSummary = computed(() => {
  const sourceLabelMap = {
    none: '不使用聊天楼层',
    latest: '最新楼层',
    fromStart: '从头到指定楼层',
    all: '全部楼层',
    single: '指定单层',
    recent: '最近 N 楼',
    range: '自定义范围',
  } as const;
  const resultLabel = settings.value.generation.resultMode === 'preview' ? '预览' : '直接保存';
  const streamLabel = settings.value.generation.stream ? '流式开' : '流式关';
  const rpmLabel = settings.value.generation.rpmLimit ? `RPM ${settings.value.generation.rpmLimit}` : 'RPM 不限';
  const presetLabel = settings.value.generation.tavernPresetName.trim()
    ? `预设：${settings.value.generation.tavernPresetName.trim()}`
    : `预设：${getLoadedPresetNameSafe() || '当前'}`;
  return `${sourceLabelMap[settings.value.generation.sourceMode]} · ${presetLabel} · ${resultLabel} · ${streamLabel} · ${rpmLabel}`;
});
const builtinFontOptions = computed(() => [
  { label: '系统默认', value: '' },
  { label: '思源黑体 / Noto Sans SC', value: 'Noto Sans SC, Microsoft YaHei, sans-serif' },
  { label: '宋体阅读', value: 'SimSun, Songti SC, serif' },
  { label: '楷体阅读', value: 'KaiTi, STKaiti, serif' },
  { label: '等宽字体', value: 'SFMono-Regular, Consolas, Liberation Mono, monospace' },
]);
const selectedCustomWallpaper = computed(() => {
  if (settings.value.wallpaper.mode !== 'custom') return null;
  return (
    settings.value.wallpaper.customWallpapers.find(item => item.id === settings.value.wallpaper.selectedCustomId) ??
    settings.value.wallpaper.customWallpapers.find(item => item.path === settings.value.wallpaper.customPath) ??
    null
  );
});
const wallpaperSelectionValue = computed(() => {
  if (settings.value.wallpaper.mode === 'preset') return `preset:${settings.value.wallpaper.presetId}`;
  if (settings.value.wallpaper.mode === 'custom') {
    const selectedId = selectedCustomWallpaper.value?.id || settings.value.wallpaper.selectedCustomId;
    return selectedId ? `custom:${selectedId}` : 'none';
  }
  return 'none';
});
const selectedCustomFont = computed(() => {
  const selectedByFamily = settings.value.customFont.fonts.find(
    item => settings.value.fontFamily === settingsStore.getCustomFontFamily(item.id),
  );
  if (selectedByFamily) return selectedByFamily;
  if (!settings.value.fontFamily.startsWith('TavernPhoneImportedFont')) return null;
  return settings.value.customFont.fonts.find(item => item.id === settings.value.customFont.selectedFontId) ?? null;
});
const fontSelectionValue = computed(() => {
  const selectedFont = selectedCustomFont.value;
  if (selectedFont) return `custom:${selectedFont.id}`;
  return settings.value.fontFamily;
});
const readerSelectedCustomFont = computed(() => {
  if (!settings.value.reader.fontFamily.startsWith('TavernPhoneImportedFont')) return null;
  return (
    settings.value.customFont.fonts.find(
      item => settings.value.reader.fontFamily === settingsStore.getCustomFontFamily(item.id),
    ) ?? null
  );
});
const readerFontSelectionValue = computed(() => {
  const selectedFont = readerSelectedCustomFont.value;
  if (selectedFont) return `custom:${selectedFont.id}`;
  return settings.value.reader.fontFamily;
});
const wallpaperSummary = computed(() => {
  if (settings.value.wallpaper.mode === 'custom') {
    return selectedCustomWallpaper.value?.name.trim()
      ? `自定义壁纸 · ${selectedCustomWallpaper.value.name}`
      : '自定义壁纸';
  }
  if (settings.value.wallpaper.mode === 'preset') {
    return `预设壁纸 · ${WALLPAPER_PRESETS.find(item => item.id === settings.value.wallpaper.presetId)?.name || '未命名预设'}`;
  }
  return '当前使用默认渐变背景';
});
const textProviderSummary = computed(() => formatTextProviderSummary(settings.value.textProvider));
const activeExternalProfile = computed(() => getActiveExternalApiProfile(settings.value.textProvider));
const resolvedExternalApiUrl = computed(() =>
  activeExternalProfile.value ? resolveExternalApiProfileUrl(activeExternalProfile.value) : '',
);
const externalModelSelectOptions = computed(() => {
  const profile = activeExternalProfile.value;
  if (!profile) return [];
  const options = externalModelOptions.value[profile.id] ?? [];
  const selected = profile.model.trim();
  const models = selected && !options.includes(selected) ? [selected, ...options] : options;
  return models.map(model => ({ label: model, value: model }));
});
const homePageCapacity = computed(
  () => settings.value.interfaceSize.homeColumns * settings.value.interfaceSize.homeRows,
);
const externalUrlStatus = computed(() => {
  if (settings.value.textProvider.mode !== 'external') return '';
  const url = resolvedExternalApiUrl.value;
  if (!url) return '请填写外部 API 地址';
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? `已规范化为 ${url}` : '仅支持 http / https 地址';
  } catch {
    return '地址格式无效';
  }
});
const approxBytes = computed(
  () =>
    new Blob([
      JSON.stringify(
        Object.fromEntries(
          getRegisteredPhoneBackupDomains().map(domain => [domain.key, domain.exportData(currentScopeKey.value)]),
        ),
      ),
    ]).size,
);

watch(
  () => phone.currentRoute.params?.tab,
  tab => {
    if (typeof tab !== 'string') return;
    if (settingsTabIds.includes(tab as SettingsTabId)) {
      activeSettingsTab.value = tab as SettingsTabId;
    }
  },
  { immediate: true },
);

function onFontSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value.startsWith('custom:')) {
    settingsStore.selectCustomFont(value.slice('custom:'.length));
    return;
  }
  settingsStore.setFontFamily(value);
}

function onReaderFontSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value.startsWith('custom:')) {
    settingsStore.setReaderFontFamily(settingsStore.getCustomFontFamily(value.slice('custom:'.length)));
    return;
  }
  settingsStore.setReaderFontFamily(value);
}

async function onWallpaperSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  try {
    if (value === 'none') {
      await settingsStore.clearWallpaperSelection();
      return;
    }
    if (value.startsWith('preset:')) {
      await settingsStore.selectWallpaperPreset(value.slice('preset:'.length));
      return;
    }
    if (value.startsWith('custom:')) {
      settingsStore.selectCustomWallpaper(value.slice('custom:'.length));
    }
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '切换壁纸失败';
    toastr.error(message);
  }
}

function refreshTavernPresetNames() {
  tavernPresetNames.value = getPresetNamesSafe();
  const selectedPresetName = settings.value.generation.tavernPresetName.trim();
  if (selectedPresetName && !tavernPresetNames.value.includes(selectedPresetName)) {
    tavernPresetNames.value = [selectedPresetName, ...tavernPresetNames.value];
  }
}

function onReaderFontSizeInput(event: Event) {
  settingsStore.setReaderFontSize(Number((event.target as HTMLInputElement).value));
}

function onReaderLineHeightInput(event: Event) {
  settingsStore.setReaderLineHeight(Number((event.target as HTMLInputElement).value));
}

function onReaderFirstLineIndentChange(event: Event) {
  settingsStore.setReaderFirstLineIndent((event.target as HTMLInputElement).checked);
}

function onReaderBlankLineChange(event: Event) {
  settingsStore.setReaderBlankLineBetweenLines((event.target as HTMLInputElement).checked);
}

function onPhoneWidthInput(event: Event) {
  settingsStore.setPhoneWindowWidth(Number((event.target as HTMLInputElement).value));
}

function onPhoneHeightInput(event: Event) {
  settingsStore.setPhoneWindowHeight(Number((event.target as HTMLInputElement).value));
}

function fitPhoneWindowToViewport() {
  settingsStore.setPhoneWindowWidth(window.innerWidth);
  settingsStore.setPhoneWindowHeight(window.innerHeight);
  settingsStore.setPhoneWindowPosition(0, 0);
  toastr.success('已按当前窗口调整手机宽高');
}

function onReaderScaleInput(event: Event) {
  settingsStore.setReaderScale(Number((event.target as HTMLInputElement).value));
}

function onHomeColumnsInput(event: Event) {
  settingsStore.setHomeColumns(Number((event.target as HTMLInputElement).value));
}

function onHomeRowsInput(event: Event) {
  settingsStore.setHomeRows(Number((event.target as HTMLInputElement).value));
}

function onDockColumnsInput(event: Event) {
  settingsStore.setDockColumns(Number((event.target as HTMLInputElement).value));
}

function openWallpaperPicker() {
  wallpaperInputEl.value?.click();
}

function openFontPicker() {
  fontInputEl.value?.click();
}

async function onFontSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) return;

  const failed: string[] = [];
  for (const file of files) {
    try {
      await settingsStore.uploadCustomFont(file);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : '字体导入失败';
      failed.push(`${file.name}：${message}`);
    }
  }

  if (files.length > failed.length) {
    toastr.success(`已导入 ${files.length - failed.length} 个字体`);
  }
  if (failed.length) {
    toastr.warning(failed.join('；'));
  }
}

function exportStoredFile(path: string, name: string) {
  const normalizedPath = path.replace(/^\/+/, '');
  const anchor = document.createElement('a');
  anchor.href = `/${encodeURI(normalizedPath)}`;
  anchor.download = name || normalizedPath.split('/').pop() || 'sillytavern-phone-asset';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function exportSelectedFont() {
  const font = selectedCustomFont.value;
  if (!font) return;
  exportStoredFile(font.path, font.name);
  toastr.success('已开始导出字体');
}

async function renameSelectedFont() {
  const font = selectedCustomFont.value;
  if (!font) return;
  const nextName = await phone.promptNotice('输入新的字体名称', {
    confirmLabel: '保存',
    initialValue: font.name,
    title: '重命名字体',
  });
  if (nextName === null) return;
  settingsStore.renameCustomFont(font.id, nextName);
  toastr.success('已更新字体名称');
}

async function deleteSelectedFont() {
  const font = selectedCustomFont.value;
  if (!font) return;
  const shouldDelete = await phone.confirmNotice(`要删除字体“${font.name || '未命名字体'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;

  try {
    await settingsStore.deleteCustomFont(font.id);
    toastr.success('已删除字体');
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '字体删除失败';
    toastr.error(message);
  }
}

async function onWallpaperSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) return;

  const failed: string[] = [];
  for (const file of files) {
    try {
      await settingsStore.uploadCustomWallpaper(file);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : '壁纸上传失败';
      failed.push(`${file.name}：${message}`);
    }
  }

  if (files.length > failed.length) {
    toastr.success(`已导入 ${files.length - failed.length} 张壁纸`);
  }
  if (failed.length) {
    toastr.warning(failed.join('；'));
  }
}

function exportSelectedWallpaper() {
  const wallpaper = selectedCustomWallpaper.value;
  if (!wallpaper) return;
  exportStoredFile(wallpaper.path, wallpaper.name);
  toastr.success('已开始导出壁纸');
}

async function renameSelectedWallpaper() {
  const wallpaper = selectedCustomWallpaper.value;
  if (!wallpaper) return;
  const nextName = await phone.promptNotice('输入新的壁纸名称', {
    confirmLabel: '保存',
    initialValue: wallpaper.name,
    title: '重命名壁纸',
  });
  if (nextName === null) return;
  settingsStore.renameCustomWallpaper(wallpaper.id, nextName);
  toastr.success('已更新壁纸名称');
}

async function deleteSelectedWallpaper() {
  const wallpaper = selectedCustomWallpaper.value;
  if (!wallpaper) return;
  const shouldDelete = await phone.confirmNotice(`要删除壁纸“${wallpaper.name || '未命名壁纸'}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;

  try {
    await settingsStore.deleteCustomWallpaper(wallpaper.id);
    toastr.success('已删除壁纸');
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '壁纸删除失败';
    toastr.error(message);
  }
}

async function clearWallpaperSelection() {
  await settingsStore.clearWallpaperSelection();
}

function onExternalApiUrlChange(event: Event) {
  settingsStore.setTextProviderApiUrl((event.target as HTMLInputElement).value);
  const profile = activeExternalProfile.value;
  if (profile) {
    externalModelOptions.value = {
      ...externalModelOptions.value,
      [profile.id]: profile.model.trim() ? [profile.model.trim()] : [],
    };
  }
}

function enableExternalMode() {
  if (!settings.value.textProvider.externalProfiles.length) {
    settingsStore.createExternalApiProfile('custom');
    return;
  }
  settings.value.textProvider.mode = 'external';
}

function createExternalProfile() {
  settingsStore.createExternalApiProfile('custom');
}

function onExternalProfileSelect(event: Event) {
  settingsStore.setActiveExternalApiProfile((event.target as HTMLSelectElement).value);
}

function onExternalProfileNameChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const profile = activeExternalProfile.value;
  if (!profile) return;
  try {
    settingsStore.renameExternalApiProfile(profile.id, input.value);
  } catch (error) {
    input.value = profile.name;
    toastr.warning(error instanceof Error ? error.message : '配置名称无效');
  }
}

function onExternalProfilePresetChange(event: Event) {
  const profile = activeExternalProfile.value;
  if (!profile) return;
  settingsStore.setExternalApiProfilePreset(
    profile.id,
    (event.target as HTMLSelectElement).value as ExternalApiPresetId,
  );
  externalModelOptions.value = {
    ...externalModelOptions.value,
    [profile.id]: [],
  };
}

async function deleteActiveExternalProfile() {
  const profile = activeExternalProfile.value;
  if (!profile) return;
  const confirmed = await phone.confirmNotice(
    `删除外部 API 配置“${profile.name}”吗？API Key 和模型设置也会一并删除。`,
    {
      confirmLabel: '删除',
      kind: 'warning',
      title: '删除外部 API 配置？',
    },
  );
  if (!confirmed) return;
  settingsStore.deleteExternalApiProfile(profile.id);
  const next = { ...externalModelOptions.value };
  delete next[profile.id];
  externalModelOptions.value = next;
}

async function refreshExternalModels() {
  const profile = activeExternalProfile.value;
  const apiUrl = resolvedExternalApiUrl.value;
  if (!profile) {
    toastr.warning('请先新建外部 API 配置');
    return;
  }
  if (!apiUrl) {
    toastr.warning('请先填写接口地址');
    return;
  }

  externalModelLoading.value = true;
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    const apiKey = profile.apiKey.trim();
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/models`, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const models = Array.isArray(payload?.data)
      ? payload.data.map((item: unknown) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'id' in item) return String((item as { id?: unknown }).id || '');
          return '';
        })
      : [];
    const modelOptions = [...new Set<string>(models.map((model: string) => model.trim()).filter(Boolean))].sort(
      (left, right) => left.localeCompare(right),
    );
    externalModelOptions.value = {
      ...externalModelOptions.value,
      [profile.id]: modelOptions,
    };
    if (!modelOptions.length) {
      throw new Error('没有读取到模型');
    }
    if (!profile.model.trim()) {
      profile.model = modelOptions[0];
    }
    toastr.success(`已获取 ${modelOptions.length} 个模型`);
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '获取模型失败';
    toastr.error(`获取模型失败：${message}`);
  } finally {
    externalModelLoading.value = false;
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatScopeOwner(ownerId: string) {
  if (!ownerId || ownerId === '__no_character__') return '未识别到角色卡';
  const characterIndex = Number(ownerId);
  const runtimeCharacters = getOptionalGlobalValue<unknown[]>('characters');
  if (Number.isInteger(characterIndex) && Array.isArray(runtimeCharacters)) {
    const character = runtimeCharacters[characterIndex];
    if (character && typeof character === 'object') {
      const name = (character as Record<string, unknown>).name;
      if (typeof name === 'string' && name.trim()) return name.trim();
    }
  }
  return ownerId;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

async function clearCurrentChatData() {
  if (generationTasks.hasRunningTasks) {
    toastr.warning('请先暂停正在运行的生成任务，再清空聊天数据');
    return;
  }
  const resetHandlers = getRegisteredPhoneAppResetHandlers();
  const appNames = resetHandlers.map(item => item.app.name).join('、') || '创作';
  const shouldClear = await phone.confirmNotice(`要清空当前聊天中的${appNames}数据吗？此操作不会影响其他聊天。`, {
    confirmLabel: '清空',
    kind: 'warning',
  });
  if (!shouldClear) return;

  await Promise.all(resetHandlers.map(item => item.resetCurrentScope()));
  generationTasks.clearScopeTasks();
  previewDrafts.resetCurrentScope();
  favorites.clearSelection();
  toastr.success('已清空当前聊天的手机创作数据');
}

async function clearAllGeneratedContent() {
  if (generationTasks.hasRunningTasks) {
    toastr.warning('请先暂停正在运行的生成任务，再清空全部数据');
    return;
  }
  const appNames = getRegisteredPhoneBackupDomains()
    .map(domain => domain.key)
    .join('、');
  const firstConfirm = await phone.confirmNotice(
    `要清空插件内全部生成内容吗？这会删除所有聊天中的总结、日记、番外、论坛、小剧场和书信数据。不会删除设置、提示词和八股规则。\n\n涉及数据域：${appNames}`,
    {
      confirmLabel: '继续',
      kind: 'warning',
    },
  );
  if (!firstConfirm) return;

  const secondConfirm = await phone.confirmNotice(
    '再次确认：此操作不限当前聊天，会清空所有聊天的生成内容，且无法撤销。确定继续吗？',
    {
      confirmLabel: '清空全部',
      kind: 'warning',
    },
  );
  if (!secondConfirm) return;

  await clearAllPhoneGeneratedContent();
  getRegisteredPhoneBackupRehydrateHandlers().forEach(handler => handler());
  favorites.clearSelection();
  await phone.returnToCurrentScope();
  toastr.success('已清空全部生成内容');
}

function downloadBackup() {
  downloadPhoneBackup();
  toastr.success('已开始导出全部备份');
}

function downloadCurrentBackup() {
  downloadCurrentChatPhoneBackup();
  toastr.success('已开始导出当前聊天备份');
}

function openBackupImport(mode: 'full' | 'scope') {
  backupImportMode.value = mode;
  backupInputEl.value?.click();
}

function rehydrateImportedData() {
  settingsStore.rehydrateFromSettings();
  prompts.rehydrateFromSettings();
  bagu.rehydrateFromSettings();
  recovery.rehydrateFromSettings();
  reader.rehydrateFromSettings();
  getRegisteredPhoneBackupRehydrateHandlers().forEach(handler => handler());
  favorites.clearSelection();
}

function formatBackupScopeOption(option: PhoneBackupScopeOption, index: number) {
  const domains = option.domainLabels.join('、') || '创作内容';
  return `${index + 1}. ${option.label}｜${domains}｜${option.items} 项`;
}

async function selectBackupScopeOption(options: PhoneBackupScopeOption[]) {
  const promptText = ['选择要导入到当前聊天的备份来源，输入序号：', '', ...options.map(formatBackupScopeOption)].join(
    '\n',
  );
  const selected = await phone.promptNotice(promptText, {
    confirmLabel: '选择',
    initialValue: options.length === 1 ? '1' : '',
    placeholder: '输入序号',
    title: '选择备份来源',
  });
  if (selected === null) return null;
  const index = Number(selected.trim()) - 1;
  return Number.isInteger(index) && options[index] ? options[index] : null;
}

async function onBackupSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  try {
    const backup = await parsePhoneBackupFile(file);
    if (generationTasks.hasRunningTasks) {
      toastr.warning('请先暂停正在运行的生成任务，再恢复备份');
      return;
    }
    if (backupImportMode.value === 'full') {
      const shouldImport = await phone.confirmNotice(
        '要完整恢复这份手机备份吗？这会覆盖当前手机插件中的设置和全部已保存数据。',
        {
          confirmLabel: '恢复',
          kind: 'warning',
        },
      );
      if (!shouldImport) return;

      await applyPhoneBackup(backup);
      rehydrateImportedData();
      toastr.success('已完整恢复手机备份');
      return;
    }

    const options = listPhoneBackupScopeOptions(backup);
    if (!options.length) {
      toastr.warning('这份备份里没有可导入的聊天创作内容');
      return;
    }

    const selectedOption = await selectBackupScopeOption(options);
    if (!selectedOption) {
      toastr.warning('没有选择有效的备份来源');
      return;
    }

    const shouldImport = await phone.confirmNotice(
      `要把“${selectedOption.label}”导入到当前聊天吗？这只会覆盖当前聊天中对应 App 的内容，不会影响其他聊天。`,
      {
        confirmLabel: '导入',
        kind: 'warning',
      },
    );
    if (!shouldImport) return;

    await importPhoneBackupScopeToCurrentChat(backup, selectedOption.scopeKey);
    rehydrateImportedData();
    toastr.success('已导入到当前聊天');
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '导入备份失败';
    toastr.error(message);
  }
}

function exportRecoveries() {
  const blob = new Blob([JSON.stringify(recovery.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sillytavern-phone-recoveries-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function deleteRecovery(scopeId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条恢复日志吗？删除后将无法再从手机内恢复这次事务记录。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  recovery.deleteRecovery(scopeId);
  toastr.success('已删除恢复日志');
}

async function clearAllRecoveries() {
  const shouldClear = await phone.confirmNotice('要清空全部恢复日志吗？此操作不可撤销。', {
    confirmLabel: '清空',
    kind: 'warning',
  });
  if (!shouldClear) return;
  recovery.clearAllRecoveries();
  toastr.success('已清空全部恢复日志');
}

onMounted(() => {
  refreshTavernPresetNames();
});
</script>

<style scoped>
.pc-settings-app {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.pc-settings-tabs {
  z-index: 2;
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  border: 0.5px solid var(--pc-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--pc-bg) 88%, transparent);
  padding: 6px;
  backdrop-filter: blur(10px);
}

.pc-settings-panels {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 8px;
  overscroll-behavior: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

.pc-settings-tabs .pc-segment-btn {
  min-width: 0;
  min-inline-size: 0;
  min-height: 32px;
  gap: 4px;
  padding: 6px 7px;
  font-size: 12px;
}

.pc-settings-card,
.pc-data-card,
.pc-recovery-card,
.pc-row p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  line-height: 1.35;
}

.pc-settings-card {
  border: 0.5px solid var(--pc-border);
  border-radius: 14px;
  background: var(--pc-bg);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  padding: 10px;
}

.pc-row,
.pc-control-row,
.pc-data-grid,
.pc-inline-grid,
.pc-recovery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pc-row-top {
  align-items: flex-start;
}

.pc-settings-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.top-gap {
  margin-top: 8px;
}

.pc-control-row {
  margin-top: 8px;
}

.pc-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--pc-surface-strong);
}

.pc-toggle-row span {
  min-width: 0;
}

.pc-toggle-row strong {
  display: block;
}

.pc-toggle-row input {
  flex: 0 0 auto;
}

.pc-control-row input[type='range'] {
  width: 132px;
  accent-color: var(--pc-theme-accent);
}

.pc-range-with-number {
  display: grid;
  grid-template-columns: minmax(96px, 1fr) 64px;
  align-items: center;
  gap: 8px;
  width: min(210px, 58%);
}

.pc-range-with-number input[type='range'] {
  width: 100%;
}

.pc-number-input {
  width: 64px;
  border: 1px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 7px 6px;
  text-align: center;
}

.pc-number-control {
  text-align: center;
}

.pc-layout-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--pc-surface-strong);
}

.pc-layout-summary span {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.35;
  text-align: right;
}

.pc-control-row input[type='color'] {
  width: 44px;
  height: 34px;
  padding: 0;
  border: 0;
  background: transparent;
}

.pc-asset-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.pc-asset-actions {
  display: grid;
  grid-template-columns: repeat(4, 34px);
  gap: 6px;
}

.pc-model-field {
  grid-template-columns: minmax(0, 1fr) 34px;
}

.pc-model-field .pc-asset-actions {
  grid-template-columns: 34px;
}

.pc-settings-app .pc-segment-btn {
  min-inline-size: 76px;
}

.pc-settings-app .pc-soft-btn {
  margin-top: 8px;
}

.pc-settings-app .pc-soft-btn.compact {
  margin-top: 0;
  white-space: nowrap;
}

.pc-settings-app .pc-soft-btn.compact span {
  white-space: nowrap;
}

.pc-soft-btn.danger {
  color: var(--pc-danger);
}

.pc-select-field {
  margin-top: 8px;
}

.pc-reader-version-position {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}

.pc-reader-version-position .pc-segment {
  flex: 0 0 auto;
}

.pc-reader-version-position .pc-segment-btn {
  min-inline-size: 74px;
}

.pc-field-note {
  margin: 5px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.35;
}

.pc-settings-app .pc-area {
  resize: vertical;
  min-height: 96px;
}

.pc-settings-app .pc-area.compact {
  min-height: 76px;
}

.pc-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.pc-preset-select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px;
  gap: 8px;
  align-items: center;
}

.pc-recovery-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.pc-recovery-card,
.pc-inline-grid {
  display: grid;
  gap: 8px;
}

.pc-inline-grid.two-cols {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 8px;
}

.pc-inline-grid.three-cols {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 8px;
}

.pc-data-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.pc-data-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px;
  border: 0.5px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-surface-strong);
}

.pc-data-card span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-data-card strong {
  font-size: 20px;
  line-height: 1;
}

.pc-data-card p {
  margin: 8px 0 0;
  color: var(--pc-muted);
}

.pc-tag {
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  font-size: 11px;
}

.pc-tag.muted {
  background: color-mix(in srgb, var(--pc-text) 8%, transparent);
  color: var(--pc-muted);
}

.pc-secret-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  gap: 8px;
  align-items: center;
}

.pc-accordion {
  margin-top: 8px;
  border-radius: 12px;
  background: var(--pc-surface-strong);
  padding: 0 10px 10px;
}

.pc-accordion summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  color: var(--pc-text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  list-style: none;
}

.pc-accordion summary::-webkit-details-marker {
  display: none;
}

.pc-accordion summary i {
  color: var(--pc-muted);
  transition: transform 160ms ease;
}

.pc-accordion[open] summary i {
  transform: rotate(180deg);
}

.pc-danger-card {
  border-color: color-mix(in srgb, var(--pc-danger) 30%, var(--pc-border) 70%);
}

.pc-danger-card .pc-soft-btn.danger {
  background: color-mix(in srgb, var(--pc-danger) 9%, var(--pc-surface-strong) 91%);
}

.pc-icon-btn.danger {
  color: var(--pc-danger);
}
</style>
