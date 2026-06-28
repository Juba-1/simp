import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-500 focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-600/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 aria-invalid:border-rose-500 aria-invalid:ring-4 aria-invalid:ring-rose-500/20 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus-visible:border-indigo-500 dark:focus-visible:ring-indigo-500/30 dark:disabled:bg-slate-800",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
