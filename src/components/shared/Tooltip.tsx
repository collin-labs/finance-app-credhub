import { useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 400 }: Props) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  function show() {
    timerRef.current = window.setTimeout(() => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let x = 0, y = 0;
      switch (position) {
        case 'top':    x = rect.left + rect.width / 2; y = rect.top - 8; break;
        case 'bottom': x = rect.left + rect.width / 2; y = rect.bottom + 8; break;
        case 'left':   x = rect.left - 8; y = rect.top + rect.height / 2; break;
        case 'right':  x = rect.right + 8; y = rect.top + rect.height / 2; break;
      }
      setCoords({ x, y });
      setVisible(true);
    }, delay);
  }

  function hide() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setVisible(false);
  }

  const transforms: Record<string, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  return (
    <>
      <div ref={triggerRef} onMouseEnter={show} onMouseLeave={hide} onClick={hide} className="inline-flex">
        {children}
      </div>
      {visible && content && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none animate-fade-in"
          style={{ left: coords.x, top: coords.y, transform: transforms[position] }}
        >
          <div className="relative bg-surface-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg max-w-xs whitespace-normal">
            {content}
            <div
              className="absolute w-2 h-2 bg-surface-900 rotate-45"
              style={
                position === 'top' ? { bottom: -4, left: '50%', marginLeft: -4 } :
                position === 'bottom' ? { top: -4, left: '50%', marginLeft: -4 } :
                position === 'left' ? { right: -4, top: '50%', marginTop: -4 } :
                { left: -4, top: '50%', marginTop: -4 }
              }
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
