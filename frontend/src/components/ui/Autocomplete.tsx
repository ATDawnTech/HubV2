import * as React from 'react';
import { AutoComplete as AntdAutoComplete, AutoCompleteProps } from 'antd';
import { cn } from '@/lib/utils';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from './label';
import { ChevronDown } from 'lucide-react';

export interface AutocompleteProps extends AutoCompleteProps {
  label?: string;
  name?: string;
}

const Autocomplete = React.forwardRef<any, AutocompleteProps>(({ className, ...props }, ref) => {
  const formContext = useFormContext();
  const fieldName = props.name as string;

  if (!formContext || !fieldName) {
    return <AntdAutoComplete className={cn('w-full', className)} ref={ref} {...props} />;
  }

  const { control, formState } = formContext;
  const error = formState.errors[fieldName];
  const options = props.options || [];

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldName}>{props.label}</Label>
      <Controller
        control={control}
        name={fieldName}
        render={({ field }) => {
          const selectedOption = options.find((opt: any) => opt.value === field.value);
          const displayValue = selectedOption
            ? (selectedOption.label ?? selectedOption.value)
            : field.value;

          return (
            <div className="w-full">
              <AntdAutoComplete
                className={cn('shadcn-autocomplete', className)}
                status={error ? 'error' : ''}
                suffixIcon={<ChevronDown className="h-4 w-4 opacity-50" />}
                getPopupContainer={(trigger) => trigger.parentElement}
                {...props}
                {...field}
                value={displayValue}
                ref={ref}
                onSelect={(value, option: any) => {
                  field.onChange(value);
                  props.onSelect?.(value, option);
                }}
                onChange={(value) => {
                  field.onChange(value);
                  props.onChange?.(value, {} as any);
                }}
                onBlur={(e) => {
                  const currentValue = field.value;
                  const hasLabels = options.some((opt: any) => opt.label !== undefined);
                  const isValid = options.some(
                    (opt: any) => opt.value === currentValue || opt.label === currentValue
                  );

                  if (hasLabels && !isValid && currentValue) {
                    field.onChange('');
                    props.onChange?.('', {} as any);
                  }
                  field.onBlur();
                  props.onBlur?.(e);
                }}
              />
              {error?.message && (
                <p className="text-red-500 text-sm mt-1">{error.message as string}</p>
              )}
            </div>
          );
        }}
      />
    </div>
  );
});

Autocomplete.displayName = 'Autocomplete';

export default Autocomplete;
