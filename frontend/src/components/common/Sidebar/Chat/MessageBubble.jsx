// src/components/chat/MessageBubble.jsx
import { useEffect, useMemo, useState } from "react"
import {
  Pin, Reply, MoreHorizontal, Clock, Check, CheckCheck,
  FileText, FileSpreadsheet, Archive, Video as VideoIcon, Music, File, Download
} from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ReactionButton from "./ReactionButton"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDisplayUsers } from "@/apis"

const mediaUrl = (m, message) => m?.secure_url || m?.url || message?.body?.media?.url || ""

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
  const topEmojis = Object.entries(emojiCountMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([emoji, count]) => ({ emoji, count }))
  return { topEmojis, userEmojiMap, emojiCountMap }
}

function pickSender(conversation, message, contact) {
  if (message?.sender) {
    const s = message.sender
    return {
      id: s.id || s._id || message.senderId || null,
      fullName: s.fullName || s.username || contact?.name || "User",
      username: s.username || null,
      avatarUrl: s.avatarUrl || null
    }
  }
  const sid = message?.senderId
  const mems = conversation?.group?.members
  if (sid && Array.isArray(mems) && mems.length) {
    const m = mems.find((u) => String(u.id || u._id) === String(sid))
    if (m) {
      return {
        id: m.id || m._id,
        fullName: m.fullName || m.username || contact?.name || "User",
        username: m.username || null,
        avatarUrl: m.avatarUrl || null
      }
    }
  }
  const other = conversation?.direct?.otherUser
  if (other && String(other.id || other._id) === String(sid)) {
    return {
      id: other.id || other._id,
      fullName: other.fullName || other.username || contact?.name || "User",
      username: other.username || null,
      avatarUrl: other.avatarUrl || null
    }
  }
  return {
    id: sid || null,
    fullName: contact?.name || "User",
    username: contact?.username || null,
    avatarUrl: contact?.avatarUrl || null
  }
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function MessageBubble({ message, showAvatar, contact, showMeta = true, conversation }) {
  const [hovered, setHovered] = useState(false)
  const [open, setOpen] = useState(false)
  const isOwn = !!message?.isOwn
  const isGroup = conversation?.type === "group"
  const { topEmojis, userEmojiMap, emojiCountMap } = useMemo(() => processReactions(message?.reactions || []), [message?.reactions])

  // Lightbox
  const [preview, setPreview] = useState({ open: false, url: "", type: "image" })

  // System
  const SYSTEM_ID_FALLBACK = "000000000000000000000000"
  const sysSid = (message?.sender?._id || message?.senderId || "").toString()
  const sysName = (message?.sender?.fullName || message?.sender?.username || "").trim().toLowerCase()
  const isSystemMessage = sysName === "system" || sysSid === SYSTEM_ID_FALLBACK

  const sender = useMemo(() => pickSender(conversation, message, contact), [conversation, message, contact])

  const [usersData, setUsersData] = useState({})
  useEffect(() => {
    const ids = Object.keys(userEmojiMap || {})
    if (!ids.length) { setUsersData({}); return }
    (async () => {
      try {
        const users = await getDisplayUsers(ids)
        const m = {}
        ;(users || []).forEach((u) => (m[u.id || u._id] = u))
        setUsersData(m)
      } catch (e) {
        console.error("Failed to fetch users for reactions", e)
      }
    })()
  }, [userEmojiMap])

  const formatTime = (ts) => {
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
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error("Download failed", err)
    }
  }

  const { images, videos, files, audios } = useMemo(() => {
    const list = Array.isArray(message?.media) ? message.media : []
    return {
      images: list.filter((m) => (m?.type || "").toLowerCase() === "image"),
      videos: list.filter((m) => (m?.type || "").toLowerCase() === "video"),
      audios: list.filter((m) => (m?.type || "").toLowerCase() === "audio"),
      files : list.filter((m) => (m?.type || "").toLowerCase() === "file")
    }
  }, [message?.media])

  return (
    <div
      className={`flex gap-2 ${Array.isArray(message?.reactions) && message.reactions.length > 0 ? "mb-4" : "mb-2"} ${
        isSystemMessage ? "justify-center" : isOwn ? "justify-end" : "justify-start"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isOwn && showAvatar && !isSystemMessage && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={isGroup ? sender?.avatarUrl : conversation?.direct?.otherUser?.avatarUrl} />
          <AvatarFallback>{(isGroup ? sender?.fullName : contact?.name)?.charAt?.(0)?.toUpperCase?.() ?? "U"}</AvatarFallback>
        </Avatar>
      )}

      <div className={`relative ${isSystemMessage ? "max-w-[80%]" : "max-w-[70%]"} ${isOwn ? "order-first" : ""}`}>
        {isGroup && !isOwn && !isSystemMessage && (
          <div className="mb-1 ml-1 text-[11px] font-medium text-gray-500">{sender?.fullName || sender?.username || "User"}</div>
        )}

        {!isSystemMessage && (
          <div
            className={`z-[999] pointer-events-auto absolute top-1/2 -translate-y-1/2 ${isOwn ? "-left-22" : "-right-22"} opacity-0 transition-opacity duration-150 ${
              hovered ? "opacity-100" : "opacity-0"
            } flex items-center gap-1`}
          >
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Reply className="w-3 h-3" />
            </Button>
            <ReactionButton messageId={message.id || message._id} />
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="relative">
          {isSystemMessage ? (
            <div className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs text-center whitespace-pre-wrap">
              {message.text ?? message.body?.text ?? ""}
            </div>
          ) : (
            <>
              {Array.isArray(message?.media) && message.media.length > 0 ? (
                <div className="space-y-2">
                  {/* Images */}
                  {images.length > 0 && (
                    <div
                      className={`${
                        images.length === 1
                          ? "flex justify-center"
                          : images.length === 2
                            ? "grid grid-cols-2 gap-2"
                            : images.length <= 4
                              ? "grid grid-cols-2 gap-2 max-w-md"
                              : "grid grid-cols-3 gap-2 max-w-lg"
                      }`}
                    >
                      {images.map((m, i) => {
                        const url = mediaUrl(m, message)
                        return (
                          <div key={`img-${i}`} className="relative">
                            {message.isPinned && <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-500 z-10" />}
                            <img
                              src={url}
                              alt={m?.metadata?.filename || "image"}
                              className={`rounded-lg shadow-md object-cover ${
                                images.length === 1
                                  ? "max-w-sm max-h-96 w-full"
                                  : images.length === 2
                                    ? "w-full h-32 sm:h-40"
                                    : images.length <= 4
                                      ? "w-full h-24 sm:h-32"
                                      : "w-full h-20 sm:h-24"
                              } hover:shadow-lg transition-shadow duration-200 cursor-pointer`}
                              onClick={() => setPreview({ open: true, url, type: "image" })}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Videos */}
                  {videos.length > 0 && (
                    <div className="space-y-2">
                      {videos.map((m, i) => {
                        const url = mediaUrl(m, message)
                        return (
                          <div key={`vid-${i}`} className="relative">
                            {message.isPinned && <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-500 z-10" />}
                            <video
                              src={url}
                              controls
                              className={`rounded-lg shadow-md ${videos.length === 1 ? "max-w-sm w-full max-h-96" : "w-full max-h-72"}`}
                              onClick={(e) => {
                                // dùng lightbox để xem video lớn hơn (không autoplay khi click trong bubble)
                                e.stopPropagation()
                                setPreview({ open: true, url, type: "video" })
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Files */}
                  {files.length > 0 && (
                    <div className="space-y-1">
                      {files.map((m, i) => {
                        const mimetype = m?.metadata?.mimetype || ""
                        const filename = m?.metadata?.filename || "Unknown file"
                        const sizeText = formatFileSize(m?.metadata?.size)
                        const url = mediaUrl(m, message)
                        const Icon =
                          mimetype.includes("pdf")
                            ? FileText
                            : mimetype.includes("word") || mimetype.includes("document")
                              ? FileText
                              : mimetype.includes("sheet") || mimetype.includes("excel")
                                ? FileSpreadsheet
                                : mimetype.includes("zip") || mimetype.includes("rar") || mimetype.includes("archive")
                                  ? Archive
                                  : mimetype.includes("video")
                                    ? VideoIcon
                                    : mimetype.includes("audio")
                                      ? Music
                                      : File
                        return (
                          <div key={`file-${i}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                            <Icon className="w-8 h-8 text-gray-600" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{filename}</div>
                              <div className="text-xs text-gray-500">{sizeText}</div>
                            </div>
                            <button onClick={() => handleDownload(url, filename)}>
                              <Download className="w-4 h-4 text-gray-400 cursor-pointer" />
                            </button>
                            {message.isPinned && <Pin className="w-3 h-3 text-yellow-500" />}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Audios */}
                  {audios.length > 0 && (
                    <div className="space-y-2">
                      {audios.map((m, i) => {
                        const url = mediaUrl(m, message)
                        const type = m?.metadata?.mimetype || "audio/webm"
                        return (
                          <div
                            key={`audio-${i}`}
                            className={`flex items-center gap-2 p-2 max-w-xs rounded-sm ${
                              message.isOwn ? "ml-auto bg-primary/10 border border-primary rounded-l-lg rounded-tr-lg" : "mr-auto bg-gray-100 text-black rounded-r-lg rounded-tl-lg"
                            } shadow-sm`}
                          >
                            <audio controls className="flex-1 min-w-0">
                              <source src={url} type={type} />
                              Your browser does not support the audio element.
                            </audio>
                            {message.isPinned && <Pin className="w-4 h-4 text-yellow-500 shrink-0" />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`relative p-3 rounded-sm ${
                    isOwn ? "bg-primary/10 border border-primary rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  }`}
                >
                  {message.isPinned && <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-500" />}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.text ?? message.body?.text ?? ""}</p>
                </div>
              )}

              {Array.isArray(message?.reactions) && message.reactions.length > 0 && (
                <div className="absolute -bottom-2 right-2 cursor-pointer shadow-sm rounded-full border" onClick={() => setOpen(true)}>
                  <Badge variant="secondary" className="text-xs flex gap-1">
                    {topEmojis.map((r) => r.emoji).join(" ")} {message.reactions.length}
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>

        {/* Lightbox */}
        <Dialog open={preview.open} onOpenChange={(o) => setPreview((p) => ({ ...p, open: o }))}>
          <DialogContent className="p-0 sm:max-w-[80vw]">
            <div className="w-full h-full max-h-[80vh] flex items-center justify-center bg-black">
              {preview.type === "video" ? (
                <video src={preview.url} controls className="max-w-full max-h-[80vh]" autoPlay />
              ) : (
                <img src={preview.url} alt="" className="max-w-full max-h-[80vh]" />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Reactions Dialog (giữ nguyên UI) */}
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

        {showMeta && !isSystemMessage && (
          <div className={`flex items-center gap-1 mt-2 text-xs text-gray-500 ${isOwn ? "justify-end" : "justify-start"}`}>
            <span>{formatTime(message?.createdAt || message?.timestamp)}</span>
            <StatusIcon />
          </div>
        )}
      </div>
    </div>
  )
}

function ReactionsDialog({ open, setOpen, emojiCountMap, userEmojiMap, usersData, total }) {
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
              {Object.entries(emojiCountMap).map(([key, value]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="bg-background data-[state=active]:border-primary data-[state=active]:text-primary dark:data-[state=active]:border-primary h-full rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none"
                >
                  {key} {value}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-4 mt-2">
                {Object.entries(userEmojiMap).map(([userId, value]) => (
                  <div key={userId} className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={usersData[userId]?.avatarUrl} />
                      <AvatarFallback>{(usersData[userId]?.fullName || usersData[userId]?.username || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium flex-1 min-w-0 text-sm">{usersData[userId]?.fullName || usersData[userId]?.username || "User"}</span>
                    <span className="text-sm">{value.emoji.join(" ")}</span>
                    <span className="text-sm">{value.count}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {Object.entries(
              Object.entries(userEmojiMap).reduce((acc, [uid, { emoji }]) => {
                emoji.forEach((e) => {
                  if (!acc[e]) acc[e] = {}
                  acc[e][uid] = (acc[e][uid] || 0) + 1
                })
                return acc
              }, {})
            ).map(([emoji, users]) => (
              <TabsContent key={emoji} value={emoji}>
                <div className="space-y-4 mt-2">
                  {Object.entries(users).map(([userId, count]) => (
                    <div key={userId} className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={usersData[userId]?.avatarUrl} />
                        <AvatarFallback>{(usersData[userId]?.fullName || usersData[userId]?.username || "U").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium flex-1 min-w-0 text-sm">{usersData[userId]?.fullName || usersData[userId]?.username || "User"}</span>
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
