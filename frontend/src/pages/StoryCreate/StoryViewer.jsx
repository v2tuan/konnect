"use client"

import React, { useState, useRef } from "react"
import { Stage, Layer, Image as KonvaImage, Text as KonvaText } from "react-konva"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { HexColorPicker } from "react-colorful"
import {
  Upload, Type, Sticker, Music, Check, ZoomIn, ZoomOut,
  RotateCcw, RotateCw, FlipHorizontal
} from "lucide-react"
import useImage from "use-image"

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

export default function StoryEditor() {
  // Kích thước canvas 9:16 (405x720 cho màn hình hiển thị)
  const CANVAS_WIDTH = 405
  const CANVAS_HEIGHT = 720

  const [bgImageSrc, setBgImageSrc] = useState(null)
  const [bgColor, setBgColor] = useState("#000")
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
      { id: Date.now(), type: "text", content: "Nhập text...", x: 100, y: 100, color: selectedColor },
    ])
  }

  // 🖼️ Thêm sticker
  const handleAddSticker = () => {
    setLayers((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "sticker",
        url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
        x: 60,
        y: 60,
      },
    ])
  }

  // 🎵 Thêm nhạc
  const handleAddMusic = () => {
    setLayers((prev) => [
      ...prev,
      { id: Date.now(), type: "music", name: "Perfect - Ed Sheeran" },
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
        scaledSize: scaled,
      },
      layers,
      createdAt: new Date().toISOString(),
    }
    setStoryJSON(storyData)
    console.log("data story: ", storyData)
    setPreviewOpen(true)
  }

  // 🪞 Lật ảnh
  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  return (
    <div className="flex flex-col items-center p-6 bg-neutral-900 min-h-screen text-white">
      <h2 className="text-2xl font-bold mb-4">🎨 Facebook Story Editor (9:16)</h2>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4 justify-center max-w-2xl">
        <Button onClick={() => fileInputRef.current.click()} className="bg-blue-500 hover:bg-blue-600">
          <Upload className="w-4 h-4 mr-2" /> Ảnh nền
        </Button>
        <Button onClick={handleAddText} className="bg-emerald-500 hover:bg-emerald-600">
          <Type className="w-4 h-4 mr-2" /> Text
        </Button>
        <Button onClick={handleAddSticker} className="bg-pink-500 hover:bg-pink-600">
          <Sticker className="w-4 h-4 mr-2" /> Sticker
        </Button>
        <Button onClick={handleAddMusic} className="bg-indigo-500 hover:bg-indigo-600">
          <Music className="w-4 h-4 mr-2" /> Nhạc
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
      <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700" style={{ backgroundColor: bgColor }}>
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

      {layers.some((l) => l.type === "music") && (
        <div className="mt-4 bg-neutral-800 px-4 py-2 rounded-lg text-sm">
          🎵 Đang phát: {layers.find((l) => l.type === "music")?.name}
        </div>
      )}

      <Button onClick={handlePostStory} className="mt-6 bg-green-500 hover:bg-green-600 px-8 py-3 text-lg">
        <Check className="w-5 h-5 mr-2" /> Đăng Story
      </Button>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-neutral-900 text-white border border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle>📱 Xem trước Story</DialogTitle>
          </DialogHeader>
          {storyJSON && <StoryPreview story={storyJSON} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 🎥 Preview Story
function StoryPreview({ story }) {
  const CANVAS_WIDTH = 405
  const CANVAS_HEIGHT = 720
  const [bg] = useImage(story.background.image, "anonymous")
  const scaled = story.background.scaledSize

  return (
    <div className="flex flex-col items-center">
      <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ backgroundColor: story.background.color }}>
        <Layer>
          {bg && scaled && (
            <KonvaImage
              image={bg}
              x={story.background.position.x}
              y={story.background.position.y}
              offsetX={scaled.w / 2}
              offsetY={scaled.h / 2}
              width={scaled.w}
              height={scaled.h}
              scaleX={(story.background.flipped ? -1 : 1) * story.background.scale}
              scaleY={story.background.scale}
              rotation={story.background.rotation}
            />
          )}
          {story.layers.map((layer) => {
            if (layer.type === "text")
              return <KonvaText key={layer.id} text={layer.content} x={layer.x} y={layer.y} fill={layer.color} fontSize={24} fontStyle="bold" />
            if (layer.type === "sticker") {
              const img = new window.Image()
              img.src = layer.url
              return <KonvaImage key={layer.id} image={img} x={layer.x} y={layer.y} width={80} height={80} />
            }
            return null
          })}
        </Layer>
      </Stage>
      {story.layers.some((l) => l.type === "music") && (
        <div className="mt-3 text-sm text-gray-300">
          🎵 {story.layers.find((l) => l.type === "music")?.name}
        </div>
      )}
    </div>
  )
}