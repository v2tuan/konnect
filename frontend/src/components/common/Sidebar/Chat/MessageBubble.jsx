import { useEffect, useMemo, useState } from "react"
import {
  Pin,
  Reply,
  MoreHorizontal,
  Clock,
  Check,
  CheckCheck,
  FileText,
  FileSpreadsheet,
  Archive,
  Video as VideoIcon,
  Music,
  File,
  Download
} from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ReactionButton from "./ReactionButton"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deleteMessageForMeAPI, getDisplayUsers, recallMessageAPI } from "@/apis"

/** Helpers */
const mediaUrl = (m, message) => m?.secure_url || m?.url || message?.body?.media?.url || ""
import { set } from "date-fns"

function processReactions(reactions = []) {
  const emojiCountMap = {}
  const userEmojiMap = {}
  reactions.forEach(({ userId, emoji }) => {
    if (!emoji) return
    emojiCountMap[emoji] = (emojiCountMap[emoji] || 0) + 1
    if (!userEmojiMap[userId]) userEmojiMap[userId] = { emoji: [], count: 0 }
    if (!userEmojiMap[userId].emoji.includes(emoji)) userEmojiMap[userId].emoji.push(emoji)
    userEmojiMap[userId].count += 1
  })
  const topEmojis = Object.entries(emojiCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emoji, count]) => ({ emoji, count }))
  return { topEmojis, userEmojiMap, emojiCountMap }
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/* === Mentions helpers === */
function renderMessageWithMentions(text = "", mentions = []) {
  if (!mentions?.length) return [text]
  const parts = []
  let i = 0
  for (const mt of mentions) {
    const before = text.slice(i, mt.start)
    if (before) parts.push(before)
    parts.push(
      <span key={`${mt.start}-${mt.end}`} className="text-primary font-medium">
        {mt.name}
      </span>
    )
    i = mt.end
  }
  const tail = text.slice(i)
  if (tail.trim().length) parts.push(tail)
  return parts
}
function escapeRe(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
}
function findMentionsFromMembers(text = "", conversation) {
  if (conversation?.type !== "group") return []
  const names = (conversation?.group?.members || [])
    .map(m => (m.fullName || m.username || m.name || "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
  if (!names.length) return []
  const re = new RegExp(`@(?:${names.join("|")})(?=\\b)`, "g")
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    const raw = m[0]
    out.push({ raw, name: raw.slice(1), start: m.index, end: m.index + raw.length })
  }
  return out
}
/* === End mentions helpers === */

export function MessageBubble({
  message,
  onOpenViewer,
  showAvatar,
  contact,
  showMeta = true,
  conversation,
  setReplyingTo,
  currentUser,
  onAvatarClick,
  nickById
}) {
  const [hovered, setHovered] = useState(false)
  const [open, setOpen] = useState(false)
  const isOwn = !!message?.isOwn
  const isGroup = conversation?.type === "group"
  const { topEmojis, userEmojiMap, emojiCountMap } = useMemo(
    () => processReactions(message?.reactions || []),
    [message?.reactions]
  )

  // Lightbox (optional modal preview)
  const [preview, setPreview] = useState({ open: false, url: "", type: "image" })

  // System
  const SYSTEM_ID_FALLBACK = "000000000000000000000000"
  const sysSid = (message?.sender?._id || message?.senderId || "").toString()
  const sysName = (message?.sender?.fullName || message?.sender?.username || "").trim().toLowerCase()
  const isSystemMessage = sysName === "system" || sysSid === SYSTEM_ID_FALLBACK

  // Fetch display users for reactions
  const [usersData, setUsersData] = useState({})
  useEffect(() => {
    const ids = Object.keys(userEmojiMap || {})
    if (!ids.length) {
      setUsersData({})
      return
    }
    ;(async () => {
      try {
        const users = await getDisplayUsers(ids)
        const m = {}
        ;(users || []).forEach(u => (m[u.id || u._id] = u))
        setUsersData(m)
      } catch (e) {
        console.error("Failed to fetch users for reactions", e)
      }
    })()
  }, [userEmojiMap])

  function getMemberById(conversation, id) {
    const mems = conversation?.group?.members || []
    return mems.find(u => String(u.id || u._id) === String(id)) || null
  }

  const resolveSender = () => {
    const type = conversation?.type
    if (type === "group") {
      if (message?.sender) {
        const s = message.sender
        return {
          _id: s._id || s.id || message.senderId || null,
          fullName: s.fullName || s.username || "User",
          username: s.username || null,
          avatarUrl: s.avatarUrl || null,
          status: s.status || null
        }
      }
      const sid = message?.senderId
      if (!sid) return null
      const m = getMemberById(conversation, sid)
      if (m) {
        return {
          _id: m._id || m.id,
          fullName: m.fullName || m.username || "User",
          username: m.username || null,
          avatarUrl: m.avatarUrl || null,
          status: m.status || null
        }
      }
      return { _id: sid, fullName: "User", username: null, avatarUrl: null, status: null }
    }
    if (type === "direct") {
      const meId = String(currentUser?._id || "")
      const senderIsMe = String(message?.senderId || "") === meId
      return senderIsMe ? currentUser : conversation?.direct?.otherUser || null
    }
    if (type === "cloud") return currentUser || null
    return null
  }

  const sender = resolveSender()
  const senderName = sender?.fullName || sender?.username || "User"

  // nickname-aware display name
  const senderDisplay = useMemo(
    () => getDisplayName({ message, conversation, currentUser, nickById }),
    [message, conversation, currentUser, nickById]
  )

  function getDisplayName({ message, conversation, currentUser, nickById }) {
    const s = message?.sender
    let sid_raw = s?._id || s?.id || message?.senderId

    // chuẩn hoá sid nếu populate lồng object
    if (sid_raw && typeof sid_raw === "object" && sid_raw._id) {
      sid_raw = sid_raw._id
    }
    const sid = String(sid_raw || "")

    // 1) Ưu tiên nickname trong group
    if (conversation?.type === "group") {
      if (sid && nickById?.get?.(sid)) return nickById.get(sid)

      const mem = (conversation?.group?.members || []).find(m => String(m.id || m._id) === sid)
      if (mem?.nickname) return mem.nickname
    }

    // 2) displayName / fullName / username từ sender
    if (s?.displayName) return s.displayName
    if (s?.fullName || s?.username) return s.fullName || s.username

    // 3) direct: nếu là mình thì "You"
    if (conversation?.type === "direct") {
      const meId = String(currentUser?._id || "")
      const isMe = sid === meId
      if (isMe) return currentUser?.fullName || currentUser?.username || "You"
      const other = conversation?.direct?.otherUser
      if (other) return other.nickname || other.fullName || other.username || "User"
    }

    // 4) fallback từ members
    if (sid) {
      const mem = (conversation?.group?.members || []).find(m => String(m.id || m._id) === sid)
      if (mem) return mem.fullName || mem.username || "User"
    }
    return "User"
  }

  const formatTime = ts => {
    if (!ts) return ""
    try {
      const d = typeof ts === "string" || typeof ts === "number" ? new Date(ts) : ts
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return ""
    }
  }

  const StatusIcon = () => {
    if (!isOwn) return null
    const s = message.status || message.deliveryStatus
    if (s === "sending") return <Clock className="w-3 h-3 opacity-70" />
    if (s === "read") return <CheckCheck className="w-3.5 h-3.5 opacity-70" />
    return <Check className="w-3.5 h-3.5 opacity-70" />
  }

  const handleDownload = async (url, filename) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename || "download"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error("Download failed", err)
    }
  }

  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })

  const { images, videos, files, audios } = useMemo(() => {
    const list = Array.isArray(message?.media) ? message.media : []
    return {
      images: list.filter(m => (m?.type || "").toLowerCase() === "image"),
      videos: list.filter(m => (m?.type || "").toLowerCase() === "video"),
      audios: list.filter(m => (m?.type || "").toLowerCase() === "audio"),
      files: list.filter(m => (m?.type || "").toLowerCase() === "file")
    }
  }, [message?.media])

  // mentions
  const text = message?.body?.text || message?.text || ""
  let mentions = message?.body?.mentions || message?.mentions || []
  if ((!mentions || mentions.length === 0) && isGroup) {
    mentions = findMentionsFromMembers(text, conversation)
  }

  // context menu + detail dialog
  const [showMenu, setShowMenu] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  // gửi request delete/recall
  async function handleAction(action) {
    try {
      const messageId = message._id || message.id
      const conversationId = message.conversationId || conversation?._id

      if (!messageId || !conversationId) {
        console.warn("Missing ids for message action", { messageId, conversationId })
        return
      }

      if (action === "delete") {
        await deleteMessageForMeAPI({ messageId, conversationId })
        // Ẩn tin nhắn đối với mình
        setLocallyDeleted(true)
      }

      if (action === "recall") {
        await recallMessageAPI({ messageId, conversationId })
        // cập nhật UI local ngay
        optimisticSetRecalled({
          id: messageId,
          text: "Message was recalled"
        })
      }
    } catch (err) {
      console.error("Delete/Recall failed", err)
    } finally {
      setShowMenu(false)
    }
  }

  // local state cho việc ẩn tin nhắn khi "Delete"
  const [locallyDeleted, setLocallyDeleted] = useState(false)

  // local optimistic recall helper
  function optimisticSetRecalled({ id, text }) {
    // nếu message hiện tại trùng id thì mutate tạm
    if (String(id) === String(message._id || message.id)) {
      setRecallView({
        recalled: true,
        text: text || "Message was recalled"
      })
    }
  }

  const [recallView, setRecallView] = useState(
    message?.recalled
      ? { recalled: true, text: "Message was recalled" }
      : { recalled: false, text: "" }
  )

  if (locallyDeleted) return null

  // ====== Reply block data (UI nâng cấp kiểu Zalo nhưng vẫn giữ logic nickname) ======
  const replyDisplayName = (() => {
    if (!message?.repliedMessage) return "User"
    // cố gắng map nickById nếu có
    const rid =
      message.repliedMessage?.senderId?._id ||
      message.repliedMessage?.senderId?.id ||
      message.repliedMessage?.senderId
    if (rid && nickById?.get?.(String(rid))) {
      return nickById.get(String(rid))
    }
    const ru = message.repliedMessage?.senderId
    return ru?.fullName || ru?.username || "User"
  })()

  const replyPreviewText = (() => {
    if (!message?.repliedMessage) return ""

    const rm = message.repliedMessage

    // nếu backend có rm.type
    if (rm.type === "text") {
      return rm.body?.text || rm.text || ""
    }
    if (rm.type === "image") return "[Image]"
    if (rm.type === "file") return "[File]"
    if (rm.type === "audio") return "[Audio]"

    // fallback kiểu code mới: xem media array
    if (Array.isArray(rm.media) && rm.media.length > 0) {
      const imgs = rm.media.filter(m => m.type === "image")
      const filesArr = rm.media.filter(m => m.type === "file")
      const auds = rm.media.filter(m => m.type === "audio")
      if (imgs.length > 0) return "[Image]"
      if (filesArr.length > 0) return "[File]"
      if (auds.length > 0) return "[Audio]"
    }

    // hoặc text field cũ
    return rm.text || rm.body?.text || ""
  })()

  // Grid class for image+video
  const gridMedias = [...images, ...videos]
  const gridClass =
    gridMedias.length === 1
      ? "flex justify-center"
      : gridMedias.length === 2
      ? "grid grid-cols-2 gap-2"
      : gridMedias.length <= 4
      ? "grid grid-cols-2 gap-2 max-w-md"
      : "grid grid-cols-3 gap-2 max-w-lg"

  return (
    <div
      className={`flex gap-2 ${
        Array.isArray(message?.reactions) && message.reactions.length > 0 ? "mb-4" : "mb-2"
      } ${isSystemMessage ? "justify-center" : isOwn ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
      }}
    >
      {!isSystemMessage && !isOwn && showAvatar && (
        <button
          type="button"
          onClick={() => sender && onAvatarClick?.(sender)}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label={`Open profile of ${senderName}`}
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={sender?.avatarUrl} />
            <AvatarFallback>
              {(senderDisplay || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      )}

      <div
        className={`relative ${
          isSystemMessage ? "max-w-[80%]" : "max-w-[78%]"
        } ${isOwn ? "order-first" : ""}`}
      >
        {isGroup && !isOwn && !isSystemMessage && (
          <div className="mb-1 ml-1 text-[11px] font-medium text-gray-500">
            {senderDisplay}
          </div>
        )}

        {!isSystemMessage && (
          <div
            className={`pointer-events-auto absolute top-1/2 -translate-y-1/2 ${
              isOwn ? "-left-22" : "-right-22"
            } opacity-0 transition-opacity duration-150 ${
              hovered ? "opacity-100" : "opacity-0"
            } flex items-center gap-1 z-[100]`}
          >
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => {
                const images = message.media?.filter(m => m.type === "image") || []
                const files = message.media?.filter(m => m.type === "file") || []
                const audios = message.media?.filter(m => m.type === "audio") || []
                setReplyingTo({
                  sender: message?.isOwn
                    ? "You"
                    : sender?.fullName || sender?.username || "User",
                  content:
                    (files.length > 0
                      ? files[0]?.metadata?.filename
                      : images.length > 0
                      ? "[Image]"
                      : audios.length > 0
                      ? "[Audio]"
                      : "") ||
                    message.text ||
                    message.body?.text,
                  media: message.media?.length > 0 ? message.media : null,
                  messageId: message.id
                })
              }}
            >
              <Reply className="w-3 h-3" />
            </Button>

            <ReactionButton messageId={message.id || message._id} />

            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={e => {
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  // đặt menu ngay dưới nút
                  setMenuPos({
                    x: rect.right,
                    y: rect.bottom + 4
                  })
                  setShowMenu(prev => !prev)
                }}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          {isSystemMessage ? (
            <div className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs text-center whitespace-pre-wrap">
              {renderMessageWithMentions(text, mentions)}
            </div>
          ) : (
            <>
              {/* MEDIA (images/videos) */}
              {gridMedias.length > 0 && (
                <div className="space-y-2">
                  <div className={gridClass}>
                    {gridMedias.map((media, index) => (
                      <button
                        type="button"
                        key={media._id || media.url || `media-${index}`}
                        className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
                        onClick={() => onOpenViewer?.(media)}
                      >
                        {message.isPinned && (
                          <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-500 z-10" />
                        )}

                        {(media.type || "").toLowerCase() === "image" ? (
                          <img
                            src={media.url || mediaUrl(media, message)}
                            alt={media.metadata?.filename || "message attachment"}
                            className="w-full h-full object-cover group-hover:brightness-75 transition-all"
                          />
                        ) : (
                          <video
                            src={media.url || mediaUrl(media, message)}
                            className="w-full h-full object-cover group-hover:brightness-75 transition-all"
                            muted
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FILES */}
              {files.length > 0 && (
                <div className="space-y-1 mt-2">
                  {files.map((m, i) => {
                    const mimetype = m?.metadata?.mimetype || ""
                    const filename = m?.metadata?.filename || "Unknown file"
                    const sizeText = formatFileSize(m?.metadata?.size)
                    const url = mediaUrl(m, message)
                    const Icon =
                      mimetype.includes("pdf")
                        ? FileText
                        : mimetype.includes("word") ||
                          mimetype.includes("document")
                        ? FileText
                        : mimetype.includes("sheet") ||
                          mimetype.includes("excel")
                        ? FileSpreadsheet
                        : mimetype.includes("zip") ||
                          mimetype.includes("rar") ||
                          mimetype.includes("archive")
                        ? Archive
                        : mimetype.includes("video")
                        ? VideoIcon
                        : mimetype.includes("audio")
                        ? Music
                        : File

                    return (
                      <div
                        key={m._id || m.url || `file-${i}`}
                        className={`flex items-center justify-between gap-3 rounded-lg border p-2 ${
                          isOwn
                            ? "ml-auto bg-primary/5"
                            : "mr-auto bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-5 h-5 opacity-70" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {filename}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {mimetype || "file"} · {sizeText}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {message.isPinned && (
                            <Pin className="w-3 h-3 text-yellow-500" />
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(url, filename)}
                            className="h-8 w-8 p-0"
                            aria-label="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* AUDIO */}
              {audios.length > 0 && (
                <div className="space-y-2 mt-2">
                  {audios.map((m, index) => (
                    <div
                      key={m._id || m.url || `audio-${index}`}
                      className={`flex items-center gap-2 p-2 max-w-xs rounded-sm ${
                        isOwn
                          ? "ml-auto bg-primary/10 border border-primary rounded-l-lg rounded-tr-lg"
                          : "mr-auto bg-gray-100 text-black rounded-r-lg rounded-tl-lg"
                      } shadow-sm`}
                    >
                      <audio controls className="flex-1 min-w-0">
                        <source
                          src={m.url || mediaUrl(m, message)}
                          type={m.metadata?.mimetype || "audio/webm"}
                        />
                        Your browser does not support the audio element.
                      </audio>
                      {message.isPinned && (
                        <Pin className="w-4 h-4 text-yellow-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TEXT ONLY (và reply block đẹp) */}
              {gridMedias.length === 0 &&
                files.length === 0 &&
                audios.length === 0 && (
                  <div
                    className={`relative p-3 rounded-sm ${
                      isOwn
                        ? "bg-primary/10 border border-primary rounded-br-sm"
                        : "bg-secondary text-secondary-foreground rounded-bl-sm"
                    }`}
                  >
                    {message.isPinned && (
                      <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-500" />
                    )}

                    {/* Reply block - UI mới nhưng vẫn giữ nickname logic */}
                    {message.repliedMessage && (
                      <div className="mb-2 cursor-pointer rounded-md border border-border bg-muted/40 overflow-hidden">
                        <div className="flex">
                          {/* thanh màu bên trái */}
                          <div className="w-1.5 bg-primary flex-shrink-0" />
                          <div className="flex-1 px-2 py-2 min-w-0">
                            <div className="text-[12px] font-semibold text-foreground leading-tight line-clamp-1 break-words">
                              {replyDisplayName}
                            </div>
                            <div className="text-[12px] text-muted-foreground leading-snug line-clamp-2 break-words">
                              {replyPreviewText || " "}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-sm whitespace-pre-wrap break-words">
                      {recallView.recalled ? (
                        <span className="italic text-gray-500">
                          Message was recalled
                        </span>
                      ) : (
                        renderMessageWithMentions(text, mentions)
                      )}
                    </p>
                  </div>
                )}

              {/* Reactions badge */}
              {Array.isArray(message?.reactions) &&
                message.reactions.length > 0 && (
                  <div
                    className="absolute -bottom-2 right-2 cursor-pointer shadow-sm rounded-full border bg-background"
                    onClick={() => setOpen(true)}
                  >
                    <Badge variant="secondary" className="text-xs flex gap-1">
                      {topEmojis.map(r => r.emoji).join(" ")}{" "}
                      {message.reactions.length}
                    </Badge>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Lightbox */}
        <Dialog
          open={preview.open}
          onOpenChange={o => setPreview(p => ({ ...p, open: o }))}
        >
          <DialogContent className="p-0 sm:max-w-[80vw]">
            <div className="w-full h-full max-h-[80vh] flex items-center justify-center bg-black">
              {preview.type === "video" ? (
                <video
                  src={preview.url}
                  controls
                  className="max-w-full max-h-[80vh]"
                  autoPlay
                />
              ) : (
                <img
                  src={preview.url}
                  alt="preview"
                  className="max-w-full max-h-[80vh]"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Reactions Dialog */}
        {!isSystemMessage && (
          <ReactionsDialog
            open={open}
            setOpen={setOpen}
            emojiCountMap={emojiCountMap}
            userEmojiMap={userEmojiMap}
            usersData={usersData}
            total={(message?.reactions || []).length}
          />
        )}

        {showMenu && (
          <>
            {/* backdrop trong suốt để click ra ngoài đóng menu */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setShowMenu(false)}
            />

            {/* menu nổi */}
            <div
              className="fixed z-[9999] min-w-[180px] bg-white border border-gray-200 rounded-md shadow-xl text-sm py-1"
              style={{
                top: `${menuPos.y}px`,
                left: `${menuPos.x - 180}px`
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Delete */}
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => handleAction("delete")}
              >
                Delete
                <span className="block text-[11px] text-gray-500">
                  Chỉ xoá tin nhắn với bạn
                </span>
              </button>

              {/* Thu hồi: chỉ nếu là tin của mình */}
              {isOwn && (
                <button
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600"
                  onClick={() => handleAction("recall")}
                >
                  Recall
                  <span className="block text-[11px] text-gray-500 text-red-500">
                    Thu hồi tin nhắn với tất cả mọi người
                  </span>
                </button>
              )}

              {/* View Detail */}
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => {
                  setShowDetail(true)
                  // đóng menu sau khi mở detail
                  setShowMenu(false)
                }}
              >
                View detail
                <span className="block text-[11px] text-gray-500">
                  Xem chi tiết
                </span>
              </button>
            </div>
          </>
        )}

        {/* View Detail Dialog */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="sm:max-w-[320px]">
            <div className="text-sm space-y-3">
              <div>
                <div className="text-xs text-gray-500">Người gửi</div>
                <div className="font-medium">
                  {sender?.fullName || sender?.username || "User"}
                  {isOwn && " (You)"}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Thời gian</div>
                <div className="font-medium">
                  {(() => {
                    const d = message?.createdAt
                      ? new Date(message.createdAt)
                      : null
                    if (!d) return "—"
                    // ví dụ: 31/10/2025 20:15:44
                    const day = String(d.getDate()).padStart(2, "0")
                    const mon = String(d.getMonth() + 1).padStart(2, "0")
                    const yr = d.getFullYear()
                    const hh = String(d.getHours()).padStart(2, "0")
                    const mm = String(d.getMinutes()).padStart(2, "0")
                    const ss = String(d.getSeconds()).padStart(2, "0")
                    return `${day}/${mon}/${yr} ${hh}:${mm}:${ss}`
                  })()}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">ID tin nhắn</div>
                <div className="text-[11px] break-all text-gray-600">
                  {message._id || message.id || "(local)"}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {showMeta && !isSystemMessage && (
          <div
            className={`flex items-center gap-1 mt-2 text-xs text-gray-500 ${
              isOwn ? "justify-end" : "justify-start"
            }`}
          >
            <span>{formatTime(message?.createdAt || message?.timestamp)}</span>
            <StatusIcon />
          </div>
        )}
      </div>
    </div>
  )
}

function ReactionsDialog({ open, setOpen, emojiCountMap, userEmojiMap, usersData, total }) {
  // convert userEmojiMap -> per-emoji map (tối ưu hoá code cũ)
  const perEmoji = useMemo(() => {
    const acc = {}
    Object.entries(userEmojiMap || {}).forEach(([uid, { emoji }]) => {
      emoji.forEach(e => {
        if (!acc[e]) acc[e] = {}
        acc[e][uid] = (acc[e][uid] || 0) + 1
      })
    })
    return acc
  }, [userEmojiMap])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[400px] max-h-[60vh] overflow-y-auto">
        <div className="w-full max-w-md">
          <Tabs defaultValue="all" className="gap-4">
            <TabsList className="bg-background rounded-none border-b p-0">
              <TabsTrigger
                value="all"
                className="bg-background data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:border-primary h-full rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none"
              >
                All {total || 0}
              </TabsTrigger>
              {Object.entries(emojiCountMap || {}).map(([key, value]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="bg-background data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:border-primary h-full rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none"
                >
                  {key} {value}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab "All" */}
            <TabsContent value="all">
              <div className="space-y-4 mt-2">
                {Object.entries(userEmojiMap || {}).map(([userId, value]) => (
                  <div key={userId} className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={usersData[userId]?.avatarUrl} />
                      <AvatarFallback>
                        {(
                          usersData[userId]?.fullName ||
                          usersData[userId]?.username ||
                          "U"
                        ).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium flex-1 min-w-0 text-sm">
                      {usersData[userId]?.fullName ||
                        usersData[userId]?.username ||
                        "User"}
                    </span>
                    <span className="text-sm">{value.emoji.join(" ")}</span>
                    <span className="text-sm">{value.count}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab theo từng emoji */}
            {Object.entries(perEmoji).map(([emoji, users]) => (
              <TabsContent key={emoji} value={emoji}>
                <div className="space-y-4 mt-2">
                  {Object.entries(users).map(([userId, count]) => (
                    <div key={userId} className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={usersData[userId]?.avatarUrl} />
                        <AvatarFallback>
                          {(
                            usersData[userId]?.fullName ||
                            usersData[userId]?.username ||
                            "U"
                          ).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium flex-1 min-w-0 text-sm">
                        {usersData[userId]?.fullName ||
                          usersData[userId]?.username ||
                          "User"}
                      </span>
                      <span className="text-sm">{emoji}</span>
                      <span className="text-sm">{count}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MessageBubble
