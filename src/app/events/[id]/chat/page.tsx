
"use client"

import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { doc, collection, query, orderBy, limit } from "firebase/firestore"
import { useState, use, useRef, useEffect } from "react"
import { Send, Users, ChevronLeft, ShieldCheck, Loader2, MessageCircle, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

export default function EventChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const [message, setMessage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const eventRef = useMemoFirebase(() => id && firestore ? doc(firestore, 'events', id) : null, [id, firestore])
  const { data: event, isLoading: eventLoading } = useDoc(eventRef)

  const rsvpId = user ? `${user.uid}_${id}` : null
  const rsvpRef = useMemoFirebase(() => rsvpId && firestore ? doc(firestore, `events/${id}/rsvps`, rsvpId) : null, [rsvpId, firestore, id])
  const { data: userRsvp, isLoading: rsvpLoading } = useDoc(rsvpRef)

  const messagesRef = useMemoFirebase(() => id && firestore ? collection(firestore, 'events', id, 'messages') : null, [id, firestore])
  
  const messagesQuery = useMemoFirebase(() => {
    if (!messagesRef || !userRsvp) return null
    return query(messagesRef, orderBy('timestamp', 'asc'), limit(100))
  }, [messagesRef, userRsvp])
  
  const { data: messages, isLoading: messagesLoading } = useCollection(messagesQuery)

  const attendeesRef = useMemoFirebase(() => id && firestore ? collection(firestore, 'events', id, 'rsvps') : null, [id, firestore])
  const { data: attendees } = useCollection(attendeesRef)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    if (id && userRsvp) {
      localStorage.setItem(`lastRead_${id}`, new Date().toISOString())
    }
  }, [messages, id, userRsvp])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !user || !messagesRef) return

    addDocumentNonBlocking(messagesRef, {
      senderId: user.uid,
      senderName: user.displayName || "Anonymous",
      senderPhoto: user.photoURL || "",
      content: message,
      timestamp: new Date().toISOString()
    })

    setMessage("")
  }

  if (isUserLoading || eventLoading || rsvpLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
  }

  if (!event) return <div className="min-h-screen flex items-center justify-center">Trybe not found</div>

  if (!userRsvp) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-secondary/20 rounded-[2rem] flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black">Members Only</h1>
          <p className="text-muted-foreground max-w-xs mx-auto text-xs font-medium">You must join this Trybe before you can participate in the conversation.</p>
        </div>
        <Link href={`/events/${id}`}>
          <Button className="rounded-xl px-8 h-12 font-bold text-xs uppercase tracking-widest">Return to Trybe</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      <div className="bg-card/40 backdrop-blur-xl border-b border-white/5 p-4 flex items-center gap-4 z-20">
        <Link href={`/events/${id}`}>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5 h-9 w-9"><ChevronLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate text-base">{event.title}</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{attendees?.length || 0} members connected</p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl gap-2 border-white/10 hover:bg-white/5 h-9 text-[10px] font-bold">
              <Users className="w-3.5 h-3.5" /> {"Who's Going"}
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card border-l border-white/5">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold">Attendees ({attendees?.length || 0})</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {attendees?.map((att: any) => (
                <AttendeeItem key={att.userId} userId={att.userId} isOrganizer={att.userId === event.organizerId} />
              ))}
              {(!attendees || attendees.length === 0) && (
                <p className="text-center text-muted-foreground py-10 text-xs">No attendees yet.</p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6 bg-secondary/5">
        <div className="space-y-6 max-w-4xl mx-auto pb-4">
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-xl">Trybe</h3>
              <p className="text-muted-foreground text-[11px] max-w-xs mx-auto font-medium">This is the beginning of the chat for {event.title}. Keep it friendly!</p>
            </div>
          </div>

          {messagesLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
          ) : messages?.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.senderId === user?.uid ? 'flex-row-reverse' : ''}`}>
              <Avatar className="h-9 w-9 border border-white/5 shadow-sm shrink-0">
                <AvatarImage src={msg.senderPhoto || `https://picsum.photos/seed/${msg.senderId || 'user'}/200/200`} className="object-cover" />
                <AvatarFallback className="bg-secondary text-[10px]">{msg.senderName?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className={`flex flex-col space-y-1 ${msg.senderId === user?.uid ? 'items-end' : ''}`}>
                <div className="flex items-center gap-2 px-1">
                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{msg.senderName || "Member"}</span>
                   {msg.senderId === event.organizerId && <Badge className="text-[7px] h-3 px-1.5 bg-accent text-accent-foreground font-black uppercase">Organizer</Badge>}
                </div>
                <div className={`px-4 py-2.5 rounded-2xl max-w-[280px] md:max-w-md shadow-sm border border-white/5 ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card/80 text-foreground rounded-tl-none'}`}>
                  <p className="text-xs leading-relaxed font-medium">{msg.content}</p>
                </div>
                <span className="text-[8px] text-muted-foreground px-1 font-bold uppercase">
                  {(() => {
                    try {
                      return format(new Date(msg.timestamp), 'h:mm a')
                    } catch {
                      return ''
                    }
                  })()}
                </span>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 md:p-6 bg-background border-t border-white/5">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
          <Input 
            placeholder="Talk to the trybe..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="h-12 bg-secondary/30 border-none rounded-xl focus-visible:ring-primary/50 text-xs px-5 shadow-inner"
          />
          <Button type="submit" size="icon" className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0">
            <Send className="w-5 h-5 text-primary-foreground" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function AttendeeItem({ userId, isOrganizer }: { userId: string, isOrganizer: boolean }) {
  const firestore = useFirestore()
  const userRef = useMemoFirebase(() => userId && firestore ? doc(firestore, 'users', userId) : null, [userId, firestore])
  const { data: profile } = useDoc(userRef)

  const displayName = profile?.displayName || "Trybe Member"
  const avatarUrl = profile?.profilePictureUrl || `https://picsum.photos/seed/${userId}/200/200`
  const bio = profile?.bio || (isOrganizer ? "Trybe Host" : "Joined the community")

  return (
    <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-xl border border-white/5 transition-colors hover:bg-secondary/20">
      <Avatar className="h-9 w-9 border border-white/10 shadow-sm">
        <AvatarImage src={avatarUrl} className="object-cover" />
        <AvatarFallback className="text-[10px]">{displayName?.[0] || 'T'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="font-bold truncate text-xs">{displayName}</h4>
          {isOrganizer && <ShieldCheck className="w-3 h-3 text-accent" />}
        </div>
        <p className="text-[9px] text-muted-foreground truncate uppercase tracking-widest font-black">{bio}</p>
      </div>
      <Link href={`/profile/${userId}`}>
         <Button variant="ghost" size="sm" className="rounded-lg text-[9px] font-black uppercase tracking-widest h-7 px-3 hover:bg-white/5">Profile</Button>
      </Link>
    </div>
  )
}
