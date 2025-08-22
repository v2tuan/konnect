import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

function ThemeToggle() {
  const [theme, setTheme] = useState(() => (
    typeof window !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"
  ))


  useEffect(() => {
    if (theme === "dark") 
      document.documentElement.classList.add("dark")
    else
      document.documentElement.classList.remove("dark")
  }, [theme])


  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme} className="rounded-xl">
      {theme === "dark" ? <span className="icon-[lucide--sun] w-5 h-5" /> : <span className="icon-[lucide--moon] w-5 h-5" />}
    </Button>
  )
}

export default ThemeToggle