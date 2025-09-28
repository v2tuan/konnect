// lib/presence.js
const VIEW_TTL_MS = 60_000; // coi là đang xem nếu vừa focus trong 60s

export const presence = {
  online: new Map(),     // userId -> { sockets:Set<string>, lastActiveAt:Date }
  activeConv: new Map(), // userId -> { conversationId:string, ts:number }

  // ===== helpers (cho service khác gọi) =====
  isOnline(userId) {
    return this.online.has(String(userId));
  },
  isViewing(userId, conversationId, ttl = VIEW_TTL_MS) {
    const a = this.activeConv.get(String(userId));
    if (!a) return false;
    if (String(a.conversationId) !== String(conversationId)) return false;
    return (Date.now() - a.ts) <= ttl;
  },

  // ===== internal mutators (socket layer dùng) =====
  _setOnline(userId, socketId) {
    const uid = String(userId);
    let entry = this.online.get(uid);
    if (!entry) entry = { sockets: new Set(), lastActiveAt: new Date() };
    entry.sockets.add(socketId);
    entry.lastActiveAt = new Date();
    this.online.set(uid, entry);
  },
  _setOffline(userId, socketId) {
    const uid = String(userId);
    const entry = this.online.get(uid);
    if (!entry) return;
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) this.online.delete(uid);
  },
  _setActive(userId, conversationId) {
    this.activeConv.set(String(userId), {
      conversationId: String(conversationId),
      ts: Date.now(),
    });
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

/**
 * Đăng ký socket presence (ONLINE/OFFLINE) + focus/blur (internal only)
 * @param {import('socket.io').Server} io
 * @param {{ userService: { markUserStatus: (userId: string, payload: {isOnline:boolean, lastActiveAt:Date}) => any } }} deps
 */
export function registerPresence(io, { userService }) {
  io.on('connection', (socket) => {
    const authedUserId =
      socket.user?.id ||
      socket.user?._id ||
      socket.handshake?.auth?.userId ||
      null;

    // Tự join user-room nếu server đã biết userId từ middleware
    if (authedUserId) {
      socket.join(`user:${String(authedUserId)}`);
      presence._setOnline(authedUserId, socket.id);

      // lần đầu online → cập nhật DB + broadcast ONLINE
      const entry = presence.online.get(String(authedUserId));
      if (entry?.sockets?.size === 1) {
        const now = new Date();
        Promise.resolve(userService.markUserStatus(authedUserId, { isOnline: true, lastActiveAt: now })).catch(() => {});
        io.emit('presence:update', {
          userId: String(authedUserId),
          isOnline: true,
          lastActiveAt: now.toISOString()
        });
      }
    }

    // Client vẫn có thể chủ động gửi user:join (không bắt buộc nếu middleware đã set)
    socket.on('user:join', ({ userId }) => {
      const uid = String(userId || authedUserId || '');
      if (!uid) return;
      socket.join(`user:${uid}`);
      presence._setOnline(uid, socket.id);

      const entry = presence.online.get(uid);
      if (entry?.sockets?.size === 1) {
        const now = new Date();
        Promise.resolve(userService.markUserStatus(uid, { isOnline: true, lastActiveAt: now })).catch(() => {});
        io.emit('presence:update', { userId: uid, isOnline: true, lastActiveAt: now.toISOString() });
      }
    });

    // Heartbeat / snapshot (optional)
    socket.on('presence:heartbeat', () => {
      const uid = String(authedUserId || '');
      if (!uid) return;
      const entry = presence.online.get(uid);
      if (entry) entry.lastActiveAt = new Date();
    });

    socket.on('presence:snapshot', (userIds = []) => {
      const payload = (Array.isArray(userIds) ? userIds : []).map((raw) => {
        const uid = String(raw);
        const entry = presence.online.get(uid);
        return {
          userId: uid,
          isOnline: !!entry,
          lastActiveAt: entry?.lastActiveAt?.toISOString() || null
        };
      });
      socket.emit('presence:snapshot', payload);
    });

    // Join room hội thoại (để nhận message:new)
    socket.on('conversation:join', ({ conversationId }) => {
      if (!conversationId) return;
      socket.join(`conversation:${String(conversationId)}`);
    });

    // Focus/blur: chỉ cập nhật state server-side, KHÔNG broadcast global
    socket.on('conversation:focus', ({ conversationId }) => {
      const uid = String(authedUserId || '');
      if (!uid || !conversationId) return;
      presence._setActive(uid, conversationId);
    });
    socket.on('conversation:blur', ({ conversationId }) => {
      const uid = String(authedUserId || '');
      if (!uid) return;
      presence._clearActive(uid, conversationId);
    });

    socket.on('disconnect', () => {
      const uid = String(authedUserId || '');
      if (!uid) return;

      presence._setOffline(uid, socket.id);

      // Khi user hoàn toàn offline (không còn socket nào) → broadcast OFFLINE
      if (!presence.isOnline(uid)) {
        presence._clearActive(uid);
        const lastActiveAt = new Date();
        Promise.resolve(userService.markUserStatus(uid, { isOnline: false, lastActiveAt })).catch(() => {});
        io.emit('presence:update', {
          userId: uid,
          isOnline: false,
          lastActiveAt: lastActiveAt.toISOString()
        });
      }
    });
  });
}

// Giữ export này để các service import đúng như trước
export const presenceSingleton = presence;
export default presence;
