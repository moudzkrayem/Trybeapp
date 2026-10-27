
"use client"

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Zap, Loader2, Info, Compass, Plus, Heart, Map, MessageCircle, Coins, ChevronRight } from "lucide-react"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { isAfter, parseISO } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"

export default function LandingPage() {
  const firestore = useFirestore()
  const [mounted, setMounted] = useState(false)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!api) return
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  const promotedQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'events'), where('isPromoted', '==', true), limit(5))
  }, [firestore])

  const { data: rawPromotedEvents, isLoading } = useCollection(promotedQuery)

  const promotedEvents = useMemo(() => {
    if (!rawPromotedEvents || !mounted) return []
    const now = new Date()
    return rawPromotedEvents.filter(event => {
      const eventEndDate = parseISO(event.endTime || event.startTime)
      return isAfter(eventEndDate, now)
    })
  }, [rawPromotedEvents, mounted])

  if (!mounted) return null

  const HowItWorksItem = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <div className="flex gap-4 p-4 rounded-2xl bg-secondary/10 border border-white/5">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col font-body selection:bg-primary/30">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 max-w-6xl mx-auto w-full text-center space-y-12">
        <div className="space-y-6 max-w-4xl w-full flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-headline font-bold tracking-tighter leading-[1.1]">
            Try new, <span className="text-primary italic">Belong more</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-medium leading-relaxed max-w-sm mx-auto">
            Discover local events, join communities, and connect with people who share your passions.
          </p>

          <section className="w-full space-y-6 pt-8 pb-4">
            <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl max-w-6xl mx-auto border border-white/5 bg-secondary/5 group">
              {isLoading ? (
                <div className="aspect-[21/9] flex items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" aria-label="Loading events" />
                </div>
              ) : promotedEvents && promotedEvents.length > 0 ? (
                <div className="relative">
                  <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
                    <CarouselContent className="-ml-0">
                      {promotedEvents.map((event, index) => (
                        <CarouselItem key={event.id} className="pl-0 overflow-hidden">
                          <div className="relative aspect-[21/9] w-full overflow-hidden">
                            <Image 
                              src={event.eventPictureUrl || "https://picsum.photos/seed/event/1200/600"} 
                              alt={`Featured trybe: ${event.title || 'Event'}`} 
                              fill
                              className="object-cover"
                              priority={index === 0}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                            <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-end text-left max-w-3xl">
                              <div className="flex items-center gap-2 text-white font-bold text-[10px] mb-4 uppercase tracking-[0.3em]">
                                <Zap className="w-4 h-4 fill-[#FFBF00] text-[#FFBF00]" aria-hidden="true" />
                                Promoted Trybe
                              </div>
                              <h3 className="text-3xl md:text-6xl font-headline font-bold text-white mb-3 leading-tight tracking-tighter">{event.title}</h3>
                              <p className="text-white/80 line-clamp-2 text-sm md:text-base font-medium max-w-2xl">{event.description}</p>
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>

                  {count > 1 && (
                    <div className="absolute bottom-6 left-8 md:left-16 flex gap-3 z-20">
                      {Array.from({ length: count }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => api?.scrollTo(i)}
                          aria-label={`Go to slide ${i + 1}`}
                          className="group"
                        >
                          <span
                            className={cn(
                              "block h-1 rounded-full transition-all duration-500",
                              current === i ? "bg-white w-8" : "bg-white/40 w-3 hover:bg-white/60"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-[21/9] flex flex-col items-center justify-center text-center p-12 bg-secondary/5 backdrop-blur-sm">
                  <Zap className="w-12 h-12 text-primary/10 mb-4" aria-hidden="true" />
                  <h3 className="text-2xl font-bold mb-2 opacity-20 uppercase tracking-[0.2em]">Your Event Here</h3>
                  <p className="text-muted-foreground max-md mx-auto text-[10px] font-bold uppercase tracking-widest opacity-30 leading-relaxed">
                    The Billboard showcases the most vibrant communities in the city. <br />Join Trybe to feature your own.
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <Link href="/auth">
              <Button className="h-12 w-48 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold text-sm uppercase tracking-widest shadow-lg transition-all border-none" aria-label="Join Trybe to start connecting">
                Join Trybe
              </Button>
            </Link>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-12 w-48 rounded-xl gap-2 font-bold text-sm uppercase tracking-widest bg-white text-black hover:bg-white/90 border-none shadow-lg" aria-label="Learn how Trybe works">
                  <Info className="w-4 h-4" /> How it works
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-3xl border-white/10 rounded-[2rem] p-0 overflow-hidden">
                <ScrollArea className="max-h-[80vh]">
                  <div className="p-8 space-y-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-headline font-black uppercase tracking-tight">The Handbook</DialogTitle>
                      <DialogDescription className="text-sm font-medium uppercase tracking-widest text-primary">Everything you need to find your people.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <HowItWorksItem 
                        icon={Compass} 
                        title="Browse & Join" 
                        description="Explore the feed to find upcoming events. Click 'Secure My Spot' to join a community and unlock its location."
                      />
                      <HowItWorksItem 
                        icon={Plus} 
                        title="Lead a Trybe" 
                        description="Have a passion? Create your own Trybe. Use our AI tools to help generate catchy descriptions and relevant tags."
                      />
                      <HowItWorksItem 
                        icon={Heart} 
                        title="Swipe to Discover" 
                        description="Find your next adventure in a fun, fast-paced interface. Swipe right to join instantly, left to see the next vibe."
                      />
                      <HowItWorksItem 
                        icon={Map} 
                        title="Interactive Map" 
                        description="See what's happening around you. Geotagged events make it easy to find community nearby."
                      />
                      <HowItWorksItem 
                        icon={MessageCircle} 
                        title="Private Chat" 
                        description="Once you join a Trybe, you'll unlock a private chat with other members to coordinate and connect."
                      />
                      <HowItWorksItem 
                        icon={Coins} 
                        title="Passes System" 
                        description="Creating or promoting a Trybe uses Passes. You get a starter pack for free, and can replenish them in your profile."
                      />
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <div className="bg-primary/5 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="space-y-2 text-left">
                          <h4 className="font-black text-xs uppercase tracking-widest">Ready to start?</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">Join thousands of others building real community through shared experiences.</p>
                        </div>
                        <Link href="/auth" className="w-full md:w-auto">
                          <Button className="w-full md:w-auto rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest px-8 h-12 shadow-lg shadow-primary/20">
                            Get Started Now <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <footer className="pt-16 opacity-20 text-[9px] font-bold uppercase tracking-[0.5em]">
          Trybe © 2026 EXPLORE, CREATE, CONNECT
        </footer>
      </main>
    </div>
  )
}
