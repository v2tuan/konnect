import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
// IMPORT THÊM ICON
import {
  EyeOff, Pin, Shield, Trash, TriangleAlert, LogOut,
  Bell, Users, UserPlus
} from "lucide-react";
import CreateGroupDialog from "../../Modal/CreateGroupModel";
import MuteMenu from "@/components/common/Sidebar/Chat/MuteMenu.jsx";
import ConversationMediaPanel from "./ConversationMediaPanel";
import ConversationGallery from "./ConversationGallery";
import { deleteConversationAPI, leaveGroupAPI } from "@/apis";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import AddMemberDialog from "../../Modal/AddMemberDialog";

function ChatSidebarRight({ conversation, isOpen, onClose }) {
  const navigate = useNavigate();
  const { conversationId: activeIdFromURL } = useParams();

  const panelRef = useRef(null);

  // Gallery state
  const [showGallery, setShowGallery] = useState(false);
  const [galleryTab, setGalleryTab] = useState("media"); // 'media' | 'audio' | 'file'

  const openGallery = (tab) => {
    setGalleryTab(tab);
    setShowGallery(true);
  };

  // --- Các useEffect (cho Escape và Click out) đã sửa từ trước ---
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (!showGallery) {
          onClose?.();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, showGallery, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e) => {
      if (e.target.closest("#media-window-portal")) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        if (showGallery) setShowGallery(false);
        else onClose?.();
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [isOpen, showGallery, onClose]);

  // --- Các hàm handle (Delete, Leave) không đổi ---
  const handleDeleteConversation = async (conversationId) => {
    try {
      const confirmed = window.confirm(
        "Bạn có chắc chắn muốn xóa lịch sử cuộc trò chuyện này? Hành động này không thể hoàn tác."
      );
      if (!confirmed) return;
      await deleteConversationAPI(conversationId, { action: "delete" });
      window.dispatchEvent(
        new CustomEvent("conversation:deleted", {
          detail: { conversationId },
        })
      );
      toast.success("Đã xóa cuộc trò chuyện thành công");
      if (activeIdFromURL === conversationId) {
        navigate("/");
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error(error.message || "Có lỗi xảy ra khi xóa cuộc trò chuyện");
    }
  };

  const handleLeaveGroup = async (conversationId) => {
    try {
      const confirmed = window.confirm("Bạn có chắc chắn muốn rời khỏi nhóm này?");
      if (!confirmed) return;
      await leaveGroupAPI(conversationId, { action: "leave" });
      window.dispatchEvent(
        new CustomEvent("conversation:deleted", {
          detail: { conversationId },
        })
      );
      toast.success("Đã rời khỏi nhóm thành công");
      if (activeIdFromURL === conversationId) {
        navigate("/");
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error(error.message || "Có lỗi xảy ra khi rời nhóm");
    }
  };


  // --- ĐỊNH NGHĨA STYLE CHUNG ---
  // Thống nhất style cho cả 3 button
  const buttonStyle = "h-full w-full grid place-items-center rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const contentStyle = "flex flex-col items-center leading-none";
  const textStyle = "text-xs font-medium"; // Dùng font-medium cho đồng bộ

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[40] bg-black/30 pointer-events-none" />}

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
          />
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4 max-w-full">
            {/* Info box */}
            <div className="p-6 text-center border-b">
              {/* ... (Avatar và Tên không đổi) ... */}
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

              {/* --- (CHANGED) SỬA LẠI TOÀN BỘ KHỐI 3 BUTTON --- */}
              <div className="grid grid-cols-3 gap-4 mb-4 place-items-center">

                {/* 1. Nút Mute */}
                <div className="h-16 w-24 grid place-items-center">
                  {/* Dùng asChild để truyền style vào bên trong MuteMenu */}
                  <MuteMenu conversationId={conversation?._id} asChild>
                    <button className={buttonStyle}>
                      <div className={contentStyle}>
                        <Bell size={20} className="mb-1" />
                        <span className={textStyle}>Mute</span>
                      </div>
                    </button>
                  </MuteMenu>
                </div>

                {/* 2. Nút Pin */}
                <div className="h-16 w-24 grid place-items-center">
                  <button className={buttonStyle}>
                    <div className={contentStyle}>
                      <Pin size={20} className="mb-1" />
                      <span className={textStyle}>Pin</span>
                    </div>
                  </button>
                </div>

                {/* 3. Nút Create/Add */}
                <div className="h-16 w-24 grid place-items-center">
                  {conversation?.type === "direct" ? (
                    /* Dùng asChild để truyền style vào bên trong CreateGroupDialog */
                    <CreateGroupDialog asChild>
                      <button className={buttonStyle}>
                        <div className={contentStyle}>
                          <Users size={20} className="mb-1" />
                          <span className={textStyle}>Create group</span>
                        </div>
                      </button>
                    </CreateGroupDialog>
                  ) : (
                    /* Dùng asChild để truyền style vào bên trong AddMemberDialog */
                    <AddMemberDialog asChild>
                      <button className={buttonStyle}>
                        <div className={contentStyle}>
                          <UserPlus size={20} className="mb-1" />
                          <span className={textStyle}>Add member</span>
                        </div>
                      </button>
                    </AddMemberDialog>
                  )}
                </div>
              </div>
              {/* --- KẾT THÚC THAY ĐỔI --- */}

            </div>

            {/* Accordion sections (Không đổi) */}
            <div className="overflow-hidden">
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={["media", "audio", "file", "members", "security"]}
              >
                {/* ... (Tất cả các AccordionItem không thay đổi) ... */}
                {/* --- ẢNH/VIDEO --- */}
                <AccordionItem value="media">
                  <AccordionTrigger className="text-base p-4">Ảnh/Video</AccordionTrigger>
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
                        Xem tất cả
                      </button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* --- AUDIO --- */}
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
                        Xem tất cả
                      </button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* --- FILE --- */}
                <AccordionItem value="file">
                  <AccordionTrigger className="text-base p-4">File</AccordionTrigger>
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
                        Xem tất cả
                      </button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* --- THÀNH VIÊN NHÓM --- */}
                <AccordionItem value="members">
                  <AccordionTrigger className="text-base p-4">Thành viên nhóm</AccordionTrigger>
                  <AccordionContent className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-2">
                      {conversation?.type !== "group" ||
                      !Array.isArray(conversation?.group?.members) ||
                      !conversation.group.members.length ? (
                        <div className="text-sm text-muted-foreground">
                          Cuộc trò chuyện này không phải nhóm hoặc chưa có thành viên.
                        </div>
                      ) : (
                        conversation.group.members.map((m) => {
                          const name = m?.fullName || m?.username || "User";
                          const initial = (name?.[0] || "U").toUpperCase();
                          return (
                            <div
                              key={m._id || m.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60"
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={m?.avatarUrl || ""} />
                                <AvatarFallback>{initial}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{name}</div>
                                {m?.status?.isOnline !== undefined && (
                                  <div className="text-xs text-muted-foreground">
                                    {m.status.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* --- BẢO MẬT --- */}
                <AccordionItem value="security">
                  <AccordionTrigger className="text-base p-4">Thiết lập bảo mật</AccordionTrigger>
                  <AccordionContent className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <Shield size={18} className="mr-3 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">Tin nhắn tự xóa</p>
                            <p className="text-xs truncate">Không bao giờ</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <EyeOff size={18} className="mr-3 shrink-0" />
                          <span className="text-sm font-medium truncate">Ẩn trò chuyện</span>
                        </div>
                        <Switch className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground shrink-0" />
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center mb-5 min-w-0">
                          <TriangleAlert size={18} className="mr-3 shrink-0" />
                          <span className="text-sm truncate">Báo xấu</span>
                        </div>

                        <div
                          className="flex items-center text-destructive mb-5 cursor-pointer min-w-0"
                          onClick={() => handleDeleteConversation(conversation?._id)}
                        >
                          <Trash size={18} className="mr-3 shrink-0" />
                          <span className="text-sm truncate">Xóa lịch sử trò chuyện</span>
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
  );
}

export default ChatSidebarRight;