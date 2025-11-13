'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselSlide {
  id: number;
  image: string;
}

interface CarouselProps {
  slides: CarouselSlide[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function Carousel({ slides, autoPlay = true, autoPlayInterval = 5000 }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? slides.length - 1 : prevIndex - 1
    );
  }, [slides.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === slides.length - 1 ? 0 : prevIndex + 1
    );
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (!autoPlay || isHovered) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isHovered, goToNext]);

  if (!slides || slides.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl group bg-slate-100 dark:bg-slate-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ aspectRatio: '867/1156' }}
    >
      {/* Slides */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === currentIndex
                ? 'opacity-100 translate-x-0'
                : index < currentIndex
                ? 'opacity-0 -translate-x-full'
                : 'opacity-0 translate-x-full'
            }`}
          >
            {/* Image */}
            <img
              src={slide.image}
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Previous Button */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 backdrop-blur-sm text-slate-900 dark:text-white rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Next Button */}
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 backdrop-blur-sm text-slate-900 dark:text-white rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? 'w-8 h-2 bg-primary-600 dark:bg-primary-400'
                : 'w-2 h-2 bg-slate-400 dark:bg-slate-500 hover:bg-slate-600 dark:hover:bg-slate-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
