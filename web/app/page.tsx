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
// Orb accepts: null | "thinking" | "listening" | "talking"
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
      return null // breathing idle state
    default:
      return null
  }
}

// ─── Map emotion → Soul Orb color pair ──────────────────────────────────────
function toOrbColors(emotion: string | null): [string, string] {
  switch (emotion) {
    case "joy":
      return ["#FDBA74", "#FFEDD5"] // warm amber/peach
    case "thoughtful":
      return ["#7C3AED", "#991B1B"] // serious violet/crimson
    case "curious":
      return ["#818CF8", "#4ADE80"] // witty indigo/green
    default:
      return ["#FDBA74", "#FFEDD5"] // default warm
  }
}

export default function AmelieHome() {
  const {
    agentState,
    connect,
    disconnect,
    sendAudio,
    sendAudioChunk,
    sendText,
    messages,
    getOutputVolume,
  } = useAmelieWebSocket("ws://localhost:8000/ws/chat")

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isTextMode, setIsTextMode] = useState(false)
  const [inputText, setInputText] = useState("")
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const inputAnalyserRef = useRef<AnalyserNode | null>(null)
  const inputDataArrayRef = useRef<Uint8Array | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  // ─── Backend health check ─────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("http://localhost:8000/health", {
          signal: AbortSignal.timeout(2000),
        })
        setBackendOnline(res.ok)
      } catch {
        setBackendOnline(false)
      }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  // ─── Track emotion from WS messages ──────────────────────────────────────
  // The WS hook doesn't expose emotion — we listen for it via a custom event
  // emitted from the hook. For now we detect emotion from message content.
  useEffect(() => {
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.role !== "assistant") return
    const text = last.content.toLowerCase()
    if (
      text.includes("haha") ||
      text.includes("lol") ||
      text.includes("awesome")
    ) {
      setCurrentEmotion("joy")
    } else if (
      text.includes("sorry") ||
      text.includes("sad") ||
      text.includes("miss")
    ) {
      setCurrentEmotion("thoughtful")
    } else if (text.includes("?")) {
      setCurrentEmotion("curious")
    } else {
      setCurrentEmotion(null)
    }
  }, [messages])

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
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
      mediaRecorder.onstop = () => {
        audioChunksRef.current = []
      }
    } catch (error) {
      console.error("Error starting mic:", error)
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setErrorMessage("Please enable microphone permissions in your browser.")
      }
    }
  }, [sendAudioChunk])

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

  const handleTextSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!inputText.trim()) return
      if (agentState === "disconnected") {
        // auto-connect on first text message
        connect()
      }
      sendText(inputText.trim())
      setInputText("")
    },
    [inputText, agentState, sendText, connect]
  )

  const getInputVolume = useCallback(() => {
    if (isMicMuted || !inputAnalyserRef.current || !inputDataArrayRef.current)
      return 0
    inputAnalyserRef.current.getByteFrequencyData(
      inputDataArrayRef.current as any
    )
    let sum = 0
    for (let i = 0; i < inputDataArrayRef.current.length; i++) {
      sum += inputDataArrayRef.current[i]
    }
    return Math.min(
      1.0,
      Math.pow((sum / inputDataArrayRef.current.length) / 255, 0.5) * 2.5
    )
  }, [isMicMuted])

  const isCallActive = agentState !== "disconnected"
  const isSpeaking = agentState === "speaking"
  const isThinking = agentState === "thinking"

  const orbState = toOrbState(agentState)
  const orbColors = toOrbColors(currentEmotion)

  // ─── Status label ────────────────────────────────────────────────────────
  const statusLabel = (() => {
    if (agentState === "disconnected") return "offline"
    if (agentState === "connecting") return "connecting…"
    if (agentState === "thinking") return "thinking…"
    if (agentState === "speaking") return "speaking"
    if (agentState === "listening") return "listening"
    return "idle"
  })()

  return (
    <main className="relative flex h-screen w-full flex-col bg-canvas text-ink overflow-hidden font-sans">
      {/* ── Atmospheric ambient glows ───────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full animate-glow-1"
          style={{
            background:
              "radial-gradient(circle, var(--color-glow-amber), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full animate-glow-2"
          style={{
            background:
              "radial-gradient(circle, var(--color-glow-violet), transparent 70%)",
            animationDelay: "5s",
          }}
        />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 pointer-events-none">
        <div className="flex items-center gap-2.5">
          {/* Backend status dot */}
          <div
            className={cn(
              "size-1.5 rounded-full",
              backendOnline === true
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-status-pulse"
                : backendOnline === false
                ? "bg-red-500"
                : "bg-zinc-600"
            )}
          />
          <span className="text-sm font-medium tracking-tight text-body-strong opacity-60">
            Amélie
          </span>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          {isCallActive && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-body opacity-50">
              {statusLabel}
            </span>
          )}
          {errorMessage && (
            <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
              {errorMessage}
            </span>
          )}
        </div>
      </header>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="relative flex-1 w-full max-w-2xl mx-auto pt-16 pb-32">
        {messages.length === 0 ? (
          /* ── Empty state — Soul Orb centred ────────────────────────── */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
            <motion.div
              className={cn(
                "relative transition-all duration-700 ease-in-out",
                isCallActive ? "size-52" : "size-40"
              )}
              animate={{ scale: isCallActive ? 1 : 0.95 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
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

            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-body-strong tracking-tight">
                {isCallActive ? statusLabel : "Say Hi to Amélie"}
              </p>
              <p className="text-xs text-body opacity-50">
                {isCallActive
                  ? "Voice is active — speak or type below"
                  : "Tap the phone button or type to connect."}
              </p>
            </div>
          </div>
        ) : (
          /* ── Conversation ──────────────────────────────────────────── */
          <Conversation className="absolute inset-0">
            <ConversationContent className="flex min-w-0 flex-col gap-3 p-6 pb-6">
              {messages.map((message, index) => (
                <div key={index} className="flex w-full flex-col gap-1 mt-2">
                  <Message from={message.role}>
                    <MessageContent
                      className={cn(
                        "max-w-full min-w-0 text-sm",
                        message.role === "user" ? "ml-auto" : ""
                      )}
                    >
                      <Response
                        className={cn(
                          "w-auto [overflow-wrap:anywhere] whitespace-pre-wrap leading-relaxed px-4 py-2.5 rounded-2xl text-sm",
                          message.role === "user"
                            ? "bg-surface-glass border border-hairline text-ink ml-auto"
                            : "text-body-strong"
                        )}
                      >
                        {message.content}
                      </Response>
                    </MessageContent>
                    {message.role === "assistant" && (
                      <div className="size-5 flex-shrink-0 self-end overflow-hidden rounded-full border border-hairline">
                        <Orb
                          className="h-full w-full"
                          colors={orbColors}
                          agentState={
                            index === messages.length - 1 ? orbState : null
                          }
                          volumeMode={
                            index === messages.length - 1 ? "manual" : "auto"
                          }
                          getInputVolume={getInputVolume}
                          getOutputVolume={getOutputVolume}
                        />
                      </div>
                    )}
                  </Message>
                </div>
              ))}
            </ConversationContent>
            <ConversationScrollButton className="bottom-[100px] z-50 bg-surface-card hover:bg-surface-strong border border-hairline text-ink" />
          </Conversation>
        )}
      </div>

      {/* ── Bottom Control Bar ─────────────────────────────────────────── */}
      <div className="absolute bottom-6 w-full px-4 flex justify-center z-20">
        <div className="w-full max-w-xl">
          <motion.div
            layout
            className="glass-bar rounded-[2rem] p-2 flex flex-col gap-2"
          >
            {/* Text Input — always accessible */}
            <AnimatePresence>
              {isTextMode && (
                <motion.form
                  key="text-form"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  onSubmit={handleTextSubmit}
                  className="px-2 pt-2 pb-1 relative overflow-hidden"
                >
                  <input
                    ref={textInputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isCallActive
                        ? "Message Amélie…"
                        : "Type to start a conversation…"
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-12 py-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-white/20 placeholder:text-body/40"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    type="submit"
                    disabled={!inputText.trim()}
                    className="absolute right-3 top-3.5 h-8 w-8 bg-white/10 text-ink hover:bg-white/20 rounded-full transition-all disabled:opacity-30"
                  >
                    <ArrowUpIcon className="size-4" />
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Controls row */}
            <div className="flex items-center justify-between px-2 py-1 h-14">
              {/* Left: waveform or label */}
              <div className="flex-1 flex items-center justify-start pl-2">
                {isCallActive ? (
                  <div className="w-24 h-8 flex items-center justify-center opacity-60">
                    <LiveWaveform
                      active={!isMicMuted && !isSpeaking && !isThinking}
                      barWidth={2}
                      barGap={2}
                      height={24}
                      smoothingTimeConstant={0.5}
                      className="text-ink"
                    />
                  </div>
                ) : (
                  <span className="text-muted-text text-[10px] uppercase tracking-[0.12em] font-semibold ml-2">
                    Voice Chat
                  </span>
                )}
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Keyboard toggle — always visible */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsTextMode((v) => !v)
                    setTimeout(() => textInputRef.current?.focus(), 100)
                  }}
                  className={cn(
                    "size-12 rounded-full transition-colors",
                    isTextMode
                      ? "bg-white/10 text-ink"
                      : "text-body hover:bg-white/5 hover:text-ink"
                  )}
                >
                  <KeyboardIcon className="size-5" />
                </Button>

                {/* Mic mute — only when call active */}
                {isCallActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMic}
                    className={cn(
                      "size-12 rounded-full transition-colors",
                      isMicMuted
                        ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        : "text-body hover:bg-white/5 hover:text-ink"
                    )}
                  >
                    {isMicMuted ? (
                      <MicOffIcon className="size-5" />
                    ) : (
                      <MicIcon className="size-5" />
                    )}
                  </Button>
                )}

                {/* Phone call button */}
                <Button
                  onClick={handleCall}
                  size="icon"
                  className={cn(
                    "size-12 rounded-full ml-1 transition-all",
                    isCallActive
                      ? "bg-white/8 text-ink hover:bg-white/15 border border-white/10"
                      : "bg-white/90 text-canvas hover:bg-white"
                  )}
                >
                  {isCallActive ? (
                    <PhoneOffIcon className="size-5" />
                  ) : (
                    <PhoneIcon className="size-5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
