import { useMemo, useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChatMapStore } from '@/stores/chatMapStore'
import { useChatSessionSse } from '@/hooks/useChatSessionSse'
import { useChatMessages, useSendMessage, useCreateSession, useChatSessions } from '@/hooks/queries/chat/useChat'
import type { ChatMessage, ChatSession } from '@/types/api'

/**
 * 메인 레이아웃 왼쪽 패널(아이콘 사이드바 옆)에 고정되는 챗봇.
 * 부모는 `aside`에서 높이·너비를 잡습니다 (`min-h-0` 필수).
 */
const ChatWidget = () => {
  const { isLoggedIn } = useAuthStore()
  const [sessionId, setSessionId] = useState<string>('')
  const [input, setInput] = useState('')
  const [isSessionListOpen, setIsSessionListOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitializedSessionRef = useRef(false)
  const [lastSessionCreateError, setLastSessionCreateError] = useState<string | null>(null)
  const [lastSendError, setLastSendError] = useState<string | null>(null)

  const { data: sessionsData } = useChatSessions({ size: 20 })
  const sessions: ChatSession[] = sessionsData?.content || []

  const createSessionMutation = useCreateSession()

  // 세션 생성 요청이 "pending에서 끝나지 않는" 상태(네트워크/환경 문제)가 종종 발생해
  // 개발 단계에서 원인 파악이 쉽도록 타임아웃 감지 후 재시도 가능 상태로 복구합니다.
  useEffect(() => {
    if (!createSessionMutation.isPending) return

    const timeoutMs = 12_000
    const t = window.setTimeout(() => {
      if (!createSessionMutation.isPending) return
      setLastSessionCreateError(
        `세션 생성 요청이 ${Math.round(timeoutMs / 1000)}초 이상 지연되고 있습니다. (Network에서 POST /api/v1/chat/sessions 상태 확인)`
      )
      hasInitializedSessionRef.current = false
      createSessionMutation.reset()
    }, timeoutMs)

    return () => {
      window.clearTimeout(t)
    }
  }, [createSessionMutation.isPending, createSessionMutation])

  useEffect(() => {
    // 로그인 직후 user 동기화가 늦게 도착할 수 있으므로,
    // 세션 생성은 user 유무가 아니라 isLoggedIn(=토큰 존재) 기준으로 수행합니다.
    if (!sessionId && isLoggedIn && !createSessionMutation.isPending && !hasInitializedSessionRef.current) {
      hasInitializedSessionRef.current = true
      setLastSessionCreateError(null)
      createSessionMutation.mutate(
        { title: '새 대화' },
        {
          onSuccess: (data) => {
            const raw = (data as unknown as { sessionId?: unknown; session_id?: unknown; id?: unknown }).sessionId
              ?? (data as unknown as { sessionId?: unknown; session_id?: unknown; id?: unknown }).session_id
              ?? (data as unknown as { sessionId?: unknown; session_id?: unknown; id?: unknown }).id

            if (raw == null || String(raw).trim() === '') {
              setLastSessionCreateError('세션 생성 응답에 sessionId가 없습니다.')
              hasInitializedSessionRef.current = false
              return
            }

            setSessionId(String(raw))
          },
          onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : '세션 생성에 실패했습니다.'
            setLastSessionCreateError(message)
            // 다음 렌더에서 재시도 가능하도록 풀어줌
            hasInitializedSessionRef.current = false
          },
        }
      )
    }
  }, [sessionId, isLoggedIn, createSessionMutation])

  const handleNewSession = () => {
    if (createSessionMutation.isPending) return

    setLastSessionCreateError(null)
    createSessionMutation.mutate(
      { title: '새 대화' },
      {
        onSuccess: (data) => {
          const raw = (data as unknown as { sessionId?: unknown; session_id?: unknown; id?: unknown }).sessionId
            ?? (data as unknown as { sessionId?: unknown; session_id?: unknown; id?: unknown }).session_id
            ?? (data as unknown as { sessionId?: unknown; session_id?: unknown; id?: unknown }).id

          if (raw == null || String(raw).trim() === '') {
            setLastSessionCreateError('세션 생성 응답에 sessionId가 없습니다.')
            return
          }

          setSessionId(String(raw))
          setIsSessionListOpen(false)
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : '세션 생성에 실패했습니다.'
          setLastSessionCreateError(message)
        },
      }
    )
  }

  const handleSelectSession = (id: string) => {
    setSessionId(id)
    setIsSessionListOpen(false)
  }

  const { data: messagesData, isLoading: isLoadingMessages } = useChatMessages({
    sessionId,
    page: 1,
    size: 50,
  })

  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([])
  useEffect(() => {
    if (!messagesData?.content) {
      setDisplayMessages([])
      return
    }
    setDisplayMessages([...messagesData.content].sort((a, b) => a.messageId - b.messageId))
  }, [messagesData, sessionId])

  const clearAiRecommendedPlaces = useChatMapStore((s) => s.clearAiRecommendedPlaces)
  const prevSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId) {
      clearAiRecommendedPlaces()
      prevSessionIdRef.current = sessionId || null
    }
  }, [sessionId, clearAiRecommendedPlaces])

  /** SSE(ai_response) → GET /api/v1/places/recommend 로 추천 장소 동기화 */
  useChatSessionSse(sessionId, isLoggedIn && !!sessionId)

  const sendMessageMutation = useSendMessage()

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return

    try {
      setLastSendError(null)
      const sent = await sendMessageMutation.mutateAsync({
        sessionId,
        content: input.trim(),
      })
      setDisplayMessages((prev) => {
        if (prev.some((m) => m.messageId === sent.messageId)) return prev
        return [...prev, sent].sort((a, b) => a.messageId - b.messageId)
      })
      setInput('')
    } catch (error) {
      const message = error instanceof Error ? error.message : '메시지 전송에 실패했습니다.'
      setLastSendError(message)
      console.error('메시지 전송 실패:', error)
    }
  }

  const sendDisabledReason = useMemo(() => {
    if (!isLoggedIn) return '로그인이 필요합니다.'
    if (createSessionMutation.isPending) return '세션을 준비하는 중입니다...'
    if (!sessionId) return '세션을 생성하지 못했습니다. (상단 “새 대화”를 눌러 재시도)'
    if (!input.trim()) return '메시지를 입력해주세요.'
    if (sendMessageMutation.isPending) return '메시지 전송 중입니다...'
    return null
  }, [isLoggedIn, sessionId, input, createSessionMutation.isPending, sendMessageMutation.isPending])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="shrink-0 p-5 border-b border-primary/10 bg-white dark:bg-slate-900 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span className="text-primary">맛따라 술따라</span>
            <span className="text-sm font-normal text-slate-500">AI 플래너</span>
          </h1>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSessionListOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            >
              <span className="material-symbols-outlined text-sm">schedule</span>
              이전 대화
              <span className="material-symbols-outlined text-xs">
                {isSessionListOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {isSessionListOpen && (
              <div className="relative">
                <div className="absolute left-0 mt-2 w-64 max-h-64 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">이전 대화</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">총 {sessions.length}개</span>
                  </div>
                  {sessions.length === 0 && (
                    <div className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500 text-center">
                      아직 저장된 대화가 없습니다.
                    </div>
                  )}
                  {sessions.map((session) => (
                    <button
                      key={session.sessionId}
                      type="button"
                      onClick={() => handleSelectSession(session.sessionId)}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors ${
                        session.sessionId === sessionId ? 'bg-primary/5 dark:bg-primary/15' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700 dark:text-slate-100 truncate">
                          {session.title || '제목 없는 대화'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        <span>{session.lastMessageAt || session.createdAt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleNewSession}
            disabled={createSessionMutation.isPending}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              add
            </span>
            새 대화
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 text-sm">
        {isLoadingMessages && displayMessages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <p className="text-slate-500">메시지를 불러오는 중...</p>
          </div>
        )}
        {!isLoadingMessages && displayMessages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <p className="text-slate-500">대화를 시작해보세요!</p>
          </div>
        )}
        {displayMessages.map((message) => {
          const isUser = message.role === 'USER'
          return (
            <div
              key={message.messageId}
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} max-w-[85%] ${isUser ? 'ml-auto' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {!isUser && (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex-shrink-0 flex items-center justify-center text-white shadow-md">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    robot_2
                  </span>
                </div>
              )}
              <div
                className={`rounded-2xl p-3.5 shadow-sm ${
                  !isUser
                    ? 'bg-white dark:bg-slate-800 rounded-tl-none border border-slate-200 dark:border-slate-700'
                    : 'bg-gradient-to-br from-primary to-orange-600 text-white rounded-tr-none shadow-md shadow-primary/20'
                }`}
              >
                <p className={`leading-relaxed ${!isUser ? 'text-slate-700 dark:text-slate-300' : 'text-white'}`}>
                  {message.content}
                </p>
              </div>
            </div>
          )
        })}
        {sendMessageMutation.isPending && (
          <div className="flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex-shrink-0 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                robot_2
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 p-3.5">
              <p className="text-slate-500">입력 중...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {(sendDisabledReason || lastSessionCreateError || lastSendError) && (
          <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {sendDisabledReason && (
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-slate-400">info</span>
                <span>{sendDisabledReason}</span>
              </div>
            )}
            {import.meta.env.DEV && (
              <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                debug: isLoggedIn={String(isLoggedIn)} / sessionId={sessionId ? sessionId : '(empty)'} / createPending=
                {String(createSessionMutation.isPending)} / sendPending={String(sendMessageMutation.isPending)}
              </div>
            )}
            {lastSessionCreateError && (
              <div className="mt-1 flex items-start gap-2 text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span className="flex-1">세션 생성 실패: {lastSessionCreateError}</span>
                <button
                  type="button"
                  onClick={() => {
                    hasInitializedSessionRef.current = false
                    createSessionMutation.reset()
                    handleNewSession()
                  }}
                  className="shrink-0 rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  재시도
                </button>
              </div>
            )}
            {lastSendError && (
              <div className="mt-1 flex items-start gap-2 text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>전송 실패: {lastSendError}</span>
              </div>
            )}
          </div>
        )}
        <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1.5 px-2 resize-none max-h-32 placeholder:text-slate-400 text-slate-900 outline-none dark:text-slate-100"
            placeholder="맛집 추천에 대해 물어보세요..."
            rows={1}
          />
          <div className="flex items-center gap-1 pb-1">
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || !sessionId || sendMessageMutation.isPending}
              className="p-2 bg-gradient-to-br from-primary to-orange-600 text-white rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                send
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatWidget
