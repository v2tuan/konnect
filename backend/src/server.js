import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import http from 'http'
import cors from 'cors';
import express from 'express';
import {env} from './config/environment.js';
import connectDB from './lib/connectDB.js';
import {APIs_V1} from './routes/index.js';
import {Server} from 'socket.io'
import jwt from 'jsonwebtoken'
import {userService} from './services/userService.js';

const app = express();

const server = http.createServer(app)

const PORT = env.LOCAL_DEV_APP_PORT || 3000;

//socket + http server
const io = new Server(server, {
  cors: {origin: env.WEBSITE_DOMAIN_DEVELOPMENT, credentials: true}
})

const presenceMap = new Map()

io.use(async (socket, next) => {
  try {
    const raw = socket.handshake.headers.cookie || ''
    const tokenPair = raw.split(';').map(s => s.trim()).find(s => s.startsWith('token='))
    const token = tokenPair ? tokenPair.split('=')[1] : null
    if (!token) return next(new Error('Unauthorized'))
    const decoded = jwt.verify(token, env.JWT_SECRET)
    socket.user = {id: decoded.userId}
    return next()
  } catch (err) {
    return next(err)
  }
})

io.on('connection', (socket) => {
  const userId = socket.user?.id
  if (userId) {
    socket.join(`user:${userId}`)
    let entry = presenceMap.get(userId)
    if (!entry) {
      entry = {sockets: new Set(), lastActiveAt: new Date()}
      presenceMap.set(userId, entry)
      // First connection -> mark online
      userService.markUserStatus(userId, {isOnline: true, lastActiveAt: new Date()})
      io.emit('presence:update', {userId, isOnline: true, lastActiveAt: new Date().toISOString()})
    }
    entry.sockets.add(socket.id)
  }

  // Client may request a presence snapshot
  socket.on('presence:snapshot', (userIds = []) => {
    const payload = userIds.map(uid => {
      const entry = presenceMap.get(uid)
      return {
        userId: uid,
        isOnline: !!entry,
        lastActiveAt: entry?.lastActiveAt?.toISOString() || null
      }
    })
    socket.emit('presence:snapshot', payload)
  })

  // Heartbeat -> update lastActiveAt in memory + (optionally) throttle DB writes
  socket.on('presence:heartbeat', () => {
    if (!userId) return
    const entry = presenceMap.get(userId)
    if (entry) {
      entry.lastActiveAt = new Date()
    }
  })

  // Conversation join/typing events (kept from previous version)
  socket.on('conversation:join', ({conversationId}) => {
    if (!conversationId) return
    socket.join(`conversation:${conversationId}`)
  })

  socket.on('typing:start', ({conversationId}) => {
    if (!conversationId) return
    socket.to(`conversation:${conversationId}`).emit('typing:start', {conversationId, userId})
  })

  socket.on('typing:stop', ({conversationId}) => {
    if (!conversationId) return
    socket.to(`conversation:${conversationId}`).emit('typing:stop', {conversationId, userId})
  })

  socket.on('disconnect', () => {
    if (!userId) return
    const entry = presenceMap.get(userId)
    if (!entry) return
    entry.sockets.delete(socket.id)
    if (entry.sockets.size === 0) {
      // Mark offline now & broadcast
      presenceMap.delete(userId)
      const lastActiveAt = new Date()
      userService.markUserStatus(userId, {isOnline: false, lastActiveAt})
      io.emit('presence:update', {userId, isOnline: false, lastActiveAt: lastActiveAt.toISOString()})
    }
  })
})
app.use((req, _res, next) => {
  req.io = io
  next()
})


//PARSER
// Dùng để parse request body dạng JSON sang javaScript object
app.use(bodyParser.json());
// Dùng để parse request body dạng x-www-form-urlencoded sang javaScript object
// Extended true cho phép sử dụng các kiểu dữ liệu phức tạp hơn như object lồng nhau, mảng, v.v.
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser()); // Middleware to parse cookies

//CORS
app.use(cors(
  {
    origin: env.WEBSITE_DOMAIN_DEVELOPMENT,
    credentials: true
  }
));

app.use('/api', APIs_V1);
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://${env.LOCAL_DEV_APP_HOST}:${PORT}`);
  connectDB();
  // seedUsers(); // Call the seed function to populate the database
});