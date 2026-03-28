import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { useChatMapStore } from '@/stores/chatMapStore'
import { useChatSessionStore } from '@/stores/chatSessionStore'
import { useChatSessionSse } from '@/hooks/useChatSessionSse'
import { useChatMessages, useSendMessage, useCreateSession, useChatSessions, useDeleteSession } from '@/hooks/queries/chat/useChat'
import { extractApiErrorMessage } from '@/lib/apiUtils'
import { stripLegacyPlacesJsonSuffix } from '@/lib/chatDisplay'
import type { ChatMessage, ChatSession } from '@/types/api'

interface ChatWidgetProps {
  embedded?: boolean
}

const ChatWidget = ({ embedded = true }: ChatWidgetProps) => {
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(embedded)
  const [sessionId, setSessionId] = useState<string>('')
  const [input, setInput] = useState('')
  const [isSessionListOpen, setIsSessionListOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitializedSessionRef = useRef(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const toSessionId = (value: string | number) => String(value)

  const setActiveSessionId = useChatSessionStore((s) => s.setActiveSessionId)
  const markUserMessageSent = useChatSessionStore((s) => s.markUserMessageSent)
  /** Main(지도)과 쿼리 키가 같은 틱에 맞도록 — useEffect보다 먼저 스토어 반영 */
  useLayoutEffect(() => {
    setActiveSessionId(sessionId)
  }, [sessionId, setActiveSessionId])

  // 세션 목록 조회
  const { data: sessionsData } = useChatSessions({ size: 20 })
  const sessions: ChatSession[] = useMemo(() => sessionsData?.content ?? [], [sessionsData?.content])

  // 세션 생성/삭제
  const createSessionMutation = useCreateSession()
  const deleteSessionMutation = useDeleteSession()

  const handleNewSession = () => {
    if (createSessionMutation.isPending) return

    createSessionMutation.mutate(
      { title: '새 대화' },
      {
      onSuccess: (data) => {
        const id = toSessionId(data.sessionId)
        setSessionId(id)
        useChatSessionStore.getState().setActiveSessionId(id)
        setIsSessionListOpen(false)
      },
      }
    )
  }

  const handleSelectSession = (id: string) => {
    const sid = toSessionId(id)
    setSessionId(sid)
    useChatSessionStore.getState().setActiveSessionId(sid)
    setIsSessionListOpen(false)
  }

  const handleDeleteSession = (id: string) => {
    if (deleteSessionMutation.isPending) return
    if (!window.confirm('이 대화를 삭제하시겠습니까?')) return

    const targetSessionId = toSessionId(id)
    const isCurrentSession = sessionId === targetSessionId
    const nextSession = sessions.find((session) => toSessionId(session.sessionId) !== targetSessionId)

    deleteSessionMutation.mutate(targetSessionId, {
      onSuccess: () => {
        toast.success('대화를 삭제했습니다.')
        setIsSessionListOpen(false)

        if (isCurrentSession) {
          const nextSessionId = nextSession ? toSessionId(nextSession.sessionId) : ''
          setSessionId(nextSessionId)
          useChatSessionStore.getState().setActiveSessionId(nextSessionId)
          setMessages([])
        }
      },
      onError: (error) => {
        toast.error(extractApiErrorMessage(error, '대화 삭제에 실패했습니다.'))
      },
    })
  }

/**
 * 1. embedded면 항상 열림 유지
 */
useEffect(() => {
  if (embedded && !isOpen) {
    setIsOpen(true)
  }
}, [embedded, isOpen])

/**
 * 2. 기존 세션 복원 (최우선)
 */
useEffect(() => {
  if (!isOpen) return
  if (sessionId) return
  if (sessions.length === 0) return

  const latest = toSessionId(sessions[0].sessionId)
  setSessionId(latest)
  useChatSessionStore.getState().setActiveSessionId(latest)
}, [isOpen, sessionId, sessions])

/**
 * 3. 세션이 없을 때만 새로 생성
 */
useEffect(() => {
  if (!isOpen) return
  if (sessionId) return
  if (sessions.length > 0) return
  if (!user) return
  if (createSessionMutation.isPending) return
  if (hasInitializedSessionRef.current) return

  hasInitializedSessionRef.current = true

  createSessionMutation.mutate(
    { title: '새 대화' },
    {
      onSuccess: (data) => {
        const id = toSessionId(data.sessionId)
        setSessionId(id)
        useChatSessionStore.getState().setActiveSessionId(id)
      },
      onError: (error) => {
        hasInitializedSessionRef.current = false
        console.error('[chat-widget] create session failed', error)
      },
    }
  )
}, [isOpen, sessionId, sessions.length, user, createSessionMutation])

  const { data: messagesData, isLoading: isLoadingMessages } = useChatMessages({
    sessionId,
    page: 0,
    size: 50,
  })

  useEffect(() => {
    setMessages([])
  }, [sessionId])

  useEffect(() => {
    if (!sessionId || !messagesData?.content) return

    setMessages((prev) => {
      const map = new Map<number, ChatMessage>()

      prev.forEach((msg) => {
        map.set(msg.messageId, msg)
      })

      messagesData.content.forEach((msg) => {
        map.set(msg.messageId, msg)
      })

      return [...map.values()].sort((a, b) => a.messageId - b.messageId)
    })
  }, [sessionId, messagesData])

  /** 서버에 이미 USER 메시지가 있으면(새로고침·세션 전환) 지도 위치 허용 플래그 동기화 */
  useEffect(() => {
    if (!sessionId || !messagesData?.content?.length) return
    const hasUser = messagesData.content.some(
      (m) => String(m.role).toUpperCase() === 'USER'
    )
    if (hasUser) markUserMessageSent(sessionId)
  }, [sessionId, messagesData?.content, markUserMessageSent])

  const clearAiRecommendedPlaces = useChatMapStore((s) => s.clearAiRecommendedPlaces)
  const prevSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId) {
      clearAiRecommendedPlaces()
      prevSessionIdRef.current = sessionId || null
    }
  }, [sessionId, clearAiRecommendedPlaces])

  const sendMessageMutation = useSendMessage()
  const isSending = sendMessageMutation.isPending
  // 최소 조건: 텍스트 + 세션ID만 있으면 전송 가능
  const isSendDisabled = !input.trim() || !sessionId || isSending

  const ensureSessionId = async (): Promise<string | null> => {
    if (sessionId) return sessionId

    if (sessions.length > 0) {
      const restored = toSessionId(sessions[0].sessionId)
      setSessionId(restored)
      useChatSessionStore.getState().setActiveSessionId(restored)
      return restored
    }

    try {
      const created = await createSessionMutation.mutateAsync({ title: '새 대화' })
      const createdSessionId = toSessionId(created.sessionId)
      setSessionId(createdSessionId)
      useChatSessionStore.getState().setActiveSessionId(createdSessionId)
      return createdSessionId
    } catch (error) {
      console.error('메시지 전송 전 세션 생성 실패:', error)
      return null
    }
  }

  const handleIncomingMessage = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      if (String(incoming.sessionId) !== String(sessionId)) {
        return prev
      }

      const exists = prev.some((m) => m.messageId === incoming.messageId)
      if (exists) return prev
      return [...prev, incoming]
    })
  }, [sessionId])

  // AI 응답(SSE) 구독:
  // - `chat_message`, `ai_response` 이벤트 수신 시 로컬 messages 누적
  // - 추천 장소는 getRecommendedPlaces로 지도에만 반영 (플랜 생성은 메인 지도에서 핀 선택 시 모달)
  useChatSessionSse(sessionId, isOpen, handleIncomingMessage)

  const handleSend = async () => {
    const content = input.trim()
    if (!content) return

    const targetSessionId = await ensureSessionId()
    if (!targetSessionId) return

    try {
      await sendMessageMutation.mutateAsync({
        sessionId: targetSessionId,
        content,
      })
      markUserMessageSent(targetSessionId)
      setInput('')
    } catch (error) {
      console.error('메시지 전송 실패:', error)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const frame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        block: 'end',
        behavior: 'auto',
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [messages, isOpen, sendMessageMutation.isPending])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={embedded ? 'h-full w-full min-h-0' : 'fixed bottom-6 right-6 z-50 flex flex-col items-end'}>
      {isOpen && (
        <aside
          className={
            embedded
              ? 'h-full min-h-0 w-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden'
              : 'w-[400px] h-[650px] max-h-[80vh] mb-4 flex flex-col bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300'
          }
        >
          {/* Header */}
          <div className="p-5 border-b border-primary/10 bg-white dark:bg-slate-900 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <span className="text-primary">맛따라 술따라</span>
                <span className="text-sm font-normal text-slate-500">AI 플래너</span>
              </h1>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="flex items-center justify-between gap-3">
              <div className="relative shrink-0">
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
                  <div className="absolute left-0 top-full z-50 mt-2 w-64 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">이전 대화</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">총 {sessions.length}개</span>
                    </div>
                    {sessions.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                        저장된 대화가 없습니다.
                      </div>
                    )}
                    {sessions.map((session) => (
                      <div
                        key={session.sessionId}
                        className={`flex items-center gap-1 px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                          session.sessionId === sessionId ? 'bg-primary/5 dark:bg-primary/15' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectSession(session.sessionId)}
                          disabled={deleteSessionMutation.isPending}
                          className="min-w-0 flex-1 px-1 py-1 text-left"
                        >
                          <div className="truncate font-medium text-slate-700 dark:text-slate-100">
                            {session.title || '제목 없는 대화'}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(session.sessionId)}
                          disabled={deleteSessionMutation.isPending}
                          aria-label={`${session.title || '제목 없는 대화'} 삭제`}
                          className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/40"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleNewSession}
                disabled={createSessionMutation.isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                새 대화
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 text-sm">
            {isLoadingMessages && messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">메시지를 불러오는 중...</p>
              </div>
            )}
            {!isLoadingMessages && messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">대화를 시작해보세요!</p>
              </div>
            )}
            {messages.map((message) => {
              const isUser = message.role === 'USER'
              return (
                <div key={message.messageId} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} max-w-[85%] ${isUser ? 'ml-auto' : ''}`}>
                  {!isUser && (
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex-shrink-0 flex items-center justify-center text-white shadow-md">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>robot_2</span>
                    </div>
                  )}
                  <div className={`rounded-2xl p-3.5 shadow-sm ${!isUser ? 'bg-white dark:bg-slate-800 rounded-tl-none border border-slate-200 dark:border-slate-700' : 'bg-gradient-to-br from-primary to-orange-600 text-white rounded-tr-none shadow-md shadow-primary/20'}`}>
                    <p
                      className={`leading-relaxed whitespace-pre-wrap ${!isUser ? 'text-slate-700 dark:text-slate-300' : 'text-white'}`}
                    >
                      {isUser ? message.content : stripLegacyPlacesJsonSuffix(message.content)}
                    </p>
                  </div>
                </div>
              )
            })}
            {sendMessageMutation.isPending && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex-shrink-0 flex items-center justify-center text-white shadow-md">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>robot_2</span>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="text-slate-500">입력 중...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} aria-hidden="true" className="h-px w-full" />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1.5 px-2 resize-none max-h-32 placeholder:text-slate-400 text-slate-900 outline-none"
                placeholder="맛집 추천에 대해 물어보세요..."
                rows={1}
              />
              <div className="flex items-center gap-1 pb-1">
                <button
                  onClick={handleSend}
                  disabled={isSendDisabled}
                  className="p-2 bg-gradient-to-br from-primary to-orange-600 text-white rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
      
      {/* Floating Action Button */}
      {!embedded && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-orange-600 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform animate-in zoom-in duration-300"
        >
          <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
        </button>
      )}
    </div>
  )
}

export default ChatWidget
