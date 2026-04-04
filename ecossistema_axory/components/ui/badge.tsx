'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '@/utils/common';

export function Badge({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary',
        className,
      )}
      {...props}
    />
  );
}
