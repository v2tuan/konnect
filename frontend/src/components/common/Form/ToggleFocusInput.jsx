/* eslint-disable no-console */
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

/**
 * Trick UI: hiển thị như text bình thường, khi focus mới hiện style input.
 * Props:
 * - value: string
 * - onChangedValue: (v: string) => void
 * - inputFontSize: '16px' | ...
 * - ...props: các props khác truyền cho <Input />
 */
function ToggleFocusInput({ value, onChangedValue, inputFontSize = "16px", className = "", ...props }) {
  const [inputValue, setInputValue] = useState(value ?? "")

  // Đồng bộ khi prop value đổi từ bên ngoài
  useEffect(() => {
    setInputValue(value ?? "")
  }, [value])

  const triggerBlur = () => {
    const trimmed = (inputValue ?? "").trim()
    setInputValue(trimmed)

    // Không đổi hoặc rỗng => trả lại giá trị cũ, không gọi onChangedValue
    if (!trimmed || trimmed === (value ?? "")) {
      setInputValue(value ?? "")
      return
    }

    onChangedValue && onChangedValue(trimmed)
  }

  return (
    <Input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={triggerBlur}
      // Giữ bold + size như bản MUI
      style={{ fontSize: inputFontSize, fontWeight: 700 }}
      className={[
        // Thu gọn giống text: bỏ border, nền trong suốt
        "truncate px-1 bg-transparent border-transparent",
        // Khi hover vẫn không lộ border
        "hover:border-transparent",
        // Khi focus: hiện border + ring + nền (sáng/tối)
        "focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
        "focus:bg-white dark:focus:bg-slate-800",
        className
      ].join(" ")}
      {...props}
    />
  )
}

export default ToggleFocusInput
