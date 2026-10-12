'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
  delay?: number; // in ms
  duration?: number; // in ms
  threshold?: number;
  distance?: number; // in px
}

export default function ScrollReveal({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = 700,
  threshold = 0.15,
  distance = 32,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Bidirectional observer: triggers both on entering and leaving the viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  const getTransformStyle = () => {
    if (isVisible) return 'translate3d(0, 0, 0)';
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}px, 0)`;
      case 'down':
        return `translate3d(0, -${distance}px, 0)`;
      case 'left':
        return `translate3d(-${distance}px, 0, 0)`;
      case 'right':
        return `translate3d(${distance}px, 0, 0)`;
      case 'fade':
      default:
        return 'translate3d(0, 0, 0)';
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransformStyle(),
        transitionProperty: 'opacity, transform',
        transitionDuration: isVisible ? `${duration}ms` : '500ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: isVisible ? `${delay}ms` : '0ms',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
