"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "react-toastify";
import { Phone, MessageSquare } from "lucide-react";

import { fetchConversationMedia } from "@/apis";
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

function maskPhone(p) {
  if (!p) return "";
  const s = String(p);
  if (s.length < 7) return "••••••••";
  return s.slice(0, 3) + "*****" + s.slice(-2);
}

/* --------------------------------- Dialog --------------------------------- */
export default function DirectInfoDialog({
                                           open,
                                           onOpenChange,
                                           conversation = {},
                                           peer = {},                 // { id, fullName, username, avatarUrl, bio, dateOfBirth, phone, gender }
                                           onCall,
                                           onMessage
                                         }) {
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [preview, setPreview] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Viewer (ảnh-only)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerHasMore, setViewerHasMore] = useState(false);
  const viewerLimit = 36;

  const displayName = peer?.fullName || conversation?.displayName || "User";
  const avatar = peer?.avatarUrl || conversation?.conversationAvatarUrl || "";
  const initials = useMemo(() => (displayName?.[0] || "U").toUpperCase(), [displayName]);

  // Load 4 ảnh preview
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!open || !conversation?._id) return;
      setLoadingMedia(true);
      try {
        const res = await fetchConversationMedia({
          conversationId: conversation._id,
          type: "image",
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
  }, [open, conversation?._id]);

  // Open viewer
  const openViewerAt = async (index = 0) => {
    if (!conversation?._id) return;
    try {
      const res = await fetchConversationMedia({
        conversationId: conversation._id,
        type: "image",
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
        type: "image",
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

  const remain = Math.max(0, totalCount - Math.min(preview.length, 3));
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

  const infoRow = (label, value) => (
    <div className="flex items-center justify-between py-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium max-w-[60%] truncate">{value || "—"}</div>
    </div>
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
            <DialogTitle className="text-base">Thông tin tài khoản</DialogTitle>
          </DialogHeader>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {/* Avatar + name + actions */}
            <div className="px-4 pt-5 pb-4 text-center">
              <div className="w-24 h-24 mx-auto mb-3">
                <Avatar className="w-24 h-24 text-2xl border">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </div>

              <h2 className="text-lg font-semibold mb-1">{displayName}</h2>
              {peer?.username && <div className="text-sm text-muted-foreground">@{peer.username}</div>}

              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button className="h-9" variant="secondary" onClick={() => onCall?.(peer)}>
                  <Phone className="w-4 h-4 mr-2" /> Gọi điện
                </Button>
                <Button className="h-9" onClick={() => onMessage?.(peer)}>
                  <MessageSquare className="w-4 h-4 mr-2" /> Nhắn tin
                </Button>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Personal info */}
            <div className="px-4 py-3">
              <div className="text-sm font-medium mb-1">Thông tin cá nhân</div>
              <div className="divide-y">
                {infoRow("Bio", peer?.bio)}
                {infoRow("Giới tính", peer?.gender === "male" ? "Nam" : peer?.gender === "female" ? "Nữ" : "—")}
                {infoRow("Ngày sinh", peer?.dateOfBirth ? new Date(peer.dateOfBirth).toLocaleDateString() : null)}
                {infoRow("Điện thoại", maskPhone(peer?.phone))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Photos (preview 4) */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Hình ảnh</div>
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
                  Chưa có ảnh nào trong cuộc trò chuyện này.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {preview.slice(0, 3).map((m, idx) => (
                    <Thumb
                      key={m._id || m.url || idx}
                      src={m.thumbnailUrl || m.url}
                      onClick={() => openViewerAt(idx)}
                      title={m?.metadata?.originalName}
                    />
                  ))}

                  {remain > 0 ? (
                    <button
                      type="button"
                      className="relative aspect-square rounded-md bg-muted flex items-center justify-center text-base font-medium"
                      onClick={() => openViewerAt(3)}
                      title={`Xem thêm ${remain} ảnh khác`}
                    >
                      +{remain}
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

            {/* Actions (gợi ý) */}
            <div className="px-4 py-3 space-y-3">
              <Button variant="outline" className="w-full h-9 justify-start">Chia sẻ danh thiếp</Button>
              <Button variant="outline" className="w-full h-9 justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                Chặn người này
              </Button>
              <Button variant="outline" className="w-full h-9 justify-start">Báo cáo</Button>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-4 py-3 border-t sticky bottom-0 bg-card z-10">
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange?.(false)}>Đóng</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image viewer */}
      {viewerOpen && (
        <MediaWindowViewer
          items={viewerItems.map((m) => ({ _id: m._id, url: m.url, type: "image", metadata: m.metadata }))}
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

DirectInfoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func,
  conversation: PropTypes.object,
  peer: PropTypes.object,
  onCall: PropTypes.func,
  onMessage: PropTypes.func
};
