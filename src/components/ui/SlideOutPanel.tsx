import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SlideOutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
}

const widthClasses = {
  sm: 'w-[400px]',
  md: 'w-[480px]',
  lg: 'w-[600px]',
  xl: 'w-[800px]',
};

export function SlideOutPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 'md',
  children,
  footer,
}: SlideOutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      const previouslyFocused = document.activeElement as HTMLElement;

      // Focus the close button after animation starts
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = '';
        previouslyFocused?.focus();
      };
    }
  }, [isOpen]);

  // Handle tab key for focus trap
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (!isOpen || e.key !== 'Tab' || !panelRef.current) return;

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-out-title"
        className={`absolute right-0 top-0 h-full ${widthClasses[width]} bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl flex flex-col animate-slide-in-right`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] flex-shrink-0">
          <div>
            <h2 id="slide-out-title" className="text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--hover-overlay)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 p-4 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
