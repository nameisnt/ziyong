import { ChatInsertSettingsSchema, useChatInsertStore } from '@/apps/chat-insert/store';

type ChatInsertVisualScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

type VisualChatMessage = {
  is_system?: boolean;
  is_user?: boolean;
  mes: string;
  name?: string;
};

type RuntimeCreateInput = {
  is_hidden?: boolean;
  message: string;
  role: 'assistant' | 'system' | 'user';
};

type RuntimeTarget = { insert_before?: number | 'end'; refresh?: string };
type RuntimeSetInput = { message: string; message_id: number };

function setControlValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  control.value = value;
  control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

async function confirmChatInsertWrite(context: ChatInsertVisualScenarioContext) {
  if (!(await context.waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-action'))))) {
    throw new Error('Chat insert write confirmation is missing');
  }
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes('写入'),
  );
  if (!action) throw new Error('Chat insert confirmation has no write action');
  action.click();
  await context.waitForPaint();
}

function restoreRuntimeFunction(runtime: Record<string, unknown>, key: string, previous: unknown) {
  if (typeof previous === 'undefined') delete runtime[key];
  else runtime[key] = previous;
}

export async function applyChatInsertVisualScenario(name: string, context: ChatInsertVisualScenarioContext) {
  if (name !== 'chat-insert-operations') return false;

  const runtime = globalThis as unknown as Record<string, unknown> & {
    SillyTavern: { chat: VisualChatMessage[] };
  };
  const chatInsert = useChatInsertStore();
  const initialSettings = ChatInsertSettingsSchema.parse(chatInsert.settings);
  const initialChat = structuredClone(runtime.SillyTavern.chat);
  const previousCreate = runtime.createChatMessages;
  const previousSet = runtime.setChatMessages;
  const previousSave = runtime.saveChat;
  const previousLastId = runtime.getLastMessageId;
  const createCalls: Array<{ messages: RuntimeCreateInput[]; options?: RuntimeTarget }> = [];
  const setCalls: Array<{ messages: RuntimeSetInput[]; options?: { refresh?: string } }> = [];
  let saveCount = 0;

  runtime.createChatMessages = async (messages: RuntimeCreateInput[], options?: RuntimeTarget) => {
    createCalls.push({ messages: structuredClone(messages), options: structuredClone(options) });
    const converted = messages.map(message => ({
      is_system: Boolean(message.is_hidden || message.role === 'system'),
      is_user: message.role === 'user',
      mes: message.message,
      name: message.role === 'user' ? 'User' : 'Assistant',
    }));
    if (typeof options?.insert_before === 'number') runtime.SillyTavern.chat.splice(options.insert_before, 0, ...converted);
    else runtime.SillyTavern.chat.push(...converted);
  };
  runtime.setChatMessages = async (messages: RuntimeSetInput[], options?: { refresh?: string }) => {
    setCalls.push({ messages: structuredClone(messages), options: structuredClone(options) });
    messages.forEach(message => {
      const target = runtime.SillyTavern.chat[message.message_id];
      if (target) target.mes = message.message;
    });
  };
  runtime.saveChat = async () => {
    saveCount += 1;
  };
  runtime.getLastMessageId = () => runtime.SillyTavern.chat.length - 1;

  const modes = ['new-end', 'new-before', 'append-last', 'append-message'] as const;
  try {
    for (const mode of modes) {
      runtime.SillyTavern.chat.splice(0, runtime.SillyTavern.chat.length, ...structuredClone(initialChat));
      context.resetPhoneToRoute('chat-insert', 'root', '楼层插入');
      await context.waitForPaint();

      const modeSelect = document.querySelector<HTMLSelectElement>('.pc-chat-insert-page > .pc-page-section .pc-select');
      const template = document.querySelector<HTMLTextAreaElement>('.pc-chat-insert-page textarea.pc-area');
      if (!modeSelect || !template) throw new Error('Chat insert mode or template control is missing');
      setControlValue(modeSelect, mode);
      await context.waitForPaint();

      if (mode === 'new-before' || mode === 'append-message') {
        const target = document.querySelector<HTMLInputElement>('.pc-chat-insert-page input[type="number"]');
        if (!target) throw new Error(`Chat insert target field is missing for ${mode}`);
        setControlValue(target, '1');
      }
      setControlValue(template, `隔离写入内容 ${mode}`);
      await context.waitForPaint();

      const submit = [...document.querySelectorAll<HTMLButtonElement>('.pc-insert-actions button')].find(button =>
        button.textContent?.includes('确认写入'),
      );
      if (!submit) throw new Error('Chat insert submit action is missing');
      submit.click();
      await confirmChatInsertWrite(context);
      if (!(await context.waitForCondition(() => saveCount === modes.indexOf(mode) + 1))) {
        throw new Error(`Chat insert ${mode} did not reach saveChat`);
      }
    }

    if (
      createCalls.length !== 2 ||
      createCalls[0]?.options?.insert_before !== 'end' ||
      createCalls[1]?.options?.insert_before !== 1 ||
      !createCalls.every(call => call.options?.refresh === 'affected')
    ) {
      throw new Error(`Chat insert create modes emitted incorrect runtime arguments: ${JSON.stringify(createCalls)}`);
    }
    if (
      setCalls.length !== 2 ||
      setCalls[0]?.messages[0]?.message_id !== initialChat.length - 1 ||
      setCalls[1]?.messages[0]?.message_id !== 1 ||
      !setCalls.every(call => call.options?.refresh === 'affected')
    ) {
      throw new Error(`Chat insert append modes emitted incorrect runtime arguments: ${JSON.stringify(setCalls)}`);
    }
    if (
      !createCalls[0]?.messages[0]?.message.includes('new-end') ||
      !createCalls[1]?.messages[0]?.message.includes('new-before') ||
      !setCalls[0]?.messages[0]?.message.includes('append-last') ||
      !setCalls[1]?.messages[0]?.message.includes('append-message') ||
      saveCount !== 4
    ) {
      throw new Error('Chat insert mode content or save count did not remain isolated');
    }
  } finally {
    runtime.SillyTavern.chat.splice(0, runtime.SillyTavern.chat.length, ...initialChat);
    Object.assign(chatInsert.settings, ChatInsertSettingsSchema.parse(initialSettings));
    restoreRuntimeFunction(runtime, 'createChatMessages', previousCreate);
    restoreRuntimeFunction(runtime, 'setChatMessages', previousSet);
    restoreRuntimeFunction(runtime, 'saveChat', previousSave);
    restoreRuntimeFunction(runtime, 'getLastMessageId', previousLastId);
  }

  return true;
}
