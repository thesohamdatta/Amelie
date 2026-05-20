import { useState, useRef, useCallback, useEffect } from "react"
import { useAmelieWebSocket } from "./useAmelieWebSocket"
import { useAudioStreamer } from "./useAudioStreamer"

export const useLiveLoop = (url: string) => {
  const {
    queueAudioChunk,
    stopPlayback,
    getOutputVolume,
    ensureAudioContext
  } = useAudioStreamer()

  const {
    agentState,
    emotion,
    messages,
    sendText,
    sendAudioChunk,
    sendInterrupt,
    connect,
    disconnect,
  } = useAmelieWebSocket({
    url,
    onAudioChunk: queueAudioChunk,
    onInterrupt: stopPlayback
  })

  const [isMicMuted, setIsMicMuted] = useState(false)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const inputAnalyserRef = useRef<AnalyserNode | null>(null)
  const inputDataArrayRef = useRef<Uint8Array | null>(null)

  // ─── Backend health check ─────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const baseUrl = url.replace("ws://", "http://").replace("/ws/chat", "")
        const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) })
        setBackendOnline(res.ok)
      } catch {
        setBackendOnline(false)
      }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [url])

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

  // ─── Barge-in Detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (agentState !== "speaking" || isMicMuted) return

    let animationFrameId: number
    const checkBargeIn = () => {
      const volume = getInputVolume()
      if (volume > 0.15) {
        sendInterrupt()
        stopPlayback()
      }
      animationFrameId = requestAnimationFrame(checkBargeIn)
    }

    animationFrameId = requestAnimationFrame(checkBargeIn)
    return () => cancelAnimationFrame(animationFrameId)
  }, [agentState, isMicMuted, getInputVolume, stopPlayback, sendInterrupt])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const activeCtx = ensureAudioContext()
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
      throw error
    }
  }, [ensureAudioContext, sendAudioChunk])

  const startCall = useCallback(async () => {
    connect()
    await startRecording()
  }, [connect, startRecording])

  const stopCall = useCallback(() => {
    disconnect()
    stopPlayback()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [disconnect, stopPlayback])

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

  return {
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
    isCallActive: agentState !== "disconnected"
  }
}
