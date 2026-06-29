import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, X, TrendingUp, PieChart, Landmark, ShieldCheck, PiggyBank, HelpCircle, Bot } from 'lucide-react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { useChat } from '../../hooks/useChat'

interface ChatWidgetProps {
  onClose: () => void
}

const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 680
const MIN_WIDTH = 300
const MIN_HEIGHT = 400
const MAX_WIDTH = 700
const MAX_HEIGHT = 800

const QUICK_ACTIONS = [
  { label: 'Check Investments', icon: TrendingUp },
  { label: 'Portfolio Performance', icon: PieChart },
  { label: 'Loan Eligibility', icon: Landmark },
  { label: 'Insurance Plans', icon: ShieldCheck },
  { label: 'Savings Advice', icon: PiggyBank },
  { label: 'Ask a Question', icon: HelpCircle }
]

export default function ChatWidget({ onClose }: ChatWidgetProps) {
  const { messages, isLoading, error, sendMessage, clearChat } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Resizable state
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  type Corner = 'tl' | 'tr' | 'bl' | 'br'
  const activeCorner = useRef<Corner | null>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const startSize = useRef({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Track screen size for responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Resize drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent, corner: Corner) => {
    e.preventDefault()
    activeCorner.current = corner
    startPos.current = { x: e.clientX, y: e.clientY }
    startSize.current = { ...size }
  }, [size])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!activeCorner.current) return
      
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y
      
      let dw = 0
      let dh = 0
      
      if (activeCorner.current === 'tl') { dw = -dx; dh = -dy }
      else if (activeCorner.current === 'tr') { dw = dx; dh = -dy }
      else if (activeCorner.current === 'bl') { dw = -dx; dh = dy }
      else if (activeCorner.current === 'br') { dw = dx; dh = dy }

      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startSize.current.width + dw))
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startSize.current.height + dh))
      setSize({ width: newWidth, height: newHeight })
    }
    const onMouseUp = () => { activeCorner.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.1, y: 100, x: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.1, y: 100, x: 50 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      style={{
        transformOrigin: "bottom right",
        width: isMobile ? 'calc(100vw - 2rem)' : size.width,
        height: isMobile ? 'min(550px, calc(100vh - 8rem))' : size.height,
        maxHeight: 'calc(100vh - 8rem)'
      }}
      className="bg-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.16)] border border-slate-200/60 flex flex-col overflow-hidden font-sans rounded-3xl relative"
    >
      {/* Header */}
      <div className="bg-[#0f172a] text-white p-5 pb-6 flex items-start justify-between relative shrink-0 rounded-t-[1.3rem]">
        {/* Background Graphic */}
        <div className="absolute right-0 bottom-0 opacity-40 pointer-events-none">
          <svg width="180" height="60" viewBox="0 0 180 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 50 L40 40 L70 45 L100 20 L130 35 L160 5 L175 0" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M165 5 L175 0 L175 10" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="35" y="45" width="10" height="20" fill="#3b82f6" />
            <rect x="65" y="48" width="10" height="17" fill="#3b82f6" />
            <rect x="95" y="25" width="10" height="40" fill="#3b82f6" />
            <rect x="125" y="40" width="10" height="25" fill="#3b82f6" />
            <rect x="155" y="10" width="10" height="55" fill="#3b82f6" />
          </svg>
        </div>

        <div className="flex gap-4 items-center z-10">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center border-2 border-slate-700 shadow-inner">
             <Bot size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-xl flex items-center gap-1.5 tracking-tight">
              FinAI <span className="text-blue-400">✨</span>
            </h2>
            <div className="text-[11px] !text-white mt-0.5 font-medium tracking-wide">
              Powered by SBS Financial
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online
            </div>
          </div>
        </div>

        <div className="flex gap-2 text-slate-400 z-10 pt-1">
          <button onClick={clearChat} className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors" title="Restart">
            <RefreshCw size={18} />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors" title="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 p-2 text-red-600 text-xs flex items-center justify-center gap-2 border-b border-red-100 shrink-0">
          <ShieldCheck size={14} />
          {error}
        </div>
      )}

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] chat-scroll flex flex-col relative">
        {messages.map((msg, index) => (
          <div key={index}>
            <ChatMessage role={msg.role} content={msg.content} timestamp={msg.timestamp} />
            
            {/* Quick Actions */}
            {index === 0 && messages.length === 1 && (
              <div className="grid grid-cols-2 gap-2 mt-1 mb-6 ml-[3.25rem] pr-2">
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(action.label)}
                    disabled={isLoading}
                    className="flex items-center gap-2.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm transition-all rounded-xl p-2.5 text-left group disabled:opacity-50"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                      <action.icon size={14} className="stroke-[2.5]" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 leading-tight group-hover:text-slate-800 transition-colors">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start mb-6">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mr-3 shadow-sm border border-slate-200">
               <Bot size={18} className="text-white" />
            </div>
            <div className="bg-white border border-slate-100 px-5 py-4 rounded-3xl rounded-tl-sm shadow-sm flex gap-1.5 items-center mt-0.5">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
      
      {/* Resize Handles (Desktop Only) */}
      {!isMobile && (
        <>
          {/* Top Left Resize Handle */}
          <div 
            onMouseDown={(e) => onMouseDown(e, 'tl')}
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50"
            title="Drag to resize"
          />
          
          {/* Top Right Resize Handle */}
          <div 
            onMouseDown={(e) => onMouseDown(e, 'tr')}
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-50"
            title="Drag to resize"
          />
          
          {/* Bottom Left Resize Handle */}
          <div 
            onMouseDown={(e) => onMouseDown(e, 'bl')}
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-50"
            title="Drag to resize"
          />
    
          {/* Bottom Right Resize Handle */}
          <div 
            onMouseDown={(e) => onMouseDown(e, 'br')}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-50 flex items-end justify-end p-1.5"
            title="Drag to resize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 1L9 9L1 9" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </>
      )}
    </motion.div>
  )
}
