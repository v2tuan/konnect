import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Smile, X } from "lucide-react"
import { setReaction } from "@/apis"

const defaultReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"]

export default function ReactionButton({messageId}) {
  const popupRef = useRef(null)
  const containerRef = useRef(null)

  const handleReactionClick = async (emoji) => {
    console.log(`Clicked: ${emoji} for message ${messageId}`)
    // Gọi API để gửi reaction
    await setReaction(messageId, emoji)
  }

  useEffect(() => {
    if (popupRef.current && containerRef.current) {
      const popup = popupRef.current
      const container = containerRef.current
      const popupRect = popup.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Reset styles trước
      popup.style.left = "50%"
      popup.style.right = "auto"
      popup.style.transform = "translateX(-50%)"

      // Đợi một frame để browser tính toán lại vị trí
      requestAnimationFrame(() => {
        const updatedRect = popup.getBoundingClientRect()

        // Kiểm tra tràn bên trái so với viewport VÀ container
        const overflowLeft = updatedRect.left < 0 || updatedRect.left < containerRect.left

        // Kiểm tra tràn bên phải so với viewport VÀ container
        const overflowRight = updatedRect.right > window.innerWidth || updatedRect.right > containerRect.right

        if (overflowLeft) {
          // Căn trái với container
          popup.style.left = "0"
          popup.style.transform = "translateX(0)"
        } else if (overflowRight) {
          // Căn phải với container
          popup.style.left = "auto"
          popup.style.right = "0"
          popup.style.transform = "translateX(0)"
        }
      })
    }
  }, [])

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Nút Smile */}
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 group"
      >
        <Smile className="w-3 h-3" />

        {/* cầu hover */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-50 h-12 pointer-events-none group-hover:pointer-events-auto"></div>

        {/* Popup reactions */}
        {(
          <div
            ref={popupRef}
            className="
      absolute opacity-0 group-hover:opacity-100
      pointer-events-none group-hover:pointer-events-auto
      transition-opacity duration-300 delay-500 ease-in-out
      -top-12 left-1/2 -translate-x-1/2
      flex gap-1 bg-background border
      px-3 py-2 rounded-full shadow-lg z-50
      whitespace-nowrap
    "
          >
            {defaultReactions.map((emoji) => (
              <button
                key={emoji}
                className="text-xl hover:scale-135 transition-transform"
                onClick={() => handleReactionClick(emoji)}
              >
                {emoji}
              </button>
            ))}
            <button
              className="hover:scale-135 transition-transform"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
        )}
      </Button>
    </div>
  )
}