// lib/presence.js
const VIEW_TTL_MS = 60_000; // coi là "đang xem" nếu focus trong vòng 60s

export const presence = {
  online: new Map(),     // userId -> { sockets:Set, lastActiveAt:Date }
  activeConv: new Map(), // userId -> { conversationId, ts }

  // ---- helpers (cho service khác gọi) ----
  isOnline(userId) {
    return this.online.has(String(userId));
  },
  isViewing(userId, conversationId, ttl = VIEW_TTL_MS) {
    const a = this.activeConv.get(String(userId));
    if (!a) return false;
    if (String(a.conversationId) !== String(conversationId)) return false;
    return (Date.now() - a.ts) <= ttl;
  },

  // ---- internal mutators (chỉ dùng trong socket layer) ----
  _setOnline(userId, socketId) {
    userId = String(userId);
    let entry = this.online.get(userId);
    if (!entry) entry = {sockets: new Set(), lastActiveAt: new Date()};
    entry.sockets.add(socketId);
    entry.lastActiveAt = new Date();
    this.online.set(userId, entry);
  },
  _setOffline(userId, socketId) {
    userId = String(userId);
    const entry = this.online.get(userId);
    if (!entry) return;
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) this.online.delete(userId);
  },
  _setActive(userId, conversationId) {
    this.activeConv.set(String(userId), {conversationId: String(conversationId), ts: Date.now()});
  },
  _clearActive(userId, conversationIdMaybe) {
    const uid = String(userId);
    if (!this.activeConv.has(uid)) return;
    if (conversationIdMaybe) {
      const cur = this.activeConv.get(uid);
      if (cur && String(cur.conversationId) !== String(conversationIdMaybe)) return;
    }
    this.activeConv.delete(uid);
  }
};

// Đăng ký toàn bộ socket event liên quan presence + focus
export function registerPresence(io, {userService}) {
  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (userId) {
      socket.join(`user:${userId}`);
      presence._setOnline(userId, socket.id);

      // lần đầu online -> cập nhật DB + broadcast
      if (presence.online.get(String(userId))?.sockets.size === 1) {
        const now = new Date();
        userService.markUserStatus(userId, {isOnline: true, lastActiveAt: now});
        io.emit('presence:update', {userId, isOnline: true, lastActiveAt: now.toISOString()});
      }
    }

    // Snapshot / heartbeat
    socket.on('presence:snapshot', (userIds = []) => {
      const payload = userIds.map(uid => {
        const entry = presence.online.get(String(uid));
        return {userId: uid, isOnline: !!entry, lastActiveAt: entry?.lastActiveAt?.toISOString() || null};
      });
      socket.emit('presence:snapshot', payload);
    });
    socket.on('presence:heartbeat', () => {
      if (!userId) return;
      const entry = presence.online.get(String(userId));
      if (entry) entry.lastActiveAt = new Date();
    });

    // Room hội thoại + focus/blur
    socket.on('conversation:join', ({conversationId}) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });
    socket.on('conversation:focus', ({conversationId}) => {
      if (!userId || !conversationId) return;
      presence._setActive(userId, conversationId);
    });
    socket.on('conversation:blur', ({conversationId}) => {
      if (!userId) return;
      presence._clearActive(userId, conversationId);
    });

    socket.on('disconnect', () => {
      if (!userId) return;
      presence._setOffline(userId, socket.id);
      if (!presence.isOnline(userId)) {
        // clear focus khi user hoàn toàn offline
        presence._clearActive(userId);
        const lastActiveAt = new Date();
        userService.markUserStatus(userId, {isOnline: false, lastActiveAt});
        io.emit('presence:update', {userId, isOnline: false, lastActiveAt: lastActiveAt.toISOString()});
      }
    });
  });
}
