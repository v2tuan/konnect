import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { API_ROOT } from "@/utils/constant.js";
import MediaWindowViewer from "./MediaWindowViewer";

// --- (NEW) IMPORTS CHO BỘ LỌC ---
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  User,
  Calendar as CalendarIcon,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils"; // Giả định bạn có file utils này (chuẩn của shadcn)
import { format } from "date-fns";
import { vi } from "date-fns/locale"; // Tiếng Việt cho lịch
// --- KẾT THÚC NEW IMPORTS ---


/* ---------- Helpers ---------- */
// (Không thay đổi helpers)
function parseDate(v) { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
function getSentAt(m) {
  return parseDate(m?.metadata?.sentAt) || parseDate(m?.sentAt) ||
    parseDate(m?.metadata?.createdAt) || parseDate(m?.createdAt) || new Date();
}
function keyFromDate(d) {return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function viDayLabel(key) {const[,m,d]=key.split("-").map(Number);return `Ngày ${String(d).padStart(2,"0")} Tháng ${String(m).padStart(2,"0")}`;}
function groupByDay(items) {
  const map=new Map();
  for(const m of items) {const k=keyFromDate(getSentAt(m)); if(!map.has(k)) map.set(k,[]); map.get(k).push(m);}
  return Array.from(map.entries()).sort(([a],[b])=>a<b?1:-1).map(([dateKey,arr])=>({dateKey,items:arr}));
}
const fmtSize=(n)=>{if(n==null)return"";const u=["B","KB","MB","GB"];let v=Number(n),i=0;while(v>=1024&&i<u.length-1){v/=1024;i++;}return `${v.toFixed(1)} ${u[i]}`;};

/* ---------- Sub Components (Media, File, Audio) ---------- */

function MediaGallery({ dayGroups, openViewerAt }) {
  if (!dayGroups.length) return <div className="text-sm text-muted-foreground p-3 text-center">Chưa có Ảnh/Video nào.</div>;
  return dayGroups.map(({ dateKey, items: group }) => (
    <section key={dateKey} className="mb-6 scroll-mt-20">
      <div className="text-base font-semibold mb-3 opacity-90">{viDayLabel(dateKey)}</div>
      <div className="grid grid-cols-3 gap-1">
        {group.map((m, idx) => (
          <button
            key={(m._id || m.id || m.url) + idx}
            type="button"
            className="aspect-square overflow-hidden bg-muted"
            title={m?.metadata?.originalName || ""}
            onClick={() => openViewerAt(m)}
          >
            {m.type === "image"
              ? <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              : <video src={m.url} className="w-full h-full object-cover" muted playsInline />}
          </button>
        ))}
      </div>
    </section>
  ));
}

function FileList({ dayGroups }) {
  if (!dayGroups.length) return <div className="text-sm text-muted-foreground p-3 text-center">Chưa có tệp nào.</div>;

  return dayGroups.map(({ dateKey, items: group }) => (
    <section key={dateKey} className="mb-6 scroll-mt-20">
      <div className="text-base font-semibold mb-3 opacity-90">{viDayLabel(dateKey)}</div>
      <div className="space-y-2">
        {group.map((m, idx) => (
          <div key={(m._id || m.id || m.url) + idx} className="flex items-center justify-between p-3 border rounded-xl bg-card">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{m?.metadata?.originalName || m?.metadata?.filename || "Tệp đính kèm"}</div>
              <div className="text-xs text-muted-foreground">{m?.metadata?.mimetype || ""} · {fmtSize(m?.metadata?.size)}</div>
            </div>
            <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline ml-4 shrink-0">Tải</a>
          </div>
        ))}
      </div>
    </section>
  ));
}

function AudioList({ dayGroups }) {
  if (!dayGroups.length) return <div className="text-sm text-muted-foreground p-3 text-center">Chưa có Audio nào.</div>;

  return dayGroups.map(({ dateKey, items: group }) => (
    <section key={dateKey} className="mb-6 scroll-mt-20">
      <div className="text-base font-semibold mb-3 opacity-90">{viDayLabel(dateKey)}</div>
      <div className="space-y-3">
        {group.map((m, idx) => (
          <div key={(m._id || m.id || m.url) + idx} className="p-3 border rounded-xl bg-card">
            <div className="flex items-center gap-3">
              <audio controls src={m.url} className="w-full" preload="none" />
              <div className="text-xs text-muted-foreground shrink-0">{fmtSize(m?.metadata?.size)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  ));
}

const TabButton = ({ label, currentTab, targetTab, setTab }) => (
  <button
    className={`w-full py-3 text-sm font-medium relative
      ${currentTab===targetTab ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    onClick={() => setTab(targetTab)}
  >
    {label}
    <span className={`absolute left-0 right-0 -bottom-[1px] h-0.5 rounded-full
      ${currentTab===targetTab ? "bg-primary" : "bg-transparent"}`} />
  </button>
);


/* ---------- (NEW) BỘ LỌC SUB-COMPONENTS ---------- */

function SenderFilter({ members, selected, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const triggerLabel = selected ? selected.name : "Người gửi";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-auto max-w-[150px] justify-between bg-muted/80 border-none",
            !selected && "text-foreground/80"
          )}
        >
          <User className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Tìm thành viên..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => {
                const memberName = member.fullName || member.username || "Người dùng";
                return (
                  <CommandItem
                    key={member.id || member._id}
                    value={memberName}
                    onSelect={() => {
                      onSelect({ id: member.id || member._id, name: memberName });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected?.id === (member.id || member._id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {memberName}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {selected && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onClear();
                    setOpen(false);
                  }}
                  className="text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Bỏ chọn
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DateFilter({ selected, onSelect, onClear }) {
  const [open, setOpen] = useState(false);

  let triggerLabel = "Ngày gửi";
  if (selected?.from && selected?.to) {
    triggerLabel = `${format(selected.from, "d/L", {locale: vi})} - ${format(selected.to, "d/L", {locale: vi})}`;
  } else if (selected?.from) {
    triggerLabel = format(selected.from, "PPP", {locale: vi});
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-auto justify-start text-left font-normal bg-muted/80 border-none",
            !selected && "text-foreground/80"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={onSelect}
          locale={vi}
          initialFocus
          numberOfMonths={1}
        />
        {selected && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => { onClear(); setOpen(false); }}>
              <X className="mr-2 h-4 w-4" />
              Bỏ chọn
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}


/* ---------- (CHANGED) MAIN COMPONENT ---------- */
export default function ConversationGallery({ conversationId, initialTab="media", onClose }) {
  const [tab, setTab] = useState(initialTab);
  const isMedia = tab === "media";
  const isAudio = tab === "audio";
  const isFile  = tab === "file";

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [items, setItems]     = useState([]);

  // (NEW) State cho bộ lọc
  const [members, setMembers] = useState([]); // Danh sách thành viên để chọn
  const [filterSender, setFilterSender] = useState(null); // { id: '...', name: '...' }
  const [filterDateRange, setFilterDateRange] = useState(undefined); // { from: Date, to: Date }

  const sentinelRef = useRef(null);
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0); // <--- THÊM DÒNG NÀY
  // (Không đổi) useEffect đo chiều cao header
  useEffect(() => {
    const apply = () => setHeaderH(headerRef.current ? headerRef.current.offsetHeight : 0);
    apply();
    const ro = new ResizeObserver(apply);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", apply);
    return () => { ro.disconnect(); window.removeEventListener("resize", apply); };
  }, []);

  // (Không đổi) Viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const flatMedia = useMemo(() => (isMedia ? items.filter(m => m.type==="image" || m.type==="video") : []), [items, isMedia]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(p => p + 1);
    }
  }, [hasMore, loading]);

  const openViewerAt = (m) => {
    if (!isMedia) return;
    const id  = m._id || m.id || m.url;
    const idx = flatMedia.findIndex(x => (x._id || x.id || x.url) === id);
    if (idx >= 0) {
      setViewerIndex(idx);
      setViewerOpen(true);
    }
  };

  const closeViewer = () => { setViewerOpen(false); };

  // (Không đổi) useEffect xử lý Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !viewerOpen) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, onClose]);

  // (CHANGED) reset khi đổi tab/convo (thêm filter reset)
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(false);
    setError("");
    setViewerOpen(false);
    // Reset filter
    setFilterSender(null);
    setFilterDateRange(undefined);
    setMembers([]); // Xóa danh sách member cũ
  }, [tab, conversationId]);

  // (NEW) useEffect để reset page khi filter thay đổi
  useEffect(() => {
    setPage(1); // Quay về trang 1
    setItems([]); // Xóa item cũ để fetch mới từ trang 1
  }, [filterSender, filterDateRange]);

  // (NEW) useEffect để fetch danh sách thành viên cho bộ lọc
  useEffect(() => {
    if (!conversationId) return;
    let aborted = false;
    (async () => {
      try {
        // Giả định API này trả về chi tiết convo, bao gồm cả members
        const url = `${API_ROOT}/api/conversation/${conversationId}`;
        const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error('Could not fetch members');
        const data = await res.json();
        if (aborted) return;

        // Backend `fetchConversationDetail` trả về `conversation.group.members`
        if (data?.conversation?.group?.members) {
          setMembers(data.conversation.group.members);
        }
        // Hoặc cho chat 1-1, ta tự build mảng member
        else if (data?.conversation?.direct?.otherUser) {
          // Cần có cả 'tôi' (người đang xem) và 'người kia'
          // Hiện tại chúng ta không biết ID của 'tôi', nên chỉ có thể thêm 'người kia'
          // Tạm thời: chỉ fetch member cho group
          setMembers(data.conversation.group.members || []);
        }
      } catch (e) {
        console.error("Failed to fetch members:", e);
        setMembers([]); // Xảy ra lỗi thì set mảng rỗng
      }
    })();
    return () => { aborted = true; };
  }, [conversationId]); // Chỉ fetch lại khi conversationId thay đổi

  // (CHANGED) fetch media (thêm tham số filter)
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!conversationId) return;
      setLoading(true);
      try {
        const type  = isMedia ? "image,video" : isAudio ? "audio" : "file";
        const limit = isMedia ? 36 : 30;

        // Cập nhật tham số cho URL
        const params = {
          type,
          page: String(page),
          limit: String(limit),
          ts: String(Date.now())
        };

        if (filterSender?.id) {
          params.senderId = filterSender.id;
        }
        if (filterDateRange?.from) {
          // Gửi định dạng YYYY-MM-DD
          params.startDate = format(filterDateRange.from, "yyyy-MM-dd");
        }
        if (filterDateRange?.to) {
          params.endDate = format(filterDateRange.to, "yyyy-MM-dd");
        }
        const qs = new URLSearchParams(params).toString();

        const url = `${API_ROOT}/api/conversation/${conversationId}/media?${qs}`;
        const res = await fetch(url, { credentials:"include", cache:"no-store", headers:{ Accept:"application/json" } });
        if (!res.ok && res.status !== 304) { if (!aborted) setError(`HTTP ${res.status}`); return; }
        const data = res.status === 304 ? null : await res.json();
        if (aborted) return;
        if (data) {
          setItems(prev => page === 1 ? (data.items || []) : [...prev, ...(data.items || [])]);
          setHasMore(Boolean(data.hasMore));
        }
        else setHasMore(false);
      } catch (e) {
        if (!aborted) setError(e.message || "Không thể tải dữ liệu");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [
    conversationId,
    page,
    tab,
    isMedia,
    isAudio,
    isFile,
    filterSender, // Thêm filter vào dependency array
    filterDateRange
  ]);

  // (Không đổi) infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting && hasMore && !loading) setPage(p => p + 1); });
    }, { root: null, rootMargin: "600px" });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore, loading]);

  // (Không đổi) Sửa useMemo để nhóm theo ngày cho TẤT CẢ items
  const dayGroups = useMemo(() => groupByDay(items), [items]);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full">
      {/* 1) HEADER (Không đổi) */}
      <div
        ref={headerRef}
        className="sticky top-0 z-40 bg-sidebar border-b"
      >
        <div className="relative h-12 flex items-center justify-center px-2">
          <button
            onClick={() => onClose?.()}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full hover:bg-muted grid place-items-center"
            aria-label="Quay lại"
            title="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold">
            Kho lưu trữ
          </h2>
        </div>
      </div>
      {/* END OF HEADER CHANGES */}


      {/* 2) TABS + FILTERS (CHANGED) */}
      <div className="sticky z-30 bg-sidebar/95 backdrop-blur border-b shadow-sm" style={{ top: headerH || 48 }}>
        {/* Tabs full width, 3 cột bằng nhau */}
        <div className="grid grid-cols-3 border-b">
          <TabButton label="Ảnh/Video" currentTab={tab} targetTab="media" setTab={setTab} />
          <TabButton label="Files"     currentTab={tab} targetTab="file"  setTab={setTab} />
          <TabButton label="Audio"     currentTab={tab} targetTab="audio" setTab={setTab} />
        </div>

        {/* Thay thế PillFilter tĩnh bằng component filter động */}
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
          {/* {isMedia && <PillFilter label="Tất cả ▾" className="ml-auto" />} */}
        </div>
      </div>

      {/* 3) CONTENT (Không đổi) */}
      <div className="px-4 pb-6 pt-4">
        {!!error && <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md mb-2">{error}</div>}

        {isMedia && <MediaGallery dayGroups={dayGroups} openViewerAt={openViewerAt} />}
        {isFile  && <FileList dayGroups={dayGroups} />}
        {isAudio && <AudioList dayGroups={dayGroups} />}

        {loading && <div className="text-sm text-muted-foreground p-3 text-center">Đang tải…</div>}

        {!loading && items.length===0 && !error && (
          <div className="text-sm text-muted-foreground p-3 text-center">
            {isMedia ? "Chưa có Ảnh/Video nào." : isFile ? "Chưa có tệp nào." : "Chưa có Audio nào."}
          </div>
        )}
        <div ref={sentinelRef} className="h-8" />
      </div>

      {/* 4) VIEWER (Không đổi) */}
      {viewerOpen && isMedia && (
        <MediaWindowViewer
          items={flatMedia}
          startIndex={viewerIndex}
          onClose={closeViewer}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          title="Ảnh/Video trong kho lưu trữ"
        />
      )}
    </div>
  );
}

ConversationGallery.propTypes = {
  conversationId: PropTypes.string.isRequired,
  initialTab: PropTypes.oneOf(["media", "file", "audio"]),
  onClose: PropTypes.func.isRequired,
};