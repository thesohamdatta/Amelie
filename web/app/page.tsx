"use client"

import { useCallback, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { useLiveLoop } from "@/hooks/useLiveLoop"
import {
  Orb,
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  Message,
  MessageContent,
  ConversationBar,
  getMessagePresentation,
  Response,
  ShimmeringText,
} from "@/components/elevenlabs"

// ─── Map Amélie agent states → Orb's expected AgentState type ───────────────
function toOrbState(
  agentState: string
): null | "thinking" | "listening" | "talking" {
  switch (agentState) {
    case "thinking":
      return "thinking"
    case "speaking":
      return "talking"
    case "listening":
      return "listening"
    case "connected":
    case "idle":
      return null
    default:
      return null
  }
}

// ─── Map emotion → Soul Orb color pair (ElevenLabs Editorial Palette) ────────
function toOrbColors(emotion: string | null): [string, string] {
  switch (emotion) {
    case "joy":
      return ["#f4c5a8", "#e8b8c4"] // Peach / Rose
    case "thoughtful":
      return ["#c8b8e0", "#a8c8e8"] // Lavender / Sky
    case "curious":
      return ["#a7e5d3", "#a8c8e8"] // Mint / Sky
    default:
      return ["#f4c5a8", "#c8b8e0"] // Default Peach / Lavender
  }
}

export default function AmelieHome() {
  const {
    agentState,
    emotion,
    messages,
    isMicMuted,
    backendOnline,
    startCall,
    stopCall,
    toggleMic,
    sendText,
    getInputVolume,
    getOutputVolume,
    isCallActive,
  } = useLiveLoop(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat")

  const [isTextMode, setIsTextMode] = useState(false)
  const [inputText, setInputText] = useState("")

  const handleCall = useCallback(() => {
    if (isCallActive) {
      stopCall()
    } else {
      startCall().catch(console.error)
    }
  }, [isCallActive, startCall, stopCall])

  const orbState = toOrbState(agentState)
  const orbColors = toOrbColors(emotion)

  const statusLabel = (() => {
    if (agentState === "disconnected") return "offline"
    if (agentState === "connecting") return "connecting…"
    if (agentState === "thinking") return "thinking…"
    if (agentState === "speaking") return "speaking"
    if (agentState === "listening") return "listening"
    return "online"
  })()

  return (
    <main className="relative flex h-screen w-full flex-col bg-canvas text-ink overflow-hidden font-sans selection:bg-black/10">
      {/* ── Atmospheric Ambient Orbs (Pastel Blooms) ────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-[20%] -left-[10%] w-[80vw] h-[80vw] rounded-full blur-[120px] animate-glow-1"
          style={{ background: "var(--color-glow-mint)" }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[90vw] h-[90vw] rounded-full blur-[140px] animate-glow-2"
          style={{ background: "var(--color-glow-lavender)" }}
        />
      </div>

      {/* ── Floating Editorial Header ────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-50 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 pointer-events-auto"
        >
          <div className="flex flex-col">
            <h1 className="font-display text-2xl font-light tracking-tight leading-none text-ink">
              Amélie
            </h1>
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-body opacity-40 mt-1">
              Sentient Object v0.1
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 pointer-events-auto"
        >
          <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-pill border border-hairline shadow-sm">
            <div
              className={cn(
                "size-1.5 rounded-full",
                backendOnline === true
                  ? "bg-emerald-500 animate-status-pulse"
                  : backendOnline === false
                  ? "bg-red-500"
                  : "bg-zinc-300"
              )}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-body-strong opacity-60">
              {statusLabel}
            </span>
          </div>
        </motion.div>
      </header>

      {/* ── Core Interface ─────────────────────────────────────────────── */}
      <div className="relative flex-1 w-full max-w-2xl mx-auto z-10">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            /* ── Initial Presence — Editorial Hero ───────────────────── */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(20px)" }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <motion.div
                layout
                initial={false}
                animate={{
                  width: isCallActive ? 288 : 224,
                  height: isCallActive ? 288 : 224,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative"
              >
                <motion.div
                  animate={{
                    scale: isCallActive ? [1, 1.03, 1] : 1,
                  }}
                  transition={{
                    scale: isCallActive 
                      ? { duration: 5, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.8 }
                  }}
                  className="size-full"
                >
                  <Orb
                    className="h-full w-full"
                    colors={orbColors}
                    agentState={orbState}
                    volumeMode="manual"
                    getInputVolume={getInputVolume}
                    getOutputVolume={getOutputVolume}
                  />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="mt-16 text-center"
              >
                <h2 className="font-display text-[64px] font-normal text-ink tracking-tight leading-none">
                  {isCallActive ? "I'm listening." : "Quietly waiting."}
                </h2>
                <p className="mt-6 text-[10px] font-sans text-body/40 tracking-[0.25em] uppercase font-medium">
                  {isCallActive
                    ? "Speak naturally"
                    : "Press the phone to begin"}
                </p>
              </motion.div>
            </motion.div>
          ) : (
            /* ── Conversation Thread ─────────────────────────────────── */
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col"
            >
              <Conversation className="flex-1 px-6 pt-32 pb-40">
                <ConversationContent className="flex flex-col gap-8">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className={cn(
                        "flex w-full",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "flex max-w-[80%] flex-col",
                          msg.role === "user" ? "items-end" : "items-start"
                        )}
                      >
                         <span className="text-[10px] uppercase tracking-widest text-muted-text opacity-40 mb-2 px-1">
                          {msg.role === "user" ? "You" : "Amélie"}
                        </span>
                        <div
                          className={cn(
                            "px-6 py-4 rounded-3xl text-[16px] leading-[1.6] tracking-[0.01em]",
                            msg.role === "user"
                              ? "bg-white text-ink border border-hairline shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                              : "text-body-strong font-light"
                          )}
                        >
                          {msg.content}
                        </div>
                        {msg.role === "assistant" && i === messages.length - 1 && (
                          <div className="size-6 mt-3 self-start overflow-hidden rounded-full border border-hairline">
                            <Orb
                              className="size-full"
                              colors={orbColors}
                              agentState={orbState}
                              volumeMode="manual"
                              getInputVolume={getInputVolume}
                              getOutputVolume={getOutputVolume}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </ConversationContent>
                <ConversationScrollButton className="bottom-32 bg-white border border-hairline hover:bg-canvas-soft text-ink shadow-sm" />
              </Conversation>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Floating Controls (Editorial Pill) ────────────────────────── */}
      <div className="absolute bottom-10 w-full flex justify-center z-50 px-6">
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
            onSendMessage={(msg) => {
              sendText(msg)
            }}
          />
        </div>
      </div>
    </main>
  )
}

