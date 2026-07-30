declare const hljs: typeof import('highlight.js').default;
declare const Popper: typeof import('@popperjs/core');

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
  export const event_types: Record<string, string>;
  export const eventSource: {
    makeFirst: (event: string, listener: (...args: unknown[]) => void) => () => void;
    on: (event: string, listener: (...args: unknown[]) => void) => () => void;
    removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
  };
  export function getRequestHeaders(): Record<string, string>;
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
