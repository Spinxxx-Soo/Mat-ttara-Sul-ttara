import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChatMessages, useSendMessage, useCreateSession, useChatSessions } from '@/hooks/queries/chat/useChat'
import { useChatSessionSse } from '@/hooks/useChatSessionSse'
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
  const shouldDebug = import.meta.env.DEV
  const debugLog = (...args: unknown[]) => {
    if (shouldDebug) {
      console.log('[chat-widget]', ...args)
    }
  }

  // 세션 목록 조회 (상단 드롭다운용)
  const { data: sessionsData } = useChatSessions({ size: 20 })
  const sessions: ChatSession[] = sessionsData?.content || []

  // 세션 생성 (최초 1회 + 새 대화 시작)
  const createSessionMutation = useCreateSession()

  useEffect(() => {
    debugLog('render', {
      embedded,
      isOpen,
      sessionId,
      sessionsLength: sessions.length,
      userId: user?.userId ?? null,
      createSessionPending: createSessionMutation.isPending,
    })
  }, [embedded, isOpen, sessionId, sessions.length, user?.userId, createSessionMutation.isPending])

  useEffect(() => {
    if (embedded && !isOpen) {
      setIsOpen(true)
    }
  }, [embedded, isOpen])

  useEffect(() => {
    // 기존 세션이 있으면 우선 최신 세션을 선택해 즉시 메시지 렌더링
    if (isOpen && !sessionId && sessions.length > 0) {
      setSessionId(sessions[0].sessionId)
      debugLog('restore latest session', sessions[0].sessionId)
    }
  }, [isOpen, sessionId, sessions])

  useEffect(() => {
    // 세션이 없고 로그인된 상태이며 챗봇이 열렸을 때 새 대화 세션 생성
    if (
      isOpen &&
      !sessionId &&
      sessions.length === 0 &&
      user &&
      !createSessionMutation.isPending &&
      !hasInitializedSessionRef.current
    ) {
      hasInitializedSessionRef.current = true
      createSessionMutation.mutate(
        { title: '새 대화' },
        {
          onSuccess: (data) => {
            setSessionId(data.sessionId)
            debugLog('create session success', data.sessionId)
          },
          onError: (error) => {
            hasInitializedSessionRef.current = false
            console.error('[chat-widget] create session failed', error)
          },
        }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sessionId, user, sessions.length])

  const handleNewSession = () => {
    if (createSessionMutation.isPending) return

    createSessionMutation.mutate(
      { title: '새 대화' },
      {
        onSuccess: (data) => {
          setSessionId(data.sessionId)
          setIsSessionListOpen(false)
        },
      }
    )
  }

  const handleSelectSession = (id: string) => {
    setSessionId(id)
    setIsSessionListOpen(false)
  }

  // 메시지 기록 조회
  const { data: messagesData, isLoading: isLoadingMessages } = useChatMessages({
    sessionId,
    page: 1,
    size: 50, // 최근 50개 메시지
  })

  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      return
    }
    setMessages(messagesData?.content || [])
  }, [sessionId, messagesData])

  useEffect(() => {
    debugLog('messages state', {
      sessionId,
      isLoadingMessages,
      messagesLength: messages.length,
      firstMessageId: messages[0]?.messageId ?? null,
    })
  }, [sessionId, isLoadingMessages, messages])

  // 메시지 전송
  const sendMessageMutation = useSendMessage()
  const isLoading = createSessionMutation.isPending || isLoadingMessages
  const isSending = sendMessageMutation.isPending
  // 현재는 스트리밍 상태를 별도 state로 관리하지 않음(연결 기반 실시간 수신)
  const isStreaming = false
  const selectedPlaceId: number | null = null
  const selectedPlace: unknown = null
  const sendDisabledReasons = {
    emptyInput: !input.trim(),
    missingSessionId: !sessionId,
    isLoading,
    isSending,
    isStreaming,
  }
  // 최소 조건: 텍스트 + 세션ID만 있으면 전송 가능
  const isSendDisabled = sendDisabledReasons.emptyInput || sendDisabledReasons.missingSessionId || isSending

  const ensureSessionId = async (): Promise<string | null> => {
    if (sessionId) return sessionId

    if (sessions.length > 0) {
      const restored = sessions[0].sessionId
      setSessionId(restored)
      return restored
    }

    try {
      const created = await createSessionMutation.mutateAsync({ title: '새 대화' })
      setSessionId(created.sessionId)
      return created.sessionId
    } catch (error) {
      console.error('메시지 전송 전 세션 생성 실패:', error)
      return null
    }
  }

  const handleIncomingMessage = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      if (String(incoming.sessionId ?? '') !== String(sessionId ?? '')) {
        return prev
      }

      const exists = prev.some((m) => m.messageId === incoming.messageId)
      if (exists) {
        return prev.map((m) => (m.messageId === incoming.messageId ? { ...m, ...incoming } : m))
      }
      return [...prev, incoming]
    })
  }, [sessionId])

  // AI 응답(SSE) 구독:
  // - `chat_message`, `ai_response` 이벤트 수신 시 로컬 messages 누적
  // - 추천 장소도 같이 동기화
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
      setInput('')
    } catch (error) {
      console.error('메시지 전송 실패:', error)
    }
  }

  // 메시지가 업데이트되면 스크롤을 맨 아래로
  useEffect(() => {
    if (!shouldDebug) return
    console.log('[chat-widget] send-button debug', {
      input,
      sessionId,
      selectedPlace,
      selectedPlaceId,
      isLoading,
      isSending,
      isStreaming,
      disabled: isSendDisabled,
      disabledReasons: sendDisabledReasons,
    })
  }, [
    input,
    sessionId,
    selectedPlace,
    selectedPlaceId,
    isLoading,
    isSending,
    isStreaming,
    isSendDisabled,
    shouldDebug,
  ])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

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
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                새 대화
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 text-sm">
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
                <div key={message.messageId} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} max-w-[85%] ${isUser ? 'ml-auto' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  {!isUser && (
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex-shrink-0 flex items-center justify-center text-white shadow-md">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>robot_2</span>
                    </div>
                  )}
                  <div className={`rounded-2xl p-3.5 shadow-sm ${!isUser ? 'bg-white dark:bg-slate-800 rounded-tl-none border border-slate-200 dark:border-slate-700' : 'bg-gradient-to-br from-primary to-orange-600 text-white rounded-tr-none shadow-md shadow-primary/20'}`}>
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
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>robot_2</span>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="text-slate-500">입력 중...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
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
