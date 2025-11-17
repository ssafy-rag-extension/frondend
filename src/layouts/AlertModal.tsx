import React, { useEffect, useRef } from 'react';

export function AlertModal({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;

      if (modalRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="
        absolute right-0 mt-2 w-72 z-[999]
        bg-white rounded-xl shadow-lg border border-gray-200
        max-h-80 overflow-y-auto
      "
    >
      {children}
    </div>
  );
}
