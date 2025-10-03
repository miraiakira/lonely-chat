'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    if (open) {
      document.addEventListener('keydown', handleEscape);
      // 锁定滚动并为 body 添加右侧内边距，避免因滚动条消失导致的页面抖动
      document.body.style.overflow = 'hidden';
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // 恢复之前的样式
      document.body.style.overflow = prevOverflow || '';
      document.body.style.paddingRight = prevPaddingRight || '';
    };
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (open) {
      setMounted(false)
      const id = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(id)
    } else {
      setMounted(false)
    }
  }, [open])

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className={`relative z-50 transition-all duration-300 ease-out will-change-transform ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-lg w-full max-w-[800px] mx-4 max-h-[90vh] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function DialogHeader({ children, className = '' }: DialogHeaderProps) {
  return (
    <div className={`flex items-center justify-between p-6 border-b border-border ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({ children }: DialogTitleProps) {
  return (
    <h2 className="text-lg font-semibold text-foreground">
      {children}
    </h2>
  );
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClose}
      className="h-8 w-8 p-0"
    >
      <X className="h-4 w-4" />
    </Button>
  );
}