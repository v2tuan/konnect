"use client";

import React, { useState, useEffect } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Loader2, Image, Sticker } from "lucide-react";

const API_KEY = "eUQxiOvzso7kD13DB5Bx8cjqY6xrSGB5";
const gf = new GiphyFetch(API_KEY);

export default function GifStickerPicker({ onSelect, triggerButton }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("gifs");
  const [searchTerm, setSearchTerm] = useState("trending");
  const [gridKey, setGridKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setGridKey(prev => prev + 1);
  }, [mode, searchTerm]);

  const fetchGifs = async (offset) => {
    try {
      setIsLoading(true);
      const result = await gf.search(searchTerm, {
        offset,
        limit: 12,
        type: mode,
        rating: "g",
      });
      setIsLoading(false);
      return result;
    } catch (error) {
      console.error("Error fetching:", error);
      setIsLoading(false);
      return { data: [] };
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      setSearchTerm(query.trim());
    } else {
      setSearchTerm("trending");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelect = (gif, e) => {
    e.preventDefault();
    if (onSelect) {
      onSelect(gif.images.original.url);
    }
    setOpen(false); // Đóng modal sau khi chọn
  };

  const toggleMode = (newMode) => {
    setMode(newMode);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="bg-pink-500 hover:bg-pink-600">
            <Sticker className="w-4 h-4 mr-2" /> Sticker
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="w-[700px] h-[600px] overflow-hidden flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Tìm kiếm {mode === "gifs" ? "GIF" : "Sticker"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-hidden flex-1 mt-4">
          {/* Search Controls */}
          <div className="flex gap-2">
            <Input
              placeholder={`Tìm ${mode === "gifs" ? "GIF" : "sticker"}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading} size="icon">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === "gifs" ? "default" : "outline"}
              onClick={() => toggleMode("gifs")}
              className="flex-1"
              size="sm"
            >
              🎬 GIFs
            </Button>
            <Button
              variant={mode === "stickers" ? "default" : "outline"}
              onClick={() => toggleMode("stickers")}
              className="flex-1"
              size="sm"
            >
              ⭐ Stickers
            </Button>
          </div>

          {/* Current Search Info */}
          <div className="text-sm text-gray-600">
            {searchTerm === "trending" ? (
              <span>Xu hướng {mode === "gifs" ? "GIF" : "sticker"}</span>
            ) : (
              <span>Kết quả: <strong>{searchTerm}</strong></span>
            )}
          </div>

          {/* Grid Display */}
          <div className="w-full h-[380px] overflow-y-auto border rounded-lg bg-gray-50">
            <Grid
              key={gridKey}
              fetchGifs={fetchGifs}
              columns={3}
              gutter={8}
              width={425}
              noLink={true}
              onGifClick={handleSelect}
              hideAttribution={true}
            />
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 text-center">
            💡 Click vào {mode === "gifs" ? "GIF" : "sticker"} để chọn
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}