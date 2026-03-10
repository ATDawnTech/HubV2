import React, { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem, Autocomplete } from '@/components';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { FormProvider, useForm } from 'react-hook-form';

interface DefaultSettingsProps {
  value?: {
    startWhen: string;
    location?: string;
  };
  onChange?: (val: { startWhen: string; location?: string }) => void;
}

export default function DefaultSettings({ value, onChange }: DefaultSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [radioSelection, setRadioSelection] = useState(
    value?.startWhen === 'now' ? 'now' : 'custom'
  );
  const [days, setDays] = useState(value?.startWhen !== 'now' ? value?.startWhen || '7' : '7');
  const [countries, setCountries] = useState<{ value: string; code: string }[]>([
    { value: 'Australia', code: 'AU' },
    { value: 'Singapore', code: 'SG' },
    { value: 'India', code: 'IN' },
    { value: 'United States', code: 'US' },
    { value: 'Vietnam', code: 'VN' },
  ]);

  const location = value?.location || '';

  // Synchronize internal state with value prop
  useEffect(() => {
    if (value?.startWhen) {
      const selection = value.startWhen === 'now' ? 'now' : 'custom';
      setRadioSelection(selection);
      if (selection === 'custom') {
        setDays(value.startWhen);
      }
    }
  }, [value?.startWhen]);

  const handleStartWhenChange = (selection: string, daysVal: string) => {
    const finalStartWhen = selection === 'now' ? 'now' : daysVal;
    onChange?.({ ...value, startWhen: finalStartWhen, location });
  };

  const handleLocationChange = (val: string) => {
    onChange?.({ ...value, startWhen: value?.startWhen || 'now', location: val });
  };

  return (
    <Card className="mr-4">
      <CardHeader
        className="flex flex-row items-center justify-between cursor-pointer border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-500">settings_applications</span>
          <h3 className="font-bold text-lg">Default Settings</h3>
        </div>
        <div className="flex flex-col items-end">
          <button type="button">{isExpanded ? <ChevronDown /> : <ChevronRight />}</button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set the default behaviours for the template, HR admin can change the setting when
            starting to onboard new hires.
          </p>
          <div className="pt-2">
            <RadioGroup
              label="When should this workflow start?"
              value={radioSelection}
              onValueChange={(v) => {
                setRadioSelection(v);
                handleStartWhenChange(v, days);
              }}
            >
              <RadioGroupItem value="now">Immediately when HR admin starts onboarding</RadioGroupItem>
              <RadioGroupItem value="custom">
                <span>Custom Date:</span>
                <Input
                  type="number"
                  value={days}
                  className="w-20 h-8 px-2 py-1 mx-2"
                  onFocus={() => {
                    if (radioSelection !== 'custom') {
                      setRadioSelection('custom');
                      handleStartWhenChange('custom', days);
                    }
                  }}
                  onChange={(e) => {
                    const newDays = e.target.value;
                    setDays(newDays);
                    setRadioSelection('custom');
                    handleStartWhenChange('custom', newDays);
                  }}
                />
                <span>days before joining date</span>
              </RadioGroupItem>
            </RadioGroup>
          </div>
          <div className="pt-2 border-t border-border-light dark:border-border-dark">
            <div className="max-w-md space-y-2">
              <Autocomplete
                name="location"
                label="Location"
                placeholder="Select country"
                options={countries}
                value={location}
                onChange={handleLocationChange}
                filterOption={(inputValue, option) =>
                  String(option?.value ?? '')
                    .toUpperCase()
                    .indexOf(inputValue.toUpperCase()) !== -1
                }
              />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                If no location is selected, the template will apply to all employees.
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
