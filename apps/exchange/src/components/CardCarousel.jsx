import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/*
  Horizontal card rail.

  Uses native scroll-snap, so touch and trackpad work without any JS. The
  arrows drive the same scroll for mouse users and hide at each end, so they
  never suggest cards that are not there. Children are wrapped rather than
  styled directly, which keeps the caller free to pass any card component.
*/
export default function CardCarousel({ children }) {
  const track = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd,   setAtEnd]   = useState(true);

  const items = React.Children.toArray(children);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, items.length]);

  const page = (dir) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  const arrow =
    'absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full ' +
    'bg-white shadow-md border border-hub-green/30 text-hub-green ' +
    'hover:bg-hub-green hover:text-white hover:border-hub-green transition-colors';

  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={measure}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div
            key={i}
            className="snap-start shrink-0 w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
          >
            {child}
          </div>
        ))}
      </div>

      {!atStart && (
        <button onClick={() => page(-1)} aria-label="Previous" className={`${arrow} -left-3`}>
          <ChevronLeft size={20} strokeWidth={3} />
        </button>
      )}
      {!atEnd && (
        <button onClick={() => page(1)} aria-label="Next" className={`${arrow} -right-3`}>
          <ChevronRight size={20} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
