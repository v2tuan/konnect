"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { getGroupPreviewAPI, joinGroupViaLinkAPI } from "@/apis"
import { Loader2, Users, Check, Share2, Home, UserPlus } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import PropTypes from 'prop-types'

// Component Loading
function LoadingState() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-14 h-14 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Đang tải thông tin nhóm...</p>
      </div>
    </div>
  )
}

// Component Lỗi
function ErrorState({ onNavigate }) {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-sm text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Không tìm thấy nhóm</h2>
          <p className="text-sm text-muted-foreground">Link mời có thể đã hết hạn hoặc không tồn tại</p>
        </div>
        <Button onClick={onNavigate} className="w-full gap-2">
          <Home className="w-4 h-4" />
          Về trang chủ
        </Button>
      </div>
    </div>
  )
}
ErrorState.propTypes = {
  onNavigate: PropTypes.func.isRequired,
}

// Component hiển thị Chủ nhóm (Inviter)
function InviterSection({ inviterName, inviterAvatar }) {
  if (!inviterName) return null

  const safeInitial = (name) => (name?.trim()?.[0] || "U").toUpperCase()

  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
      <Avatar className="w-10 h-10">
        <AvatarImage src={inviterAvatar || "/placeholder.svg"} alt={inviterName} />
        <AvatarFallback className="text-xs font-semibold bg-blue-500/20">{safeInitial(inviterName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">Chủ nhóm</p>
        <p className="text-sm font-semibold text-foreground truncate">{inviterName}</p>
      </div>
    </div>
  )
}
InviterSection.propTypes = {
  inviterName: PropTypes.string,
  inviterAvatar: PropTypes.string,
}

// Component hiển thị Quản trị viên
function AdminSection({ admins }) {
  if (!admins || admins.length === 0) return null

  const safeInitial = (name) => (name?.trim()?.[0] || "A").toUpperCase()

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quản trị viên</p>
      <div className="space-y-2">
        {admins.map((admin, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200/50 dark:border-slate-700/50"
          >
            <Avatar className="w-9 h-9 flex-shrink-0">
              {/* SỬA CHỖ NÀY: Dùng `admin.avatar` */}
              <AvatarImage src={admin.avatar || "/placeholder.svg"} alt={admin.name} />
              <AvatarFallback className="text-xs font-semibold bg-slate-500/20">
                {/* SỬA CHỖ NÀY: Dùng `admin.name` */}
                {safeInitial(admin.name)}
              </AvatarFallback>
            </Avatar>
            {/* SỬA CHỖ NÀY: Dùng `admin.name` */}
            <p className="text-sm font-medium text-foreground truncate">{admin.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
AdminSection.propTypes = {
  admins: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    avatar: PropTypes.string,
  })),
}

// Trang chính
export default function JoinGroupPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()

  const [groupInfo, setGroupInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)

  const abortRef = useRef(null)

  const handleNavigateHome = useCallback(() => navigate("/"), [navigate])
  const handleNavigateToChat = useCallback((cid) => navigate(`/chats/${cid}`), [navigate])

  useEffect(() => {
    if (!conversationId) {
      toast.error("Link tham gia không hợp lệ.")
      handleNavigateHome()
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    const fetchGroupInfo = async () => {
      try {
        setLoading(true)
        const info = await getGroupPreviewAPI(conversationId, {
          signal: controller.signal,
        })
        setGroupInfo(info)
      } catch (error) {
        if (controller.signal.aborted) return

        const status = error?.response?.status
        const msg =
          error?.response?.data?.message || (status === 404 ? "Nhóm không tồn tại" : "Không thể tải thông tin nhóm")

        toast.error(msg)
        handleNavigateHome()
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchGroupInfo()
    return () => controller.abort()
  }, [conversationId, handleNavigateHome])

  const handleJoin = async () => {
    if (isJoining) return

    setIsJoining(true)
    try {
      const conversation = await joinGroupViaLinkAPI(conversationId)
      toast.success(`Đã tham gia nhóm "${conversation?.displayName || "..."}"!`)
      handleNavigateToChat(conversation?._id || conversationId)
    } catch (error) {
      const status = error?.response?.status
      const msg =
        error?.response?.data?.message ||
        (status === 403 ? "Bạn không được phép tham gia nhóm này" : "Tham gia thất bại")

      toast.error(msg)
      setIsJoining(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      toast.success("Đã sao chép link mời")
    } catch {
      toast.info("Không thể sao chép tự động, hãy copy thủ công")
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (!groupInfo) {
    return <ErrorState onNavigate={handleNavigateHome} />
  }

  const {
    _id: cid,
    displayName = "Nhóm",
    conversationAvatarUrl = "",
    memberCount = 0,
    isAlreadyMember = false,
    inviterName = "",
    inviterAvatar = "",
    admins = [],
    description = "",
  } = groupInfo

  const safeInitial = (name) => (name?.trim()?.[0] || "G").toUpperCase()
  const memberText = (n) => new Intl.NumberFormat("vi-VN").format(n || 0)

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
        <div className="relative">
          <div className="h-32 bg-gradient-to-r from-sky-400 to-sky-300 dark:from-sky-600 dark:to-sky-500"></div>

          {/* Overlapping avatar */}
          <div className="flex justify-start px-6 -mt-12 relative z-10">
            <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
              <AvatarImage
                src={conversationAvatarUrl || "/placeholder.svg"}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  try {
                    e.currentTarget.style.display = "none"
                  } catch { /* empty */ }
                }}
              />
              <AvatarFallback className="text-3xl font-bold bg-sky-100 dark:bg-sky-900/50">
                {safeInitial(displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-5">
          {/* Group info */}
          <div className="pt-3">
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>

            <div className="flex items-center gap-2 text-muted-foreground mt-3">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{memberText(memberCount)} thành viên • Nhóm công khai</span>
            </div>
          </div>

          {/* Inviter section */}
          <InviterSection inviterName={inviterName} inviterAvatar={inviterAvatar} />

          {/* Description */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <p className="text-sm text-foreground">
              {description ? description : <span className="text-muted-foreground italic">Không có mô tả</span>}
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            {isAlreadyMember ? (
              <>
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-100/60 dark:bg-green-900/25 rounded-lg border border-green-300/50 dark:border-green-700/50">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Bạn đã là thành viên</span>
                </div>

                <Button
                  onClick={() => handleNavigateToChat(cid)}
                  size="lg"
                  className="w-full gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Vào cuộc trò chuyện
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={handleNavigateHome}>
                    Trang chủ
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleCopyLink}
                    title="Sao chép link mời"
                    className="px-4 bg-transparent"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={handleJoin}
                  disabled={isJoining}
                  size="lg"
                  className="w-full gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Tham gia nhóm
                    </>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={handleNavigateHome}>
                    Hủy
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleCopyLink}
                    title="Sao chép link mời"
                    className="px-4 bg-transparent"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}