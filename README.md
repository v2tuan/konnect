# Konnect — Chat App (Realtime Messaging)

Ứng dụng chat realtime gồm backend (Express + MongoDB + Socket.IO + Cloudinary) và frontend (React + Vite + Redux). README này tổng hợp và mở rộng nội dung từ README sẵn có, giúp bạn thiết lập nhanh, chạy dev, và hiểu kiến trúc dự án.

## Tính năng chính
- Đăng ký/đăng nhập, quên mật khẩu (Email)
- Danh bạ, lời mời kết bạn, block
- Tin nhắn văn bản, ảnh, file, audio; reaction; tải media (Cloudinary)
- Nhắn tin 1-1, Cloud chat
- Thông báo realtime qua Socket.IO (message:new, notification:new, mark-read,…)
- Lưu trạng thái online/offline, typing indicator
- Lưu trữ media kèm metadata (mimetype, kích thước, kích thước ảnh/video,…)

## Kiến trúc
- Backend (Node.js/Express):
  - REST APIs: auth, users, messages, conversations, contacts, cloud, notifications
  - MongoDB (Mongoose), JWT, SendGrid (email), Cloudinary (upload media)
  - Socket.IO cho realtime: presence, chat, call signaling
- Frontend (React/Vite):
  - Redux + redux-persist (lưu user)
  - Socket.IO client
  - UI components (shadcn/ui), TailwindCSS
  - Thông báo (react-toastify)

## Yêu cầu
- Node.js 16+ (khuyến nghị 18+)
- npm
- Git
- MongoDB đang chạy cục bộ hoặc từ dịch vụ cloud
- Tài khoản Cloudinary (nếu dùng upload media)
- (Tùy chọn) SendGrid API key nếu bật email

## Thiết lập nhanh

1) Clone repo
```sh
git clone https://github.com/v2tuan/konnect.git
cd konnect
```

2) Cài đặt dependencies cho cả backend và frontend
```sh
npm run setup
```

3) Cấu hình biến môi trường

- Tạo file môi trường Backend: backend/.env
```ini
# Server
LOCAL_DEV_APP_HOST=localhost
LOCAL_DEV_APP_PORT=8017
WEBSITE_DOMAIN_DEVELOPMENT=http://localhost:5173
BUILD_MODE=dev

# Database
MONGO_URI=mongodb://127.0.0.1:27017
DATABASE_NAME=konnect

# Auth
JWT_SECRET=your_jwt_secret_here

# Email (tùy chọn cho quên mật khẩu)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=no-reply@yourdomain.com

# Cloudinary (bắt buộc nếu dùng upload media)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- Frontend đã mặc định trỏ API về http://localhost:8017 trong:
  - frontend/src/utils/constant.js (Konnect): `API_ROOT = 'http://localhost:8017'`

4) Chạy môi trường phát triển

- Backend:
```sh
npm run dev:be
```

- Frontend (mở terminal mới):
```sh
npm run dev:fe
```

Mặc định:
- Backend: http://localhost:8017
- Frontend (Vite): http://localhost:5173

## Cấu trúc thư mục

```
konnect/
  backend/
    src/
      config/
      controllers/
      middlewares/
      models/
      providers/
      routes/
      services/
      sockets/
      utils/
      validations/
      server.js
  frontend/
    src/
      apis/
      components/
      hooks/
      lib/
      pages/
      redux/
      store/
      utils/
```

- Backend entry: [backend/src/server.js](backend/src/server.js)
- Router gốc v1: [backend/src/routes/index.js](backend/src/routes/index.js)
- Socket khởi tạo: [backend/src/sockets/index.js](backend/src/sockets/index.js)
- Upload Cloudinary: [backend/src/providers/CloudinaryProvider_v2.js](backend/src/providers/CloudinaryProvider_v2.js), [backend/src/services/mediaService.js](backend/src/services/mediaService.js)
- Tin nhắn: [backend/src/services/messageService.js](backend/src/services/messageService.js), [backend/src/controllers/messageController.js](backend/src/controllers/messageController.js), [backend/src/routes/messageRoute.js](backend/src/routes/messageRoute.js)
- Cuộc trò chuyện: [backend/src/services/conversationService.js](backend/src/services/conversationService.js)
- Thông báo: [backend/src/services/notificationService.js](backend/src/services/notificationService.js), [backend/src/controllers/notificationController.js](backend/src/controllers/notificationController.js)
- Frontend entry: [frontend/src/main.jsx](frontend/src/main.jsx), [frontend/src/App.jsx](frontend/src/App.jsx)
- Socket client: [frontend/src/lib/socket.js](frontend/src/lib/socket.js)
- Hooks chat: [frontend/src/hooks/use-chat.js](frontend/src/hooks/use-chat.js)
- Thông báo realtime UI: [frontend/src/components/common/Notification/NotificationsBridge.jsx](frontend/src/components/common/Notification/NotificationsBridge.jsx)

## API tổng quan

Base URL: `http://localhost:8017/api`

- Auth: `/auth/...`
- Users: xem [backend/src/routes/userRoute.js](backend/src/routes/userRoute.js)
- Messages: `/messages` — xem [backend/src/routes/messageRoute.js](backend/src/routes/messageRoute.js)
- Conversations: `/conversation` — xem [backend/src/routes/conversationRoute.js](backend/src/routes/conversationRoute.js)
- Contacts: `/contacts` — xem [backend/src/routes/contactRoute.js](backend/src/routes/contactRoute.js)
- Cloud: `/cloud` — xem [backend/src/routes/cloudRoute.js](backend/src/routes/cloudRoute.js)
- Notifications: `/notification` — xem [backend/src/routes/notificationRoute.js](backend/src/routes/notificationRoute.js)

Kiểm tra server:
```http
GET /api/status
```

## Socket.IO sự kiện (mặc định namespace "/")
- Xác thực qua middleware; join phòng người dùng:
  - Client emit: `user:join` với `{ userId }`
- Chat:
  - Server emit: `message:new` khi có tin nhắn mới
  - Typing: `typing:start`, `typing:stop` (tùy implement)
- Notifications:
  - Server emit: `notification:new`
  - Đọc tất cả: server có `notification:mark-all-read` sync giữa các tab

Xem đăng ký socket: [backend/src/sockets/index.js](backend/src/sockets/index.js)

## Upload media (Cloudinary)
- Provider: [backend/src/providers/CloudinaryProvider_v2.js](backend/src/providers/CloudinaryProvider_v2.js)
- Service: [backend/src/services/mediaService.js](backend/src/services/mediaService.js)
- Hỗ trợ `resource_type: auto`, chunk upload (video/raw), trả về metadata (mimetype, kích thước, duration…)
- Frontend hiển thị theo mimetype, có panel media trong hội thoại

## Scripts
Tại root:
- `npm run setup` — cài đặt dependencies cho backend và frontend
- `npm run dev:be` — chạy backend dev
- `npm run dev:fe` — chạy frontend dev

(Thêm scripts khác nếu cần trong package.json của từng phần)

## Troubleshooting
- 401/403 khi gọi API:
  - Kiểm tra JWT và cookie, biến `JWT_SECRET`
- CORS/Socket không kết nối:
  - Đảm bảo `WEBSITE_DOMAIN_DEVELOPMENT` trùng origin của Vite (http://localhost:5173)
- Không upload được media:
  - Kiểm tra biến Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- MongoDB không kết nối:
  - Kiểm tra `MONGO_URI` và `DATABASE_NAME`
- Port xung đột:
  - Đổi `LOCAL_DEV_APP_PORT` hoặc port của Vite

## Đóng góp
Mở issue hoặc PR tại: https://github.com/v2tuan/chat-app

## License
ISC License
