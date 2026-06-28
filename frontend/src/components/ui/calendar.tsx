"use client"

import * as React from "react"
import { DayPicker, UI, DayFlag, SelectionState } from "react-day-picker"
import { ar, enUS } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import "react-day-picker/style.css"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import type { Locale } from "@/lib/i18n"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  uiLocale?: Locale
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  uiLocale = "en",
  dir,
  ...props
}: CalendarProps) {
  const dateFnsLocale = uiLocale === "ar" ? ar : enUS

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      dir={dir ?? (uiLocale === "ar" ? "rtl" : "ltr")}
      locale={dateFnsLocale}
      className={cn("rdp-root", className)}
      classNames={{
        [UI.Root]: "p-2",
        [UI.Months]: "flex flex-col gap-2",
        [UI.Month]: "flex flex-col gap-3",
        [UI.MonthCaption]: "flex justify-center pt-1 relative items-center w-full",
        [UI.CaptionLabel]: "text-sm font-semibold",
        [UI.Nav]: "flex items-center gap-1",
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "absolute start-1 size-7 bg-transparent p-0 opacity-80 hover:opacity-100"
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "absolute end-1 size-7 bg-transparent p-0 opacity-80 hover:opacity-100"
        ),
        [UI.MonthGrid]: "w-full border-collapse",
        [UI.Weekdays]: "flex",
        [UI.Weekday]: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
        [UI.Week]: "flex w-full mt-1",
        [UI.Day]: "relative p-0 text-center text-sm",
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-9 p-0 font-normal"
        ),
        [SelectionState.selected]: "bg-primary text-primary-foreground hover:bg-primary rounded-md",
        [DayFlag.today]: "bg-accent text-accent-foreground rounded-md",
        [DayFlag.outside]: "text-muted-foreground opacity-40",
        [DayFlag.disabled]: "text-muted-foreground opacity-30",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
