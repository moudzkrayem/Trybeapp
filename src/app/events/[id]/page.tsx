
"use client"

import { Navbar } from "@/components/layout/Navbar"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { 
  Calendar, 
  MapPin, 
  Users, 
  ChevronLeft,
  Clock,
  Loader2,
  Zap,
  MessageCircle,
  ArrowRight,
  DollarSign,
  Edit3,
  Trash2
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, use, useMemo } from "react"
import { useDoc, useFirestore, useMemoFirebase, useUser, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { doc, increment } from "firebase/firestore"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Button as ShadButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { normalizeTrybe } from "@/lib/trybe-utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [isJoining, setIsJoining] = useState(false)

  const eventDocRef = useMemoFirebase(() => id && firestore ? doc(firestore, 'events', id) : null, [firestore, id])
  const { data: rawEvent, isLoading, error } = useDoc(eventDocRef)
  const event = useMemo(() => rawEvent ? normalizeTrybe(rawEvent) : null, [rawEvent])

  // Fetch Organizer Data
  const organizerId = event?.organizerId || event?.hostId
  const organizerRef = useMemoFirebase(() => {
    if (!firestore || !organizerId) return null
    return doc(firestore, "users", organizerId)
  }, [firestore, organizerId])
  const { data: organizer } = useDoc(organizerRef)

  const rsvpId = user ? `${user.uid}_${id}` : null
  const rsvpRef = useMemoFirebase(() => rsvpId && firestore && id ? doc(firestore, `events/${id}/rsvps`, rsvpId) : null, [firestore, id, rsvpId])
  const { data: userRsvp } = useDoc(rsvpRef)

  const isGoing = !!userRsvp

  const handleJoin = () => {
    if (!user || !rsvpRef) {
      toast({ title: "Auth Required", description: "Please sign in to join trybes." })
      return
    }

    setIsJoining(true)
    if (isGoing) {
      deleteDocumentNonBlocking(rsvpRef)
      if (eventDocRef) {
        updateDocumentNonBlocking(eventDocRef, { rsvpCount: increment(-1) })
      }
      toast({ title: "Left Trybe", description: "We're sorry to see you go!" })
    } else {
      setDocumentNonBlocking(rsvpRef, {
        id: rsvpId,
        eventId: id,
        userId: user.uid,
        rsvpTime: new Date().toISOString(),
        status: "going"
      }, { merge: true })
      if (eventDocRef) {
        updateDocumentNonBlocking(eventDocRef, { rsvpCount: increment(1) })
      }
      toast({ title: "Connected to Trybes!", description: `You're officially joining ${event?.title}.` })
    }
    setIsJoining(false)
  }

  const handleDelete = () => {
    if (!eventDocRef) return
    deleteDocumentNonBlocking(eventDocRef)
    toast({ title: "Trybe Deleted", description: "Your event has been removed from the community." })
    router.push('/feed')
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
  if (error || !event) return <div className="min-h-screen flex items-center justify-center">Trybe not found</div>

  let displayDate = event.startTime
  let displayTime = ""
  try {
    const dateObj = new Date(event.startTime)
    if (!isNaN(dateObj.getTime())) {
      displayDate = format(dateObj, "EEEE, MMMM d, yyyy")
      displayTime = format(dateObj, "hh:mm a")
    }
  } catch (e) {}

  return (
    <div className="min-h-screen flex flex-col pb-32">
      <Navbar />
      
      <main className="flex-1">
        <div className="relative h-[300px] md:h-[450px]">
          <Image 
            src={event.eventPictureUrl || 'https://picsum.photos/seed/event/1200/600'} 
            alt={event.title || 'Event'} 
            fill 
            className="object-cover" 
            priority 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          <div className="absolute top-6 left-6 z-20">
            <Link href="/feed">
              <ShadButton variant="ghost" size="icon" className="rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10 h-9 w-9">
                <ChevronLeft className="w-4 h-4" />
              </ShadButton>
            </Link>
          </div>

          {user?.uid === event.organizerId && (
            <div className="absolute top-6 right-6 z-20 flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ShadButton variant="destructive" size="icon" className="rounded-full bg-destructive/40 backdrop-blur-md text-white hover:bg-destructive/60 border border-white/10 h-9 w-9 shadow-xl">
                    <Trash2 className="w-4 h-4" />
                  </ShadButton>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-white/10 bg-card/95 backdrop-blur-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black uppercase tracking-tight">Delete Trybe?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs font-medium uppercase tracking-widest leading-relaxed">
                      This will permanently remove this community and all its data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 pt-4">
                    <AlertDialogCancel className="rounded-xl font-bold border-white/5 h-10 text-[10px] uppercase tracking-widest">Keep it</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="rounded-xl font-black bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 text-[10px] uppercase tracking-widest"
                    >
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Link href={`/events/${id}/edit`}>
                <ShadButton variant="outline" className="rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10 h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-primary" /> Edit Trybe
                </ShadButton>
              </Link>
            </div>
          )}
        </div>

        <div className="container mx-auto px-4 -mt-24 relative z-10 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none bg-card/40 backdrop-blur-3xl p-6 md:p-10 rounded-[2rem] shadow-2xl">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <Badge className="bg-primary/10 text-primary border border-primary/20 uppercase tracking-[0.2em] px-4 py-1 text-[9px] font-black">{event.category.replace('-', ' ')}</Badge>
                  <Badge className={cn(
                    "uppercase tracking-[0.2em] px-4 py-1 text-[9px] font-black border",
                    (event.price || 0) === 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-primary text-black border-transparent"
                  )}>
                    {(event.price || 0) === 0 ? "FREE ENTRY" : `$${event.price} FEE`}
                  </Badge>
                </div>
                <h1 className="text-2xl md:text-4xl font-headline font-extrabold mb-6 leading-tight tracking-tight flex items-center gap-3">
                  {event.title}
                  {event.isPromoted && <Zap className="w-6 h-6 text-[#FFBF00] fill-[#FFBF00]" />}
                </h1>
                
                <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-2xl border border-white/5 mb-8">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/10 shadow-xl">
                    <AvatarImage src={organizer?.profilePictureUrl || `https://picsum.photos/seed/${event.organizerId}/200/200`} className="object-cover" />
                    <AvatarFallback className="bg-secondary text-sm">{organizer?.displayName?.[0] || 'T'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base truncate">{organizer?.displayName || "Organizer"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{organizer?.bio || "Trybe Leader"}</p>
                  </div>
                  <Link href={`/profile/${event.organizerId}`}>
                    <ShadButton variant="outline" className="rounded-full font-bold px-4 border-white/10 hover:bg-white/5 h-8 text-[10px]">View Profile</ShadButton>
                  </Link>
                </div>

                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <div className="w-1 h-6 bg-primary rounded-full" />
                      About this Trybe
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-medium">{event.description}</p>
                  </section>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                    <InfoItem icon={Calendar} label="Date" value={displayDate} />
                    <InfoItem icon={Clock} label="Time" value={displayTime} />
                    <InfoItem icon={MapPin} label="Location" value={event.location} />
                    <InfoItem icon={DollarSign} label="Fee" value={(event.price || 0) === 0 ? "Free" : `$${event.price}`} />
                  </div>
                </div>
              </Card>
            </div>

            <aside className="space-y-6">
              <div className="sticky top-24 space-y-6">
                <Card className="border-none bg-card/60 backdrop-blur-3xl p-6 rounded-[2rem] shadow-2xl overflow-hidden relative group border border-white/5">
                  <div className="relative space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-xl font-headline font-black leading-tight">Join the Trybe</h3>
                      <p className="text-muted-foreground font-semibold text-[11px]">Experience this together with the community.</p>
                    </div>
                    
                    <div className="space-y-3">
                      <ShadButton 
                        onClick={handleJoin}
                        disabled={isJoining}
                        className={cn(
                          "w-full h-12 rounded-xl text-sm font-black transition-all flex items-center shadow-lg px-6",
                          isGoing 
                            ? 'justify-center bg-destructive/5 text-destructive border border-destructive/20 hover:bg-destructive/10' 
                            : 'justify-between bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-95'
                        )}
                      >
                        <span>{isGoing ? "Leave trybe" : "Secure My Spot"}</span>
                        {!isGoing && <ArrowRight className="w-4 h-4" />}
                      </ShadButton>

                      {isGoing && (
                        <Link href={`/events/${id}/chat`} className="block">
                          <ShadButton className="w-full h-12 rounded-xl font-black gap-2 bg-white text-black hover:bg-white/90 shadow-lg transition-all hover:scale-[1.02] active:scale-95 text-sm">
                            <MessageCircle className="w-4 h-4 fill-current" />
                            Open Chat
                          </ShadButton>
                        </Link>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex flex-col gap-4">
                      <p className="text-center text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black">
                        {isGoing ? "You're in the community" : "Join to unlock location & chat"}
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center gap-3 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-primary fill-primary" />
                  </div>
                  <p className="text-[9px] font-black text-primary/80 leading-relaxed uppercase tracking-[0.1em]">
                    Respect the vibe and enjoy the community.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/20 shadow-sm border border-white/5">
        <Icon className="text-primary w-4 h-4" />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <p className="font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</p>
        <p className="font-bold text-sm leading-tight truncate">{value}</p>
      </div>
    </div>
  )
}
