"use client"

import React, { useState, useRef, useEffect } from "react"
import { Music, ImagePlus, Play, Pause, Search, Type, ZoomIn, ZoomOut, RotateCw, RotateCcw, FlipHorizontal, Palette, Loader2, X, Trash2 } from "lucide-react"
import { createStoryAPI } from "@/apis"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HexColorPicker } from "react-colorful"
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer } from "react-konva"
import GifStickerPicker from "@/components/common/GifStickerPicker"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Màu preset phổ biến
const PRESET_COLORS = [
  "#111827", "#1e293b", "#374151", "#4b5563",
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ffffff", "#000000"
]

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
  const avgR = Math.round(r / count)
  const avgG = Math.round(g / count)
  const avgB = Math.round(b / count)
  return `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`
}

export default function StoryCreator() {
  const CANVAS_WIDTH = 405
  const CANVAS_HEIGHT = 720

  // States
  const [bgColor, setBgColor] = useState("#111827")
  const [autoColor, setAutoColor] = useState(null)
  const [bgImageSrc, setBgImageSrc] = useState(null)
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [selectedColor, setSelectedColor] = useState("#ffffff")
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [bgPosition, setBgPosition] = useState({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 })
  const [imgSize, setImgSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
  const [showPreview, setShowPreview] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [storyJSON, setStoryJSON] = useState(null)

  // Music states
  const [tracks, setTracks] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [selectedSong, setSelectedSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [musicStyle, setMusicStyle] = useState("card")
  const [loadingTrackId, setLoadingTrackId] = useState(null)

  const fileInputRef = useRef(null)
  const audioRef = useRef(null)
  const navigate = useNavigate()
  const CLIENT_ID = '8fbb2968'

  // Load ảnh background
  const [bgImage, setBgImage] = useState(null)
  useEffect(() => {
    if (bgImageSrc) {
      const img = new window.Image()
      img.src = bgImageSrc
      img.crossOrigin = "anonymous"
      img.onload = () => setBgImage(img)
    }
  }, [bgImageSrc])

  // Fetch trending music
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch(
          `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=20&order=popularity_total`
        )
        const data = await res.json()
        setTracks(data.results)
        if (data.results.length > 0) setCurrentTrack(data.results[0])
      } catch (err) {
        console.error("Error loading music:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrending()
  }, [])

  // Search music
  const searchTracks = async (query) => {
    if (!query.trim()) {
      setLoading(true)
      try {
        const res = await fetch(
          `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=20&order=popularity_total`
        )
        const data = await res.json()
        setTracks(data.results)
      } catch (err) {
        console.error("Error loading trending:", err)
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=30&search=${encodeURIComponent(query)}&order=popularity_total`
      )
      const data = await res.json()
      setTracks(data.results)
    } catch (err) {
      console.error("Search error:", err)
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

  // Handle file upload
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

        const extractedColor = getAverageColor(img)
        setAutoColor(extractedColor)
        setBgColor(extractedColor)
      }
    }
    reader.readAsDataURL(file)
  }

  // Add text layer
  const handleAddText = () => {
    const newLayer = {
      id: Date.now(),
      type: "text",
      content: "Nhập text...",
      x: 100,
      y: 100,
      color: selectedColor,
      fontSize: 24,
      fontStyle: "bold"
    }
    setLayers((prev) => [...prev, newLayer])
    setSelectedLayerId(newLayer.id)
  }

  // Update text color for selected layer
  const handleUpdateTextColor = (color) => {
    if (selectedLayerId) {
      setLayers((prev) =>
        prev.map((l) =>
          l.id === selectedLayerId && l.type === "text" ? { ...l, color } : l
        )
      )
    }
    setSelectedColor(color)
  }

  // Add GIF/Sticker
  const handleSelectGif = (url) => {
    const newLayer = {
      id: Date.now(),
      type: "sticker",
      url,
      x: 60,
      y: 60
    }
    setLayers((prev) => [...prev, newLayer])
    setSelectedLayerId(newLayer.id)
  }

  // Delete layer
  const handleDeleteLayer = (layerId) => {
    setLayers((prev) => prev.filter((l) => l.id !== layerId))
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null)
    }
  }

  // Delete selected layer (keyboard shortcut)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLayerId) {
        e.preventDefault()
        handleDeleteLayer(selectedLayerId)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedLayerId])

  // Play/Pause music với loading state
  const handlePlay = async (track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlaying(false)
      setLoadingTrackId(null)
      return
    }

    if (currentTrack?.id === track.id && !isPlaying) {
      if (audioRef.current) {
        setLoadingTrackId(track.id)
        try {
          await audioRef.current.play()
          setIsPlaying(true)
        } catch (err) {
          console.error("Playback error:", err)
          toast.error("Không thể phát nhạc")
        } finally {
          setLoadingTrackId(null)
        }
      }
      return
    }

    setLoadingTrackId(track.id)
    if (audioRef.current) {
      audioRef.current.pause()
    }

    setCurrentTrack(track)
    setSelectedSong(track)
    setIsPlaying(false)

    const audio = new Audio(track.audio)
    audio.loop = true

    audio.addEventListener('canplaythrough', async () => {
      try {
        await audio.play()
        audioRef.current = audio
        setIsPlaying(true)
      } catch (err) {
        console.error("Playback error:", err)
        toast.error("Không thể phát nhạc")
      } finally {
        setLoadingTrackId(null)
      }
    }, { once: true })

    audio.addEventListener('error', () => {
      setLoadingTrackId(null)
      toast.error("Lỗi tải nhạc")
    })

    audio.load()
  }

  // Calculate scaled size
  const getScaledSize = () => {
    if (!imgSize.width || !imgSize.height) return { w: CANVAS_WIDTH, h: CANVAS_HEIGHT }
    const ratio = Math.min(CANVAS_WIDTH / imgSize.width, CANVAS_HEIGHT / imgSize.height)
    return { w: imgSize.width * ratio, h: imgSize.height * ratio }
  }

  const scaled = getScaledSize()

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  // Submit story
  const handleSubmit = async () => {
    if (!bgImageSrc) {
      toast.error("Vui lòng chọn ảnh trước khi tạo story.")
      return
    }

    try {
      if (audioRef.current) audioRef.current.pause()

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

      const formData = new FormData()
      formData.append("storyData", JSON.stringify(storyData))

      if (bgImageSrc.startsWith("data:image")) {
        const blob = await fetch(bgImageSrc).then((res) => res.blob())
        formData.append("file", blob, "background.jpg")
      }

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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 overflow-hidden">
      {/* Sidebar trái */}
      <aside className="w-100 bg-white border-r flex flex-col p-5 gap-4 overflow-y-auto">
        {/* Upload ảnh */}
        <div>
          <button
            onClick={() => fileInputRef.current.click()}
            className="flex items-center gap-2 w-full p-3 border rounded-lg hover:bg-gray-50 transition"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="font-medium">Chọn ảnh nền</span>
          </button>
        </div>

        {/* Chọn màu nền */}
        <div className="border rounded-lg p-4">
          <div className="text-sm font-medium mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Màu nền
          </div>

          {/* Màu tự động từ ảnh */}
          {autoColor && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-700 mb-2 font-medium">✨ Màu từ ảnh</div>
              <button
                onClick={() => setBgColor(autoColor)}
                className={`w-full h-10 rounded border-2 transition flex items-center justify-center ${
                  bgColor === autoColor ? "border-blue-500 scale-105" : "border-gray-300"
                }`}
                style={{ backgroundColor: autoColor }}
              >
                {bgColor === autoColor && (
                  <span className="text-white text-xs font-bold bg-black/30 px-2 py-1 rounded">
                    ✓ Đang dùng
                  </span>
                )}
              </button>
              <div className="text-xs text-center mt-1 font-mono text-gray-600">{autoColor}</div>
            </div>
          )}

          {/* Preset colors */}
          <div className="text-xs text-gray-500 mb-2">Màu có sẵn</div>
          <div className="grid grid-cols-7 gap-2 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                className={`w-8 h-8 rounded border-2 transition ${
                  bgColor === color ? "border-blue-500 scale-110" : "border-gray-300"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Custom color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full p-2 border rounded flex items-center justify-between hover:bg-gray-50">
                <span className="text-sm">Tùy chỉnh màu</span>
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: bgColor }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <HexColorPicker color={bgColor} onChange={setBgColor} />
              <div className="mt-2 text-center text-xs font-mono">{bgColor}</div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Search music */}
        <div className="text-sm font-medium text-gray-700">Nhạc mẫu</div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm bài hát..."
            className="pl-9 bg-muted"
          />
        </div>

        {/* Music list */}
        <div className="flex-1 space-y-2 overflow-y-auto h-56">
          {loading && <div className="text-center py-4 text-gray-500">Đang tải nhạc...</div>}
          {!loading && tracks.length === 0 && (
            <div className="text-center py-12 text-gray-500">Không tìm thấy bài hát nào.</div>
          )}
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => handlePlay(track)}
              disabled={loadingTrackId === track.id}
              className={`p-2 rounded flex justify-between items-center w-full text-left transition ${
                selectedSong?.id === track.id ? "bg-blue-50 border border-blue-200" : "bg-gray-50 hover:bg-gray-100"
              } ${loadingTrackId === track.id ? "opacity-70" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={track.album_image} alt={track.name} />
                  <AvatarFallback>{track.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{track.name}</div>
                  <div className="text-xs text-gray-500 truncate">{track.artist_name}</div>
                </div>
              </div>
              {loadingTrackId === track.id ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              ) : currentTrack?.id === track.id && isPlaying ? (
                <Pause className="h-5 w-5 text-blue-500" />
              ) : (
                <Play className="h-5 w-5 text-gray-600" />
              )}
            </button>
          ))}
        </div>

        {/* Submit button */}
        <Button
          disabled={!bgImageSrc}
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Chia sẻ tin
        </Button>
      </aside>

      {/* Canvas giữa */}
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center max-w-2xl">
          <Button onClick={handleAddText} size="sm" className="bg-emerald-500 hover:bg-emerald-600">
            <Type className="w-4 h-4 mr-1" /> Text
          </Button>
          <GifStickerPicker onSelect={handleSelectGif} />
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600">
                🎨 Màu chữ
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <HexColorPicker color={selectedColor} onChange={handleUpdateTextColor} />
              <div className="mt-2 text-center text-xs font-mono">{selectedColor}</div>
              {selectedLayerId && layers.find(l => l.id === selectedLayerId && l.type === "text") && (
                <div className="mt-2 text-xs text-blue-600 text-center">
                  ✓ Đang sửa màu text được chọn
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button onClick={() => setScale((s) => s + 0.1)} size="sm" variant="secondary">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} size="sm" variant="secondary">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button onClick={() => setRotation((r) => r + 10)} size="sm" variant="secondary">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setRotation((r) => r - 10)} size="sm" variant="secondary">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsFlipped(!isFlipped)} size="sm" variant="secondary">
            <FlipHorizontal className="w-4 h-4" />
          </Button>
          {selectedLayerId && (
            <Button
              onClick={() => handleDeleteLayer(selectedLayerId)}
              size="sm"
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Xóa
            </Button>
          )}
        </div>

        {/* Canvas */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700"
          style={{ backgroundColor: bgColor }}
        >
          {!bgImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10">
              <ImagePlus className="w-12 h-12 mb-2" />
              <p className="text-lg">Hãy chọn ảnh để bắt đầu</p>
            </div>
          )}
          <Stage
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={(e) => {
              // Click vào background → deselect
              if (e.target === e.target.getStage()) {
                setSelectedLayerId(null)
              }
            }}
          >
            <Layer>
              {bgImage && (
                <KonvaImage
                  image={bgImage}
                  x={bgPosition.x}
                  y={bgPosition.y}
                  offsetX={(scaled.w / 2) * scale}
                  offsetY={(scaled.h / 2) * scale}
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
                if (layer.type === "text") {
                  return (
                    <KonvaText
                      key={layer.id}
                      text={layer.content}
                      x={layer.x}
                      y={layer.y}
                      fill={layer.color}
                      fontSize={layer.fontSize || 24}
                      fontStyle={layer.fontStyle || "bold"}
                      draggable
                      onClick={() => {
                        setSelectedLayerId(layer.id)
                        setSelectedColor(layer.color)
                      }}
                      shadowColor={selectedLayerId === layer.id ? "#3b82f6" : "transparent"}
                      shadowBlur={selectedLayerId === layer.id ? 15 : 0}
                      shadowOpacity={selectedLayerId === layer.id ? 0.9 : 0}
                      shadowOffsetX={0}
                      shadowOffsetY={0}
                      onDblClick={() => {
                        const newText = prompt("Nhập nội dung:", layer.content)
                        if (newText) {
                          setLayers((prev) =>
                            prev.map((l) => (l.id === layer.id ? { ...l, content: newText } : l))
                          )
                        }
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
                }

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
                      onClick={() => setSelectedLayerId(layer.id)}
                      shadowColor={selectedLayerId === layer.id ? "#3b82f6" : "transparent"}
                      shadowBlur={selectedLayerId === layer.id ? 20 : 0}
                      shadowOpacity={selectedLayerId === layer.id ? 0.9 : 0}
                      shadowOffsetX={0}
                      shadowOffsetY={0}
                      scaleX={selectedLayerId === layer.id ? 1.05 : 1}
                      scaleY={selectedLayerId === layer.id ? 1.05 : 1}
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

        {/* Hint message */}
        {layers.length > 0 && (
          <div className="mt-3 text-sm text-gray-600 text-center">
            💡 Click text để chọn và đổi màu • Double click để sửa • Delete/Backspace để xóa
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>

      {/* Sidebar phải */}
      <aside className="w-60 bg-white border-l p-5 flex flex-col gap-4">
        {/* <div className="text-sm font-medium text-gray-700">Kiểu hiển thị nhạc</div> */}
        {/* <div className="flex flex-col gap-2">
          {["card", "bar", "minimal", "none"].map((s) => (
            <button
              key={s}
              onClick={() => setMusicStyle(s)}
              className={`py-2 px-3 rounded text-sm font-medium transition ${
                musicStyle === s ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {s === "card" ? "Thẻ" : s === "bar" ? "Thanh" : s === "minimal" ? "Tối giản" : "Ẩn nhạc"}
            </button>
          ))}
        </div> */}

        <div className="text-sm font-medium text-gray-700 mb-2">Layers ({layers.length})</div>


        {/* Layers list */}
        {layers.length > 0 && (
          <div className="mt-4 flex-1">
            {/* <div className="text-sm font-medium text-gray-700 mb-2">Layers ({layers.length})</div> */}
            <div className="space-y-1 overflow-y-auto">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                    selectedLayerId === layer.id ? "bg-blue-50 border border-blue-200" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {layer.type === "text" ? (
                      <>
                        <Type className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm truncate">{layer.content}</span>
                        <div
                          className="w-4 h-4 rounded border flex-shrink-0"
                          style={{ backgroundColor: layer.color }}
                          title={`Màu: ${layer.color}`}
                        />
                      </>
                    ) : (
                      <>
                        <img src={layer.url} className="w-6 h-6 object-cover rounded" alt="sticker" />
                        <span className="text-sm">Sticker</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteLayer(layer.id)
                    }}
                    className="p-1 hover:bg-red-100 rounded transition"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Audio */}
      <audio ref={audioRef} src={currentTrack?.audio || ""} />
    </div>
  )
}