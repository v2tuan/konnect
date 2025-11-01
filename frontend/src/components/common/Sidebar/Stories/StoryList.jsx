"use client"

import { getStoriesByFriends } from "@/apis"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { selectCurrentUser } from "@/redux/user/userSlice"
import { useEffect, useRef, useState, useMemo } from "react"
import { useSelector } from "react-redux"
import { Plus, Pause, X, ChevronLeft, ChevronRight, MoreHorizontal, Send, Heart, Volume2, VolumeX } from "lucide-react"

export function StoryList({ onCreateStory }) {
  const [storiesData, setStoriesData] = useState([])
  const [pagination] = useState({ page: 1, limit: 10 })
  const [loading, setLoading] = useState(false)
  const user = useSelector(selectCurrentUser)
  const [open, setOpen] = useState(false)
  const [currentFriendIndex, setCurrentFriendIndex] = useState(0)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef(null)

  // Fetch stories
  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true)
      try {
        const data = await getStoriesByFriends(pagination)
        setStoriesData(data?.data || [])
      } catch (error) {
        console.error("Failed to fetch stories:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStories()
  }, [pagination])

  // Get current story
  const currentStory = useMemo(() => {
    const friend = storiesData[currentFriendIndex]
    if (!friend || !friend.stories?.[currentStoryIndex]) return null
    return friend.stories[currentStoryIndex]
  }, [storiesData, currentFriendIndex, currentStoryIndex])

  const currentFriend = useMemo(() => {
    return storiesData[currentFriendIndex] || null
  }, [storiesData, currentFriendIndex])

  const totalStories = currentFriend?.stories?.length || 0
  const hasMusic = currentStory?.music?.url

  // Auto progress story
  useEffect(() => {
    if (!open || isPaused) return

    const startTime = Date.now()
    const duration = 7000

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      
      setProgress(newProgress)
      
      if (newProgress >= 100) {
        clearInterval(interval)
        handleNextStory()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [open, isPaused, currentFriendIndex, currentStoryIndex])

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0)
  }, [currentFriendIndex, currentStoryIndex])

  // Handle music playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      return
    }

    if (hasMusic && !isMuted) {
      audioRef.current = new Audio(currentStory.music.url)
      audioRef.current.loop = true
      audioRef.current.volume = 0.5
      
      if (!isPaused) {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err))
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [open, currentFriendIndex, currentStoryIndex, isMuted])

  // Control music when pause state changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPaused) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err))
      }
    }
  }, [isPaused])

  // Open story
  const handleOpenStory = (friendIndex) => {
    const friend = storiesData[friendIndex]
    if (!friend || !friend.stories?.length) return

    setCurrentFriendIndex(friendIndex)
    setCurrentStoryIndex(0)
    setIsPaused(false)
    setProgress(0)
    setOpen(true)
  }

  // Navigation handlers
  const handleNextStory = () => {
    if (currentStoryIndex < totalStories - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1)
    } else if (currentFriendIndex < storiesData.length - 1) {
      setCurrentFriendIndex(currentFriendIndex + 1)
      setCurrentStoryIndex(0)
    } else {
      setOpen(false)
    }
  }

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1)
    } else if (currentFriendIndex > 0) {
      setCurrentFriendIndex(currentFriendIndex - 1)
      setCurrentStoryIndex(storiesData[currentFriendIndex - 1].stories.length - 1)
    }
  }

  if (!open) {
    return (
      <>
        {loading && <p className="text-white p-4">Đang tải stories...</p>}

        {/* List avatar */}
        <div className="flex flex-row items-center space-x-4 overflow-x-auto px-4 py-2">
          {/* Your Story */}
          <div className="flex flex-col items-center cursor-pointer" onClick={onCreateStory}>
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                <AvatarFallback>{user?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                <Plus className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            </div>
            <p className="text-xs mt-1">Your Story</p>
          </div>

          {/* Friend stories */}
          {storiesData.map((friend, index) => (
            <div
              key={friend.user.id}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => handleOpenStory(index)}
            >
              <div className="p-[2px] bg-gradient-to-tr from-pink-500 to-yellow-400 rounded-full">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={friend.user?.avatarUrl} alt={friend.user?.username} />
                  <AvatarFallback>{friend.user?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
              </div>
              <p className="text-xs mt-1">{friend.user?.username}</p>
            </div>
          ))}
        </div>
      </>
    )
  }

  // Full screen story viewer
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      {/* Header with Instagram logo */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-30">
        <div className="text-white text-2xl font-semibold" style={{ fontFamily: 'cursive' }}>Instagram</div>
        <button onClick={() => setOpen(false)} className="text-white">
          <X size={32} />
        </button>
      </div>

      {/* Stories carousel - horizontal center */}
      <div className="flex items-center justify-center w-full h-full">
        {/* Left navigation button */}
        <button 
          onClick={handlePrevStory}
          className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white flex-shrink-0 z-20 hover:bg-opacity-30 absolute left-8"
          disabled={currentFriendIndex === 0 && currentStoryIndex === 0}
        >
          <ChevronLeft size={28} />
        </button>

        {/* Stories display - horizontal row with fixed center */}
        <div 
          className="flex items-center justify-center gap-4"
          style={{ 
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          {[0, 1, 2, 3, 4].map((slotIndex) => {
            const offset = slotIndex - 2
            const userIndex = currentFriendIndex + offset
            
            if (userIndex < 0 || userIndex >= storiesData.length) {
              return <div key={slotIndex} className="w-60 flex-shrink-0" />
            }
            
            const friend = storiesData[userIndex]
            const isCurrent = offset === 0
            const distance = Math.abs(offset)
            const storyToShow = isCurrent ? currentStory : friend.stories[0]

            return (
              <div
                key={slotIndex}
                onClick={() => {
                  if (!isCurrent) {
                    setCurrentFriendIndex(userIndex)
                    setCurrentStoryIndex(0)
                  }
                }}
                className="relative cursor-pointer flex-shrink-0"
                style={{
                  opacity: isCurrent ? 1 : Math.max(0.3, 1 - distance * 0.25),
                }}
              >
                {/* Progress bars - only for current story */}
                {isCurrent && (
                  <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
                    {friend.stories.map((_, idx) => (
                      <div key={idx} className="flex-1 h-0.5 bg-white bg-opacity-30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white transition-all"
                          style={{ 
                            width: idx === currentStoryIndex ? `${progress}%` : idx < currentStoryIndex ? '100%' : '0%'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Header - only for current story */}
                {isCurrent && (
                  <div className="absolute top-6 left-2 right-2 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-white p-0.5">
                        <Avatar className="w-full h-full">
                          <AvatarImage src={friend.user?.avatarUrl} alt={friend.user?.username} />
                          <AvatarFallback>{friend.user?.username?.[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                      <span className="text-white font-semibold text-sm">{friend.user?.username}</span>
                      <span className="text-gray-300 text-xs">
                        {new Date(currentStory?.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasMusic && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsMuted(!isMuted)
                          }}
                          className="text-white"
                        >
                          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsPaused(!isPaused)
                        }}
                        className="text-white"
                      >
                        <Pause size={18} fill={isPaused ? 'white' : 'none'} />
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="text-white"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Story content */}
                <div 
                  className="rounded-xl overflow-hidden relative"
                  style={{
                    width: isCurrent ? '420px' : '240px',
                    height: isCurrent ? '700px' : '400px',
                    backgroundColor: storyToShow?.bgColor || '#000'
                  }}
                >
                  {storyToShow?.media?.url && (
                    <img 
                      src={storyToShow.media.url}
                      alt={friend.user?.username}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Navigation areas - only for current story */}
                  {isCurrent && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePrevStory()
                        }}
                        className="absolute left-0 top-0 bottom-0 w-1/3"
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleNextStory()
                        }}
                        className="absolute right-0 top-0 bottom-0 w-1/3"
                      />
                    </>
                  )}
                </div>

                {/* User info overlay - for non-current stories */}
                {!isCurrent && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full border-2 border-white p-0.5 mb-1">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={friend.user?.avatarUrl} alt={friend.user?.username} />
                        <AvatarFallback>{friend.user?.username?.[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="text-white text-xs font-semibold text-center">{friend.user?.username}</span>
                    <span className="text-gray-400 text-xs text-center">
                      {new Date(friend.stories[0]?.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}

                {/* Bottom interaction bar - only for current story */}
                {isCurrent && (
                  <div className="absolute bottom-4 left-2 right-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder={`Trả lời ${friend.user?.username}...`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent border border-white border-opacity-50 rounded-full px-4 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-opacity-100"
                      />
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="text-white"
                      >
                        <Heart size={24} />
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="text-white"
                      >
                        <Send size={24} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right navigation button */}
        <button 
          onClick={handleNextStory}
          className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white flex-shrink-0 z-20 hover:bg-opacity-30 absolute right-8"
          disabled={currentFriendIndex === storiesData.length - 1 && currentStoryIndex === totalStories - 1}
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  )
}