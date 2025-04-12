"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/app/lib/utils"
import { Button } from "@/app/components/ui/button"
import { Calendar } from "@/app/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover"

interface DatePickerProps {
  date: Date | null
  onDateChange: (date: Date | null) => void
  className?: string
}

export function DatePicker({ date, onDateChange, className }: DatePickerProps) {
  const handleSelect = (date: Date | Date[] | { from: Date; to: Date } | undefined) => {
    if (!date) {
      onDateChange(null);
    } else if (date instanceof Date) {
      onDateChange(date);
    } else if (Array.isArray(date)) {
      onDateChange(date[0] || null);
    } else {
      onDateChange(date.from);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
} 