"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const slides = [
  {
    title: "Welcome to Konnect!",
    description:
      "Discover features that support working and chatting with family and friends, optimized for your computer.",
    image: "/welcome-1.png",
    subTitle: "More messaging, less typing",
    subDescription:
      "Use Quick Messages to save frequently used texts and send them instantly in any conversation."
  },
  {
    title: "Easy connection",
    description: "Easily connect with friends and colleagues right on your PC.",
    image: "/welcome-2.png",
    subTitle: "Work more efficiently",
    subDescription: "Take advantage of synchronization across multiple devices."
  }
]

export default function WelcomeScreen() {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const prevSlide = () => {
    setDirection(-1)
    setIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }

  const nextSlide = () => {
    setDirection(1)
    setIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
  }

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  }

  return (
    <div className="flex items-center justify-center h-screen bg-card">
      <Card className="w-[900px] shadow-none border-0 relative overflow-hidden">
        <CardContent className="flex flex-col items-center text-center gap-6 py-10">

          {/* Slide container */}
          <div className="relative w-full flex items-center justify-center min-h-[600px] overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={index}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                // Chuyển tiếp NHANH hơn:
                transition={{
                  x: { type: "spring", stiffness: 600, damping: 50 },
                  opacity: { duration: 0.05 }
                }}
                className="absolute flex flex-col items-center gap-6 w-full"
              >
                {/* Title & description */}
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    {slides[index].title}
                  </h1>
                  <p className="text-gray-500 max-w-xl mx-auto">
                    {slides[index].description}
                  </p>
                </div>

                {/* Image */}
                <img
                  src={slides[index].image}
                  alt="illustration"
                  className="w-80 h-80 object-contain"
                />

                {/* Sub title & description */}
                <div>
                  <h2 className="text-lg font-semibold mb-1">
                    {slides[index].subTitle}
                  </h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {slides[index].subDescription}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots indicator */}
          <div className="flex gap-2 mt-6">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === index ? "bg-blue-500" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </CardContent>

        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </Card>
    </div>
  )
}