// components/common/Notification/NotificationsBridge.jsx
import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { toast } from "react-toastify"
import { useUnreadStore } from "@/store/useUnreadStore"
import { getSocket, connectSocket } from "@/lib/socket"

// audio unlock
let pingAudio
function ensureAudio() {
  if (!pingAudio) {
    pingAudio = new Audio("/public/iphone-sms.mp3") // nhớ file nằm /public/sounds/iphone-sms.mp3
    pingAudio.preload = "auto"
    try { pingAudio.load() } catch { /* empty */ }
  }
  return pingAudio
}
let audioUnlocked = false
function primeAudioOnce() {
  if (audioUnlocked) return
  const a = ensureAudio()
  a.volume = 0
  a.currentTime = 0
  a.play().then(() => {
    a.pause()
    a.volume = 1
    audioUnlocked = true
  }).catch(() => {})
}
function playPing() {
  try {
    const a = ensureAudio()
    a.currentTime = 0
    a.play().catch(() => {})
  } catch { /* empty */ }
}

function getActiveConvIdFromPath(pathname) {
  const m = pathname.match(/^\/chats\/([^/]+)$/)
  return m ? m[1] : null
}
function deriveSenderMeta({ notif, msg, usersById }) {
  if (notif) {
    return {
      name: notif.senderName || notif?.extra?.senderName || "Tin nhắn mới",
      avatar: notif.senderAvatar || notif?.extra?.senderAvatar || ""
    }
  }
  if (msg) {
    const senderId = (msg.senderId && (msg.senderId._id || msg.senderId)) || msg.senderId
    const u = usersById?.[String(senderId)]
    if (u) return { name: u.fullName || u.username || "Tin nhắn mới", avatar: u.avatarUrl || "" }
  }
  return { name: "Tin nhắn mới", avatar: "" }
}

export default function NotificationsBridge() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useSelector(s => s.user.currentUser)
  const usersById = useSelector(s => s.user.usersById || {})
  const setUnread = useUnreadStore(s => s.setUnread)

  const attachedRef = useRef(false)
  const dedupeRef = useRef(new Set())

  const activeConvId = getActiveConvIdFromPath(location.pathname)
  const myId = String(currentUser?._id || "")

  // unlock audio on first gesture
  useEffect(() => {
    const onFirst = () => primeAudioOnce()
    window.addEventListener("pointerdown", onFirst, { once: true })
    window.addEventListener("keydown", onFirst, { once: true })
    return () => {
      window.removeEventListener("pointerdown", onFirst)
      window.removeEventListener("keydown", onFirst)
    }
  }, [])

  // ensure socket connected once we have user
  useEffect(() => {
    if (!currentUser?._id) return
    const s = connectSocket(currentUser._id)
    s.once("connect", () => {
      // toast nhỏ xác nhận
      toast.dismiss("__bridge_ready__")
      toast("🔔 Notifications ready", { toastId: "__bridge_ready__", autoClose: 1200 })
      // phòng khi user thay đổi
      s.emit("user:join", { userId: String(currentUser._id) })
    })
  }, [currentUser?._id])

  useEffect(() => {
    if (!currentUser?._id) return
    const socket = getSocket()
    if (!socket) return
    if (attachedRef.current) return
    attachedRef.current = true

    const handleIncoming = (kind, payload) => {
      const convId =
        payload?.conversationId?.toString?.() ||
        payload?.conversation?._id ||
        payload?.conversation ||
        null
      const msg = payload?.message || payload?.msg || null
      const notif = msg ? null : payload
      if (!convId) return

      // dedupe
      const key = msg ? `m:${msg?._id || msg?.id || ""}` : `n:${notif?._id || ""}`
      if (key && dedupeRef.current.has(key)) return
      if (key) { dedupeRef.current.add(key); setTimeout(() => dedupeRef.current.delete(key), 12000) }

      // skip mine / active room
      const senderIdRaw = msg
        ? (msg?.senderId && (msg.senderId._id || msg.senderId)) || msg?.senderId
        : notif?.extra?.senderId
      const senderId = String(senderIdRaw || "")
      const isMine = myId && senderId && myId === senderId
      const isActive = activeConvId && String(activeConvId) === String(convId)
      if (isMine || isActive) return

      // bump badge
      const curr = (useUnreadStore.getState().map?.[convId]) || 0
      setUnread(convId, curr + 1)

      // render data
      const { name, avatar } = deriveSenderMeta({ notif, msg, usersById })
      let preview = "Tin nhắn mới"
      if (msg) {
        if (msg?.body?.text) preview = String(msg.body.text).slice(0, 80)
        else if (msg?.type === "image") preview = "Đã gửi 1 ảnh"
        else if (msg?.type === "file") preview = "Đã gửi 1 tệp"
        else if (msg?.type === "audio") preview = "Đã gửi 1 audio"
      } else {
        preview = notif?.content || "Bạn có tin nhắn mới"
      }

      // sound
      playPing()

      // toast
      toast(
        <div
          onClick={() => navigate(`/chats/${convId}`)}
          style={{ cursor: "pointer", display: "flex", gap: 10, alignItems: "center", maxWidth: 320 }}
        >
          {avatar ? (
            <img src={avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700
            }}>
              {name?.[0]?.toUpperCase() || "@"}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 2, lineHeight: 1.15 }}>{name}</div>
            <div style={{
              fontSize: 13, opacity: 0.9, lineHeight: 1.2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
            }} title={preview}>
              {preview}
            </div>
          </div>
        </div>,
        { autoClose: 4000 }
      )
    }

    const onMessageNew = (p) => handleIncoming("message:new", p)
    const onNotifNew = (p) => handleIncoming("notification:new", p)

    socket.on("message:new", onMessageNew)
    socket.on("notification:new", onNotifNew)

    socket.on("connect", () => {
      // rejoin user room nếu refresh token/phiên mới
      const uid = String(currentUser._id)
      socket.emit("user:join", { userId: uid })
    })

    socket.on("disconnect", () => {
      // cho phép attach lại sau khi reconnect
      attachedRef.current = false
    })

    return () => {
      socket.off("message:new", onMessageNew)
      socket.off("notification:new", onNotifNew)
      attachedRef.current = false
    }
  }, [currentUser?._id, myId, activeConvId, usersById, navigate, setUnread])

  return null
}
