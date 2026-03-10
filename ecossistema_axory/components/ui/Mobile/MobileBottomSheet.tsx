import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function MobileBottomSheet({ isOpen, onClose, title, children }: MobileBottomSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black rounded-t-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto safe-area-bottom animate-slide-up">
        <div className="sticky top-0 bg-white dark:bg-black border-b border-[#E5E7EB] dark:border-[#262626] rounded-t-2xl">
          <div className="flex items-center justify-between px-4 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="px-4 py-4">
          {children}
        </div>
      </div>
    </>
  );
}
