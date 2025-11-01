import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import http from 'http'
import { env } from './config/environment.js'
import connectDB from './lib/connectDB.js'
import { APIs_V1 } from './routes/index.js'
import { userService } from './services/userService.js'
import { initSockets } from './sockets/index.js'

const app = express()
const server = http.createServer(app)
const PORT = env.LOCAL_DEV_APP_PORT || 3000

//socket + http server
const io = initSockets(server, {
  corsOrigin: [
    env.WEBSITE_DOMAIN_DEVELOPMENT,
    env.WEBSITE_DOMAIN_DEVELOPMENT_ADMIN
  ],
  jwtSecret: env.JWT_SECRET,
  userService
})

app.use((req, _res, next) => {
  req.io = io
  next()
})


//PARSER
// Dùng để parse request body dạng JSON sang javaScript object
app.use(bodyParser.json())
// Dùng để parse request body dạng x-www-form-urlencoded sang javaScript object
// Extended true cho phép sử dụng các kiểu dữ liệu phức tạp hơn như object lồng nhau, mảng, v.v.
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser()) // Middleware to parse cookies

//CORS
app.use(cors(
  {
    origin: env.WEBSITE_DOMAIN_DEVELOPMENT,
    credentials: true
  }
))

app.use('/api', APIs_V1)

app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500
  const buildMode = env.BUILD_MODE // dev | production
  const isProd = buildMode === 'production' || process.env.NODE_ENV === 'production'
  const message = err.message || 'Internal Server Error'

  if (!isProd) {
    console.error('========== ERROR START ==========')
    console.error('Time     :', new Date().toISOString())
    console.error('Method   :', req.method)
    console.error('URL      :', req.originalUrl)
    console.error('Status   :', status)
    console.error('Message  :', message)
    console.error('Name     :', err.name)
    if (err.stack) console.error('Stack:\n' + err.stack)
    console.error('=========== ERROR END ===========')
  } else {
    console.error(`[ERR] ${status} ${err.name}: ${message}`)
  }

  res.status(status).json({ message })
})
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`http://${env.LOCAL_DEV_APP_HOST}:${PORT}`)
  connectDB()
  // seedUsers() // Call the seed function to populate the database
})