import FriendRequest from '@/components/common/Sidebar/Contact/FriendRequest.jsx'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import ListFriend from '../../components/common/Sidebar/Contact/ListFriend.jsx'
import { useEffect } from 'react'

const ContactPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Effect để handle redirect khi vào /contacts (không có tab)
  useEffect(() => {
    if (location.pathname === '/contacts' || location.pathname === '/contacts/') {
      navigate('/contacts/friends', { replace: true })
    }
  }, [location.pathname, navigate])

  return (
    <div className="w-full h-full">
      {/* Chỉ render nội dung chính, AppSidebar sẽ handle tabs */}
      <Routes>
        <Route path="friends" element={<ListFriend />} />
        <Route path="friendsRequest" element={<FriendRequest />} />
        <Route path="groups" element={<div>Joined groups and communities (placeholder)</div>} />
        <Route path="groupsRequest" element={<div>Group and community invitations (placeholder)</div>} />
      </Routes>
    </div>
  )
}

export default ContactPage
