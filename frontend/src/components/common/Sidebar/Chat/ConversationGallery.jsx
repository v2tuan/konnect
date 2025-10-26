// src/components/chat/Sidebar/ConversationGallery.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { API_ROOT } from "@/utils/constant.js";
import MediaWindowViewer from "./MediaWindowViewer";
import { ArrowLeft, ChevronsUpDown, Check, User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { getSocket, connectSocket } from "@/lib/socket";

/* ---------------- helpers ---------------- */
const norm = (t = "") => String(t).toLowerCase();
const isVisual = (m) => (m?.url && (norm(m?.type) === "image" || norm(m?.type) === "video"));
const isAudio  = (m) => (m?.url && norm(m?.type) === "audio");
const isFile   = (m) => (m?.url && norm(m?.type) === "file");

const EXT_FROM_MIME = {
  "image/jpeg": "jpg","image/png": "png","image/webp": "webp","image/gif": "gif","image/heic": "heic","image/heif": "heif",
  "application/pdf": "pdf","application/zip": "zip","application/x-7z-compressed": "7z","application/x-rar-compressed": "rar",
  "text/plain": "txt","text/markdown": "md","text/csv": "csv",
  "application/msword": "doc","application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt","application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "audio/mpeg": "mp3","audio/wav": "wav","audio/ogg": "ogg","audio/x-m4a": "m4a","audio/mp4": "m4a",
  "video/mp4": "mp4","video/quicktime": "mov","video/webm": "webm",
};
const sanitizeName = (name = "file") => name.replace(/[\\/:*?"<>|]+/g, "_").trim();
const extFromMime  = (mime = "") => EXT_FROM_MIME[mime.toLowerCase()] || "";
const extractNameFromUrl = (url = "") => {
  try { const u = new URL(url); return sanitizeName(decodeURIComponent(u.pathname.split("/").pop() || "file")); }
  catch { return "file"; }
};
const getBaseName = (m) =>
  sanitizeName(
    m?.metadata?.originalName ||
    m?.metadata?.filename ||
    m?.filename ||
    m?.name ||
    extractNameFromUrl(m?.url)
  );
const getNameWithExt = (m, mimeGuess) => {
  const base = getBaseName(m);
  if (/\.[A-Za-z0-9]{2,5}$/.test(base)) return base; // đã có đuôi
  const ext = extFromMime(mimeGuess) || "bin";
  return `${base}.${ext}`;
};
async function downloadMediaFile(m) {
  const url = m?.url;
  if (!url) return;
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const mime = m?.metadata?.mimetype || blob.type || "application/octet-stream";
    const filename = getNameWithExt(m, mime);

    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(obj);
  } catch {
    // fallback
    const a = document.createElement("a");
    a.href = url;
    a.download = getBaseName(m);
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/* ---- date helpers ---- */
const parseDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const getSentAt = (m) =>
  parseDate(m?.metadata?.sentAt) ||
  parseDate(m?.sentAt) ||
  parseDate(m?.metadata?.createdAt) ||
  parseDate(m?.createdAt) ||
  parseDate(m?.uploadedAt) ||
  null;

const keyFromDate = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "unknown-date";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const enDayLabel = (key) => {
  if (key === "unknown-date") return "Unknown date";
  try {
    const [y, m, d] = key.split("-").map(Number);
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return "Invalid date";
    return `Day ${String(d).padStart(2, "0")} Month ${String(m).padStart(2, "0")}`;
  } catch {
    return "Invalid date";
  }
};
const groupByDay = (items) => {
  if (!Array.isArray(items)) return [];
  const map = new Map();
  for (const m of items) {
    const k = keyFromDate(getSentAt(m));
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  return Array.from(map.entries())
  .sort(([a], [b]) => {
    if (a === "unknown-date" && b === "unknown-date") return 0;
    if (a === "unknown-date") return 1;
    if (b === "unknown-date") return -1;
    return b.localeCompare(a);
  })
  .map(([dateKey, arr]) => ({ dateKey, items: arr }));
};
const fmtSize = (n) => {
  if (n == null) return "";
  const u = ["B", "KB", "MB", "GB"];
  let v = Number(n), i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
};

/* ---------------- small UI ---------------- */
const TabButton = ({ label, current, value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(value)}
    className={cn(
      "h-11 text-sm font-medium",
      current === value ? "border-b-2 border-primary text-primary"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    {label}
  </button>
);

function SenderFilter({ members = [], selected, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const label =
    selected?.name ||
    members.find((m) => (m._id || m.id) === selected?.id)?.fullName ||
    selected?.id ||
    "All";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2">
          <User className="w-4 h-4 mr-2" />
          {label}
          <ChevronsUpDown className="w-3 h-3 ml-2 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="start">
        <Command>
          <CommandInput placeholder="Search member..." />
          <CommandList>
            <CommandEmpty>No results</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => { onClear?.(); setOpen(false); }}>
                <Check className="mr-2 h-4 w-4" /> All
              </CommandItem>
              <CommandSeparator />
              {members.map((m) => {
                const id = m._id || m.id;
                const name = m.fullName || m.username || "User";
                return (
                  <CommandItem key={id} onSelect={() => { onSelect?.({ id, name }); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", selected?.id === id ? "opacity-100" : "opacity-0")} />
                    {name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DateFilter({ selected, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const from = selected?.from ? format(selected.from, "dd/MM/yyyy") : "";
  const to   = selected?.to ? format(selected.to, "dd/MM/yyyy") : "";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2">
          {from || to ? `${from}${to ? " - " + to : ""}` : "Pick date"}
          <ChevronsUpDown className="w-3 h-3 ml-2 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2" align="start">
        <Calendar
          locale={vi}
          mode="range"
          selected={selected}
          onSelect={(v) => { onSelect?.(v); setOpen(false); }}
          numberOfMonths={2}
        />
        <div className="pt-2 text-right">
          <Button size="sm" variant="ghost" onClick={() => { onClear?.(); setOpen(false); }}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- lists ---------------- */
function MediaGrid({ dayGroups, onOpen }) {
  if (!dayGroups?.length)
    return <div className="text-sm text-muted-foreground p-3 text-center">No photos/videos yet.</div>;
  return dayGroups.map(({ dateKey, items }) => (
    <section key={dateKey} className="mb-6 scroll-mt-20">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-base font-semibold opacity-90">{enDayLabel(dateKey)}</div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {items.map((m, i) => (
          <button
            key={(m._id || m.id || m.url) + i}
            onClick={() => onOpen(m)}
            className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            title={getBaseName(m)}
          >
            {norm(m.type) === "video"
              ? <video src={m.url} className="w-full h-full object-cover" muted />
              : <img src={m.url} alt="" className="w-full h-full object-cover" />
            }
          </button>
        ))}
      </div>
    </section>
  ));
}

function FileList({ dayGroups }) {
  if (!dayGroups?.length)
    return <div className="text-sm text-muted-foreground p-3 text-center">No files yet.</div>;
  return dayGroups.map(({ dateKey, items }) => (
    <section key={dateKey} className="mb-6 scroll-mt-20">
      <div className="flex items-center justify-between mb-3">
        <div className="text-base font-semibold opacity-90">{enDayLabel(dateKey)}</div>
      </div>
      <div className="space-y-2">
        {items.map((m, i) => {
          const name = getBaseName(m);
          return (
            <div key={(m._id || m.id || m.url) + i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40" title={name}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{name}</div>
                <div className="text-xs text-muted-foreground">
                  {(m.metadata?.mimetype || "").toUpperCase()} · {fmtSize(m.metadata?.size ?? m.size)}
                </div>
              </div>
              <button
                type="button"
                className="p-2 rounded-md hover:bg-muted"
                aria-label="Download file"
                title="Download"
                onClick={() => downloadMediaFile(m)}
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  ));
}

function AudioList({ dayGroups }) {
  if (!dayGroups?.length)
    return <div className="text-sm text-muted-foreground p-3 text-center">No audio yet.</div>;
  return dayGroups.map(({ dateKey, items }) => (
    <section key={dateKey} className="mb-6 scroll-mt-20">
      <div className="flex items-center justify-between mb-3">
        <div className="text-base font-semibold opacity-90">{enDayLabel(dateKey)}</div>
      </div>
      <div className="space-y-3">
        {items.map((m, i) => {
          const name = getBaseName(m);
          return (
            <div key={(m._id || m.id || m.url) + i} className="p-2 rounded-lg bg-muted/40">
              <div className="text-sm font-medium truncate mb-1">{name}</div>
              <div className="flex items-center gap-2">
                <audio src={m.url} controls className="w-full" />
                <button
                  type="button"
                  className="p-2 rounded-md hover:bg-muted"
                  aria-label="Download audio"
                  title="Download"
                  onClick={() => downloadMediaFile(m)}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  ));
}

/* ---------------- main ---------------- */
export default function ConversationGallery({
                                              conversationId,
                                              initialTab = "media",
                                              onClose,
                                              members: membersFromProps,
                                              currentUserId // optional
                                            }) {
  const [tab, setTab] = useState(initialTab); // "media" | "file" | "audio"
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);      // chứa ALL media; render sẽ lọc theo tab
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // userId fallback nếu parent không truyền
  const resolvedUserId = useMemo(() => {
    try {
      if (currentUserId) return String(currentUserId);
      if (typeof window !== "undefined") {
        if (window.__CURRENT_USER?.id) return String(window.__CURRENT_USER.id);
        const raw = localStorage.getItem("auth");
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.user?.id) return String(parsed.user.id);
        const uid = localStorage.getItem("uid");
        if (uid) return String(uid);
      }
    } catch { /* empty */ }
    return "";
  }, [currentUserId]);

  // filters
  const [filterSender, setFilterSender] = useState(null);
  const [filterDateRange, setFilterDateRange] = useState(undefined);

  // members
  const [membersFromApi, setMembersFromApi] = useState([]);
  const members = useMemo(() => {
    const normalize = (arr = []) =>
      arr.map((m) => ({
        id: m.id || m._id,
        _id: m._id || m.id,
        fullName: m.fullName || m.username || "User",
        username: m.username,
        avatarUrl: m.avatarUrl
      }));
    const p1 = normalize(membersFromProps || []);
    const p2 = normalize(membersFromApi || []);
    return p1.length ? p1 : p2;
  }, [membersFromProps, membersFromApi]);

  // header height
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  useEffect(() => {
    const calc = () => setHeaderH(headerRef.current ? headerRef.current.offsetHeight : 0);
    calc();
    const ro = new ResizeObserver(calc);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", calc);
    return () => { ro.disconnect(); window.removeEventListener("resize", calc); };
  }, []);

  // fetch + reset
  const queryKey = useMemo(() => {
    const from = filterDateRange?.from ? format(filterDateRange.from, "yyyy-MM-dd") : null;
    const to   = filterDateRange?.to   ? format(filterDateRange.to,   "yyyy-MM-dd") : (from || null);
    return JSON.stringify({ conversationId, tab, s: filterSender?.id || null, from, to });
  }, [conversationId, tab, filterSender, filterDateRange]);

  const prevQueryKey = useRef(queryKey);

  useEffect(() => {
    let aborted = false;

    const queryChanged = prevQueryKey.current !== queryKey;
    if (queryChanged) {
      prevQueryKey.current = queryKey;
      setItems([]);
      setPage(1);
      setHasMore(false);
    }

    (async () => {
      if (!conversationId) return;

      setLoading(true);
      setError("");
      try {
        const limit = tab === "media" ? 36 : 30;

        const from = filterDateRange?.from ? format(filterDateRange.from, "yyyy-MM-dd") : undefined;
        const to   = filterDateRange?.to   ? format(filterDateRange.to,   "yyyy-MM-dd") : (from || undefined);
        const params = new URLSearchParams({
          // lấy ALL media; render sẽ lọc theo tab
          type: "image,video,audio,file",
          page: String(page),
          limit: String(limit),
          ts: String(Date.now())
        });
        if (filterSender?.id) params.set("senderId", filterSender.id);
        if (from) params.set("startDate", from);
        if (to)   params.set("endDate", to);

        const url = `${API_ROOT}/api/conversation/${conversationId}/media?${params.toString()}`;
        const res = await fetch(url, { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (aborted) return;

        const raw = data?.items || [];
        setItems(prev => (page === 1 || queryChanged ? raw : [...prev, ...raw]));
        setHasMore(Boolean(data?.hasMore));
        setMembersFromApi(data?.participants || []);
      } catch (e) {
        if (!aborted) setError(e.message || "Unable to load data");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => { aborted = true; };
  }, [conversationId, tab, page, queryKey, filterDateRange, filterSender]);

  // socket: cập nhật ngay khi có media mới
  useEffect(() => {
    if (!conversationId) return;

    let s = getSocket();
    if (!s || !s.connected) {
      s = connectSocket(resolvedUserId || "");
    }
    if (!s) return;

    const upsertIncoming = (incomingArr = []) => {
      if (!incomingArr.length) return;
      setItems(prev => {
        const seen = new Set(prev.map(x => String(x._id || x.url)));
        const newOnes = incomingArr
        .filter(Boolean)
        .map((m) => ({
          _id: m._id || m.id,
          conversationId: m.conversationId || conversationId,
          type: m.type,
          url: m.url,
          sentAt: m.sentAt || m.uploadedAt || m?.metadata?.sentAt,
          uploadedAt: m.uploadedAt,
          metadata: m.metadata || {}
        }))
        .filter((m) => m.url && !seen.has(String(m._id || m.url)));
        return newOnes.length ? [...newOnes, ...prev] : prev;
      });
    };

    const onMediaNew = (payload) => {
      if (!payload || payload.conversationId !== conversationId) return;
      upsertIncoming(Array.isArray(payload.items) ? payload.items : []);
    };

    const onMessageNew = (payload) => {
      if (!payload || payload.conversationId !== conversationId) return;
      const msg = payload.message;
      const media = Array.isArray(msg?.media) ? msg.media : [];
      const usable = media.filter((m) => m && m.url && m.type);
      upsertIncoming(usable);
    };

    s.emit("conversation:join", { conversationId });
    s.on("media:new", onMediaNew);
    s.on("message:new", onMessageNew);

    return () => {
      s.off("media:new", onMediaNew);
      s.off("message:new", onMessageNew);
    };
  }, [conversationId, resolvedUserId]);

  // render theo tab
  const itemsForTab = useMemo(() => {
    if (tab === "media") return items.filter(isVisual);
    if (tab === "audio") return items.filter(isAudio);
    return items.filter(isFile);
  }, [items, tab]);

  const dayGroups = useMemo(() => groupByDay(itemsForTab), [itemsForTab]);

  // viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const flatVisual = useMemo(() => (tab === "media" ? itemsForTab.filter(isVisual) : []), [itemsForTab, tab]);
  const openViewerAt = (m) => {
    if (tab !== "media") return;
    const idx = flatVisual.findIndex(x => (x._id || x.id || x.url) === (m._id || m.id || m.url));
    setViewerIndex(Math.max(0, idx));
    setViewerOpen(true);
  };

  const loadMore = () => { if (!loading && hasMore) setPage(p => p + 1); };

  return (
    <div className="flex-1 flex flex-col max-w-full overflow-hidden">
      {/* header */}
      <div ref={headerRef} className="sticky top-0 z-40 bg-sidebar border-b shrink-0">
        <div className="relative h-12 flex items-center justify-center px-2">
          <button
            onClick={onClose}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full hover:bg-muted grid place-items-center"
            aria-label="Back" title="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold">Library</h2>
        </div>
      </div>

      {/* tabs + filters */}
      <div className="sticky z-30 bg-sidebar/95 backdrop-blur border-b shadow-sm shrink-0" style={{ top: headerH || 48 }}>
        <div className="grid grid-cols-3 border-b">
          <TabButton label="Photos/Videos" current={tab} value="media"  onChange={setTab} />
          <TabButton label="Files"         current={tab} value="file"   onChange={setTab} />
          <TabButton label="Audio"         current={tab} value="audio"  onChange={setTab} />
        </div>
        <div className="px-4 py-2 flex gap-3">
          <SenderFilter
            members={members}
            selected={filterSender}
            onSelect={setFilterSender}
            onClear={() => setFilterSender(null)}
          />
          <DateFilter
            selected={filterDateRange}
            onSelect={setFilterDateRange}
            onClear={() => setFilterDateRange(undefined)}
          />
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {!!error && <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md mb-2">{error}</div>}
        {loading && page === 1 && <div className="text-sm text-muted-foreground p-3 text-center">Loading…</div>}

        {!error && (
          <>
            {tab === "media" && <MediaGrid dayGroups={dayGroups} onOpen={openViewerAt} />}
            {tab === "file"  && <FileList  dayGroups={dayGroups} />}
            {tab === "audio" && <AudioList dayGroups={dayGroups} />}
          </>
        )}

        {!loading && !error && itemsForTab.length === 0 && (
          <div className="text-sm text-muted-foreground p-3 text-center">
            {tab === "media" ? "" : tab === "file" ? "" : ""}
          </div>
        )}

        <div className="flex justify-center mt-3">
          {hasMore && (
            <Button onClick={loadMore} variant="outline" size="sm" disabled={loading}>
              {loading ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      </div>

      {/* viewer */}
      {viewerOpen && tab === "media" && (
        <MediaWindowViewer
          open={viewerOpen}
          index={viewerIndex}
          items={flatVisual}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}

ConversationGallery.propTypes = {
  conversationId: PropTypes.string.isRequired,
  initialTab: PropTypes.oneOf(["media", "file", "audio"]),
  onClose: PropTypes.func.isRequired,
  members: PropTypes.array,
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};
