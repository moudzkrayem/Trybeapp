
"use client"

import { Navbar } from "@/components/layout/Navbar"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, limit } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
import { MapPin, Search, Loader2, List, Map as MapIcon, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { parseISO, isAfter } from "date-fns"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Loader } from "@googlemaps/js-api-loader"
import { normalizeTrybe } from "@/lib/trybe-utils"

const CATEGORY_EMOJIS: Record<string, string> = {
  "sports-wellness": "🧘",
  "outdoor-activities": "🏔️",
  "art-creativity": "🎨",
  "social-networking": "🤝",
  "tech-innovation": "🚀",
  "learning-growth": "📚"
}

const MAP_OPTIONS: google.maps.MapOptions = {
  center: { lat: 40.7128, lng: -74.0060 },
  zoom: 12,
  mapId: "DEMO_MAP_ID",
  styles: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  ],
  disableDefaultUI: true,
  zoomControl: true,
}

export default function MapPage() {
  const firestore = useFirestore()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "map">("list")
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMap = useRef<google.maps.Map | null>(null)
  const markers = useRef<any[]>([])

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'events'), limit(50))
  }, [firestore])

  const { data: allEvents, isLoading } = useCollection(eventsQuery)

  const filteredEvents = useMemo(() => {
    if (!allEvents) return []
    const now = new Date()
    return allEvents
      .map(normalizeTrybe)
      .filter(e => {
        const matchesSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.location?.toLowerCase().includes(search.toLowerCase())
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
        return matchesSearch && isNotExpired
      })
  }, [allEvents, search])

  const selectedEvent = useMemo(() => filteredEvents?.find(e => e.id === selectedId), [filteredEvents, selectedId])

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCA72Typh7SHsafWahTNidRJnCeMuCy5XA",
      version: "weekly",
      libraries: ["marker"],
    })

    loader.load().then(() => {
      if (mapRef.current && !googleMap.current) {
        googleMap.current = new google.maps.Map(mapRef.current, MAP_OPTIONS)
        setMapLoaded(true)
      }
    }).catch((err) => {
      console.warn("Google Maps could not be loaded:", err)
    })
  }, [])

  useEffect(() => {
    if (!mapLoaded || !googleMap.current) return

    markers.current.forEach(m => {
      if (m.map !== undefined) {
        m.map = null
      } else if (typeof m.setMap === "function") {
        m.setMap(null)
      }
    })
    markers.current = []

    const bounds = new google.maps.LatLngBounds()
    let hasValidCoords = false

    filteredEvents.forEach(event => {
      if (event.latitude && event.longitude) {
        const position = { lat: event.latitude, lng: event.longitude }
        const emoji = CATEGORY_EMOJIS[event.category] || '📍'
        const isSelected = selectedId === event.id

        if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
          const pin = document.createElement("div")
          pin.className = `flex items-center justify-center w-11 h-11 rounded-full shadow-2xl transition-transform duration-300 cursor-pointer ${
            isSelected
              ? "bg-primary text-black border-2 border-white scale-125 ring-4 ring-primary/40 shadow-primary/50"
              : "bg-[#1A1A1A] text-white border-2 border-[#333333] hover:scale-110"
          }`
          pin.style.fontSize = "18px"
          pin.innerHTML = `<span>${emoji}</span>`

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map: googleMap.current,
            position,
            title: event.title,
            content: pin,
            zIndex: isSelected ? 1000 : 1,
          })

          marker.addListener("click", () => setSelectedId(event.id))
          markers.current.push(marker)
        } else {
          const marker = new google.maps.Marker({
            position,
            map: googleMap.current,
            title: event.title,
            label: { text: emoji, fontSize: "18px" },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: isSelected ? "#FF7F50" : "#1A1A1A",
              fillOpacity: 1,
              strokeColor: isSelected ? "#FFFFFF" : "#333333",
              strokeWeight: 2,
              scale: 22,
              labelOrigin: new google.maps.Point(0, 0),
            },
            zIndex: isSelected ? 1000 : 1,
          })

          marker.addListener("click", () => setSelectedId(event.id))
          markers.current.push(marker)
        }

        bounds.extend(position)
        hasValidCoords = true
      }
    })

    if (hasValidCoords && !selectedId) {
      googleMap.current.fitBounds(bounds)
    }
  }, [filteredEvents, mapLoaded, selectedId])

  useEffect(() => {
    if (selectedEvent && googleMap.current && selectedEvent.latitude && selectedEvent.longitude) {
      googleMap.current.panTo({ lat: selectedEvent.latitude, lng: selectedEvent.longitude })
      googleMap.current.setZoom(15)
    }
  }, [selectedEvent])

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden font-body">
      <Navbar />
      
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-card/40 backdrop-blur-xl shrink-0">
        <h1 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Nearby
        </h1>
        <div className="flex bg-secondary/20 rounded-xl p-1">
          <button onClick={() => setView("list")} className={cn("p-2 rounded-lg transition-all", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setView("map")} className={cn("p-2 rounded-lg transition-all", view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden">
        <div className={cn("w-full md:w-[320px] lg:w-[400px] flex flex-col border-r border-white/5 bg-secondary/5 h-full transition-all", view === "map" ? "hidden md:flex" : "flex")}>
          <div className="p-6 space-y-4 shrink-0">
            <h1 className="hidden md:flex text-xl font-headline font-black items-center gap-3">
              <MapPin className="text-primary w-6 h-6" />
              Nearby Trybes
            </h1>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search areas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 bg-secondary/20 border-white/5 h-12 rounded-xl text-sm font-bold shadow-inner" />
            </div>
          </div>
          
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3 pb-32">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map(event => (
                  <Card key={event.id} onClick={() => { setSelectedId(event.id); if (window.innerWidth < 768) setView("map") }} className={cn("p-3 cursor-pointer transition-all border-white/5 rounded-2xl border bg-secondary/10 hover:bg-secondary/20 shadow-sm", selectedId === event.id && "bg-primary/5 border-primary/30")}>
                    <div className="flex gap-4">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10">
                        <Image src={event.eventPictureUrl || 'https://picsum.photos/seed/event/200/200'} alt="" fill className="object-cover" sizes="56px" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{CATEGORY_EMOJIS[event.category] || '📍'}</span>
                          <h3 className="font-bold truncate text-[14px]">{event.title}</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate font-black uppercase tracking-widest">{event.location}</p>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-20 glass rounded-[2rem] border-dashed border-white/10">
                  <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">No areas found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className={cn("flex-1 relative bg-black overflow-hidden transition-all", view === "list" ? "hidden md:flex" : "flex")}>
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />
          
          {selectedEvent && (
            <div className="absolute bottom-32 left-6 right-6 flex justify-center z-20">
              <Card className="max-w-md w-full p-4 bg-background/90 backdrop-blur-2xl border-white/10 shadow-2xl rounded-[2.5rem] flex gap-5 border">
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                  <Image src={selectedEvent.eventPictureUrl || 'https://picsum.photos/seed/event/300/300'} alt="" fill className="object-cover" sizes="112px" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 space-y-3 flex flex-col justify-center">
                  <div>
                    <Badge className="bg-primary/10 text-primary border border-primary/20 mb-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      {(selectedEvent.category || 'community').replace(/-/g, ' ')}
                    </Badge>
                    <h2 className="text-[16px] font-black truncate leading-tight">{selectedEvent.title}</h2>
                    <p className="text-muted-foreground text-[10px] flex items-center gap-2 mt-1 font-black uppercase tracking-widest">
                      <MapPin className="w-3 h-3 text-primary" /> {(selectedEvent.location || 'Local Venue').split(',')[0]}
                    </p>
                  </div>
                  <Link href={`/events/${selectedEvent.id}`}>
                    <Button className="w-full rounded-xl h-10 text-[11px] font-black uppercase tracking-widest gap-2 bg-primary hover:bg-primary/90">
                      <Eye className="w-4 h-4" /> Explore Trybe
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
