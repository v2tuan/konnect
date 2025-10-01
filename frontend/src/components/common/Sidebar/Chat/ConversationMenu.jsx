import { MoreHorizontal, Pin, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const ConversationMenu = ({ conversationId, onDelete, onPin, isPinned = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMenuClick = (e) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handleAction = (action, e) => {
    e.stopPropagation()
    setIsOpen(false)

    if (action === 'delete') {
      onDelete(conversationId)
    } else if (action === 'pin') {
      onPin(conversationId)
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleMenuClick}
        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 opacity-0 group-hover:opacity-100"
      >
        <MoreHorizontal size={16} className="text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-48"
        >
          <button
            onClick={(e) => handleAction('pin', e)}
            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Pin size={14} />
            {isPinned ? 'Unpin conversation' : 'Pin conversation'}
          </button>

          <button
            onClick={(e) => handleAction('delete', e)}
            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
          >
            <Trash2 size={14} />
            Delete conversation
          </button>
        </div>
      )}
    </div>
  )
}

export default ConversationMenu