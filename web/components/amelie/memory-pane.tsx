"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MemoryData } from "@/hooks/useAmelieConfig"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Brain, History, Sparkles } from "lucide-react"

interface MemoryPaneProps {
  memory: MemoryData | null
  activeHits?: string[]
}

export function MemoryPane({ memory, activeHits = [] }: MemoryPaneProps) {
  if (!memory) return null

  // Function to check if a fact or summary is being "hit" by Amélie's recall
  const isHit = (content: string) => {
    return activeHits.some(hit => content.toLowerCase().includes(hit.toLowerCase()) || hit.toLowerCase().includes(content.toLowerCase()))
  }

  return (
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-6">
        <CardTitle className="font-display text-2xl font-light tracking-tight text-ink flex items-center gap-2">
          Long-term Recall
        </CardTitle>
        <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-body opacity-40">
          What she knows about you
        </p>
      </CardHeader>
      <Separator className="bg-hairline" />
      
      <CardContent className="px-0 py-6 h-[calc(100vh-200px)]">
        <ScrollArea className="h-full pr-4">
          <div className="flex flex-col gap-10">
            {/* ── User Facts ────────────────────────────────────────────── */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Brain className="size-3.5 text-body opacity-60" />
                <h3 className="text-[10px] uppercase tracking-widest font-semibold text-body-strong opacity-60">
                  Core Personal Memory
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {memory.facts.length > 0 ? (
                    memory.facts.map((fact, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Badge
                          variant="secondary"
                          className={cn(
                            "bg-white/60 backdrop-blur-sm border-hairline text-ink px-4 py-2 rounded-pill font-normal text-xs shadow-sm transition-all cursor-default",
                            isHit(fact) ? "ring-2 ring-emerald-500/40 bg-emerald-50/80 scale-105 shadow-emerald-500/10" : "hover:bg-white/80"
                          )}
                        >
                          {fact}
                        </Badge>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-sm italic text-body opacity-40 py-4">
                      "I'm still getting to know you..."
                    </p>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* ── Session Summaries ─────────────────────────────────────── */}
            <section className="flex flex-col gap-4">
               <div className="flex items-center gap-2">
                <History className="size-3.5 text-body opacity-60" />
                <h3 className="text-[10px] uppercase tracking-widest font-semibold text-body-strong opacity-60">
                  Past Interactions
                </h3>
              </div>
              <div className="flex flex-col gap-4">
                {memory.summaries.length > 0 ? (
                  memory.summaries.map((s, i) => (
                    <motion.div
                      key={s.session_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={cn(
                        "group relative p-5 rounded-3xl border transition-all cursor-default",
                        isHit(s.summary) 
                          ? "bg-emerald-50/60 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5 scale-[1.02]" 
                          : "bg-white/40 border-hairline hover:bg-white/60"
                      )}
                    >
                      <span className="text-[9px] font-mono uppercase tracking-tighter text-body opacity-30 mb-2 block">
                        {new Date(s.timestamp).toLocaleDateString()} — {s.session_id.slice(0, 8)}
                      </span>
                      <p className="text-sm leading-relaxed text-body-strong font-light">
                        {s.summary}
                      </p>
                      <Sparkles className="absolute top-4 right-4 size-3 text-emerald-500 opacity-0 group-hover:opacity-40 transition-opacity" />
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm italic text-body opacity-40">
                    No past sessions recorded yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
