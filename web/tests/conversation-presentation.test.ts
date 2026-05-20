import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  getConversationBarPresentation,
  getMessagePresentation,
} from "../components/elevenlabs/presentation.ts"

describe("ElevenLabs conversation presentation", () => {
  it("keeps user messages light, readable, and out of the black bubble state", () => {
    const userMessage = getMessagePresentation("user")

    assert.match(userMessage.contentClassName, /bg-surface-card/)
    assert.match(userMessage.contentClassName, /text-ink/)
    assert.match(userMessage.responseClassName, /text-ink/)
    assert.doesNotMatch(userMessage.contentClassName, /bg-primary/)
    assert.doesNotMatch(userMessage.responseClassName, /text-primary-foreground/)
  })

  it("shows connecting as a processing state without pretending the mic waveform is live", () => {
    const connectingBar = getConversationBarPresentation({
      agentState: "connecting",
      inputText: "hello",
      isMicMuted: false,
      isTextMode: false,
    })

    assert.equal(connectingBar.isCallActive, true)
    assert.equal(connectingBar.isConnected, false)
    assert.equal(connectingBar.micDisabled, true)
    assert.equal(connectingBar.waveformActive, false)
    assert.equal(connectingBar.waveformProcessing, true)
    assert.equal(connectingBar.callLabel, "End voice call")
  })

  it("keeps text entry usable as the start path and labels icon controls clearly", () => {
    const closedBar = getConversationBarPresentation({
      agentState: "disconnected",
      inputText: "  hi there  ",
      isMicMuted: false,
      isTextMode: false,
    })

    assert.equal(closedBar.sendDisabled, false)
    assert.equal(closedBar.textareaPlaceholder, "Type to start a conversation...")
    assert.equal(closedBar.keyboardLabel, "Open keyboard input")
    assert.equal(closedBar.callLabel, "Start voice call")

    const openBar = getConversationBarPresentation({
      agentState: "disconnected",
      inputText: "",
      isMicMuted: false,
      isTextMode: true,
    })

    assert.equal(openBar.sendDisabled, true)
    assert.equal(openBar.keyboardLabel, "Close keyboard input")
  })
})
