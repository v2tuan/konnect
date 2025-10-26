import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import MediaWindowViewer from "./MediaWindowViewer";
import { API_ROOT } from "@/utils/constant.js";
import { Download } from "lucide-react";
import { getSocket, connectSocket } from "@/lib/socket";

const EXT_FROM_MIME = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "image/heic": "heic", "image/heif": "heif",
  "application/pdf": "pdf", "application/zip": "zip", "application/x-zip-compressed": "zip",
  "application/x-7z-compressed": "7z", "application/x-rar-compressed": "rar",
  "text/plain": "txt", "text/markdown": "md", "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav",
  "audio/ogg": "ogg", "audio/x-m4a": "m4a", "audio/mp4": "m4a",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};

const sanitizeName = (s) => (s || "file").replace(/[\\/:*?"<>|]+/g, "_").trim();
const extFromMime = (mime = "") => EXT_FROM_MIME[mime.toLowerCase()] || "";

// lấy tên có đuôi từ URL nếu có
function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "";
    const m = last.match(/^([^/?#]+?\.[A-Za-z0-9]{2,5})(?:$|[?#])/);
    return m ? decodeURIComponent(m[1]) : "";
  } catch { return ""; }
}

function ensureExt(nameBase, mimeGuess, typeGuess) {
  const hasExt = /\.[A-Za-z0-9]{2,5}$/.test(nameBase);
  if (hasExt) return nameBase;

  // ưu tiên mime → map
  let ext = extFromMime(mimeGuess);
  // fallback theo loại (khi blob.type rỗng)
  if (!ext && typeGuess) {
    if (typeGuess === "image") ext = "jpg";
    else if (typeGuess === "video") ext = "mp4";
    else if (typeGuess === "audio") ext = "m4a";
    else if (typeGuess === "file") ext = "bin";
  }
  return ext ? `${nameBase}.${ext}` : `${nameBase}.bin`;
}

async function downloadMediaFile(m) {
  const url = m?.url || "";
  const typeGuess = (m?.type || "").toLowerCase();

  // 1) Chọn base name tốt nhất
  const urlName = filenameFromUrl(url);
  const metaName = m?.metadata?.originalName || m?.metadata?.filename || "";
  let baseName = sanitizeName(metaName || urlName || "file");

  // 2) Nếu đã có đuôi từ meta/url thì dùng luôn
  if (/\.[A-Za-z0-9]{2,5}$/.test(baseName)) {
    // cố gắng tải bằng fetch để đảm bảo đặt tên; nếu fail dùng anchor fallback
    try {
      const sameOrigin = new URL(url, window.location.href).origin === window.location.origin;
      const res = await fetch(url, { credentials: sameOrigin ? "include" : "omit" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = baseName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      return;
    } catch {
      // fallback: vẫn ép tên qua attribute download
      const a = document.createElement("a");
      a.href = url;
      a.download = baseName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
  }

  // 3) Chưa có đuôi → thử fetch để đọc mime, nếu bị CORS thì fallback anchor + đoán đuôi
  try {
    const sameOrigin = new URL(url, window.location.href).origin === window.location.origin;
    const res = await fetch(url, { credentials: sameOrigin ? "include" : "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const mime = m?.metadata?.mimetype || blob.type || "";
    const filename = ensureExt(baseName, mime, typeGuess);

    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch {
    // CORS/opaque → vẫn ép tên + đuôi đoán được
    const filename = ensureExt(baseName, m?.metadata?.mimetype || "", typeGuess);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export default function ConversationMediaPanel({
                                                 conversationId,
                                                 kind = "visual",
                                                 defaultTab,
                                                 onlyTab,
                                                 pageSize,
                                                 showTabs = true,
                                                 showLoadMore = true,
                                                 gridCols = 3,
                                               }) {
  const KIND_TABS = useMemo(
    () => ({ visual: ["image", "video"], binary: ["audio", "file"] }),
    []
  );
  const allowedTabs = useMemo(
    () => (onlyTab ? [onlyTab] : KIND_TABS[kind] || ["image", "video"]),
    [KIND_TABS, kind, onlyTab]
  );
  const initialTab =
    defaultTab && allowedTabs.includes(defaultTab) ? defaultTab : allowedTabs[0];
  const [tab, setTab] = useState(initialTab);

  const isVisualTab = tab === "image" || tab === "video";
  const limit = pageSize || (isVisualTab ? 24 : 20);

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const gridColsClass = gridCols === 4 ? "grid-cols-4" : "grid-cols-3";

  const resetAndReload = useCallback(() => {
    setItems([]);
    setPage(1);
  }, []);
  useEffect(() => {
    resetAndReload();
  }, [conversationId, tab, resetAndReload]);

  useEffect(() => {
    let aborted = false;
    async function fetchMedia() {
      if (!conversationId || !tab) return;
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({
          type: tab,
          page: String(page),
          limit: String(limit),
          ts: String(Date.now()),
        }).toString();
        // ✅ đúng URL (plural)
        const url = `${API_ROOT}/api/conversation/${conversationId}/media?${qs}`;
        const res = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (res.status === 404) {
          if (!aborted) {
            setItems([]);
            setHasMore(false);
            setSummary({});
            setError("HTTP 404");
          }
          return;
        }
        if (!res.ok && res.status !== 304) throw new Error(`HTTP ${res.status}`);
        const data = res.status === 304 ? null : await res.json();
        if (aborted) return;
        if (data) {
          setItems((prev) =>
            page === 1 ? data.items || [] : [...prev, ...(data.items || [])]
          );
          setHasMore(Boolean(data.hasMore));
          setSummary(data.summary || {});
        } else setHasMore(false);
      } catch (e) {
        if (!aborted) setError(e.message || "Cannot load data");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    fetchMedia();
    return () => {
      aborted = true;
    };
  }, [conversationId, tab, page, limit]);

  // ===== Socket live update (prepend media mới) =====
  useEffect(() => {
    if (!conversationId) return;

    // kết nối nếu cần
    let s = getSocket();
    if (!s || !s.connected) {
      s = connectSocket();
    }
    if (!s) return;

    const isMatchTab = (m) => {
      const t = (m?.type || "").toLowerCase();
      return t === tab;
    };

    // thêm mảng media mới vào state (tránh trùng)
    const prependItems = (incoming = []) => {
      if (!incoming.length) return;
      const usable = incoming.filter(Boolean).filter(isMatchTab);
      if (!usable.length) return;
      setItems((prev) => {
        const seen = new Set(prev.map((x) => String(x._id || x.id || x.url)));
        const fresh = [];
        for (const m of usable) {
          const key = String(m._id || m.id || m.url);
          if (!key || seen.has(key)) continue;
          fresh.push(m);
          seen.add(key);
        }
        return fresh.length ? [...fresh, ...prev] : prev;
      });
    };

    const onMediaNew = (payload) => {
      if (!payload || payload.conversationId !== conversationId) return;
      const arr = Array.isArray(payload.items) ? payload.items : [];
      prependItems(arr);
    };

    const onMessageNew = (payload) => {
      if (!payload || payload.conversationId !== conversationId) return;
      const msg = payload.message;
      const media = Array.isArray(msg?.media) ? msg.media : [];
      // chuẩn hóa về shape Media mà API trả
      const normalized = media.map((m) => ({
        _id: m._id || m.id,
        conversationId: m.conversationId || conversationId,
        type: (m.type || "").toLowerCase(),
        url: m.url,
        sentAt: m.sentAt || m.uploadedAt || m?.metadata?.sentAt,
        uploadedAt: m.uploadedAt,
        metadata: m.metadata || {}
      }));
      prependItems(normalized);
    };

    // join room
    s.emit("conversation:join", { conversationId });
    s.on("media:new", onMediaNew);
    s.on("message:new", onMessageNew);

    return () => {
      s.off("media:new", onMediaNew);
      s.off("message:new", onMessageNew);
    };
  }, [conversationId, tab]);

  const onLoadMore = useCallback(() => {
    if (!loading && hasMore) setPage((p) => p + 1);
  }, [loading, hasMore]);

  const openViewerAt = useCallback(
    (idx) => {
      if (!isVisualTab) return;
      setViewerIndex(idx);
      setViewerOpen(true);
    },
    [isVisualTab]
  );

  const fmtBytes = (n) => {
    if (n === undefined || n === null) return "";
    const u = ["B", "KB", "MB", "GB", "TB"];
    let v = Number(n),
      i = 0;
    while (v >= 1024 && i < u.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(1)} ${u[i]}`;
  };

  const TabButton = ({ value }) => (
    <Button
      key={value}
      type="button"
      variant={value === tab ? "default" : "outline"}
      size="sm"
      className="capitalize"
      onClick={() => value !== tab && setTab(value)}
    >
      {value === "image"
        ? "Images"
        : value === "video"
          ? "Video"
          : value === "audio"
            ? "Audio"
            : "Files"}
      {typeof summary[value] === "number" ? ` (${summary[value]})` : ""}
    </Button>
  );

  return (
    <div className="w-full">
      {showTabs && !onlyTab && (
        <div className="flex gap-2 mb-2 px-4">
          {allowedTabs.map((t) => (
            <TabButton key={t} value={t} />
          ))}
        </div>
      )}

      <div className="px-3 pb-3">
        {!!error && (
          <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md mb-2">
            {error}
          </div>
        )}

        {isVisualTab && (
          <div className={`grid ${gridColsClass} gap-2`}>
            {items.map((m, idx) => (
              <button
                key={(m._id || m.id || m.url) + idx}
                type="button"
                className="relative aspect-square rounded-md overflow-hidden bg-muted"
                onClick={() => openViewerAt(idx)}
                title={m.metadata?.originalName || m.metadata?.filename || ""}
              >
                {m.type === "image" ? (
                  <img
                    src={m.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={m.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {tab === "audio" && (
          <div className="space-y-2">
            {items.map((m) => (
              <div
                key={m._id || m.id || m.url}
                className="flex items-center gap-3 p-2 border rounded-lg"
              >
                <audio controls src={m.url} className="w-full" preload="none" />
                <div className="shrink-0 text-xs text-muted-foreground">
                  {fmtBytes(m.metadata?.size)}
                </div>
                <button
                  type="button"
                  aria-label="Download audio"
                  title="Download"
                  className="p-2 rounded-md hover:bg-muted shrink-0"
                  onClick={() => downloadMediaFile(m)}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "file" && (
          <div className="space-y-2">
            {items.map((m) => {
              const displayName =
                m?.metadata?.originalName || m?.metadata?.filename || "Attachment";
              return (
                <div
                  key={m._id || m.id || m.url}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {displayName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(m.metadata?.mimetype || "").toUpperCase()} ·{" "}
                      {fmtBytes(m.metadata?.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Download file"
                    title="Download"
                    className="p-2 rounded-md hover:bg-muted"
                    onClick={() => downloadMediaFile(m)}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="text-sm text-muted-foreground p-3">Loading…</div>
        )}
        {!loading && items.length === 0 && !error && (
          <div className="text-sm text-muted-foreground p-3">No data.</div>
        )}
        {showLoadMore && !loading && hasMore && (
          <div className="flex justify-center mt-3">
            <Button onClick={onLoadMore} variant="outline" size="sm">
              Load more
            </Button>
          </div>
        )}
      </div>

      {viewerOpen && isVisualTab && (
        <MediaWindowViewer
          items={items}
          startIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onLoadMore={hasMore ? onLoadMore : undefined}
          hasMore={hasMore}
          title={tab === "image" ? "Images" : "Video"}
        />
      )}
    </div>
  );
}

ConversationMediaPanel.propTypes = {
  conversationId: PropTypes.string.isRequired,
  kind: PropTypes.oneOf(["visual", "binary"]),
  defaultTab: PropTypes.oneOf(["image", "video", "audio", "file"]),
  onlyTab: PropTypes.oneOf(["image", "video", "audio", "file"]),
  pageSize: PropTypes.number,
  showTabs: PropTypes.bool,
  showLoadMore: PropTypes.bool,
  gridCols: PropTypes.oneOf([3, 4]),
};
