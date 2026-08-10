import {
  usePhoneStore,
  type PhonePreviewSessionRegistration,
  type PhonePreviewSessionStatus,
} from '@/store/phone';
import { onScopeDispose } from 'vue';

export interface PreviewSessionOptions {
  appId: string;
  getStatus: () => null | PhonePreviewSessionStatus;
  page: string;
}

export function usePreviewSession(options: PreviewSessionOptions) {
  const phone = usePhoneStore();
  const stop = phone.registerPreviewSession({
    appId: options.appId,
    getStatus: options.getStatus,
    page: options.page,
  } satisfies PhonePreviewSessionRegistration);
  onScopeDispose(stop);
  return { stop };
}
