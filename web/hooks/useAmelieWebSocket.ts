import { useState, useEffect, useRef, useCallback } from "react"

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type AgentState = "idle" | "listening" | "thinking" | "speaking" | "connected" | "connecting" | "disconnected"

export const useAmelieWebSocket = (url: string) => {
  const [agentState, setAgentState] = useState<AgentState>("disconnected")
  const [emotion, setEmotion] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [transcript, setTranscript] = useState("")
  
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)

  const playNextInQueue = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0 || isPlayingRef.current) return

    isPlayingRef.current = true
    const audioData = audioQueueRef.current.shift()!
    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 16000)
    buffer.getChannelData(0).set(audioData)

    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer
    source.connect(analyserRef.current!)
    
    source.onended = () => {
      isPlayingRef.current = false
      playNextInQueue()
    }
    source.start()
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setAgentState("connecting")
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setAgentState("connected")
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.connect(audioContextRef.current.destination)
      }
    }

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        
        switch (msg.type) {
          case "status":
            setAgentState(msg.state)
            if (msg.emotion) setEmotion(msg.emotion)
            break
          case "transcript":
            setTranscript(msg.data)
            // Prevent double-appending if backend echoes back
            setMessages(prev => {
              if (prev.length > 0 && prev[prev.length - 1].role === "user" && prev[prev.length - 1].content === msg.data) {
                return prev
              }
              return [...prev, { role: "user", content: msg.data }]
            })
            break
          case "text_chunk":
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1]
              if (lastMsg?.role === "assistant") {
                // IMPORTANT: If backend sends full strings instead of deltas, 
                // we should check if data already starts with last content.
                // But since we confirmed it's delta, we append.
                // Added a safety check to avoid duplicating exact repeated chunks.
                if (msg.data && lastMsg.content.endsWith(msg.data) && msg.data.length > 3) {
                   return prev
                }
                const updated = [...prev]
                updated[updated.length - 1] = { ...lastMsg, content: lastMsg.content + msg.data }
                return updated
              }
              return [...prev, { role: "assistant", content: msg.data }]
            })
            break
          case "audio_chunk":
            const binaryStr = window.atob(msg.data)
            const bytes = new Uint8Array(binaryStr.length)
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
            
            if (audioContextRef.current) {
              try {
                const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer)
                audioQueueRef.current.push(audioBuffer.getChannelData(0))
                playNextInQueue()
              } catch (e) {
                console.warn("Audio decoding failed", e)
              }
            }
            break
          case "audio_end":
            // Optional: can use this to trigger state changes
            break
        }
      } catch (e) {
        console.error("WS Message Error", e)
      }
    }

    ws.onclose = () => {
      setAgentState("disconnected")
      setEmotion(null)
      wsRef.current = null
    }

    ws.onerror = () => {
      setAgentState("disconnected")
      setEmotion(null)
      wsRef.current = null
    }
  }, [url, playNextInQueue])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const sendText = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text", data: text }))
      setMessages(prev => [...prev, { role: "user", content: text }])
    }
  }

  const sendAudioChunk = (base64Data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "audio_chunk", data: base64Data }))
    }
  }

  const getOutputVolume = useCallback(() => {
    if (!analyserRef.current) return 0
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    return Math.min(1.0, (sum / dataArray.length) / 128)
  }, [])

  return { 
    agentState, 
    emotion, 
    messages, 
    sendText, 
    sendAudioChunk, 
    transcript, 
    getOutputVolume, 
    connect, 
    disconnect: () => wsRef.current?.close(),
    audioContext: audioContextRef.current
  }
}
