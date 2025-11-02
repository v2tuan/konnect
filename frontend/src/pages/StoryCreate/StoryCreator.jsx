"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import Stories from "react-insta-stories"
import { Music, ImagePlus, Play, Pause, X, Check, Heart, Search } from "lucide-react"
import { createStoryAPI } from "@/apis"
import { toast } from "react-toastify"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"

function extractDominantColor(img) {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let r = 0, g = 0, b = 0, count = 0
  for (let i = 0; i < data.length; i += 40) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count++
  }
  return `rgb(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)})`
}

export default function StoryCreator() {
  const [backgroundImage, setBackgroundImage] = useState(null)
  const [bgColor, setBgColor] = useState("#111827")
  const [selectedSong, setSelectedSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [musicStyle, setMusicStyle] = useState("card")
  const [showPreview, setShowPreview] = useState(false)
  const audioRef = useRef(null)
  const navigate = useNavigate()

  // =================== nhạc =========================
  const [tracks, setTracks] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [progress, setProgress] = useState(0)
  const CLIENT_ID = '8fbb2968'

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(
          `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=20&order=popularity_total`
        )
        const data = await res.json()
        setTracks(data.results)
        if (data.results.length > 0) setCurrentTrack(data.results[0])
      } catch (err) {
        setError("Không tải được dữ liệu thịnh hành")
      } finally {
        setLoading(false)
      }
    }

    fetchTrending()
  }, [])

  const searchTracks = async (query) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(
        `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=30&search=${encodeURIComponent(query)}&order=popularity_total`
      )
      const data = await res.json()
      setTracks(data.results)
      if (data.results.length === 0) {
        setError("Không tìm thấy bài hát nào.")
      }
    } catch (err) {
      setError("Lỗi khi tìm kiếm. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      searchTracks(searchQuery)
    }, 500)
    return () => clearTimeout(delaySearch)
  }, [searchQuery])

  const handlePlay = (track) => {
    if (track.id === currentTrack?.id) {
      setIsPlaying(!isPlaying)
    } else {
      setCurrentTrack(track)
      setIsPlaying(true)
      setProgress(0)
    }
  }

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.error("Playback error:", err)
          setIsPlaying(false)
        })
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, currentTrack])


  const handleImageUpload = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target.result
      const img = new Image()
      img.onload = () => {
        setBgColor(extractDominantColor(img))
        setBackgroundImage(url)
      }
      img.src = url
    }
    reader.readAsDataURL(f)
  }

  const handleSongSelect = (s) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const a = new Audio(s.audio)
    a.loop = true
    a.play().catch(() => { })
    audioRef.current = a
    setSelectedSong(s)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play().catch(() => { })
    setIsPlaying(!isPlaying)
  }

  const handleMusicUpload = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const s = { id: "__custom__", title: f.name, artist: "Bạn", cover: "🎧", audio: url }
    handleSongSelect(s)
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  // === Visualizer (cho chế độ "bar") ===
  const MusicVisualizer = ({ active }) => {
    const [bars, setBars] = useState(Array(15).fill(0))
    useEffect(() => {
      if (!active) return
      const t = setInterval(() => {
        setBars(Array(15).fill(0).map(() => Math.random()))
      }, 100)
      return () => clearInterval(t)
    }, [active])
    return (
      <div className="flex items-end gap-1 h-10">
        {bars.map((b, i) => (
          <div key={i} className="w-1 bg-white/90 rounded" style={{ height: `${10 + b * 40}px` }} />
        ))}
      </div>
    )
  }

  // === Story content memo hóa (tránh nháy) ===
  const storyData = useMemo(
    () => [
      {
        content: () => (
          <div
            className="w-full h-full flex justify-center items-center overflow-hidden"
            style={{ backgroundColor: bgColor }}
          >
            {backgroundImage && (
              <img
                src={backgroundImage}
                alt="Story"
                className="max-w-full max-h-full object-contain rounded-2xl"
              />
            )}
          </div>
        ),
        duration: 7000
      }
    ],
    [backgroundImage, bgColor]
  )

  const handleSubmit = async () => {
    if (!backgroundImage) {
      toast.error("Vui lòng chọn ảnh trước khi tạo story.")
      // alert("Vui lòng chọn ảnh trước khi tạo story.")
      return
    }

    try {
      if (audioRef.current && currentTrack) {
        if (isPlaying) {
          audioRef.current.play().catch((err) => {
            console.error("Playback error:", err)
            setIsPlaying(false)
          })
        } else {
          audioRef.current.pause()
        }
      }

      const formData = new FormData()

      // Thêm ảnh (convert từ base64 -> file blob)
      const res = await fetch(backgroundImage)
      const blob = await res.blob()
      formData.append("file", blob, "background.jpg")

      // Thêm thông tin nhạc
      if (currentTrack) {
        formData.append("music[name]", currentTrack.name)
        formData.append("music[url]", currentTrack.audio)
        formData.append("music[artist]", currentTrack.artist_name)
      }

      // Thêm màu nền và style
      formData.append("bgColor", bgColor)
      formData.append("musicStyle", musicStyle)

      // Gọi API
      const result = await createStoryAPI(formData)
      console.log("Story created:", result)

      alert("✅ Story đã được tạo thành công!")
      setShowPreview(false)
      navigate('/')
    } catch (error) {
      console.error("Error creating story:", error)
      alert("❌ Tạo story thất bại, vui lòng thử lại.")
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 overflow-hidden">
      {/* Sidebar trái */}
      <aside className="w-100 bg-white border-r flex flex-col p-5 gap-5">
        <div>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <ImagePlus /> <span>Chọn ảnh nền</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        <div>
          <button
            onClick={() => document.getElementById("upload-audio").click()}
            className="flex items-center gap-2 w-full p-3 border rounded-lg hover:bg-gray-50"
          >
            <Music /> <span>Thêm nhạc (upload)</span>
          </button>
          <input
            type="file"
            accept="audio/*"
            id="upload-audio"
            onChange={handleMusicUpload}
            className="hidden"
          />
        </div>

        <div className="text-sm text-gray-500">Nhạc mẫu</div>
        <div className='w-full space-y-2'>
          <div className='relative'>
            <div className='text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50'>
              <Search className='size-4' />
              <span className='sr-only'>User</span>
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type='text' placeholder='Search' className='peer pl-9 bg-muted' />
          </div>
        </div>

        {/* Loading & Error States */}
        {!tracks && loading && (
          <div className={`text-center py-12`}>
            <div className="animate-pulse">Đang tải nhạc...</div>
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto h-56">
          {tracks.map((track) => (
            <button
              key={track.id}
              // onClick={() => handleSongSelect(track)}
              onClick={() => handlePlay(track)}
              className={`p-2 rounded flex justify-between items-center w-full text-left ${selectedSong?.id === track.id ? "bg-blue-50" : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 mr-4">
                  <AvatarImage src={track.album_image} alt={track.name} />
                  <AvatarFallback>{track.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{track.name}</div>
                  <div className="text-xs text-gray-500">{track.artist_name}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                {currentTrack?.id === track.id && isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
            </button>
          ))}
        </div>

        {tracks.length === 0 && !loading && (
          <div className={`text-center py-12`}>
            Không tìm thấy bài hát nào.
          </div>
        )}

        <div className="mt-auto flex gap-2">
          <button
            disabled={!backgroundImage}
            // onClick={() => setShowPreview(true)}
            onClick={() => handleSubmit()}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Chia sẻ tin
          </button>
        </div>
      </aside>

      {/* Khu giữa */}
      <main className="flex-1 flex justify-center items-center">
        <div
          className="relative w-[420px] h-[740px] rounded-3xl overflow-hidden shadow-2xl flex justify-center items-center"
          style={{ backgroundColor: bgColor }}
        >
          {backgroundImage ? (
            <img
              src={backgroundImage}
              alt="Story"
              className="max-w-full max-h-full object-contain rounded-2xl"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
              <ImagePlus className="w-10 h-10 mb-2" />
              <p>Hãy chọn ảnh để bắt đầu</p>
            </div>
          )}

          {/* Hiển thị nhạc theo style */}
          {selectedSong && musicStyle !== "none" && (
            <div className="absolute bottom-6 left-4 right-4">
              {musicStyle === "card" && (
                <div className="bg-white/90 rounded-xl p-3 flex justify-between items-center shadow">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedSong.cover}</span>
                    <div>
                      <div className="font-semibold">{selectedSong.title}</div>
                      <div className="text-xs text-gray-500">{selectedSong.artist}</div>
                    </div>
                  </div>
                  <button
                    onClick={togglePlay}
                    className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </div>
              )}
              {musicStyle === "bar" && (
                <div className="bg-black/40 rounded-xl p-3 flex justify-center">
                  <MusicVisualizer active={isPlaying} />
                </div>
              )}
              {musicStyle === "minimal" && (
                <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full inline-flex items-center gap-2 text-white">
                  <Music size={16} />
                  <span className="text-sm truncate">{selectedSong.title}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Sidebar phải: chọn style nhạc */}
      <aside className="w-60 bg-white border-l p-5 flex flex-col gap-4">
        <div className="text-sm text-gray-500">Kiểu hiển thị nhạc</div>
        <div className="flex flex-col gap-2">
          {["card", "bar", "minimal", "none"].map((s) => (
            <button
              key={s}
              onClick={() => setMusicStyle(s)}
              className={`py-2 rounded text-sm ${musicStyle === s ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {s === "card"
                ? "Thẻ"
                : s === "bar"
                  ? "Thanh"
                  : s === "minimal"
                    ? "Tối giản"
                    : "Ẩn nhạc"}
            </button>
          ))}
        </div>
      </aside>

      {/* Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center">
          <div className="bg-white rounded-2xl p-4 relative w-[420px] h-[740px] overflow-hidden">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-3 right-3 bg-black/20 text-white rounded-full p-1"
            >
              <X />
            </button>

            <Stories stories={storyData} width={400} height={700} defaultInterval={7000} />

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <button
                onClick={() => handleSubmit()}
                className="px-6 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
              >
                <Check size={16} /> Chia sẻ tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.audio || ""}
      // onTimeUpdate={handleTimeUpdate}
      // onEnded={handleEnded}
      // onLoadedMetadata={() => {
      //   if (audioRef.current) {
      //     setDuration(audioRef.current.duration);
      //   }
      // }}
      />
    </div>
  )
}