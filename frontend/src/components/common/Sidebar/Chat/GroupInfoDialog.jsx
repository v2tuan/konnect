"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Pencil, Upload, Users, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import PropTypes from "prop-types";
import { renameGroupAPI, changeGroupAvatarAPI } from "@/apis";

/** Compact, scrollable group info dialog (Zalo-like, NO link/layout section) */
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

  useEffect(() => {
    if (!open) return;
    setName(conversation?.displayName || "");
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [open, conversation?.displayName]);

  const initials =
    (name || conversation?.displayName || "U")?.[0]?.toUpperCase?.() || "U";

  const pickFile = () => fileRef.current?.click();
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!conversation?._id) return;
    try {
      setSaving(true);

      // đổi tên nếu thay đổi
      if (
        isGroup &&
        name.trim() &&
        name.trim() !== (conversation?.displayName || "")
      ) {
        const res = await renameGroupAPI(conversation._id, name.trim());
        onNameUpdated?.(res?.name || name.trim());
      }

      // đổi avatar nếu chọn file
      if (isGroup && avatarFile) {
        const res = await changeGroupAvatarAPI(conversation._id, avatarFile);
        onAvatarUpdated?.(res?.avatarUrl);
      }

      toast.success("Đã cập nhật thông tin nhóm");
      onOpenChange?.(false);
    } catch (err) {
      toast.error(err?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[420px] max-w-[90vw] p-0 overflow-hidden rounded-xl"
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="text-base">Thông tin nhóm</DialogTitle>
        </DialogHeader>

        {/* Body (scrollable) */}
        <div className="overflow-y-auto max-h-[calc(100vh-160px)]">
          {/* Avatar + tên */}
          <div className="px-4 pt-4 pb-3 text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <Avatar className="w-20 h-20">
                <AvatarImage
                  src={avatarPreview || conversation?.conversationAvatarUrl || ""}
                />
                <AvatarFallback className="text-base">{initials}</AvatarFallback>
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
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-1 mb-2 max-w-xs mx-auto">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isGroup || saving}
                className="h-9 text-center font-semibold text-lg flex-1 min-w-0"
                placeholder="Tên nhóm"
              />
              {isGroup && <Pencil size={14} className="text-muted-foreground shrink-0" />}
            </div>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-primary hover:text-primary"
                    onClick={() => onOpenAddMember?.()}
                  >
                    <UserPlus className="w-4 h-4 mr-1" /> Thêm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground"
                    onClick={() => onOpenManageMembers?.()}
                  >
                    <Users className="w-4 h-4 mr-1" /> Quản lý
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
              {(conversation?.group?.members?.length || 0) > 8 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={() => onOpenManageMembers?.()}
                >
                  +{conversation.group.members.length - 8}
                </Button>
              )}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Ảnh/Video */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Ảnh/Video</div>
              <Button variant="link" size="sm" className="h-8 px-2 text-primary hover:text-primary">
                Xem tất cả
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {/* Placeholder – thay bằng panel thật nếu có */}
              <div className="aspect-square rounded-md bg-muted" />
              <div className="aspect-square rounded-md bg-muted" />
              <div className="aspect-square rounded-md bg-muted" />
              <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">
                +10
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 py-3 border-t sticky bottom-0 bg-background z-10">
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange?.(false)}>
              Hủy
            </Button>
            {isGroup && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Lưu thay đổi
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
