'use client';

import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, position = 'bottom', delay = 200 }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;
    let pos = position;

    // Calculate based on preferred position
    switch (position) {
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        if (top + 40 > window.innerHeight) pos = 'top';
        break;
      case 'top':
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        if (top - 40 < 0) pos = 'bottom';
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
        if (left - 80 < 0) pos = 'right';
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
        if (left + 80 > window.innerWidth) pos = 'left';
        break;
    }

    // Recalculate if position flipped
    if (pos !== position) {
      switch (pos) {
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2;
          break;
        case 'top':
          top = rect.top - 8;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 8;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 8;
          break;
      }
    }

    setActualPosition(pos);
    setCoords({ top, left });
  }, [position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setShow(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
    setActualPosition(position);
  };

  const getTransformStyle = () => {
    switch (actualPosition) {
      case 'top': return 'translateX(-50%) translateY(-100%)';
      case 'bottom': return 'translateX(-50%)';
      case 'left': return 'translateX(-100%) translateY(-50%)';
      case 'right': return 'translateY(-50%)';
    }
  };

  const tooltipElement = show && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className="fixed z-[9999] px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap pointer-events-none"
          style={{
            top: coords.top,
            left: coords.left,
            transform: getTransformStyle(),
          }}
        >
          {content}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tooltipElement}
    </div>
  );
}
