// src/components/chat/MediaWindowViewer.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import {
  X, ChevronUp, ChevronDown, Share2, Download, RotateCw,
  ExternalLink, ZoomIn, ZoomOut, Maximize2, Minimize2
} from "lucide-react";

function formatTime(ts) {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch { return ""; }
}

function ViewerContent({
                         items,
                         startIndex = 0,
                         onClose,
                         onLoadMore,
                         hasMore = false,
                         title = "Xem ảnh",
                       }) {
  const [active, setActive] = useState(startIndex);
  const rightPaneRef = useRef(null);
  const activeThumbRef = useRef(null);

  // canvas state cho ảnh
  const [rotation, setRotation] = useState(0); // 0/90/180/270
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(true); // true: fit (contain); false: 1:1 (theo scale)

  const current = items[active];
  const isImage = current?.type === "image";
  const isVideo = current?.type === "video";

  // Scroll thumb đang chọn
  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [active]);

  // Reset state khi đổi ảnh
  useEffect(() => { setRotation(0); setScale(1); setFit(true); }, [active]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "j") setActive((i) => Math.min(i + 1, items.length - 1));
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "k") setActive((i) => Math.max(i - 1, 0));
      if (isImage && (e.key === "+" || e.key === "=")) setScale((s) => Math.min(s + 0.1, 5));
      if (isImage && e.key === "-") setScale((s) => Math.max(s - 0.1, 0.2));
      if (isImage && e.key.toLowerCase() === "r") setRotation((r) => (r + 90) % 360);
      if (isImage && e.key.toLowerCase() === "f") setFit((f) => !f);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, onClose, isImage]);

  // Load-more khi gần cuối cột phải
  const onRightScroll = useCallback(() => {
    if (!rightPaneRef.current || !hasMore || !onLoadMore) return;
    const el = rightPaneRef.current;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 500;
    if (nearBottom) onLoadMore();
  }, [hasMore, onLoadMore]);

  // Actions
  const handleShare = async () => {
    const url = current?.url;
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: current?.metadata?.originalName || "media" });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("Đã copy link vào clipboard!");
      }
    } catch { /* ignore */ }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = current?.url;
    a.download = current?.metadata?.originalName || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleOpenNewTab = () => {
    window.open(current?.url, "_blank", "noopener,noreferrer");
  };

  const canZoom = isImage;
  const scaleText = useMemo(() => `${Math.round(scale * 100)}%`, [scale]);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 text-white">
      {/* Top bar */}
      <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between">
        <div className="truncate">{title}</div>
        <div className="flex items-center gap-3">
          <div className="text-xs opacity-80">{items.length ? `${active + 1}/${items.length}` : "0/0"}</div>
          <Button size="sm" variant="secondary" onClick={onClose} className="h-8 px-2">
            <X className="w-4 h-4 mr-1" /> Đóng
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="h-[calc(100vh-6.5rem)] w-full flex">
        {/* Main */}
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
          {/* media */}
          <div className="max-w-[96%] max-h-[96%]">
            {isVideo ? (
              <video
                key={(current?._id || current?.url) + active}
                src={current?.url}
                className="max-h-[92vh] max-w-full rounded-lg"
                controls
                autoPlay
              />
            ) : (
              <img
                key={(current?._id || current?.url) + active + rotation + scale + (fit ? "fit" : "free")}
                src={current?.url}
                alt={current?.metadata?.originalName || ""}
                className={`${fit ? "max-h-[92vh] max-w-full" : ""} rounded-lg object-contain`}
                style={{ transform: `rotate(${rotation}deg) scale(${fit ? 1 : scale})`, transformOrigin: "center" }}
                draggable={false}
              />
            )}
          </div>

          {/* quick nav */}
          <div className="absolute left-4 bottom-6 hidden md:flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setActive((i) => Math.max(i - 1, 0))}>
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setActive((i) => Math.min(i + 1, items.length - 1))}>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* caption bottom-left */}
          {(current?.metadata?.senderName || current?.metadata?.createdAt) && (
            <div className="absolute left-4 bottom-4 px-3 py-2 rounded-md bg-black/50 text-xs backdrop-blur">
              <div className="font-medium">{current?.metadata?.senderName || ""}</div>
              <div className="opacity-80">{formatTime(current?.metadata?.createdAt)}</div>
            </div>
          )}
        </div>

        {/* Right thumbs */}
        <aside
          ref={rightPaneRef}
          onScroll={onRightScroll}
          className="w-36 md:w-44 lg:w-52 border-l border-white/10 overflow-y-auto p-2 space-y-2"
        >
          {items.map((m, idx) => {
            const isActive = idx === active;
            return (
              <button
                key={(m._id || m.id || m.url) + idx}
                ref={isActive ? activeThumbRef : null}
                type="button"
                onClick={() => setActive(idx)}
                className={`w-full aspect-video rounded-md overflow-hidden border ${
                  isActive ? "border-blue-500 ring-1 ring-blue-500" : "border-white/20 hover:border-white/40"
                }`}
                title={m.metadata?.originalName || ""}
              >
                {m.type === "image" ? (
                  <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                )}
              </button>
            );
          })}
          {hasMore && <div className="py-3 text-center text-xs text-white/70">Đang tải thêm…</div>}
          {!items.length && <div className="py-10 text-center text-sm text-white/70">Chưa có ảnh/video.</div>}
        </aside>
      </div>

      {/* Bottom toolbar */}
      <div className="h-14 px-4 border-t border-white/10 flex items-center justify-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleShare} className="text-white/90 hover:text-white">
          <Share2 className="w-4 h-4 mr-2" /> Chia sẻ
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="text-white/90 hover:text-white">
          <Download className="w-4 h-4 mr-2" /> Tải xuống
        </Button>

        <span className="mx-2 w-px h-6 bg-white/20" />

        <Button variant="ghost" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)} disabled={!isImage}
                className="text-white/90 hover:text-white">
          <RotateCw className="w-4 h-4 mr-2" /> Xoay
        </Button>

        <Button variant="ghost" size="sm" onClick={handleOpenNewTab} className="text-white/90 hover:text-white">
          <ExternalLink className="w-4 h-4 mr-2" /> Mở tab mới
        </Button>

        <span className="mx-2 w-px h-6 bg-white/20" />

        <Button variant="ghost" size="sm" disabled={!canZoom} onClick={() => setScale((s) => Math.max(0.2, +(s - 0.1).toFixed(2)))}
                className="text-white/90 hover:text-white">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <div className="text-xs w-14 text-center opacity-80">{canZoom ? scaleText : "-"}</div>
        <Button variant="ghost" size="sm" disabled={!canZoom} onClick={() => setScale((s) => Math.min(5, +(s + 0.1).toFixed(2)))}
                className="text-white/90 hover:text-white">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canZoom}
          onClick={() => setFit((f) => !f)}
          className="text-white/90 hover:text-white"
          title={fit ? "Chuyển 1:1" : "Fit màn hình"}
        >
          {fit ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
          {fit ? "1:1" : "Fit"}
        </Button>
      </div>
    </div>
  );
}

export default function MediaWindowViewer(props) {
  const [portalEl] = useState(() => {
    const el = document.createElement("div");
    el.setAttribute("id", "media-window-portal");
    return el;
  });

  useEffect(() => {
    document.body.appendChild(portalEl);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  return ReactDOM.createPortal(<ViewerContent {...props} />, portalEl);
}

MediaWindowViewer.propTypes = {
  items: PropTypes.array.isRequired,
  startIndex: PropTypes.number,
  onClose: PropTypes.func,
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  title: PropTypes.string,
};
