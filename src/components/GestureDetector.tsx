import React, { useRef } from 'react';
import { sounds } from '../services/soundEffects';

interface GestureDetectorProps {
  children: React.ReactNode;
  enabled: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: () => void;
  sensitivity?: number;
}

export const GestureDetector: React.FC<GestureDetectorProps> = ({
  children,
  enabled,
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  onDoubleTap,
  sensitivity = 75
}) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTapTime = useRef<number>(0);

  if (!enabled) {
    return <div className="w-full h-full flex flex-col min-h-0 flex-1">{children}</div>;
  }

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;

    // Detect double tap
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      if (onDoubleTap) {
        triggerHaptic();
        sounds.playTactileClick();
        onDoubleTap();
      }
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > sensitivity) {
      if (deltaX < 0 && onSwipeLeft) {
        triggerHaptic();
        sounds.playTactileClick();
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        triggerHaptic();
        sounds.playTactileClick();
        onSwipeRight();
      }
    }
    // Vertical swipe down (pull to refresh sync)
    else if (deltaY > sensitivity && Math.abs(deltaX) < sensitivity && onSwipeDown) {
      triggerHaptic();
      sounds.playSyncSuccess();
      onSwipeDown();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full flex flex-col min-h-0 flex-1 touch-pan-y"
    >
      {children}
    </div>
  );
};
