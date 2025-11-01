import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, MoreHorizontal, Send, Heart, Volume2, VolumeX } from 'lucide-react';

const StoryViewer = () => {
  const [currentUserIndex, setCurrentUserIndex] = useState(2);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  const users = [
    {
      id: 1,
      username: 'delvinyau',
      avatar: 'https://ui-avatars.com/api/?name=DV&background=667eea&color=fff',
      time: '15 giờ',
      stories: [
        {
          image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=700&fit=crop',
          music: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3'
        },
        {
          image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=700&fit=crop',
          music: null
        },
      ]
    },
    {
      id: 2,
      username: 'quan_tui',
      avatar: 'https://ui-avatars.com/api/?name=QT&background=f56565&color=fff',
      time: 'Được tải trụ',
      stories: [
        {
          image: 'https://images.unsplash.com/photo-1519995451813-39e29e054914?w=400&h=700&fit=crop',
          music: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c6c4136c24.mp3'
        },
        {
          image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=700&fit=crop',
          music: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe05c21.mp3'
        },
      ]
    },
    {
      id: 3,
      username: 'nepherteti',
      avatar: 'https://ui-avatars.com/api/?name=NP&background=48bb78&color=fff',
      time: '6 giờ',
      stories: [
        {
          image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=700&fit=crop',
          music: null
        },
        {
          image: 'https://images.unsplash.com/photo-1560439513-74b037a25d84?w=400&h=700&fit=crop',
          music: 'https://cdn.pixabay.com/audio/2022/01/18/audio_42856c32b2.mp3'
        },
        {
          image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=700&fit=crop',
          music: null
        },
      ]
    },
    {
      id: 4,
      username: 'tiemgiaycr',
      avatar: 'https://ui-avatars.com/api/?name=TG&background=ed8936&color=fff',
      time: '6 giờ',
      stories: [
        {
          image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=700&fit=crop',
          music: 'https://cdn.pixabay.com/audio/2022/03/15/audio_13d5080b54.mp3'
        },
        {
          image: 'https://images.unsplash.com/photo-1624823183493-ed5832f48f18?w=400&h=700&fit=crop',
          music: null
        },
      ]
    },
    {
      id: 5,
      username: 'donghuyme',
      avatar: 'https://ui-avatars.com/api/?name=DH&background=38b2ac&color=fff',
      time: '1 giờ',
      stories: [
        {
          image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=700&fit=crop',
          music: 'https://cdn.pixabay.com/audio/2022/05/13/audio_c96c768ff4.mp3'
        },
        {
          image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=700&fit=crop',
          music: 'https://cdn.pixabay.com/audio/2021/08/04/audio_2dde668d05.mp3'
        },
      ]
    },
  ];

  const currentUser = users[currentUserIndex];
  const totalStories = currentUser.stories.length;
  const currentStory = currentUser.stories[currentStoryIndex];
  const hasMusic = currentStory.music !== null;

  // Auto progress story
  useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now();
    const duration = 5000; // 5 seconds per story

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(interval);
        handleNextStory();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, currentUserIndex, currentStoryIndex]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
  }, [currentUserIndex, currentStoryIndex]);

  // Handle music playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (hasMusic && !isMuted) {
      audioRef.current = new Audio(currentStory.music);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      
      if (!isPaused) {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentUserIndex, currentStoryIndex, isMuted]);

  // Control music when pause state changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPaused) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
      }
    }
  }, [isPaused]);

  const handleNextStory = () => {
    if (currentStoryIndex < totalStories - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentUserIndex < users.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      // Reached the end, stop
      setIsPaused(true);
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex(currentUserIndex - 1);
      setCurrentStoryIndex(users[currentUserIndex - 1].stories.length - 1);
    }
  };

  const handleNextUser = () => {
    if (currentUserIndex < users.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
    }
  };

  const handlePrevUser = () => {
    if (currentUserIndex > 0) {
      setCurrentUserIndex(currentUserIndex - 1);
      setCurrentStoryIndex(0);
    }
  };

  // Get visible users - always show current in the middle
  const getVisibleUsers = () => {
    const visible = [];
    
    // Always show current user in position 2 (middle of 5 items)
    // Show up to 2 before and 2 after
    for (let offset = -2; offset <= 2; offset++) {
      const index = currentUserIndex + offset;
      if (index >= 0 && index < users.length) {
        visible.push({ 
          ...users[index], 
          originalIndex: index, 
          offset: offset,
          position: offset + 2 // 0,1,2,3,4 where 2 is center
        });
      }
    }
    
    return visible;
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      {/* Header with Instagram logo */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-30">
        <div className="text-white text-2xl font-semibold" style={{ fontFamily: 'cursive' }}>Instagram</div>
        <button className="text-white">
          <X size={32} />
        </button>
      </div>

      {/* Stories carousel - horizontal center */}
      <div className="flex items-center justify-center w-full h-full">
        {/* Left navigation button */}
        <button 
          onClick={handlePrevStory}
          className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white flex-shrink-0 z-20 hover:bg-opacity-30 absolute left-8"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Stories display - horizontal row with fixed center */}
        <div className="flex items-center justify-center gap-4"
             style={{ 
               position: 'absolute',
               left: '50%',
               transform: 'translateX(-50%)'
             }}>
          {/* Create 5 slots, with middle slot (index 2) being the current story */}
          {[0, 1, 2, 3, 4].map((slotIndex) => {
            const offset = slotIndex - 2; // -2, -1, 0, 1, 2
            const userIndex = currentUserIndex + offset;
            
            // Check if user exists at this position
            if (userIndex < 0 || userIndex >= users.length) {
              return <div key={slotIndex} className="w-60 flex-shrink-0" />;
            }
            
            const user = users[userIndex];
            const isCurrent = offset === 0;
            const distance = Math.abs(offset);

            return (
              <div
                key={slotIndex}
                onClick={() => {
                  if (!isCurrent) {
                    setCurrentUserIndex(userIndex);
                    setCurrentStoryIndex(0);
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
                    {user.stories.map((_, idx) => (
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
                        <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full" />
                      </div>
                      <span className="text-white font-semibold text-sm">{user.username}</span>
                      <span className="text-gray-300 text-xs">{user.time}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasMusic && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                          }}
                          className="text-white"
                        >
                          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPaused(!isPaused);
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
                  }}
                >
                  <img 
                    src={isCurrent ? currentStory.image : user.stories[0].image}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />

                  {/* Navigation areas - only for current story */}
                  {isCurrent && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevStory();
                        }}
                        className="absolute left-0 top-0 bottom-0 w-1/3"
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNextStory();
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
                      <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full" />
                    </div>
                    <span className="text-white text-xs font-semibold text-center">{user.username}</span>
                    <span className="text-gray-400 text-xs text-center">{user.time}</span>
                  </div>
                )}

                {/* Bottom interaction bar - only for current story */}
                {isCurrent && (
                  <div className="absolute bottom-4 left-2 right-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder={`Trả lời ${user.username}...`}
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
            );
          })}
        </div>

        {/* Right navigation button */}
        <button 
          onClick={handleNextStory}
          className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white flex-shrink-0 z-20 hover:bg-opacity-30 absolute right-8"
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
};

export default StoryViewer;