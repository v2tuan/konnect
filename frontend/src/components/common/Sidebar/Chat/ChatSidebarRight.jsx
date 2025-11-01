import { useEffect, useRef, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
  Bell,
  Users,
  UserPlus,
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
  addMemberToGroup,
  removeMemberFromGroupAPI,
  promoteMemberToAdminAPI
} from "@/apis"
import { toast } from "react-toastify"
import { useNavigate, useParams } from "react-router-dom"
import AddMemberDialog from "../../Modal/AddMemberDialog"

import { useSelector } from "react-redux"
import { selectCurrentUser } from "@/redux/user/userSlice"

// shadcn dropdown menu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export default function ChatSidebarRight({ conversation, isOpen, onClose }) {
  const navigate = useNavigate()
  const { conversationId: activeIdFromURL } = useParams()
  const panelRef = useRef(null)

  const currentUser = useSelector(selectCurrentUser)
  const currentUserId = currentUser?._id || currentUser?.id

  // Gallery state
  const [showGallery, setShowGallery] = useState(false)
  const [galleryTab, setGalleryTab] = useState("media")
  const openGallery = (tab) => {
    setGalleryTab(tab)
    setShowGallery(true)
  }

  // ESC handling
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (showGallery) setShowGallery(false)
        else onClose?.()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, showGallery, onClose])

  // Click outside to close (except poppers/portals)
  useEffect(() => {
    if (!isOpen) return
    const handleDown = (e) => {
      const t = e.target
      // 1) inside sidebar => ignore
      if (panelRef.current?.contains(t)) return
      // 2) inside media viewer portal => ignore
      if (t.closest("#media-window-portal")) return
      // 3) inside popper/command => ignore
      if (
        t.closest("[data-radix-popper-content-wrapper]") ||
        t.closest("[cmdk-root]") ||
        t.closest("[cmdk-list]") ||
        t.closest('[role="listbox"]')
      ) {
        return
      }
      // 4) outside => close
      if (showGallery) setShowGallery(false)
      else onClose?.()
    }
    document.addEventListener("mousedown", handleDown)
    return () => document.removeEventListener("mousedown", handleDown)
  }, [isOpen, onClose, showGallery])

  const handleDeleteConversation = async (conversationId) => {
    try {
      const confirmed = window.confirm("Are you sure you want to delete this conversation history? This action cannot be undone.")
      if (!confirmed) return
      await deleteConversationAPI(conversationId, { action: "delete" })
      window.dispatchEvent(new CustomEvent("conversation:deleted", { detail: { conversationId } }))
      toast.success("Conversation deleted successfully")
      if (activeIdFromURL === conversationId) navigate("/")
    } catch (error) {
      console.error("Error deleting conversation:", error)
      toast.error(error.message || "An error occurred while deleting the conversation")
    }
  }

  const handlePromoteToAdmin = async (memberId) => {
  try {
    const confirmed = window.confirm("Promote this member to admin?")
    if (!confirmed) return

    await promoteMemberToAdminAPI(conversation?._id, memberId)

    toast.success("Promoted to admin")

    // không set state trực tiếp ở đây,
    // vì ChatArea sẽ nghe socket 'member:promoted' và update localConversation
  } catch (err) {
    console.error("promote member error:", err)
    toast.error(
      err?.response?.data?.message ||
      err.message ||
      "Failed to promote member"
    )
  }
}

  const handleLeaveGroup = async (conversationId) => {
    try {
      const confirmed = window.confirm("Are you sure you want to leave this group?")
      if (!confirmed) return
      await leaveGroupAPI(conversationId, { action: "leave" })
      window.dispatchEvent(new CustomEvent("conversation:deleted", { detail: { conversationId } }))
      toast.success("Left group successfully")
      if (activeIdFromURL === conversationId) navigate("/")
    } catch (error) {
      console.error("Error leaving group:", error)
      toast.error(error.message || "An error occurred while leaving the group")
    }
  }

  // --- admin actions on members
  const handleRemoveUser = async (memberId) => {
    try {
      const confirmed = window.confirm("Remove this member from the group?")
      if (!confirmed) return

      await removeMemberFromGroupAPI(conversation?._id, memberId)

      toast.success("Member removed")
      // Lúc này UI có thể sẽ update qua socket "member:left"
    } catch (err) {
      console.error("remove member error:", err)
      toast.error(err?.response?.data?.message || err.message || "Failed to remove member")
    }
  }

  // helper: check current user's role in this conversation
  const myMembership = (() => {
    if (conversation?.type !== "group") return null
    if (!Array.isArray(conversation?.group?.members)) return null
    return conversation.group.members.find(
      (m) => String(m?._id || m?.id) === String(currentUserId)
    )
  })()
  const myRole = myMembership?.role || "member"
  const amIAdmin = myRole === "admin"

  // --- helper to render ONE row ---------------------------------
  const renderMemberRow = (m) => {
    const uid = m?._id || m?.id
    const name = m?.fullName || m?.username || "User"
    const initial = (name?.[0] || "U").toUpperCase()

    const roleLabel =
      m?.role === "admin"
        ? "Admin"
        : m?.role === "owner"
          ? "Owner"
          : "Member"

    const canManage =
      amIAdmin && String(uid) !== String(currentUserId)

    return (
      <div
        key={uid}
        className="group flex items-start gap-3 p-2 rounded-lg hover:bg-muted/60 relative"
      >
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={m?.avatarUrl || ""} />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate flex items-center gap-2">
                <span className="truncate">{name}</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {roleLabel}
                </span>
              </div>

              {m?.status?.isOnline !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {m.status.isOnline ? "Online" : "Offline"}
                </div>
              )}
            </div>

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

  // styles
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
              <h2 className="text-lg font-semibold truncate">Conversation information</h2>
            </div>

            {/* Conversation avatar + actions */}
            <div className="p-6 text-center border-b">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shrink-0">
                {conversation?.conversationAvatarUrl ? (
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={conversation?.conversationAvatarUrl} />
                    <AvatarFallback>{conversation?.displayName?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {conversation?.displayName?.[0] || "U"}
                  </span>
                )}
              </div>

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
                          ? conversation.group.members.map(m => String(m._id || m.id))
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
                defaultValue={["media", "audio", "file", "members", "security"]}
              >
                {/* MEDIA */}
                <AccordionItem value="media">
                  <AccordionTrigger className="text-base p-4">Photos/Videos</AccordionTrigger>
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
                  <AccordionTrigger className="text-base p-4">Audio</AccordionTrigger>
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
                  <AccordionTrigger className="text-base p-4">Files</AccordionTrigger>
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
                          This conversation is not a group or has no members yet.
                          </div>
                        ) : (
                          conversation.group.members.map(renderMemberRow)
                        )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* SECURITY */}
                <AccordionItem value="security">
                  <AccordionTrigger className="text-base p-4">Security settings</AccordionTrigger>
                  <AccordionContent className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <Shield size={18} className="mr-3 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">Disappearing messages</p>
                            <p className="text-xs truncate">Never</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <EyeOff size={18} className="mr-3 shrink-0" />
                          <span className="text-sm font-medium truncate">Hide conversation</span>
                        </div>
                        <Switch className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground shrink-0" />
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center mb-5 min-w-0">
                          <TriangleAlert size={18} className="mr-3 shrink-0" />
                          <span className="text-sm truncate">Report</span>
                        </div>

                        <div
                          className="flex items-center text-destructive mb-5 cursor-pointer min-w-0"
                          onClick={() => handleDeleteConversation(conversation?._id)}
                        >
                          <Trash size={18} className="mr-3 shrink-0" />
                          <span className="text-sm truncate">Delete conversation history</span>
                        </div>

                        {conversation?.type === "group" && (
                          <div
                            className="flex items-center text-destructive mb-5 cursor-pointer min-w-0"
                            onClick={() => handleLeaveGroup(conversation?._id)}
                          >
                            <LogOut size={18} className="mr-3 shrink-0" />
                            <span className="text-sm truncate">Leave group</span>
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
    </>
  )
}
