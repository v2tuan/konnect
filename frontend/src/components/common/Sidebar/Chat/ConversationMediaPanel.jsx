import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import MediaWindowViewer from "./MediaWindowViewer";
import {API_ROOT} from "@/utils/constant.js";

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
  const KIND_TABS = useMemo(() => ({ visual: ["image", "video"], binary: ["audio", "file"] }), []);
  const allowedTabs = useMemo(() => (onlyTab ? [onlyTab] : (KIND_TABS[kind] || ["image", "video"])), [KIND_TABS, kind, onlyTab]);
  const initialTab = defaultTab && allowedTabs.includes(defaultTab) ? defaultTab : allowedTabs[0];
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

  const resetAndReload = useCallback(() => { setItems([]); setPage(1); }, []);
  useEffect(() => { resetAndReload(); }, [conversationId, tab, resetAndReload]);

  useEffect(() => {
    let aborted = false;
    async function fetchMedia() {
      if (!conversationId || !tab) return;
      setLoading(true); setError("");
      try {
        const qs = new URLSearchParams({ type: tab, page: String(page), limit: String(limit), ts: String(Date.now()) }).toString();
        const url = `${API_ROOT}/api/conversation/${conversationId}/media?${qs}`;
        const res = await fetch(url, { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
        if (res.status === 404) { if (!aborted) { setItems([]); setHasMore(false); setSummary({}); setError("HTTP 404"); } return; }
        if (!res.ok && res.status !== 304) throw new Error(`HTTP ${res.status}`);
        const data = res.status === 304 ? null : await res.json();
        if (aborted) return;
        if (data) {
          setItems((prev) => (page === 1 ? (data.items || []) : [...prev, ...(data.items || [])]));
          setHasMore(Boolean(data.hasMore));
          setSummary(data.summary || {});
        } else setHasMore(false);
      } catch (e) {
        if (!aborted) setError(e.message || "Không thể tải dữ liệu");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    fetchMedia();
    return () => { aborted = true; };
  }, [conversationId, tab, page, limit]);

  const onLoadMore = useCallback(() => { if (!loading && hasMore) setPage((p) => p + 1); }, [loading, hasMore]);

  const openViewerAt = useCallback((idx) => {
    if (!isVisualTab) return;
    setViewerIndex(idx);
    setViewerOpen(true);
  }, [isVisualTab]);

  const fmtBytes = (n) => {
    if (n === undefined || n === null) return "";
    const u = ["B", "KB", "MB", "GB", "TB"]; let v = Number(n), i = 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
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
      {value === "image" ? "Ảnh" : value === "video" ? "Video" : value === "audio" ? "Audio" : "File"}
      {typeof summary[value] === "number" ? ` (${summary[value]})` : ""}
    </Button>
  );

  return (
    <div className="w-full">
      {showTabs && !onlyTab && (
        <div className="flex gap-2 mb-2 px-4">
          {allowedTabs.map((t) => <TabButton key={t} value={t} />)}
        </div>
      )}

      <div className="px-3 pb-3">
        {!!error && <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md mb-2">{error}</div>}

        {isVisualTab && (
          <div className={`grid ${gridColsClass} gap-2`}>
            {items.map((m, idx) => (
              <button
                key={(m._id || m.id || m.url) + idx}
                type="button"
                className="relative aspect-square rounded-md overflow-hidden bg-muted"
                onClick={() => openViewerAt(idx)}
                title={m.metadata?.originalName || ""}
              >
                {m.type === "image" ? (
                  <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                )}
              </button>
            ))}
          </div>
        )}

        {tab === "audio" && (
          <div className="space-y-2">
            {items.map((m) => (
              <div key={m._id || m.id || m.url} className="flex items-center gap-3 p-2 border rounded-lg">
                <audio controls src={m.url} className="w-full" preload="none" />
                <div className="shrink-0 text-xs text-muted-foreground">{fmtBytes(m.metadata?.size)}</div>
                <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline shrink-0">Tải</a>
              </div>
            ))}
          </div>
        )}

        {tab === "file" && (
          <div className="space-y-2">
            {items.map((m) => (
              <div key={m._id || m.id || m.url} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{m.metadata?.originalName || m.metadata?.filename || "Tệp đính kèm"}</div>
                  <div className="text-xs text-muted-foreground">{m.metadata?.mimetype || ""} · {fmtBytes(m.metadata?.size)}</div>
                </div>
                <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Tải</a>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="text-sm text-muted-foreground p-3">Đang tải…</div>}
        {!loading && items.length === 0 && !error && (<div className="text-sm text-muted-foreground p-3">Chưa có dữ liệu.</div>)}
        {showLoadMore && !loading && hasMore && (
          <div className="flex justify-center mt-3">
            <Button onClick={onLoadMore} variant="outline" size="sm">Tải thêm</Button>
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
          title={tab === "image" ? "Ảnh" : "Video"}
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
