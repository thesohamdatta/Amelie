"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  PhoneIcon,
  PhoneOffIcon,
  MicIcon,
  MicOffIcon,
  ArrowUpIcon,
  KeyboardIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Orb } from "@/components/ui/orb"
import { useAmelieWebSocket } from "@/hooks/useAmelieWebSocket"
import { LiveWaveform } from "@/components/ui/live-waveform"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/conversation"
import { Message, MessageContent } from "@/components/ui/message"
import { Response } from "@/components/ui/response"

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
    default:
      return null // breathing idle state
  }
}

// ─── Map emotion → Soul Orb color pair ──────────────────────────────────────
function toOrbColors(emotion: string | null): [string, string] {
  switch (emotion) {
    case "joy":
      return ["#FDBA74", "#FFEDD5"] // Amber/Peach
    case "thoughtful":
      return ["#7C3AED", "#991B1B"] // Violet/Crimson
    case "curious":
      return ["#818CF8", "#4ADE80"] // Indigo/Green
    default:
      return ["#FDBA74", "#FFEDD5"] // Default Amber
  }
}

export default function AmelieHome() {
  const {
    agentState,
    emotion,
    connect,
    disconnect,
    sendAudioChunk,
    sendText,
    messages,
    getOutputVolume,
    audioContext,
  } = useAmelieWebSocket(
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat"
  )

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isTextMode, setIsTextMode] = useState(false)
  const [inputText, setInputText] = useState("")
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const inputAnalyserRef = useRef<AnalyserNode | null>(null)
  const inputDataArrayRef = useRef<Uint8Array | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  // ─── Backend health check ─────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/health`,
          {
            signal: AbortSignal.timeout(2000),
          }
        )
        setBackendOnline(res.ok)
      } catch {
        setBackendOnline(false)
      }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const activeCtx = audioContext || new (window.AudioContext ||
        (window as any).webkitAudioContext)()
      const source = activeCtx.createMediaStreamSource(stream)
      const analyser = activeCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      inputAnalyserRef.current = analyser
      inputDataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const reader = new FileReader()
          reader.readAsDataURL(event.data)
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(",")[1]
            sendAudioChunk(base64data)
          }
        }
      }

      mediaRecorder.start(100)
    } catch (error) {
      console.error("Error starting mic:", error)
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setErrorMessage("Please enable microphone permissions.")
      }
    }
  }, [audioContext, sendAudioChunk])

  const handleCall = useCallback(() => {
    if (agentState === "disconnected") {
      connect()
      startRecording()
    } else {
      disconnect()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [agentState, connect, disconnect, startRecording])

  const toggleMic = useCallback(() => {
    setIsMicMuted((prev) => {
      const next = !prev
      if (streamRef.current) {
        streamRef.current
          .getAudioTracks()
          .forEach((track) => (track.enabled = !next))
      }
      return next
    })
  }, [])

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    if (agentState === "disconnected") connect()
    sendText(inputText.trim())
    setInputText("")
  }

  const getInputVolume = useCallback(() => {
    if (isMicMuted || !inputAnalyserRef.current || !inputDataArrayRef.current)
      return 0
    inputAnalyserRef.current.getByteFrequencyData(inputDataArrayRef.current)
    let sum = 0
    for (let i = 0; i < inputDataArrayRef.current.length; i++) {
      sum += inputDataArrayRef.current[i]
    }
    return Math.min(
      1.0,
      Math.pow(sum / inputDataArrayRef.current.length / 255, 0.5) * 2.5
    )
  }, [isMicMuted])

  const isCallActive = agentState !== "disconnected"
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
    <main className="relative flex h-screen w-full flex-col bg-canvas text-ink overflow-hidden font-sans selection:bg-white/10">
      {/* ── Atmospheric Ambient Orbs ────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 20, -20, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, var(--color-glow-amber), transparent 70%)",
          }}
        />
        <motion.div
          animate={{
            x: [0, -40, 40, 0],
            y: [0, 20, -20, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
            delay: 2,
          }}
          className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, var(--color-glow-violet), transparent 70%)",
          }}
        />
      </div>

      {/* ── Floating Header ─────────────────────────────────────────────── */}
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
          {errorMessage ? (
            <span className="text-[10px] font-mono uppercase text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
              {errorMessage}
            </span>
          ) : (
            <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-md px-3 py-1.5 rounded-full border border-white/[0.05]">
              <div
                className={cn(
                  "size-1.5 rounded-full",
                  backendOnline === true
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-status-pulse"
                    : backendOnline === false
                    ? "bg-red-500"
                    : "bg-zinc-600"
                )}
              />
              <span className="text-[10px] font-mono uppercase tracking-widest text-body-strong opacity-60">
                {statusLabel}
              </span>
            </div>
          )}
        </motion.div>
      </header>

      {/* ── Core Interface ─────────────────────────────────────────────── */}
      <div className="relative flex-1 w-full max-w-2xl mx-auto z-10">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            /* ── Initial Presence — Cinematic Orb ────────────────────── */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{
                  scale: isCallActive ? [1, 1.05, 1] : [0.95, 1, 0.95],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={cn(
                  "relative transition-all duration-1000 ease-in-out",
                  isCallActive ? "size-64" : "size-48"
                )}
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

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="mt-12 text-center"
              >
                <h2 className="font-display text-3xl font-light text-ink/80 tracking-tight italic">
                  {isCallActive ? "I'm listening." : "Quietly Waiting."}
                </h2>
                <p className="mt-3 text-xs font-sans text-body/40 tracking-widest uppercase">
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
                <ConversationContent className="flex flex-col gap-6">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className={cn(
                        "flex w-full",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "flex max-w-[85%] items-end gap-3",
                          msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        {msg.role === "assistant" && (
                          <div className="size-6 rounded-full border border-hairline overflow-hidden shrink-0 mb-1">
                            <Orb
                              className="size-full"
                              colors={orbColors}
                              agentState={i === messages.length - 1 ? orbState : null}
                              volumeMode="auto"
                            />
                          </div>
                        )}
                        <div
                          className={cn(
                            "px-5 py-3 rounded-[1.5rem] text-sm leading-relaxed",
                            msg.role === "user"
                              ? "bg-white/[0.05] text-ink border border-white/[0.08]"
                              : "text-body-strong font-light"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </ConversationContent>
                <ConversationScrollButton className="bottom-32 bg-white/5 border-white/10 hover:bg-white/10 text-ink" />
              </Conversation>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Floating Control Island ─────────────────────────────────────── */}
      <div className="absolute bottom-8 w-full flex justify-center z-50 px-6">
        <motion.div
          layout
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-bar w-full max-w-lg rounded-[2.5rem] p-2 flex flex-col gap-2"
        >
          <AnimatePresence>
            {isTextMode && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleTextSubmit}
                className="px-2 pt-2 pb-1 relative"
              >
                <input
                  ref={textInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Message Amélie…"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-full pl-5 pr-14 py-4 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-body/30"
                  autoFocus
                />
                <Button
                  size="icon"
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-3.5 top-3.5 h-10 w-10 bg-white/10 text-ink hover:bg-white/20 rounded-full transition-all disabled:opacity-20"
                >
                  <ArrowUpIcon className="size-4" />
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between px-3 h-16">
            <div className="flex-1 flex items-center justify-start pl-4">
              {isCallActive ? (
                <div className="w-24 h-6 opacity-40">
                  <LiveWaveform
                    active={!isMicMuted && agentState === "listening"}
                    barWidth={1.5}
                    barGap={1.5}
                    height={20}
                    className="text-ink"
                  />
                </div>
              ) : (
                <span className="font-display italic text-sm text-body/40">
                  Offline
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsTextMode((v) => !v)
                  if (!isTextMode) setTimeout(() => textInputRef.current?.focus(), 150)
                }}
                className={cn(
                  "size-12 rounded-full transition-all duration-300",
                  isTextMode ? "bg-white/10 text-ink scale-110" : "text-body/60 hover:text-ink hover:bg-white/5"
                )}
              >
                <KeyboardIcon className="size-5" />
              </Button>

              {isCallActive && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMic}
                  className={cn(
                    "size-12 rounded-full transition-all duration-300",
                    isMicMuted ? "bg-red-500/10 text-red-400" : "text-body/60 hover:text-ink hover:bg-white/5"
                  )}
                >
                  {isMicMuted ? <MicOffIcon className="size-5" /> : <MicIcon className="size-5" />}
                </Button>
              )}

              <Button
                onClick={handleCall}
                size="icon"
                className={cn(
                  "size-12 rounded-full transition-all duration-500",
                  isCallActive
                    ? "bg-white/[0.08] text-ink hover:bg-white/[0.12] border border-white/[0.1]"
                    : "bg-white text-canvas hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                )}
              >
                {isCallActive ? <PhoneOffIcon className="size-5" /> : <PhoneIcon className="size-5" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
