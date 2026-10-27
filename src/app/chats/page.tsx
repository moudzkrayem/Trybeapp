
"use client"

import { Navbar } from "@/components/layout/Navbar"
import { useCollection, useFirestore, useMemoFirebase, useUser, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, limit, doc, getDoc, increment } from "firebase/firestore"
import { MessageSquare, ChevronRight, Loader2, ChevronLeft, Trash2 } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
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

export default function ChatsListPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [isSyncing, setIsSyncing] = useState(true)

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'events'), orderBy('startTime', 'desc'), limit(100))
  }, [firestore])

  const { data: allEvents, isLoading: eventsLoading } = useCollection(eventsQuery)

  const filterJoinedEvents = async () => {
    if (!firestore || !user || !allEvents) {
      if (!eventsLoading) setIsSyncing(false)
      return
    }

    setIsSyncing(true)
    const joined = new Set<string>()
    
    const checks = allEvents.map(async (event) => {
      const rsvpId = `${user.uid}_${event.id}`
      const rsvpRef = doc(firestore, `events/${event.id}/rsvps`, rsvpId)
      const snap = await getDoc(rsvpRef)
      if (snap.exists()) {
        joined.add(event.id)
      }
    })

    await Promise.all(checks)
    setJoinedIds(joined)
    setIsSyncing(false)
  }

  useEffect(() => {
    filterJoinedEvents()
  }, [firestore, user, allEvents, eventsLoading])

  const joinedEvents = allEvents?.filter(e => joinedIds.has(e.id)) || []
  const isLoading = eventsLoading || isSyncing

  const onLeaveTrybe = (eventId: string) => {
    setJoinedIds(prev => {
      const next = new Set(prev)
      next.delete(eventId)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden font-body">
      <Navbar />
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pt-6 pb-24 overflow-hidden">
        <div className="flex items-center gap-4 mb-8 px-2">
          <Link href="/feed">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-xl font-headline font-black flex items-center gap-2.5">
              Conversations
            </h1>
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Connect with your Trybes</p>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3 pb-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-[8px]">Syncing trybes...</p>
              </div>
            ) : joinedEvents.length > 0 ? (
              joinedEvents.map((event) => (
                <ChatListItem key={event.id} event={event} onLeave={() => onLeaveTrybe(event.id)} />
              ))
            ) : (
              <div className="text-center py-20 glass rounded-[1.5rem] border-dashed border-white/10 space-y-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center mx-auto opacity-20">
                   <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-widest">Quiet in here...</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto text-[8px] font-medium uppercase tracking-[0.1em]">Join a trybe to start connecting with your community members.</p>
                </div>
                <Link href="/" className="inline-block pt-2">
                  <button className="bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-widest px-5 h-9 rounded-xl hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-primary/20">Explore Trybes</button>
                </Link>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}

function ChatListItem({ event, onLeave }: { event: any, onLeave: () => void }) {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [hasNewMessage, setHasNewMessage] = useState(false)

  const messagesRef = useMemoFirebase(() => 
    event.id && firestore ? collection(firestore, 'events', event.id, 'messages') : null, 
    [event.id, firestore]
  )
  
  const latestMessageQuery = useMemoFirebase(() => {
    if (!messagesRef) return null
    return query(messagesRef, orderBy('timestamp', 'desc'), limit(1))
  }, [messagesRef])

  const { data: latestMsg } = useCollection(latestMessageQuery)

  useEffect(() => {
    if (latestMsg && latestMsg.length > 0) {
      const lastRead = localStorage.getItem(`lastRead_${event.id}`)
      if (!lastRead) {
        setHasNewMessage(true)
      } else {
        const lastReadDate = new Date(lastRead)
        const latestMsgDate = new Date(latestMsg[0].timestamp)
        setHasNewMessage(latestMsgDate > lastReadDate)
      }
    }
  }, [latestMsg, event.id])

  const handleLeaveTrybe = async () => {
    if (!firestore || !user) return

    const rsvpId = `${user.uid}_${event.id}`
    const rsvpRef = doc(firestore, `events/${event.id}/rsvps`, rsvpId)
    
    deleteDocumentNonBlocking(rsvpRef)
    updateDocumentNonBlocking(doc(firestore, 'events', event.id), { rsvpCount: increment(-1) })
    onLeave()
    
    toast({
      title: "Left Trybe",
      description: `You have left ${event.title} and the chat has been removed.`
    })
  }

  return (
    <div className="group relative">
      <Link href={`/events/${event.id}/chat`}>
        <Card className="p-3 bg-secondary/10 hover:bg-secondary/20 border-white/5 rounded-2xl transition-all duration-300 flex items-center gap-3 cursor-pointer border shadow-sm active:scale-[0.98]">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform border border-white/10">
            <img src={event.eventPictureUrl || event.imageUrl || 'https://picsum.photos/seed/chat/200/200'} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs truncate group-hover:text-primary transition-colors">{event.title || event.name || "Trybe Chat"}</h3>
              {hasNewMessage && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm shadow-primary/40 animate-pulse shrink-0" />
              )}
            </div>
            <p className="text-[8px] text-muted-foreground font-black truncate uppercase tracking-widest mt-0.5">
              {(event.category || 'community').replace(/-/g, ' ')}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1 opacity-50 mr-8" />
        </Card>
      </Link>

      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2rem] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase tracking-tight">Leave this Trybe?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs font-medium uppercase tracking-widest leading-relaxed">
                This will remove you from the community and delete your access to this chat.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl font-bold border-white/5 h-10 text-[10px] uppercase tracking-widest">Stay</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLeaveTrybe}
                className="rounded-xl font-black bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 text-[10px] uppercase tracking-widest"
              >
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
