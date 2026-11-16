// Copié puis adapté de shadcn/ui (MIT, © 2023 shadcn) — https://github.com/shadcn-ui/ui (separator.tsx, registre new-york-v4).
// Ce fichier appartient désormais à EGEN : le modifier librement. Avis de licence : THIRD_PARTY_NOTICES.md à la racine du dépôt.
import * as React from "react"
import { cn } from "./cn.js"
import { Separator as SeparatorPrimitive } from "radix-ui"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
