
"use client"

import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calendar, Image as ImageIcon, MapPin, Sparkles, Loader2, Hash, Zap, Search, Wand2, Coins, ShieldAlert, DollarSign, ChevronLeft, Trash2, AlertTriangle } from "lucide-react"
import { useState, useRef, useContext, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { FirebaseContext, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { compressImage } from "@/lib/image-compression"
import { imageCache } from "@/lib/image-cache"
import { suggestDescription, suggestTags } from "@/ai/flows/suggest-event-details"
import { getPreciseLocation } from "@/lib/location"
import Link from "next/link"
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

const CATEGORIES = [
  { id: "sports-wellness", label: "🧘 Sports and Wellness" },
  { id: "outdoor-activities", label: "🏔️ Outdoor and Activities" },
  { id: "art-creativity", label: "🎨 Art and Creativity" },
  { id: "social-networking", label: "🤝 Social and Networking" },
  { id: "tech-innovation", label: "🚀 Tech and Innovation" },
  { id: "learning-growth", label: "📚 Learning and Growth" }
]

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const firebase = useContext(FirebaseContext)
  
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState<"description" | "tags" | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [mounted, setMounted] = useState(false)

  const eventDocRef = useMemoFirebase(() => {
    if (!firestore || !id) return null
    return doc(firestore, 'events', id)
  }, [firestore, id])

  const { data: event, isLoading: isEventLoading } = useDoc(eventDocRef)

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user?.uid])
  const { data: profile } = useDoc(userDocRef)

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [locationName, setLocationName] = useState("")
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [isPromoted, setIsPromoted] = useState(false)
  const [price, setPrice] = useState<number>(0)

  const [locationQuery, setLocationQuery] = useState("")
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (event) {
      setTitle(event.title || "")
      setCategory(event.category || "")
      setDescription(event.description || "")
      setTags(event.tags?.join(", ") || "")
      setLocationName(event.location || "")
      setLat(event.latitude || null)
      setLng(event.longitude || null)
      setIsPromoted(event.isPromoted || false)
      setLocationQuery(event.location || "")
      setPrice(event.price || 0)
    }
  }, [event])

  const currentPasses = profile?.passes ?? 0
  const newlyPromoted = isPromoted && event && !event.isPromoted
  const promotionCost = newlyPromoted ? 3 : 0

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleAiSuggestDescription = async () => {
    if (!title || !category) {
      toast({ variant: "destructive", title: "Missing Info", description: "Please enter a title and select a category first." })
      return
    }
    setAiLoading("description")
    try {
      const suggested = await suggestDescription({ title, category })
      setDescription(suggested)
      toast({ title: "AI Suggestion Ready!", description: "Description populated with AI magic." })
    } catch (error) {
      toast({ variant: "destructive", title: "AI Error", description: "Could not generate description." })
    } finally {
      setAiLoading(null)
    }
  }

  const handleAiSuggestTags = async () => {
    if (!title || !description) {
      toast({ variant: "destructive", title: "Missing Info", description: "Please enter a title and description first." })
      return
    }
    setAiLoading("tags")
    try {
      const suggested = await suggestTags({ title, description })
      setTags(suggested)
      toast({ title: "AI Tags Ready!", description: "Tags populated based on your content." })
    } catch (error) {
      toast({ variant: "destructive", title: "AI Error", description: "Could not generate tags." })
    } finally {
      setAiLoading(null)
    }
  }

  const searchLocations = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query || query.trim().length < 2) {
      setLocationResults([])
      setIsSearchingLocation(false)
      return
    }

    setIsSearchingLocation(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search-locations?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            setLocationResults(data)
            setShowResults(true)
          } else {
            setLocationResults([])
          }
        }
      } catch (error) {
        console.warn("Location search error:", error)
        setLocationResults([])
      } finally {
        setIsSearchingLocation(false)
      }
    }, 280)
  }

  const handleSelectLocation = (loc: any) => {
    setLocationName(loc.display_name)
    setLat(parseFloat(loc.lat))
    setLng(parseFloat(loc.lon))
    setShowResults(false)
    setLocationQuery(loc.display_name)
    toast({ title: "Location Updated", description: "Geotag successfully applied to your trybe." })
  }

  const handleGetLocation = async () => {
    setIsLocating(true)
    try {
      const loc = await getPreciseLocation()
      setLat(loc.latitude)
      setLng(loc.longitude)
      setLocationName(loc.name)
      setLocationQuery(loc.name)
      toast({ 
        title: "Location Updated!", 
        description: `Geotagged to ${loc.name.split(',')[0]} (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})` 
      })
    } catch (error: any) {
      console.warn("Location detection failed:", error)
      toast({ 
        variant: "destructive", 
        title: "Location Notice", 
        description: "Could not auto-detect location. Please type an address in the search box." 
      })
    } finally {
      setIsLocating(false)
    }
  }

  const handleDelete = () => {
    if (!eventDocRef) return
    deleteDocumentNonBlocking(eventDocRef)
    toast({ title: "Trybe Deleted", description: "Successfully removed your trybe." })
    router.push('/profile')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !user || !eventDocRef || !event || !userDocRef) return

    if (user.uid !== event.organizerId) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You can only edit your own trybes." })
      return
    }

    if (newlyPromoted && currentPasses < promotionCost) {
      toast({ variant: "destructive", title: "Insufficient Passes", description: `You need ${promotionCost} passes to promote this trybe.` })
      return
    }

    const form = e.currentTarget
    const dateInput = form.elements.namedItem("date") as HTMLInputElement
    const eventDate = dateInput.value

    setLoading(true)
    
    try {
      let imageUrl = event.eventPictureUrl
      if (imageFile && firebase?.storage) {
        toast({ title: "Optimizing Image", description: "Compressing for faster community browsing..." })
        const compressedBlob = await compressImage(imageFile)
        const storageRef = ref(firebase.storage, `event-images/${Date.now()}-${imageFile.name}`)
        const uploadResult = await uploadBytes(storageRef, compressedBlob)
        imageUrl = await getDownloadURL(uploadResult.ref)
        imageCache.invalidate(event.eventPictureUrl)
      }

      const eventTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []

      const updateData = {
        title: title,
        category: category,
        startTime: eventDate,
        endTime: eventDate,
        location: locationName,
        latitude: lat,
        longitude: lng,
        description: description,
        tags: eventTags,
        eventPictureUrl: imageUrl,
        isPromoted: isPromoted,
        price: price
      }

      updateDocumentNonBlocking(eventDocRef, updateData)

      if (newlyPromoted) {
        updateDocumentNonBlocking(userDocRef, {
          passes: currentPasses - promotionCost
        })
        toast({ title: "Trybe Promoted!", description: `Used ${promotionCost} passes for the billboard.` })
      }

      toast({ title: "Trybe Updated!", description: "Your changes have been saved." })
      router.push('/profile')
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || isEventLoading || isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!event) return <div className="min-h-screen flex items-center justify-center font-bold">Trybe not found.</div>

  if (user?.uid !== event.organizerId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-destructive/10 rounded-[2.5rem] flex items-center justify-center">
          <ShieldAlert className="w-12 h-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-tight">Access Restricted</h1>
          <p className="text-muted-foreground text-sm font-medium max-xs mx-auto">You do not have permission to edit this Trybe. Only the creator can make changes.</p>
        </div>
        <Link href="/">
          <Button className="rounded-xl px-10 h-12 font-black text-xs uppercase tracking-widest bg-white text-black hover:bg-white/90">Return to Safety</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-40 font-body text-[15px]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-4">
        <Link href={`/events/${id}`}>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
            <ChevronLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="ml-4 text-sm font-black uppercase tracking-widest">Edit Trybe</h1>
      </header>

      <main className="container mx-auto px-4 pt-24 max-w-2xl">
        <div className="mb-10 text-left space-y-3">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Refine your Trybe</h1>
          <p className="text-muted-foreground text-[12px] font-black uppercase tracking-widest leading-relaxed">Keep your community informed with the latest updates.</p>
          <Badge variant="outline" className="border-white/10 text-muted-foreground px-5 py-2 gap-3 rounded-full font-black w-fit text-[11px] uppercase tracking-widest mt-2 bg-secondary/20">
            <Coins className="w-4 h-4 text-primary" /> {currentPasses} Passes Available
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="border-none bg-card/40 backdrop-blur-sm shadow-2xl rounded-[2.5rem]">
            <CardContent className="p-8 space-y-8">
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary fill-primary" />
                      <h3 className="font-black text-xs uppercase tracking-[0.15em]">Promote your Trybe!</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">Featured trybes get 10x more visibility.</p>
                  </div>
                  <Switch checked={isPromoted} onCheckedChange={setIsPromoted} />
                </div>
                {newlyPromoted && (
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-70">Promotion Cost</span>
                    <Badge className="bg-primary text-primary-foreground font-black text-[10px] px-3 py-1.5 uppercase tracking-widest">3 Passes</Badge>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="uppercase text-[11px] font-black tracking-widest text-muted-foreground ml-2">Cover Image</Label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[21/9] border border-white/10 rounded-2xl overflow-hidden cursor-pointer relative bg-secondary/10 hover:bg-secondary/20 transition-all flex items-center justify-center shadow-inner group"
                >
                  {(imagePreview || event.eventPictureUrl) ? (
                    <img src={imagePreview || event.eventPictureUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="text-center space-y-2">
                      <ImageIcon className="w-8 h-8 text-primary mx-auto opacity-40" />
                      <p className="font-black text-[11px] uppercase tracking-widest">Update Event Cover</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Wand2 className="w-8 h-8 text-white" />
                  </div>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="uppercase text-[11px] font-black tracking-widest text-muted-foreground ml-2">Trybe Name</Label>
                  <input 
                    name="title" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your trybe a name..." 
                    className="w-full h-12 px-5 bg-secondary/30 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold shadow-inner" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="uppercase text-[11px] font-black tracking-widest text-muted-foreground ml-2">Category</Label>
                    <Select name="category" value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="h-12 bg-secondary/30 border-none rounded-2xl px-5 text-sm font-bold shadow-inner">
                        <SelectValue placeholder="What's the vibe?" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-sm font-medium">{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="uppercase text-[11px] font-black tracking-widest text-muted-foreground ml-2">Event Fee ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input 
                        type="number" 
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full h-12 pl-12 bg-secondary/30 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold shadow-inner" 
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="uppercase text-[11px] font-black tracking-widest text-muted-foreground ml-2">Description</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-2 text-primary hover:text-primary hover:bg-primary/10 rounded-full font-black text-[10px] uppercase tracking-widest"
                      onClick={handleAiSuggestDescription}
                      disabled={!!aiLoading}
                    >
                      {aiLoading === "description" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      AI Suggest
                    </Button>
                  </div>
                  <Textarea 
                    name="description" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What should people expect?" 
                    className="min-h-[140px] bg-secondary/30 border-none rounded-2xl p-5 text-sm font-medium leading-relaxed shadow-inner resize-none" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <Label className="uppercase text-[11px] font-black tracking-widest text-muted-foreground ml-2">Location Search</Label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        disabled={isLocating}
                        className="h-8 gap-2 text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-full font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                        onClick={handleGetLocation}
                      >
                        {isLocating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Pinning...
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3 h-3" />
                            Pin GPS
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input 
                        value={locationQuery}
                        onChange={(e) => {
                          setLocationQuery(e.target.value)
                          searchLocations(e.target.value)
                        }}
                        onFocus={() => setShowResults(true)}
                        className="w-full pl-12 h-12 bg-secondary/30 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold shadow-inner" 
                        placeholder="Search for a real place..." 
                        required 
                      />
                      {isSearchingLocation && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    
                    {showResults && locationResults.length > 0 && (
                      <Card className="absolute z-50 w-full mt-2 border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl">
                        <div className="max-h-60 overflow-y-auto">
                          {locationResults.map((loc, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full text-left p-4 hover:bg-primary/10 transition-colors text-[11px] border-b border-white/5 last:border-0"
                              onClick={() => handleSelectLocation(loc)}
                            >
                              <p className="font-bold text-foreground line-clamp-1">{loc.display_name}</p>
                            </button>
                          ))}
                        </div>
                      </Card>
                    )}

                    {lat && (
                      <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest px-2 pt-2 flex items-center gap-2">
                        <Zap className="w-3 h-3 fill-emerald-500" /> Geotagged: {lat.toFixed(4)}, {lng?.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between min-h-[32px]">
                      <Label className="uppercase text-[11px] font-black tracking-widest text-muted-foreground ml-2">Date & Time</Label>
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                      <input 
                        name="date" 
                        type="datetime-local" 
                        defaultValue={event.startTime?.substring(0, 16)}
                        className="w-full pl-12 pr-4 h-12 bg-secondary/30 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold shadow-inner cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="uppercase text-[11px] font-black tracking-widest text-muted-foreground ml-2">Tags</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-2 text-primary hover:text-primary hover:bg-primary/10 rounded-full font-black text-[10px] uppercase tracking-widest"
                      onClick={handleAiSuggestTags}
                      disabled={!!aiLoading}
                    >
                      {aiLoading === "tags" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      AI Suggest
                    </Button>
                  </div>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input 
                      name="tags" 
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g. beginner, wellness (comma separated)" 
                      className="w-full pl-12 h-12 bg-secondary/30 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold shadow-inner" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-none bg-destructive/5 backdrop-blur-sm shadow-xl rounded-[2.5rem] mt-12 border border-destructive/10 overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black uppercase tracking-widest text-destructive">Danger Zone</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Irreversible Community Actions</p>
                </div>
              </div>
              <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest leading-relaxed">
                Deleting this trybe will permanently remove it from the community map and delete all associated chat history for all members.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest border-destructive/20 hover:bg-destructive hover:text-white transition-all"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Trybe
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-white/10 bg-card/95 backdrop-blur-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black uppercase tracking-tight">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                      This action will delete the community and remove all data. There is no recovery once confirmed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 pt-4">
                    <AlertDialogCancel className="rounded-xl font-bold border-white/5 h-10 text-[10px] uppercase tracking-widest">Keep it</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="rounded-xl font-black bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 text-[10px] uppercase tracking-widest"
                    >
                      Confirm Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Sticky Action Footer for Mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-xl border-t border-white/5 md:relative md:bg-transparent md:border-none md:p-0 z-50">
            <div className="max-w-2xl mx-auto flex gap-4 bg-card/40 backdrop-blur-sm p-5 rounded-3xl border border-white/5 shadow-2xl">
               <Button 
                 type="button"
                 variant="outline"
                 onClick={() => router.back()}
                 className="flex-1 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest border-white/10 hover:bg-white/5"
                 disabled={loading}
               >
                 Cancel
               </Button>
               <Button 
                 type="submit" 
                 className="flex-[2] h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-transform active:scale-95"
                 disabled={loading || (newlyPromoted && currentPasses < promotionCost)}
               >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
               </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
