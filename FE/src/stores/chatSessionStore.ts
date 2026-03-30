import { create } from 'zustand';

/**
 * 메인 화면 지도 등에서 현재 채팅 세션 ID가 필요할 때 사용.
 * ChatWidget이 세션을 바꿀 때마다 갱신된다.
 */
interface ChatSessionStoreState {
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  /** 이 세션에서 USER 메시지 전송에 성공함(메시지 목록 refetch 전에도 지도 → /location 허용) */
  userMessagedSessionIds: Record<string, boolean>;
  markUserMessageSent: (sessionId: string) => void;
}

export const useChatSessionStore = create<ChatSessionStoreState>((set) => ({
  activeSessionId: '',
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  userMessagedSessionIds: {},
  markUserMessageSent: (sessionId) =>
    set((s) => ({
      userMessagedSessionIds: { ...s.userMessagedSessionIds, [sessionId]: true },
    })),
}));
