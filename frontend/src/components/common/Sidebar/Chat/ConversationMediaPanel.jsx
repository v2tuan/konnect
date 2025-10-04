// src/components/chat/ConversationMediaPanel.jsx
import { useEffect, useState, useRef, useCallback } from "react"
import PropTypes from "prop-types"
import { Button } from "@/components/ui/button"
import { fetchConversationMedia } from "@/apis/index.js"
import { Play, Download } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const KIND_TABS = {
  visual: ["image", "video"],
  binary: ["audio", "file"]
}

const pickUrl = (m) => m?.secure_url || m?.url || ""

const pickFilename = (m, url) =>
  m?.metadata?.originalName ||
  m?.metadata?.filename ||
  decodeURIComponent((url || "").split("?")[0].split("/").pop() || "file")

const downloadFile = async (url, filename) => {
  try {
    const res = await fetch(url, { credentials: "omit" })
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch (e) {
    console.error("download failed", e)
  }
}

export default function ConversationMediaPanel({ conversationId, kind = "visual", defaultTab }) {
  const allowedTabs = KIND_TABS[kind] || ["image", "video"]
  const [tab, setTab] = useState(defaultTab || allowedTabs[0])
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [summary, setSummary] = useState({})
  const loadingRef = useRef(false)

  // Lightbox
  const [preview, setPreview] = useState({ open: false, url: "", type: "image" })

  const load = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return
      loadingRef.current = true
      const nextPage = reset ? 1 : page
      const res = await fetchConversationMedia({
        conversationId,
        type: tab,
        page: nextPage,
        limit: 24
      })
      const clean = (res?.items || []).filter((i) => i?.type === tab)
      if (reset) {
        setItems(clean)
        setPage(2)
      } else {
        setItems((prev) => [...prev, ...clean])
        setPage((p) => p + 1)
      }
      setHasMore(!!res?.hasMore)
      setSummary(res?.summary || {})
      loadingRef.current = false
    },
    [conversationId, tab, page]
  )

  // nghe realtime refresh
  useEffect(() => {
    const handler = (e) => {
      const { conversationId: cid } = e.detail || {}
      if (!cid || cid !== conversationId) return
      load(true)
    }
    window.addEventListener("conversation-media:refresh", handler)
    return () => window.removeEventListener("conversation-media:refresh", handler)
  }, [conversationId, load])

  // khi đổi loại panel
  useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  // đổi tab → reset load
  useEffect(() => { load(true) }, [tab, load])

  // đổi hội thoại → reset về trang 1
  useEffect(() => { load(true) }, [conversationId, load])

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Tabs theo kind */}
      <div className="flex gap-2 mb-1">
        {allowedTabs.map((t) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)} className="capitalize">
            {t}
            {typeof summary[t] === "number" ? ` (${summary[t]})` : ""}
          </Button>
        ))}
      </div>

      {/* Visual */}
      {(tab === "image" || tab === "video") && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((m) => {
            const url = pickUrl(m)
            return (
              <div
                key={m._id}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                onClick={() => setPreview({ open: true, url, type: m.type })}
                title="Nhấn để xem"
              >
                {m.type === "image" ? (
                  <img src={url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <video src={url} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-2 rounded-full bg-black/40">
                        <Play className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Binary */}
      {(tab === "audio" || tab === "file") && (
        <div className="space-y-2">
          {items.map((m) => {
            const url = pickUrl(m)
            const filename = m?.metadata?.filename || (url || "").split("/").pop()
            const sizeKB = m?.metadata?.size ? `${Math.round(m.metadata.size / 1024)}KB` : ""
            return (
              <div key={m._id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{filename}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {(m?.metadata?.mimetype) || ""} {sizeKB ? ` · ${sizeKB}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.type === "audio" && <audio src={url} controls className="h-8" />}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => downloadFile(url, pickFilename(m, url))}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <Button variant="outline" className="w-full" onClick={() => load(false)}>
          Tải thêm
        </Button>
      )}
      {!items.length && <div className="text-center text-sm text-muted-foreground py-6">Chưa có dữ liệu</div>}

      {/* Lightbox */}
      <Dialog open={preview.open} onOpenChange={(o) => setPreview((p) => ({ ...p, open: o }))}>
        <DialogContent className="p-0 sm:max-w-[80vw]">
          <div className="w-full h-full max-h-[80vh] flex items-center justify-center bg-black">
            {preview.type === "video" ? (
              <video src={preview.url} controls className="max-w-full max-h-[80vh]" autoPlay />
            ) : (
              <img src={preview.url} alt="" className="max-w-full max-h-[80vh]" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

ConversationMediaPanel.propTypes = {
  conversationId: PropTypes.string.isRequired,
  kind: PropTypes.oneOf(["visual", "binary"]),
  defaultTab: PropTypes.oneOf(["image", "video", "audio", "file"])
}
