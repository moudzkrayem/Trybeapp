"use client"

import Link from "next/link"
import { Calendar, MapPin, Users, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { CachedImage } from "@/components/ui/cached-image"
import { normalizeTrybe } from "@/lib/trybe-utils"

export interface Event {
  id: string
  organizerId?: string
  hostId?: string
  title?: string
  name?: string
  description?: string
  location?: string | any
  latitude?: number
  longitude?: number
  startTime?: string
  endTime?: string
  dateTime?: string
  eventPictureUrl?: string
  imageUrl?: string
  category?: string
  capacity?: number
  isPromoted?: boolean
  price?: number
  rsvpCount?: number
  attendeesCount?: number
  attendeeIds?: string[]
}

export function EventCard({ event: rawEvent }: { event: any }) {
  const firestore = useFirestore()
  const event = normalizeTrybe(rawEvent)
  
  const organizerId = event.organizerId || event.hostId
  const organizerRef = useMemoFirebase(() => {
    if (!firestore || !organizerId) return null
    return doc(firestore, "users", organizerId)
  }, [firestore, organizerId])
  const { data: organizer } = useDoc(organizerRef)

  const rsvpsRef = useMemoFirebase(() => {
    if (!firestore || !event.id) return null
    return collection(firestore, "events", event.id, "rsvps")
  }, [firestore, event.id])
  const { data: rsvps } = useCollection(rsvpsRef)

  let displayDate = event.startTime
  try {
    const d = new Date(event.startTime)
    if (!isNaN(d.getTime())) {
      displayDate = format(d, "EEE, MMM d, h:mm a")
    }
  } catch (e) {}

  const attendeeCount = rsvps?.length || event.attendeesCount || event.rsvpCount || 0
  const categoryLabel = (event.category || 'community').replace(/-/g, ' ')
  const hostDisplayName = organizer?.displayName || event.host?.name || "Trybe Member"
  const hostPhoto = organizer?.profilePictureUrl || event.host?.avatarUrl

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group overflow-hidden border-none glass hover:bg-secondary/40 transition-all duration-500 cursor-pointer h-full flex flex-col rounded-[2rem] shadow-lg hover:shadow-2xl hover:-translate-y-1">
        <div className="relative aspect-[16/10] overflow-hidden">
          <CachedImage 
            src={event.eventPictureUrl || "https://picsum.photos/seed/event/800/600"} 
            alt={event.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
            {event.isPromoted && (
              <Badge variant="outline" className="bg-black/60 backdrop-blur-md text-[#FFBF00] border-[#FFBF00]/60 font-black px-4 py-2 gap-2 shadow-xl text-[11px] uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 fill-[#FFBF00] text-[#FFBF00]" /> Promoted
              </Badge>
            )}
          </div>
        </div>
        
        <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <Badge variant="outline" className="border-white/10 bg-white/5 text-muted-foreground uppercase tracking-widest text-[11px] font-bold px-3 py-1">
              {categoryLabel}
            </Badge>
            <h3 className="text-2xl font-headline font-extrabold leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {event.title}
            </h3>
            
            <div className="space-y-3 text-muted-foreground">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary/60" />
                <span className="text-sm font-medium">{displayDate}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary/60" />
                <span className="text-sm font-medium truncate">{event.location}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary/60" />
                  <span className="text-sm font-medium">{attendeeCount} attending</span>
                </div>
                <Badge variant="outline" className={cn(
                  "uppercase tracking-widest text-[9px] font-black px-2.5 py-1",
                  (event.price || 0) === 0 
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" 
                    : "border-primary/20 bg-primary/10 text-primary"
                )}>
                  {(event.price || 0) === 0 ? "FREE" : `$${event.price}`}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-white/5">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/5">
                <AvatarImage src={hostPhoto} className="object-cover" />
                <AvatarFallback className="bg-secondary text-[12px]">{hostDisplayName?.[0] || 'T'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-foreground">
                  {hostDisplayName}
                </span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Host</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
