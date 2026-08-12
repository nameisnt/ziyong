<template>
  <section class="pc-recovery-app">
    <section v-if="route.page === 'root'" class="pc-recovery-page">
      <div class="pc-directory-list">
        <button class="pc-list-row pc-recovery-category-row" type="button" @click="openChatBackups">
          <span class="pc-recovery-category-icon"><i class="fa-solid fa-comments"></i></span>
          <span class="pc-list-row-copy">
            <strong>聊天备份</strong>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <button class="pc-list-row pc-recovery-category-row" type="button" @click="openSettingsSnapshots">
          <span class="pc-recovery-category-icon"><i class="fa-solid fa-sliders"></i></span>
          <span class="pc-list-row-copy">
            <strong>设置快照</strong>
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'chats'" class="pc-recovery-page">
      <div class="pc-compact-toolbar pc-recovery-toolbar">
        <label class="pc-search-field">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="query" type="search" placeholder="搜索角色或备份文件" />
        </label>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="recovery.loading || recovery.managementBusy"
          title="刷新备份书架"
          @click="recovery.refresh"
        >
          <i :class="['fa-solid fa-rotate', { spinning: recovery.loading }]"></i>
        </button>
      </div>
      <div class="pc-recovery-management-actions">
        <button class="pc-soft-btn" type="button" :disabled="recovery.managementBusy" @click="openCleanup()">
          <i class="fa-solid fa-broom"></i><span>清理小备份</span>
        </button>
        <button class="pc-soft-btn" type="button" :disabled="recovery.managementBusy" @click="openDuplicates()">
          <i class="fa-solid fa-clone"></i><span>查找重复备份</span>
        </button>
      </div>
      <div class="pc-segment pc-recovery-sort" aria-label="角色卡排序">
        <button
          :class="['pc-segment-btn', { active: sortMode === 'recent' }]"
          type="button"
          @click="sortMode = 'recent'"
        >
          最近备份
        </button>
        <button
          :class="['pc-segment-btn', { active: sortMode === 'character' }]"
          type="button"
          @click="sortMode = 'character'"
        >
          角色名称
        </button>
      </div>

      <article v-if="recovery.loading" class="pc-section-card pc-recovery-scan-status" aria-live="polite">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>{{ recovery.groups.length ? '正在重新扫描聊天备份……' : '正在读取酒馆聊天备份……' }}</span>
      </article>

      <article v-if="recovery.error" class="pc-section-card pc-recovery-error">
        <strong>{{ recovery.status === 'unsupported' ? '版本不支持' : '读取失败' }}</strong>
        <p>{{ recovery.error }}</p>
      </article>
      <EmptyState v-if="!recovery.loading && !filteredGroups.length" :title="emptyTitle">
        <p v-if="recovery.status !== 'unsupported'">SillyTavern 生成聊天备份后会显示在这里。</p>
      </EmptyState>

      <div v-else class="pc-directory-list">
        <button
          v-for="group in filteredGroups"
          :key="group.id"
          class="pc-list-row pc-recovery-group-row"
          type="button"
          @click="openGroup(group)"
        >
          <span class="pc-recovery-avatar" aria-hidden="true">{{ groupInitial(group) }}</span>
          <span class="pc-list-row-copy">
            <strong>{{ group.label }}</strong>
            <small>{{ group.backups.length }} 份备份 · 最近 {{ formatDate(group.backups[0]?.lastMessageAt) }}</small>
            <small v-if="group.kind === 'conflict'">
              匹配到：{{ group.conflictCharacters.map(item => item.name).join('、') }}
            </small>
          </span>
          <span class="pc-recovery-count">{{ group.backups.length }}</span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'settings-snapshots'" class="pc-recovery-page">
      <div class="pc-compact-toolbar pc-recovery-settings-toolbar">
        <span class="pc-directory-count">{{ recovery.settingsSnapshots.length }} 份设置快照</span>
        <div class="pc-directory-actions">
          <button class="pc-soft-btn" type="button" :disabled="recovery.managementBusy" @click="openSettingsDuplicates">
            <i class="fa-solid fa-clone"></i><span>查重</span>
          </button>
          <button
            class="pc-soft-btn"
            type="button"
            :disabled="recovery.managementBusy"
            @click="confirmMakeSettingsSnapshot"
          >
            <i :class="['fa-solid', recovery.settingsMaking ? 'fa-spinner fa-spin' : 'fa-camera']"></i>
            <span>{{ recovery.settingsMaking ? '创建中' : '新建' }}</span>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.managementBusy"
            title="刷新设置快照"
            @click="refreshSettingsSnapshots"
          >
            <i :class="['fa-solid fa-rotate', { spinning: recovery.settingsLoading }]"></i>
          </button>
        </div>
      </div>
      <article v-if="recovery.settingsLoading" class="pc-section-card pc-recovery-scan-status" aria-live="polite">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>正在读取酒馆设置快照……</span>
      </article>
      <article v-if="recovery.settingsError" class="pc-section-card pc-recovery-error">
        <strong>读取失败</strong>
        <p>{{ recovery.settingsError }}</p>
      </article>
      <EmptyState v-if="!recovery.settingsLoading && !recovery.settingsSnapshots.length" title="还没有设置快照">
        <p>可以点击“新建”保存当前酒馆设置。</p>
      </EmptyState>
      <div v-else class="pc-directory-list">
        <article
          v-for="snapshot in recovery.settingsSnapshots"
          :key="snapshot.name"
          class="pc-list-row pc-recovery-settings-row"
        >
          <span class="pc-recovery-book-icon"><i class="fa-solid fa-file-code"></i></span>
          <span class="pc-list-row-copy">
            <strong>{{ formatDate(snapshot.date) }}</strong>
            <small>{{ snapshot.name }}</small>
            <small>{{ formatBytes(snapshot.size) }}</small>
          </span>
          <span class="pc-recovery-row-actions">
            <button
              class="pc-soft-btn"
              type="button"
              :disabled="recovery.managementBusy"
              @click="confirmRestoreSettingsSnapshot(snapshot)"
            >
              恢复
            </button>
            <button
              class="pc-soft-btn danger"
              type="button"
              :disabled="recovery.managementBusy"
              @click="confirmDeleteSettingsSnapshot(snapshot)"
            >
              删除
            </button>
          </span>
        </article>
      </div>
    </section>

    <section v-else-if="route.page === 'group' && activeGroup" class="pc-recovery-page">
      <div class="pc-compact-toolbar pc-directory-toolbar">
        <span class="pc-directory-count">{{ activeGroup.backups.length }} 份备份</span>
        <div class="pc-directory-actions">
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.managementBusy"
            title="查找当前角色的重复备份"
            @click="openDuplicates(activeGroup.id)"
          >
            <i class="fa-solid fa-clone"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.managementBusy"
            title="清理当前角色的小备份"
            @click="openCleanup(activeGroup.id)"
          >
            <i class="fa-solid fa-broom"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="recovery.loading || recovery.managementBusy"
            title="刷新当前角色备份"
            @click="recovery.refresh"
          >
            <i :class="['fa-solid fa-rotate', { spinning: recovery.loading }]"></i>
          </button>
        </div>
      </div>
      <p class="pc-recovery-group-note">
        {{ activeGroup.label }} · 最近 {{ formatDate(activeGroup.backups[0]?.lastMessageAt) }}
      </p>
      <EmptyState v-if="!activeGroup.backups.length" title="这个角色没有聊天备份" />
      <div v-else class="pc-directory-list">
        <div v-for="backup in activeGroup.backups" :key="backup.fileName" class="pc-recovery-backup-row">
          <button
            class="pc-list-row pc-recovery-backup-open"
            type="button"
            :disabled="recovery.reading || recovery.managementBusy"
            @click="openBackup(backup)"
          >
            <span class="pc-recovery-book-icon"><i class="fa-solid fa-book"></i></span>
            <span class="pc-list-row-copy">
              <strong>{{ formatDate(backup.lastMessageAt) }}</strong>
              <small>{{ backup.fileName }}</small>
              <small
                >{{ backup.fileSize }} · {{ backup.chatItems }} 层 · {{ backup.lastMessage || '没有消息摘要' }}</small
              >
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :disabled="recovery.managementBusy"
            :title="`永久删除 ${backup.fileName}`"
            @click="confirmDeleteBackup(backup)"
          >
            <i
              :class="[
                'fa-solid',
                recovery.deletingFileName === backup.fileName ? 'fa-spinner spinning' : 'fa-trash-can',
              ]"
            ></i>
          </button>
        </div>
      </div>
    </section>

    <section v-else-if="route.page === 'duplicates'" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-duplicate-config">
        <div class="pc-section-head">
          <strong>完全一致查重</strong>
          <span>{{ duplicateScopeLabel }}</span>
        </div>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-shield-halved"></i>
          只匹配同一角色分组内原始 JSONL 字节长度和 SHA-256 都完全一致的文件。每组固定保留备份时间最新的一份。
        </p>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="recovery.duplicateScanning || recovery.duplicateDeleting"
          @click="scanDuplicates"
        >
          {{ duplicateScanButtonLabel }}
        </button>
      </article>

      <article v-if="recovery.duplicateScanning" class="pc-section-card pc-recovery-scan-status" aria-live="polite">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>{{ duplicateScanButtonLabel }}</span>
        <progress
          v-if="recovery.duplicateScanTotal"
          :max="recovery.duplicateScanTotal"
          :value="recovery.duplicateScanCompleted"
        ></progress>
      </article>

      <article v-if="recovery.duplicateScanResult" class="pc-section-card pc-recovery-duplicate-results">
        <div class="pc-section-head">
          <strong>重复候选</strong>
          <span>{{ duplicateSelectedNames.length }}/{{ duplicateCandidateCount }} 份已选</span>
        </div>
        <div
          v-if="duplicateCandidateCount + containedCandidateCount"
          class="pc-form-actions pc-recovery-selection-actions"
        >
          <button class="pc-soft-btn" type="button" @click="selectAllDuplicateCandidates">全选非保护项</button>
          <button class="pc-soft-btn" type="button" @click="clearDuplicateCandidates">清空选择</button>
        </div>
        <EmptyState v-if="!recovery.duplicateScanResult.groups.length" compact title="没有完全相同的重复备份">
          <p>原始文件没有完全一致的副本；严格续长包含候选会单独显示在下方。</p>
        </EmptyState>
        <div v-else class="pc-recovery-duplicate-list">
          <section
            v-for="group in recovery.duplicateScanResult.groups"
            :key="group.id"
            class="pc-recovery-duplicate-group"
          >
            <div class="pc-section-head">
              <strong>{{ duplicateGroupLabel(group) }}</strong>
              <span>可释放 {{ formatBytes(group.reclaimBytes) }}</span>
            </div>
            <button
              class="pc-recovery-duplicate-keeper"
              type="button"
              :disabled="recovery.managementBusy"
              @click="openBackup(group.keeper.summary)"
            >
              <i class="fa-solid fa-shield"></i>
              <span class="pc-list-row-copy">
                <strong>保留 · {{ formatBackupCreatedAt(group.keeper.summary) }}</strong>
                <small>{{ group.keeper.summary.fileName }}</small>
              </span>
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <div v-for="item in group.duplicates" :key="item.summary.fileName" class="pc-recovery-cleanup-item">
              <input
                type="checkbox"
                :checked="duplicateSelectedNames.includes(item.summary.fileName)"
                @change="toggleDuplicateCandidate(item.summary.fileName)"
              />
              <button
                class="pc-list-row-copy pc-recovery-candidate-open"
                type="button"
                :disabled="recovery.managementBusy"
                @click.stop="openBackup(item.summary)"
              >
                <strong>删除 · {{ formatBackupCreatedAt(item.summary) }}</strong>
                <small>{{ item.summary.fileName }} · {{ item.actualChatItems }} 层</small>
              </button>
              <i class="fa-solid fa-chevron-right"></i>
            </div>
          </section>
        </div>
        <p v-if="recovery.duplicateScanResult.rejected.length" class="pc-recovery-warning">
          已安全排除 {{ recovery.duplicateScanResult.rejected.length }} 份无法下载、解析或计数不一致的备份。
        </p>
        <button
          v-if="duplicateCandidateCount"
          class="pc-soft-btn danger"
          type="button"
          :disabled="!duplicateSelectedNames.length || recovery.duplicateDeleting"
          @click="confirmDuplicateDelete"
        >
          {{
            recovery.duplicateDeleting ? '正在逐份复核并删除…' : `删除选中的 ${duplicateSelectedNames.length} 份旧副本`
          }}
        </button>
      </article>

      <article v-if="recovery.duplicateDeleteResult" class="pc-section-card pc-recovery-cleanup-summary">
        <strong>查重删除完成</strong>
        <p>
          成功 {{ recovery.duplicateDeleteResult.deleted.length }} 份，释放
          {{ formatBytes(recovery.duplicateDeleteResult.reclaimedBytes) }}；失败或跳过
          {{ recovery.duplicateDeleteResult.failed.length }} 份。
        </p>
        <p v-if="recovery.duplicateDeleteResult.failed.length" class="pc-recovery-warning">
          失败或复核变化的文件仍保留，可重新扫描后检查。
        </p>
      </article>

      <article
        v-if="recovery.duplicateScanResult?.containedGroups.length"
        class="pc-section-card pc-recovery-duplicate-results"
      >
        <div class="pc-section-head">
          <strong>续长包含候选</strong>
          <span>{{ containedSelectedNames.length }}/{{ containedCandidateCount }} 份已选</span>
        </div>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-code-branch"></i>
          较长备份的开头逐条完整等于较短备份，并在末尾新增了楼层。较长分支受保护，较短候选默认选中；可分别阅读后取消。
        </p>
        <div class="pc-recovery-duplicate-list">
          <section
            v-for="group in recovery.duplicateScanResult.containedGroups"
            :key="group.id"
            class="pc-recovery-duplicate-group"
          >
            <div class="pc-section-head">
              <strong>保留 {{ group.keeper.actualChatItems }} 层续长版</strong>
              <span>可释放 {{ formatBytes(group.reclaimBytes) }}</span>
            </div>
            <button
              class="pc-recovery-duplicate-keeper"
              type="button"
              :disabled="recovery.managementBusy"
              @click="openBackup(group.keeper.summary)"
            >
              <i class="fa-solid fa-shield"></i>
              <span class="pc-list-row-copy">
                <strong>保留 · {{ formatBackupCreatedAt(group.keeper.summary) }}</strong>
                <small>{{ group.keeper.summary.fileName }} · {{ group.keeper.actualChatItems }} 层</small>
              </span>
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <div v-for="item in group.contained" :key="item.summary.fileName" class="pc-recovery-cleanup-item">
              <input
                type="checkbox"
                :checked="containedSelectedNames.includes(item.summary.fileName)"
                @change="toggleContainedCandidate(item.summary.fileName)"
              />
              <button
                class="pc-list-row-copy pc-recovery-candidate-open"
                type="button"
                :disabled="recovery.managementBusy"
                @click.stop="openBackup(item.summary)"
              >
                <strong>较短版 · {{ item.actualChatItems }} 层</strong>
                <small>
                  {{ item.summary.fileName }} · 续长版新增 {{ group.keeper.actualChatItems - item.actualChatItems }} 层
                </small>
              </button>
              <i class="fa-solid fa-chevron-right"></i>
            </div>
          </section>
        </div>
        <button
          class="pc-soft-btn danger"
          type="button"
          :disabled="!containedSelectedNames.length || recovery.duplicateDeleting"
          @click="confirmContainedDelete"
        >
          {{
            recovery.duplicateDeleting
              ? '正在逐份复核并删除…'
              : `删除选中的 ${containedSelectedNames.length} 份较短备份`
          }}
        </button>
      </article>
    </section>

    <section v-else-if="route.page === 'cleanup'" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-cleanup-config">
        <div class="pc-section-head">
          <strong>快速清理小备份</strong>
          <span>{{ cleanupScopeLabel }}</span>
        </div>
        <label class="pc-field-group">
          <span>删除实际楼层数小于或等于</span>
          <input v-model.number="cleanupThreshold" class="pc-field" min="0" step="1" type="number" />
        </label>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-shield-halved"></i>
          输入 0 只清理通过解析确认的 metadata-only。空文件、损坏文件和楼层计数不一致文件会自动排除。
        </p>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="recovery.cleanupScanning || recovery.cleanupDeleting"
          @click="scanCleanup"
        >
          {{ cleanupScanButtonLabel }}
        </button>
      </article>

      <article v-if="recovery.cleanupScanning" class="pc-section-card pc-recovery-scan-status" aria-live="polite">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>{{ cleanupScanButtonLabel }}</span>
        <progress
          v-if="recovery.cleanupScanTotal"
          :max="recovery.cleanupScanTotal"
          :value="recovery.cleanupScanCompleted"
        ></progress>
      </article>

      <article v-if="recovery.cleanupScanResult" class="pc-section-card pc-recovery-cleanup-results">
        <div class="pc-section-head">
          <strong>确认候选</strong>
          <span>{{ cleanupSelectedNames.length }}/{{ recovery.cleanupScanResult.candidates.length }} 份已选</span>
        </div>
        <EmptyState v-if="!recovery.cleanupScanResult.candidates.length" compact title="没有符合条件的安全候选" />
        <div v-else class="pc-recovery-cleanup-list">
          <section v-for="group in cleanupCandidateGroups" :key="group.id" class="pc-recovery-cleanup-group">
            <div class="pc-section-head">
              <strong>{{ group.label }}</strong>
              <span>{{ group.candidates.length }} 份</span>
            </div>
            <div
              v-for="candidate in group.candidates"
              :key="candidate.summary.fileName"
              class="pc-recovery-cleanup-item"
            >
              <input
                type="checkbox"
                :checked="cleanupSelectedNames.includes(candidate.summary.fileName)"
                @change="toggleCleanupCandidate(candidate.summary.fileName)"
              />
              <button
                class="pc-list-row-copy pc-recovery-candidate-open"
                type="button"
                :disabled="recovery.managementBusy"
                @click.stop="openBackup(candidate.summary)"
              >
                <strong>{{ candidate.summary.fileName }}</strong>
                <small>{{ candidate.actualChatItems }} 层 · {{ formatDate(candidate.summary.lastMessageAt) }}</small>
              </button>
              <i class="fa-solid fa-chevron-right"></i>
            </div>
          </section>
        </div>
        <p v-if="recovery.cleanupScanResult.rejected.length" class="pc-recovery-warning">
          已安全排除 {{ recovery.cleanupScanResult.rejected.length }} 份无法确认或计数不一致的备份。
        </p>
        <button
          v-if="recovery.cleanupScanResult.candidates.length"
          class="pc-soft-btn danger"
          type="button"
          :disabled="!cleanupSelectedNames.length || recovery.cleanupDeleting"
          @click="confirmCleanupDelete"
        >
          {{ recovery.cleanupDeleting ? '正在逐份删除…' : `永久删除选中的 ${cleanupSelectedNames.length} 份` }}
        </button>
      </article>

      <article v-if="recovery.cleanupDeleteResult" class="pc-section-card pc-recovery-cleanup-summary">
        <strong>清理完成</strong>
        <p>
          成功 {{ recovery.cleanupDeleteResult.deleted.length }} 份，失败
          {{ recovery.cleanupDeleteResult.failed.length }} 份。
        </p>
        <p v-if="recovery.cleanupDeleteResult.failed.length" class="pc-recovery-warning">
          失败项仍保留在备份书架中，可刷新后逐份检查。
        </p>
      </article>
    </section>

    <section v-else-if="route.page === 'settings-duplicates'" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-duplicate-config">
        <div class="pc-section-head">
          <strong>设置快照完全查重</strong>
          <span>{{ recovery.settingsSnapshots.length }} 份</span>
        </div>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-shield-halved"></i>
          只把原始 JSON 内容 SHA-256 完全一致的快照归为一组，每组固定保留时间最新的一份。
        </p>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="recovery.settingsDuplicateScanning || recovery.settingsDeleting"
          @click="scanSettingsDuplicates"
        >
          {{ settingsDuplicateScanButtonLabel }}
        </button>
      </article>

      <article
        v-if="recovery.settingsDuplicateScanning"
        class="pc-section-card pc-recovery-scan-status"
        aria-live="polite"
      >
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>{{ settingsDuplicateScanButtonLabel }}</span>
        <progress
          v-if="recovery.settingsDuplicateScanTotal"
          :max="recovery.settingsDuplicateScanTotal"
          :value="recovery.settingsDuplicateScanCompleted"
        ></progress>
      </article>

      <article v-if="recovery.settingsDuplicateScanResult" class="pc-section-card pc-recovery-duplicate-results">
        <div class="pc-section-head">
          <strong>重复候选</strong>
          <span>{{ settingsDuplicateSelectedNames.length }}/{{ settingsDuplicateCandidateCount }} 份已选</span>
        </div>
        <EmptyState v-if="!recovery.settingsDuplicateScanResult.groups.length" compact title="没有完全相同的设置快照" />
        <div v-else class="pc-recovery-duplicate-list">
          <section
            v-for="group in recovery.settingsDuplicateScanResult.groups"
            :key="group.id"
            class="pc-recovery-duplicate-group"
          >
            <div class="pc-section-head">
              <strong>{{ group.duplicates.length + 1 }} 份完全相同</strong>
              <span>可释放 {{ formatBytes(group.reclaimBytes) }}</span>
            </div>
            <div class="pc-recovery-duplicate-keeper">
              <i class="fa-solid fa-shield"></i>
              <span class="pc-list-row-copy">
                <strong>保留 · {{ formatDate(group.keeper.summary.date) }}</strong>
                <small>{{ group.keeper.summary.name }}</small>
              </span>
            </div>
            <div v-for="item in group.duplicates" :key="item.summary.name" class="pc-recovery-cleanup-item">
              <input
                type="checkbox"
                :checked="settingsDuplicateSelectedNames.includes(item.summary.name)"
                @change="toggleSettingsDuplicateCandidate(item.summary.name)"
              />
              <span class="pc-list-row-copy">
                <strong>删除 · {{ formatDate(item.summary.date) }}</strong>
                <small>{{ item.summary.name }} · {{ formatBytes(item.summary.size) }}</small>
              </span>
            </div>
          </section>
        </div>
        <p v-if="recovery.settingsDuplicateScanResult.rejected.length" class="pc-recovery-warning">
          已安全排除 {{ recovery.settingsDuplicateScanResult.rejected.length }} 份无法读取或解析的设置快照。
        </p>
        <button
          v-if="settingsDuplicateCandidateCount"
          class="pc-soft-btn danger"
          type="button"
          :disabled="!settingsDuplicateSelectedNames.length || recovery.settingsDeleting"
          @click="confirmSettingsDuplicateDelete"
        >
          {{
            recovery.settingsDeleting
              ? '正在逐份复核并删除…'
              : `删除选中的 ${settingsDuplicateSelectedNames.length} 份旧副本`
          }}
        </button>
      </article>

      <article v-if="recovery.settingsDeleteResult" class="pc-section-card pc-recovery-cleanup-summary">
        <strong>设置快照查重完成</strong>
        <p>
          成功 {{ recovery.settingsDeleteResult.deleted.length }} 份，释放
          {{ formatBytes(recovery.settingsDeleteResult.reclaimedBytes) }}；失败或跳过
          {{ recovery.settingsDeleteResult.failed.length }} 份。
        </p>
      </article>
    </section>

    <section v-else-if="route.page === 'reader' && loaded" class="pc-recovery-page pc-recovery-reader-page">
      <ReaderDetailShell
        v-if="activeMessage"
        :bagu-enabled="false"
        :content="activeMessage.content"
        content-formatted
        :edit-enabled="false"
        :favorite-enabled="false"
        footer-always-visible
        :next-disabled="messageIndex >= loaded.parsed.messages.length - 1"
        next-label="下一层"
        :previous-disabled="messageIndex <= 0"
        previous-label="上一层"
        :title="activeMessage.title"
        @bottom="scrollReader('bottom')"
        @catalog="catalogOpen = true"
        @next="openMessage(messageIndex + 1)"
        @previous="openMessage(messageIndex - 1)"
        @top="scrollReader('top')"
      >
        <template #kicker>
          <div class="pc-recovery-readonly-banner">
            <strong><i class="fa-solid fa-lock"></i> 备份只读视图</strong>
            <small>{{ loaded.summary.fileName }}</small>
            <small>
              {{ loaded.summary.fileSize }} · {{ loaded.parsed.messages.length }} 层 ·
              {{ formatDate(loaded.summary.lastMessageAt) }}
            </small>
            <small v-if="loaded.messageCountMismatch" class="pc-recovery-count-warning">
              {{ loaded.messageCountMismatch }}
            </small>
          </div>
        </template>
        <template #meta>
          <span class="pc-hidden-pill">{{ activeMessage.isUser ? '用户' : activeMessage.name }}</span>
          <span v-if="activeMessage.isHidden" class="pc-hidden-pill">隐藏</span>
        </template>
        <template #actions>
          <button
            class="pc-soft-btn danger"
            type="button"
            :disabled="recovery.managementBusy"
            title="永久删除此备份"
            @click="deleteLoadedBackup"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
          <button class="pc-primary-btn" type="button" title="导入此备份" @click="openImportConfirm">
            <i class="fa-solid fa-file-import"></i>
          </button>
        </template>
        <template #overlays>
          <CatalogModal
            :active-id="activeMessage.id"
            :items="catalogItems"
            :open="catalogOpen"
            title="备份楼层"
            @close="catalogOpen = false"
            @select="selectCatalogMessage"
          />
        </template>
      </ReaderDetailShell>
      <EmptyState v-else title="这份备份只有 metadata，没有聊天楼层">
        <p>它不能作为正常恢复点导入，可使用顶栏返回后删除或查看其他备份。</p>
      </EmptyState>
    </section>

    <section v-else-if="route.page === 'confirm' && loaded" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-confirm-card">
        <strong>确认原生导入</strong>
        <dl class="pc-recovery-details">
          <div>
            <dt>来源</dt>
            <dd>{{ loaded.summary.fileName }}</dd>
          </div>
          <div>
            <dt>备份</dt>
            <dd>{{ loaded.parsed.messages.length }} 层 · {{ formatDate(loaded.summary.lastMessageAt) }}</dd>
          </div>
          <div>
            <dt>识别角色</dt>
            <dd>{{ loaded.parsed.characterName || 'metadata 未记录' }}</dd>
          </div>
        </dl>
        <label class="pc-field-group">
          <span class="pc-field-label">目标角色卡</span>
          <SearchableCombobox
            v-model="selectedTargetId"
            input-label="选择导入目标角色卡"
            :options="targetOptions"
            placeholder="必须选择角色卡"
          />
        </label>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-shield-halved"></i> 将作为一份新聊天导入，不覆盖当前聊天，不删除原备份，也不复制插件
          scope 数据。
        </p>
        <p v-if="loaded.messageCountMismatch" class="pc-recovery-warning">{{ loaded.messageCountMismatch }}</p>
      </article>
      <div class="pc-form-actions pc-recovery-single-action">
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="!selectedTargetId || Boolean(loaded.messageCountMismatch) || recovery.importing"
          @click="confirmImport"
        >
          {{ recovery.importing ? '正在导入…' : '确认导入为新聊天' }}
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'result' && recovery.importResult" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-result-card">
        <i class="fa-solid fa-circle-check"></i>
        <strong>酒馆已创建新的导入聊天</strong>
        <p>{{ recovery.importResult.fileName }}</p>
        <small>目标角色：{{ recovery.importResult.target.name }}</small>
        <p v-if="!recovery.importResult.verified" class="pc-recovery-warning">
          聊天列表暂未确认到新文件，请勿重复导入；可返回书架刷新后检查。
        </p>
      </article>
      <div class="pc-form-actions pc-recovery-single-action">
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="!recovery.importResult.verified"
          @click="openImportedChat"
        >
          打开导入后的聊天
        </button>
      </div>
    </section>

    <EmptyState v-else title="备份管理页面状态已失效" />
  </section>
</template>

<script setup lang="ts">
import CatalogModal from '@/components/CatalogModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type {
  ChatBackupGroup,
  ChatBackupSummary,
  DuplicateBackupGroup,
  SettingsSnapshotSummary,
} from '@/apps/recovery/model';
import { useChatRecoveryStore } from '@/apps/recovery/store';
import { usePhoneStore } from '@/store/phone';
import { jumpToTavernChat } from '@/util/tavernNavigation';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const recovery = useChatRecoveryStore();
const { activeBackup: loaded } = storeToRefs(recovery);
const route = computed(() => phone.currentRoute);
const query = ref('');
const sortMode = ref<'character' | 'recent'>('recent');
const messageIndex = ref(0);
const catalogOpen = ref(false);
const selectedTargetId = ref('');
const cleanupThreshold = ref(0);
const cleanupSelectedNames = ref<string[]>([]);
const duplicateSelectedNames = ref<string[]>([]);
const containedSelectedNames = ref<string[]>([]);
const settingsDuplicateSelectedNames = ref<string[]>([]);

const activeGroup = computed(() => recovery.groups.find(group => group.id === route.value.params?.groupId) ?? null);
const activeMessage = computed(() => loaded.value?.parsed.messages[messageIndex.value] ?? null);
const catalogItems = computed(
  () =>
    loaded.value?.parsed.messages.map(message => ({ id: message.id, meta: message.name, title: message.title })) ?? [],
);
const targetOptions = computed(() =>
  recovery.characters.map(character => ({ label: character.name, value: String(character.id) })),
);
const filteredGroups = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase();
  const groups = recovery.groups.filter(
    group =>
      !needle ||
      `${group.label} ${group.backups.map(backup => `${backup.fileName} ${backup.lastMessage}`).join(' ')}`
        .toLocaleLowerCase()
        .includes(needle),
  );
  if (sortMode.value === 'character') return [...groups].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
  return [...groups].sort((a, b) => (b.backups[0]?.lastMessageAt ?? 0) - (a.backups[0]?.lastMessageAt ?? 0));
});
const cleanupScopeGroup = computed(
  () => recovery.groups.find(group => group.id === route.value.params?.groupId) ?? null,
);
const cleanupScopeLabel = computed(() => cleanupScopeGroup.value?.label ?? '全部角色');
const duplicateScopeGroup = computed(
  () => recovery.groups.find(group => group.id === route.value.params?.groupId) ?? null,
);
const duplicateScopeLabel = computed(() => duplicateScopeGroup.value?.label ?? '全部角色');
const duplicateCandidateCount = computed(() =>
  (recovery.duplicateScanResult?.groups ?? []).reduce((total, group) => total + group.duplicates.length, 0),
);
const containedCandidateCount = computed(() =>
  (recovery.duplicateScanResult?.containedGroups ?? []).reduce((total, group) => total + group.contained.length, 0),
);
const duplicateScanButtonLabel = computed(() => {
  if (!recovery.duplicateScanning) return '扫描完全相同的备份';
  if (!recovery.duplicateScanTotal) return '正在准备扫描…';
  return `正在校验 ${recovery.duplicateScanCompleted}/${recovery.duplicateScanTotal}`;
});
const cleanupScanButtonLabel = computed(() => {
  if (!recovery.cleanupScanning) return '扫描可清理备份';
  if (!recovery.cleanupScanTotal) return '正在准备扫描…';
  return `正在检查 ${recovery.cleanupScanCompleted}/${recovery.cleanupScanTotal}`;
});
const settingsDuplicateCandidateCount = computed(() =>
  (recovery.settingsDuplicateScanResult?.groups ?? []).reduce((total, group) => total + group.duplicates.length, 0),
);
const settingsDuplicateScanButtonLabel = computed(() => {
  if (!recovery.settingsDuplicateScanning) return '扫描完全相同的设置快照';
  if (!recovery.settingsDuplicateScanTotal) return '正在准备扫描…';
  return `正在校验 ${recovery.settingsDuplicateScanCompleted}/${recovery.settingsDuplicateScanTotal}`;
});
const cleanupCandidateGroups = computed(() => {
  const candidates = recovery.cleanupScanResult?.candidates ?? [];
  const grouped = new Map<string, { candidates: typeof candidates; id: string; label: string }>();
  candidates.forEach(candidate => {
    const owner = recovery.groups.find(group =>
      group.backups.some(backup => backup.fileName === candidate.summary.fileName),
    );
    const id = owner?.id ?? `unknown:${candidate.summary.ownerKey}`;
    const group = grouped.get(id) ?? { candidates: [], id, label: owner?.label ?? '未识别角色' };
    group.candidates.push(candidate);
    grouped.set(id, group);
  });
  return [...grouped.values()];
});
const emptyTitle = computed(() =>
  recovery.status === 'unsupported'
    ? '当前版本不支持备份书架'
    : query.value.trim()
      ? '没有匹配的聊天备份'
      : '还没有聊天备份',
);

onBeforeUnmount(() => {
  recovery.releaseActiveBackup();
});
watch(
  () => route.value.page,
  page => {
    if (!['reader', 'confirm', 'result'].includes(page)) recovery.releaseActiveBackup();
    if (page === 'confirm' && !selectedTargetId.value) selectedTargetId.value = suggestedTargetId();
  },
  { immediate: true },
);
watch(
  () => recovery.settingsDuplicateScanResult,
  result => {
    if (result && !recovery.settingsDeleteResult) {
      settingsDuplicateSelectedNames.value = result.groups.flatMap(group =>
        group.duplicates.map(item => item.summary.name),
      );
    }
  },
  { immediate: true },
);
watch(
  () => recovery.duplicateScanResult,
  result => {
    if (result && !recovery.duplicateDeleteResult) {
      duplicateSelectedNames.value = result.groups.flatMap(group =>
        group.duplicates.map(item => item.summary.fileName),
      );
      containedSelectedNames.value = result.containedGroups.flatMap(group =>
        group.contained.map(item => item.summary.fileName),
      );
    }
  },
  { immediate: true },
);
watch(
  () => recovery.cleanupScanResult,
  result => {
    if (result && !recovery.cleanupDeleteResult) {
      cleanupSelectedNames.value = result.candidates.map(candidate => candidate.summary.fileName);
    }
  },
  { immediate: true },
);

function formatDate(value?: number) {
  if (!value) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function formatBackupCreatedAt(summary: ChatBackupSummary) {
  return summary.backupCreatedAt ? formatDate(summary.backupCreatedAt) : summary.fileName;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 / 1024).toFixed(2)} MiB`;
}

function groupInitial(group: ChatBackupGroup) {
  return (group.character?.name || group.label).trim().slice(0, 1).toUpperCase() || '?';
}

function openGroup(group: ChatBackupGroup) {
  phone.pushPage('group', group.label, { groupId: group.id });
}

async function openChatBackups() {
  phone.pushPage('chats', '聊天备份');
  if (recovery.status === 'idle') {
    try {
      await recovery.refresh();
    } catch {
      // The page renders the store error with a retry action.
    }
  }
}

async function openSettingsSnapshots() {
  phone.pushPage('settings-snapshots', '设置快照');
  if (!recovery.settingsSnapshots.length) await refreshSettingsSnapshots();
}

async function refreshSettingsSnapshots() {
  try {
    await recovery.refreshSettingsSnapshots();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '读取设置快照失败');
  }
}

async function confirmMakeSettingsSnapshot() {
  const confirmed = await phone.confirmNotice('立即复制当前酒馆 settings.json，创建一份新的设置快照？', {
    confirmLabel: '创建设置快照',
    title: '新建设置快照',
  });
  if (!confirmed) return;
  try {
    await recovery.makeSettingsSnapshot();
    toastr.success('设置快照已创建');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '创建设置快照失败');
  }
}

async function confirmRestoreSettingsSnapshot(snapshot: SettingsSnapshotSummary) {
  const confirmed = await phone.confirmNotice(
    `文件：${snapshot.name}\n时间：${formatDate(snapshot.date)}\n\n恢复会用这份快照覆盖酒馆当前 settings.json。聊天、角色卡和世界书文件不会被覆盖；恢复后需要刷新酒馆页面才能完整生效。若要保留当前设置，请先返回列表点击“新建”。`,
    { confirmLabel: '覆盖当前设置', kind: 'warning', title: '确认恢复设置快照' },
  );
  if (!confirmed) return;
  try {
    await recovery.restoreSettingsSnapshot(snapshot);
    phone.noticeInfo('设置快照已经恢复。请刷新整个 SillyTavern 页面，让酒馆和扩展重新读取 settings.json。', {
      timeoutMs: 0,
      title: '设置恢复完成',
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '恢复设置快照失败');
  }
}

async function confirmDeleteSettingsSnapshot(snapshot: SettingsSnapshotSummary) {
  const confirmed = await phone.confirmNotice(
    `文件：${snapshot.name}\n时间：${formatDate(snapshot.date)}\n大小：${formatBytes(snapshot.size)}\n\n永久删除这份设置快照？列表不会读取或格式化快照正文。`,
    { confirmLabel: '删除快照', kind: 'warning', title: '确认删除设置快照' },
  );
  if (!confirmed) return;
  try {
    await recovery.deleteSettingsSnapshot(snapshot);
    toastr.success('设置快照已删除');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '删除设置快照失败');
  }
}

function openSettingsDuplicates() {
  recovery.resetSettingsDuplicates();
  settingsDuplicateSelectedNames.value = [];
  phone.pushPage('settings-duplicates', '设置快照查重');
}

async function scanSettingsDuplicates() {
  try {
    const result = await recovery.scanDuplicateSettingsSnapshots();
    settingsDuplicateSelectedNames.value = result.groups.flatMap(group =>
      group.duplicates.map(item => item.summary.name),
    );
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '扫描设置快照失败');
  }
}

function toggleSettingsDuplicateCandidate(name: string) {
  settingsDuplicateSelectedNames.value = settingsDuplicateSelectedNames.value.includes(name)
    ? settingsDuplicateSelectedNames.value.filter(item => item !== name)
    : [...settingsDuplicateSelectedNames.value, name];
}

async function confirmSettingsDuplicateDelete() {
  const scan = recovery.settingsDuplicateScanResult;
  if (!scan || !settingsDuplicateSelectedNames.value.length) return;
  const selectedBytes = scan.groups.reduce(
    (total, group) =>
      total +
      group.duplicates
        .filter(item => settingsDuplicateSelectedNames.value.includes(item.summary.name))
        .reduce((sum, item) => sum + item.summary.size, 0),
    0,
  );
  const confirmed = await phone.confirmNotice(
    `将永久删除：${settingsDuplicateSelectedNames.value.length} 份完全相同的旧设置快照\n预计释放：${formatBytes(selectedBytes)}\n\n每组最新快照会保留；删除前还会重新读取并复核 SHA-256。`,
    {
      confirmLabel: `删除 ${settingsDuplicateSelectedNames.value.length} 份旧副本`,
      kind: 'warning',
      title: '确认设置快照查重删除',
    },
  );
  if (!confirmed) return;
  try {
    const result = await recovery.deleteSettingsSnapshots(settingsDuplicateSelectedNames.value);
    settingsDuplicateSelectedNames.value = result.failed.map(item => item.name);
    if (result.failed.length) {
      toastr.warning(`已删除 ${result.deleted.length} 份，${result.failed.length} 份失败或跳过`);
    } else {
      toastr.success(`已删除 ${result.deleted.length} 份完全相同的旧设置快照`);
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '删除重复设置快照失败');
  }
}

async function openBackup(summary: ChatBackupSummary) {
  try {
    await recovery.readBackup(summary);
    messageIndex.value = 0;
    phone.pushPage('reader', '阅读聊天备份', {
      fileName: summary.fileName,
      groupId: activeGroup.value?.id ?? '',
      from: route.value.page,
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '读取聊天备份失败');
  }
}

function backupGroupLabel(summary: ChatBackupSummary) {
  return (
    recovery.groups.find(group => group.backups.some(backup => backup.fileName === summary.fileName))?.label ??
    '未知角色'
  );
}

async function confirmDeleteBackup(summary: ChatBackupSummary, navigateWhenGroupEmpty = true) {
  const confirmed = await phone.confirmNotice(
    `角色分组：${backupGroupLabel(summary)}\n文件：${summary.fileName}\n时间：${formatDate(summary.lastMessageAt)}\n楼层：${summary.chatItems}\n\n此操作会永久删除备份，但不会删除已有聊天。`,
    { confirmLabel: '永久删除备份', kind: 'warning', title: '确认删除聊天备份' },
  );
  if (!confirmed) return false;
  try {
    await recovery.deleteBackup(summary);
    toastr.success('聊天备份已删除');
    if (navigateWhenGroupEmpty && !recovery.groups.some(group => group.id === route.value.params?.groupId)) {
      phone.replacePage('root', '酒馆备份管理');
    }
    return true;
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '删除聊天备份失败');
    return false;
  }
}

async function deleteLoadedBackup() {
  const summary = loaded.value?.summary;
  if (!summary) return;
  const groupId = route.value.params?.groupId ?? '';
  if (!(await confirmDeleteBackup(summary, false))) return;
  if (route.value.params?.from === 'cleanup' || route.value.params?.from === 'duplicates') {
    await phone.goBack({ skipConfirm: true });
    return;
  }
  if (groupId && recovery.groups.some(group => group.id === groupId)) phone.goBack({ skipConfirm: true });
  else phone.replacePage('chats', '聊天备份');
}

function openCleanup(groupId = '') {
  recovery.resetCleanup();
  cleanupThreshold.value = 0;
  cleanupSelectedNames.value = [];
  phone.pushPage('cleanup', groupId ? '清理角色备份' : '快速清理备份', groupId ? { groupId } : {});
}

function openDuplicates(groupId = '') {
  recovery.resetDuplicates();
  duplicateSelectedNames.value = [];
  containedSelectedNames.value = [];
  phone.pushPage('duplicates', groupId ? '当前角色备份查重' : '重复备份查找', groupId ? { groupId } : {});
}

function toggleContainedCandidate(fileName: string) {
  containedSelectedNames.value = containedSelectedNames.value.includes(fileName)
    ? containedSelectedNames.value.filter(name => name !== fileName)
    : [...containedSelectedNames.value, fileName];
}

function selectAllDuplicateCandidates() {
  const scan = recovery.duplicateScanResult;
  if (!scan) return;
  duplicateSelectedNames.value = scan.groups.flatMap(group => group.duplicates.map(item => item.summary.fileName));
  containedSelectedNames.value = scan.containedGroups.flatMap(group =>
    group.contained.map(item => item.summary.fileName),
  );
}

function clearDuplicateCandidates() {
  duplicateSelectedNames.value = [];
  containedSelectedNames.value = [];
}

async function confirmContainedDelete() {
  if (!recovery.duplicateScanResult || !containedSelectedNames.value.length) return;
  const confirmed = await phone.confirmNotice(
    `将永久删除：${containedSelectedNames.value.length} 份较短聊天备份\n\n只有当较短备份的全部原始消息仍严格等于保留备份的开头时才会删除；删除前会重新下载双方复核。现有聊天不会被删除。`,
    {
      confirmLabel: `删除 ${containedSelectedNames.value.length} 份较短备份`,
      kind: 'warning',
      title: '确认删除续长包含备份',
    },
  );
  if (!confirmed) return;
  try {
    const result = await recovery.deleteContainedBackups(containedSelectedNames.value);
    containedSelectedNames.value = result.failed.map(item => item.summary.fileName);
    if (result.failed.length) {
      toastr.warning(`已删除 ${result.deleted.length} 份，${result.failed.length} 份失败或跳过`);
    } else {
      toastr.success(`已删除 ${result.deleted.length} 份较短聊天备份`);
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '删除较短聊天备份失败');
  }
}

async function scanDuplicates() {
  try {
    const result = await recovery.scanDuplicateBackups(route.value.params?.groupId ?? '');
    duplicateSelectedNames.value = result.groups.flatMap(group => group.duplicates.map(item => item.summary.fileName));
    containedSelectedNames.value = result.containedGroups.flatMap(group =>
      group.contained.map(item => item.summary.fileName),
    );
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '扫描重复备份失败');
  }
}

function duplicateGroupLabel(group: DuplicateBackupGroup) {
  const owner = recovery.groups.find(item =>
    item.backups.some(backup => backup.fileName === group.keeper.summary.fileName),
  );
  return `${owner?.label ?? '未识别角色'} · ${group.duplicates.length + 1} 份完全相同`;
}

function toggleDuplicateCandidate(fileName: string) {
  duplicateSelectedNames.value = duplicateSelectedNames.value.includes(fileName)
    ? duplicateSelectedNames.value.filter(name => name !== fileName)
    : [...duplicateSelectedNames.value, fileName];
}

async function confirmDuplicateDelete() {
  if (!recovery.duplicateScanResult || !duplicateSelectedNames.value.length) return;
  const selectedBytes = recovery.duplicateScanResult.groups.reduce(
    (total, group) =>
      total +
      group.duplicates
        .filter(item => duplicateSelectedNames.value.includes(item.summary.fileName))
        .reduce((groupTotal, item) => groupTotal + item.byteLength, 0),
    0,
  );
  const confirmed = await phone.confirmNotice(
    `范围：${duplicateScopeLabel.value}\n将永久删除：${duplicateSelectedNames.value.length} 份完全相同的旧副本\n预计释放：${formatBytes(selectedBytes)}\n\n每组最新备份会保留；删除前还会再次下载并校验。此操作不会删除已有聊天。`,
    {
      confirmLabel: `删除 ${duplicateSelectedNames.value.length} 份旧副本`,
      kind: 'warning',
      title: '确认查重删除',
    },
  );
  if (!confirmed) return;
  try {
    const result = await recovery.deleteDuplicateBackups(duplicateSelectedNames.value);
    duplicateSelectedNames.value = result.failed.map(item => item.summary.fileName);
    if (result.failed.length) {
      toastr.warning(`已删除 ${result.deleted.length} 份，${result.failed.length} 份失败或跳过`);
    } else {
      toastr.success(`已删除 ${result.deleted.length} 份完全相同的旧备份`);
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '查重删除失败');
  }
}

async function scanCleanup() {
  try {
    const result = await recovery.scanCleanup(Number(cleanupThreshold.value), route.value.params?.groupId ?? '');
    cleanupSelectedNames.value = result.candidates.map(candidate => candidate.summary.fileName);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '扫描可清理备份失败');
  }
}

function toggleCleanupCandidate(fileName: string) {
  cleanupSelectedNames.value = cleanupSelectedNames.value.includes(fileName)
    ? cleanupSelectedNames.value.filter(name => name !== fileName)
    : [...cleanupSelectedNames.value, fileName];
}

async function confirmCleanupDelete() {
  const scan = recovery.cleanupScanResult;
  if (!scan || !cleanupSelectedNames.value.length) return;
  const confirmed = await phone.confirmNotice(
    `范围：${cleanupScopeLabel.value}\n阈值：${scan.maxChatItems} 层及以下\n将永久删除：${cleanupSelectedNames.value.length} 份备份\n\n批量删除无法撤销，但不会删除已有聊天。`,
    { confirmLabel: `永久删除 ${cleanupSelectedNames.value.length} 份`, kind: 'warning', title: '确认快速清理' },
  );
  if (!confirmed) return;
  try {
    const result = await recovery.deleteCleanupCandidates(cleanupSelectedNames.value);
    cleanupSelectedNames.value = result.failed.map(item => item.summary.fileName);
    if (result.failed.length) toastr.warning(`已删除 ${result.deleted.length} 份，${result.failed.length} 份失败`);
    else toastr.success(`已删除 ${result.deleted.length} 份聊天备份`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '快速清理失败');
  }
}

function openMessage(index: number) {
  if (!loaded.value) return;
  messageIndex.value = Math.max(0, Math.min(index, loaded.value.parsed.messages.length - 1));
}

function selectCatalogMessage(messageId: string) {
  const index = loaded.value?.parsed.messages.findIndex(message => message.id === messageId) ?? -1;
  if (index >= 0) openMessage(index);
  catalogOpen.value = false;
}

function scrollReader(edge: 'bottom' | 'top') {
  document
    .querySelector('.pc-recovery-reader-page .pc-reader-content')
    ?.scrollTo({ behavior: 'smooth', top: edge === 'top' ? 0 : Number.MAX_SAFE_INTEGER });
}

function openImportConfirm() {
  if (!loaded.value?.parsed.messages.length || loaded.value.messageCountMismatch) return;
  selectedTargetId.value = suggestedTargetId();
  phone.pushPage('confirm', '确认导入备份');
}

function suggestedTargetId() {
  const fileName = loaded.value?.summary.fileName;
  const group = recovery.groups.find(item => item.backups.some(backup => backup.fileName === fileName));
  return group?.kind === 'character' && group.character ? String(group.character.id) : '';
}

async function confirmImport() {
  if (!selectedTargetId.value) return;
  const targetId = Number(selectedTargetId.value);
  if (!Number.isInteger(targetId) || targetId < 0) return;
  try {
    await recovery.importActiveBackup(targetId);
    phone.replacePage('result', '导入完成');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '聊天备份导入失败');
  }
}

async function openImportedChat() {
  const result = recovery.importResult;
  if (!result?.verified) return;
  try {
    await jumpToTavernChat({
      avatar: result.target.avatar,
      characterId: result.target.id,
      chatFile: result.fileName,
      ownerName: result.target.name,
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '无法打开导入后的聊天');
  }
}
</script>

<style scoped>
.pc-recovery-app,
.pc-recovery-page {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.pc-recovery-app {
  height: 100%;
}

.pc-recovery-page {
  flex: 1 1 auto;
  gap: 10px;
}

.pc-recovery-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-recovery-category-row {
  grid-template-columns: 42px minmax(0, 1fr) 14px;
}

.pc-recovery-category-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 15%, var(--pc-surface-strong) 85%);
  color: var(--pc-theme-accent);
}

.pc-recovery-settings-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pc-recovery-settings-toolbar .pc-directory-actions {
  display: flex;
  gap: 6px;
}

.pc-recovery-settings-toolbar .pc-soft-btn {
  min-width: 0;
  padding-inline: 9px;
}

.pc-recovery-settings-row {
  grid-template-columns: 38px minmax(0, 1fr) auto;
}

.pc-recovery-row-actions {
  display: flex;
  gap: 6px;
}

.pc-recovery-row-actions .pc-soft-btn {
  min-width: 0;
  padding-inline: 8px;
}

.pc-recovery-selection-actions {
  margin: 0;
}

.pc-recovery-scan-status {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: var(--pc-theme-accent);
}

.pc-recovery-scan-status progress {
  grid-column: 1 / -1;
  width: 100%;
  accent-color: var(--pc-theme-accent);
}

.pc-recovery-management-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-recovery-management-actions .pc-soft-btn {
  min-width: 0;
}

.pc-recovery-sort {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pc-recovery-group-row {
  grid-template-columns: 42px minmax(0, 1fr) auto 14px;
}

.pc-recovery-group-row,
.pc-recovery-backup-open {
  min-width: 0;
  overflow: hidden;
}

.pc-recovery-avatar,
.pc-recovery-book-icon {
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
}

.pc-recovery-avatar {
  width: 42px;
  height: 42px;
  font-weight: 800;
}

.pc-recovery-count {
  display: grid;
  min-width: 30px;
  height: 28px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
  font-size: 12px;
  font-weight: 800;
}

.pc-recovery-group-row > i,
.pc-recovery-backup-open > i {
  color: var(--pc-muted);
}

.pc-recovery-backup-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--pc-border);
}

.pc-recovery-backup-row:last-child {
  border-bottom: 0;
}

.pc-recovery-backup-open {
  grid-template-columns: 38px minmax(0, 1fr) 14px;
  border-bottom: 0;
}

.pc-recovery-book-icon {
  width: 38px;
  height: 48px;
}

.pc-recovery-group-note,
.pc-recovery-error p,
.pc-recovery-result-card p,
.pc-recovery-cleanup-summary p,
.pc-recovery-safety-note {
  margin: 0;
}

.pc-recovery-group-note,
.pc-recovery-result-card small {
  color: var(--pc-muted);
}

.pc-recovery-reader-page {
  height: 100%;
}

.pc-recovery-reader-page :deep(.pc-detail-content.pc-reader-content) {
  height: auto;
  min-height: 0;
  flex: 1 1 0;
}

.pc-recovery-readonly-banner {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface);
}

.pc-recovery-readonly-banner small {
  overflow: hidden;
  color: var(--pc-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-recovery-readonly-banner .pc-recovery-count-warning {
  color: var(--pc-danger);
  white-space: normal;
}

.pc-recovery-cleanup-results,
.pc-recovery-cleanup-summary,
.pc-recovery-duplicate-config,
.pc-recovery-duplicate-results,
.pc-recovery-error,
.pc-recovery-confirm-card,
.pc-recovery-result-card {
  display: grid;
  gap: 10px;
}

.pc-recovery-cleanup-list {
  display: grid;
  max-height: 280px;
  gap: 0;
  overflow: auto;
}

.pc-recovery-duplicate-list {
  display: grid;
  max-height: 380px;
  gap: 8px;
  overflow: auto;
}

.pc-recovery-duplicate-group {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 10px);
  background: var(--pc-surface);
}

.pc-recovery-duplicate-keeper {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--pc-border);
  color: var(--pc-theme-accent);
  /* ui-reuse-allow: row itself is a read-only preview trigger, not a general action button. */
  border-top: 0;
  border-right: 0;
  border-left: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.pc-recovery-duplicate-keeper small,
.pc-recovery-cleanup-item small {
  overflow-wrap: anywhere;
}

.pc-recovery-cleanup-group {
  display: grid;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid var(--pc-border);
}

.pc-recovery-cleanup-group:last-child {
  border-bottom: 0;
}

.pc-recovery-cleanup-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--pc-border);
}

.pc-recovery-candidate-open {
  /* ui-reuse-allow: nested row preview trigger keeps the checkbox as a separate destructive selection control. */
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.pc-recovery-cleanup-item:last-child {
  border-bottom: 0;
}

.pc-recovery-backup-open .pc-list-row-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-recovery-details {
  display: grid;
  gap: 8px;
  margin: 0;
}

.pc-recovery-details div {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 8px;
}

.pc-recovery-details dt {
  color: var(--pc-muted);
}

.pc-recovery-details dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.pc-recovery-safety-note,
.pc-recovery-warning {
  padding: 10px;
  border-radius: min(var(--pc-control-radius), 8px);
  background: color-mix(in srgb, var(--pc-theme-accent) 10%, var(--pc-surface) 90%);
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-recovery-warning {
  color: var(--pc-danger);
}

.pc-recovery-result-card {
  place-items: center;
  text-align: center;
}

.pc-recovery-result-card > i {
  color: var(--pc-theme-accent);
  font-size: 34px;
}

.pc-recovery-single-action {
  grid-template-columns: minmax(0, 1fr);
}
</style>
