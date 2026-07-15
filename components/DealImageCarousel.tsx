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
      <div className="deal-image-carousel deal-image-carousel-stage deal-image-carousel-stage-size flex items-center justify-center rounded-2xl border px-6 text-center text-sm text-slate-500">
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
    <div className="deal-image-carousel grid grid-cols-[44px_minmax(0,1fr)] gap-2 overflow-hidden">
      {hasMultipleImages ? (
        <div className="deal-image-carousel-thumbs flex max-h-[336px] flex-col gap-2 overflow-y-auto">
          {images.map((image, index) => (
            <button
              key={`${image.slice(0, 32)}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`deal-image-carousel-thumb aspect-square min-h-11 w-full shrink-0 overflow-hidden rounded-md border bg-slate-50 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 ${
                index === activeIndex ? "border-slate-900 opacity-100" : "border-slate-200 opacity-45 hover:opacity-80"
              }`}
              aria-label={`Show deal photo ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <UserImage
                src={image}
                alt=""
                width={160}
                height={120}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      ) : (
        <div aria-hidden="true" />
      )}

      <div
        className="deal-image-carousel-stage deal-image-carousel-stage-size relative flex items-center justify-center"
      >
        <UserImage
          src={activeImage}
          alt={title}
          width={1200}
          height={900}
          loading="eager"
          decoding="async"
          sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(100vw - 5rem), 360px"
          className="deal-image-carousel-main-image rounded-2xl object-cover"
        />

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="deal-carousel-action absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-lg font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/25"
              aria-label="Previous deal photo"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={showNext}
              className="deal-carousel-action absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-lg font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/25"
              aria-label="Next deal photo"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm" aria-live="polite">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
