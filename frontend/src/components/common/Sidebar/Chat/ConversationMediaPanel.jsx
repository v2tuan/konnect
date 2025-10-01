// src/components/chat/ConversationMediaPanel.jsx
import { useEffect, useState, useRef, useCallback } from "react"
import PropTypes from "prop-types"
import { Button } from "@/components/ui/button"
import { fetchConversationMedia } from "@/apis/index.js"
import { Play, Download } from "lucide-react"

const KIND_TABS = {
  visual: ["image", "video"],
  binary: ["audio", "file"]
}

export default function ConversationMediaPanel({ conversationId, kind = "visual", defaultTab }) {
  const allowedTabs = KIND_TABS[kind] || ["image", "video"];
  const [tab, setTab] = useState(defaultTab || allowedTabs[0]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState({});
  const loadingRef = useRef(false);

  // Nếu prop thay đổi làm tab hiện tại không hợp lệ -> reset
  useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const load = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      const nextPage = reset ? 1 : page;
      const res = await fetchConversationMedia({
        conversationId,
        type: tab,     // ✅ gọi đúng loại tab
        page: nextPage,
        limit: 24,
      });

      // Dù BE có trả lẫn, vẫn lọc theo tab để hiển thị đúng layout
      const cleanItems = (res.items || []).filter(i => i?.type === tab);

      if (reset) {
        setItems(cleanItems);
        setPage(2);
      } else {
        setItems(prev => [...prev, ...cleanItems]);
        setPage(p => p + 1);
      }
      setHasMore(!!res.hasMore);
      setSummary(res.summary || {});
      loadingRef.current = false;
    },
    [conversationId, tab, page]
  );

  // Đổi tab => reset
  useEffect(() => { load(true); }, [tab]); // eslint-disable-line

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Tabs: chỉ tab hợp lệ theo kind, KHÔNG có All */}
      <div className="flex gap-2 mb-1">
        {allowedTabs.map(t => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t}
            {typeof summary[t] === "number" ? ` (${summary[t]})` : ""}
          </Button>
        ))}
      </div>

      {/* Visual: lưới ảnh/video */}
      {(tab === "image" || tab === "video") && (
        <div className="grid grid-cols-3 gap-2">
          {items.map(m => (
            <div key={m._id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              {m.type === "image" ? (
                <img src={m.url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <video src={m.url} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-2 rounded-full bg-black/40">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Binary: danh sách audio/file */}
      {(tab === "audio" || tab === "file") && (
        <div className="space-y-2">
          {items.map(m => (
            <div key={m._id} className="flex items-center justify-between p-2 rounded-lg border">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {m?.metadata?.filename || (m.url || "").split("/").pop()}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {(m?.metadata?.mimetype) || ""}
                  {m?.metadata?.size ? ` · ${Math.round(m.metadata.size / 1024)}KB` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.type === "audio" && <audio src={m.url} controls className="h-8" />}
                <a href={m.url} download target="_blank" rel="noreferrer" className="inline-flex">
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <Button variant="outline" className="w-full" onClick={() => load(false)}>
          Tải thêm
        </Button>
      )}
      {!items.length && (
        <div className="text-center text-sm text-muted-foreground py-6">Chưa có dữ liệu</div>
      )}
    </div>
  );
}

ConversationMediaPanel.propTypes = {
  conversationId: PropTypes.string.isRequired,
  // "visual" => Image/Video, "binary" => Audio/File
  kind: PropTypes.oneOf(["visual", "binary"]),
  defaultTab: PropTypes.oneOf(["image", "video", "audio", "file"]),
};
