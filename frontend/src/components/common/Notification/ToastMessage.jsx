// components/common/Notification/ToastMessage.jsx
import React from "react"

export default function ToastMessage({
  avatarUrl,
  title,
  preview,
  onOpenChat
}) {
  return (
    <div
      onClick={onOpenChat}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenChat()}
      style={{
        cursor: "pointer",
        display: "flex",
        gap: 12,
        alignItems: "center"
      }}
    >
      <img
        src={avatarUrl || "/placeholder-avatar.png"}
        alt=""
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>
        <div
          style={{
            fontSize: 13,
            opacity: 0.9,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 260
          }}
          title={preview}
        >
          {preview}
        </div>
      </div>
    </div>
  )
}
