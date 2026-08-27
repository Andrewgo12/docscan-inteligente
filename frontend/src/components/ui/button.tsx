import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      default: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
      outline: 'border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200',
      secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
      ghost: 'hover:bg-slate-800 hover:text-slate-100 text-slate-300',
      destructive: 'bg-rose-600 text-white hover:bg-rose-700',
      link: 'text-indigo-400 underline-offset-4 hover:underline',
    };

    const sizes = {
      default: 'h-9 px-4 py-2 text-sm',
      sm: 'h-8 px-3 text-xs rounded-md',
      lg: 'h-10 px-6 text-base rounded-md',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
