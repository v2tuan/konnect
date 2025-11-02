"use client"

import React, { useState, useRef } from "react"
import { Stage, Layer, Image as KonvaImage, Text as KonvaText } from "react-konva"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { HexColorPicker } from "react-colorful"
import { Upload, Type, Sticker, Music, Check } from "lucide-react"

// Component chính
export default function StoryEditor() {
  const [bgImage, setBgImage] = useState(null)
  const [layers, setLayers] = useState([])
  const [selectedColor, setSelectedColor] = useState("#ffffff")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [storyJSON, setStoryJSON] = useState(null)
  const fileInputRef = useRef(null)

  // 🖼️ Thêm ảnh nền
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.src = reader.result
      img.onload = () => setBgImage(img)
    }
    reader.readAsDataURL(file)
  }

  // ➕ Thêm Text
  const handleAddText = () => {
    setLayers([
      ...layers,
      {
        id: Date.now(),
        type: "text",
        content: "Nhập text...",
        x: 100,
        y: 100,
        color: selectedColor,
      },
    ])
  }

  // ➕ Thêm Sticker
  const handleAddSticker = () => {
    setLayers([
      ...layers,
      {
        id: Date.now(),
        type: "sticker",
        url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
        x: 50,
        y: 50,
      },
    ])
  }

  // ➕ Thêm Nhạc
  const handleAddMusic = () => {
    setLayers([
      ...layers,
      {
        id: Date.now(),
        type: "music",
        name: "Perfect - Ed Sheeran",
      },
    ])
  }

  // ✅ Khi nhấn "Đăng"
  const handlePostStory = () => {
    const storyData = {
      id: Date.now(),
      background: bgImage ? "[uploaded image]" : null,
      layers,
      createdAt: new Date().toISOString(),
    }
    setStoryJSON(storyData)
    setPreviewOpen(true)
  }

  return (
    <div className="flex flex-col items-center p-6 bg-neutral-900 min-h-screen text-white">
      <h2 className="text-2xl font-bold mb-4">🎨 Trình tạo Story Demo</h2>

      {/* Thanh công cụ */}
      <div className="flex gap-3 mb-4">
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
      </div>

      {/* Khung tạo story */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-700">
        <Stage width={300} height={500} className="bg-black">
          <Layer>
            {bgImage && <KonvaImage image={bgImage} width={300} height={500} />}
            {layers.map((layer) => {
              if (layer.type === "text")
                return (
                  <KonvaText
                    key={layer.id}
                    text={layer.content}
                    x={layer.x}
                    y={layer.y}
                    fill={layer.color}
                    fontSize={22}
                    draggable
                    onDblClick={(e) => {
                      const newText = prompt("Nhập nội dung mới:", layer.content)
                      if (newText) {
                        setLayers(layers.map((l) => (l.id === layer.id ? { ...l, content: newText } : l)))
                      }
                    }}
                    onDragEnd={(e) => {
                      const newLayers = layers.map((l) =>
                        l.id === layer.id ? { ...l, x: e.target.x(), y: e.target.y() } : l
                      )
                      setLayers(newLayers)
                    }}
                  />
                )

              if (layer.type === "sticker")
                return (
                  <KonvaImage
                    key={layer.id}
                    image={(() => {
                      const img = new window.Image()
                      img.src = layer.url
                      return img
                    })()}
                    x={layer.x}
                    y={layer.y}
                    width={80}
                    height={80}
                    draggable
                    onDragEnd={(e) => {
                      const newLayers = layers.map((l) =>
                        l.id === layer.id ? { ...l, x: e.target.x(), y: e.target.y() } : l
                      )
                      setLayers(newLayers)
                    }}
                  />
                )
              return null
            })}
          </Layer>
        </Stage>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {/* Hiển thị nhạc */}
      {layers.some((l) => l.type === "music") && (
        <div className="mt-4 bg-neutral-800 px-4 py-2 rounded-lg text-sm">
          🎵 Đang phát: {layers.find((l) => l.type === "music")?.name}
        </div>
      )}

      {/* Nút đăng */}
      <Button onClick={handlePostStory} className="mt-6 bg-green-500 hover:bg-green-600">
        <Check className="w-4 h-4 mr-2" /> Đăng Story
      </Button>

      {/* 🪞 Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-neutral-900 text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle>📱 Xem trước Story</DialogTitle>
          </DialogHeader>
          {storyJSON && <StoryPreview story={storyJSON} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 🎥 Component hiển thị preview từ JSON
function StoryPreview({ story }) {
  return (
    <div className="flex flex-col items-center">
      <Stage width={300} height={500} className="bg-black">
        <Layer>
          {story.background && (
            <KonvaImage
              image={(() => {
                const img = new window.Image()
                img.src = "https://picsum.photos/300/500?blur=2" // fake image
                return img
              })()}
              width={300}
              height={500}
            />
          )}
          {story.layers.map((layer) => {
            if (layer.type === "text")
              return (
                <KonvaText
                  key={layer.id}
                  text={layer.content}
                  x={layer.x}
                  y={layer.y}
                  fill={layer.color}
                  fontSize={22}
                />
              )
            if (layer.type === "sticker")
              return (
                <KonvaImage
                  key={layer.id}
                  image={(() => {
                    const img = new window.Image()
                    img.src = layer.url
                    return img
                  })()}
                  x={layer.x}
                  y={layer.y}
                  width={80}
                  height={80}
                />
              )
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
