
"use client"

import { use, useEffect, useState, useMemo } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, query, where } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Loader2, Calendar, User as UserIcon, Sparkles, Camera } from "lucide-react"
import { ProfileEventCard } from "@/components/profile/ProfileEventCard"
import Image from "next/image"
import { isAfter, parseISO } from "date-fns"

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const firestore = useFirestore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !id) return null
    return doc(firestore, "users", id)
  }, [firestore, id])

  const { data: profile, isLoading: isProfileLoading } = useDoc(userDocRef)

  const organizedEventsQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null
    return query(collection(firestore, "events"), where("organizerId", "==", id))
  }, [firestore, id])

  const { data: rawEvents, isLoading: isEventsLoading } = useCollection(organizedEventsQuery)

  const organizedEvents = useMemo(() => {
    if (!rawEvents || !mounted) return []
    const now = new Date()
    return rawEvents.filter(event => {
      const eventEndDate = parseISO(event.endTime || event.startTime)
      return isAfter(eventEndDate, now)
    })
  }, [rawEvents, mounted])

  if (!mounted || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">User not found.</p>
        </main>
      </div>
    )
  }

  const galleryImages = [0, 1, 2, 3].map(idx => profile.galleryImageUrls?.[idx] || `https://picsum.photos/seed/gallery-${idx}/400/400`)

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Navbar />
      
      {/* Immersive Cover Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-br from-accent/30 via-background to-secondary/20 w-full relative">
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      <main className="container mx-auto px-4 -mt-24 relative z-10 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: IDENTITY CARD (STICKY) */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl sticky top-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <Avatar className="h-32 w-32 ring-[10px] ring-background shadow-2xl transition-transform hover:scale-105 duration-500">
                  <AvatarImage src={profile.profilePictureUrl} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-secondary">{profile.displayName?.[0]}</AvatarFallback>
                </Avatar>

                <div className="space-y-1.5">
                  <h1 className="text-2xl font-headline font-black tracking-tight">{profile.displayName}</h1>
                  <p className="text-muted-foreground font-bold flex items-center justify-center gap-1.5 text-xs">
                    <MapPin className="w-4 h-4 text-primary" /> {profile.location || "Earth"}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2.5 w-full">
                  <Badge variant="outline" className="bg-secondary/40 border-white/5 py-2 px-4 rounded-xl font-bold text-xs">
                    {profile.age ? `${profile.age} yrs` : "Trybe Member"}
                  </Badge>
                  <Badge variant="outline" className="bg-secondary/40 border-white/5 py-2 px-4 rounded-xl font-bold text-xs">
                    {organizedEvents?.length || 0} organized
                  </Badge>
                </div>

                <div className="w-full pt-6 border-t border-white/5 space-y-6 text-left">
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <UserIcon className="w-3.5 h-3.5" /> About
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground font-medium">
                      {profile.bio || "Crafting experiences and building community."}
                    </p>
                  </div>

                  {profile.interests && profile.interests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> Interests
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-secondary/30 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/5 hover:bg-secondary/50 transition-colors">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: CONTENT STREAM */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Visual Diary Section */}
            <section className="bg-card/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-xl font-headline font-black tracking-tight">Visual Diary</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Shared Moments</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden group bg-secondary/20 border border-white/5 shadow-inner">
                    <Image src={img} alt={`Visual Diary Moment ${idx}`} fill className="object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </section>

            {/* Organized Trybes Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <div className="space-y-0.5">
                  <h3 className="text-xl font-headline font-black tracking-tight">Organized Trybes</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Community Hub</p>
                </div>
                <Badge variant="outline" className="border-white/10 text-muted-foreground uppercase tracking-widest text-[9px] font-black px-4 py-1.5 rounded-full h-fit">Explore</Badge>
              </div>
              
              {isEventsLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
              ) : organizedEvents && organizedEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {organizedEvents.map(event => (
                    <ProfileEventCard key={event.id} event={event as any} showEdit={false} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 glass rounded-[2.5rem] border-dashed border-white/10">
                  <Sparkles className="w-12 h-12 text-muted-foreground mx-auto opacity-10 mb-4" />
                  <p className="text-base font-bold text-muted-foreground">No active Trybes organized yet.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
