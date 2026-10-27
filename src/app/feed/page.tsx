
"use client"

import { Navbar } from "@/components/layout/Navbar"
import { EventCard } from "@/components/events/EventCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, SlidersHorizontal, Plus, Zap, Info, Loader2, Star, Calendar } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, limit, orderBy } from "firebase/firestore"
import { useState, useEffect, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { isToday, isThisWeek, isThisMonth, parseISO, isAfter } from "date-fns"
import { cn } from "@/lib/utils"
import { imageCache } from "@/lib/image-cache"
import { normalizeTrybe } from "@/lib/trybe-utils"

const CATEGORIES = [
  { id: "sports-wellness", label: "🧘 Sports and Wellness" },
  { id: "outdoor-activities", label: "🏔️ Outdoor and Activities" },
  { id: "art-creativity", label: "🎨 Art and Creativity" },
  { id: "social-networking", label: "🤝 Social and Networking" },
  { id: "tech-innovation", label: "🚀 Tech and Innovation" },
  { id: "learning-growth", label: "📚 Learning and Growth" }
]

export default function FeedPage() {
  const firestore = useFirestore()
  const { isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [promotedApi, setPromotedApi] = useState<CarouselApi>()
  const [promotedCurrent, setPromotedCurrent] = useState(0)
  const [promotedCount, setPromotedCount] = useState(0)

  const [trendingApi, setTrendingApi] = useState<CarouselApi>()
  const [trendingCurrent, setTrendingCurrent] = useState(0)
  const [trendingCount, setTrendingCount] = useState(0)
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [maxDistance, setMaxDistance] = useState(50)
  const [maxPrice, setMaxPrice] = useState(200)
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!promotedApi) return
    const update = () => {
      setPromotedCount(promotedApi.scrollSnapList().length)
      setPromotedCurrent(promotedApi.selectedScrollSnap())
    }
    update()
    promotedApi.on("select", update)
    promotedApi.on("reInit", update)
  }, [promotedApi])

  useEffect(() => {
    if (!trendingApi) return
    const update = () => {
      setTrendingCount(trendingApi.scrollSnapList().length)
      setTrendingCurrent(trendingApi.selectedScrollSnap())
    }
    update()
    trendingApi.on("select", update)
    trendingApi.on("reInit", update)
  }, [trendingApi])

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'events'), orderBy('startTime', 'desc'), limit(100))
  }, [firestore])

  const { data: events, isLoading } = useCollection(eventsQuery)

  const normalizedEvents = useMemo(() => {
    if (!events) return []
    return events.map(normalizeTrybe)
  }, [events])

  useEffect(() => {
    if (normalizedEvents.length > 0) {
      const urls = normalizedEvents.map(e => e.eventPictureUrl).filter(Boolean)
      imageCache.preloadBatch(urls)
    }
  }, [normalizedEvents])

  const filteredEvents = useMemo(() => {
    if (!normalizedEvents || !mounted) return []
    const now = new Date()
    return normalizedEvents.filter(event => {
      const matchesSearch = !searchQuery || 
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesCategory = !selectedCategory || event.category === selectedCategory
      const matchesPrice = (event.price || 0) <= maxPrice
      
      let eventDate: Date = now
      let isNotExpired = true
      try {
        const rawDate = event.startTime || event.dateTime
        if (rawDate) {
          const parsed = new Date(rawDate)
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed
            const endParsed = new Date(event.endTime || rawDate)
            if (!isNaN(endParsed.getTime())) {
              isNotExpired = isAfter(endParsed, now) || isToday(endParsed)
            }
          }
        }
      } catch {
        isNotExpired = true
      }

      let matchesDate = true
      if (dateFilter === "today") matchesDate = isToday(eventDate)
      else if (dateFilter === "week") matchesDate = isThisWeek(eventDate)
      else if (dateFilter === "month") matchesDate = isThisMonth(eventDate)

      return matchesSearch && matchesCategory && matchesPrice && matchesDate && isNotExpired
    })
  }, [normalizedEvents, searchQuery, selectedCategory, maxPrice, dateFilter, mounted])

  const promotedEvents = useMemo(() => filteredEvents.filter(e => e.isPromoted), [filteredEvents])
  const trendingEvents = useMemo(() => filteredEvents.filter(e => !e.isPromoted).sort((a, b) => (b.rsvpCount || 0) - (a.rsvpCount || 0)).slice(0, 5), [filteredEvents])

  if (!mounted || isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Vibe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 space-y-10 pt-6">
        <section className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl max-w-6xl mx-auto border border-white/5">
          <Carousel setApi={setPromotedApi} className="w-full" opts={{ loop: true }}>
            <CarouselContent className="-ml-0">
              {promotedEvents.length > 0 ? promotedEvents.map((event, index) => (
                <CarouselItem key={event.id} className="pl-0">
                  <div className="relative aspect-[16/10] md:aspect-[21/8] w-full group">
                    <Image 
                      src={event.eventPictureUrl || "https://picsum.photos/seed/event/1200/600"} 
                      alt={event.title || 'Event'}
                      fill
                      className="object-cover"
                      priority={index === 0}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end max-w-2xl">
                      <div className="flex items-center gap-2 text-white font-bold text-[10px] mb-3 uppercase tracking-[0.2em]">
                        <Zap className="w-4 h-4 fill-[#FFBF00] text-[#FFBF00]" />
                        PROMOTED TRYBES
                      </div>
                      <h2 className="text-3xl md:text-5xl font-headline font-black text-white mb-3 leading-tight tracking-tight">
                        {event.title}
                      </h2>
                      <p className="text-white/80 text-sm mb-6 line-clamp-2 max-w-lg font-medium leading-relaxed">
                        {event.description}
                      </p>
                      <Link href={`/events/${event.id}`}>
                        <Button 
                          className="bg-white text-black hover:bg-white/90 rounded-2xl w-fit px-8 font-black gap-2 h-12 shadow-xl transition-transform hover:scale-105 text-[11px] uppercase tracking-widest"
                          aria-label={`Explore promoted trybe: ${event.title}`}
                        >
                          <Info className="w-4 h-4" />
                          Explore Trybe
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CarouselItem>
              )) : (
                <CarouselItem className="pl-0">
                   <div className="relative aspect-[16/10] md:aspect-[21/8] w-full bg-secondary/5 flex flex-col items-center justify-center text-center p-8 backdrop-blur-sm">
                       <Zap className="w-12 h-12 text-primary/30 mb-4" />
                       <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Launch your Trybe</h2>
                       <p className="text-muted-foreground max-xs mx-auto mb-8 text-xs font-medium uppercase tracking-widest">Be the spark that brings the community together.</p>
                       <Link href="/create">
                         <Button 
                            className="rounded-2xl px-10 h-12 font-black text-[11px] uppercase tracking-widest bg-primary text-black shadow-lg shadow-primary/20"
                            aria-label="Create your own trybe"
                         >
                           Create Now
                         </Button>
                       </Link>
                   </div>
                </CarouselItem>
              )}
            </CarouselContent>
            
            {promotedCount > 1 && (
              <div className="absolute bottom-6 left-8 md:left-12 flex gap-3 z-20">
                {Array.from({ length: promotedCount }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => promotedApi?.scrollTo(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className="group"
                  >
                    <span
                      className={cn(
                        "block h-1 rounded-full transition-all duration-500",
                        promotedCurrent === i ? "bg-white w-8" : "bg-white/40 w-3 hover:bg-white/60"
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </Carousel>
        </section>

        <div className="flex flex-col md:flex-row gap-4 items-center max-w-6xl mx-auto w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search trybes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-secondary/20 border-white/5 h-14 rounded-2xl text-[13px] font-bold focus-visible:ring-primary transition-all shadow-inner"
            />
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                className="h-14 px-8 rounded-2xl border-white/5 gap-3 font-black bg-secondary/10 hover:bg-secondary/20 text-[11px] w-full md:w-auto uppercase tracking-[0.2em] shadow-lg"
                aria-label="Filter events"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Refine
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-sm glass border-l border-white/10 p-0 flex flex-col h-full overflow-hidden">
              <SheetHeader className="p-8 pb-0 shrink-0">
                <SheetTitle className="text-2xl font-black uppercase tracking-tight">Filters</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 px-8">
                <div className="py-8 space-y-10">
                  <div className="space-y-5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Max Distance</Label>
                      <Badge variant="secondary" className="font-black text-[10px] px-3 py-1 rounded-lg">{maxDistance} km</Badge>
                    </div>
                    <Slider value={[maxDistance]} onValueChange={(v) => setMaxDistance(v[0])} max={100} step={5} />
                  </div>

                  <div className="space-y-5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Budget</Label>
                      <Badge variant="secondary" className="font-black text-[10px] px-3 py-1 rounded-lg">{maxPrice === 200 ? 'Any' : `$${maxPrice}`}</Badge>
                    </div>
                    <Slider value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} max={200} step={10} />
                  </div>

                  <div className="space-y-5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Vibe</Label>
                    <div className="flex flex-wrap gap-2.5">
                      {CATEGORIES.map(cat => (
                        <Badge 
                          key={cat.id}
                          variant={selectedCategory === cat.id ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer py-2.5 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-white/5 hover:border-primary",
                            selectedCategory === cat.id ? "bg-primary text-black" : "bg-white/5 text-muted-foreground"
                          )}
                          onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                        >
                          {cat.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">When</Label>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { id: "all", label: "Anytime" },
                        { id: "today", label: "Today" },
                        { id: "week", label: "This Week" },
                        { id: "month", label: "This Month" }
                      ].map(date => (
                        <Badge 
                          key={date.id}
                          variant={dateFilter === date.id ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer py-2.5 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-white/5 hover:border-primary",
                            dateFilter === date.id ? "bg-primary text-black" : "bg-white/5 text-muted-foreground"
                          )}
                          onClick={() => setDateFilter(date.id as any)}
                        >
                          {date.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <SheetFooter className="p-8 pt-4 glass-dark border-t border-white/10 shrink-0">
                <Button className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => {
                  setSelectedCategory(null); setMaxDistance(50); setMaxPrice(200); setDateFilter("all");
                }}>
                  Reset All
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Link href="/create" className="w-full md:w-auto">
            <Button 
              className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 font-black gap-2 w-full text-black shadow-xl text-[11px] uppercase tracking-widest transition-transform active:scale-95"
              aria-label="Create a new event"
            >
              <Plus className="w-5 h-5" />
              Create
            </Button>
          </Link>
        </div>

        <section className="space-y-8 pt-6 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-headline font-black tracking-tight">Discover Trybes</h2>
            <div className="h-1 flex-1 mx-6 bg-white/5 rounded-full hidden sm:block" />
            <Badge variant="outline" className="border-white/10 text-muted-foreground px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">Active Now</Badge>
          </div>
          {isLoading ? (
            <div className="py-24 flex flex-col items-center gap-3">
               <Loader2 className="animate-spin text-primary w-10 h-10" />
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scanning City...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event as any} />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 glass rounded-[3rem] border-dashed border-white/10 space-y-4">
              <Zap className="w-12 h-12 text-primary/10 mx-auto" />
              <p className="text-muted-foreground text-[12px] font-black uppercase tracking-[0.3em]">No trybes found</p>
            </div>
          )}
        </section>

        {trendingEvents.length > 0 && (
          <section className="space-y-8 pt-10 pb-20 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-headline font-black tracking-tight">Trending</h2>
              <Badge variant="outline" className="border-[#FFBF00]/30 text-[#FFBF00] px-5 py-2 rounded-full font-black uppercase tracking-widest text-[10px] bg-[#FFBF00]/5">Viral Energy</Badge>
            </div>
            
            <div className="relative w-full rounded-[3rem] overflow-hidden shadow-2xl border border-white/5">
              <Carousel setApi={setTrendingApi} className="w-full" opts={{ loop: true }}>
                <CarouselContent className="-ml-0">
                  {trendingEvents.map((event, index) => (
                    <CarouselItem key={event.id} className="pl-0">
                      <div className="relative aspect-[21/9] w-full group">
                        <Image 
                          src={event.eventPictureUrl || "https://picsum.photos/seed/trending/1200/600"} 
                          alt={event.title || 'Trending Event'} 
                          fill 
                          className="object-cover transition-transform duration-1000 group-hover:scale-105" 
                          priority={index === 0}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                        <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                          <div className="flex items-center gap-2 text-white font-bold text-[10px] mb-3 uppercase tracking-[0.3em]">
                            <Star className="w-5 h-5 fill-[#FFBF00] text-[#FFBF00]" />
                            HOT COMMUNITY
                          </div>
                          <h2 className="text-3xl md:text-6xl font-headline font-black text-white mb-6 leading-tight tracking-tight">
                            {event.title}
                          </h2>
                          <Link href={`/events/${event.id}`}>
                            <Button 
                              className="bg-white text-black hover:bg-white/90 rounded-2xl w-fit px-10 h-14 font-black text-[12px] uppercase tracking-widest shadow-2xl transition-transform hover:scale-105"
                              aria-label={`Join trending event: ${event.title}`}
                            >
                              Join the Vibe
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {trendingCount > 1 && (
                  <div className="absolute bottom-6 left-8 md:left-12 flex gap-3 z-20">
                    {Array.from({ length: trendingCount }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => trendingApi?.scrollTo(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        className="group"
                      >
                        <span
                          className={cn(
                            "block h-1 rounded-full transition-all duration-500",
                            trendingCurrent === i ? "bg-white w-8" : "bg-white/40 w-3 hover:bg-white/60"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </Carousel>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
