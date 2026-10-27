"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@/firebase"
import { cn } from "@/lib/utils"
import { 
  Compass, 
  ArrowRightLeft, 
  Map as MapIcon, 
  MessageSquare, 
  User as UserIcon 
} from "lucide-react"

const NAV_LINKS = [
  { label: "Home", href: "/feed", icon: Compass },
  { label: "Swipe", href: "/swipe", icon: ArrowRightLeft },
  { label: "Map", href: "/map", icon: MapIcon },
  { label: "Chats", href: "/chats", icon: MessageSquare },
  { label: "Profile", href: "/profile", icon: UserIcon },
]

export function Navbar() {
  const { user } = useUser()
  const pathname = usePathname()

  // Hide Navbar on the marketing landing page, focused creation/edit pages, and individual chat sessions
  const isChatSession = pathname?.includes("/events/") && pathname?.endsWith("/chat")
  const isHidden = pathname === "/" || pathname === "/create" || pathname?.includes("/edit") || isChatSession

  if (isHidden) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2.5rem)] max-w-2xl">
      <nav 
        aria-label="Primary navigation"
        className="bg-card/80 dark:bg-black/60 backdrop-blur-3xl border border-border dark:border-white/10 rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] px-6 h-20 flex items-center justify-around"
      >
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon
          
          const targetHref = (link.href === "/profile" && !user) ? "/auth" : link.href

          return (
            <Link 
              key={link.href} 
              href={targetHref}
              aria-label={`Go to ${link.label}`}
              className={cn(
                "flex items-center gap-3 font-black transition-all hover:text-primary relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full px-2",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-7 h-7 sm:w-6 sm:h-6 transition-transform group-hover:scale-110")} aria-hidden="true" />
              <span className="hidden sm:block text-[11px] uppercase tracking-[0.2em]">{link.label}</span>
              {isActive && (
                <span className="sr-only">(current page)</span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}