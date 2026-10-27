"use client"

import Image from "next/image"
import Link from "next/link"
import { Calendar, MapPin, Zap, Edit3, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { normalizeTrybe } from "@/lib/trybe-utils"

export function ProfileEventCard({ event: rawEvent, showEdit = true }: { event: any, showEdit?: boolean }) {
  const event = normalizeTrybe(rawEvent)

  let displayDate = event.startTime
  try {
    const d = new Date(event.startTime)
    if (!isNaN(d.getTime())) {
      displayDate = format(d, "MMM d, yyyy")
    }
  } catch (e) {}

  return (
    <Card className="group overflow-hidden border border-white/5 bg-secondary/20 rounded-[2rem] h-full flex flex-col">
      <div className="relative aspect-video overflow-hidden">
        <Image 
          src={event.eventPictureUrl || "https://picsum.photos/seed/event/800/600"} 
          alt={event.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {event.isPromoted && (
          <div className="absolute top-3 left-3 z-10">
            <Zap className="w-5 h-5 text-[#FFBF00] fill-[#FFBF00] drop-shadow-md" />
          </div>
        )}
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-headline font-bold leading-tight truncate">
            {event.title}
          </h3>

          <div className="space-y-0.5 text-muted-foreground">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>{displayDate}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-2">
          {showEdit && (
            <Link href={`/events/${event.id}/edit`} className="flex-1">
              <Button variant="outline" className="w-full rounded-xl h-9 bg-secondary/30 border-white/10 gap-2 font-bold hover:bg-secondary/50 text-foreground text-xs">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </Button>
            </Link>
          )}
          <Link href={`/events/${event.id}`} className={cn("flex-1", !showEdit && "w-full")}>
            <Button variant="outline" className="w-full rounded-xl h-9 bg-secondary/30 border-white/10 gap-2 font-bold hover:bg-secondary/50 text-foreground text-xs">
              <Eye className="w-3.5 h-3.5" /> View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
