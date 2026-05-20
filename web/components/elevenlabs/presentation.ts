export type ConversationRole = "user" | "assistant"

export interface MessagePresentation {
  contentClassName: string
  responseClassName: string
}

export interface ConversationBarPresentationInput {
  agentState: string
  isMicMuted: boolean
  isTextMode: boolean
  inputText: string
}

export interface ConversationBarPresentation {
  isCallActive: boolean
  isConnected: boolean
  isConnecting: boolean
  micDisabled: boolean
  sendDisabled: boolean
  waveformActive: boolean
  waveformProcessing: boolean
  callLabel: string
  keyboardLabel: string
  micLabel: string
  statusText: string
  textareaPlaceholder: string
}

export function getMessagePresentation(
  role: ConversationRole
): MessagePresentation {
  if (role === "user") {
    return {
      contentClassName:
        "ml-auto max-w-[82%] rounded-[1.5rem] border border-hairline-strong bg-surface-card px-4 py-3 text-ink shadow-[0_10px_30px_rgba(12,10,9,0.06)]",
      responseClassName: "text-ink",
    }
  }

  return {
    contentClassName:
      "max-w-full rounded-[1.5rem] border border-hairline/30 bg-surface-strong/70 px-4 py-3 text-ink",
    responseClassName: "text-foreground",
  }
}

export function getConversationBarPresentation({
  agentState,
  isMicMuted,
  isTextMode,
  inputText,
}: ConversationBarPresentationInput): ConversationBarPresentation {
  const isConnecting = agentState === "connecting"
  const isCallActive = agentState !== "disconnected"
  const isConnected = isCallActive && !isConnecting

  return {
    isCallActive,
    isConnected,
    isConnecting,
    micDisabled: !isConnected,
    sendDisabled: !inputText.trim(),
    waveformActive: isConnected && !isMicMuted,
    waveformProcessing: isConnecting,
    callLabel: isCallActive ? "End voice call" : "Start voice call",
    keyboardLabel: isTextMode ? "Close keyboard input" : "Open keyboard input",
    micLabel: isMicMuted ? "Unmute microphone" : "Mute microphone",
    statusText: getConversationBarStatusText(agentState),
    textareaPlaceholder: isCallActive
      ? "Message Amelie..."
      : "Type to start a conversation...",
  }
}

function getConversationBarStatusText(agentState: string) {
  switch (agentState) {
    case "connecting":
      return "Connecting"
    case "listening":
      return "Listening"
    case "thinking":
      return "Thinking"
    case "speaking":
      return "Speaking"
    case "connected":
    case "idle":
      return "Voice active"
    default:
      return "Amelie Voice"
  }
}
