"use client"

import { useCallback, useMemo, useState, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useLiveLoop } from "@/hooks/useLiveLoop"
import { useAmelieConfig } from "@/hooks/useAmelieConfig"
import { SoulTuner } from "@/components/amelie/soul-tuner"
import { MemoryPane } from "@/components/amelie/memory-pane"
import { Drawer } from "@/components/amelie/drawer"
import { Brain, Settings2 } from "lucide-react"
import {
  Orb,
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationBar,
} from "@/components/elevenlabs"

// ─── Helpers ────────────────────────────────────────────────────────────────

function toOrbState(agentState: string): null | "thinking" | "listening" | "talking" {
  switch (agentState) {
    case "thinking": return "thinking"
    case "speaking": return "talking"
    case "listening": return "listening"
    case "connected":
    case "idle": return null
    default: return null
  }
}

function toOrbColors(emotion: string | null): [string, string] {
  switch (emotion) {
    case "joy": return ["#f4c5a8", "#e8b8c4"]
    case "thoughtful": return ["#c8b8e0", "#a8c8e8"]
    case "curious": return ["#a7e5d3", "#a8c8e8"]
    default: return ["#CADCFC", "#A0B9D1"] 
  }
}

export default function AmelieHome() {
  const alignmentRef = useRef<any>(null)
  const { soul, memory, updateSoul, refreshMemory } = useAmelieConfig()
  
  const [isSoulOpen, setIsSoulOpen] = useState(false)
  const [isMemoryOpen, setIsMemoryOpen] = useState(false)
  const [isTextMode, setIsTextMode] = useState(false)
  const [inputText, setInputText] = useState("")
  const [isRebooting, setIsRebooting] = useState(false)

  const {
    agentState,
    emotion,
    activeMemoryHits,
    messages,
    isMicMuted,
    backendOnline,
    startCall,
    stopCall,
    toggleMic,
    sendText,
    getInputVolume,
    getOutputVolume,
    ensureAudioContext,
    isCallActive,
  } = useLiveLoop(
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat",
    (align) => { alignmentRef.current = align }
  )

  const handleCall = useCallback(() => {
    ensureAudioContext()
    if (isCallActive) stopCall()
    else startCall().catch(console.error)
  }, [isCallActive, startCall, stopCall, ensureAudioContext])

  const handleSoulUpdate = async (update: any) => {
    setIsRebooting(true)
    try {
      await updateSoul(update)
      await new Promise(r => setTimeout(r, 1500))
    } finally { setIsRebooting(false) }
  }

  const orbState = isRebooting ? "thinking" : toOrbState(agentState)
  const orbColors = toOrbColors(emotion)

  return (
    <main className="flex flex-col h-screen w-full bg-canvas text-ink overflow-hidden font-sans selection:bg-black/5 antialiased">
      {/* ── DRAWERS ─────────────────────────────────────────────────── */}
      <Drawer isOpen={isSoulOpen} onClose={() => setIsSoulOpen(false)} side="right">
        {soul && <SoulTuner soul={soul} onUpdate={handleSoulUpdate} />}
      </Drawer>
      <Drawer isOpen={isMemoryOpen} onClose={() => setIsMemoryOpen(false)} side="left">
        <MemoryPane memory={memory} activeHits={activeMemoryHits} />
      </Drawer>

      {/* ── CLEAN HEADER ────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-6 z-40">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl font-light tracking-tight text-ink">
            Amélie
          </h1>
          <div className={cn(
            "size-1.5 rounded-full transition-colors duration-500",
            backendOnline ? "bg-emerald-500" : "bg-red-400"
          )} />
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => { refreshMemory(); setIsMemoryOpen(true) }} 
            className="p-2 hover:bg-black/5 rounded-full transition-all opacity-40 hover:opacity-100"
          >
            <Brain className="size-4" />
          </button>
          <button 
            onClick={() => setIsSoulOpen(true)} 
            className="p-2 hover:bg-black/5 rounded-full transition-all opacity-40 hover:opacity-100"
          >
            <Settings2 className="size-4" />
          </button>
        </div>
      </header>

      {/* ── CONVERSATION STAGE ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <Conversation className="flex-1">
          <ConversationContent className="max-w-xl mx-auto py-12 px-6 flex flex-col gap-10">
            <AnimatePresence mode="popLayout" initial={false}>
              {messages.length === 0 ? (
                /* ── MINIMALIST PRESENCE ──────────────────────────── */
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-56 h-64">
                    <Orb 
                      colors={orbColors} 
                      agentState={orbState} 
                      volumeMode="manual" 
                      getInputVolume={getInputVolume} 
                      getOutputVolume={getOutputVolume} 
                    />
                  </div>
                </motion.div>
              ) : (
                /* ── CHAT THREAD ─────────────────────────────────── */
                messages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    layout
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col gap-2 w-full", 
                      msg.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "px-5 py-3 rounded-2xl text-[15px] leading-relaxed transition-all",
                      msg.role === "user" 
                        ? "bg-ink text-canvas" 
                        : "bg-black/[0.03] text-ink font-light"
                    )}>
                      {msg.content}
                    </div>
                    
                    {msg.role === "assistant" && i === messages.length - 1 && (
                      <div className="size-4 ml-1 mt-0.5 rounded-full overflow-hidden opacity-60">
                        <Orb 
                          colors={orbColors} 
                          agentState={orbState} 
                          volumeMode="manual" 
                          getInputVolume={getInputVolume} 
                          getOutputVolume={getOutputVolume} 
                        />
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </ConversationContent>
          <ConversationScrollButton className="bg-white border border-hairline shadow-sm text-ink" />
        </Conversation>
      </div>

      {/* ── CLEAN CONTROLS ───────────────────────────────────────────── */}
      <div className="px-8 pt-4 pb-10 flex flex-col items-center z-50">
        <div className="w-full max-w-xl">
          <ConversationBar
            agentState={agentState}
            isMicMuted={isMicMuted}
            isTextMode={isTextMode}
            inputText={inputText}
            setInputText={setInputText}
            setIsTextMode={setIsTextMode}
            toggleMic={toggleMic}
            handleCall={handleCall}
            onSendMessage={(msg) => { ensureAudioContext(); sendText(msg) }}
          />
        </div>
      </div>
    </main>
  )
}
