import { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: string;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonColor,
  isDanger = false,
}: ConfirmModalProps) {
  // Determine styles based on isDanger
  const buttonColor = confirmButtonColor || (isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#82c91e] hover:bg-[#6ba017] text-black');
  const iconBgColor = isDanger ? 'bg-red-900/30 border-red-700/50' : 'bg-[#82c91e]/10 border-[#82c91e]/20';
  const iconColor = isDanger ? 'text-red-400' : 'text-[#82c91e]';

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        className={cn(
          'bg-qimtek-bg-surface rounded-xl shadow-2xl border border-qimtek-border font-mono',
          'w-full max-w-md transform transition-all duration-300',
          'animate-scaleIn'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-qimtek-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-900/30 border border-red-700/50">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h3
              id="modal-title"
              className="text-lg sm:text-xl font-semibold text-qimtek-text"
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-qimtek-bg-secondary transition-colors duration-200 text-qimtek-text-secondary hover:text-qimtek-text touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <p
            id="modal-description"
            className="text-sm sm:text-base text-qimtek-text-secondary mb-6"
          >
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-3">
            <button
              onClick={onClose}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200',
                'border border-qimtek-border bg-qimtek-bg-secondary text-qimtek-text',
                'hover:bg-qimtek-tertiary-bg active:scale-95',
                'touch-manipulation min-h-[44px] text-sm sm:text-base'
              )}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200',
                buttonColor,
                'active:scale-95 shadow-lg hover:shadow-xl',
                'touch-manipulation min-h-[44px] text-sm sm:text-base'
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}