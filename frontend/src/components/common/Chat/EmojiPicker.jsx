import { useState } from 'react';
import { Button } from '@/components/ui/button';

const emojiCategories = {
  'Gần đây': ['😊', '😂', '❤️', '👍', '🎉', '😍', '😭', '🤔'],
  'Cảm xúc': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺'],
  'Con người': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Động vật': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥'],
  'Đồ ăn': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔'],
  'Hoạt động': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋'],
  'Du lịch': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬'],
  'Đồ vật': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠']
};

export function EmojiPicker({ onEmojiSelect }) {
  const [selectedCategory, setSelectedCategory] = useState('Gần đây');

  return (
    <div className="bg-card border border-border rounded-lg shadow-strong p-4 w-80 max-h-96">
      {/* Category Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-2">
        {Object.keys(emojiCategories).map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="text-xs whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {emojiCategories[selectedCategory].map((emoji, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={() => onEmojiSelect(emoji)}
            className="w-8 h-8 p-0 text-lg hover:bg-primary/10 transition-colors"
          >
            {emoji}
          </Button>
        ))}
      </div>

      {/* Frequently Used */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Thường dùng:</p>
        <div className="flex gap-1">
          {['😊', '👍', '❤️', '😂', '🎉'].map((emoji, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => onEmojiSelect(emoji)}
              className="w-8 h-8 p-0 text-lg hover:bg-primary/10 transition-colors"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}