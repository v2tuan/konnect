"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Pencil, Upload, Users, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import PropTypes from "prop-types";

import {
  renameGroupAPI,
  changeGroupAvatarAPI,
  fetchConversationMedia
} from "@/apis";

// ⬇️ PORTAL VIEWER (bạn đã có file riêng). Import đúng đường dẫn của bạn:
import MediaWindowViewer from "@/components/common/Sidebar/Chat/MediaWindowViewer.jsx";

function GroupInfoDialog({
                           open,
                           onOpenChange,
                           conversation = {},
                           onAvatarUpdated,
                           onNameUpdated,
                           onOpenAddMember,
                           onOpenManageMembers
                         }) {
  const isGroup = (conversation?.type || "") === "group";
  const [name, setName] = useState(conversation?.displayName || "");
  const [saving, setSaving] = useState(false);

  // avatar
  const fileRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // media preview (4 tile)
  const [preview, setPreview] = useState([]);   // 0..3 items
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaBump, setMediaBump] = useState(0); // trigger reload

  // full viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerHasMore, setViewerHasMore] = useState(false);
  const viewerLimit = 36;

  // reset khi mở
  useEffect(() => {
    if (!open) return;
    setName(conversation?.displayName || "");
    setAvatarFile(null);
    setAvatarPreview(null);

    // reset media preview
    setPreview([]);
    setTotalCount(0);
    setLoadingMedia(true);
    setMediaBump((t) => t + 1);
  }, [open, conversation?._id, conversation?.displayName]);

  // load media preview (tối đa 4)
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!open || !conversation?._id) return;
      setLoadingMedia(true);
      try {
        const res = await fetchConversationMedia({
          type: "image, video",
          conversationId: conversation._id,
          // tuỳ BE, có thể dùng "visual" hoặc bỏ trống type.
          // để chắc ăn, để trống => lấy tất cả ảnh/video.
          page: 1,
          limit: 4
        });
        const items = res?.items ?? res?.data ?? [];
        const total = res?.total ?? res?.count ?? items.length;
        if (!alive) return;
        setPreview(items.slice(0, 4));
        setTotalCount(total);
      } catch (e) {
        if (!alive) return;
        console.error("load preview error:", e);
        setPreview([]);
        setTotalCount(0);
      } finally {
        if (alive) setLoadingMedia(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [open, conversation?._id, mediaBump]);

  // lắng nghe khi upload xong để reload preview
  useEffect(() => {
    const onUploaded = (e) => {
      if (e?.detail?.conversationId === conversation?._id) {
        setMediaBump((t) => t + 1);
      }
    };
    window.addEventListener("media:uploaded", onUploaded);
    return () => window.removeEventListener("media:uploaded", onUploaded);
  }, [conversation?._id]);

  // helpers
  const initials = useMemo(
    () => (name || conversation?.displayName || "G")?.[0]?.toUpperCase?.() || "G",
    [name, conversation?.displayName]
  );
  const pickFile = () => fileRef.current?.click();
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Vui lòng chọn file ảnh.");
    if (f.size > 5 * 1024 * 1024) return toast.error("Kích thước ảnh tối đa 5MB.");
    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  const handleSave = async () => {
    if (!conversation?._id || !isGroup || saving) return;
    const nameChanged = name.trim() && name.trim() !== (conversation?.displayName || "");
    const avatarChanged = !!avatarFile;
    if (!nameChanged && !avatarChanged) {
      toast.info("Không có thay đổi để lưu.");
      return;
    }
    try {
      setSaving(true);
      const tasks = [];
      if (nameChanged) {
        tasks.push(
          renameGroupAPI(conversation._id, name.trim()).then((res) =>
            onNameUpdated?.(res?.name || name.trim())
          )
        );
      }
      if (avatarChanged) {
        tasks.push(
          changeGroupAvatarAPI(conversation._id, avatarFile).then((res) => {
            onAvatarUpdated?.(res?.avatarUrl);
            window.dispatchEvent(
              new CustomEvent("media:uploaded", { detail: { conversationId: conversation._id } })
            );
          })
        );
      }
      await Promise.all(tasks);
      toast.success("Đã cập nhật thông tin nhóm");
      onOpenChange?.(false);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  // =============== MEDIA VIEWER ===============
  const openViewerAt = async (index = 0) => {
    if (!conversation?._id) return;
    // load trang đầu tiên cho viewer
    try {
      const res = await fetchConversationMedia({
        conversationId: conversation._id,
        page: 1,
        limit: viewerLimit
      });
      const items = res?.items ?? res?.data ?? [];
      const total = res?.total ?? res?.count ?? items.length;
      setViewerItems(items);
      setViewerIndex(Math.max(0, Math.min(index, items.length - 1)));
      setViewerPage(1);
      setViewerHasMore(items.length < total);
      setViewerOpen(true);
    } catch (e) {
      console.error("open viewer error:", e);
      toast.error("Không mở được trình xem media.");
    }
  };

  const loadMoreViewer = async () => {
    if (!viewerHasMore || !conversation?._id) return;
    const next = viewerPage + 1;
    try {
      const res = await fetchConversationMedia({
        conversationId: conversation._id,
        page: next,
        limit: viewerLimit
      });
      const items = res?.items ?? res?.data ?? [];
      const total = res?.total ?? res?.count ?? (viewerItems.length + items.length);
      const merged = [...viewerItems, ...items];
      setViewerItems(merged);
      setViewerPage(next);
      setViewerHasMore(merged.length < total);
    } catch (e) {
      console.error("load more viewer error:", e);
    }
  };

  // Ô thứ 4 thể hiện “+N”
  const remain = Math.max(0, totalCount - Math.min(preview.length, 3));

  // unified thumb renderer – luôn vuông, ảnh không méo
  const Thumb = ({ src, isVideo = false, onClick, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title || ""}
      className="relative aspect-square rounded-md overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isVideo ? (
        <video src={src} className="absolute inset-0 w-full h-full object-cover" muted />
      ) : (
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      )}
    </button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[460px] max-w-[92vw] p-0 flex flex-col overflow-hidden rounded-xl bg-card"
          style={{ maxHeight: "85vh" }}
        >
          <DialogHeader className="px-4 py-3 border-b sticky top-0 bg-card z-10">
            <DialogTitle className="text-base">Thông tin nhóm</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1">
            {/* avatar + tên */}
            <div className="px-4 pt-5 pb-4 text-center">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <Avatar className="w-20 h-20 text-2xl border">
                  <AvatarImage src={avatarPreview || conversation?.conversationAvatarUrl || ""} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {isGroup && (
                  <>
                    <button
                      type="button"
                      onClick={pickFile}
                      className="absolute bottom-0 right-0 size-8 rounded-full bg-muted grid place-items-center border shadow-sm hover:bg-accent"
                      title="Đổi ảnh đại diện"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                  </>
                )}
              </div>

              {isGroup ? (
                <div className="flex items-center justify-center gap-1 mb-2 max-w-xs mx-auto">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                    className="h-9 text-center font-semibold text-lg"
                    placeholder="Tên nhóm"
                    maxLength={50}
                  />
                  <Pencil size={14} className="text-muted-foreground" />
                </div>
              ) : (
                <h2 className="text-lg font-semibold mb-2">{name}</h2>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Thành viên */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">
                  Thành viên ({conversation?.group?.members?.length || 0})
                </div>
                {isGroup && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onOpenAddMember?.()}>
                      <UserPlus className="w-4 h-4 mr-1" /> Thêm
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onOpenManageMembers?.()}>
                      <Users className="w-4 h-4 mr-1" /> Xem tất cả
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(conversation?.group?.members || []).slice(0, 8).map((m) => {
                  const nm = m?.fullName || m?.username || "User";
                  return (
                    <Avatar key={m.id || m._id} className="size-8" title={nm}>
                      <AvatarImage src={m?.avatarUrl || ""} />
                      <AvatarFallback>{(nm[0] || "U").toUpperCase()}</AvatarFallback>
                    </Avatar>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Ảnh & Video – 4 ô vuông */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Ảnh &amp; Video</div>
                <Button
                  variant="link"
                  size="sm"
                  className="h-8 px-2"
                  disabled={loadingMedia || totalCount === 0}
                  onClick={() => openViewerAt(0)}
                >
                  Xem tất cả ({totalCount})
                </Button>
              </div>

              {loadingMedia ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
                  ))}
                </div>
              ) : totalCount === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  Chưa có ảnh/video nào.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {/* 3 ô đầu là media thật */}
                  {preview.slice(0, 3).map((m, idx) => {
                    const src = m?.thumbnailUrl || m?.metadata?.thumbnailUrl || m?.secure_url || m?.url;
                    const isVideo = (m?.type || m?.mimeType || "").startsWith("video");
                    return (
                      <Thumb
                        key={(m._id || m.id || src || idx) + "p"}
                        src={src}
                        isVideo={isVideo}
                        onClick={() => openViewerAt(idx)}
                        title={m?.metadata?.originalName}
                      />
                    );
                  })}

                  {/* Ô thứ 4: nếu còn nhiều thì hiện +N, nếu đủ 4 thì hiện media thứ 4 */}
                  {remain > 0 ? (
                    <button
                      type="button"
                      className="relative aspect-square rounded-md bg-muted flex items-center justify-center text-base font-medium"
                      onClick={() => openViewerAt(3)}
                      title={`Xem thêm ${remain} ảnh/video khác`}
                    >
                      +{remain}
                    </button>
                  ) : preview[3] ? (
                    <Thumb
                      key={(preview[3]._id || preview[3].id || 3) + "p"}
                      src={
                        preview[3].thumbnailUrl ||
                        preview[3].metadata?.thumbnailUrl ||
                        preview[3].secure_url ||
                        preview[3].url
                      }
                      isVideo={(preview[3]?.type || preview[3]?.mimeType || "").startsWith("video")}
                      onClick={() => openViewerAt(3)}
                      title={preview[3]?.metadata?.originalName}
                    />
                  ) : (
                    <div className="aspect-square rounded-md bg-muted" />
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Link + hành động */}
            {isGroup && (
              <div className="px-4 py-3 space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">Link tham gia nhóm</div>
                  <div className="relative">
                    <Input
                      readOnly
                      value={`https://yourapp.com/join/${(conversation?._id || "").slice(-8)}`}
                      className="h-9 pr-24"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            `https://yourapp.com/join/${(conversation?._id || "").slice(-8)}`
                          );
                          toast.success("Đã sao chép link");
                        } catch {
                          toast.error("Không sao chép được");
                        }
                      }}
                    >
                      Sao chép
                    </Button>
                  </div>
                </div>

                <Button variant="outline" className="w-full h-9 justify-start text-muted-foreground">
                  Quản lý nhóm (Nâng cao)
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-9 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onOpenChange?.(false)}
                >
                  Rời nhóm
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="px-4 py-3 border-t sticky bottom-0 bg-card z-10">
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange?.(false)}>
                Đóng
              </Button>
              {isGroup && (name.trim() !== (conversation?.displayName || "") || avatarFile) && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Lưu thay đổi
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media viewer portal */}
      {viewerOpen && (
        <MediaWindowViewer
          items={viewerItems.map((m) => ({
            // Chuẩn hóa field cho viewer
            _id: m._id || m.id,
            url: m.secure_url || m.url, // ảnh/video gốc
            type: (m.type || m.mimeType || "").startsWith("video") ? "video" : "image",
            metadata: {
              originalName: m.originalName || m.metadata?.originalName || "",
              createdAt: m.createdAt || m.metadata?.createdAt,
              senderName: m.senderName || m.metadata?.senderName
            }
          }))}
          startIndex={viewerIndex}
          hasMore={viewerHasMore}
          onLoadMore={loadMoreViewer}
          onClose={() => setViewerOpen(false)}
          title="Ảnh/Video"
        />
      )}
    </>
  );
}

GroupInfoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func,
  conversation: PropTypes.object,
  onAvatarUpdated: PropTypes.func,
  onNameUpdated: PropTypes.func,
  onOpenAddMember: PropTypes.func,
  onOpenManageMembers: PropTypes.func
};

export default GroupInfoDialog;
