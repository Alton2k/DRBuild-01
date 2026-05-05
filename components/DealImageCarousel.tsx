"use client";

import { useState } from "react";
import UserImage from "./UserImage";

interface DealImageCarouselProps {
  images: string[];
  title: string;
}

/**
 * Displays deal photos with simple previous/next controls.
 */
export default function DealImageCarousel({ images, title }: DealImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];
  const hasMultipleImages = images.length > 1;

  if (!activeImage) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
        No image submitted
      </div>
    );
  }

  const showPrevious = () => {
    setActiveIndex((index) => (index === 0 ? images.length - 1 : index - 1));
  };

  const showNext = () => {
    setActiveIndex((index) => (index === images.length - 1 ? 0 : index + 1));
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
      <div className="relative flex min-h-[320px] items-center justify-center">
        <UserImage
          src={activeImage}
          alt={title}
          className="h-full max-h-[520px] w-full object-contain p-6"
        />

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-lg font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950"
              aria-label="Previous deal photo"
            >
              {"<"}
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-lg font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950"
              aria-label="Next deal photo"
            >
              {">"}
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-white p-3">
          {images.map((image, index) => (
            <button
              key={`${image.slice(0, 32)}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border bg-slate-50 ${
                index === activeIndex ? "border-slate-900" : "border-slate-200"
              }`}
              aria-label={`Show deal photo ${index + 1}`}
            >
              <UserImage src={image} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
