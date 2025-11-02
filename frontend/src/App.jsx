// /src/App.jsx
import { useSelector } from "react-redux";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Auth from "./pages/AuthPage/Auth";
import OtpPage from "./pages/OtpPage/OtpPage"; // ⭐ lấy OTP chung (signup/verify)
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import { selectCurrentUser } from "./redux/user/userSlice";
import MainLayout from "./pages/HomePage/HomePage";
import MessagePage from "./pages/MessagePage/MessagePage";
import ContactPage from "./pages/ContactPage/ContactPage";
import CloudPage from "./pages/CloudPage/CloudPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import GlobalCallModal from "./components/common/Modal/GlobalCallModal"
import NotificationsPage from "@/components/common/Notification/NotificationsPage.jsx";
import StoryCreator from "./pages/StoryCreate/StoryCreator";
import StoryViewer from "./pages/StoryCreate/StoryViewer";
import AIAssistantPage from "./pages/AIAssistantPage";
import JoinGroupPage from "@/pages/JoinGroupPage.jsx";

const ProtectedRoute = () => {
  const currentUser = useSelector(selectCurrentUser);
  if (currentUser === undefined) return <div>Loading...</div>;
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <>
      <GlobalCallModal />
      <Routes>
        <Route path="/" element={<Navigate to="/chats" replace />} />
        <Route path="/join/:conversationId" element={<JoinGroupPage />} />

        {/* Public auth routes */}
        <Route path="login" element={<Auth />} />
        <Route path="signup" element={<Auth />} />
        <Route path="auth/otp" element={<OtpPage />} />        {/* ✅ đúng path */}
        <Route path="auth/forgot" element={<Auth />} />
        <Route path="auth/forgot/otp" element={<Auth />} />
        <Route path="auth/forgot/reset" element={<Auth />} />        {/* ✅ một trang */}
        {/* ❌ bỏ: /auth/forgot/otp và /auth/forgot/reset */}

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="settings/account" element={<ProfilePage />} />
          <Route path="settings/security" element={<ProfilePage />} />
          <Route path="stories/create" element={<StoryCreator />} />
          <Route path="stories/view" element={<StoryViewer />} />
          <Route element={<MainLayout />}>
            <Route path="chats" element={<MessagePage />} />
            <Route path="chats/:conversationId" element={<MessagePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="contacts/*" element={<ContactPage />} />
            <Route path="chats/cloud" element={<CloudPage />} />
            <Route path="agent" element={<AIAssistantPage />} />
          </Route>
        </Route>

        <Route path="*" element={<div className="p-6">404 Not Found</div>} />
      </Routes>

      <ToastContainer position="top-right" autoClose={4000} newestOnTop closeOnClick pauseOnHover draggable theme="colored" />
    </>
  );
}
