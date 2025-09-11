import { useSidebar } from "@/components/ui/sidebar"

export function ChatSidePanel({ activeMenu, children, width = "w-80" }) {
  const { open } = useSidebar()
  if (activeMenu !== "Message") return null

  return (
    <div
      className={[
        "border-r bg-background transition-[width] duration-200 ease-in-out overflow-hidden",
        open ? width : "w-0"
      ].join(" ")}
    >
      {/* Chỉ render children khi open để tránh tab-focus/scroll lộ ra khi w-0 */}
      {open ? children : null}
    </div>
  )
}
