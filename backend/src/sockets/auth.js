import jwt from 'jsonwebtoken'

function parseCookie(raw) {
  const map = {}
  if (!raw) return map
  raw.split(';').forEach(p => {
    const [k, ...rest] = p.trim().split('=')
    if (!k) return
    map[k] = decodeURIComponent(rest.join('=') || '')
  })
  return map
}

export function socketAuth({ jwtSecret }) {
  return (socket, next) => {
    try {
      // Ưu tiên cookie "token=", fallback Authorization: Bearer
      const cookieRaw = socket.handshake.headers.cookie || ''
      const cookies = parseCookie(cookieRaw)
      const bearer = socket.handshake.headers.authorization || ''
      const token = cookies.token || (bearer.startsWith('Bearer ') ? bearer.slice(7) : null)
      if (!token) return next(new Error('Unauthorized'))

      const decoded = jwt.verify(token, jwtSecret)
      console.log('Socket authenticated userId=', decoded.userId)
      socket.user = { id: decoded.userId }
      return next()
    } catch (err) {
      return next(err)
    }
  }
}
