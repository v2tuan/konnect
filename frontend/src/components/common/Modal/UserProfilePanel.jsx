/* eslint-disable react-hooks/rules-of-hooks */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Image, MessageCircle, Phone, Trash, UserPlus, Users, X } from "lucide-react"
import { useEffect } from "react"
import { useSelector } from "react-redux"
import { selectCurrentUser } from "@/redux/user/userSlice"

export default function UserProfilePanel({
  open = false,
  onClose = () => {},
  user = {},
  onCall = () => {},
  onChat = () => {},
  isFriend = false,
  onAddFriend = () => {},
  onUnfriend = () => {}
}) {
  if (!open) return null

  const currentUser = useSelector(selectCurrentUser)
  const targetId = user?._id || user?.id
  const isSelf = currentUser?._id && targetId && String(currentUser._id) === String(targetId)

  const {
    fullName = "Người dùng",
    avatarUrl = "",
    coverUrl = "",
    bio = "",
    dateOfBirth = "",
    phone = "",
    photos = [],
    mutualGroups = 0
  } = user

  // Esc to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      {/* Modal card */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[400px] max-w-[92vw] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (X) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
          aria-label="Close profile"
          title="Close"
        >
          <X size={20} />
        </button>

        {/* Cover */}
        <div className="relative h-32 w-full rounded-t-2xl overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="cover"
              className="object-cover w-full h-full"
              draggable={false}
            />
          ) : (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-full h-full" />
          )}
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center -mt-10 mb-3">
          <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={fullName} />
            ) : (
              <AvatarFallback>{fullName.charAt(0)}</AvatarFallback>
            )}
          </Avatar>
          <h3 className="mt-2 text-base font-semibold">{fullName}</h3>
          <div className="text-xs text-gray-500">
            @{(fullName || "").toLowerCase().replace(/\s+/g, "")}
          </div>
        </div>

        {/* Actions */}
        {!isSelf && (
          <div className="flex justify-center gap-2 px-4 mb-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 justify-center h-9 py-0"
              onClick={(e) => { 
                e.stopPropagation()
                if (isSelf) return
                onCall()
              }}
            >
              <Phone size={16} className="mr-2" /> Call
            </Button>
            <Button
              type="button"
              className="flex-1 justify-center h-9 py-0 bg-blue-50 hover:bg-blue-100 text-blue-600"
              onClick={(e) => { 
                e.stopPropagation()
                if (isSelf) return
                onChat()
              }}
            >
              <MessageCircle size={16} className="mr-2" /> Chat
            </Button>
          </div>
        )}

        <hr className="mb-3" />

        {/* Personal info */}
        <div className="px-4 space-y-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-gray-500">DOB</span>
            <span className="font-medium">
              {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phone</span>
            <span className="font-medium">
              {phone ? phone.replace(/\d(?=\d{3})/g, "•") : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Bio</span>
            <span className="font-medium text-right line-clamp-3 max-w-[200px]">
              {bio || "—"}
            </span>
          </div>
        </div>

        {/* Photos */}
        <div className="px-4 mt-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Image size={16} /> Picture
          </h4>
          {photos && photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.slice(0, 6).map((p, idx) => (
                <img
                  key={idx}
                  src={p}
                  alt={`photo-${idx}`}
                  className="object-cover w-full h-16 rounded-md"
                  draggable={false}
                />
              ))}
            </div>
          ) : (
            <div className="py-4 border rounded-md text-center text-sm text-muted-foreground">
              Chưa có ảnh nào
            </div>
          )}
        </div>

        {/* Mutual groups & actions */}
        <div className="px-4 mt-4 mb-4 space-y-2">
          <button className="w-full flex items-center gap-3 p-2.5 rounded hover:bg-gray-50">
            <Users size={18} /> <span className="flex-1 text-left">Mutual Group</span>
            <Badge variant="secondary">{mutualGroups || 0}</Badge>
          </button>

          {!isSelf && (isFriend ? (
            <button
              onClick={(e) => { e.stopPropagation(); if (!isSelf) onUnfriend() }}
              className="w-full flex items-center gap-3 p-2.5 rounded hover:bg-gray-50 text-red-600"
            >
              <Trash size={18} /> <span className="flex-1 text-left">Remove Friend</span>
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); if (!isSelf) onAddFriend() }}
              className="w-full flex items-center gap-3 p-2.5 rounded hover:bg-gray-50 text-blue-600"
            >
              <UserPlus size={18} /> <span className="flex-1 text-left">Add Friend</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
