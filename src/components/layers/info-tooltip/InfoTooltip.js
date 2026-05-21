'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TOOLTIP_DATA } from './tooltipData';

export default function InfoTooltip({ id }) {
  const data = TOOLTIP_DATA[id];
  if (!data) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Set mounted state for server-side rendering safety
  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Update bubble positioning coordinates dynamically
  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        // Align vertically to the middle of the [i] icon
        top: rect.top + rect.height / 2 + window.scrollY,
        // Position it 12px to the left of the [i] icon
        left: rect.left - 12,
      });
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    updateCoords();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Small delay to allow smoother mouse movement
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOpen) {
      setIsOpen(false);
    } else {
      updateCoords();
      setIsOpen(true);
    }
  };

  // Close the tooltip when clicking anywhere outside of it
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isOpen && 
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target) &&
        triggerRef.current && 
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick, { capture: true });
    // Also listen to map panning/zooming or window resizing to reposition or close
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords);

    return () => {
      document.removeEventListener('click', handleOutsideClick, { capture: true });
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
    };
  }, [isOpen]);

  // Prevent Leaflet map interactions when clicking/dragging on the tooltip itself
  const stopPropagation = (e) => {
    e.stopPropagation();
    // Native event propagation block is crucial for Leaflet
    if (e.nativeEvent) {
      e.nativeEvent.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  // Tooltip content component
  const TooltipContent = (
    <div
      ref={tooltipRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onDoubleClick={stopPropagation}
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transform: 'translate(-100%, -50%)',
      }}
      className={`
        z-[9999] pointer-events-auto
        w-72 max-w-xs p-4 rounded-2xl
        bg-slate-950/95 backdrop-blur-md border border-white/10
        shadow-2xl shadow-slate-950/40 text-left
        transition-all duration-200 ease-out
        ${isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-2 pointer-events-none'}
      `}
    >
      {/* Small triangle arrow on the right side pointing to [i] */}
      <div 
        className="absolute top-1/2 -right-1.5 w-3 h-3 bg-slate-950/95 border-r border-t border-white/10" 
        style={{
          transform: 'translateY(-50%) rotate(45deg)',
        }}
      />
      
      {/* Header with Title and Type Badge */}
      <div className="flex flex-col gap-1.5 mb-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white leading-tight">
            {data.title}
          </h4>
          {data.badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0">
              {data.badge}
            </span>
          )}
        </div>
      </div>
      
      {/* Description Content */}
      <p className="text-xs text-slate-300 leading-relaxed font-normal">
        {data.desc}
      </p>
    </div>
  );

  return (
    <>
      {/* Information Icon Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`
          flex-shrink-0 w-5 h-5 rounded-full
          flex items-center justify-center
          text-[10px] font-bold border font-serif cursor-pointer
          transition-all duration-200 ml-auto select-none
          ${isOpen 
            ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/20 scale-105' 
            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 hover:scale-105'}
        `}
        title="點擊或懸停查看圖層詳細說明"
        aria-label={`查看${data.title}說明`}
      >
        i
      </button>

      {/* Render bubble to document.body to fully bypass any overflow:hidden boundaries */}
      {mounted && isOpen && createPortal(TooltipContent, document.body)}
    </>
  );
}
