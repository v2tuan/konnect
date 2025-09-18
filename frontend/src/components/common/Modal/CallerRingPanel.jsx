export default function CallerRingingPanel({ avatarUrl, name, leftMs, onCancel }) {
  const sec = Math.ceil((leftMs || 0) / 1000)
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:12, border:'1px solid rgba(0,0,0,.1)',
      background:'var(--card, #111)', color:'var(--card-foreground,#fff)',
      borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.2)'
    }}>
      <img src={avatarUrl} alt="" style={{ width:48, height:48, borderRadius:'9999px', objectFit:'cover' }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600 }}>{name}</div>
        <div style={{ fontSize:12, opacity:0.7 }}>Đang gọi… còn {sec}s</div>
      </div>
      <button
        onClick={onCancel}
        style={{ padding:'6px 10px', fontSize:12, borderRadius:8, background:'#dc2626', color:'#fff' }}
      >
        Hủy
      </button>
    </div>
  )
}
