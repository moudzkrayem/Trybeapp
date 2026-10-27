
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, useStorage } from "@/firebase"
import { doc, collection, query, where, getDoc, orderBy, limit } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { ProfileEventCard } from "@/components/profile/ProfileEventCard"
import { Loader2, Settings, MapPin, Edit3, Plus, Camera, Trash2, Coins, Calendar, User as UserIcon, Sparkles, Gift } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { compressImage } from "@/lib/image-compression"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { imageCache } from "@/lib/image-cache"
import { CachedImage } from "@/components/ui/cached-image"
import { Separator } from "@/components/ui/separator"
import { isAfter, parseISO } from "date-fns"

const PASS_PACKS = [
  { amount: 1, price: "$0.99", label: "Solo Spark" },
  { amount: 4, price: "$2.99", label: "Trybe Starter" },
  { amount: 12, price: "$7.99", label: "Trybe Master" },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const storage = useStorage()
  const { toast } = useToast()
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPassesDialogOpen, setIsPassesDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [redeemCode, setRedeemCode] = useState("")
  
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null)

  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [isSyncingSchedule, setIsSyncingSchedule] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isUserLoading && !user) {
      router.push("/auth")
    }
  }, [user, isUserLoading, router, mounted])

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user?.uid])

  const { data: profile, isLoading: isProfileLoading } = useDoc(userDocRef)

  const organizedEventsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null
    return query(collection(firestore, "events"), where("organizerId", "==", user.uid))
  }, [firestore, user?.uid])

  const { data: rawOrganizedEvents, isLoading: isOrganizedLoading } = useCollection(organizedEventsQuery)

  const allEventsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'events'), orderBy('startTime', 'desc'), limit(100))
  }, [firestore])

  const { data: allEvents, isLoading: allEventsLoading } = useCollection(allEventsQuery)

  useEffect(() => {
    async function filterJoinedEvents() {
      if (!firestore || !user || !allEvents) {
        if (!allEventsLoading) setIsSyncingSchedule(false)
        return
      }

      setIsSyncingSchedule(true)
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
      setIsSyncingSchedule(false)
    }

    if (mounted) filterJoinedEvents()
  }, [firestore, user, allEvents, allEventsLoading, mounted])

  const { activeEvents, pastEvents, scheduleEvents } = useMemo(() => {
    const now = new Date()
    const active: any[] = []
    const past: any[] = []
    const schedule: any[] = []
    
    if (rawOrganizedEvents) {
      rawOrganizedEvents.forEach(event => {
        const eventEndDate = parseISO(event.endTime || event.startTime)
        if (isAfter(eventEndDate, now)) {
          active.push(event)
        } else {
          past.push(event)
        }
      })
    }

    if (allEvents) {
      allEvents.forEach(event => {
        if (joinedIds.has(event.id)) {
          const eventEndDate = parseISO(event.endTime || event.startTime)
          if (isAfter(eventEndDate, now)) {
            schedule.push(event)
          }
        }
      })
    }

    return { activeEvents: active, pastEvents: past, scheduleEvents: schedule }
  }, [rawOrganizedEvents, allEvents, joinedIds])

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!userDocRef) return

    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)
    
    const interestsString = formData.get("interests") as string
    const interests = interestsString 
      ? interestsString.split(',').map(i => i.trim()).filter(Boolean) 
      : []

    const updateData = {
      displayName: formData.get("displayName") as string,
      bio: formData.get("bio") as string,
      location: formData.get("location") as string,
      age: formData.get("age") as string,
      interests: interests,
    }

    try {
      updateDocumentNonBlocking(userDocRef, updateData)
      setIsEditDialogOpen(false)
      toast({ title: "Profile updated!", description: "Your changes have been saved." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update failed", description: error.message })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'gallery', index?: number) => {
    const file = e.target.files?.[0]
    if (!file || !user?.uid || !storage || !userDocRef) return

    setIsUpdating(true)
    toast({ title: "Optimizing...", description: "Compressing and uploading your image." })

    try {
      const compressedBlob = await compressImage(file)
      const storagePath = type === 'avatar' 
        ? `profiles/${user.uid}/avatar` 
        : `profiles/${user.uid}/gallery_${index}`
      
      const storageRef = ref(storage, storagePath)
      const uploadResult = await uploadBytes(storageRef, compressedBlob)
      const downloadUrl = await getDownloadURL(uploadResult.ref)

      if (type === 'avatar') {
        if (profile?.profilePictureUrl) imageCache.invalidate(profile.profilePictureUrl)
        updateDocumentNonBlocking(userDocRef, { profilePictureUrl: downloadUrl })
      } else if (typeof index === 'number') {
        const currentGallery = [...(profile?.galleryImageUrls || [])]
        if (currentGallery[index]) imageCache.invalidate(currentGallery[index])
        
        while (currentGallery.length <= index) {
          currentGallery.push("")
        }
        currentGallery[index] = downloadUrl
        updateDocumentNonBlocking(userDocRef, { galleryImageUrls: currentGallery })
      }

      toast({ title: "Success!", description: "Image updated successfully." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message })
    } finally {
      setIsUpdating(false)
      e.target.value = ''
    }
  }

  const handleRemoveImage = async (type: 'avatar' | 'gallery', index?: number) => {
    if (!userDocRef) return

    setIsUpdating(true)
    try {
      if (type === 'avatar') {
        if (profile?.profilePictureUrl) imageCache.invalidate(profile.profilePictureUrl)
        updateDocumentNonBlocking(userDocRef, { profilePictureUrl: "" })
        toast({ title: "Avatar removed", description: "Your profile picture has been reset." })
      } else if (typeof index === 'number' && profile?.galleryImageUrls) {
        const currentGallery = [...profile.galleryImageUrls]
        if (currentGallery[index]) imageCache.invalidate(currentGallery[index])
        currentGallery[index] = ""
        updateDocumentNonBlocking(userDocRef, { galleryImageUrls: currentGallery })
        toast({ title: "Image removed", description: "Diary slot cleared." })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to remove image." })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddPasses = async (amount: number, price: string) => {
    if (!userDocRef || !profile) return
    setIsProcessingPurchase(true)
    
    toast({ 
      title: "Processing Payment", 
      description: `Authorizing transaction for ${amount} passes...` 
    })

    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const newTotal = (profile.passes || 0) + amount
    updateDocumentNonBlocking(userDocRef, { passes: newTotal })
    
    toast({ 
      title: "Transaction Complete", 
      description: `Added ${amount} passes to your community wallet.` 
    })
    
    setIsProcessingPurchase(false)
    setIsPassesDialogOpen(false)
  }

  const handleRedeem = () => {
    if (!redeemCode.trim()) return
    const code = redeemCode.trim().toUpperCase()
    
    let amount = 0
    if (code === "TRYBEHUB") amount = 10
    else if (code === "WELCOME") amount = 5
    else {
      toast({ variant: "destructive", title: "Invalid Code", description: "The redeem code you entered is not valid." })
      return
    }

    if (userDocRef && profile) {
      const newTotal = (profile.passes || 0) + amount
      updateDocumentNonBlocking(userDocRef, { passes: newTotal })
      toast({ title: "Passes Added!", description: `Code redeemed successfully for ${amount} passes.` })
      setRedeemCode("")
    }
  }

  const activeProfile = useMemo(() => {
    if (profile) return profile
    if (!user) return null
    return {
      id: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || "Trybe Member",
      email: user.email || "",
      username: user.email?.split('@')[0] || user.uid,
      bio: "Crafting experiences and building community.",
      location: "Earth",
      profilePictureUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
      galleryImageUrls: [],
      interests: ["Adventure", "Community", "Nature"],
      passes: 4
    }
  }, [profile, user])

  useEffect(() => {
    if (mounted && userDocRef && user && !profile && !isProfileLoading) {
      setDocumentNonBlocking(userDocRef, {
        id: user.uid,
        username: user.email?.split('@')[0] || user.uid,
        email: user.email || "",
        displayName: user.displayName || "Trybe Member",
        bio: "Crafting experiences and building community.",
        location: "Earth",
        profilePictureUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
        passes: 4,
        interests: ["Adventure", "Community", "Nature"],
        galleryImageUrls: []
      }, { merge: true })
    }
  }, [mounted, userDocRef, user, profile, isProfileLoading])

  const userInterests = useMemo(() => {
    if (!activeProfile?.interests || activeProfile.interests.length === 0) {
      return ["Adventure", "Community", "Nature"]
    }
    return activeProfile.interests
  }, [activeProfile?.interests])

  if (!mounted || isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  if (!user || !activeProfile) return null

  const getGalleryPlaceholder = (idx: number) => `https://picsum.photos/seed/${user.uid}_gallery_${idx}/400/400`
  const galleryImages = [0, 1, 2, 3].map(idx => activeProfile.galleryImageUrls?.[idx] || getGalleryPlaceholder(idx))

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Navbar />
      
      <div className="h-32 md:h-40 bg-gradient-to-br from-primary/20 via-background to-accent/10 w-full relative">
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      <main className="container mx-auto px-4 -mt-16 relative z-10 max-w-7xl">
        <input type="file" className="hidden" ref={avatarInputRef} accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
        <input type="file" className="hidden" ref={galleryInputRef} accept="image/*" onChange={(e) => activeGalleryIndex !== null && handleImageUpload(e, 'gallery', activeGalleryIndex)} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 shadow-2xl sticky top-8 relative">
              <div className="absolute top-6 right-6">
                <Link href="/settings">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all" aria-label="Settings">
                    <Settings className="w-5 h-5 text-primary" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative group cursor-pointer">
                  <div onClick={() => avatarInputRef.current?.click()} className="relative">
                    <Avatar className="h-28 w-28 ring-[8px] ring-background shadow-2xl transition-transform group-hover:scale-105 duration-500">
                      <AvatarImage src={activeProfile.profilePictureUrl || user.photoURL || undefined} className="object-cover" />
                      <AvatarFallback className="text-3xl bg-secondary font-bold">{activeProfile.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setIsEditDialogOpen(true)}
                    size="icon" 
                    className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl border-[4px] border-background transition-transform active:scale-90"
                    aria-label="Edit basic profile details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>

                  {activeProfile.profilePictureUrl && (
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="absolute top-0 right-0 h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg" 
                      onClick={() => handleRemoveImage('avatar')}
                      aria-label="Remove profile picture"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {(isUpdating || isProcessingPurchase) && <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center z-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl font-headline font-black tracking-tight">{activeProfile.displayName}</h1>
                  <p className="text-muted-foreground font-black flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-widest">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {activeProfile.location || "Earth"}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 w-full">
                  <Dialog open={isPassesDialogOpen} onOpenChange={setIsPassesDialogOpen}>
                    <DialogTrigger asChild>
                      <button className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex-1 min-w-[80px] transition-all hover:bg-primary/10 active:scale-95 group">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 mb-1 group-hover:text-primary">Passes</p>
                        <div className="flex items-center justify-center gap-1.5">
                           <Coins className="w-4 h-4 text-primary" />
                           <span className="text-sm font-black">{activeProfile.passes || 0}</span>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-3xl border-white/10 rounded-[2rem] p-6">
                      <DialogHeader className="space-y-2">
                        <DialogTitle className="text-lg font-headline font-black uppercase tracking-widest text-center">Replenish Passes</DialogTitle>
                        <DialogDescription className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest text-center">Secure the passes needed to lead and grow your trybe.</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
                        {PASS_PACKS.map(pack => (
                          <button 
                            key={pack.amount}
                            disabled={isProcessingPurchase}
                            className="flex flex-col items-center justify-between p-4 rounded-2xl border border-white/5 bg-secondary/20 hover:bg-primary/10 hover:border-primary/30 transition-all group gap-3 h-36 md:h-32 relative overflow-hidden"
                            onClick={() => handleAddPasses(pack.amount, pack.price)}
                          >
                            <div className="text-center relative z-10">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary/70">{pack.label}</p>
                              <p className="text-xl font-black group-hover:text-primary">{pack.amount}</p>
                            </div>
                            <div className="w-full relative z-10 flex flex-col items-center gap-1.5">
                              <Badge className="bg-primary text-primary-foreground font-black text-[10px] px-3 py-1 uppercase tracking-widest">{pack.price}</Badge>
                              <p className="text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Purchase</p>
                            </div>
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                      <div className="relative py-3">
                        <div className="absolute inset-0 flex items-center"><Separator className="bg-white/5" /></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-muted-foreground"><span className="bg-card px-2">Or redeem code</span></div>
                      </div>
                      <div className="space-y-4 pt-6">
                        <div className="relative">
                          <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                          <Input 
                            value={redeemCode}
                            onChange={(e) => setRedeemCode(e.target.value)}
                            placeholder="Enter Trybe Code" 
                            className="pl-12 bg-secondary/30 border-none h-12 rounded-xl text-sm font-black uppercase tracking-widest" 
                          />
                        </div>
                        <Button className="w-full h-12 rounded-xl font-black bg-white text-black hover:bg-white/90 text-[12px] uppercase tracking-widest" onClick={handleRedeem}>
                          Apply Code
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <div className="bg-secondary/40 border border-white/5 rounded-xl p-3 flex-1 min-w-[80px]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Trybes</p>
                    <div className="flex items-center justify-center gap-1.5">
                       <Sparkles className="w-4 h-4 text-primary" />
                       <span className="text-sm font-black">{rawOrganizedEvents?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full pt-6 border-t border-white/5 space-y-6 text-left">
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <UserIcon className="w-4 h-4" /> About Me
                    </h3>
                    <p className="text-[12px] leading-relaxed text-muted-foreground font-medium">
                      {activeProfile.bio || "Crafting experiences and building community."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Interests
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {userInterests.map((interest: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-secondary/30 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-8 space-y-10">
            <section className="bg-card/20 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-headline font-black tracking-tight">Visual Diary</h3>
                  <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">Shared Moments</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const hasCustomImage = profile.galleryImageUrls?.[idx] && profile.galleryImageUrls[idx] !== "";
                  return (
                    <div key={idx} className="relative aspect-square rounded-[1.5rem] overflow-hidden group bg-secondary/20 cursor-pointer border border-white/5 shadow-inner">
                      <div className="w-full h-full relative" onClick={() => { setActiveGalleryIndex(idx); galleryInputRef.current?.click(); }}>
                        <CachedImage src={galleryImages[idx]} alt={`Visual Moment ${idx}`} fill className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-50" />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                          <Camera className="w-5 h-5 text-white" />
                          <span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Update</span>
                        </div>
                      </div>
                      {hasCustomImage && (
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-xl" 
                          onClick={() => handleRemoveImage('gallery', idx)}
                          aria-label={`Remove moment ${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {(isUpdating || (isProcessingPurchase && activeGalleryIndex === idx)) && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <Tabs defaultValue="organized" className="w-full">
              <TabsList className="bg-secondary/10 w-full flex h-12 p-1.5 gap-2 rounded-xl mb-8 border border-white/5">
                <TabsTrigger value="organized" className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest">My Trybes</TabsTrigger>
                <TabsTrigger value="schedule" className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest">My Schedule</TabsTrigger>
                <TabsTrigger value="past" className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest">Past Events</TabsTrigger>
              </TabsList>

              <TabsContent value="organized" className="mt-0 outline-none">
                {isOrganizedLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : activeEvents && activeEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeEvents.map(event => (
                      <ProfileEventCard key={event.id} event={event as any} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 glass rounded-[2rem] border-dashed border-white/10 space-y-6">
                    <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto opacity-20">
                      <Sparkles className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold uppercase tracking-widest">No active Trybes.</p>
                      <p className="text-muted-foreground max-w-xs mx-auto text-[11px] font-medium uppercase tracking-widest">Be the spark that brings the community together.</p>
                    </div>
                    <Button onClick={() => router.push("/create")} className="rounded-xl h-12 px-8 font-black bg-primary text-primary-foreground text-[12px] uppercase tracking-widest shadow-lg shadow-primary/20">
                      Launch Your First Trybe
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="schedule" className="mt-0 outline-none">
                {isSyncingSchedule || allEventsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Syncing your schedule...</p>
                  </div>
                ) : scheduleEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scheduleEvents.map(event => (
                      <ProfileEventCard key={event.id} event={event as any} showEdit={false} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24 glass rounded-[2rem] border-dashed border-white/10 space-y-4">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto opacity-10 mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Schedule Open</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest max-w-[200px] mx-auto">You haven't joined any upcoming Trybes yet.</p>
                    </div>
                    <Button onClick={() => router.push("/feed")} variant="outline" className="mt-4 rounded-xl border-white/10 font-black text-[10px] uppercase tracking-widest">Explore Nearby</Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-0 outline-none">
                {isOrganizedLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : pastEvents && pastEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastEvents.map(event => (
                      <ProfileEventCard key={event.id} event={event as any} showEdit={false} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24 glass rounded-[2rem] border-dashed border-white/10">
                    <Plus className="w-12 h-12 text-muted-foreground mx-auto opacity-10 mb-4" />
                    <p className="text-[12px] font-black text-muted-foreground uppercase tracking-widest">No past events yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-3xl border-white/10 rounded-[1.5rem] p-8">
            <form onSubmit={handleUpdateProfile}>
              <DialogHeader className="mb-6">
                <DialogTitle className="text-lg font-headline font-black tracking-tight uppercase tracking-widest">Edit Identity</DialogTitle>
                <DialogDescription className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Define how the trybe recognizes you.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Full Name</Label>
                  <Input name="displayName" defaultValue={activeProfile.displayName} className="bg-secondary/30 border-none h-12 rounded-xl font-bold px-5 text-sm focus-visible:ring-primary/40" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Age</Label>
                    <Input name="age" defaultValue={activeProfile.age || ""} className="bg-secondary/30 border-none h-12 rounded-xl font-bold px-5 text-sm focus-visible:ring-primary/40" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Location</Label>
                    <Input name="location" defaultValue={activeProfile.location || ""} className="bg-secondary/30 border-none h-12 rounded-xl font-bold px-5 text-sm focus-visible:ring-primary/40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Short Bio</Label>
                  <Input name="bio" defaultValue={activeProfile.bio} placeholder="e.g. Explorer & Storyteller" className="bg-secondary/30 border-none h-12 rounded-xl font-bold px-5 text-sm focus-visible:ring-primary/40" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Interests</Label>
                  <Input name="interests" defaultValue={activeProfile.interests?.join(', ')} placeholder="Hiking, Art, Tech" className="bg-secondary/30 border-none h-12 rounded-xl font-bold px-5 text-sm focus-visible:ring-primary/40" />
                </div>
              </div>
              <DialogFooter className="mt-8">
                <Button type="submit" className="w-full h-12 rounded-xl font-black bg-primary text-primary-foreground text-sm uppercase tracking-widest shadow-lg shadow-primary/20" disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
