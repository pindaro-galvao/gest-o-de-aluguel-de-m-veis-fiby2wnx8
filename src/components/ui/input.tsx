/* Input Component - A component that displays an input - from shadcn/ui (exposes Input) */
import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    // Regra do sistema LP MÓVEIS: todos os campos de texto livre são exibidos e digitados em MAIÚSCULO (uppercase).
    // Campos de senha, e-mail, number, date, time, file etc. permanecem com a caixa original.
    const isExcludedType =
      type === 'password' ||
      type === 'email' ||
      type === 'file' ||
      type === 'number' ||
      type === 'date' ||
      type === 'datetime-local' ||
      type === 'time' ||
      type === 'checkbox' ||
      type === 'radio' ||
      type === 'color'

    const shouldUppercase = !isExcludedType && !className?.includes('normal-case')

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          shouldUppercase && 'uppercase placeholder:normal-case',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
