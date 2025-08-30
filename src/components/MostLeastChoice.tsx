import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MostLeastChoiceProps {
  options: string[];
  mostSelection?: string;
  leastSelection?: string;
  onSelectionChange: (most: string | undefined, least: string | undefined) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export const MostLeastChoice: React.FC<MostLeastChoiceProps> = ({
  options,
  mostSelection,
  leastSelection,
  onSelectionChange,
  onSubmit,
  disabled = false
}) => {
  const handleMostChange = (value: string) => {
    // If selecting the same option as least, clear least selection
    const newLeast = value === leastSelection ? undefined : leastSelection;
    onSelectionChange(value, newLeast);
  };

  const handleLeastChange = (value: string) => {
    // If selecting the same option as most, clear most selection
    const newMost = value === mostSelection ? undefined : mostSelection;
    onSelectionChange(newMost, value);
  };

  const canSubmit = mostSelection && leastSelection && mostSelection !== leastSelection;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-text-secondary">
          Select the option that is <span className="text-emerald-600 font-semibold">MOST</span> like you 
          and the option that is <span className="text-rose-600 font-semibold">LEAST</span> like you
        </p>
        <div className="flex items-center justify-center gap-8 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-100 border-2 border-emerald-600 rounded-full"></div>
            <span>Most like me</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-100 border-2 border-rose-600 rounded-full"></div>
            <span>Least like me</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {options.map((option, index) => {
          const isMostSelected = mostSelection === option;
          const isLeastSelected = leastSelection === option;
          
          return (
            <div
              key={index}
              className={cn(
                "border rounded-lg p-4 transition-all duration-200",
                isMostSelected && "border-emerald-500 bg-emerald-50",
                isLeastSelected && "border-rose-500 bg-rose-50",
                !isMostSelected && !isLeastSelected && "border-border bg-background hover:border-primary/20"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex gap-3 pt-1">
                  {/* Most Selection */}
                  <RadioGroup
                    value={mostSelection || ''}
                    onValueChange={handleMostChange}
                    disabled={disabled}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={option} 
                        id={`most-${index}`}
                        className={cn(
                          "border-emerald-600 text-emerald-600",
                          isMostSelected && "bg-emerald-100"
                        )}
                      />
                      <Label 
                        htmlFor={`most-${index}`} 
                        className="text-xs text-emerald-700 font-medium cursor-pointer"
                      >
                        Most
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Least Selection */}
                  <RadioGroup
                    value={leastSelection || ''}
                    onValueChange={handleLeastChange}
                    disabled={disabled}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={option} 
                        id={`least-${index}`}
                        className={cn(
                          "border-rose-600 text-rose-600",
                          isLeastSelected && "bg-rose-100"
                        )}
                      />
                      <Label 
                        htmlFor={`least-${index}`} 
                        className="text-xs text-rose-700 font-medium cursor-pointer"
                      >
                        Least
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex-1">
                  <p className={cn(
                    "text-sm leading-relaxed transition-colors",
                    isMostSelected && "text-emerald-800 font-medium",
                    isLeastSelected && "text-rose-800 font-medium",
                    !isMostSelected && !isLeastSelected && "text-text-primary"
                  )}>
                    {option}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!canSubmit && (mostSelection || leastSelection) && (
        <div className="text-center">
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Please select both a "Most" and "Least" option to continue
          </p>
        </div>
      )}

      <div className="text-center pt-4">
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || disabled}
          className="px-8 py-2"
        >
          Submit Response
        </Button>
      </div>
    </div>
  );
};