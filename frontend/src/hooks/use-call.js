import { useEffect, useRef, useState } from 'react'
import { getWebRTCSocket } from '@/lib/socket'

const ICE = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    // Replace with your TURN server
    // { urls: 'turn:your.turn.host:3478', username: 'user', credential: 'pass' }
  ],
  iceCandidatePoolSize: 10
}

export function useWebRTCGroup({ roomId, currentUserId, initialMode = 'video', callId }) {
  const [mode, setMode] = useState(initialMode)
  const [peerIds, setPeerIds] = useState([])
  const [peerModes, setPeerModes] = useState(new Map()) // Track mode của từng peer

  const localStreamRef = useRef(null)
  const pcsRef = useRef(new Map())
  const remoteStreamsRef = useRef(new Map())
  const socketRef = useRef(null)
  const peerIdsRef = useRef([])

  // Per-peer negotiation state
  const pcStateRef = useRef(new Map()) // peerId -> { makingOffer, polite }

  const ensureLocalStream = async (target = mode) => {
    const needVideo = target === 'video'

    // Stop existing stream nếu mode thay đổi
    if (localStreamRef.current) {
      const hasVideo = localStreamRef.current.getVideoTracks().length > 0
      if ((needVideo && !hasVideo) || (!needVideo && hasVideo)) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
        localStreamRef.current = null
      }
    }

    if (!localStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: needVideo ? { width: 640, height: 480 } : false
        })
        localStreamRef.current = stream
        console.log('[WebRTC] Created new local stream:', { hasVideo: needVideo, tracks: stream.getTracks().length })
      } catch (err) {
        console.error('[WebRTC] Failed to get user media:', err)
        throw err
      }
    }
    return localStreamRef.current
  }

  const stopLocal = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
  }

  const createPC = (peerId) => {
    if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId)

    const pc = new RTCPeerConnection(ICE)
    pcsRef.current.set(peerId, pc)

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] PC', peerId, 'connectionState:', pc.connectionState)
    }
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] PC', peerId, 'iceConnectionState:', pc.iceConnectionState)
    }

    pc.ontrack = (e) => {
      console.log('[WebRTC] Received remote track from', peerId, 'kind:', e.track.kind)
      const remoteStream = e.streams[0]
      remoteStreamsRef.current.set(peerId, remoteStream)

      // Force re-render
      setPeerIds(prev => [...prev])
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('rtc-ice', {
          to: peerId,
          candidate: e.candidate,
          from: socketRef.current.id
        })
      }
    }

    // Thêm local tracks ngay khi tạo PC
    addLocalTracksTo(pc)

    return pc
  }

  const addLocalTracksTo = (pc) => {
    const stream = localStreamRef.current
    if (!stream) return

    // Prefer replaceTrack to keep transceivers/mids stable
    stream.getTracks().forEach(track => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === track.kind)
      if (sender) {
        console.log('[WebRTC] Replacing local track on PC:', track.kind, track.label)
        sender.replaceTrack(track)
      } else {
        console.log('[WebRTC] Adding local track to PC:', track.kind, track.label)
        pc.addTrack(track, stream)
      }
    })
  }

  const ensurePeerState = (peerId) => {
    if (!pcStateRef.current.has(peerId)) {
      const polite = (socketRef.current?.id || '') < (peerId || '')
      pcStateRef.current.set(peerId, { makingOffer: false, polite })
    }
    return pcStateRef.current.get(peerId)
  }

  const createAndSendOffer = async (peerId) => {
    const pc = createPC(peerId)
    const st = ensurePeerState(peerId)
    try {
      st.makingOffer = true
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socketRef.current?.emit('rtc-offer', {
        to: peerId,
        sdp: pc.localDescription,
        from: socketRef.current.id
      })
      console.log('[WebRTC] Sent offer to', peerId)
    } catch (err) {
      console.error('[WebRTC] Error creating/sending offer:', err)
    } finally {
      st.makingOffer = false
    }
  }

  // Renegotiate tất cả connections khi local stream thay đổi
  const renegotiateAllConnections = async () => {
    console.log('[WebRTC] Renegotiating all connections...')
    for (const [peerId, pc] of pcsRef.current) {
      try {
        addLocalTracksTo(pc)
        await createAndSendOffer(peerId)
      } catch (err) {
        console.error('[WebRTC] Error renegotiating with', peerId, err)
      }
    }
  }

  // Khi có peer mới join
  useEffect(() => {
    if (peerIds.length === 0) return

    peerIds.forEach(async (peerId) => {
      if (!pcsRef.current.has(peerId)) {
        createPC(peerId)
        // Initiate negotiation from one side; glare-safe below
        await createAndSendOffer(peerId)
      }
    })
  }, [peerIds])

  useEffect(() => {
    const socket = getWebRTCSocket(currentUserId)
    socketRef.current = socket

    const join = async () => {
      await ensureLocalStream(initialMode)
      console.log('[WebRTC] Joining call with callId:', callId || roomId)

      socket.emit('join-call', {
        roomId,
        userId: currentUserId,
        callId: callId || `${roomId}:${Date.now()}`
      })
    }

    // Socket event handlers
    const onPeersInRoom = ({ peers }) => {
      console.log('[WebRTC] Peers in room:', peers)
      setPeerIds(peers)
      peerIdsRef.current = peers
    }

    const onPeerJoined = ({ peerId, userId }) => {
      console.log('[WebRTC] Peer joined:', peerId, userId)
      setPeerIds(prev => prev.includes(peerId) ? prev : [...prev, peerId])
      peerIdsRef.current = [...peerIdsRef.current, peerId].filter((p, i, arr) => arr.indexOf(p) === i)
    }

    const onPeerLeft = ({ peerId }) => {
      console.log('[WebRTC] Peer left:', peerId)
      setPeerIds(prev => prev.filter(p => p !== peerId))
      peerIdsRef.current = peerIdsRef.current.filter(p => p !== peerId)

      // Cleanup
      const pc = pcsRef.current.get(peerId)
      if (pc) {
        pc.close()
        pcsRef.current.delete(peerId)
      }
      remoteStreamsRef.current.delete(peerId)
      setPeerModes(prev => {
        const newMap = new Map(prev)
        newMap.delete(peerId)
        return newMap
      })

      if (peerIdsRef.current.length === 0) {
        console.log('[WebRTC] No peers left, leaving call automatically')
        socket.emit('leave-call', { roomId, callId, conversationId: roomId, userId: currentUserId })
  }
    }

    // ===== THÊM: Xử lý mode change từ peer =====
    const onPeerModeChanged = ({ peerId, mode: peerMode }) => {
      console.log('[WebRTC] Peer', peerId, 'changed mode to:', peerMode)
      setPeerModes(prev => {
        const next = new Map(prev)
        next.set(peerId, peerMode)
        return next
      })
      setPeerIds(prev => [...prev])
    }

    const onRtcOffer = async ({ from, sdp }) => {
      console.log('[WebRTC] Received offer from', from)
      const pc = createPC(from)
      const st = ensurePeerState(from)

      const offerCollision = pc.signalingState !== 'stable' || st.makingOffer
      const ignoreOffer = !st.polite && offerCollision
      if (ignoreOffer) {
        console.warn('[WebRTC] Ignoring offer due to glare (impolite)')
        return
      }

      try {
        if (offerCollision) {
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(sdp)
          ])
        } else {
          await pc.setRemoteDescription(sdp)
        }

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket.emit('rtc-answer', {
          to: from,
          sdp: pc.localDescription,
          from: socket.id
        })
        console.log('[WebRTC] Sent answer to', from)
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err)
      }
    }

    const onRtcAnswer = async ({ from, sdp }) => {
      console.log('[WebRTC] Received answer from', from)
      const pc = pcsRef.current.get(from)
      if (!pc) return
      try {
        await pc.setRemoteDescription(sdp)
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err)
      }
    }

    const onRtcIce = async ({ from, candidate }) => {
      const pc = pcsRef.current.get(from)
      if (pc) {
        try {
          await pc.addIceCandidate(candidate)
        } catch (err) {
          console.error('[WebRTC] Error adding ICE candidate:', err)
        }
      }
    }

    // Bind events
    socket.on('peers-in-room', onPeersInRoom)
    socket.on('peer-joined', onPeerJoined)
    socket.on('peer-left', onPeerLeft)
    socket.on('peer-mode-changed', onPeerModeChanged) // THÊM
    socket.on('rtc-offer', onRtcOffer)
    socket.on('rtc-answer', onRtcAnswer)
    socket.on('rtc-ice', onRtcIce)

    join()

    return () => {
      socket.off('peers-in-room', onPeersInRoom)
      socket.off('peer-joined', onPeerJoined)
      socket.off('peer-left', onPeerLeft)
      socket.off('peer-mode-changed', onPeerModeChanged) // THÊM
      socket.off('rtc-offer', onRtcOffer)
      socket.off('rtc-answer', onRtcAnswer)
      socket.off('rtc-ice', onRtcIce)

      socket.emit('leave-call', { roomId, callId, conversationId: roomId, userId: currentUserId })
      stopLocal()

      pcsRef.current.forEach(pc => pc.close())
      pcsRef.current.clear()
      remoteStreamsRef.current.clear()
    }
  }, [roomId, currentUserId, callId])

  // Controls
  const getLocalStream = () => localStreamRef.current || null
  const getRemoteStream = (peerId) => remoteStreamsRef.current.get(peerId) || null
  const getPeerMode = (peerId) => peerModes.get(peerId) || 'video'

  const toggleMute = () => {
    const stream = localStreamRef.current
    if (!stream) return false

    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      return audioTrack.enabled
    }
    return false
  }

  const toggleCamera = () => {
    const stream = localStreamRef.current
    if (!stream) return false

    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      return videoTrack.enabled
    }
    return false
  }

  const switchToVideo = async () => {
    try {
      console.log('[WebRTC] Switching to video mode')
      setMode('video')

      // Tạo stream video mới
      const newStream = await ensureLocalStream('video')

      // Renegotiate tất cả connections
      await renegotiateAllConnections()

      // Thông báo mode change cho peers
      socketRef.current?.emit('mode-changed', {
        mode: 'video',
        callId,
        roomId
      })

      return newStream
    } catch (err) {
      console.error('[WebRTC] Error switching to video:', err)
      throw err
    }
  }

  const switchToAudio = async () => {
    try {
      console.log('[WebRTC] Switching to audio mode')
      setMode('audio')

      // Tạo stream audio mới
      const newStream = await ensureLocalStream('audio')

      // Renegotiate tất cả connections
      await renegotiateAllConnections()

      // Thông báo mode change cho peers
      socketRef.current?.emit('mode-changed', {
        mode: 'audio',
        callId,
        roomId
      })

      return newStream
    } catch (err) {
      console.error('[WebRTC] Error switching to audio:', err)
      throw err
    }
  }

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const videoTrack = screenStream.getVideoTracks()[0]

      // Replace video track cho tất cả connections
      pcsRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })

      videoTrack.onended = () => {
        switchToVideo()
      }
    } catch (err) {
      console.error('Error sharing screen:', err)
    }
  }

  return {
    mode,
    peerIds,
    getLocalStream,
    getRemoteStream,
    getPeerMode, // THÊM
    toggleMute,
    toggleCamera,
    switchToVideo,
    switchToAudio,
    shareScreen
  }
}
