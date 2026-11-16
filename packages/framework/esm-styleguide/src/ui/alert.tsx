// Copié puis adapté de shadcn/ui (MIT, © 2023 shadcn) — https://github.com/shadcn-ui/ui (alert.tsx, registre new-york-v4).
// Ce fichier appartient désormais à EGEN : le modifier librement. Avis de licence : THIRD_PARTY_NOTICES.md à la racine du dépôt.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./cn.js"

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current",
        // Ajouts EGEN : les quatre états d'une notification (liseré coloré à gauche).
        info: "border-l-4 border-l-primary bg-card text-card-foreground [&>svg]:text-primary",
        success: "border-l-4 border-l-emerald-500 bg-card text-card-foreground [&>svg]:text-emerald-500",
        warning: "border-l-4 border-l-amber-500 bg-card text-card-foreground [&>svg]:text-amber-500",
        error: "border-l-4 border-l-destructive bg-card text-card-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
