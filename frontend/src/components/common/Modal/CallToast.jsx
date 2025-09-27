export function ToastIncoming({ from, mode, onAccept, onDecline }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <img
        src={from?.avatarUrl || '/default-avatar.png'}
        alt=""
        style={{ width:32, height:32, borderRadius:'9999px', objectFit:'cover' }}
      />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600 }}>
          {from?.name || 'Someone'} is calling you
        </div>
        <div style={{ fontSize:12, opacity:0.7 }}>
          {mode === 'video' ? 'Video Call' : 'Audio Call'}
        </div>
      </div>
      <button
        onClick={onAccept}
        style={{
          padding:'4px 8px',
          fontSize:12,
          borderRadius:6,
          background:'#059669',
          color:'#fff',
          border:'none',
          cursor:'pointer'
        }}
      >
        Accept
      </button>
      <button
        onClick={onDecline}
        style={{
          padding:'4px 8px',
          fontSize:12,
          borderRadius:6,
          background:'#dc2626',
          color:'#fff',
          border:'none',
          cursor:'pointer'
        }}
      >
        Decline
      </button>
    </div>
  )
}