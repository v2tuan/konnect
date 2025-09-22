import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff } from 'lucide-react'
import { useWebRTCGroup } from '@/hooks/use-call'

export default function CallModal({ open, onOpenChange, conversationId, currentUserId, initialMode = 'audio' }) {
  const {
    mode, peerIds,
    getLocalStream, getRemoteStream,
    toggleMute, toggleCamera,
    switchToVideo, switchToAudio,
    shareScreen
  } = useWebRTCGroup({ roomId: conversationId, currentUserId, initialMode })

  const localVideoRef = useRef(null)
  const localAudioRef = useRef(null)

  useEffect(() => {
    const s = getLocalStream()
    if (!s) return
    const hasVideo = s.getVideoTracks().length > 0
    if (hasVideo && localVideoRef.current) localVideoRef.current.srcObject = s
    if (localAudioRef.current) localAudioRef.current.srcObject = s
  }, [getLocalStream, mode])

  const tiles = useMemo(() => ['local', ...peerIds].slice(0, 4), [peerIds])

  const renderTile = (id) => {
    const isLocal = id === 'local'
    const stream = isLocal ? getLocalStream() : getRemoteStream(id)
    const hasVideo = stream?.getVideoTracks?.().length > 0

    return (
      <div key={id} className="relative bg-black rounded-md overflow-hidden">
        {hasVideo ? (
          <video
            ref={isLocal ? localVideoRef : (el) => { if (el && stream) el.srcObject = stream }}
            autoPlay playsInline muted={isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/70">
            {isLocal ? 'You (audio)' : `Peer ${id.slice(0,5)}… (audio)`}
          </div>
        )}
        {!isLocal && <audio autoPlay ref={(el) => { if (el && stream) el.srcObject = stream }} />}
        {isLocal && mode === 'audio' && <audio autoPlay muted ref={localAudioRef} />}
      </div>
    )
  }

  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(initialMode === 'video')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl">
        <DialogHeader>
          <DialogTitle>{mode === 'video' ? 'Video' : 'Audio'} Call</DialogTitle>
        </DialogHeader>

        <div className={`grid gap-2 ${tiles.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-2'} h-[60vh]`}>
          {tiles.map(renderTile)}
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          {mode === 'audio' ? (
            <Button onClick={async () => { await switchToVideo(); setCamOn(true) }}>
              <VideoIcon className="w-4 h-4 mr-2" /> Chuyển Video
            </Button>
          ) : (
            <Button variant="secondary" onClick={async () => { await switchToAudio(); setCamOn(false) }}>
              <Mic className="w-4 h-4 mr-2" /> Chuyển Audio
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
            <PhoneOff className="w-4 h-4 mr-2" /> Kết thúc
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-2">
          Chế độ: <b>{mode.toUpperCase()}</b> • Người trong phòng: <b>{tiles.length}</b>
        </div>
      </DialogContent>
    </Dialog>
  )
}
