
"use client"

import { Navbar } from "@/components/layout/Navbar"
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, query, limit, doc, getDoc, increment } from "firebase/firestore"
import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { Heart, X, MapPin, Zap, Loader2, Sparkles, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { parseISO, isAfter } from "date-fns"
import Link from "next/link"
import { normalizeTrybe } from "@/lib/trybe-utils"

export default function SwipePage() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(new Set())
  const [isCheckingJoined, setIsCheckingJoined] = useState(true)

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'events'), limit(50))
  }, [firestore])

  const { data: allEvents, isLoading: eventsLoading } = useCollection(eventsQuery)

  useEffect(() => {
    async function checkJoinedStatus() {
      if (!firestore || !user || !allEvents) {
        if (!eventsLoading) setIsCheckingJoined(false)
        return
      }
      
      setIsCheckingJoined(true)
      const joined = new Set<string>()
      
      // Efficiently check RSVP status for the current batch of events
      const checks = allEvents.map(async (event) => {
        const rsvpId = `${user.uid}_${event.id}`
        const rsvpRef = doc(firestore, `events/${event.id}/rsvps`, rsvpId)
        const snap = await getDoc(rsvpRef)
        if (snap.exists()) {
          joined.add(event.id)
        }
      })

      await Promise.all(checks)
      setJoinedEventIds(joined)
      setIsCheckingJoined(false)
    }
    checkJoinedStatus()
  }, [firestore, user, allEvents, eventsLoading])

  const filterableEvents = useMemo(() => {
    if (!allEvents) return []
    const now = new Date()
    return allEvents
      .map(normalizeTrybe)
      .filter(e => {
        const isJoined = joinedEventIds.has(e.id)
        let isNotExpired = true
        try {
          const rawEnd = e.endTime || e.startTime || e.dateTime
          if (rawEnd) {
            const eventEndDate = new Date(rawEnd)
            if (!isNaN(eventEndDate.getTime())) {
              isNotExpired = isAfter(eventEndDate, now) || (eventEndDate.toDateString() === now.toDateString())
            }
          }
        } catch {}
        // Hide if already joined OR expired
        return !isJoined && isNotExpired
      })
  }, [allEvents, joinedEventIds])

  const handleSwipeRight = (event: any) => {
    if (!user || !firestore) return
    
    const rsvpId = `${user.uid}_${event.id}`
    const rsvpRef = doc(firestore, `events/${event.id}/rsvps`, rsvpId)
    
    setDocumentNonBlocking(rsvpRef, {
      id: rsvpId,
      eventId: event.id,
      userId: user.uid,
      rsvpTime: new Date().toISOString(),
      status: "going"
    }, { merge: true })

    updateDocumentNonBlocking(doc(firestore, "events", event.id), {
      rsvpCount: increment(1)
    })

    toast({
      title: "Joined Trybe!",
      description: `You're in for ${event.title}`,
      className: "glass-dark border-primary/50"
    })
    
    setJoinedEventIds(prev => new Set(prev).add(event.id))
    setCurrentIndex(prev => prev + 1)
  }

  const handleSwipeLeft = () => {
    setCurrentIndex(prev => prev + 1)
  }

  const isLoading = eventsLoading || isCheckingJoined

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>

  const currentEvent = filterableEvents?.[currentIndex]

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden font-body">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-4 pb-48">
        <div className="relative w-full max-w-[320px] aspect-[3/4.2] perspective-1000">
          <AnimatePresence mode="popLayout">
            {currentEvent ? (
              <SwipeCard 
                key={currentEvent.id} 
                event={currentEvent} 
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={() => handleSwipeRight(currentEvent)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 glass rounded-[2.5rem] border-dashed border-white/10">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 opacity-30">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-black mb-2 uppercase tracking-tight">Feed Refreshed</h2>
                <p className="text-muted-foreground mb-8 text-[10px] font-medium uppercase tracking-widest max-w-[200px] leading-relaxed">You've explored all active trybes in your radius.</p>
                <div className="flex flex-col gap-3 w-full max-w-[180px]">
                  <Button onClick={() => setCurrentIndex(0)} variant="outline" className="rounded-xl h-10 px-8 font-black text-[10px] uppercase tracking-widest border-white/10">Re-scan Area</Button>
                  <Link href="/feed" className="w-full">
                    <Button className="w-full rounded-xl h-10 gap-2 font-black text-[10px] uppercase tracking-widest bg-white text-black hover:bg-white/90">
                      <Compass className="w-3.5 h-3.5" /> Discovery Feed
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {currentEvent && (
          <div className="flex gap-8 mt-10 relative z-10">
            <Button 
              size="icon" 
              variant="outline" 
              onClick={handleSwipeLeft}
              className="w-16 h-16 rounded-full border-white/10 bg-secondary/20 hover:bg-destructive/10 hover:text-destructive transition-all shadow-xl active:scale-90"
            >
              <X className="w-7 h-7" />
            </Button>
            <Button 
              size="icon" 
              onClick={() => handleSwipeRight(currentEvent)}
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/40 transition-all hover:scale-110 active:scale-90"
            >
              <Heart className="w-7 h-7 fill-current" />
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function SwipeCard({ event, onSwipeLeft, onSwipeRight }: any) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-30, 30])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])

  const handleDragEnd = (e: any, info: any) => {
    if (info.offset.x > 100) onSwipeRight()
    else if (info.offset.x < -100) onSwipeLeft()
  }

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl glass border-white/10">
        <Image 
          src={event.eventPictureUrl || "https://picsum.photos/seed/event/600/800"} 
          alt={event.title}
          fill
          className="object-cover pointer-events-none"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3 pointer-events-none">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground uppercase tracking-[0.2em] text-[8px] font-black px-2.5 py-1">
              {(event.category || 'community').replace(/-/g, ' ')}
            </Badge>
            {event.isPromoted && <Zap className="w-3.5 h-3.5 text-[#FFBF00] fill-[#FFBF00]" />}
          </div>
          <h2 className="text-xl font-black text-white leading-tight">{event.title}</h2>
          <div className="flex items-center gap-1.5 text-white/80">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">{(event.location || 'Local Venue').split(',')[0]}</span>
          </div>
          <p className="text-white/60 text-[11px] line-clamp-2 leading-relaxed font-medium">
            {event.description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
