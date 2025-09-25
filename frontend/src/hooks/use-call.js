import { getWebRTCSocket  } from "@/lib/socket"
import { useEffect, useRef, useState } from 'react'

const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] }

export function useWebRTCGroup({ roomId, currentUserId, initialMode = 'video' }) {
  const [mode, setMode] = useState(initialMode) // 'audio' | 'video'
  const [peerIds, setPeerIds] = useState([]) // danh sách socketId trong phòng
  const localStreamRef = useRef(null)
  const pcsRef = useRef(new Map()) // peerId -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map()) // peerId -> MediaStream
  const socketRef = useRef(null)

  const ensureLocalStream = async (target = mode) => {
    const needVideo = target === 'video'
    if (localStreamRef.current) {
      const hasVideo = localStreamRef.current.getVideoTracks().length > 0
      if (needVideo && !hasVideo) {
        const vs = await navigator.mediaDevices.getUserMedia({ video: true })
        const v = vs.getVideoTracks()[0]
        localStreamRef.current.addTrack(v)
        for (const pc of pcsRef.current.values()) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) await sender.replaceTrack(v)
          else pc.addTrack(v, localStreamRef.current)
        }
      }
      return localStreamRef.current
    }
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: needVideo })
    localStreamRef.current = s
    return s
  }

  const stopLocal = () => {
    localStreamRef.current?.getTracks?.().forEach(t => t.stop())
    localStreamRef.current = null
  }

  const createPC = (peerId) => {
    if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId)
    const pc = new RTCPeerConnection(ICE)

    pc.ontrack = (e) => {
      remoteStreamsRef.current.set(peerId, e.streams[0])
      setPeerIds(ids => [...new Set([...ids, peerId])])
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('rtc-ice', { to: peerId, candidate: e.candidate, from: currentUserId })
      }
    }

    pcsRef.current.set(peerId, pc)
    return pc
  }

  const addLocalTracksTo = (pc) => {
    const s = localStreamRef.current
    if (!s) return
    s.getTracks().forEach(t => pc.addTrack(t, s))
  }

  useEffect(() => {
    const socket = getWebRTCSocket('/webrtc')
    socketRef.current = socket

    const join = async () => {
      await ensureLocalStream(initialMode)
      socket.emit('join-call', { roomId, userId: currentUserId })
    }

    socket.on('peers-in-room', async ({ peers }) => {
      // mình là người mới: tạo offer tới các peers đang có
      for (const pid of peers.slice(0, 3)) { // tối đa 3 peer khác (mình là người thứ 4)
        const pc = createPC(pid)
        addLocalTracksTo(pc)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('rtc-offer', { to: pid, sdp: offer, from: currentUserId })
      }
      setPeerIds(peers.slice(0, 3))
    })

    socket.on('peer-joined', async ({ peerId }) => {
      if (peerIds.length >= 3) return // đủ 4 người
      const pc = createPC(peerId)
      addLocalTracksTo(pc)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('rtc-offer', { to: peerId, sdp: offer, from: currentUserId })
      setPeerIds(ids => [...new Set([...ids, peerId])].slice(0, 3))
    })

    socket.on('rtc-offer', async ({ from, sdp }) => {
      const pc = createPC(from)
      addLocalTracksTo(pc)
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('rtc-answer', { to: from, sdp: answer, from: currentUserId })
      setPeerIds(ids => [...new Set([...ids, from])].slice(0, 3))
    })

    socket.on('rtc-answer', async ({ from, sdp }) => {
      const pc = pcsRef.current.get(from)
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    socket.on('rtc-ice', async ({ from, candidate }) => {
      const pc = pcsRef.current.get(from)
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) }
        catch (error) { console.error(error) }
      }
    })

    socket.on('peer-left', ({ peerId }) => {
      pcsRef.current.get(peerId)?.close()
      pcsRef.current.delete(peerId)
      remoteStreamsRef.current.delete(peerId)
      setPeerIds(ids => ids.filter(id => id !== peerId))
    })

    join()

    return () => {
      try { socket.emit('leave-call', { roomId }) }
      catch (error) { console.error(error) }
      // không disconnect singleton, chỉ bỏ lắng nghe
      socket.off('peers-in-room')
      socket.off('peer-joined')
      socket.off('rtc-offer')
      socket.off('rtc-answer')
      socket.off('rtc-ice')
      socket.off('peer-left')

      pcsRef.current.forEach(pc => pc.close())
      pcsRef.current.clear()
      remoteStreamsRef.current.clear()
      stopLocal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUserId])

  // Controls
  const getLocalStream = () => localStreamRef.current || null
  const getRemoteStream = (peerId) => remoteStreamsRef.current.get(peerId) || null

  const toggleMute = () => {
    const tracks = localStreamRef.current?.getAudioTracks?.() || []
    tracks.forEach(t => (t.enabled = !t.enabled))
    return tracks[0]?.enabled
  }

  const toggleCamera = () => {
    const tracks = localStreamRef.current?.getVideoTracks?.() || []
    tracks.forEach(t => (t.enabled = !t.enabled))
    return tracks[0]?.enabled
  }

  const switchToVideo = async () => { await ensureLocalStream('video'); setMode('video') }
  const switchToAudio = async () => {
    const vids = localStreamRef.current?.getVideoTracks?.() || []
    vids.forEach(t => { t.stop(); localStreamRef.current.removeTrack(t) })
    for (const pc of pcsRef.current.values()) {
      pc.getSenders().filter(s => s.track?.kind === 'video').forEach(s => pc.removeTrack(s))
    }
    setMode('audio')
  }

  const shareScreen = async () => {
    if (mode !== 'video') return
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const screenTrack = display.getVideoTracks()[0]
    for (const pc of pcsRef.current.values()) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video')
      await sender?.replaceTrack(screenTrack)
      screenTrack.onended = async () => {
        const camTrack = localStreamRef.current?.getVideoTracks?.()[0] || null
        await sender?.replaceTrack(camTrack)
      }
    }
  }

  return {
    mode,
    peerIds,
    getLocalStream,
    getRemoteStream,
    toggleMute,
    toggleCamera,
    switchToVideo,
    switchToAudio,
    shareScreen
  }
}
