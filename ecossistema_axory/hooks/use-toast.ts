'use client';

import { toast as sonnerToast } from 'sonner';

type ToastVariant = 'default' | 'destructive';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  return {
    toast: ({ title, description, variant = 'default' }: ToastOptions) => {
      const message = title || description || (variant === 'destructive' ? 'Erro' : 'Sucesso');

      if (variant === 'destructive') {
        sonnerToast.error(message, {
          description: description && description !== title ? description : undefined,
        });
        return;
      }

      sonnerToast(message, {
        description: description && description !== title ? description : undefined,
      });
    },
  };
}
