import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff } from 'lucide-react'
import { useWebRTCGroup } from '@/hooks/use-call'

export default function CallModal({ 
  open, 
  onOpenChange, 
  conversationId, 
  currentUserId, 
  initialMode = 'audio', 
  callStartedAt,
  callId
}) {
  const {
    mode, peerIds,
    getLocalStream, getRemoteStream, getPeerMode, // THÊM getPeerMode
    toggleMute, toggleCamera,
    switchToVideo, switchToAudio,
    shareScreen
  } = useWebRTCGroup({ 
    roomId: conversationId, 
    currentUserId, 
    initialMode,
    callId
  })

  const localVideoRef = useRef(null)
  const localAudioRef = useRef(null)

  useEffect(() => {
    const s = getLocalStream()
    if (!s) return
    
    const hasVideo = s.getVideoTracks().some(t => t.enabled)
    
    if (hasVideo && localVideoRef.current) {
      localVideoRef.current.srcObject = s
    }
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = s
    }
  }, [getLocalStream, mode])

  const tiles = useMemo(() => ['local', ...peerIds].slice(0, 4), [peerIds])

  const renderTile = (id) => {
    const isLocal = id === 'local'
    const stream = isLocal ? getLocalStream() : getRemoteStream(id)
    const currentMode = isLocal ? mode : getPeerMode(id)

    // Render video when there is a video track present
    const hasVideo = (stream?.getVideoTracks?.() || []).length > 0
    const isVideoMode = currentMode === 'video' && hasVideo

    const attachAndPlay = (el, s, mute = false) => {
      if (!el || !s) return
      if (el.srcObject !== s) el.srcObject = s
      el.muted = mute
      const p = el.play?.()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay might be blocked until user interaction; ignore
        })
      }
    }

    return (
      <div key={id} className="relative bg-black rounded-md overflow-hidden">
        {isVideoMode ? (
          <video
            ref={el => {
              if (!el) return
              // Mute both local and remote <video> to satisfy autoplay policy.
              // Remote audio is handled by the separate <audio> element below.
              attachAndPlay(el, stream, true)
              if (isLocal) localVideoRef.current = el
            }}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/70">
            <div className="text-lg font-medium">
              {isLocal ? 'You' : `Peer ${id.slice(0, 5)}…`}
            </div>
            <div className="text-sm opacity-60">Audio Mode</div>
          </div>
        )}

        {!isLocal && (
          <audio
            autoPlay
            ref={(el) => {
              if (!el) return
              if (stream && el.srcObject !== stream) {
                el.srcObject = stream
              }
              const p = el.play?.()
              if (p && typeof p.catch === 'function') {
                p.catch(() => {})
              }
            }}
          />
        )}

        {isLocal && currentMode === 'audio' && (
          <audio autoPlay muted ref={localAudioRef} />
        )}
      </div>
    )
  }

  const [elapsed, setElapsed] = useState('00:00')

  useEffect(() => {
    if (!open || !callStartedAt) return
    const start = typeof callStartedAt === 'string'
      ? new Date(callStartedAt).getTime()
      : (callStartedAt?.getTime?.() || Date.now())

    const fmt = (s) => {
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      const mm = String(m).padStart(2, '0')
      const ss = String(sec).padStart(2, '0')
      return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
    }

    const id = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
      setElapsed(fmt(diff))
    }, 1000)
    
    const first = Math.max(0, Math.floor((Date.now() - start) / 1000))
    setElapsed(fmt(first))

    return () => clearInterval(id)
  }, [open, callStartedAt])

  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(initialMode === 'video')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'video' ? 'Video' : 'Audio'} Call
            {callStartedAt && (
              <span className="ml-2 text-sm text-muted-foreground">• {elapsed}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className={`grid gap-2 ${tiles.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-2'} h-[60vh]`}>
          {tiles.map(renderTile)}
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          {mode === 'audio' ? (
            <Button onClick={async () => { 
              await switchToVideo(); 
              setCamOn(true) 
            }}>
              <VideoIcon className="w-4 h-4 mr-2" /> Switch to Video
            </Button>
          ) : (
            <Button variant="secondary" onClick={async () => { 
              await switchToAudio(); 
              setCamOn(false) 
            }}>
              <Mic className="w-4 h-4 mr-2" /> Switch to Audio
            </Button>
          )}

          <Button variant={micOn ? 'secondary' : 'destructive'} onClick={() => setMicOn(toggleMute())}>
            {micOn ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
            {micOn ? 'Mic On' : 'Mic Off'}
          </Button>

          <Button variant={camOn ? 'secondary' : 'destructive'} onClick={() => setCamOn(toggleCamera())} disabled={mode !== 'video'}>
            {camOn ? <VideoIcon className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
            {camOn ? 'Cam On' : 'Cam Off'}
          </Button>

          <Button variant="secondary" onClick={shareScreen} disabled={mode !== 'video'}>
            <MonitorUp className="w-4 h-4 mr-2" /> Share Screen
          </Button>

          <Button variant="destructive" onClick={() => onOpenChange(false)}>
            <PhoneOff className="w-4 h-4 mr-2" /> End
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-2">
          MODE: <b>{mode.toUpperCase()}</b> • members in room: <b>{tiles.length}</b>
        </div>
      </DialogContent>
    </Dialog>
  )
}