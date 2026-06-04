"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  side?: "left" | "right"
  children: React.ReactNode
}

export function Drawer({ isOpen, onClose, side = "right", children }: DrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/5 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "right" ? "100%" : "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed inset-y-0 ${side === "right" ? "right-0" : "left-0"} w-full max-w-md bg-white border-l border-hairline shadow-2xl z-[101] p-8`}
          >
            <button
              onClick={onClose}
              className="absolute top-8 right-8 p-2 hover:bg-canvas rounded-full transition-colors opacity-40 hover:opacity-100"
            >
              <X className="size-5" />
            </button>
            <div className="h-full">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
