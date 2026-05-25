import React from 'react';
import { ChevronDown, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Select ────────────────────────────────────────────────────────────────────

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ className, children, ...props }: SelectProps) => (
  <div className="relative w-full">
    <select
      {...props}
      className={cn(
        'w-full px-4 py-2 pr-9 bg-white border border-slate-200 rounded-xl text-sm text-slate-700',
        'appearance-none cursor-pointer outline-none',
        'transition-all duration-150 hover:border-slate-300 hover:shadow-sm',
        'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </select>
    <ChevronDown
      size={14}
      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
    />
  </div>
);

// ── DateInput ─────────────────────────────────────────────────────────────────

type DateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const DateInput = ({ className, ...props }: DateInputProps) => (
  <div className="relative w-full">
    <input
      type="date"
      {...props}
      className={cn(
        'w-full px-4 py-2 pr-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-700',
        'outline-none cursor-pointer',
        'transition-all duration-150 hover:border-slate-300 hover:shadow-sm',
        'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
        '[&::-webkit-calendar-picker-indicator]:opacity-0',
        '[&::-webkit-calendar-picker-indicator]:absolute',
        '[&::-webkit-calendar-picker-indicator]:inset-0',
        '[&::-webkit-calendar-picker-indicator]:w-full',
        '[&::-webkit-calendar-picker-indicator]:h-full',
        '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
        className
      )}
    />
    <CalendarDays
      size={14}
      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
    />
  </div>
);
