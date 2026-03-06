import { useState } from 'react'

const ChatWidget = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai' as const,
      content: '안녕하세요! 맛집과 술집 추천을 도와드릴까요? 원하시는 장소나 스타일을 말씀해 주세요.',
    },
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return

    // 사용자 메시지 추가
    const userMessage = {
      id: messages.length + 1,
      type: 'user' as const,
      content: input,
    }
    setMessages([...messages, userMessage])

    // TODO: AI 응답 로직 구현
    setTimeout(() => {
      const aiMessage = {
        id: messages.length + 2,
        type: 'ai' as const,
        content: '추천 장소를 찾았습니다! 지도를 확인해보세요.',
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 1000)

    setInput('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <aside className="w-[400px] h-full flex flex-col bg-white dark:bg-slate-900 shadow-2xl z-40 relative border-r border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-primary/5">
        <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-primary">맛따라 술따라</span>
          <span className="text-sm font-normal text-slate-500">AI 플래너</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">무엇을 도와드릴까요?</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === 'user' ? 'flex-row-reverse' : ''
            } max-w-[85%] ${message.type === 'user' ? 'ml-auto' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            {message.type === 'ai' && (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex-shrink-0 flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  robot_2
                </span>
              </div>
            )}
            <div
              className={`rounded-2xl p-4 shadow-sm ${
                message.type === 'ai'
                  ? 'bg-white dark:bg-slate-800 rounded-tl-none border border-slate-200 dark:border-slate-700'
                  : 'bg-gradient-to-br from-primary to-orange-600 text-white rounded-tr-none shadow-lg shadow-primary/30'
              }`}
            >
              <p className={`text-sm leading-relaxed ${
                message.type === 'ai' ? 'text-slate-700 dark:text-slate-300' : 'text-white'
              }`}>
                {message.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-2 resize-none max-h-32 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
            placeholder="맛집 추천에 대해 물어보세요..."
            rows={1}
          />
          <div className="flex items-center gap-1 pb-1">
            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-all">
              <span className="material-symbols-outlined text-xl">attach_file</span>
            </button>
            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-all">
              <span className="material-symbols-outlined text-xl">mic</span>
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2.5 bg-gradient-to-br from-primary to-orange-600 text-white rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                send
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default ChatWidget
