"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type AgentState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "thinking"
  | "speaking"
  | "idle"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export function useAmelieWebSocket(url: string) {
  const [agentState, setAgentState] = useState<AgentState>("disconnected")
  const [transcript, setTranscript] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current) return
    setAgentState("connecting")

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setAgentState("connected")
      
      // Initialize Audio Context for playing TTS
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.connect(audioContextRef.current.destination)
      } else if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume()
      }
    }

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === "status") {
          setAgentState(msg.state)
        } else if (msg.type === "transcript") {
          setTranscript(msg.data)
          setMessages(prev => [...prev, { role: "user", content: msg.data }])
        } else if (msg.type === "text_chunk") {
          setMessages(prev => {
             const newMessages = [...prev]
             if (newMessages.length === 0 || newMessages[newMessages.length - 1].role === "user") {
                 newMessages.push({ role: "assistant", content: msg.data })
             } else {
                 newMessages[newMessages.length - 1].content += msg.data
             }
             return newMessages
          })
        } else if (msg.type === "audio_chunk") {
          // Decode base64 to array buffer
          const binaryStr = window.atob(msg.data)
          const len = binaryStr.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i)
          }
          
          if (audioContextRef.current) {
            try {
              const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer)
              audioQueueRef.current.push(audioBuffer.getChannelData(0))
              playNextInQueue()
            } catch (e) {
              console.error("Error decoding audio chunk", e)
            }
          }
        }
      } catch (e) {
        console.error("Error parsing WS message", e)
      }
    }

    ws.onclose = () => {
      setAgentState("disconnected")
      wsRef.current = null
      setMessages([])
    }

    ws.onerror = (error) => {
      console.error("WebSocket error", error)
      setAgentState("disconnected")
      setMessages([])
    }
  }, [url])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setAgentState("disconnected")
    setMessages([])
  }, [])

  const playNextInQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return
    
    isPlayingRef.current = true
    const audioData = audioQueueRef.current.shift()!
    
    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 22050) // Sarvam Bulbul sample rate
    buffer.copyToChannel(audioData, 0)
    
    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer
    source.connect(analyserRef.current!)
    
    source.onended = () => {
      isPlayingRef.current = false
      playNextInQueue()
    }
    source.start()
  }, [])

  const sendAudio = useCallback((base64Audio: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "audio_data", data: base64Audio }))
    }
  }, [])

  const sendAudioChunk = useCallback((base64Audio: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "audio_chunk", data: base64Audio }))
    }
  }, [])

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setMessages(prev => [...prev, { role: "user", content: text }])
      wsRef.current.send(JSON.stringify({ type: "text", data: text }))
    }
  }, [])

  const getOutputVolume = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return 0
    analyserRef.current.getByteFrequencyData(dataArrayRef.current)
    let sum = 0
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i]
    }
    return Math.min(1.0, (sum / dataArrayRef.current.length) / 255 * 2.5)
  }, [])

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return {
    agentState,
    connect,
    disconnect,
    sendAudio,
    sendAudioChunk,
    sendText,
    transcript,
    messages,
    getOutputVolume
  }
}
