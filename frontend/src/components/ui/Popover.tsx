import React, { useState, useRef, useEffect } from 'react';
import { cn } from './Button';

interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode | ((close: () => void) => React.ReactNode);
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({ trigger, content, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div className={cn("absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none", className)}>
          {typeof content === 'function' ? content(close) : content}
        </div>
      )}
    </div>
  );
};
