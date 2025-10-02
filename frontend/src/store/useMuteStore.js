import { create } from "zustand";
import { persist } from "zustand/middleware";

// Lưu ý: nếu có multi-account cùng trình duyệt, nên thêm tiền tố userId cho key.
const STORAGE_KEY = "konnect-mute-map"; // hoặc `konnect-mute-map:${currentUserId}`

export const useMuteStore = create(
  persist(
    (set, get) => ({
      map: {}, // { [conversationId]: true|false }

      isMuted: (conversationId) => !!get().map[conversationId],
      setMuted: (conversationId, muted) => {
        const next = { ...get().map, [conversationId]: !!muted };
        set({ map: next });
      },
      setBulk: (pairs) => {
        // pairs: [{conversationId, muted}]
        const next = { ...get().map };
        for (const p of pairs || []) next[p.conversationId] = !!p.muted;
        set({ map: next });
      },
      clear: () => set({ map: {} })
    }),
    { name: STORAGE_KEY, version: 1, partialize: (s) => ({ map: s.map }) }
  )
);
