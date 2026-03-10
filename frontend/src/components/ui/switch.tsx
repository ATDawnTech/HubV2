import * as React from 'react';
import { Switch as AntdSwitch, SwitchProps as AntdSwitchProps } from 'antd';
import { cn } from '@/lib/utils';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from './label';

export interface SwitchProps extends AntdSwitchProps {
  label?: string;
  name?: string;
}

const Switch = React.forwardRef<any, SwitchProps>(({ className, ...props }, ref) => {
  const formContext = useFormContext();
  const fieldName = props.name as string;

  // Function to render the Antd Switch with proper onChange handling
  const renderSwitch = (fieldProps?: any) => (
    <AntdSwitch
      className={cn('custom-antd-switch', className)}
      {...props}
      {...(fieldProps
        ? {
            checked: fieldProps.value,
            onChange: (checked, event) => {
              fieldProps.onChange(checked);
              props.onChange?.(checked, event);
            },
            onBlur: fieldProps.onBlur,
          }
        : {})}
      ref={ref}
    />
  );

  // If no form context or name, render a standard Antd Switch
  if (!formContext || !fieldName) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {renderSwitch()}
        {props.label && <Label className="cursor-pointer font-normal">{props.label}</Label>}
      </div>
    );
  }

  const { control } = formContext;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Controller control={control} name={fieldName} render={({ field }) => renderSwitch(field)} />
      {props.label && (
        <Label htmlFor={fieldName} className="cursor-pointer font-normal text-sm text-foreground">
          {props.label}
        </Label>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';

export { Switch };
export default Switch;
