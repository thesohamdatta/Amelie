import { useState, useEffect, useRef, useCallback } from "react"

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type AgentState = "idle" | "listening" | "thinking" | "speaking" | "connected" | "connecting" | "disconnected"

interface UseAmelieWebSocketOptions {
  url: string
  onAudioChunk?: (base64: string) => void
  onInterrupt?: () => void
}

export const useAmelieWebSocket = ({ url, onAudioChunk, onInterrupt }: UseAmelieWebSocketOptions) => {
  const [agentState, setAgentState] = useState<AgentState>("disconnected")
  const [emotion, setEmotion] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [transcript, setTranscript] = useState("")
  
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setAgentState("connecting")
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setAgentState("connected")
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
            if (onAudioChunk) onAudioChunk(msg.data)
            break
          case "interrupt":
            if (onInterrupt) onInterrupt()
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
  }, [url, onAudioChunk, onInterrupt])

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

  const sendInterrupt = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }))
    }
  }

  return { 
    agentState, 
    emotion, 
    messages, 
    sendText, 
    sendAudioChunk, 
    sendInterrupt,
    transcript, 
    connect, 
    disconnect: () => wsRef.current?.close(),
  }
}
