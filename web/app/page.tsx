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
    inputAnalyserRef.current.getByteFrequencyData(inputDataArrayRef.current as any)
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
          <h1 className="font-display text-2xl font-light tracking-tight leading-none text-ink">
            Amélie
          </h1>
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
                animate={{
                  scale: isCallActive ? [1, 1.05, 1] : [0.98, 1, 0.98],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={cn(
                  "relative transition-all duration-1000 ease-in-out",
                  isCallActive ? "size-72" : "size-56"
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
        <motion.div
          layout
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-bar w-full max-w-lg rounded-pill p-1.5 flex flex-col gap-1.5 shadow-xl shadow-black/5"
        >
          <AnimatePresence>
            {isTextMode && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleTextSubmit}
                className="px-2 pt-2 relative"
              >
                <input
                  ref={textInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Message Amélie…"
                  className="w-full bg-white/50 border border-hairline rounded-pill pl-6 pr-14 py-4 text-[16px] text-ink focus:outline-none focus:ring-1 focus:ring-black/5 placeholder:text-body/30"
                  autoFocus
                />
                <Button
                  size="icon"
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-3.5 top-3.5 h-10 w-10 bg-primary-brand text-on-primary hover:bg-primary-active rounded-full transition-all disabled:opacity-20"
                >
                  <ArrowUpIcon className="size-4" />
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between px-2 h-[64px]">
            <div className="flex-1 flex items-center justify-start pl-6">
              {isCallActive ? (
                <div className="w-24 h-6 opacity-60">
                  <LiveWaveform
                    active={!isMicMuted && agentState === "listening"}
                    barWidth={1.5}
                    barGap={1.5}
                    height={16}
                    className="text-ink"
                  />
                </div>
              ) : (
                <span className="font-display italic text-sm text-muted-text opacity-40">
                  Ready to talk
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 pr-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsTextMode((v) => !v)
                  if (!isTextMode) setTimeout(() => textInputRef.current?.focus(), 150)
                }}
                className={cn(
                  "size-12 rounded-full transition-all duration-300",
                  isTextMode ? "bg-black/5 text-ink scale-105" : "text-body/40 hover:text-ink hover:bg-black/5"
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
                    isMicMuted ? "bg-destructive/5 text-destructive" : "text-body/40 hover:text-ink hover:bg-black/5"
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
                    ? "bg-transparent border border-hairline-strong text-ink hover:bg-black/5"
                    : "bg-primary-brand text-on-primary hover:bg-primary-active hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
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
