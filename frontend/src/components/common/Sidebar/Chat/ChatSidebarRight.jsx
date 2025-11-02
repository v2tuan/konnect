import { useEffect, useRef, useState, useMemo } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
  Bell,
  Users,
  Pin,
  Shield,
  EyeOff,
  Trash,
  TriangleAlert,
  LogOut,
  MoreHorizontal
} from "lucide-react"
import CreateGroupDialog from "../../Modal/CreateGroupModel"
import MuteMenu from "@/components/common/Sidebar/Chat/MuteMenu.jsx"
import ConversationMediaPanel from "./ConversationMediaPanel"
import ConversationGallery from "./ConversationGallery"
import {
  deleteConversationAPI,
  leaveGroupAPI,
  removeMemberFromGroupAPI,
  promoteMemberToAdminAPI
} from "@/apis"
import { toast } from "react-toastify"
import { useNavigate, useParams } from "react-router-dom"
import AddMemberDialog from "../../Modal/AddMemberDialog"
import GroupInfoDialog from "./GroupInfoDialog.jsx"
import UserProfilePanel from "@/components/common/Modal/UserProfilePanel.jsx"
import { useSelector } from "react-redux"
import { selectCurrentUser } from "@/redux/user/userSlice"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export default function ChatSidebarRight({ conversation, isOpen, onClose, onOpenProfile }) {
  const navigate = useNavigate()
  const { conversationId: activeIdFromURL } = useParams()
  const panelRef = useRef(null)

  const [infoOpen, setInfoOpen] = useState(false)

  const currentUser = useSelector(selectCurrentUser)
  const currentUserId = currentUser?._id || currentUser?.id

  // Gallery state
  const [showGallery, setShowGallery] = useState(false)
  const [galleryTab, setGalleryTab] = useState("media")
  const openGallery = (tab) => {
    setGalleryTab(tab)
    setShowGallery(true)
  }

  // =========================
  // State cho flow chọn admin kế nhiệm khi rời group
  // =========================
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [pickId, setPickId] = useState(null)

  // thành viên hiện tại (mình) trong group
  const myMembership = useMemo(() => {
    if (conversation?.type !== "group") return null
    if (!Array.isArray(conversation?.group?.members)) return null
    return conversation.group.members.find(
      (m) => String(m?._id || m?.id) === String(currentUserId)
    )
  }, [conversation, currentUserId])

  const myRole = myMembership?.role || "member"
  const amIAdmin = myRole === "admin"

  // Có admin khác ngoài mình không?
  const hasAnotherAdmin = useMemo(() => {
    if (conversation?.type !== "group" || !Array.isArray(conversation?.group?.members)) return false
    return conversation.group.members.some(m =>
      m?.role === "admin" && String(m?._id || m?.id) !== String(currentUserId)
    )
  }, [conversation, currentUserId])

  // Danh sách ứng viên kế nhiệm (không phải mình, không phải admin sẵn)
  const candidates = useMemo(() => {
    if (conversation?.type !== "group" || !Array.isArray(conversation?.group?.members)) return []
    return conversation.group.members.filter(m => {
      const uid = String(m?._id || m?.id)
      return uid !== String(currentUserId) && m?.role !== "admin"
    })
  }, [conversation, currentUserId])

  // peer info cho direct chat -> UserProfilePanel
  const peer =
    conversation?.type === "direct"
      ? {
          id: conversation?.direct?.otherUser?.id,
          fullName: conversation?.direct?.otherUser?.fullName,
          username: conversation?.direct?.otherUser?.userName,
          avatarUrl: conversation?.direct?.otherUser?.avatarUrl,
          coverUrl: conversation?.direct?.otherUser?.coverUrl || "",
          bio: conversation?.direct?.otherUser?.bio,
          dateOfBirth: conversation?.direct?.otherUser?.dateOfBirth,
          phone: conversation?.direct?.otherUser?.phone,
          gender: conversation?.direct?.otherUser?.gender,
          photos: conversation?.direct?.otherUser?.photos || [],
          mutualGroups: conversation?.direct?.otherUser?.mutualGroups || 0,
          isFriend: !!conversation?.direct?.otherUser?.isFriend
        }
      : null

  // ESC handling
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (showGallery) {
          setShowGallery(false)
        } else if (assignOpen) {
          if (!assigning) setAssignOpen(false)
        } else {
          onClose?.()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, showGallery, assignOpen, assigning, onClose])

  // Click outside để đóng sidebar, trừ vùng popup/dialog
  useEffect(() => {
    if (!isOpen) return
    const handleDown = (e) => {
      const t = e.target

      // nếu click trong sidebar -> bỏ qua
      if (panelRef.current?.contains(t)) return

      // nếu click trong media viewer portal -> bỏ qua
      if (t.closest("#media-window-portal")) return

      // nếu click trong popper / dialog / command palette -> bỏ qua
      if (
        t.closest("[data-radix-popper-content-wrapper]") ||
        t.closest("[role='dialog']") ||
        t.closest("[cmdk-root]") ||
        t.closest("[cmdk-list]") ||
        t.closest('[role="listbox"]')
      ) {
        return
      }

      // >>> FIX MỚI: nếu click trong modal assign-admin thì KHÔNG đóng modal
      if (t.closest("#assign-admin-modal")) {
        return
      }

      // ngoài hết rồi
      if (showGallery) {
        setShowGallery(false)
      } else if (assignOpen) {
        if (!assigning) setAssignOpen(false)
      } else {
        onClose?.()
      }
    }
    document.addEventListener("mousedown", handleDown)
    return () => document.removeEventListener("mousedown", handleDown)
  }, [isOpen, showGallery, assignOpen, assigning, onClose])

  // =========================
  // delete conversation
  // =========================
  const handleDeleteConversation = async (conversationId) => {
    try {
      const confirmed = window.confirm(
        "Are you sure you want to delete this conversation history? This action cannot be undone."
      )
      if (!confirmed) return

      await deleteConversationAPI(conversationId, { action: "delete" })
      window.dispatchEvent(
        new CustomEvent("conversation:deleted", { detail: { conversationId } })
      )
      toast.success("Conversation deleted successfully")

      if (activeIdFromURL === conversationId) navigate("/")
    } catch (error) {
      console.error("Error deleting conversation:", error)
      toast.error(
        error?.message || "An error occurred while deleting the conversation"
      )
    }
  }

  // =========================
  // promote member to admin
  // =========================
  const handlePromoteToAdmin = async (memberId) => {
    try {
      const confirmed = window.confirm("Promote this member to admin?")
      if (!confirmed) return

      await promoteMemberToAdminAPI(conversation?._id, memberId)
      toast.success("Promoted to admin")
      // UI sẽ update qua socket 'member:promoted'
    } catch (err) {
      console.error("promote member error:", err)
      toast.error(
        err?.response?.data?.message ||
          err.message ||
          "Failed to promote member"
      )
    }
  }

  // =========================
  // remove member
  // =========================
  const handleRemoveUser = async (memberId) => {
    try {
      const confirmed = window.confirm("Remove this member from the group?")
      if (!confirmed) return

      await removeMemberFromGroupAPI(conversation?._id, memberId)
      toast.success("Member removed")
      // UI update qua socket "member:left"
    } catch (err) {
      console.error("remove member error:", err)
      toast.error(
        err?.response?.data?.message ||
          err.message ||
          "Failed to remove member"
      )
    }
  }

  // =========================
  // rời group (logic chọn admin kế nhiệm nếu mình là admin duy nhất)
  // =========================
  const confirmLeaveWithAssign = async () => {
    if (!pickId) return
    try {
      setAssigning(true)

      // truyền pickId làm nextAdminId cho BE
      await leaveGroupAPI(conversation?._id, pickId)

      window.dispatchEvent(
        new CustomEvent("conversation:deleted", {
          detail: { conversationId: conversation?._id }
        })
      )
      toast.success("Left group successfully")

      setAssignOpen(false)
      setPickId(null)

      if (activeIdFromURL === conversation?._id) navigate("/")
    } catch (error) {
      console.error("leave group with assign error:", error)
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to leave group"
      )
    } finally {
      setAssigning(false)
    }
  }

  const handleLeaveGroup = async (conversationId) => {
    try {
      const confirmed = window.confirm(
        "Are you sure you want to leave this group?"
      )
      if (!confirmed) return

      // Nếu mình KHÔNG phải admin -> out luôn
      if (!amIAdmin) {
        await leaveGroupAPI(conversationId)
        window.dispatchEvent(
          new CustomEvent("conversation:deleted", { detail: { conversationId } })
        )
        toast.success("Left group successfully")
        if (activeIdFromURL === conversationId) navigate("/")
        return
      }

      // Mình là admin, nhưng đã có admin khác -> out luôn
      if (hasAnotherAdmin) {
        await leaveGroupAPI(conversationId)
        window.dispatchEvent(
          new CustomEvent("conversation:deleted", { detail: { conversationId } })
        )
        toast.success("Left group successfully")
        if (activeIdFromURL === conversationId) navigate("/")
        return
      }

      // Mình là admin duy nhất
      if (candidates.length === 0) {
        // Không có ai khác để assign -> vẫn cho out
        await leaveGroupAPI(conversationId)
        window.dispatchEvent(
          new CustomEvent("conversation:deleted", { detail: { conversationId } })
        )
        toast.success("Left group successfully")
        if (activeIdFromURL === conversationId) navigate("/")
        return
      }

      // Mở modal Assign next admin
      setPickId(null)
      setAssignOpen(true)
    } catch (error) {
      console.error("Error leaving group:", error)
      toast.error(
        error?.message || "An error occurred while leaving the group"
      )
    }
  }

  // =========================
  // render mỗi member trong accordion "Group members"
  // (badge Admin màu cam + menu quản lý)
  // =========================
  const renderMemberRow = (m) => {
    const uid = m?._id || m?.id
    const name = m?.fullName || m?.username || "User"
    const initial = (name?.[0] || "U").toUpperCase()

    const isAdmin = m?.role === "admin"
    const roleLabel =
      m?.role === "admin"
        ? "Admin"
        : m?.role === "owner"
          ? "Owner"
          : "Member"

    // có thể quản lý user này không?
    const canManage =
      amIAdmin && String(uid) !== String(currentUserId)

    return (
      <div
        key={uid}
        className="group flex items-start gap-3 p-2 rounded-lg hover:bg-muted/60 relative"
      >
        {/* Avatar click mở profile */}
        <Avatar
          className="w-8 h-8 shrink-0 cursor-pointer"
          onClick={() => onOpenProfile?.(m)}
        >
          <AvatarImage src={m?.avatarUrl || ""} />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            {/* Khối tên click mở profile */}
            <div
              className="min-w-0 cursor-pointer"
              onClick={() => onOpenProfile?.(m)}
            >
              <div className="text-sm font-medium truncate flex items-center gap-2">
                <span className="truncate">{name}</span>

                {/* badge vai trò - cam cho admin */}
                {isAdmin && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    Admin
                  </span>
                )}

                {/* fallback role nhạt nếu không phải admin */}
                {!isAdmin && (
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {roleLabel}
                  </span>
                )}
              </div>

              {m?.status?.isOnline !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {m.status.isOnline ? "Online" : "Offline"}
                </div>
              )}
            </div>

            {/* Dropdown menu quản lý thành viên */}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground"
                    aria-label="Manage member"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-40 text-sm">
                  <DropdownMenuItem
                    onClick={() => handleRemoveUser(uid)}
                    className="text-red-600 cursor-pointer"
                  >
                    Remove user
                  </DropdownMenuItem>

                  {m.role !== "admin" && (
                    <DropdownMenuItem
                      onClick={() => handlePromoteToAdmin(uid)}
                      className="cursor-pointer"
                    >
                      Promote to admin
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    )
  }

  // styles cho 3 nút nhanh ở đầu
  const buttonStyle =
    "h-full w-full grid place-items-center rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  const contentStyle = "flex flex-col items-center leading-none"
  const textStyle = "text-xs font-medium"

  return (
    <>
      <div
        ref={panelRef}
        className={`fixed z-[49] flex flex-col top-0 right-0 bg-sidebar h-full w-80 shadow-lg transform transition-transform duration-300 ease-in-out border-l overflow-hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {showGallery ? (
          <ConversationGallery
            conversationId={conversation?._id}
            initialTab={galleryTab}
            onClose={() => setShowGallery(false)}
            members={
              conversation?.type === "group"
                ? conversation?.group?.members || []
                : conversation?.members || []
            }
          />
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4 max-w-full">
            {/* Header */}
            <div className="flex items-center justify-center p-4 border-b h-18 shrink-0">
              <h2 className="text-lg font-semibold truncate">
                Conversation information
              </h2>
            </div>

            {/* Conversation avatar + actions */}
            <div className="p-6 text-center border-b">
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="group w-fit mx-auto block"
                title="Xem/Chỉnh sửa thông tin nhóm"
              >
                <div className="relative w-20 h-20 rounded-full mx-auto mb-4 ring-0 group-hover:ring-2 group-hover:ring-primary/40 transition">
                  {conversation?.conversationAvatarUrl ? (
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={conversation?.conversationAvatarUrl} />
                      <AvatarFallback>
                        {conversation?.displayName?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-20 h-20 bg-blue-500 rounded-full grid place-items-center">
                      <span className="text-2xl font-bold text-white">
                        {conversation?.displayName?.[0] || "U"}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 rounded-full bg-background/30 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                    <span className="text-xs font-medium">Xem chi tiết</span>
                  </div>
                </div>
              </button>

              <div className="flex items-center justify-center mb-4">
                <h3 className="text-xl font-semibold truncate max-w-full px-2">
                  {conversation?.displayName}
                </h3>
              </div>

              {/* top 3 quick actions */}
              <div className="grid grid-cols-3 gap-4 mb-4 place-items-center">
                <div className="h-16 w-24 grid place-items-center">
                  <MuteMenu conversationId={conversation?._id} asChild>
                    <button className={buttonStyle}>
                      <div className={contentStyle}>
                        <Bell size={20} className="mb-1" />
                        <span className={textStyle}>Mute</span>
                      </div>
                    </button>
                  </MuteMenu>
                </div>

                <div className="h-16 w-24 grid place-items-center">
                  <button className={buttonStyle}>
                    <div className={contentStyle}>
                      <Pin size={20} className="mb-1" />
                      <span className={textStyle}>Pin</span>
                    </div>
                  </button>
                </div>

                <div className="h-16 w-24 grid place-items-center">
                  {conversation?.type === "direct" ? (
                    <CreateGroupDialog asChild>
                      <button className={buttonStyle}>
                        <div className={contentStyle}>
                          <Users size={20} className="mb-1" />
                          <span className={textStyle}>Create group</span>
                        </div>
                      </button>
                    </CreateGroupDialog>
                  ) : (
                    <AddMemberDialog
                      conversationId={conversation?._id}
                      existingMemberIds={
                        Array.isArray(conversation?.group?.members)
                          ? conversation.group.members.map(m =>
                              String(m._id || m.id)
                            )
                          : []
                      }
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Accordions */}
            <div className="overflow-hidden">
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={[
                  "media",
                  "audio",
                  "file",
                  "members",
                  "security"
                ]}
              >
                {/* MEDIA */}
                <AccordionItem value="media">
                  <AccordionTrigger className="text-base p-4">
                    Photos/Videos
                  </AccordionTrigger>
                  <AccordionContent className="overflow-hidden">
                    <div className="px-4">
                      {conversation?._id && (
                        <ConversationMediaPanel
                          conversationId={conversation._id}
                          kind="visual"
                          defaultTab="image"
                          pageSize={8}
                          gridCols={4}
                          showTabs={false}
                          showLoadMore={false}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => openGallery("media")}
                        className="block w-full h-12 rounded-xl bg-muted hover:bg-muted/80 text-base font-medium mt-4"
                      >
                        View all
                      </button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* AUDIO */}
                <AccordionItem value="audio">
                  <AccordionTrigger className="text-base p-4">
                    Audio
                  </AccordionTrigger>
                  <AccordionContent className="overflow-hidden">
                    <div className="px-4">
                      {conversation?._id && (
                        <ConversationMediaPanel
                          conversationId={conversation._id}
                          kind="binary"
                          onlyTab="audio"
                          defaultTab="audio"
                          pageSize={4}
                          showTabs={false}
                          showLoadMore={false}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => openGallery("audio")}
                        className="block w-full h-12 rounded-xl bg-muted hover:bg-muted/80 text-base font-medium mt-4"
                      >
                        View all
                      </button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* FILES */}
                <AccordionItem value="file">
                  <AccordionTrigger className="text-base p-4">
                    Files
                  </AccordionTrigger>
                  <AccordionContent className="overflow-hidden">
                    <div className="px-4">
                      {conversation?._id && (
                        <ConversationMediaPanel
                          conversationId={conversation._id}
                          kind="binary"
                          onlyTab="file"
                          defaultTab="file"
                          pageSize={3}
                          showTabs={false}
                          showLoadMore={false}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => openGallery("file")}
                        className="block w-full h-12 rounded-xl bg-muted hover:bg-muted/80 text-base font-medium mt-4"
                      >
                        View all
                      </button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* MEMBERS */}
                <AccordionItem value="members">
                  <AccordionTrigger className="text-base p-4">
                    Group members
                  </AccordionTrigger>

                  <AccordionContent className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-2">
                      {conversation?.type !== "group" ||
                      !Array.isArray(conversation?.group?.members) ||
                      !conversation.group.members.length ? (
                        <div className="text-sm text-muted-foreground">
                          This conversation is not a group or has no members
                          yet.
                        </div>
                      ) : (
                        conversation.group.members.map(renderMemberRow)
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* SECURITY */}
                <AccordionItem value="security">
                  <AccordionTrigger className="text-base p-4">
                    Security settings
                  </AccordionTrigger>
                  <AccordionContent className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <Shield size={18} className="mr-3 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              Disappearing messages
                            </p>
                            <p className="text-xs truncate">Never</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <EyeOff size={18} className="mr-3 shrink-0" />
                          <span className="text-sm font-medium truncate">
                            Hide conversation
                          </span>
                        </div>
                        <Switch className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground shrink-0" />
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center mb-5 min-w-0">
                          <TriangleAlert
                            size={18}
                            className="mr-3 shrink-0"
                          />
                          <span className="text-sm truncate">Report</span>
                        </div>

                        <div
                          className="flex items-center text-destructive mb-5 cursor-pointer min-w-0"
                          onClick={() =>
                            handleDeleteConversation(conversation?._id)
                          }
                        >
                          <Trash size={18} className="mr-3 shrink-0" />
                          <span className="text-sm truncate">
                            Delete conversation history
                          </span>
                        </div>

                        {conversation?.type === "group" && (
                          <div
                            className="flex items-center text-destructive mb-5 cursor-pointer min-w-0"
                            onClick={() =>
                              handleLeaveGroup(conversation?._id)
                            }
                          >
                            <LogOut size={18} className="mr-3 shrink-0" />
                            <span className="text-sm truncate">
                              Leave group
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}
      </div>

      {/* Group Info Dialog */}
      {conversation?.type === "group" ? (
        <GroupInfoDialog
          open={infoOpen}
          onOpenChange={setInfoOpen}
          conversation={conversation}
          onAvatarUpdated={(url) => {
            window.dispatchEvent(
              new CustomEvent("conversation:avatar-updated", {
                detail: { id: conversation?._id, url }
              })
            )
          }}
          onNameUpdated={(name) => {
            window.dispatchEvent(
              new CustomEvent("conversation:name-updated", {
                detail: { id: conversation?._id, name }
              })
            )
          }}
          onOpenAddMember={() => {}}
          onOpenManageMembers={() => {}}
        />
      ) : (
        <UserProfilePanel
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          user={{
            fullName: peer?.fullName || "Người dùng",
            avatarUrl: peer?.avatarUrl || "",
            coverUrl: peer?.coverUrl || "",
            bio: peer?.bio || "",
            dateOfBirth: peer?.dateOfBirth || "",
            phone: peer?.phone || "",
            photos: Array.isArray(peer?.photos) ? peer.photos : [],
            mutualGroups: peer?.mutualGroups || 0
          }}
          isFriend={!!peer?.isFriend}
          onCall={() => {
            toast.info(
              `Bắt đầu gọi: ${peer?.fullName || "người dùng"}`
            )
          }}
          onChat={() => {
            setInfoOpen(false)
          }}
          onAddFriend={async () => {
            try {
              // await addFriendAPI(peer?.id)
              toast.success("Đã gửi lời mời kết bạn")
            } catch (e) {
              toast.error(e?.message || "Không thể gửi lời mời")
            }
          }}
          onUnfriend={async () => {
            try {
              // await unfriendAPI(peer?.id)
              toast.success("Đã huỷ kết bạn")
            } catch (e) {
              toast.error(e?.message || "Không thể huỷ kết bạn")
            }
          }}
        />
      )}

      {/* Modal chọn admin kế nhiệm */}
      {assignOpen && (
        <div className="fixed inset-0 z-[60]">
          {/* overlay nền đen */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!assigning) setAssignOpen(false)
            }}
          />

          {/* modal box */}
          <div
            id="assign-admin-modal"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] bg-card border rounded-xl shadow-2xl"
          >
            <div className="p-4 border-b">
              <h3 className="text-base font-semibold">Assign next admin</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You are the only admin. Please choose a member to promote before
                leaving.
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto p-3 space-y-2">
              {candidates.map((m) => {
                const uid = String(m?._id || m?.id)
                const name = m?.fullName || m?.username || "User"
                return (
                  <label
                    key={uid}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="next-admin"
                      className="shrink-0"
                      value={uid}
                      checked={pickId === uid}
                      onChange={() => setPickId(uid)}
                      disabled={assigning}
                    />
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={m?.avatarUrl || ""} />
                      <AvatarFallback>
                        {(name?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {name}
                      </div>
                      {m?.status && (
                        <div className="text-xs text-muted-foreground truncate">
                          {m.status?.isOnline ? "Online" : "Offline"}
                        </div>
                      )}
                    </div>
                  </label>
                )
              })}

              {candidates.length === 0 && (
                <div className="text-sm text-muted-foreground px-1">
                  No eligible members to promote.
                </div>
              )}
            </div>

            <div className="p-3 border-t flex justify-end gap-2">
              <button
                type="button"
                className="h-9 px-3 rounded-md bg-muted hover:bg-muted/80"
                onClick={() => {
                  if (!assigning) setAssignOpen(false)
                }}
                disabled={assigning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-9 px-3 rounded-md bg-primary text-primary-foreground disabled:opacity-60"
                onClick={confirmLeaveWithAssign}
                disabled={assigning || !pickId}
              >
                {assigning ? "Processing..." : "Confirm & Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
