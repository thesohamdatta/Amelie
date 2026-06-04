import { useState, useEffect, useCallback } from "react"

export interface SoulConfig {
  name: string
  personality: string
  language: string
  tts_voice: string
  elevenlabs_voice_id: string
  elevenlabs_model_id: string
  sarvam_speaker: string
  stt_engine: string
  memory_depth: string
  speaking_pace: string
  interests: string[]
  default_mode: string
  greeting_style: string
}

export interface MemorySummary {
  session_id: string
  summary: string
  timestamp: string
}

export interface MemoryData {
  facts: string[]
  summaries: MemorySummary[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export const useAmelieConfig = () => {
  const [soul, setSoul] = useState<SoulConfig | null>(null)
  const [memory, setMemory] = useState<MemoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSoul = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/soul`)
      if (!res.ok) throw new Error("Failed to fetch soul")
      const data = await res.json()
      setSoul(data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchMemory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/memory`)
      if (!res.ok) throw new Error("Failed to fetch memory")
      const data = await res.json()
      setMemory(data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const updateSoul = async (update: Partial<SoulConfig>) => {
    try {
      const res = await fetch(`${API_BASE}/soul`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })
      if (!res.ok) throw new Error("Failed to update soul")
      const data = await res.json()
      setSoul(data.soul)
      return data.soul
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchSoul(), fetchMemory()])
      setLoading(false)
    }
    init()
  }, [fetchSoul, fetchMemory])

  return {
    soul,
    memory,
    loading,
    error,
    updateSoul,
    refreshMemory: fetchMemory,
    refreshSoul: fetchSoul,
  }
}
