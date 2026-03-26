import { useState, useEffect, useRef } from 'react'
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
  const { user } = useAuthStore()
  const [sessionId, setSessionId] = useState<string>('')
  const [input, setInput] = useState('')
  const [isSessionListOpen, setIsSessionListOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitializedSessionRef = useRef(false)

  const { data: sessionsData } = useChatSessions({ size: 20 })
  const sessions: ChatSession[] = sessionsData?.content || []

  const createSessionMutation = useCreateSession()

  useEffect(() => {
    if (!sessionId && user && !createSessionMutation.isPending && !hasInitializedSessionRef.current) {
      hasInitializedSessionRef.current = true
      createSessionMutation.mutate(
        { title: '새 대화' },
        {
          onSuccess: (data) => {
            setSessionId(data.sessionId)
          },
        }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, user])

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

  const { data: messagesData, isLoading: isLoadingMessages } = useChatMessages({
    sessionId,
    page: 1,
    size: 50,
  })

  const messages: ChatMessage[] = messagesData?.content || []

  const clearAiRecommendedPlaces = useChatMapStore((s) => s.clearAiRecommendedPlaces)
  const prevSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId) {
      clearAiRecommendedPlaces()
      prevSessionIdRef.current = sessionId || null
    }
  }, [sessionId, clearAiRecommendedPlaces])

  /** SSE(ai_response) → GET /api/v1/places/recommend 로 추천 장소 동기화 */
  useChatSessionSse(sessionId, !!user && !!sessionId)

  const sendMessageMutation = useSendMessage()

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return

    try {
      await sendMessageMutation.mutateAsync({
        sessionId,
        content: input.trim(),
      })
      setInput('')
    } catch (error) {
      console.error('메시지 전송 실패:', error)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        {isLoadingMessages && messages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <p className="text-slate-500">메시지를 불러오는 중...</p>
          </div>
        )}
        {!isLoadingMessages && messages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <p className="text-slate-500">대화를 시작해보세요!</p>
          </div>
        )}
        {messages.map((message) => {
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
