import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/components/ui/utils';

interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function DatePickerInput({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Select date',
  className = '',
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      onChange(formattedDate);
      setOpen(false);
    }
  };

  const selectedDate = value ? new Date(value) : undefined;

  return (
    <div className="relative flex items-center gap-2">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-b print:border-gray-400 print:rounded-none disabled:bg-gray-100',
          className
        )}
        required={required}
        disabled={disabled}
      />
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors print:hidden"
              onClick={() => setOpen(!open)}
            >
              <CalendarIcon className="w-4 h-4 text-gray-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}