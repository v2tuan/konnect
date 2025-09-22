// stores/useUnreadStore.js
import { create } from "zustand"

function calcTotalConversations(map) {
  return Object.values(map).reduce((acc, n) => acc + (n > 0 ? 1 : 0), 0)
}

export const useUnreadStore = create((set, get) => ({
  // map: { [conversationId]: unreadNumber }
  map: {},
  // tổng số cuộc trò chuyện có unread > 0 (hiện badge ở icon Message)
  totalConversations: 0,

  setUnread: (conversationId, unread) => {
    const map = { ...get().map, [conversationId]: Math.max(0, unread || 0) }
    set({ map, totalConversations: calcTotalConversations(map) })
  },

  setBulk: (items) => {
    const next = { ...get().map }
    for (const it of items || []) {
      next[it.conversationId] = Math.max(0, it.unread || 0)
    }
    set({ map: next, totalConversations: calcTotalConversations(next) })
  },

  resetConversation: (conversationId) => {
    const map = { ...get().map, [conversationId]: 0 }
    set({ map, totalConversations: calcTotalConversations(map) })
  },

  clearAll: () => set({ map: {}, totalConversations: 0 })
}))
