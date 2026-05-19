"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { PhoneIcon, PhoneOffIcon, MicIcon, MicOffIcon, ArrowUpIcon, KeyboardIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Orb } from "@/components/ui/orb"
import { useAmelieWebSocket } from "@/hooks/useAmelieWebSocket"
import { LiveWaveform } from "@/components/ui/live-waveform"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ui/conversation"
import { Message, MessageContent } from "@/components/ui/message"
import { Response } from "@/components/ui/response"

export default function AmelieHome() {
  const { agentState, connect, disconnect, sendAudio, sendAudioChunk, sendText, messages, getOutputVolume } = useAmelieWebSocket("ws://localhost:8000/ws/chat")
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isTextMode, setIsTextMode] = useState(false)
  const [inputText, setInputText] = useState("")
  const [isMicMuted, setIsMicMuted] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  
  const inputAnalyserRef = useRef<AnalyserNode | null>(null)
  const inputDataArrayRef = useRef<Uint8Array | null>(null)

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
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
            const base64data = (reader.result as string).split(',')[1]
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
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      setIsTextMode(false)
    }
  }, [agentState, connect, disconnect, startRecording])

  const toggleMic = useCallback(() => {
    setIsMicMuted(!isMicMuted)
    if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => { track.enabled = isMicMuted })
    }
    if (!isMicMuted) {
       stopRecording()
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
       mediaRecorderRef.current.start()
    }
  }, [isMicMuted, stopRecording])

  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || agentState === "disconnected") return
    sendText(inputText.trim())
    setInputText("")
  }, [inputText, agentState, sendText])

  const isCallActive = agentState !== "disconnected"
  const isSpeaking = agentState === "speaking"
  const isThinking = agentState === "thinking"

  const getInputVolume = useCallback(() => {
    if (isMicMuted || !inputAnalyserRef.current || !inputDataArrayRef.current) return 0
    inputAnalyserRef.current.getByteFrequencyData(inputDataArrayRef.current as any)
    let sum = 0
    for (let i = 0; i < inputDataArrayRef.current.length; i++) {
      sum += inputDataArrayRef.current[i]
    }
    return Math.min(1.0, Math.pow((sum / inputDataArrayRef.current.length) / 255, 0.5) * 2.5)
  }, [isMicMuted])

  const orbState = agentState === "connected" ? "idle" : agentState === "disconnected" ? null : agentState

  return (
    <main className="relative flex h-screen w-full flex-col bg-canvas text-ink overflow-hidden font-sans">
      
      {/* Background Atmospheric Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-gradient-mint mix-blend-multiply filter blur-[120px] opacity-60 animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-peach mix-blend-multiply filter blur-[120px] opacity-50" style={{ animationDelay: '2s', animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-gradient-lavender mix-blend-multiply filter blur-[100px] opacity-40" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 pointer-events-none">
          <div className="flex items-center gap-3">
              <div className={cn("size-2 rounded-full", isCallActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-hairline-strong")} />
              <span className="text-sm font-medium tracking-tight text-body-strong font-display tracking-tight text-lg">Amélie Companion</span>
          </div>
          {errorMessage && (
             <span className="text-xs text-red-600 bg-red-100 px-3 py-1 rounded-pill">{errorMessage}</span>
          )}
      </header>

      {/* Main Chat Area */}
      <div className="relative flex-1 w-full max-w-3xl mx-auto pt-16 pb-32">
        <Conversation className="absolute inset-0">
          <ConversationContent className="flex min-w-0 flex-col gap-2 p-6 pb-6">
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={
                    <div className={cn("relative transition-all duration-700 ease-in-out", isCallActive ? "size-64" : "size-48 opacity-70 grayscale")}>
                       <Orb
                          className="h-full w-full"
                          colors={["var(--color-gradient-mint)", "var(--color-gradient-peach)"]}
                          agentState={orbState as any}
                          volumeMode="manual"
                          getInputVolume={getInputVolume}
                          getOutputVolume={getOutputVolume}
                      />
                    </div>
                }
                title="Say Hi to Amélie"
                description="Tap the phone button to connect."
              />
            ) : (
              messages.map((message, index) => {
                return (
                  <div key={index} className="flex w-full flex-col gap-1 mt-4">
                    <Message from={message.role}>
                      <MessageContent className="max-w-full min-w-0 text-sm">
                        <Response className="w-auto [overflow-wrap:anywhere] whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </Response>
                      </MessageContent>
                      {message.role === "assistant" && (
                        <div className="ring-hairline size-6 flex-shrink-0 self-end overflow-hidden rounded-full ring-1 bg-canvas">
                          <Orb 
                             className="h-full w-full" 
                             colors={["var(--color-gradient-mint)", "var(--color-gradient-peach)"]}
                             agentState={index === messages.length - 1 ? orbState as any : undefined} 
                             volumeMode={index === messages.length - 1 ? "manual" : "auto"}
                             getInputVolume={getInputVolume}
                             getOutputVolume={getOutputVolume}
                          />
                        </div>
                      )}
                    </Message>
                  </div>
                )
              })
            )}
          </ConversationContent>
          <ConversationScrollButton className="bottom-[100px] z-50 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white" />
        </Conversation>
      </div>

      {/* Custom Conversation Bar */}
      <div className="absolute bottom-6 w-full px-4 flex justify-center z-20">
          <div className="w-full max-w-xl">
             <motion.div 
                layout
                className="bg-surface-card border border-hairline rounded-[2rem] shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-2 flex flex-col gap-2 transition-all duration-300"
             >
                {/* Expanded Text Input */}
                <AnimatePresence>
                   {isTextMode && isCallActive && (
                       <motion.form 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          onSubmit={handleTextSubmit}
                          className="px-2 pt-2 pb-1 relative"
                       >
                           <input 
                              type="text"
                              value={inputText}
                              onChange={(e) => setInputText(e.target.value)}
                              placeholder="Message Amélie..."
                              className="w-full bg-surface-strong border border-hairline rounded-pill pl-5 pr-12 py-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink placeholder:text-muted"
                              autoFocus
                           />
                           <Button
                              size="icon"
                              variant="ghost"
                              type="submit"
                              disabled={!inputText.trim()}
                              className="absolute right-3 top-3.5 h-8 w-8 bg-primary-brand text-white hover:bg-primary-active rounded-pill transition-all"
                           >
                              <ArrowUpIcon className="size-4" />
                           </Button>
                       </motion.form>
                   )}
                </AnimatePresence>

                {/* Main Controls Row */}
                <div className="flex items-center justify-between px-2 py-1 h-14">
                    {/* Left: Waveform or Indicator */}
                    <div className="flex-1 flex items-center justify-start pl-2">
                        {isCallActive ? (
                            <div className="w-24 h-8 flex items-center justify-center opacity-80 mix-blend-screen">
                                <LiveWaveform 
                                    active={!isMicMuted && !isSpeaking && !isThinking} 
                                    barWidth={2} 
                                    barGap={2} 
                                    height={24}
                                    smoothingTimeConstant={0.5}
                                    className="text-body" 
                                />
                            </div>
                        ) : (
                            <span className="text-muted text-[10px] uppercase tracking-[0.96px] font-semibold ml-2">Voice Chat</span>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isCallActive && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleMic}
                                    className={cn(
                                        "size-12 rounded-pill transition-colors",
                                        isMicMuted ? "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700" : "text-body hover:bg-surface-strong hover:text-ink"
                                    )}
                                >
                                    {isMicMuted ? <MicOffIcon className="size-5" /> : <MicIcon className="size-5" />}
                                </Button>
                                
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsTextMode(!isTextMode)}
                                    className={cn(
                                        "size-12 rounded-pill transition-colors",
                                        isTextMode ? "bg-surface-strong text-ink" : "text-body hover:bg-surface-strong hover:text-ink"
                                    )}
                                >
                                    <KeyboardIcon className="size-5" />
                                </Button>
                            </>
                        )}
                        
                        <Button
                            onClick={handleCall}
                            size="icon"
                            className={cn(
                                "size-12 rounded-pill ml-1 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
                                isCallActive 
                                   ? "bg-surface-strong text-ink hover:bg-hairline-strong hover:text-ink"
                                   : "bg-primary-brand text-white hover:bg-primary-active"
                            )}
                        >
                            {isCallActive ? <PhoneOffIcon className="size-5" /> : <PhoneIcon className="size-5" />}
                        </Button>
                    </div>
                </div>
             </motion.div>
          </div>
      </div>
    </main>
  )
}
