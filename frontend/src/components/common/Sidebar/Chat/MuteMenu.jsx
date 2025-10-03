// components/chat/MuteMenu.jsx
import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"; // no .jsx extension
import { muteConversation, unmuteConversation } from "@/apis";
import { useMuteStore } from "@/store/useMuteStore";

export default function MuteMenu({ conversationId }) {
  const isMutedLocal = useMuteStore((s) => s.isMuted(conversationId));
  const setMutedLocal = useMuteStore((s) => s.setMuted);
  const [loading, setLoading] = useState(false);

  async function handleMute(duration) {
    if (!conversationId || loading) return;
    setLoading(true);
    setMutedLocal(conversationId, true); // optimistic
    try {
      await muteConversation(conversationId, duration); // 2|4|8|12|24|"forever"
    } catch {
      setMutedLocal(conversationId, false);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnmute() {
    if (!conversationId || loading) return;
    setLoading(true);
    setMutedLocal(conversationId, false);
    try {
      await unmuteConversation(conversationId);
    } catch {
      setMutedLocal(conversationId, true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={loading}
          // 🔽 stack vertically + fixed width so text wraps instead of clipping
          className="
            shrink-0 h-auto px-2 py-3
            inline-flex flex-col items-center justify-center gap-1
            w-28 text-center whitespace-normal break-words leading-tight
          "
          title={isMutedLocal ? "Notifications off" : "Mute"}
        >
          <Bell className="h-6 w-6" />
          <span className="text-xs">
            {isMutedLocal ? "Notifications off" : "Mute"}
          </span>
        </Button>
      </DropdownMenuTrigger>

      {/* Renders in a portal → won’t be clipped by the panel */}
      <DropdownMenuContent
        side="left"
        align="end"
        sideOffset={8}
        className="z-50 min-w-44"
      >
        {isMutedLocal ? (
          <DropdownMenuItem onClick={handleUnmute}>
            Turn on notifications
          </DropdownMenuItem>
        ) : (
          <>
            {[2, 4, 8, 12, 24].map((h) => (
              <DropdownMenuItem key={h} onClick={() => handleMute(h)}>
                Mute for {h} hours
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleMute("forever")}>
              Mute indefinitely
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
