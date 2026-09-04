declare const hljs: typeof import('highlight.js').default;
declare const Popper: typeof import('@popperjs/core');
<<<<<<< HEAD

declare namespace TypeFest {
  type LiteralUnion<LiteralType, BaseType extends Primitive = string> = import('type-fest').LiteralUnion<LiteralType, BaseType>;
  type PartialDeep<T> = import('type-fest').PartialDeep<T>;
  type Primitive = import('type-fest').Primitive;
  type SetRequired<BaseType, Keys extends keyof BaseType> = import('type-fest').SetRequired<BaseType, Keys>;
}

type BluetoothLEScanFilter = Record<string, unknown>;
type BluetoothServiceUUID = string | number;
type BluetoothDevice = Record<string, unknown>;
type BluetoothRemoteGATTServer = Record<string, unknown>;

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module '@sillytavern/script' {
  export const chat: unknown[];
  export const characters: unknown[];
  export const event_types: Record<string, string>;
  export const eventSource: {
    makeFirst: (event: string, listener: (...args: unknown[]) => void) => () => void;
    on: (event: string, listener: (...args: unknown[]) => void) => () => void;
    removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
  };
  export const name1: string;
  export function getCharacters(): Promise<void>;
  export function getPastCharacterChats(characterId: number): Promise<unknown[]>;
  export function getRequestHeaders(): Record<string, string>;
  export function importCharacterChat(formData: FormData, options?: { refresh?: boolean }): Promise<string[]>;
  export function messageFormatting(...args: unknown[]): string;
  export function reloadCurrentChat(): Promise<void> | void;
  export function saveChat(): Promise<void> | void;
  export function saveChatConditional(): Promise<void> | void;
  export function saveChatDebounced(): Promise<void> | void;
  export function saveSettingsDebounced(): Promise<void> | void;
}

declare module '@sillytavern/scripts/extensions' {
  export const extension_settings: Record<string, unknown>;
}
=======
>>>>>>> a0f2d7e74fb108e07d4995dcd3d34e41d8e77f41
