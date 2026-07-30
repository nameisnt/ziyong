<template>
  <section class="message-app" @pointerdown="sounds.unlock">
    <div v-if="!activeConversation" class="message-home">
      <header class="message-top">
        <button class="ghost-btn" type="button" @click="$emit('close')">返回</button>
        <h1>信息</h1>
        <button class="round-btn" type="button" @click="toggleCreateMenu">＋</button>
      </header>

      <div v-if="createMenuOpen" class="create-menu">
        <button type="button" @click="openRoleDialog">添加角色</button>
        <button type="button" @click="openGroupDialog">创建群聊</button>
      </div>

      <section class="user-profile-card">
        <button class="user-avatar" type="button" :style="avatarImageStyle(userProfile.avatar)" @click="chooseAvatar('userProfile')">
          <span v-if="!userProfile.avatar">我</span>
        </button>
        <div class="status-bubble">
          <textarea v-model="userStatusDraft" placeholder="写点当前状态..." @blur="saveUserProfile"></textarea>
          <div class="status-actions">
            <button type="button" @click="saveUserProfile">保存</button>
            <button type="button" :disabled="!userStatusDraft.trim() || !sortedConversations.length" @click="statusShareOpen = true">分享</button>
          </div>
        </div>
      </section>

      <Transition name="home-panel" mode="out-in">
      <div v-if="homeTab === 'messages'" key="messages" class="home-panel-content">
        <label ref="searchBoxEl" class="search-box" style="border:0!important;outline:0!important;box-shadow:none!important;">
          <span>⌕</span>
          <input ref="searchInputEl" v-model="keyword" style="all:unset!important;display:block!important;flex:1 1 auto!important;min-width:0!important;border:0!important;border-width:0!important;border-style:none!important;outline:0!important;box-shadow:none!important;background:transparent!important;background-color:transparent!important;background-image:none!important;appearance:none!important;-webkit-appearance:none!important;color:#111!important;font:inherit!important;" placeholder="搜索" />
        </label>

        <main class="conversation-list">
        <div
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          class="conversation-item"
          @click="openConversation(conversation)"
        >
          <div class="conversation-avatar" :style="avatarImageStyle(conversation.avatar)">
            <span v-if="!conversation.avatar">{{ conversation.avatarText || conversation.name.slice(0, 1) }}</span>
          </div>
          <div class="conversation-main">
            <div class="conversation-line">
              <strong>{{ conversation.name }}</strong>
              <time>{{ formatTime(conversation.updatedAt) }}</time>
            </div>
            <div class="conversation-line muted">
              <span>{{ conversation.lastMessageText }}</span>
              <b v-if="conversation.unread">{{ conversation.unread }}</b>
            </div>
          </div>
        </div>

        <div v-if="!filteredConversations.length" class="empty-state">
          <div class="empty-mark">M</div>
          <h2>还没有消息</h2>
          <p>先添加角色，或把角色拉进一个新的群聊。</p>
          <div class="empty-actions">
            <button type="button" @click="openRoleDialog">添加角色</button>
            <button type="button" @click="openGroupDialog">创建群聊</button>
          </div>
        </div>

        <section v-if="availablePrivateRoles.length" class="role-shortcuts">
          <h2>可聊天角色</h2>
          <button v-for="role in availablePrivateRoles" :key="role.id" type="button" @click="startPrivateChat(role)">
            <div class="role-shortcut-avatar" :style="avatarImageStyle(role.avatar)"><span v-if="!role.avatar">{{ role.avatarText || role.name.slice(0, 1) }}</span></div>
            <span>{{ role.name }}</span>
            <em>{{ role.source === 'tavern' ? '酒馆' : '自定义' }}</em>
          </button>
        </section>
        </main>
      </div>

      <main v-else-if="homeTab === 'balance'" key="balance" class="balance-page home-panel-content">
        <section class="balance-card">
          <span>当前余额</span>
          <strong>{{ formatMoney(wallet.balanceCents) }}</strong>
          <p>余额精确到分，发红包会从这里扣除。</p>
          <div class="balance-actions">
            <button type="button" @click="addManualLedger('income')">记收入</button>
            <button type="button" @click="addManualLedger('expense')">记支出</button>
          </div>
        </section>
        <section class="ledger-card">
          <header>
            <h2>流水记录</h2>
            <span>最多 50 条</span>
          </header>
          <div v-if="!wallet.records.length" class="ledger-empty">暂无流水</div>
          <div v-for="record in wallet.records" :key="record.id" class="ledger-item" :class="record.type">
            <div>
              <strong>{{ record.title }}</strong>
              <time>{{ formatLedgerTime(record.createdAt) }}</time>
            </div>
            <span>{{ record.type === 'income' ? '+' : '-' }}{{ formatMoney(record.amountCents) }}</span>
          </div>
        </section>
      </main>

      <main v-else key="gifts" class="gift-page home-panel-content">
        <section class="gift-library-head">
          <div>
            <span>礼物</span>
            <strong>{{ giftLibrary.items.length }} 件</strong>
          </div>
          <div v-if="giftLibrary.items.length" class="gift-library-actions">
            <button type="button" @click="toggleGiftSelectMode">{{ giftSelectMode ? '完成' : '多选' }}</button>
            <button v-if="giftSelectMode" type="button" @click="toggleSelectAllGifts">{{ allGiftsSelected ? '取消全选' : '全选' }}</button>
            <button v-if="giftSelectMode" class="danger" type="button" :disabled="!selectedGiftIds.length" @click="deleteSelectedGifts">删除</button>
          </div>
        </section>
        <section v-if="giftLibrary.items.length" class="gift-library-list">
          <button
            v-for="gift in giftLibrary.items"
            :key="gift.id"
            type="button"
            class="gift-library-item"
            :class="{ selected: selectedGiftIds.includes(gift.id) }"
            @click="toggleGiftSelection(gift.id)"
          >
            <span class="gift-mini-box"><i></i></span>
            <div>
              <strong>{{ gift.name }}</strong>
              <em>{{ gift.senderName }} · {{ formatLedgerTime(gift.createdAt) }}</em>
              <p>{{ gift.text || '没有附言' }}</p>
            </div>
          </button>
        </section>
        <div v-else class="gift-empty"></div>
      </main>
      </Transition>

      <nav class="home-tabs">
        <button type="button" :class="{ active: homeTab === 'messages' }" @click="homeTab = 'messages'">信息</button>
        <button type="button" :class="{ active: homeTab === 'balance' }" @click="homeTab = 'balance'">余额</button>
        <button type="button" :class="{ active: homeTab === 'gifts' }" @click="homeTab = 'gifts'">礼物</button>
      </nav>
    </div>

    <div v-else class="chat-room" :style="chatWallpaperStyle">
      <header class="chat-head">
        <button class="ghost-btn" type="button" @click="activeConversation = null">返回</button>
        <div class="chat-title">
          <h2>{{ activeConversation.name }}</h2>
          <p v-if="activeConversation.type === 'private'">{{ activeRole?.mood || activeRole?.status || '在线' }}</p>
          <p v-else>{{ activeMembers.length }} 位角色 · {{ activeConversation.includeUser ? '含 user' : '无 user 成员' }}</p>
        </div>
        <button class="round-btn" type="button" @click="settingsOpen = true">⋯</button>
      </header>

      <main ref="messageScroller" class="message-scroll" @click="closeMessageAction">
        <div
          v-for="message in activeMessages"
          :key="message.id"
          class="message-row"
          :class="message.senderType"
          @pointerdown="startMessagePress(message, $event)"
          @pointerup="finishMessagePress"
          @pointercancel="cancelMessagePress"
          @pointerleave="cancelMessagePress"
        >
          <div v-if="message.senderType === 'user'" class="message-meta user-message-meta">
            <div class="message-avatar user-message-avatar" :style="avatarImageStyle(userProfile.avatar)">
              <span v-if="!userProfile.avatar">我</span>
            </div>
            <time>{{ formatClock(message.createdAt) }}</time>
          </div>
          <div v-if="message.senderType === 'role'" class="message-meta">
            <div class="message-avatar" :style="avatarImageStyle(message.senderAvatar || store.findRole(message.senderId)?.avatar)">
              <span v-if="!(message.senderAvatar || store.findRole(message.senderId)?.avatar)">{{ (message.senderName || '角').slice(0, 1) }}</span>
            </div>
            <time>{{ formatClock(message.createdAt) }}</time>
          </div>
          <div class="message-body" :class="{ 'group-role': activeConversation.type === 'group' && message.senderType === 'role' }">
            <div v-if="message.type === 'text' || message.type === 'system'" class="bubble" :class="message.type">{{ message.text }}</div>
            <button v-else-if="message.type === 'voice'" class="voice-bubble" type="button" @click="message.transcriptVisible = !message.transcriptVisible">
              <span class="voice-wave">▮▮▮</span>
              <strong>{{ message.duration || 4 }}''</strong>
              <em v-if="message.transcriptVisible">{{ message.text }}</em>
            </button>
            <div v-else-if="message.type === 'sticker'" class="sticker-message">
              <img v-if="resolveSticker(message.sticker).url" :src="resolveSticker(message.sticker).url" alt="表情包" @error="onImageError" />
            </div>
            <div v-else-if="message.type === 'image'" class="image-message" :class="{ fake: message.image?.fake }">
              <img v-if="message.image?.url" :src="message.image.url" :alt="message.image?.description || '图片'" @error="onImageError" />
              <div v-else class="fake-image-card">
                <span>图片</span>
                <p>{{ message.image?.description || message.text || '一张图片' }}</p>
              </div>
              <small v-if="message.image?.fake && message.image?.description">{{ message.image.description }}</small>
            </div>
            <button v-else-if="message.type === 'redpacket'" class="redpacket-card" type="button" :class="{ opened: message.redpacket?.opened }" @click="openRedpacket(message)">
              <span class="redpacket-seal">{{ message.redpacket?.opened ? '开' : '拆' }}</span>
              <div class="redpacket-copy">
                <em>红包</em>
                <strong>{{ message.redpacket?.title || '恭喜发财' }}</strong>
                <small>{{ message.redpacket?.opened ? `已拆开 · ${message.redpacket?.amountText || '随机金额'}` : '点击拆开' }}</small>
              </div>
            </button>
            <div v-else-if="message.type === 'transfer'" class="transfer-card" :class="message.transfer?.status || 'pending'">
              <div class="transfer-icon">¥</div>
              <div class="transfer-copy">
                <div class="transfer-head"><span>微信转账</span><small>{{ transferStatusLabel(message.transfer) }}</small></div>
                <strong>{{ message.transfer?.amountText || formatMoney(message.transfer?.amountCents || 0) }}</strong>
                <p>{{ message.transfer?.note || '转账' }}</p>
              </div>
              <div v-if="canAcceptTransfer(message) || canRejectTransfer(message)" class="transfer-actions">
                <button v-if="canAcceptTransfer(message)" type="button" @click.stop="acceptTransfer(message)">收款</button>
                <button v-if="canRejectTransfer(message)" type="button" @click.stop="rejectTransfer(message)">拒收</button>
              </div>
            </div>
            <button v-else-if="message.type === 'gift'" class="gift-card" type="button" :class="{ opened: message.gift?.opened }" @click="openGift(message)">
              <span class="gift-box"><i></i></span>
              <div class="gift-copy">
                <em>礼物</em>
                <strong>{{ message.gift?.name || '一份礼物' }}</strong>
                <small>{{ message.gift?.opened ? (message.gift?.text || '已打开') : '点击打开' }}</small>
              </div>
            </button>
            <div v-else-if="message.type === 'interaction'" class="interaction-card">
              <span>你</span>
              <strong>{{ message.interaction?.verb || message.interaction?.label || '互动了' }}</strong>
              <em>{{ interactionTargetName }}</em>
            </div>
            <div v-else-if="message.type === 'mood_card'" class="mood-card-message" :class="message.moodCard?.key || ''">
              <div class="mood-card-copy">
                <span>当前心情</span>
                <strong>{{ message.moodCard?.label || '心情' }}</strong>
                <p>{{ message.moodCard?.text || message.text || '想被陪陪' }}</p>
              </div>
            </div>
            <div v-else-if="message.type === 'weather'" class="weather-card">
              <span>当前天气</span>
              <strong>{{ message.weather?.city }} · {{ message.weather?.condition }}</strong>
              <em>{{ message.weather?.temp }}° / H:{{ message.weather?.high }}° L:{{ message.weather?.low }}°</em>
            </div>
            <div v-else-if="message.type === 'shopping_share' || message.type === 'shopping_gift'" class="shopping-message-card" :class="message.type === 'shopping_gift' ? 'gifted' : 'shared'">
              <span>{{ message.type === 'shopping_gift' ? '商品赠予' : '商品分享' }}</span>
              <strong>{{ message.shopping?.title || '拼夕夕商品' }}</strong>
              <em>{{ message.shopping?.priceText || '¥0.00' }}</em>
              <p>用途：{{ message.shopping?.usage || '未填写' }}</p>
              <small>{{ message.shopping?.intro || message.text }}</small>
            </div>
            <div v-else-if="message.type === 'music_listen_share'" class="music-share-card">
              <div class="music-share-cover" :style="avatarImageStyle(message.music?.cover)"><span v-if="!message.music?.cover">音</span></div>
              <div class="music-share-copy">
                <span>一起听歌</span>
                <strong>{{ message.music?.roleName || '角色' }} · {{ message.music?.durationText || '0秒' }}</strong>
                <p>{{ message.music?.songName || '音乐' }}<template v-if="message.music?.artist"> · {{ message.music.artist }}</template></p>
                <small>用户和 {{ message.music?.roleName || '角色' }} 已一起听了这么久</small>
              </div>
            </div>
            <div v-else-if="message.type === 'landlord_result_share'" class="landlord-share-card" :class="message.landlord?.userWon ? 'win' : 'lose'">
              <span>斗地主战绩</span>
              <strong>{{ message.landlord?.title || '牌局结果' }}</strong>
              <p>{{ message.landlord?.mode === 4 ? '四人局' : '三人局' }} · {{ message.landlord?.difficultyName || '普通' }}</p>
              <small>胜利方：{{ message.landlord?.winnerTeam || '未知' }} · 最后出完：{{ message.landlord?.winnerName || '未知' }}</small>
              <small>地主：{{ message.landlord?.landlordName || '未知' }} · {{ message.landlord?.text || message.text }}</small>
              <div class="landlord-remaining-list">
                <em v-for="item in message.landlord?.remaining || []" :key="item.name">{{ item.name }}：{{ item.count }}张</em>
              </div>
            </div>
            <div v-else-if="message.type === 'browser_ai_search_share'" class="browser-search-card">
              <span>AI 搜索分享</span>
              <strong>{{ message.browserSearch?.keyword || '搜索' }}</strong>
              <p>{{ message.browserSearch?.summary || message.browserSearch?.resultSnippet || message.text }}</p>
              <div class="browser-result-line">
                <em>{{ message.browserSearch?.resultTitle || '搜索结果' }}</em>
                <small>{{ message.browserSearch?.resultUrl || 'ai.generated' }}</small>
              </div>
              <small>{{ message.browserSearch?.resultSnippet || '来自浏览器 AI 搜索结果' }}</small>
            </div>
            <button v-else-if="message.type === 'inspect_share'" class="inspect-share-card" type="button" @click="openInspectDetail(message.inspect)">
              <span>查岗结果</span>
              <strong>{{ message.inspect?.roleName || '角色' }}</strong>
              <p>{{ inspectItemNames(message.inspect).join('、') }}</p>
              <small>{{ message.inspect?.summary || '点击查看查岗详情' }}</small>
            </button>
            <div v-if="activeConversation.type === 'group' && message.senderType === 'role'" class="sender-name">
              <strong>{{ message.senderName }}</strong>
            </div>
            <div v-if="message.status && message.status !== 'sent'" class="message-status" :class="message.status">
              <span>{{ statusLabel(message) }}</span>
              <button v-if="message.status === 'failed'" type="button" @click.stop="retryFailedMessage(message)">重试</button>
            </div>
            <div v-if="messageAction.id === message.id" class="message-action-menu" @click.stop>
              <button v-for="action in messageActions(message)" :key="action.key" type="button" @click="handleMessageAction(message, action.key)">{{ action.label }}</button>
            </div>
          </div>
        </div>
        <div v-if="replying" class="typing">对方正在输入...</div>
      </main>

      <footer class="composer">
        <div v-if="isRoleOnlyGroup" class="role-only-composer">
          <button class="accent" type="button" title="发送并回复" :disabled="replying" @click="requestAiReply()">✈</button>
        </div>
        <template v-else>
        <div v-if="speechDraftOpen" class="speech-draft">
          <span>{{ speech.listening ? '正在听...' : '语音转文字' }}</span>
          <textarea v-model="speechText" placeholder="识别结果会出现在这里，可修改后发送"></textarea>
          <div>
            <button type="button" @click="stopSpeechDraft">停止</button>
            <button type="button" @click="sendSpeech(false)">发送</button>
            <button class="accent" type="button" @click="sendSpeech(true)">发送并回复</button>
          </div>
        </div>
        <div v-if="panelOpen === 'more'" class="sticker-panel">
          <div class="pack-tabs">
            <button v-for="pack in stickerPacks" :key="pack.id" type="button" :class="{ active: pack.id === activePackId }" @click="activePackId = pack.id">{{ pack.name }}</button>
          </div>
          <div class="sticker-grid">
            <button v-for="sticker in activeStickerPack.stickers" :key="sticker.name + sticker.url" type="button" @click="sendSticker(sticker)">
              <img :src="sticker.url" :alt="sticker.name" @error="onImageError" />
            </button>
          </div>
        </div>
        <div v-if="panelOpen === 'more'" class="more-panel">
          <button type="button" @click="sendTransfer">转账</button>
          <button type="button" @click="togglePanel('interaction')">互动</button>
          <button type="button" @click="togglePanel('mood')">心情</button>
          <button type="button" @click="sendRedpacket">发红包</button>
          <button type="button" @click="sendGift">送礼物</button>
          <button type="button" @click="sendWeather">当前天气</button>
          <button type="button" @click="sendFakeImage">发送假图片</button>
          <button type="button" @click="chooseChatImage">发送真图片</button>
        </div>
        <div v-if="panelOpen === 'interaction'" class="quick-card-panel interaction-panel">
          <button v-for="option in interactionOptions" :key="option.key" type="button" @click="sendInteraction(option)">
            <span>{{ option.label }}</span>
            <small>{{ option.text }}</small>
          </button>
        </div>
        <div v-if="panelOpen === 'mood'" class="quick-card-panel mood-select-panel">
          <button v-for="option in moodOptions" :key="option.key" type="button" @click="sendMoodCard(option)">
            <span>{{ option.label }}</span>
            <small>{{ option.text }}</small>
          </button>
        </div>
        <div class="composer-row">
          <div class="input-shell">
            <button class="speech-btn" type="button" title="语音输入" @click.prevent="startSpeech"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-1 3a1 1 0 0 1 2 0v6a1 1 0 0 1-2 0V6Zm-5 5h2v1a4 4 0 0 0 8 0v-1h2v1a6 6 0 0 1-5 5.9V21h-2v-3.1A6 6 0 0 1 6 12v-1Z"/></svg></button>
            <textarea v-model="draft" rows="1" placeholder="输入消息" @focus="panelOpen = ''"></textarea>
          </div>
          <button class="icon-btn" type="button" title="更多" @click="togglePanel('more')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg></button>
          <button v-if="draft.trim()" class="icon-btn" type="button" title="发送" @click="sendText(false)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 5 11l1.4 1.4L11 7.8V20h2V7.8l4.6 4.6L19 11l-7-7Z"/></svg></button>
          <button v-if="replying" class="icon-btn cancel-reply" type="button" title="取消发送" @click="cancelAiReply">×</button>
          <button v-else class="icon-btn accent" type="button" title="发送并回复" @click="sendText(true)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 20 3l-4.8 18-4.1-6.8L3 11.5Zm5.1-.3 4 1.3 2.1 3.6 2.3-8.7-8.4 3.8Z"/></svg></button>
        </div>
        </template>
      </footer>
    </div>

    <div v-if="roleDialogOpen" class="modal-mask">
      <form class="modal-card" @submit.prevent="createRole">
        <header><h2>添加角色</h2><button type="button" @click="roleDialogOpen = false">×</button></header>
        <div class="avatar-editor">
          <div class="avatar-preview" :style="avatarImageStyle(roleForm.avatar)"><span v-if="!roleForm.avatar">{{ roleForm.name.slice(0, 1) || '角' }}</span></div>
          <button type="button" @click="chooseAvatar('roleForm')">上传头像</button>
        </div>
        <label>姓名<input v-model="roleForm.name" required placeholder="角色姓名" /></label>
        <label class="switch-row"><span>追加自定义人设</span><input v-model="roleForm.enableCustomPersona" type="checkbox" /></label>
        <textarea v-if="roleForm.enableCustomPersona" v-model="roleForm.customPersona" placeholder="仅在开启时追加进 AI prompt"></textarea>
        <div class="modal-actions"><button type="button" @click="importFromTavern">读取酒馆角色</button><button class="accent" type="submit">保存</button></div>
      </form>
    </div>

    <div v-if="groupDialogOpen" class="modal-mask">
      <form class="modal-card" @submit.prevent="createGroup">
        <header><h2>创建群聊</h2><button type="button" @click="groupDialogOpen = false">×</button></header>
        <div class="avatar-editor">
          <div class="avatar-preview" :style="avatarImageStyle(groupForm.avatar)"><span v-if="!groupForm.avatar">群</span></div>
          <button type="button" @click="chooseAvatar('groupForm')">上传头像</button>
        </div>
        <label>群聊名<input v-model="groupForm.name" required placeholder="群聊名" /></label>
        <label>群聊简介<input v-model="groupForm.description" placeholder="一句话简介" /></label>
        <label class="switch-row"><span>包含 user 成员</span><input v-model="groupForm.includeUser" type="checkbox" /></label>
        <label>发言模式
          <select v-model="groupForm.speechMode">
            <option value="random">随机发言</option>
            <option value="selected">指定角色</option>
            <option value="all">全员发言</option>
            <option value="silent">沉默观察</option>
          </select>
        </label>
        <label v-if="groupForm.speechMode === 'selected'">指定发言角色
          <select v-model="groupForm.selectedSpeakerId">
            <option value="">请选择</option>
            <option v-for="role in selectedGroupRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
          </select>
        </label>
        <div class="member-box">
          <label v-for="role in roles" :key="role.id" class="member-row">
            <input v-model="groupForm.memberIds" type="checkbox" :value="role.id" />
            <span>{{ role.name }}</span>
          </label>
          <p v-if="!roles.length">请先添加角色。</p>
        </div>
        <div class="modal-actions"><button class="accent" type="submit" :disabled="!groupForm.memberIds.length">创建</button></div>
      </form>
    </div>

    <div v-if="settingsOpen && activeConversation" class="modal-mask">
      <div class="modal-card">
        <header><h2>聊天设置</h2><button type="button" @click="settingsOpen = false">×</button></header>
        <section class="setting-section">
          <div class="avatar-editor compact">
            <div class="avatar-preview" :style="avatarImageStyle(activeConversation.avatar)"><span v-if="!activeConversation.avatar">{{ activeConversation.avatarText || activeConversation.name.slice(0, 1) }}</span></div>
            <button type="button" @click="chooseAvatar(activeConversation.type === 'private' ? 'activeRole' : 'activeConversation')">更换头像</button>
          </div>
        </section>
        <section v-if="activeConversation.type === 'private'" class="setting-section">
          <button class="setting-toggle" type="button" @click="moodOpen = !moodOpen">角色状态 / 心声</button>
          <div v-if="moodOpen" class="mood-panel">
            <p><strong>表面状态</strong><span>{{ activeRole?.status || '在线' }}</span></p>
            <p><strong>内心状态</strong><span>{{ activeRole?.mood || '暂无' }}</span></p>
            <p><strong>对用户态度</strong><span>{{ activeRole?.relationMood || activeRole?.mood || '未记录' }}</span></p>
          </div>
        </section>
        <section v-if="activeConversation.type === 'group'" class="setting-section">
          <button class="setting-toggle" type="button" @click="membersOpen = !membersOpen">群成员管理</button>
          <div v-if="membersOpen" class="member-manage">
            <label>群聊简介<input v-model="activeConversation.description" @blur="saveActiveConversation" /></label>
            <label>发言模式
              <select v-model="activeConversation.speechMode" @change="saveActiveConversation">
                <option value="random">随机发言</option>
                <option value="selected">指定角色</option>
                <option value="all">全员发言</option>
                <option value="silent">沉默观察</option>
              </select>
            </label>
            <label v-if="activeConversation.speechMode === 'selected'">指定角色
              <select v-model="activeConversation.selectedSpeakerId" @change="saveActiveConversation">
                <option value="">请选择</option>
                <option v-for="role in activeMembers" :key="role.id" :value="role.id">{{ role.name }}</option>
              </select>
            </label>
            <div class="member-manage-list">
              <label v-for="role in roles" :key="role.id">
                <input type="checkbox" :checked="activeConversation.memberIds.includes(role.id)" @change="toggleGroupMember(role.id, $event.target.checked)" />
                <span>{{ role.name }}</span>
                <input class="frequency-input" type="number" min="0" max="10" :value="activeConversation.memberFrequency?.[role.id] ?? 1" @change="setMemberFrequency(role.id, $event.target.value)" />
              </label>
            </div>
          </div>
        </section>
        <section class="setting-section">
          <button class="setting-toggle" type="button" @click="contextOpen = !contextOpen">当前 AI 可见上下文预览</button>
          <div v-if="contextOpen" class="context-preview">
            <p v-for="item in aiContextPreview" :key="item.id || item.createdAt"><strong>{{ item.senderName || item.senderId }}</strong>：{{ contextMessageText(item) }}</p>
          </div>
        </section>
        <label>纯色壁纸<input v-model="wallpaperColor" type="color" @input="setColorWallpaper" /></label>
        <label>图片壁纸 URL<input v-model="wallpaperImage" placeholder="https:// 或 base64" /></label>
        <div class="modal-actions">
          <button type="button" @click="setImageWallpaper">应用图片</button>
          <button type="button" @click="resetWallpaper">恢复默认</button>
          <button class="danger" type="button" @click="clearChat">清空记录</button>
          <button v-if="activeConversation.type === 'group'" class="danger" type="button" @click="deleteCurrentGroup">删除群聊</button>
          <button v-if="activeConversation.type === 'private'" class="danger" type="button" @click="confirmDeleteCurrentRole">删除角色</button>
        </div>
      </div>
    </div>

    <div v-if="statusShareOpen" class="modal-mask">
      <div class="modal-card">
        <header><h2>分享状态</h2><button type="button" @click="statusShareOpen = false">×</button></header>
        <p class="share-preview">{{ userStatusDraft || '暂无状态' }}</p>
        <div class="share-list">
          <button v-for="conversation in sortedConversations" :key="conversation.id" type="button" @click="shareUserStatus(conversation)">
            <div class="conversation-avatar" :style="avatarImageStyle(conversation.avatar)"><span v-if="!conversation.avatar">{{ conversation.avatarText || conversation.name.slice(0, 1) }}</span></div>
            <span>{{ conversation.name }}</span>
          </button>
        </div>
      </div>
    </div>

    <input ref="avatarFileInput" class="hidden-file" type="file" accept="image/*" @change="onAvatarFile" />
    <input ref="chatImageFileInput" class="hidden-file" type="file" accept="image/*" @change="onChatImageFile" />
    <ImageCropper v-model="avatarCropOpen" :src="avatarCropSrc" title="拖动定位头像区域" confirm-text="保存头像" output-shape="square" @confirm="applyAvatarCrop" />
    <div v-if="inspectDetailOpen && activeInspectDetail" class="modal-mask">
      <div class="modal-card inspect-detail-modal">
        <header><h2>查岗详情</h2><button type="button" @click="inspectDetailOpen = false">×</button></header>
        <InspectResultDetail :result="activeInspectDetail" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import ImageCropper from './ImageCropper.vue';
import InspectResultDetail from './InspectResultDetail.vue';
import { getInspectOption } from '../composables/useInspectStore.js';
import { createMessageId } from '../composables/useMessageStore.js';
import { useMessageAi } from '../composables/useMessageAi.js';
import { useMessageSounds } from '../composables/useMessageSounds.js';
import { useMemoryStore } from '../composables/useMemoryStore.js';
import { useMessageStore } from '../composables/useMessageStore.js';
import { useSpeechInput } from '../composables/useSpeechInput.js';
import { useTavern } from '../composables/useTavern.js';
import { useWeather } from '../composables/useWeather.js';

defineEmits(['close']);

const USER_PROFILE_KEY = 'phone_message_user_profile';
const WALLET_KEY = 'phone_message_wallet';
const GIFT_LIBRARY_KEY = 'phone_message_gift_library';
const ROLE_APP_STORAGE_KEY = 'phone_role_app_selection_v1';

const store = useMessageStore();
const ai = useMessageAi();
const memory = useMemoryStore();
const tavern = useTavern();
const weather = useWeather();
const speech = useSpeechInput();
const sounds = useMessageSounds();

const { roles, sortedConversations, messages, stickerPacks } = store;
const keyword = ref('');
const homeTab = ref('messages');
const activeConversation = ref(null);
const draft = ref('');
const panelOpen = ref('');
const createMenuOpen = ref(false);
const roleDialogOpen = ref(false);
const groupDialogOpen = ref(false);
const settingsOpen = ref(false);
const statusShareOpen = ref(false);
const replying = ref(false);
const messageAction = ref({ id: '', type: '' });
const contextOpen = ref(false);
const moodOpen = ref(false);
const membersOpen = ref(false);
const roleData = ref({ user: null, worldBooks: [], characters: [] });
const activePackId = ref(stickerPacks[0]?.id || '');
const messageScroller = ref(null);
const searchBoxEl = ref(null);
const searchInputEl = ref(null);
const speechDraftOpen = ref(false);
const speechText = ref('');
const wallpaperColor = ref('#111111');
const wallpaperImage = ref('');
const avatarFileInput = ref(null);
const chatImageFileInput = ref(null);
const avatarCropOpen = ref(false);
const avatarCropSrc = ref('');
const avatarTarget = ref('');
const userProfile = reactive(loadUserProfile());
const userStatusDraft = ref(userProfile.status || '');
const wallet = reactive(loadWallet());
const giftLibrary = reactive(loadGiftLibrary());
const giftSelectMode = ref(false);
const selectedGiftIds = ref([]);
const inspectDetailOpen = ref(false);
const activeInspectDetail = ref(null);
let replyAbortController = null;

const roleForm = reactive({ name: '', avatar: '', enableCustomPersona: false, customPersona: '' });
const groupForm = reactive({ name: '', avatar: '', description: '', includeUser: true, memberIds: [], speechMode: 'random', selectedSpeakerId: '' });
const interactionOptions = [
  { key: 'pat', label: '拍一拍 TA', verb: '拍了拍', text: '你拍了拍 TA' },
  { key: 'poke', label: '戳一戳', verb: '戳了戳', text: '你戳了戳 TA' },
  { key: 'hug', label: '抱一下', verb: '抱了抱', text: '你抱了 TA 一下' },
  { key: 'headpat', label: '摸头', verb: '摸了摸头', text: '你摸了摸 TA 的头' },
  { key: 'hold_hand', label: '牵手', verb: '牵住了', text: '你牵住了 TA 的手' },
  { key: 'snuggle', label: '贴贴', verb: '贴了贴', text: '你和 TA 贴贴了一下' },
  { key: 'knock', label: '敲门', verb: '敲了敲门', text: '你敲了敲 TA 的门' },
];
const moodOptions = [
  { key: 'happy', label: '开心', text: '我现在有点开心，想和你分享' },
  { key: 'sad', label: '难过', text: '我现在有点难过，想被陪陪' },
  { key: 'angry', label: '生气', text: '我现在有点生气，想冷静一下' },
  { key: 'tired', label: '累了', text: '我现在有点累了' },
  { key: 'miss_you', label: '想你', text: '我现在有点想你' },
  { key: 'anxious', label: '焦虑', text: '我现在有点焦虑，需要一点安定感' },
  { key: 'sleepless', label: '睡不着', text: '我现在睡不着，想有人陪我说说话' },
];
let pressTimer = null;
let ignoreNextMessageClick = false;

const filteredConversations = computed(() => {
  const key = keyword.value.trim();
  if (!key) return sortedConversations.value;
  return sortedConversations.value.filter(item => {
    const memberNames = (item.memberIds || []).map(id => store.findRole(id)?.name || '').join(' ');
    const historyText = (messages.value[item.id] || []).map(message => `${message.senderName || ''} ${contextMessageText(message)}`).join(' ');
    return [item.name, item.lastMessageText, item.description, memberNames, historyText].some(value => String(value || '').includes(key));
  });
});
const availablePrivateRoles = computed(() => {
  const privateNames = new Set(store.conversations.value.filter(item => item.type === 'private').map(item => normalizeName(item.name)).filter(Boolean));
  const roleNameCounts = roles.value.reduce((map, role) => {
    const name = normalizeName(role.name);
    if (name) map.set(name, (map.get(name) || 0) + 1);
    return map;
  }, new Map());
  const visibleNames = new Set();

  return roles.value.filter(role => {
    if (role.source === 'tavern') return false;
    if (store.conversations.value.some(item => item.type === 'private' && item.memberIds?.[0] === role.id)) return false;
    const name = normalizeName(role.name);
    if (!name || privateNames.has(name) || (roleNameCounts.get(name) || 0) > 1 || visibleNames.has(name)) return false;
    visibleNames.add(name);
    return true;
  });
});
const activeMessages = computed(() => activeConversation.value ? (messages.value[activeConversation.value.id] || []).filter(message => message.status !== 'generating') : []);
const activeMembers = computed(() => activeConversation.value ? activeConversation.value.memberIds.map(store.findRole).filter(Boolean) : []);
const activeRole = computed(() => activeConversation.value?.type === 'private' ? activeMembers.value[0] : null);
const interactionTargetName = computed(() => activeConversation.value?.type === 'private' ? (activeRole.value?.name || 'TA') : activeConversation.value?.name || '大家');
const activeStickerPack = computed(() => stickerPacks.find(pack => pack.id === activePackId.value) || stickerPacks[0]);
const isRoleOnlyGroup = computed(() => activeConversation.value?.type === 'group' && !activeConversation.value.includeUser);
const selectedGroupRoles = computed(() => roles.value.filter(role => groupForm.memberIds.includes(role.id)));
const aiContextPreview = computed(() => activeMessages.value.slice(-60));
const allGiftsSelected = computed(() => giftLibrary.items.length > 0 && selectedGiftIds.value.length === giftLibrary.items.length);
const chatWallpaperStyle = computed(() => {
  const wallpaper = activeConversation.value?.wallpaper;
  if (wallpaper?.type === 'color') return { background: wallpaper.value };
  if (wallpaper?.type === 'image') return { backgroundImage: `url('${wallpaper.value}')` };
  return {};
});

watch(() => speech.transcript.value, value => { speechText.value = value; });
watch(activeMessages, () => nextTick(scrollToBottom), { deep: true });

function loadUserProfile() {
  try { return JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || 'null') || { avatar: '', status: '' }; }
  catch { return { avatar: '', status: '' }; }
}

function saveUserProfile() {
  userProfile.status = userStatusDraft.value.trim();
  try { localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile)); }
  catch (error) { console.warn('[MessageApp] user profile save failed:', error); }
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function loadWallet() {
  try {
    const saved = JSON.parse(localStorage.getItem(WALLET_KEY) || 'null');
    return { balanceCents: Number(saved?.balanceCents) || 0, records: Array.isArray(saved?.records) ? saved.records.slice(0, 50) : [] };
  } catch {
    return { balanceCents: 0, records: [] };
  }
}

function saveWallet() {
  wallet.records = wallet.records.slice(0, 50);
  try { localStorage.setItem(WALLET_KEY, JSON.stringify(wallet)); }
  catch (error) { console.warn('[MessageApp] wallet save failed:', error); }
}

function formatMoney(cents) {
  return `¥${(Math.max(0, Number(cents) || 0) / 100).toFixed(2)}`;
}

function formatLedgerTime(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}

function parseMoneyToCents(value) {
  const normalized = String(value || '').trim().replace(/[￥¥,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return 0;
  return Math.round(Number(normalized) * 100);
}

function normalizeRoleRedpacket(redpacket) {
  if (!redpacket) return null;
  const amountCents = Number(redpacket.amountCents) || parseMoneyToCents(redpacket.amountText || redpacket.amount) || 100;
  return { ...redpacket, amountCents, amountText: formatMoney(amountCents) };
}

function addLedgerRecord(type, amountCents, title) {
  wallet.records.unshift({ id: createMessageId('ledger'), type, amountCents, title, createdAt: Date.now() });
  wallet.records = wallet.records.slice(0, 50);
  saveWallet();
}

function addManualLedger(type) {
  const label = type === 'income' ? '收入' : '支出';
  const amountText = prompt(`${label}金额：`, '1.00');
  if (amountText === null) return;
  const amountCents = parseMoneyToCents(amountText);
  if (amountCents <= 0) {
    alert('请输入有效金额，最多精确到分。');
    return;
  }
  if (type === 'expense' && wallet.balanceCents < amountCents) {
    alert(`余额不足，当前余额 ${formatMoney(wallet.balanceCents)}`);
    return;
  }
  const title = prompt(`${label}备注：`, label) || label;
  wallet.balanceCents += type === 'income' ? amountCents : -amountCents;
  addLedgerRecord(type, amountCents, title);
}

function loadGiftLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(GIFT_LIBRARY_KEY) || 'null');
    return { items: Array.isArray(saved?.items) ? saved.items : [] };
  } catch {
    return { items: [] };
  }
}

function saveGiftLibrary() {
  try { localStorage.setItem(GIFT_LIBRARY_KEY, JSON.stringify(giftLibrary)); }
  catch (error) { console.warn('[MessageApp] gift library save failed:', error); }
}

function addGiftToLibrary(message, giftPayload = message?.gift) {
  if (!giftPayload || message?.senderType !== 'role') return;
  if (giftLibrary.items.some(item => item.messageId === message.id)) return;
  giftLibrary.items.unshift({
    id: createMessageId('gift_item'),
    messageId: message.id,
    senderId: message.senderId,
    senderName: message.senderName || '角色',
    name: giftPayload.name || '一份礼物',
    text: giftPayload.text || '',
    createdAt: Date.now(),
  });
  saveGiftLibrary();
}

function toggleGiftSelectMode() {
  giftSelectMode.value = !giftSelectMode.value;
  selectedGiftIds.value = [];
}

function toggleGiftSelection(id) {
  if (!giftSelectMode.value) return;
  selectedGiftIds.value = selectedGiftIds.value.includes(id)
    ? selectedGiftIds.value.filter(item => item !== id)
    : [...selectedGiftIds.value, id];
}

function toggleSelectAllGifts() {
  selectedGiftIds.value = allGiftsSelected.value ? [] : giftLibrary.items.map(item => item.id);
}

function deleteSelectedGifts() {
  if (!selectedGiftIds.value.length) return;
  const selected = new Set(selectedGiftIds.value);
  giftLibrary.items = giftLibrary.items.filter(item => !selected.has(item.id));
  selectedGiftIds.value = [];
  saveGiftLibrary();
}

function syncOpenedGiftsToLibrary() {
  Object.values(messages.value).flat().forEach(message => {
    if (message.senderType !== 'role' || message.type !== 'gift' || !message.gift?.opened) return;
    addGiftToLibrary(message, message.gift);
  });
}

function loadRoleAppSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(ROLE_APP_STORAGE_KEY) || 'null');
    const selection = window.__phoneRoleAppSelection || saved?.applied || buildRoleAppSelection(saved) || {};
    applyRoleAppSelection(selection);
  } catch (error) {
    console.warn('[MessageApp] role app selection load failed:', error);
  }
}

function buildRoleAppSelection(saved) {
  if (!saved || typeof saved !== 'object') return null;
  const characters = Array.isArray(saved.characters) ? saved.characters : [];
  const worldBooks = Array.isArray(saved.worldBooks) ? saved.worldBooks : [];
  const activeWorldBookIds = Array.isArray(saved.activeWorldBookIds) ? saved.activeWorldBookIds : [];
  const activeWorldBookEntryIds = Array.isArray(saved.activeWorldBookEntryIds) ? saved.activeWorldBookEntryIds : [];
  const character = characters.find(item => item.id === saved.activeCharacterId) || null;
  const activeBooks = worldBooks
    .filter(book => activeWorldBookIds.includes(book.id))
    .map(book => ({ ...book, entries: (book.entries || []).filter(entry => activeWorldBookEntryIds.includes(entry.id)) }))
    .filter(book => book.entries.length);
  const worldBookEntries = activeBooks.flatMap(book => (book.entries || []).map(entry => ({ ...entry, bookName: book.name })));
  const user = saved.userPersona && (saved.userPersona.name || saved.userPersona.description)
    ? { name: saved.userPersona.name || 'user', description: saved.userPersona.description || '' }
    : null;
  return character || user || activeBooks.length || worldBookEntries.length
    ? { character, user, worldBooks: activeBooks, worldBookEntries }
    : null;
}

function applyRoleAppSelection(selection = {}) {
  const character = selection.character || null;
  const user = selection.user || null;
  const worldBooks = Array.isArray(selection.worldBooks) ? selection.worldBooks : [];
  const worldBookEntries = Array.isArray(selection.worldBookEntries) ? selection.worldBookEntries : worldBooks.flatMap(book => (book.entries || []).map(entry => ({ ...entry, bookName: book.name })));
  roleData.value = {
    ...roleData.value,
    user: user || roleData.value.user,
    character,
    characters: character ? [character] : [],
    worldBooks,
    worldBookEntries,
  };
  if (character) store.importRoleAppCharacter(character);
}

function handleRoleAppSelection(event) {
  const detail = event.detail || {};
  applyRoleAppSelection(detail);
}

function clearRoleMemoryById(roleId) {
  store.conversations.value
    .filter(conversation => conversation.type === 'private' && conversation.memberIds?.[0] === roleId)
    .forEach(conversation => memory.clearConversationMemory(conversation.id));
}

function toggleCreateMenu() { sounds.play('panel'); createMenuOpen.value = !createMenuOpen.value; }
function togglePanel(name) { sounds.play('panel'); panelOpen.value = panelOpen.value === name ? '' : name; }
function openRoleDialog() { sounds.play('click'); createMenuOpen.value = false; roleDialogOpen.value = true; }
function openGroupDialog() { sounds.play('click'); createMenuOpen.value = false; groupDialogOpen.value = true; }
function onImageError(event) { event.target.style.visibility = 'hidden'; }
function scrollToBottom() { if (messageScroller.value) messageScroller.value.scrollTop = messageScroller.value.scrollHeight; }
function avatarImageStyle(avatar) { return avatar ? { backgroundImage: `url('${avatar}')` } : null; }
function closeMessageAction() {
  if (ignoreNextMessageClick) {
    ignoreNextMessageClick = false;
    return;
  }
  messageAction.value = { id: '', type: '' };
}
function resolveSticker(sticker = {}) {
  if (sticker?.url) return sticker;
  const pack = sticker?.pack ? stickerPacks.find(item => item.name === sticker.pack || item.id === sticker.pack) : null;
  const packs = pack ? [pack] : stickerPacks;
  const foundPack = packs.find(item => item.stickers.some(option => option.name === sticker?.name));
  const foundSticker = foundPack?.stickers.find(option => option.name === sticker?.name);
  return foundSticker ? { pack: foundPack.name, ...foundSticker } : (sticker || {});
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString() === new Date().toLocaleDateString()
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : `${date.getMonth() + 1}/${date.getDate()}`;
}
function formatClock(value) { return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }
function statusLabel(message) {
  return ({ sending: '发送中', failed: '失败重试' })[message.status] || '';
}
function contextMessageText(item) {
  if (item.type === 'text' || item.type === 'system') return item.text || '';
  if (item.type === 'sticker') return '[表情]';
  if (item.type === 'image') return `[图片] ${item.image?.description || item.text || ''}`;
  if (item.type === 'voice') return `[语音] ${item.text || ''}`;
  if (item.type === 'redpacket') return `[红包] ${item.redpacket?.title || ''}`;
  if (item.type === 'transfer') return `[转账] 金额：${item.transfer?.amountText || formatMoney(item.transfer?.amountCents || 0)}；备注：${item.transfer?.note || '转账'}；状态：${transferStatusLabel(item.transfer)}`;
  if (item.type === 'gift') return `[礼物] ${item.gift?.name || ''}`;
  if (item.type === 'interaction') return `[互动] ${item.interaction?.text || item.text || item.interaction?.label || ''}`;
  if (item.type === 'mood_card') return `[心情] 用户当前心情：${item.moodCard?.label || ''}；说明：${item.moodCard?.text || item.text || ''}`;
  if (item.type === 'shopping_share') return `[商品分享] 标题：${item.shopping?.title || ''}；价格：${item.shopping?.priceText || ''}；用途：${item.shopping?.usage || ''}；简介：${item.shopping?.intro || ''}`;
  if (item.type === 'shopping_gift') return `[商品赠予] 标题：${item.shopping?.title || ''}；价格：${item.shopping?.priceText || ''}；用途：${item.shopping?.usage || ''}；简介：${item.shopping?.intro || ''}`;
  if (item.type === 'music_listen_share') return `[一起听歌] ${item.music?.roleName || '角色'}；时长：${item.music?.durationText || '0秒'}；歌曲：${item.music?.songName || '音乐'}；歌手：${item.music?.artist || ''}`;
  if (item.type === 'landlord_result_share') return `[斗地主战绩] ${item.landlord?.title || ''}；${item.landlord?.mode === 4 ? '四人局' : '三人局'}；难度：${item.landlord?.difficultyName || ''}；胜利方：${item.landlord?.winnerTeam || ''}；最后出完：${item.landlord?.winnerName || ''}；地主：${item.landlord?.landlordName || ''}；剩余牌：${(item.landlord?.remaining || []).map(player => `${player.name}${player.count}张`).join('、')}`;
  if (item.type === 'inspect_share') return `[查岗转发] ${item.inspect?.roleName || '角色'}；项目：${inspectItemNames(item.inspect).join('、')}；摘要：${item.inspect?.summary || ''}`;
  return `[${item.type}]`;
}

function inspectItemNames(inspect) {
  return (inspect?.selectedItemIds || []).map(id => getInspectOption(id)?.name || id).filter(Boolean);
}

function openInspectDetail(inspect) {
  if (!inspect) return;
  activeInspectDetail.value = inspect;
  inspectDetailOpen.value = true;
}

function startMessagePress(message, event) {
  if (message.senderType !== 'user' && message.senderType !== 'role') return;
  if (message.senderType === 'user' && message.senderId !== 'user') return;
  cancelMessagePress();
  pressTimer = setTimeout(() => {
    messageAction.value = { id: message.id, type: message.senderType };
    ignoreNextMessageClick = true;
    sounds.play('panel');
  }, 520);
}

function finishMessagePress() {
  cancelMessagePress();
}

function cancelMessagePress() {
  if (!pressTimer) return;
  clearTimeout(pressTimer);
  pressTimer = null;
}

function messageActions(message) {
  if (message.senderType === 'user') {
    return [
      { key: 'recall', label: '撤回' },
      { key: 'copy', label: '复制' },
    ];
  }
  if (message.senderType === 'role') {
    return [
      { key: 'regen', label: '重新生成' },
      { key: 'copy', label: '复制' },
    ];
  }
  return [];
}

async function handleMessageAction(message, action) {
  if (action === 'copy') {
    navigator.clipboard?.writeText(contextMessageText(message));
    closeMessageAction();
    sounds.play('click');
    return;
  }
  if (action === 'recall' && message.senderType === 'user') {
    store.removeMessage(activeConversation.value.id, message.id);
    store.addSystemMessage(activeConversation.value.id, '你撤回了一条消息');
    closeMessageAction();
    sounds.play('click');
    return;
  }
  if (action === 'regen' && message.senderType === 'role') await regenerateRoleMessage(message);
}

async function regenerateRoleMessage(message) {
  if (!activeConversation.value || replying.value) return;
  const groupId = message.replyGroupId;
  const groupMessages = groupId ? activeMessages.value.filter(item => item.replyGroupId === groupId) : [message];
  const firstCreatedAt = Math.min(...groupMessages.map(item => item.createdAt));
  const historyBeforeMessage = activeMessages.value.filter(item => item.createdAt < firstCreatedAt);
  if (groupId) store.removeMessageGroup(activeConversation.value.id, groupId);
  else store.removeMessage(activeConversation.value.id, message.id);
  closeMessageAction();
  await requestAiReply([], historyBeforeMessage);
}

async function retryFailedMessage(message) {
  if (!activeConversation.value || replying.value) return;
  const historyBeforeMessage = activeMessages.value.filter(item => item.createdAt < message.createdAt);
  store.removeMessage(activeConversation.value.id, message.id);
  await requestAiReply([], historyBeforeMessage);
}

async function loadTavernData() {
  try {
    roleData.value = await tavern.getRoleAppData();
    loadRoleAppSelection();
  } catch (error) {
    console.warn('[MessageApp] tavern data failed:', error);
    loadRoleAppSelection();
  }
}

function openConversation(conversation) {
  sounds.play('click');
  activeConversation.value = conversation;
  if (activeConversation.value.type === 'group' && !activeConversation.value.speechMode) activeConversation.value.speechMode = 'random';
  if (activeConversation.value.type === 'group' && !activeConversation.value.memberFrequency) activeConversation.value.memberFrequency = {};
  store.markRead(conversation.id);
  nextTick(scrollToBottom);
}

function startPrivateChat(role) {
  const conversation = store.createPrivateConversation(role);
  if (role.avatar && !conversation.avatar) store.updateConversation(conversation.id, { avatar: role.avatar });
  openConversation(conversation);
}

function createRole() {
  if (!roleForm.name.trim()) return;
  const role = store.addRole({ ...roleForm });
  const conversation = store.createPrivateConversation(role);
  Object.assign(roleForm, { name: '', avatar: '', enableCustomPersona: false, customPersona: '' });
  roleDialogOpen.value = false;
  openConversation(conversation);
}

function importFromTavern() {
  store.importTavernRoles(roleData.value.characters || []);
  sounds.play('special');
}

function createGroup() {
  if (!groupForm.name.trim() || !groupForm.memberIds.length) return;
  const conversation = store.createGroupConversation({ ...groupForm });
  Object.assign(groupForm, { name: '', avatar: '', description: '', includeUser: true, memberIds: [], speechMode: 'random', selectedSpeakerId: '' });
  groupDialogOpen.value = false;
  openConversation(conversation);
}

function userPayload(type, extra = {}) {
  return { senderType: 'user', senderId: 'user', senderName: '我', senderAvatar: '', type, ...extra };
}

function chooseAvatar(target) {
  avatarTarget.value = target;
  if (avatarFileInput.value) {
    avatarFileInput.value.value = '';
    avatarFileInput.value.click();
  }
}

function onAvatarFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    avatarCropSrc.value = ev.target.result;
    avatarCropOpen.value = true;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function applyAvatarCrop(dataUrl) {
  if (avatarTarget.value === 'userProfile') {
    userProfile.avatar = dataUrl;
    saveUserProfile();
    return;
  }
  if (avatarTarget.value === 'roleForm') {
    roleForm.avatar = dataUrl;
    return;
  }
  if (avatarTarget.value === 'groupForm') {
    groupForm.avatar = dataUrl;
    return;
  }
  if (avatarTarget.value === 'activeRole' && activeRole.value && activeConversation.value) {
    store.updateRole(activeRole.value.id, { avatar: dataUrl });
    activeConversation.value.avatar = dataUrl;
    return;
  }
  if (avatarTarget.value === 'activeConversation' && activeConversation.value) {
    store.updateConversation(activeConversation.value.id, { avatar: dataUrl });
    activeConversation.value.avatar = dataUrl;
  }
}

function shareUserStatus(conversation) {
  const status = userStatusDraft.value.trim();
  if (!status) return;
  saveUserProfile();
  store.addMessage(conversation.id, {
    senderType: 'system',
    senderId: 'user_status',
    senderName: '用户状态',
    type: 'system',
    text: `用户当前状态：${status}`,
    status: '',
  });
  statusShareOpen.value = false;
  sounds.play('special');
}

function openRedpacket(message) {
  if (!activeConversation.value || message.redpacket?.opened) return;
  const redpacket = { ...(message.redpacket || {}), opened: true };
  if (message.senderType === 'role' && !redpacket.received) {
    const amountCents = Number(redpacket.amountCents) || parseMoneyToCents(redpacket.amountText || redpacket.amount || '0');
    if (amountCents > 0) {
      wallet.balanceCents += amountCents;
      addLedgerRecord('income', amountCents, `收红包：${message.senderName || '角色'} · ${redpacket.title || '红包'}`);
      redpacket.received = true;
      redpacket.amountText = formatMoney(amountCents);
    }
  }
  store.updateMessage(activeConversation.value.id, message.id, { redpacket });
  sounds.play('special');
}

function openGift(message) {
  if (!activeConversation.value || message.gift?.opened) return;
  const gift = { ...(message.gift || {}), opened: true };
  if (message.senderType === 'role' && !gift.collected) {
    addGiftToLibrary(message, gift);
    gift.collected = true;
  }
  store.updateMessage(activeConversation.value.id, message.id, { gift });
  sounds.play('special');
}

function transferStatusLabel(transfer = {}) {
  return ({ accepted: '已收款', rejected: '已拒收', pending: '已收款' })[transfer.status || 'pending'] || '已收款';
}

function canAcceptTransfer(message) {
  return message.type === 'transfer' && message.senderType === 'role' && (message.transfer?.status || 'pending') === 'pending';
}

function canRejectTransfer(message) {
  return message.type === 'transfer' && message.senderType === 'role' && (message.transfer?.status || 'pending') === 'pending';
}

function acceptTransfer(message) {
  if (!activeConversation.value || !canAcceptTransfer(message)) return;
  const amountCents = Number(message.transfer?.amountCents) || parseMoneyToCents(message.transfer?.amountText || '0');
  const transfer = { ...(message.transfer || {}), amountCents, amountText: formatMoney(amountCents), status: 'accepted', acceptedAt: Date.now() };
  if (message.senderType === 'role' && !transfer.received && amountCents > 0) {
    wallet.balanceCents += amountCents;
    addLedgerRecord('income', amountCents, `收转账：${message.senderName || '角色'} · ${transfer.note || '转账'}`);
    transfer.received = true;
  }
  store.updateMessage(activeConversation.value.id, message.id, { transfer });
  store.addSystemMessage(activeConversation.value.id, '你已收款');
  sounds.play('special');
}

function rejectTransfer(message) {
  if (!activeConversation.value || !canRejectTransfer(message)) return;
  const amountCents = Number(message.transfer?.amountCents) || parseMoneyToCents(message.transfer?.amountText || '0');
  const transfer = { ...(message.transfer || {}), amountCents, amountText: formatMoney(amountCents), status: 'rejected', rejectedAt: Date.now() };
  if (message.senderType === 'user' && !transfer.refunded && amountCents > 0) {
    wallet.balanceCents += amountCents;
    addLedgerRecord('income', amountCents, `转账退回：${transfer.note || '转账'}`);
    transfer.refunded = true;
  }
  store.updateMessage(activeConversation.value.id, message.id, { transfer });
  store.addSystemMessage(activeConversation.value.id, '你已拒收转账');
  sounds.play('special');
}

async function sendText(withReply) {
  const text = draft.value.trim();
  if (!activeConversation.value) return;
  if (!text) {
    if (withReply) await requestAiReply();
    return;
  }
  draft.value = '';
  panelOpen.value = '';
  const sent = store.addMessage(activeConversation.value.id, userPayload('text', { text, status: 'sending' }));
  store.updateMessage(activeConversation.value.id, sent.id, { status: 'sent' });
  sounds.play('userTrigger');
  if (withReply) await requestAiReply([sent]);
}

function sendSticker(sticker) {
  if (!activeConversation.value) return;
  store.addMessage(activeConversation.value.id, userPayload('sticker', { sticker: { pack: activeStickerPack.value?.name || '', name: sticker.name, url: sticker.url } }));
  sounds.play('userTrigger');
  panelOpen.value = '';
}

function sendFakeImage() {
  if (!activeConversation.value) return;
  const description = prompt('描述这张假图片，AI 会把它当作真的图片理解：', '一张可爱的照片');
  if (!description?.trim()) return;
  store.addMessage(activeConversation.value.id, userPayload('image', {
    text: description.trim(),
    image: { fake: true, description: description.trim(), url: '' },
  }));
  sounds.play('userTrigger');
  panelOpen.value = '';
}

function chooseChatImage() {
  if (!activeConversation.value || !chatImageFileInput.value) return;
  chatImageFileInput.value.value = '';
  chatImageFileInput.value.click();
}

function onChatImageFile(event) {
  const file = event.target.files?.[0];
  if (!file || !activeConversation.value) return;
  const description = prompt('可选：给这张图片补充一句说明，方便角色理解：', '') || '';
  const reader = new FileReader();
  reader.onload = ev => {
    store.addMessage(activeConversation.value.id, userPayload('image', {
      text: description.trim(),
      image: { fake: false, description: description.trim(), url: ev.target.result, mimeType: file.type },
    }));
    sounds.play('userTrigger');
    panelOpen.value = '';
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function sendRedpacket() {
  const title = prompt('红包标题：', '恭喜发财');
  if (title === null) return;
  const amountText = prompt('金额：', '1.00');
  if (amountText === null) return;
  const amountCents = parseMoneyToCents(amountText);
  if (amountCents <= 0) {
    alert('请输入有效金额，最多精确到分。');
    return;
  }
  if (wallet.balanceCents < amountCents) {
    alert(`余额不足，当前余额 ${formatMoney(wallet.balanceCents)}`);
    return;
  }
  wallet.balanceCents -= amountCents;
  addLedgerRecord('expense', amountCents, `发红包：${title || '恭喜发财'}`);
  store.addMessage(activeConversation.value.id, userPayload('redpacket', { redpacket: { title, amountText: formatMoney(amountCents) } }));
  sounds.play('userTrigger');
  panelOpen.value = '';
}

function sendTransfer() {
  if (!activeConversation.value) return;
  const amountText = prompt('转账金额：', '1.00');
  if (amountText === null) return;
  const amountCents = parseMoneyToCents(amountText);
  if (amountCents <= 0) {
    alert('请输入有效金额，最多精确到分。');
    return;
  }
  if (wallet.balanceCents < amountCents) {
    alert(`余额不足，当前余额 ${formatMoney(wallet.balanceCents)}`);
    return;
  }
  const note = (prompt('转账备注：', '转账') || '转账').trim() || '转账';
  wallet.balanceCents -= amountCents;
  addLedgerRecord('expense', amountCents, `转账给：${activeConversation.value.name} · ${note}`);
  store.addMessage(activeConversation.value.id, userPayload('transfer', {
    transfer: { amountCents, amountText: formatMoney(amountCents), note, status: 'pending', createdAt: Date.now() },
  }));
  sounds.play('userTrigger');
  panelOpen.value = '';
}

function sendGift() {
  const name = prompt('礼物名：', '一束花');
  if (!name) return;
  const text = prompt('附言：', '送给你') || '';
  store.addMessage(activeConversation.value.id, userPayload('gift', { gift: { name, text } }));
  sounds.play('userTrigger');
  panelOpen.value = '';
}

function sendInteraction(option) {
  if (!activeConversation.value || !option) return;
  panelOpen.value = '';
  store.addMessage(activeConversation.value.id, userPayload('interaction', { text: option.text, interaction: { ...option, targetName: interactionTargetName.value } }));
  sounds.play('userTrigger');
}

function sendMoodCard(option) {
  if (!activeConversation.value || !option) return;
  panelOpen.value = '';
  store.addMessage(activeConversation.value.id, userPayload('mood_card', { text: option.text, moodCard: { ...option, createdAt: Date.now() } }));
  sounds.play('userTrigger');
}

async function sendWeather() {
  panelOpen.value = '';
  if (weather.city.value === '定位中…' || weather.city.value === '获取失败') await weather.load();
  store.addMessage(activeConversation.value.id, userPayload('weather', {
    weather: { city: weather.city.value, condition: weather.condition.value, temp: weather.temp.value, high: weather.high.value, low: weather.low.value },
  }));
  sounds.play('userTrigger');
}

function startSpeech() {
  panelOpen.value = '';
  if (speech.listening.value) return;
  speechText.value = '';
  if (!speech.start()) {
    if (speech.error.value && !/already started|recognition has already started/i.test(speech.error.value)) {
      store.addSystemMessage(activeConversation.value.id, speech.error.value);
    }
    return;
  }
  speechDraftOpen.value = true;
  sounds.play('panel');
}

function stopSpeechDraft() {
  speech.stop();
  speechDraftOpen.value = false;
  speechText.value = '';
}

async function sendSpeech(withReply) {
  const text = speechText.value.trim();
  if (!text) return;
  speech.stop();
  speechDraftOpen.value = false;
  const sent = store.addMessage(activeConversation.value.id, userPayload('voice', { text, duration: Math.max(2, Math.min(30, Math.ceil(text.length / 3))) }));
  sounds.play('userTrigger');
  if (withReply) await requestAiReply([sent]);
}

async function requestAiReply(extraHistory = [], overrideHistory = null) {
  if (!activeConversation.value || replying.value) return;
  replyAbortController = new AbortController();
  replying.value = true;
  const conversationId = activeConversation.value.id;
  try {
    const baseHistory = overrideHistory || activeMessages.value;
    const replies = await ai.requestReply({
      conversation: activeConversation.value,
      roles: activeMembers.value,
      user: roleData.value.user,
      worldBooks: roleData.value.worldBooks,
      worldBookEntries: roleData.value.worldBookEntries || [],
      history: extraHistory.length ? [...baseHistory, ...extraHistory].filter((item, index, list) => list.findIndex(target => target.id === item.id) === index) : baseHistory,
      signal: replyAbortController.signal,
    });
    const replyGroupId = createMessageId('reply');
    replies.forEach(reply => {
      const role = store.findRole(reply.senderId) || activeMembers.value[0];
      if (role && reply.mood) role.mood = reply.mood;
      store.addMessage(conversationId, {
        senderType: 'role',
        senderId: role?.id || reply.senderId,
        senderName: role?.name || '角色',
        senderAvatar: role?.avatar || '',
        type: reply.type,
        replyGroupId,
        status: 'sent',
        text: reply.text,
        duration: reply.duration,
        sticker: reply.sticker,
        redpacket: normalizeRoleRedpacket(reply.redpacket),
        gift: reply.gift,
        transfer: reply.transfer ? { status: 'pending', createdAt: Date.now(), ...reply.transfer, amountCents: Number(reply.transfer.amountCents) || parseMoneyToCents(reply.transfer.amountText || reply.transfer.amount || '0') } : null,
      });
    });
    sounds.play('roleTrigger');
  } catch (error) {
    if (error?.name === 'AbortError') {
      store.addSystemMessage(conversationId, '已取消发送');
    } else {
      store.addMessage(conversationId, { senderType: 'system', senderId: 'system', senderName: '系统', type: 'system', text: error.message || 'AI 回复失败', status: 'failed' });
      sounds.play('error');
    }
  } finally {
    replyAbortController = null;
    replying.value = false;
  }
}

function cancelAiReply() {
  replyAbortController?.abort();
}

function saveActiveConversation() {
  if (!activeConversation.value) return;
  store.updateConversation(activeConversation.value.id, activeConversation.value);
}

function toggleGroupMember(roleId, checked) {
  if (!activeConversation.value) return;
  const ids = new Set(activeConversation.value.memberIds);
  if (checked) ids.add(roleId);
  else ids.delete(roleId);
  activeConversation.value.memberIds = [...ids];
  saveActiveConversation();
}

function setMemberFrequency(roleId, value) {
  if (!activeConversation.value) return;
  activeConversation.value.memberFrequency = { ...(activeConversation.value.memberFrequency || {}), [roleId]: Number(value) || 0 };
  saveActiveConversation();
}

function setColorWallpaper() {
  store.updateConversation(activeConversation.value.id, { wallpaper: { type: 'color', value: wallpaperColor.value } });
}
function setImageWallpaper() {
  if (!wallpaperImage.value.trim()) return;
  store.updateConversation(activeConversation.value.id, { wallpaper: { type: 'image', value: wallpaperImage.value.trim() } });
}
function resetWallpaper() {
  store.updateConversation(activeConversation.value.id, { wallpaper: { type: 'default', value: '' } });
}
function clearChat() {
  if (!confirm('清空当前聊天记录？这会同时清除该会话的总结和长期记忆。')) return;
  store.clearMessages(activeConversation.value.id);
  memory.clearConversationMemory(activeConversation.value.id);
  settingsOpen.value = false;
}

function deleteCurrentGroup() {
  if (!activeConversation.value || activeConversation.value.type !== 'group') return;
  if (!confirm(`删除群聊「${activeConversation.value.name}」？这会清空该群聊所有记录。`)) return;
  const id = activeConversation.value.id;
  memory.clearConversationMemory(id);
  store.deleteConversation(id);
  activeConversation.value = null;
  settingsOpen.value = false;
}

function confirmDeleteCurrentRole() {
  const role = activeRole.value;
  if (!role) return;
  if (!confirm(`删除角色「${role.name}」？相关私聊记录会一起删除，群聊中也会移除此角色。`)) return;
  if (!confirm('再次确认：这不是清空聊天记录，而是删除这个角色。')) return;
  clearRoleMemoryById(role.id);
  store.deleteRole(role.id);
  activeConversation.value = null;
  settingsOpen.value = false;
}

onMounted(() => {
  loadRoleAppSelection();
  window.addEventListener('phone-role-app-selection', handleRoleAppSelection);
  loadTavernData();
  syncOpenedGiftsToLibrary();
  removeSearchInputChrome(searchBoxEl.value, searchInputEl.value);
});

watch(homeTab, () => nextTick(() => removeSearchInputChrome(searchBoxEl.value, searchInputEl.value)));

onBeforeUnmount(() => {
  cancelAiReply();
  window.removeEventListener('phone-role-app-selection', handleRoleAppSelection);
});

function removeSearchInputChrome(shell, input) {
  [shell, input].filter(Boolean).forEach(element => {
    ['border', 'border-width', 'border-style', 'outline', 'box-shadow'].forEach(property => element.style.setProperty(property, property === 'border-style' || property === 'box-shadow' ? 'none' : '0', 'important'));
  });
  if (input) {
    input.style.setProperty('all', 'unset', 'important');
    input.style.setProperty('display', 'block', 'important');
    input.style.setProperty('flex', '1 1 auto', 'important');
    input.style.setProperty('min-width', '0', 'important');
    input.style.setProperty('font', 'inherit', 'important');
    ['background', 'background-color', 'background-image'].forEach(property => input.style.setProperty(property, property === 'background-image' ? 'none' : 'transparent', 'important'));
    input.style.setProperty('appearance', 'none', 'important');
    input.style.setProperty('-webkit-appearance', 'none', 'important');
  }
}
</script>

<style scoped>
.message-app { position:absolute; inset:0; z-index:18; overflow:hidden; border-radius:40px; background:#f5f5f5; color:#101010; font-family:inherit; }
.message-home, .chat-room { position:absolute; inset:0; display:flex; flex-direction:column; background:#f4f4f4; }
.message-home { animation:screen-rise .34s cubic-bezier(.2,.9,.2,1) both; }
.chat-room { background:#ececec; background-size:cover; background-position:center; }
.chat-room { animation:chat-slide .28s cubic-bezier(.2,.9,.2,1) both; }
.message-top, .chat-head { position:relative; z-index:3; display:grid; grid-template-columns:68px minmax(0,1fr) 68px; align-items:center; padding:56px 16px 12px; background:#fff; border-bottom:1px solid #e8e8e8; }
.message-top h1 { margin:0; font-size:25px; letter-spacing:.5px; }
.message-top h1, .chat-title { justify-self:center; }
.chat-title { text-align:center; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:36px; }
.chat-title h2 { margin:0; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:16px; }
.chat-title h2.editable-name { cursor:pointer; text-decoration:none; }
.chat-title p { margin:3px 0 0; color:#777; font-size:11px; }
button { font-family:inherit; border:none; cursor:pointer; }
.composer input::-webkit-outer-spin-button,
.composer input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.composer input[type="number"] { -moz-appearance:textfield; appearance:textfield; }
.ghost-btn { padding:7px 10px; border-radius:16px; background:#f1f1f1; color:#111; }
.round-btn { width:34px; height:34px; border-radius:50%; background:#111; color:#fff; font-size:20px; line-height:1; }
.message-top .round-btn, .chat-head .round-btn { justify-self:end; }
.create-menu { position:absolute; right:16px; top:88px; z-index:10; display:flex; flex-direction:column; width:118px; padding:8px; border:1px solid #ddd; border-radius:16px; background:#fff; box-shadow:0 12px 28px rgba(0,0,0,.18); animation:menu-pop .18s ease both; }
.create-menu button { padding:10px; border-radius:10px; background:#fff; text-align:left; color:#111; }
.create-menu button:hover { background:#f2f2f2; }
.user-profile-card { display:flex; justify-content:center; align-items:flex-start; gap:10px; padding:14px 16px 2px; }
.user-avatar { flex:0 0 auto; width:58px; height:58px; border-radius:15px; background:#111; background-size:cover; background-position:center; color:#fff; font-size:19px; font-weight:800; box-shadow:0 10px 24px rgba(0,0,0,.12); }
.status-bubble { position:relative; width:168px; min-height:58px; padding:9px 10px 8px 14px; border-radius:18px 18px 18px 7px; background:#fff; box-shadow:0 10px 26px rgba(0,0,0,.08); }
.status-bubble::before { content:""; position:absolute; left:-7px; top:18px; width:12px; height:12px; border-radius:50%; background:#fff; box-shadow:-6px 7px 0 -2px rgba(255,255,255,.85); }
.status-bubble textarea { width:100%; min-height:28px; max-height:54px; resize:none; border:0; outline:0; background:transparent; color:#111; font:inherit; font-size:12px; line-height:1.35; }
.status-bubble textarea::placeholder { color:#aaa; }
.status-actions { display:flex; justify-content:flex-end; gap:6px; margin-top:4px; }
.status-actions button { padding:4px 8px; border-radius:999px; background:#f1f1f1; color:#111; font-size:10px; }
.status-actions button:last-child { background:#111; color:#fff; }
.status-actions button:disabled { opacity:.35; cursor:default; }
.search-box { display:flex; align-items:center; gap:8px; margin:12px 16px; padding:10px 13px; border-radius:16px; background:#fff; color:#888; border:0 !important; outline:0 !important; box-shadow:none !important; }
.search-box:focus-within { border:0 !important; outline:0 !important; box-shadow:none !important; }
.search-box input, .search-box input:hover, .search-box input:focus, .search-box input:focus-visible, .search-box input:active { all:unset !important; display:block !important; flex:1 1 auto !important; min-width:0 !important; border:0 !important; border-width:0 !important; border-style:none !important; outline:0 !important; box-shadow:none !important; background:transparent !important; background-color:transparent !important; background-image:none !important; color:#111 !important; font:inherit !important; appearance:none !important; -webkit-appearance:none !important; }
.home-panel-content { flex:1; min-height:0; display:flex; flex-direction:column; }
.home-panel-enter-active, .home-panel-leave-active { transition:opacity .22s ease, transform .22s cubic-bezier(.2,.8,.2,1); }
.home-panel-enter-from { opacity:0; transform:translateY(10px) scale(.985); }
.home-panel-leave-to { opacity:0; transform:translateY(-8px) scale(.99); }
.home-panel-enter-to, .home-panel-leave-from { opacity:1; transform:none; }
.conversation-list { flex:1; overflow-y:auto; padding:0 12px 78px; }
.conversation-list::-webkit-scrollbar, .message-scroll::-webkit-scrollbar { width:0; }
.conversation-item { display:flex; align-items:center; gap:12px; width:100%; padding:12px 6px; border-bottom:1px solid #e8e8e8; background:transparent; text-align:left; color:#111; cursor:pointer; transition:transform .18s ease, background .18s ease; animation:list-in .28s ease both; }
.conversation-item:active { transform:scale(.985); background:#ededed; }
.conversation-avatar { flex:0 0 auto; width:42px; height:42px; border-radius:10px; }
.conversation-main { flex:1; min-width:0; }
.conversation-line { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.conversation-line strong { font-size:15px; font-weight:650; }
.conversation-line time { font-size:10px; color:#888; }
.conversation-line span { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:12px; }
.conversation-line b { min-width:18px; height:18px; padding:0 5px; border-radius:99px; background:#d71920; color:#fff; font-size:10px; line-height:18px; text-align:center; }
.muted { margin-top:4px; color:#777; }
.empty-state { margin:90px 18px 0; padding:28px 18px; border:1px solid #ddd; border-radius:28px; background:#fff; text-align:center; }
.empty-mark { width:54px; height:54px; margin:0 auto 14px; border-radius:18px; background:#111; color:#d71920; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:25px; }
.empty-state h2 { margin:0 0 6px; font-size:18px; }
.empty-state p { margin:0; color:#777; font-size:12px; }
.empty-actions { display:flex; justify-content:center; gap:10px; margin-top:16px; }
.empty-actions button, .modal-actions button { padding:9px 12px; border-radius:14px; background:#111; color:#fff; }
.role-shortcuts { margin:12px 6px 22px; padding:12px; border:1px solid #e3e3e3; border-radius:22px; background:#fff; }
.role-shortcuts h2 { margin:0 0 8px; font-size:14px; }
.role-shortcuts button { display:flex; align-items:center; gap:9px; width:100%; padding:8px 0; border-top:1px solid #f0f0f0; background:transparent; color:#111; text-align:left; }
.role-shortcuts button:first-of-type { border-top:0; }
.role-shortcuts span { flex:1; }
.role-shortcuts em { color:#d71920; font-style:normal; font-size:11px; }
.balance-page { flex:1; overflow-y:auto; padding:10px 16px 86px; }
.balance-card { padding:18px; border-radius:24px; background:#111; color:#fff; box-shadow:0 14px 34px rgba(0,0,0,.14); }
.balance-card span { color:rgba(255,255,255,.65); font-size:12px; }
.balance-card strong { display:block; margin:8px 0 6px; font-size:34px; letter-spacing:.5px; }
.balance-card p { margin:0; color:rgba(255,255,255,.55); font-size:11px; }
.balance-actions { display:flex; gap:8px; margin-top:14px; }
.balance-actions button { flex:1; padding:8px 10px; border-radius:13px; background:#fff; color:#111; font-size:12px; font-weight:700; }
.ledger-card { margin-top:12px; padding:12px; border-radius:22px; background:#fff; border:1px solid #eee; }
.ledger-card header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.ledger-card h2 { margin:0; font-size:14px; }
.ledger-card header span, .ledger-empty { color:#999; font-size:11px; }
.ledger-item { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 0; border-top:1px solid #f0f0f0; }
.ledger-item:first-of-type { border-top:0; }
.ledger-item strong { display:block; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
.ledger-item time { display:block; margin-top:3px; color:#999; font-size:10px; }
.ledger-item > span { font-size:13px; font-weight:750; }
.ledger-item.income > span { color:#111; }
.ledger-item.expense > span { color:#d71920; }
.gift-page { flex:1; overflow-y:auto; padding:10px 16px 86px; }
.gift-library-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px; border-radius:22px; background:#fff; border:1px solid #eee; }
.gift-library-head span { color:#999; font-size:11px; }
.gift-library-head strong { display:block; margin-top:3px; font-size:20px; }
.gift-library-actions { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
.gift-library-actions button { padding:7px 9px; border-radius:999px; background:#111; color:#fff; font-size:11px; }
.gift-library-actions .danger { background:#d71920; }
.gift-library-actions button:disabled { opacity:.35; cursor:default; }
.gift-library-list { display:flex; flex-direction:column; gap:8px; margin-top:10px; }
.gift-library-item { display:flex; align-items:center; gap:10px; width:100%; padding:10px; border:1px solid #eee; border-radius:18px; background:#fff; color:#111; text-align:left; transition:transform .16s ease, border-color .16s ease, background .16s ease; }
.gift-library-item:active { transform:scale(.99); }
.gift-library-item.selected { border-color:#d71920; background:#fff8f8; }
.gift-library-item div { min-width:0; }
.gift-library-item strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
.gift-library-item em { display:block; margin-top:3px; color:#999; font-size:10px; font-style:normal; }
.gift-library-item p { margin:5px 0 0; color:#555; font-size:12px; line-height:1.35; }
.gift-mini-box { position:relative; flex:0 0 auto; width:34px; height:30px; border-radius:8px; background:#111; box-shadow:inset 0 -11px 0 rgba(255,255,255,.08); }
.gift-mini-box::before { content:""; position:absolute; left:-2px; right:-2px; top:-7px; height:9px; border-radius:7px; background:#111; }
.gift-mini-box::after { content:""; position:absolute; left:50%; top:-7px; bottom:0; width:5px; transform:translateX(-50%); background:#d71920; border-radius:4px; }
.gift-mini-box i { position:absolute; left:7px; right:7px; top:-14px; height:11px; border:2px solid #d71920; border-bottom:0; border-radius:10px 10px 0 0; }
.gift-empty { min-height:160px; }
.home-tabs { position:absolute; left:14px; right:14px; bottom:16px; z-index:5; display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:6px; border-radius:20px; background:rgba(255,255,255,.92); box-shadow:0 12px 30px rgba(0,0,0,.14); backdrop-filter:blur(14px); }
.home-tabs button { padding:10px; border-radius:15px; background:transparent; color:#666; font-size:12px; font-weight:700; }
.home-tabs button.active { background:#111; color:#fff; }
.editable-name { cursor:pointer; text-decoration:underline; text-decoration-color:rgba(215,25,32,.35); text-underline-offset:3px; }
.message-scroll { flex:1; min-height:0; overflow-y:auto; padding:18px 18px 14px; }
.message-row { display:flex; gap:9px; margin:12px 0; align-items:flex-start; animation:message-in .2s ease both; }
.message-row.user { justify-content:flex-end; }
.message-row.system { justify-content:center; }
.message-meta { flex:0 0 auto; display:flex; flex-direction:column; align-items:center; gap:3px; margin-left:-8px; margin-top:2px; }
.message-meta time { color:#888; font-size:9px; line-height:1; white-space:nowrap; }
.message-avatar { width:38px; height:38px; border-radius:9px; }
.message-row.user .message-body { order:1; }
.user-message-meta { order:2; margin-left:0; margin-right:-8px; }
.message-body { position:relative; max-width:72%; min-width:0; }
.message-body.group-role { display:flex; align-items:center; gap:8px; max-width:92%; }
.sender-name { display:flex; flex-direction:column; align-items:flex-start; min-width:54px; color:#555; font-size:10px; line-height:1.35; }
.sender-name strong { max-width:72px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#222; font-size:11px; font-weight:650; }
.message-action { position:absolute; top:-28px; right:0; z-index:6; min-width:38px; padding:6px 9px; border-radius:999px; background:#fff; color:#111; box-shadow:0 10px 24px rgba(0,0,0,.14); animation:menu-pop .14s ease both; }
.message-action-menu { position:absolute; top:-40px; right:0; z-index:6; display:flex; gap:5px; padding:5px; border:1px solid rgba(0,0,0,.08); border-radius:999px; background:rgba(255,255,255,.96); box-shadow:0 10px 24px rgba(0,0,0,.14); animation:menu-pop .14s ease both; backdrop-filter:blur(10px); }
.message-action-menu button { padding:6px 9px; border-radius:999px; background:#f2f2f2; color:#111; white-space:nowrap; font-size:11px; }
.message-action-menu button:active { background:#e6e6e6; }
.message-row.role .message-action-menu { left:0; right:auto; }
.message-row.role .message-action { left:0; right:auto; }
.message-status { margin-top:4px; display:flex; align-items:center; justify-content:flex-end; gap:6px; color:#888; font-size:10px; }
.message-status.failed { color:#d71920; }
.message-status button { padding:2px 7px; border-radius:999px; background:#d71920; color:#fff; font-size:10px; }
.bubble { padding:11px 13px; border-radius:17px; background:#fff; color:#111; white-space:pre-wrap; line-height:1.55; font-size:13px; box-shadow:0 8px 22px rgba(0,0,0,.09); transition:transform .18s ease, box-shadow .18s ease, background .18s ease; }
.bubble:hover, .voice-bubble:hover, .sticker-message:hover { transform:translateY(-1px); box-shadow:0 12px 26px rgba(0,0,0,.12); }
.message-row.user .bubble { background:#fff; color:#111; border-bottom-right-radius:5px; box-shadow:0 8px 22px rgba(0,0,0,.09); }
.message-row.role .bubble { background:#111; color:#fff; border-bottom-left-radius:5px; box-shadow:0 8px 22px rgba(0,0,0,.16); }
.bubble.system { background:#ddd; color:#666; font-size:11px; }
.voice-bubble { display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-width:112px; padding:10px 12px; border-radius:16px; background:#fff; color:#111; box-shadow:0 8px 22px rgba(0,0,0,.09); transition:transform .18s ease, box-shadow .18s ease; }
.message-row.user .voice-bubble { background:#fff; color:#111; box-shadow:0 8px 22px rgba(0,0,0,.09); }
.message-row.role .voice-bubble { background:#111; color:#fff; box-shadow:0 8px 22px rgba(0,0,0,.16); }
.voice-wave { color:#d71920; letter-spacing:2px; }
.voice-bubble em { font-style:normal; font-size:11px; opacity:.72; }
.sticker-message { display:flex; align-items:center; justify-content:center; padding:6px; border-radius:16px; background:rgba(255,255,255,.82); box-shadow:0 8px 22px rgba(0,0,0,.08); transition:transform .18s ease, box-shadow .18s ease; }
.sticker-message img { max-width:116px; max-height:116px; object-fit:contain; }
.image-message { display:flex; flex-direction:column; gap:6px; max-width:190px; padding:6px; border-radius:18px; background:#fff; box-shadow:0 8px 22px rgba(0,0,0,.1); overflow:hidden; }
.image-message.fake { max-width:170px; }
.message-row.role .image-message { background:#111; color:#fff; }
.image-message img { max-width:178px; max-height:220px; border-radius:13px; object-fit:cover; }
.image-message small { color:#666; font-size:10px; line-height:1.35; }
.message-row.role .image-message small { color:rgba(255,255,255,.66); }
.fake-image-card { width:150px; min-height:108px; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; border:1px dashed #ddd; border-radius:13px; background:#fafafa; color:#555; text-align:center; overflow:hidden; }
.fake-image-card span { padding:4px 9px; border-radius:999px; background:#111; color:#fff; font-size:10px; }
.fake-image-card p { margin:0; max-width:100%; padding:0 10px; box-sizing:border-box; font-size:12px; line-height:1.45; word-break:break-word; }
.weather-card { width:180px; padding:13px; border-radius:18px; background:#fff; box-shadow:0 6px 18px rgba(0,0,0,.1); }
.weather-card span { color:#d71920; font-size:11px; }
.weather-card strong { display:block; margin:5px 0; font-size:15px; }
.weather-card em { color:#666; font-size:12px; font-style:normal; }
.shopping-message-card { width:218px; padding:13px; border-radius:18px; text-align:left; box-shadow:0 8px 20px rgba(0,0,0,.1); border:1px solid transparent; }
.shopping-message-card.shared { background:#f8fbfd; border-color:#cbdbe5; color:#193747; }
.shopping-message-card.gifted { background:#fff7f6; border-color:#f0c3be; color:#531714; }
.shopping-message-card span { display:inline-flex; padding:3px 7px; border-radius:10px; font-size:10px; font-weight:750; }
.shopping-message-card.shared span { background:#e6f0f6; color:#2d536a; }
.shopping-message-card.gifted span { background:#ffe6e3; color:#c52b25; }
.shopping-message-card strong { display:block; margin:7px 0 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:15px; }
.shopping-message-card em { display:block; color:#d71920; font-size:17px; font-style:normal; font-weight:850; }
.shopping-message-card p, .shopping-message-card small { display:block; margin:6px 0 0; color:inherit; opacity:.78; font-size:11px; line-height:1.45; }
.music-share-card { display:grid; grid-template-columns:54px minmax(0,1fr); gap:11px; width:232px; padding:12px; border-radius:20px; background:#fff; border:1px solid #f0d4d2; box-shadow:0 8px 20px rgba(0,0,0,.1); text-align:left; color:#171717; }
.music-share-cover { width:54px; height:54px; border-radius:50%; background:#171717; color:#fff; display:flex; align-items:center; justify-content:center; background-size:cover; background-position:center; font-weight:850; }
.music-share-copy { min-width:0; }
.music-share-copy span { display:inline-flex; padding:3px 7px; border-radius:10px; background:#fff0ef; color:#d71920; font-size:10px; font-weight:800; }
.music-share-copy strong { display:block; margin:6px 0 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:15px; }
.music-share-copy p, .music-share-copy small { display:block; margin:4px 0 0; color:#5f5f5f; font-size:11px; line-height:1.45; }
.music-share-copy p { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.landlord-share-card { width:224px; padding:14px; border-radius:20px; background:#145238; border:1px solid #d7b15b; box-shadow:0 8px 20px rgba(0,0,0,.12); text-align:left; color:#fff4cd; }
.landlord-share-card.win { background:#b82420; }
.landlord-share-card > span { display:inline-flex; padding:3px 8px; border-radius:999px; background:#f4c35a; color:#2a2110; font-size:10px; font-weight:900; }
.landlord-share-card strong { display:block; margin:8px 0 4px; font-size:20px; letter-spacing:.4px; }
.landlord-share-card p { margin:0; color:#ffe39a; font-size:12px; font-weight:800; }
.landlord-share-card small { display:block; margin-top:7px; color:rgba(255,244,205,.78); font-size:11px; line-height:1.45; }
.landlord-remaining-list { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.landlord-remaining-list em { padding:3px 6px; border-radius:999px; background:rgba(255,244,205,.16); color:#fff4cd; font-size:10px; font-style:normal; font-weight:800; }
.browser-search-card { width:238px; padding:13px; border-radius:20px; background:#fff; border:1px solid #d8e0ea; box-shadow:0 8px 20px rgba(0,0,0,.1); text-align:left; color:#171717; }
.browser-search-card > span { display:inline-flex; padding:3px 7px; border-radius:10px; background:#eef2f7; color:#1f2937; font-size:10px; font-weight:850; }
.browser-search-card > strong { display:block; margin:8px 0 5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:15px; }
.browser-search-card p { margin:0; color:#4b5563; font-size:12px; line-height:1.45; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.browser-result-line { margin:9px 0 6px; padding:8px; border-radius:14px; background:#f7f8fa; border:1px solid #edf0f4; }
.browser-result-line em, .browser-result-line small, .browser-search-card > small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-style:normal; }
.browser-result-line em { color:#1e3a8a; font-size:12px; font-weight:850; }
.browser-result-line small { margin-top:3px; color:#0f766e; font-size:10px; }
.browser-search-card > small { color:#6b7280; font-size:10px; }
.inspect-share-card { width:218px; padding:13px; border-radius:20px; background:#fffdf9; border:1px solid #e9dcc9; box-shadow:0 8px 20px rgba(0,0,0,.1); text-align:left; color:#211d1b; }
.inspect-share-card > span { display:inline-flex; padding:3px 7px; border-radius:10px; background:#f2e7d8; color:#765d40; font-size:10px; font-weight:850; }
.inspect-share-card strong { display:block; margin:8px 0 5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:16px; }
.inspect-share-card p { margin:0; color:#66584b; font-size:11px; line-height:1.4; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.inspect-share-card small { display:block; margin-top:7px; color:#8d7b68; font-size:10px; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.redpacket-card, .gift-card { position:relative; display:flex; align-items:center; gap:12px; width:202px; min-height:88px; padding:12px; border-radius:20px; text-align:left; box-shadow:0 10px 24px rgba(0,0,0,.12); overflow:hidden; transition:transform .18s ease, box-shadow .18s ease; }
.transfer-card { position:relative; display:grid; grid-template-columns:42px minmax(0,1fr); gap:11px; width:228px; min-height:96px; padding:13px; border-radius:13px; text-align:left; box-shadow:0 8px 18px rgba(0,0,0,.12); overflow:hidden; transition:transform .18s ease, box-shadow .18s ease; }
.redpacket-card:active, .gift-card:active, .transfer-card:active { transform:scale(.98); }
.redpacket-card { background:#d71920; color:#fff; }
.redpacket-card::before { content:""; position:absolute; left:0; right:0; top:0; height:34px; background:rgba(255,255,255,.12); clip-path:polygon(0 0,100% 0,50% 100%); transform-origin:50% 0; transition:transform .32s cubic-bezier(.2,.9,.2,1); }
.redpacket-card.opened::before { transform:rotateX(72deg); }
.redpacket-seal { position:relative; z-index:1; flex:0 0 auto; width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#fff; color:#d71920; font-size:15px; font-weight:850; box-shadow:0 6px 16px rgba(0,0,0,.16); transition:transform .32s cubic-bezier(.2,.9,.2,1); }
.redpacket-card.opened .redpacket-seal { transform:rotate(12deg) scale(1.08); }
.redpacket-copy, .gift-copy { position:relative; z-index:1; min-width:0; }
.redpacket-copy em, .gift-copy em { font-style:normal; font-size:11px; opacity:.7; }
.redpacket-copy strong, .gift-copy strong { display:block; margin:4px 0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:15px; }
.redpacket-copy small, .gift-copy small { display:block; color:inherit; opacity:.72; font-size:11px; }
.gift-card { background:#fff; color:#111; border:1px solid #eee; }
.gift-box { position:relative; flex:0 0 auto; width:44px; height:38px; border-radius:9px; background:#111; box-shadow:inset 0 -14px 0 rgba(255,255,255,.08); }
.gift-box::before { content:""; position:absolute; left:-3px; right:-3px; top:-9px; height:12px; border-radius:8px; background:#111; transition:transform .3s cubic-bezier(.2,.9,.2,1); transform-origin:12px 100%; }
.gift-box::after { content:""; position:absolute; left:50%; top:-9px; bottom:0; width:6px; transform:translateX(-50%); background:#d71920; border-radius:4px; }
.gift-box i { position:absolute; left:8px; right:8px; top:-17px; height:14px; border:3px solid #d71920; border-bottom:0; border-radius:12px 12px 0 0; }
.gift-card.opened .gift-box::before { transform:translateY(-10px) rotate(-13deg); }
.gift-card.opened .gift-box { animation:gift-pop .38s cubic-bezier(.2,.9,.2,1); }
.transfer-card { background:#f5a623; color:#fff; border:1px solid rgba(172,100,0,.16); }
.transfer-card.accepted { background:#eba02a; }
.transfer-card.rejected { background:#d7b06a; }
.transfer-icon { position:relative; z-index:1; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.96); color:#f2a11e; font-size:25px; font-weight:900; box-shadow:0 5px 12px rgba(144,77,0,.18); }
.transfer-copy { position:relative; z-index:1; min-width:0; }
.transfer-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.transfer-head span { color:#fff; font-size:15px; font-weight:850; }
.transfer-head small { padding:2px 6px; border-radius:999px; background:rgba(255,255,255,.2); color:#fff; font-size:10px; white-space:nowrap; }
.transfer-copy strong { display:block; margin:5px 0 3px; color:#fff; font-size:23px; letter-spacing:.2px; }
.transfer-card.rejected .transfer-copy strong { opacity:.7; text-decoration:line-through; text-decoration-thickness:1px; }
.transfer-copy p { margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:rgba(255,255,255,.86); font-size:12px; }
.transfer-actions { position:relative; z-index:1; grid-column:1 / -1; display:flex; gap:8px; margin-top:2px; padding-top:9px; border-top:1px solid rgba(255,255,255,.2); }
.transfer-actions button { flex:1; padding:7px 8px; border-radius:10px; background:#fff3dc; color:#9a5b00; font-size:11px; font-weight:850; box-shadow:inset 0 0 0 1px rgba(154,91,0,.12); }
.transfer-actions button:last-child { background:#df8f17; color:#fff7ea; box-shadow:inset 0 0 0 1px rgba(255,255,255,.16); }
.interaction-card { display:inline-flex; align-items:center; gap:6px; max-width:230px; padding:7px 11px; border-radius:999px; background:rgba(255,255,255,.92); color:#555; box-shadow:0 8px 18px rgba(0,0,0,.08); font-size:12px; line-height:1; }
.message-row.user .interaction-card { background:rgba(17,17,17,.88); color:#fff; }
.interaction-card span, .interaction-card em { font-style:normal; font-weight:850; color:inherit; }
.interaction-card strong { color:#d71920; font-size:12px; white-space:nowrap; }
.message-row.user .interaction-card strong { color:#ffb8b8; }
.mood-card-message { position:relative; width:224px; padding:13px 14px 12px; border-radius:18px; background:#fff; border:1px solid #ead8d5; box-shadow:0 10px 22px rgba(0,0,0,.1); color:#2a1f1e; overflow:hidden; text-align:left; }
.mood-card-message::before { content:""; position:absolute; left:0; top:0; bottom:0; width:5px; background:#d71920; }
.mood-card-message::after { content:""; position:absolute; left:14px; right:14px; bottom:0; height:1px; background:linear-gradient(90deg,transparent,#f0d7d4,transparent); }
.mood-card-copy { position:relative; z-index:1; min-width:0; }
.mood-card-copy span { display:inline-flex; padding:3px 8px; border-radius:999px; background:#fff0ef; color:#d71920; font-size:10px; font-weight:850; letter-spacing:.3px; }
.mood-card-copy strong { display:block; margin:9px 0 5px; font-size:24px; letter-spacing:.4px; line-height:1; }
.mood-card-copy p { margin:0; color:#6d5551; font-size:12px; line-height:1.5; }
.mood-card-message.sad, .mood-card-message.anxious, .mood-card-message.sleepless { border-color:#d8e1ef; color:#1f2a38; }
.mood-card-message.sad::before, .mood-card-message.anxious::before, .mood-card-message.sleepless::before { background:#4f70a5; }
.mood-card-message.sad .mood-card-copy span, .mood-card-message.anxious .mood-card-copy span, .mood-card-message.sleepless .mood-card-copy span { background:#edf3fb; color:#4f70a5; }
.mood-card-message.sad .mood-card-copy p, .mood-card-message.anxious .mood-card-copy p, .mood-card-message.sleepless .mood-card-copy p { color:#526780; }
.mood-card-message.happy, .mood-card-message.miss_you { border-color:#f1d6c1; }
.mood-card-message.happy::before, .mood-card-message.miss_you::before { background:#f0a33a; }
.mood-card-message.happy .mood-card-copy span, .mood-card-message.miss_you .mood-card-copy span { background:#fff3df; color:#b76b08; }
.typing { width:max-content; margin:12px auto; padding:7px 12px; border-radius:99px; background:rgba(255,255,255,.75); color:#777; font-size:11px; }
.composer { position:relative; z-index:4; flex:0 0 auto; padding:8px 10px 18px; background:#fff; border-top:1px solid #e5e5e5; }
.composer-row { display:flex; align-items:flex-end; gap:6px; }
.input-shell { flex:1; min-width:0; display:flex; align-items:flex-end; gap:4px; border-radius:18px; padding:3px 5px 3px 3px; background:#f2f2f2; }
.speech-btn, .icon-btn { flex:0 0 auto; width:32px; height:32px; border-radius:50%; background:#efefef; color:#111; font-size:16px; line-height:1; }
.speech-btn { background:#fff; color:#555; }
.icon-btn { font-weight:750; }
.speech-btn svg, .icon-btn svg { width:17px; height:17px; display:block; margin:auto; fill:currentColor; }
.cancel-reply { background:#111 !important; color:#fff !important; font-size:22px; font-weight:500; }
.composer textarea { flex:1; width:100%; max-height:72px; min-height:32px; resize:none; border:0; outline:0; border-radius:15px; padding:8px 6px; background:transparent; color:#111; font:inherit; font-size:13px; }
.composer textarea::placeholder { color:#999; }
.composer-row button:disabled { opacity:.35; cursor:default; }
.accent { background:#d71920 !important; color:#fff !important; }
.role-only-composer { display:flex; justify-content:center; padding:6px 0 0; }
.role-only-composer button { width:100%; padding:11px 12px; border-radius:16px; font-weight:650; }
.sticker-panel, .more-panel, .speech-draft, .quick-card-panel { margin-bottom:8px; padding:10px; border-radius:18px; background:#f5f5f5; border:1px solid #e4e4e4; }
.pack-tabs { display:flex; gap:6px; margin-bottom:8px; overflow-x:auto; }
.pack-tabs button { padding:6px 10px; border-radius:99px; background:#fff; color:#111; white-space:nowrap; }
.pack-tabs button.active { background:#111; color:#fff; }
.sticker-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; max-height:172px; overflow-y:auto; }
.sticker-grid button { display:flex; align-items:center; justify-content:center; padding:6px; border-radius:12px; background:#fff; }
.sticker-grid img { width:48px; height:48px; object-fit:contain; }
.more-panel { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; max-height:148px; overflow-y:auto; }
.more-panel button { min-height:44px; border-radius:14px; background:#fff; color:#111; font-size:11px; }
.quick-card-panel { display:grid; grid-template-columns:repeat(2,1fr); gap:7px; max-height:176px; overflow-y:auto; }
.quick-card-panel button { min-height:52px; padding:8px; border-radius:15px; background:#fff; color:#111; text-align:left; box-shadow:0 5px 12px rgba(0,0,0,.04); }
.quick-card-panel span { display:block; font-size:12px; font-weight:800; }
.quick-card-panel small { display:block; margin-top:4px; color:#777; font-size:10px; line-height:1.3; }
.interaction-panel button:active, .mood-select-panel button:active { transform:scale(.98); }
.mood-select-panel button { background:#fffdf8; }
.speech-draft span { display:block; margin-bottom:6px; font-size:11px; color:#d71920; }
.speech-draft textarea { width:100%; box-sizing:border-box; }
.speech-draft div { display:flex; justify-content:flex-end; gap:6px; margin-top:6px; }
.speech-draft button { padding:7px 10px; border-radius:12px; background:#111; color:#fff; }
.modal-mask { position:absolute; inset:0; z-index:30; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(0,0,0,.55); animation:fade-in .18s ease both; }
.modal-card { width:100%; max-height:640px; overflow-y:auto; padding:16px; border-radius:24px; background:#fff; color:#111; box-shadow:0 18px 50px rgba(0,0,0,.28); animation:modal-in .22s cubic-bezier(.2,.9,.2,1) both; }
.inspect-detail-modal { background:#fffdf9; }
.modal-card header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.modal-card h2 { margin:0; font-size:18px; }
.modal-card header button { width:30px; height:30px; border-radius:50%; background:#111; color:#fff; }
.modal-card label { display:flex; flex-direction:column; gap:6px; margin:10px 0; font-size:12px; color:#555; }
.modal-card input, .modal-card textarea, .modal-card select { box-sizing:border-box; width:100%; border:1px solid #ddd; border-radius:13px; padding:10px; outline:0; background:#fafafa; font:inherit; color:#111; }
.modal-card textarea { min-height:90px; resize:vertical; }
.share-preview { margin:0 0 10px; padding:10px; border-radius:14px; background:#f5f5f5; color:#555; font-size:12px; line-height:1.45; }
.share-list { display:flex; flex-direction:column; gap:7px; max-height:360px; overflow-y:auto; }
.share-list button { display:flex; align-items:center; gap:10px; width:100%; padding:8px; border-radius:14px; background:#fafafa; color:#111; text-align:left; }
.share-list button:active { background:#eee; }
.avatar-editor { display:flex; align-items:center; gap:12px; margin:4px 0 12px; }
.avatar-editor.compact { margin:0; }
.avatar-editor button { padding:8px 12px; border-radius:12px; background:#111; color:#fff; }
.avatar-preview { width:58px; height:58px; border-radius:13px; }
.role-shortcut-avatar { flex:0 0 auto; width:30px; height:30px; border-radius:7px; }
.conversation-avatar, .message-avatar, .avatar-preview, .role-shortcut-avatar, .user-avatar { display:flex; align-items:center; justify-content:center; overflow:hidden; background:#111; background-size:cover; background-position:center; color:#fff; font-weight:750; box-shadow:inset 0 0 0 1px rgba(0,0,0,.06); }
.hidden-file { display:none; }
.setting-section { margin:10px 0; padding:10px; border:1px solid #eee; border-radius:16px; background:#fafafa; }
.setting-toggle { width:100%; padding:8px 10px; border-radius:12px; background:#111; color:#fff; text-align:left; }
.mood-panel p, .context-preview p { margin:8px 0 0; color:#555; font-size:12px; line-height:1.45; }
.mood-panel strong, .context-preview strong { color:#111; margin-right:6px; }
.context-preview { max-height:220px; overflow:auto; padding-right:4px; }
.member-manage-list { max-height:210px; overflow:auto; margin-top:8px; }
.member-manage-list label { display:grid; grid-template-columns:auto 1fr 56px; align-items:center; gap:8px; }
.frequency-input { padding:6px !important; }
.switch-row, .member-row { flex-direction:row !important; align-items:center; justify-content:space-between; }
.switch-row input, .member-row input { width:auto; }
.member-box { max-height:230px; overflow-y:auto; border:1px solid #eee; border-radius:16px; padding:6px; }
.member-row { justify-content:flex-start !important; gap:9px !important; margin:5px 0 !important; color:#111 !important; }
.modal-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; margin-top:12px; }
.modal-actions .danger { background:#d71920; }
@keyframes screen-rise { from { opacity:0; transform:translateY(18px) scale(.985); } to { opacity:1; transform:none; } }
@keyframes chat-slide { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:none; } }
@keyframes list-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
@keyframes message-in { from { opacity:0; transform:translateY(8px) scale(.98); } to { opacity:1; transform:none; } }
@keyframes gift-pop { 0% { transform:scale(1); } 45% { transform:scale(1.08) translateY(-2px); } 100% { transform:scale(1); } }
@keyframes menu-pop { from { opacity:0; transform:translateY(-4px) scale(.96); } to { opacity:1; transform:none; } }
@keyframes modal-in { from { opacity:0; transform:translateY(18px) scale(.96); } to { opacity:1; transform:none; } }
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }
</style>
