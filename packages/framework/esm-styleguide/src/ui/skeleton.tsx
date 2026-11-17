// Copié puis adapté de shadcn/ui (MIT, © 2023 shadcn) — https://github.com/shadcn-ui/ui (skeleton.tsx, registre new-york-v4).
// Ce fichier appartient désormais à EGEN : le modifier librement. Avis de licence : THIRD_PARTY_NOTICES.md à la racine du dépôt.
import * as React from "react"
import { cn } from "./cn.js"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
