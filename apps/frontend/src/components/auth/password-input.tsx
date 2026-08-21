'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Password field with a show/hide toggle. Everything the plain Input
 *  accepts (invalid, autoComplete, onChange, ...) passes through. */
export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className={cn('relative', className)}>
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className="pr-11"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-ink-3 transition-colors duration-120 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" strokeWidth={2.25} />
          ) : (
            <Eye className="h-4 w-4" strokeWidth={2.25} />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
