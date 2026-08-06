import * as React from 'react'
import { cn } from '@/lib/utils'

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="alert" className={cn('relative w-full rounded-lg border p-4', className)} {...props} />
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm', className)} {...props} />
}
