import { useRef, useCallback } from "react"

export const useAudioStreamer = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.connect(audioContextRef.current.destination)
    }
    return audioContextRef.current
  }, [])

  const playNextInQueue = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0 || isPlayingRef.current) return

    isPlayingRef.current = true
    const audioData = audioQueueRef.current.shift()!
    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 16000)
    buffer.getChannelData(0).set(audioData)

    const source = audioContextRef.current.createBufferSource()
    currentSourceRef.current = source
    source.buffer = buffer
    source.connect(analyserRef.current!)
    
    source.onended = () => {
      currentSourceRef.current = null
      isPlayingRef.current = false
      playNextInQueue()
    }
    source.start()
  }, [])

  const queueAudioChunk = useCallback(async (base64Data: string) => {
    const ctx = ensureAudioContext()
    const binaryStr = window.atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    
    try {
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer)
      audioQueueRef.current.push(audioBuffer.getChannelData(0))
      playNextInQueue()
    } catch (e) {
      console.warn("Audio decoding failed", e)
    }
  }, [ensureAudioContext, playNextInQueue])

  const stopPlayback = useCallback(() => {
    audioQueueRef.current = []
    if (currentSourceRef.current) {
      currentSourceRef.current.stop()
      currentSourceRef.current = null
    }
    isPlayingRef.current = false
  }, [])

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
    queueAudioChunk,
    stopPlayback,
    getOutputVolume,
    audioContext: audioContextRef.current,
    ensureAudioContext
  }
}
