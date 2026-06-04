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
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume()
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
    ensureAudioContext()
    
    // Decode base64 to binary
    const binaryStr = window.atob(base64Data)
    const len = binaryStr.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    // ElevenLabs PCM16 format: 16-bit signed integers
    // Each sample is 2 bytes
    const int16Data = new Int16Array(bytes.buffer)
    const float32Data = new Float32Array(int16Data.length)

    // Normalize Int16 to Float32 [-1.0, 1.0]
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0
    }

    audioQueueRef.current.push(float32Data)
    playNextInQueue()
  }, [ensureAudioContext, playNextInQueue])

  const stopPlayback = useCallback(() => {
    audioQueueRef.current = []
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch (e) {
        // Source might already be stopped
      }
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
    // Boost the volume visualization slightly for better orb reactivity
    return Math.min(1.0, (sum / dataArray.length) / 128 * 1.5)
  }, [])

  return {
    queueAudioChunk,
    stopPlayback,
    getOutputVolume,
    audioContext: audioContextRef.current,
    ensureAudioContext
  }
}
