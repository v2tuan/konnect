import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import http from 'http'
import cors from 'cors';
import express from 'express';
import { env } from './config/environment.js';
import connectDB from './lib/connectDB.js';
import { APIs_V1 } from './routes/index.js';
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

const app = express();

const server = http.createServer(app)

const PORT =env.LOCAL_DEV_APP_PORT || 3000;

//socket + http server
const io = new Server(server, {
    cors: {origin: env.WEBSITE_DOMAIN_DEVELOPMENT, credentials: true}
})

//lay token tu cookie
io.use(async (socket, next) => {
  try {
    //
    const cookieHeader = socket.handshake.headers.cookie || ''
    const token = cookieHeader
      .split(';')
      .map(s => s.trim)
      .find(s => s.startsWith('token='))?.split('=')[1]

    if (!token) return next(new Error('Unthorized'))
    const decoded = jwt.verify(token, env.JWT_SECRET)

    //gan user cho phien socket
    socket.user = {id: decoded.userId}
    return next();
  } catch (err) {
    return next(err);
  }
})

io.on('connection', (socket) => {
  // console.log('Socket connected', socket.id, socket.user);

  // tham gia hoi thoai
  socket.on('conversation:join', ({ conversationId }) => {
    if (!conversationId) return;
    socket.join(`conversation:${conversationId}`);
  });

  // user are typing ...
  socket.on('typing:start', ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(`conversation:${conversationId}`).emit('typing:start', {
      conversationId,
      userId: socket.user?.id
    });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
      conversationId,
      userId: socket.user?.id
    });
  });

  // update status user
  socket.on('disconnect', () => {
    // TODO: cập nhật User.status.lastActiveAt / isOnline=false nếu bạn muốn
  });
});
app.use((req, _res, next) => { 
    req.io = io 
    next() 
})


//PARSER
// Dùng để parse request body dạng JSON sang javaScript object
app.use(bodyParser.json());
// Dùng để parse request body dạng x-www-form-urlencoded sang javaScript object
// Extended true cho phép sử dụng các kiểu dữ liệu phức tạp hơn như object lồng nhau, mảng, v.v.
app.use(bodyParser.urlencoded({ extended: true }));
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