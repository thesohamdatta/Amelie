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
import { useAmelieWebSocket } from "@/hooks/useAmelieWebSocket"
import { Response } from "@/components/ui/response"
import {
  Orb,
  LiveWaveform,
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  Message,
  MessageContent,
  ConversationBar,
  ShimmeringText,
} from "@/components/elevenlabs"

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

            <div className="text-center space-y-1.5 flex flex-col items-center">
              <div className="text-sm font-medium tracking-tight h-5 flex items-center justify-center">
                {isCallActive ? (
                  <ShimmeringText text={statusLabel} className="text-body-strong" />
                ) : (
                  <span className="text-body-strong">Say Hi to Amélie</span>
                )}
              </div>
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
              if (agentState === "disconnected") {
                connect()
              }
              sendText(msg)
            }}
          />
        </div>
      </div>
    </main>
  )
}
