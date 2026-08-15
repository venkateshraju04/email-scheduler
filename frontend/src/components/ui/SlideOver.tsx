import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const SlideOver: React.FC<SlideOverProps> = ({
  isOpen,
  onClose,
  title,
  children,
  headerActions,
}) => {
  // Prevent body scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl transform transition-transform duration-300 ease-in-out">
          <div className="flex h-full flex-col bg-white shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:ring-offset-2"
                  onClick={onClose}
                >
                  <span className="sr-only">Close panel</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
                <h2 className="text-lg font-medium text-gray-900">{title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {headerActions}
              </div>
            </div>

            {/* Content */}
            <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              {children}
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
