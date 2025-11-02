"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import Stories from "react-insta-stories"
import { Music, ImagePlus, Play, Pause, X, Check, Heart, Search, Upload, Type, Sticker, ZoomIn, ZoomOut, RotateCw, RotateCcw, FlipHorizontal } from "lucide-react"
import { createStoryAPI } from "@/apis"
import { toast } from "react-toastify"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HexColorPicker } from "react-colorful"
import useImage from "use-image"
import { Stage, Layer, Image as KonvaImage, Text as KonvaText } from "react-konva"

// 🎨 Hàm lấy màu trung bình của ảnh
const getAverageColor = (image) => {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  canvas.width = image.width
  canvas.height = image.height
  ctx.drawImage(image, 0, 0, image.width, image.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let r = 0, g = 0, b = 0
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const count = data.length / 4
  return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`
}

export default function StoryCreator() {
  const [bgColor, setBgColor] = useState("#111827")
  const [selectedSong, setSelectedSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [musicStyle, setMusicStyle] = useState("card")
  const [showPreview, setShowPreview] = useState(false)
  const audioRef = useRef(null)
  const navigate = useNavigate()


  // =================== Create Story ====================
  // Kích thước canvas 9:16 (405x720 cho màn hình hiển thị)
  const CANVAS_WIDTH = 405
  const CANVAS_HEIGHT = 720

  const [bgImageSrc, setBgImageSrc] = useState(null)
  // const [bgColor, setBgColor] = useState("#000")
  const [layers, setLayers] = useState([])
  const [selectedColor, setSelectedColor] = useState("#ffffff")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [storyJSON, setStoryJSON] = useState(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [bgPosition, setBgPosition] = useState({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 })
  const [imgSize, setImgSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
  const fileInputRef = useRef(null)

  const [bgImage] = useImage(bgImageSrc, "anonymous")

  // 🖼️ Upload ảnh và lấy màu nền
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.src = reader.result
      img.onload = () => {
        setBgImageSrc(reader.result)
        setImgSize({ width: img.width, height: img.height })
        const color = getAverageColor(img)
        setBgColor(color)
      }
    }
    reader.readAsDataURL(file)
  }

  // 📝 Thêm text
  const handleAddText = () => {
    setLayers((prev) => [
      ...prev,
      { id: Date.now(), type: "text", content: "Nhập text...", x: 100, y: 100, color: selectedColor }
    ])
  }

  // 🖼️ Thêm sticker
  const handleAddSticker = () => {
    setLayers((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "sticker",
        url: "data:image/jpeg;base64,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",
        x: 60,
        y: 60
      }
    ])
  }

  // 🎵 Thêm nhạc
  const handleAddMusic = () => {
    setLayers((prev) => [
      ...prev,
      { id: Date.now(), type: "music", name: "Perfect - Ed Sheeran" }
    ])
  }

  // ⚙️ Tính toán tỉ lệ ảnh phù hợp khung 9:16
  const getScaledSize = () => {
    if (!imgSize.width || !imgSize.height) return { w: CANVAS_WIDTH, h: CANVAS_HEIGHT }
    const ratio = Math.min(CANVAS_WIDTH / imgSize.width, CANVAS_HEIGHT / imgSize.height)
    return { w: imgSize.width * ratio, h: imgSize.height * ratio }
  }

  const scaled = getScaledSize()

  // ✅ Đăng Story
  const handlePostStory = () => {
    const storyData = {
      id: Date.now(),
      background: {
        image: bgImageSrc,
        color: bgColor,
        scale,
        rotation,
        flipped: isFlipped,
        position: bgPosition,
        scaledSize: scaled
      },
      layers,
      createdAt: new Date().toISOString()
    }
    setStoryJSON(storyData)
    setPreviewOpen(true)
  }

  // 🪞 Lật ảnh
  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }


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

  const handleSubmit = async () => {
    if (!bgImageSrc) {
      toast.error("Vui lòng chọn ảnh trước khi tạo story.")
      return
    }

    try {
    // 1️⃣ Dừng nhạc nếu đang phát
      if (audioRef.current) audioRef.current.pause()

      // 2️⃣ Chuẩn bị object story
      const storyData = {
        background: {
          image: bgImageSrc,
          color: bgColor,
          scale,
          rotation,
          flipped: isFlipped,
          position: bgPosition,
          scaledSize: scaled
        },
        layers,
        music: currentTrack
          ? {
            name: currentTrack.name,
            url: currentTrack.audio,
            artist: currentTrack.artist_name
          }
          : null,
        musicStyle,
        createdAt: new Date().toISOString()
      }

      // 3️⃣ Tạo FormData — chỉ 1 file + 1 text field
      const formData = new FormData()
      formData.append("storyData", JSON.stringify(storyData)) // req.body.storyData

      // Nếu ảnh là base64 → convert sang Blob
      if (bgImageSrc.startsWith("data:image")) {
        const blob = await fetch(bgImageSrc).then((res) => res.blob())
        formData.append("file", blob, "background.jpg")
      }

      // 4️⃣ Gửi request
      const result = await createStoryAPI(formData)
      console.log("✅ Story created:", result)
      toast.success("Story đã được đăng thành công!")

      navigate('/')
      setPreviewOpen(true)
      setStoryJSON(storyData)
    } catch (error) {
      console.error("❌ Lỗi khi tạo story:", error)
      toast.error("Tạo story thất bại, vui lòng thử lại.")
    }
  }


  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 overflow-hidden">
      {/* Sidebar trái */}
      <aside className="w-100 bg-white border-r flex flex-col p-5 gap-5">
        <div>
          <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 w-full p-3 border rounded-lg hover:bg-gray-50">
            <ImagePlus /> <span>Chọn ảnh nền</span>
          </button>
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
              {currentTrack?.id === track.id && isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
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
            disabled={!bgImageSrc}
            // onClick={() => setShowPreview(true)}
            onClick={() => handleSubmit()}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Chia sẻ tin
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center">


        {/* Các tính năng */}
        <div className="flex flex-wrap gap-3 mb-4 justify-center max-w-2xl">
          <Button onClick={handleAddText} className="bg-emerald-500 hover:bg-emerald-600">
            <Type className="w-4 h-4 mr-2" /> Text
          </Button>
          <Button onClick={handleAddSticker} className="bg-pink-500 hover:bg-pink-600">
            <Sticker className="w-4 h-4 mr-2" /> Sticker
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button className="bg-yellow-500 hover:bg-yellow-600">🎨 Màu chữ</Button>
            </PopoverTrigger>
            <PopoverContent className="bg-white p-3 rounded-lg">
              <HexColorPicker color={selectedColor} onChange={setSelectedColor} />
            </PopoverContent>
          </Popover>

          <Button onClick={() => setScale((s) => s + 0.1)} className="bg-gray-700">
            <ZoomIn className="w-4 h-4 mr-1" /> Zoom
          </Button>
          <Button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="bg-gray-700">
            <ZoomOut className="w-4 h-4 mr-1" /> Out
          </Button>
          <Button onClick={() => setRotation((r) => r + 10)} className="bg-gray-700">
            <RotateCw className="w-4 h-4 mr-1" /> Xoay
          </Button>
          <Button onClick={() => setRotation((r) => r - 10)} className="bg-gray-700">
            <RotateCcw className="w-4 h-4 mr-1" /> Ngược
          </Button>
          <Button onClick={handleFlip} className="bg-gray-700">
            <FlipHorizontal className="w-4 h-4 mr-1" /> Lật
          </Button>
        </div>

        {/* Khung Story 9:16 */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700" style={{ backgroundColor: bgColor }}>
          {!bgImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
              <ImagePlus className="w-10 h-10 mb-2" />
              <p>Hãy chọn ảnh để bắt đầu</p>
            </div>
          )}
          <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
            <Layer>
              {bgImage && (
                <KonvaImage
                  image={bgImage}
                  x={bgPosition.x}
                  y={bgPosition.y}
                  offsetX={scaled.w / 2}
                  offsetY={scaled.h / 2}
                  width={scaled.w}
                  height={scaled.h}
                  draggable
                  onDragEnd={(e) => setBgPosition({ x: e.target.x(), y: e.target.y() })}
                  scaleX={(isFlipped ? -1 : 1) * scale}
                  scaleY={scale}
                  rotation={rotation}
                />
              )}

              {layers.map((layer) => {
                if (layer.type === "text")
                  return (
                    <KonvaText
                      key={layer.id}
                      text={layer.content}
                      x={layer.x}
                      y={layer.y}
                      fill={layer.color}
                      fontSize={24}
                      fontStyle="bold"
                      draggable
                      onDblClick={() => {
                        const newText = prompt("Nhập nội dung:", layer.content)
                        if (newText)
                          setLayers((prev) =>
                            prev.map((l) => (l.id === layer.id ? { ...l, content: newText } : l))
                          )
                      }}
                      onDragEnd={(e) =>
                        setLayers((prev) =>
                          prev.map((l) =>
                            l.id === layer.id ? { ...l, x: e.target.x(), y: e.target.y() } : l
                          )
                        )
                      }
                    />
                  )

                if (layer.type === "sticker") {
                  const img = new window.Image()
                  img.src = layer.url
                  return (
                    <KonvaImage
                      key={layer.id}
                      image={img}
                      x={layer.x}
                      y={layer.y}
                      width={80}
                      height={80}
                      draggable
                      onDragEnd={(e) =>
                        setLayers((prev) =>
                          prev.map((l) =>
                            l.id === layer.id ? { ...l, x: e.target.x(), y: e.target.y() } : l
                          )
                        )
                      }
                    />
                  )
                }
                return null
              })}
            </Layer>
          </Stage>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>

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