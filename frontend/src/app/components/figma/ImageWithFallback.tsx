import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

const FALLBACK_IMAGES = [
  '/images/bag.png',
  '/images/item1.png',
  '/images/candle.png',
  '/images/item2.png',
  '/images/foot.png',
  '/images/shirt.png',
];

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [fallbackIndex, setFallbackIndex] = useState(-1)

  const handleError = () => {
    if (fallbackIndex < FALLBACK_IMAGES.length - 1) {
      setFallbackIndex((prev) => prev + 1)
    } else {
      setFallbackIndex(FALLBACK_IMAGES.length)
    }
  }

  const { src, alt, style, className, ...rest } = props

  const currentSrc =
    fallbackIndex === -1
      ? src
      : fallbackIndex < FALLBACK_IMAGES.length
      ? FALLBACK_IMAGES[fallbackIndex]
      : null

  if (!currentSrc) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
      </div>
    )
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  )
}
