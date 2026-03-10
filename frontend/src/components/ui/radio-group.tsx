import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from './label';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & {
    name?: string;
    label?: string;
  }
>(({ className, name, label, ...props }, ref) => {
  const formContext = useFormContext();

  const renderRadioGroup = (fieldProps?: any) => (
    <RadioGroupPrimitive.Root
      className={cn('grid gap-2', className)}
      {...props}
      {...(fieldProps
        ? {
            value: fieldProps.value,
            onValueChange: (value) => {
              fieldProps.onChange(value);
              props.onValueChange?.(value);
            },
          }
        : {})}
      ref={ref}
    />
  );

  if (!formContext || !name) {
    return (
      <div className="space-y-3">
        {label && (
          <Label className="text-xs text-slate-500 uppercase tracking-wider">{label}</Label>
        )}
        {renderRadioGroup()}
      </div>
    );
  }

  const { control } = formContext;

  return (
    <div className="space-y-3">
      {label && <Label className="text-xs text-slate-500 uppercase tracking-wider">{label}</Label>}
      <Controller control={control} name={name} render={({ field }) => renderRadioGroup(field)} />
    </div>
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { children?: React.ReactNode }
>(({ className, children, id, ...props }, ref) => {
  const generatedId = React.useId();
  const itemId = id || generatedId;

  return (
    <label htmlFor={itemId} className="flex items-center gap-3 cursor-pointer group w-fit">
      <RadioGroupPrimitive.Item
        ref={ref}
        id={itemId}
        className={cn(
          'aspect-square h-5 w-5 rounded-full border border-border-light dark:border-border-dark bg-white dark:bg-slate-900 text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all data-[state=checked]:border-primary',
          className
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="h-2.5 w-2.5 fill-current text-current shadow-sm" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {children && (
        <span className="text-sm flex items-center flex-row gap-2 font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors select-none whitespace-nowrap">
          {children}
        </span>
      )}
    </label>
  );
});

RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
