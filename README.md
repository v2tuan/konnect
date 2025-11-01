# 🚀 Konnect — Chat App (Realtime Messaging)

A realtime chat application with a Node.js/Express backend and a React/Vite frontend. This README expands on the original file and adds badges, icons, and developer details.

![Node](https://img.shields.io/badge/Node-16%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=0a0a0a)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socketdotio&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%2FLocal-47A248?logo=mongodb&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-media-3448C5?logo=cloudinary&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

---

## 👨‍💻 Developers

- 22110295 — Đặng Đăng Duy
- 22110296 — Phan Tất Duy
- 22110450 — Võ Văn Tuấn

---

## ✨ Features

- 🔐 Auth: register, login, password reset via email
- 👥 Contacts: friend invites, accept/decline, block/unblock
- 💬 1:1 messaging: text, image, file, audio, reactions
- ☁️ Media storage via Cloudinary with metadata
- 🛎️ Realtime notifications (new messages, invites, read status)
- 🟢 Presence: online/offline, typing indicators
- 🧩 Clean separation of controllers/services/models

---

## 🧭 Table of Contents

- Prerequisites
- Quick Start
- Project Structure
- Architecture Overview
- API & Routes
- Socket.IO Events
- Media Upload (Cloudinary)
- Useful Scripts
- Troubleshooting
- Developers
- Contributing & License

---

## 📦 Prerequisites

- Node.js 16+ (14+ may work)
- npm
- Git
- MongoDB (local or cloud)
- Cloudinary account (for media)
- Optional: Email provider (e.g., SendGrid) if enabling email features

---

## ⚙️ Quick Start

1) 📥 Clone the repository
```bash
git clone https://github.com/v2tuan/konnect.git
cd konnect
```

2) 📦 Install dependencies (backend + frontend)
```bash
npm run setup
```

3) 🔐 Configure environment (Backend)
Create `backend/.env`:
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
JWT_SECRET=change_me_super_secret

# Email (optional)
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=no-reply@yourdomain.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4) ▶️ Run development servers
- Backend:
```bash
npm run dev:be
```
- Frontend (open a new terminal):
```bash
npm run dev:fe
```

Default URLs:
- Backend: http://localhost:8017
- Frontend: http://localhost:5173

---

## 🗂️ Project Structure

```
konnect/
  backend/
    src/
      server.js
      config/
      controllers/
      error/
      lib/
      middlewares/
      models/
      providers/
      routes/
      seeds/
      services/
      sockets/
      utils/
      validations/
  frontend/
    index.html
    vite.config.js
    tailwind.config.js
    src/
      apis/
      assets/
      components/
      hooks/
      lib/
      middlewares/
      pages/
      redux/
      store/
      utils/
```

Key entries:
- 🧠 Backend entry: backend/src/server.js
- 🧭 Root router: backend/src/routes/index.js
- ⚡ Socket bootstrap: backend/src/sockets/index.js
- ☁️ Cloudinary: backend/src/providers/CloudinaryProvider_v2.js
- 📨 Message service: backend/src/services/messageService.js
- 🧵 Conversation service: backend/src/services/conversationService.js
- 🔔 Notification service: backend/src/services/notificationService.js
- ⚛️ Frontend entry: frontend/src/main.jsx, frontend/src/App.jsx
- 🔌 Socket client: frontend/src/lib/socket.js
- 🪝 Chat hooks: frontend/src/hooks/use-chat.js, frontend/src/hooks/use-conversation.js
- 🟢 Presence middleware: frontend/src/middlewares/presenceListener.js
- 🧱 Redux store: frontend/src/redux/store.js

---

## 🏗️ Architecture Overview

- Backend (Express + MongoDB/Mongoose)
  - Controllers, Services, Models
  - JWT auth, auth middleware, Multer upload middleware
  - Cloudinary provider for media
  - Socket.IO namespaces: auth, presence, chat, call
- Frontend (React + Vite + Tailwind)
  - State with Redux
  - Socket.IO client and hooks
  - Pages: Auth, Home, Message, Profile, Cloud, OTP
  - Componentized UI with theme provider

---

## 🔌 API & Routes

Main routes (see backend/src/routes):
- 🔐 Auth: authRoute.js
- 👤 User: userRoute.js
- 💬 Message: messageRoute.js
- 🧵 Conversation: conversationRoute.js
- 👥 Contact/Friendship: contactRoute.js
- ☁️ Cloud/Media: cloudRoute.js
- 🔔 Notification: notificationRoute.js

Base path is configured in backend/src/routes/index.js (commonly /api or /api/v1).

---

## ⚡ Socket.IO Events

- 🔑 Auth/Join
  - Client authenticates and joins a per-user room after connection
- 💬 Chat
  - message:new — emitted on new messages
  - typing:start / typing:stop — typing indicators (if enabled)
- 🟢 Presence
  - Join/leave updates online/offline status
- 🔔 Notifications
  - notification:new — realtime notifications
  - read sync across tabs/devices

Details in backend/src/sockets/*.js.

---

## 🖼️ Media Upload (Cloudinary)

- Provider: backend/src/providers/CloudinaryProvider_v2.js
- Service: backend/src/services/mediaService.js
- Supports resource_type: auto, returns metadata (mimetype, size, duration…)
- Frontend renders by media type (image/video/file)

---

## 🧰 Useful Scripts

- 🔧 Install all: `npm run setup`
- ▶️ Dev servers:
  - Backend: `npm run dev:be`
  - Frontend: `npm run dev:fe`
- 🌱 Seed data (optional): `node backend/seeds/seedUsers.js`

Some scripts may also exist under backend/package.json or frontend/package.json.

---

## 🩺 Troubleshooting

- ❌ 401/403 on API calls: check JWT, cookies/Authorization header, JWT_SECRET
- 🔒 CORS/Socket issues: ensure WEBSITE_DOMAIN_DEVELOPMENT matches Vite origin (http://localhost:5173)
- 📸 Upload failing: verify CLOUDINARY_* envs
- 🗄️ MongoDB connection: check MONGO_URI, DATABASE_NAME, and Mongo service status
- 🛑 Port in use: change LOCAL_DEV_APP_PORT or Vite port (vite.config.js)

---

## 🤝 Contributing & License

- Issues/PRs: https://github.com/v2tuan/konnect
- License: ISC
