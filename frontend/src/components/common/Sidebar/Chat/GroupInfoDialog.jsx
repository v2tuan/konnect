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
  fetchConversationMedia, updateGroupMetaAPI, updateMemberNicknameAPI
} from "@/apis";

// ✅ Portal viewer dùng chung của bạn
import MediaWindowViewer from "@/components/common/Sidebar/Chat/MediaWindowViewer.jsx";

/* ----------------------------- Helpers ảnh-only ---------------------------- */
const IMG_EXT = ["jpg","jpeg","png","gif","webp","bmp","avif","jfif","heic","heif"];

function isImageMedia(m) {
  const mime = (m?.mimeType || m?.contentType || m?.metadata?.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const url = m?.secure_url || m?.url || "";
  const ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  if (IMG_EXT.includes(ext)) return true;
  return (m?.type || "").toLowerCase() === "image";
}

function normalizeImage(m) {
  if (!isImageMedia(m)) return null;
  const url = m?.secure_url || m?.url || "";
  if (!url) return null;
  return {
    _id: m._id || m.id || url,
    url,
    type: "image",
    thumbnailUrl: m?.thumbnailUrl || m?.metadata?.thumbnailUrl || url,
    metadata: {
      originalName: m?.originalName || m?.metadata?.originalName || m?.metadata?.filename || "",
      createdAt: m?.createdAt || m?.metadata?.createdAt,
      senderName: m?.senderName || m?.metadata?.senderName,
      mimetype: (m?.mimeType || m?.contentType || m?.metadata?.mimetype || "").toLowerCase()
    }
  };
}
function MembersDialog({ open, onOpenChange, conversation }) {
  const [items, setItems] = useState(() => (conversation?.group?.members || []).map(m => ({
    id: String(m._id || m.id),
    avatarUrl: m.avatarUrl || "",
    name: m.fullName || m.username || "User",
    nickname: m.nickname || "",
    saving: false,
  })));
  const [filter, setFilter] = useState("");

  useEffect(() => {
    // đồng bộ khi mở lại dialog hoặc đổi hội thoại
    if (!open) return;
    setItems((conversation?.group?.members || []).map(m => ({
      id: String(m._id || m.id),
      avatarUrl: m.avatarUrl || "",
      name: m.fullName || m.username || "User",
      nickname: m.nickname || "",
      saving: false,
    })));
  }, [open, conversation?._id]);
  useEffect(() => {
    const handleNicknameUpdate = (e) => {
      const { conversationId, memberId, nickname } = e.detail || {};

      // Chỉ cập nhật nếu đúng là conversation này
      if (String(conversationId) !== String(conversation?._id)) return;

      setItems(prev =>
        prev.map(it =>
          it.id === String(memberId)
            // Cập nhật nickname và reset 'saving' (nếu có)
            ? { ...it, nickname: nickname || "", saving: false }
            : it
        )
      );
    };

    window.addEventListener('conversation:member-nickname-updated', handleNicknameUpdate);
    return () => {
      window.removeEventListener('conversation:member-nickname-updated', handleNicknameUpdate);
    };
  }, [conversation?._id]);
  const onChangeNick = (id, v) => {
    setItems(prev =>
      prev.map(it => (it.id === String(id) ? { ...it, nickname: v } : it))
    );
  };

  const onSaveNick = async (id) => {
    let nickname = "";
    setItems((prev) => {
      const hit = prev.find((i) => i.id === id);
      nickname = (hit && hit.nickname) || "";
      return prev.map((it) => (it.id === id ? { ...it, saving: true } : it));
    });

    try {
      // ✅ Sửa: Lấy kết quả trả về từ API
      const data = await updateMemberNicknameAPI(conversation._id, id, nickname);
      toast.success("Đã cập nhật biệt danh");

      // ✅ BỔ SUNG: Dispatch event toàn cục để các component khác cập nhật
      // (Bao gồm cả component này và các component khác)
      window.dispatchEvent(new CustomEvent('conversation:member-nickname-updated', {
        detail: {
          conversationId: String(conversation._id),
          memberId: String(id),
          nickname: data?.nickname || nickname, // Lấy nickname chính xác từ response
          updatedBy: data?.updatedBy // (Nếu API có trả về)
        }
      }));

    } catch (e) {
      const msg = (e?.response?.data?.message) || e.message || "Lưu biệt danh thất bại";
      toast.error(msg);
      // Cân nhắc: rollback state `nickname` ở đây nếu thất bại
    } finally {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, saving: false } : it))
      );
    }
  };
  const list = items.filter(it => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return it.name.toLowerCase().includes(q) || (it.nickname || "").toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[520px] max-w-[92vw] p-0 overflow-hidden rounded-xl bg-card">
        <DialogHeader className="px-4 py-3 border-b sticky top-0 bg-card z-10">
          <DialogTitle className="text-base">Thành viên</DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-3">
          <Input
            placeholder="Tìm theo tên hoặc biệt danh…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="px-2 py-2 max-h-[60vh] overflow-y-auto">
          {list.length === 0 ? (
            <div className="px-2 py-6 text-sm text-muted-foreground text-center">Không có thành viên</div>
          ) : (
            <ul className="space-y-2">
              {list.map(m => (
                <li key={m.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={m.avatarUrl} />
                    <AvatarFallback>{(m.name[0] || "U").toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        value={m.nickname}
                        onChange={(e) => onChangeNick(m.id, e.target.value)}
                        placeholder="Biệt danh (tuỳ chọn)"
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={m.saving}
                        onClick={() => onSaveNick(m.id)}
                      >
                        {m.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu"}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="px-4 py-3 border-t sticky bottom-0 bg-card">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange?.(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
/* --------------------------------- Dialog --------------------------------- */
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

  // Avatar
  const fileRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Preview media (4 tiles)
  const [preview, setPreview] = useState([]);      // array ảnh đã normalize
  const [totalCount, setTotalCount] = useState(0); // tổng ảnh
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaBump, setMediaBump] = useState(0);   // trigger reload preview

  // Viewer state (chỉ ảnh)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState([]); // ảnh đã normalize
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerHasMore, setViewerHasMore] = useState(false);
  const viewerLimit = 36;
  const [membersOpen, setMembersOpen] = useState(false);

  // Reset khi mở
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

  // Load preview ảnh (tối đa 4)
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!open || !conversation?._id) return;
      setLoadingMedia(true);
      try {
        const res = await fetchConversationMedia({
          conversationId: conversation._id,
          type: "image",  // ép BE trả về chỉ ảnh
          page: 1,
          limit: 4
        });
        const raw = res?.items ?? res?.data ?? [];
        const imgs = raw.map(normalizeImage).filter(Boolean);
        const total = res?.total ?? res?.count ?? imgs.length;
        if (!alive) return;
        setPreview(imgs.slice(0, 4));
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

  // Reload preview khi upload xong (sự kiện toàn cục của bạn)
  useEffect(() => {
    const onUploaded = (e) => {
      if (e?.detail?.conversationId === conversation?._id) {
        setMediaBump((t) => t + 1);
      }
    };
    window.addEventListener("media:uploaded", onUploaded);
    return () => window.removeEventListener("media:uploaded", onUploaded);
  }, [conversation?._id]);

  // Helpers
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

      // ✅ GỌI API CHUNG với cả name và avatar
      const result = await updateGroupMetaAPI(conversation._id, {
        displayName: nameChanged ? name.trim() : null,
        avatarFile: avatarChanged ? avatarFile : null
      });

      console.log('✅ Update result:', result);

      // ✅ Lấy giá trị từ response
      const newName = result?.displayName;
      const newAvatar = result?.conversationAvatarUrl;

      // Callbacks
      if (newName) {
        onNameUpdated?.(newName);
      }
      if (newAvatar) {
        onAvatarUpdated?.(newAvatar);
      }

      // ✅ Dispatch events để các components khác cập nhật
      if (newName) {
        window.dispatchEvent(new CustomEvent('conversation:name-updated', {
          detail: { id: conversation._id, name: newName }
        }));
      }

      if (newAvatar) {
        window.dispatchEvent(new CustomEvent('conversation:avatar-updated', {
          detail: { id: conversation._id, url: newAvatar }
        }));

        // Reload media preview
        window.dispatchEvent(new CustomEvent("media:uploaded", {
          detail: { conversationId: conversation._id }
        }));
      }

      toast.success("Đã cập nhật thông tin nhóm");

      // Đợi 300ms để events được xử lý trước khi đóng dialog
      setTimeout(() => {
        onOpenChange?.(false);
      }, 300);

    } catch (e) {
      console.error("❌ handleSave error:", e);
      const errMsg = e?.response?.data?.message || e?.message || "Cập nhật thất bại";
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  /* ========================= MEDIA VIEWER (ảnh-only) ======================== */
  const openViewerAt = async (index = 0) => {
    if (!conversation?._id) return;
    try {
      const res = await fetchConversationMedia({
        conversationId: conversation._id,
        type: "image",   // ép chỉ ảnh
        page: 1,
        limit: viewerLimit
      });
      const raw = res?.items ?? res?.data ?? [];
      const items = raw.map(normalizeImage).filter(Boolean);
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
        type: "image",   // ép chỉ ảnh
        page: next,
        limit: viewerLimit
      });
      const raw = res?.items ?? res?.data ?? [];
      const more = raw.map(normalizeImage).filter(Boolean);
      const total = res?.total ?? res?.count ?? (viewerItems.length + more.length);

      const merged = [...viewerItems, ...more];
      setViewerItems(merged);
      setViewerPage(next);
      setViewerHasMore(merged.length < total);
    } catch (e) {
      console.error("load more viewer error:", e);
    }
  };

  // Ô thứ 4 thể hiện “+N”
  const remain = Math.max(0, totalCount - Math.min(preview.length, 3));

  // Thumb vuông, đồng đều kích thước
  const Thumb = ({ src, onClick, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title || ""}
      className="relative aspect-square rounded-md overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img src={src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
    </button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[460px] max-w-[92vw] p-0 flex flex-col overflow-hidden rounded-xl bg-card"
          style={{ maxHeight: "85vh" }}
        >
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b sticky top-0 bg-card z-10">
            <DialogTitle className="text-base">Thông tin nhóm</DialogTitle>
          </DialogHeader>

          {/* Body scroll */}
          <div className="overflow-y-auto flex-1">
            {/* Avatar + tên */}
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
              </div>

              {/* 👉 Bấm vào dãy avatar cũng mở */}
              <button
                type="button"
                className="flex flex-wrap items-center gap-2 w-full text-left"
                onClick={() => setMembersOpen(true)}
              >
                {(conversation?.group?.members || []).slice(0, 8).map((m) => {
                  const nm = m?.fullName || m?.username || "User";
                  return (
                    <Avatar key={m.id || m._id} className="size-8" title={nm}>
                      <AvatarImage src={m?.avatarUrl || ""} />
                      <AvatarFallback>{(nm[0] || "U").toUpperCase()}</AvatarFallback>
                    </Avatar>
                  );
                })}
                {((conversation?.group?.members || []).length > 8) && (
                  <div className="text-xs text-muted-foreground ml-1">
                    +{(conversation?.group?.members?.length || 0) - 8}
                  </div>
                )}
              </button>
            </div>

            <div className="h-px bg-border" />

            {/* Ảnh & Video – 4 ô vuông (ảnh-only) */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Ảnh &amp; Video</div>
                <Button
                  variant="link"
                  size="sm"
                  className="h-8 px-2"
                  disabled={loadingMedia || totalCount === 0}
                  onClick={() => openViewerAt(0)} // mở viewer từ ảnh đầu tiên
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
                  {/* 3 ô đầu là ảnh thật */}
                  {preview.slice(0, 3).map((m, idx) => (
                    <Thumb
                      key={m._id || m.url || idx}
                      src={m.thumbnailUrl || m.url}
                      onClick={() => openViewerAt(idx)}
                      title={m?.metadata?.originalName}
                    />
                  ))}

                  {/* Ô thứ 4: nếu còn nhiều thì hiện +N; nếu đủ 4 thì hiện ảnh thứ 4 */}
                  {Math.max(0, totalCount - Math.min(preview.length, 3)) > 0 ? (
                    <button
                      type="button"
                      className="relative aspect-square rounded-md bg-muted flex items-center justify-center text-base font-medium"
                      onClick={() => openViewerAt(3)}
                      title={`Xem thêm ${totalCount - 3} ảnh khác`}
                    >
                      +{totalCount - 3}
                    </button>
                  ) : preview[3] ? (
                    <Thumb
                      key={preview[3]._id || preview[3].url || "p3"}
                      src={preview[3].thumbnailUrl || preview[3].url}
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
                      // SỬA DÒNG NÀY: Dùng window.location.origin và conversation._id đầy đủ
                      value={`${window.location.origin}/join/${conversation?._id || ""}`}
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
                          // SỬA LẠI LOGIC COPY:
                          await navigator.clipboard.writeText(
                            `${window.location.origin}/join/${conversation?._id || ""}`
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
              </div>
            )}
          </div>

          {/* Footer */}
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
      <MembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        conversation={conversation}
      />
      {/* Media viewer portal – ẢNH ONLY */}
      {viewerOpen && (
        <MediaWindowViewer
          items={viewerItems.map((m) => ({
            _id: m._id,
            url: m.url,
            type: "image",         // đảm bảo ảnh
            metadata: m.metadata
          }))}
          startIndex={viewerIndex}
          hasMore={viewerHasMore}
          onLoadMore={loadMoreViewer}
          onClose={() => setViewerOpen(false)}
          title="Ảnh"
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
