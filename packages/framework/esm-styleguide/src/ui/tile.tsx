// Copié puis adapté de shadcn/ui (MIT, © 2023 shadcn) — https://github.com/shadcn-ui/ui (card.tsx, registre new-york-v4).
// Ce fichier appartient désormais à EGEN : le modifier librement. Avis de licence : THIRD_PARTY_NOTICES.md à la racine du dépôt.
import * as React from "react"
import { cn } from "./cn.js"

function Tile({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tile"
      className={cn(
        "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function TileHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tile-header"
      className={cn(
        "@container/tile-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=tile-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function TileTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tile-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function TileDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tile-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function TileAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tile-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function TileContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tile-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function TileFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tile-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Tile,
  TileHeader,
  TileFooter,
  TileTitle,
  TileAction,
  TileDescription,
  TileContent,
}
