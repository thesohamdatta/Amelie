"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  ChevronDown,
  Keyboard,
  Mic,
  MicOff,
  PhoneIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LiveWaveform } from "./live-waveform"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { getConversationBarPresentation } from "./presentation"

export interface ConversationBarProps {
  /**
   * Current state of the voice agent
   */
  agentState: string

  /**
   * Whether user microphone is muted
   */
  isMicMuted: boolean

  /**
   * Whether text input mode is expanded
   */
  isTextMode: boolean

  /**
   * Current text in input field
   */
  inputText: string

  /**
   * Callback to update text input value
   */
  setInputText: (text: string) => void

  /**
   * Callback to toggle text mode
   */
  setIsTextMode: (val: boolean | ((prev: boolean) => boolean)) => void

  /**
   * Callback to toggle microphone mute state
   */
  toggleMic: () => void

  /**
   * Callback to initiate/end voice call session
   */
  handleCall: () => void

  /**
   * Callback when user submits/sends a message
   */
  onSendMessage: (message: string) => void

  /**
   * Custom className for the container
   */
  className?: string

  /**
   * Custom className for the waveform
   */
  waveformClassName?: string
}

export const ConversationBar = React.forwardRef<
  HTMLDivElement,
  ConversationBarProps
>(
  (
    {
      agentState,
      isMicMuted,
      isTextMode,
      inputText,
      setInputText,
      setIsTextMode,
      toggleMic,
      handleCall,
      onSendMessage,
      className,
      waveformClassName,
    },
    ref
  ) => {
    const textInputRef = React.useRef<HTMLTextAreaElement>(null)

    const bar = getConversationBarPresentation({
      agentState,
      inputText,
      isMicMuted,
      isTextMode,
    })

    const handleSendText = React.useCallback(() => {
      if (!inputText.trim()) return
      onSendMessage(inputText.trim())
      setInputText("")
    }, [inputText, onSendMessage, setInputText])

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          handleSendText()
        }
      },
      [handleSendText]
    )

    return (
      <div
        ref={ref}
        className={cn("flex w-full items-end justify-center p-4", className)}
      >
        <Card className="glass-bar m-0 w-full gap-0 rounded-[1.75rem] border-hairline p-0 shadow-[0_18px_60px_rgba(12,10,9,0.12)]">
          <div className="flex flex-col-reverse">
            <div>
              {isTextMode && <Separator className="bg-hairline" />}
              <div className="flex items-center justify-between gap-2 p-2">
                {/* Left side: Waveform or status text */}
                <div className="h-11 w-[132px] md:w-[148px]">
                  <div
                    className={cn(
                      "flex h-full items-center gap-2 rounded-[1rem] border border-hairline-soft px-3 py-1",
                      "bg-surface-strong/70 text-body"
                    )}
                  >
                    <div className="h-full flex-1">
                      <div
                        className={cn(
                          "relative flex h-full w-full shrink-0 items-center justify-center overflow-hidden rounded-sm",
                          waveformClassName
                        )}
                      >
                        <LiveWaveform
                          key={
                            agentState === "disconnected"
                              ? "idle"
                              : "active"
                          }
                          active={bar.waveformActive}
                          processing={bar.waveformProcessing}
                          barWidth={3}
                          barGap={1}
                          barRadius={4}
                          fadeEdges={true}
                          fadeWidth={24}
                          sensitivity={1.8}
                          smoothingTimeConstant={0.85}
                          height={20}
                          mode="static"
                          className={cn(
                            "h-full w-full text-ink transition-opacity duration-300",
                            !bar.isCallActive && "opacity-0"
                          )}
                        />
                        {!bar.isCallActive && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-body/70">
                              {bar.statusText}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: controls */}
                <div className="flex items-center gap-1">
                  {/* Mic Toggle Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMic}
                    aria-pressed={isMicMuted}
                    aria-label={bar.micLabel}
                    title={bar.micLabel}
                    className={cn(
                      "size-10 rounded-full transition-colors disabled:opacity-35",
                      isMicMuted
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        : "text-body hover:bg-secondary hover:text-ink"
                    )}
                    disabled={bar.micDisabled}
                  >
                    {isMicMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  </Button>

                  {/* Keyboard Mode Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsTextMode((isOpen) => {
                        const next = !isOpen
                        if (next) {
                          window.setTimeout(() => textInputRef.current?.focus(), 100)
                        }
                        return next
                      })
                    }}
                    aria-pressed={isTextMode}
                    aria-label={bar.keyboardLabel}
                    title={bar.keyboardLabel}
                    className={cn(
                      "relative size-10 rounded-full transition-all",
                      isTextMode ? "bg-secondary text-ink" : "text-body hover:bg-secondary hover:text-ink"
                    )}
                  >
                    <Keyboard
                      className={cn(
                        "h-4 w-4 absolute inset-0 m-auto transform-gpu transition-all duration-200 ease-out",
                        isTextMode ? "scale-75 opacity-0" : "scale-100 opacity-100"
                      )}
                    />
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 absolute inset-0 m-auto transform-gpu transition-all duration-200 ease-out",
                        isTextMode ? "scale-100 opacity-100" : "scale-75 opacity-0"
                      )}
                    />
                  </Button>

                  <Separator orientation="vertical" className="mx-1 h-5 bg-hairline" />

                  {/* Phone Call / End Call Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCall}
                    aria-label={bar.callLabel}
                    title={bar.callLabel}
                    className={cn(
                      "size-11 rounded-full border transition-all shadow-sm",
                      bar.isCallActive
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
                        : "border-surface-dark bg-surface-dark text-on-primary hover:scale-105 hover:bg-primary-active"
                    )}
                  >
                    {bar.isCallActive ? (
                      <XIcon className="h-4 w-4" />
                    ) : (
                      <PhoneIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Slide-out Textarea panel */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isTextMode ? "max-h-[120px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
              )}
            >
              <div className="relative px-2 pt-2 pb-2">
                <Textarea
                  ref={textInputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={bar.textareaPlaceholder}
                  className="min-h-[80px] max-h-[80px] resize-none border-0 bg-transparent pr-12 text-sm text-ink shadow-none placeholder:text-body/35 focus-visible:ring-0"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSendText}
                  disabled={bar.sendDisabled}
                  aria-label="Send message"
                  title="Send message"
                  className="absolute right-3 bottom-3 h-8 w-8 rounded-full bg-surface-dark text-on-primary transition-all hover:bg-primary-active disabled:bg-secondary disabled:text-body disabled:opacity-45"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }
)

ConversationBar.displayName = "ConversationBar"
