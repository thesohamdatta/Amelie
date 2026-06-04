"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { SoulConfig } from "@/hooks/useAmelieConfig"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SoulTunerProps {
  soul: SoulConfig
  onUpdate: (update: Partial<SoulConfig>) => Promise<void>
}

export function SoulTuner({ soul, onUpdate }: SoulTunerProps) {
  const [localSoul, setLocalSoul] = useState<SoulConfig>(soul)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalSoul(soul)
  }, [soul])

  const handleChange = (field: keyof SoulConfig, value: any) => {
    setLocalSoul((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(localSoul)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="h-full border-none shadow-none bg-transparent pt-4">
      <CardHeader className="px-0 pt-0 pb-6">
        <CardTitle className="font-display text-2xl font-light tracking-tight text-ink">
          Personality Tuner
        </CardTitle>
        <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-body opacity-40">
          Refine the Soul
        </p>
      </CardHeader>
      <Separator className="bg-hairline" />
      <CardContent className="px-0 py-6 h-[calc(100vh-200px)]">
        <ScrollArea className="h-full pr-4">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <label className="text-[10px] uppercase tracking-widest font-semibold text-body-strong opacity-60">
                Name
              </label>
              <Input
                value={localSoul.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="bg-white/50 border-hairline focus:border-ink rounded-pill transition-all"
              />
            </section>

            <section className="flex flex-col gap-3">
              <label className="text-[10px] uppercase tracking-widest font-semibold text-body-strong opacity-60">
                Personality Directive
              </label>
              <Textarea
                value={localSoul.personality}
                onChange={(e) => handleChange("personality", e.target.value)}
                className="min-h-[120px] bg-white/50 border-hairline focus:border-ink rounded-2xl resize-none leading-relaxed transition-all"
              />
            </section>

            <section className="flex flex-col gap-3">
              <label className="text-[10px] uppercase tracking-widest font-semibold text-body-strong opacity-60">
                Interests (Comma separated)
              </label>
              <Input
                value={localSoul.interests.join(", ")}
                onChange={(e) =>
                  handleChange(
                    "interests",
                    e.target.value.split(",").map((s) => s.trim())
                  )
                }
                className="bg-white/50 border-hairline focus:border-ink rounded-pill transition-all"
              />
            </section>

            <div className="grid grid-cols-2 gap-6">
              <section className="flex flex-col gap-3">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-body-strong opacity-60">
                  Speaking Pace
                </label>
                <select
                  value={localSoul.speaking_pace}
                  onChange={(e) => handleChange("speaking_pace", e.target.value)}
                  className="bg-white/50 border-hairline p-2 rounded-pill text-sm outline-none focus:border-ink transition-all"
                >
                  <option value="slow">Slow</option>
                  <option value="natural">Natural</option>
                  <option value="fast">Fast</option>
                </select>
              </section>

              <section className="flex flex-col gap-3">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-body-strong opacity-60">
                  Language
                </label>
                <select
                  value={localSoul.language}
                  onChange={(e) => handleChange("language", e.target.value)}
                  className="bg-white/50 border-hairline p-2 rounded-pill text-sm outline-none focus:border-ink transition-all"
                >
                  <option value="Hinglish">Hinglish</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </section>
            </div>

            <section className="flex flex-col gap-3">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-body-strong opacity-60">
                  Voice ID (ElevenLabs)
                </label>
                <Input
                  value={localSoul.elevenlabs_voice_id}
                  onChange={(e) => handleChange("elevenlabs_voice_id", e.target.value)}
                  className="bg-white/50 border-hairline focus:border-ink rounded-pill transition-all"
                />
              </section>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 bg-ink text-white rounded-pill hover:bg-ink/90 py-6 text-sm font-medium tracking-wide transition-all"
            >
              {saving ? "Synthesizing..." : "Save Configuration"}
            </Button>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
