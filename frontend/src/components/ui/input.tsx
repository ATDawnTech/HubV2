import * as React from 'react';

import { cn } from '@/lib/utils';
import { useFormContext, Controller } from 'react-hook-form';

interface InputProps extends Omit<React.ComponentProps<'input'>, 'prefix'> {
  suffix?: React.ReactNode;
  startIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, suffix, startIcon, ...props }, ref) => {
    const formContext = useFormContext();
    const fieldName = props.name as string;

    const inputClasses = cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      startIcon && 'pl-10',
      suffix && 'pr-10',
      className
    );

    const renderStartIcon = () => {
      if (!startIcon) return null;
      return (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none select-none">
          {startIcon}
        </div>
      );
    };

    const renderSuffix = () => {
      if (!suffix) return null;
      return (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
          {suffix}
        </div>
      );
    };

    // If no form context, render input without form control
    if (!formContext || !fieldName) {
      return (
        <div className="relative flex items-center w-full">
          {renderStartIcon()}
          <input type={type} className={inputClasses} ref={ref} {...props} />
          {renderSuffix()}
        </div>
      );
    }

    const { control, formState } = formContext;

    return (
      <Controller
        control={control}
        name={fieldName}
        render={({ field: { ref: fieldRef, ...field } }) => (
          <div className="w-full">
            <div className="relative flex items-center">
              {renderStartIcon()}
              <input
                type={type}
                className={inputClasses}
                {...props}
                {...field}
                ref={(e) => {
                  fieldRef(e);
                  if (typeof ref === 'function') ref(e);
                  else if (ref) ref.current = e;
                }}
              />
              {renderSuffix()}
            </div>
            {formState.errors[fieldName]?.message && (
              <p className="text-red-500 text-sm mt-1">
                {formState.errors[fieldName]?.message as string}
              </p>
            )}
          </div>
        )}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
