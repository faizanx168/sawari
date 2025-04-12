declare module 'react-day-picker' {
  import { ReactNode } from 'react';

  export interface DayPickerProps {
    mode?: 'single' | 'multiple' | 'range';
    selected?: Date | Date[] | { from: Date; to: Date };
    onSelect?: (date: Date | Date[] | { from: Date; to: Date } | undefined) => void;
    disabled?: Date[] | ((date: Date) => boolean);
    modifiers?: Record<string, (date: Date) => boolean>;
    modifiersStyles?: Record<string, React.CSSProperties>;
    modifiersClassNames?: Record<string, string>;
    showOutsideDays?: boolean;
    fixedWeeks?: boolean;
    showWeekNumber?: boolean;
    locale?: Locale;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    firstWeekContainsDate?: number;
    numberOfMonths?: number;
    pagedNavigation?: boolean;
    reverseMonths?: boolean;
    fromMonth?: Date;
    toMonth?: Date;
    fromYear?: number;
    toYear?: number;
    captionLayout?: 'buttons' | 'dropdown' | 'dropdown-buttons';
    classNames?: {
      months?: string;
      month?: string;
      caption?: string;
      caption_label?: string;
      nav?: string;
      nav_button?: string;
      nav_button_previous?: string;
      nav_button_next?: string;
      table?: string;
      head_row?: string;
      head_cell?: string;
      row?: string;
      cell?: string;
      day?: string;
      day_selected?: string;
      day_today?: string;
      day_outside?: string;
      day_disabled?: string;
      day_range_middle?: string;
      day_hidden?: string;
      day_range_end?: string;
    };
    components?: {
      IconLeft?: () => ReactNode;
      IconRight?: () => ReactNode;
      Caption?: (props: { displayMonth: Date }) => ReactNode;
    };
    styles?: {
      months?: React.CSSProperties;
      month?: React.CSSProperties;
      caption?: React.CSSProperties;
      caption_label?: React.CSSProperties;
      nav?: React.CSSProperties;
      nav_button?: React.CSSProperties;
      nav_button_previous?: React.CSSProperties;
      nav_button_next?: React.CSSProperties;
      table?: React.CSSProperties;
      head_row?: React.CSSProperties;
      head_cell?: React.CSSProperties;
      row?: React.CSSProperties;
      cell?: React.CSSProperties;
      day?: React.CSSProperties;
      day_selected?: React.CSSProperties;
      day_today?: React.CSSProperties;
      day_outside?: React.CSSProperties;
      day_disabled?: React.CSSProperties;
      day_range_middle?: React.CSSProperties;
      day_hidden?: React.CSSProperties;
      day_range_end?: React.CSSProperties;
    };
    [key: string]: unknown;
  }

  export const DayPicker: React.FC<DayPickerProps>;
} 