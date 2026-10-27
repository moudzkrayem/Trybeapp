"use client"

import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calendar, Image as ImageIcon, MapPin, Sparkles, Loader2, Hash, Zap, Coins, Wand2, Search, DollarSign, ChevronLeft, Gift } from "lucide-react"
import { useState, useRef, useContext, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FirebaseContext, setDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { compressImage } from "@/lib/image-compression"
import { suggestDescription, suggestTags } from "@/ai/flows/suggest-event-details"
import { getPreciseLocation } from "@/lib/location"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

const CATEGORIES = [
  { id: "sports-wellness", label: "🧘 Sports and Wellness" },
  { id: "outdoor-activities", label: "🏔️ Outdoor and Activities" },
  { id: "art-creativity", label: "🎨 Art and Creativity" },
  { id: "social-networking", label: "🤝 Social and Networking" },
  { id: "tech-innovation", label: "🚀 Tech and Innovation" },
  { id: "learning-growth", label: "📚 Learning and Growth" }
]

const PASS_PACKS = [
  { amount: 1, price: "$0.99", label: "Solo Spark" },
  { amount: 4, price: "$2.99", label: "Trybe Starter" },
  { amount: 12, price: "$7.99", label: "Trybe Master" },
]

export default function CreateEventPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const firestore = useFirestore()
  const firebase = useContext(FirebaseContext)
  
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState<"description" | "tags" | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isPromoted, setIsPromoted] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [locationName, setLocationName] = useState("")
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [price, setPrice] = useState<number>(0)

  const [locationQuery, setLocationQuery] = useState("")
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user?.uid])
  const { data: profile } = useDoc(userDocRef)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentPasses = profile?.passes ?? 4
  const totalCost = 1 + (isPromoted ? 3 : 0)

  const [isPassesDialogOpen, setIsPassesDialogOpen] = useState(false)
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false)
  const [redeemCode, setRedeemCode] = useState("")

  const handleAddPasses = async (amount: number, price: string) => {
    if (!userDocRef) return
    setIsProcessingPurchase(true)
    
    toast({ 
      title: "Processing Payment", 
      description: `Authorizing transaction for ${amount} passes...` 
    })

    await new Promise(resolve => setTimeout(resolve, 800))
    
    const newTotal = (profile?.passes || 0) + amount
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

    if (userDocRef) {
      const newTotal = (profile?.passes || 0) + amount
      updateDocumentNonBlocking(userDocRef, { passes: newTotal })
      toast({ title: "Passes Added!", description: `Code redeemed successfully for ${amount} passes.` })
      setRedeemCode("")
      setIsPassesDialogOpen(false)
    }
  }

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
    toast({ title: "Location Selected", description: "Geotag successfully applied to your trybe." })
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
        title: "Location Pinned!", 
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !user || !userDocRef) return

    const form = e.currentTarget
    const dateInput = form.elements.namedItem("date") as HTMLInputElement
    const eventDate = dateInput.value

    if (!lat || !lng) {
      toast({ variant: "destructive", title: "Location Required", description: "Please search and select an actual location for your trybe." })
      return
    }

    if (currentPasses < totalCost) {
      toast({ variant: "destructive", title: "Insufficient Passes", description: `You need ${totalCost} passes, but only have ${currentPasses}.` })
      return
    }

    setLoading(true)
    
    try {
      let imageUrl = "https://picsum.photos/seed/event/800/600"
      if (imageFile && firebase?.storage) {
        toast({ title: "Optimizing Image", description: "Compressing for faster community browsing..." })
        const compressedBlob = await compressImage(imageFile)
        const storageRef = ref(firebase.storage, `event-images/${Date.now()}-${imageFile.name}`)
        const uploadResult = await uploadBytes(storageRef, compressedBlob)
        imageUrl = await getDownloadURL(uploadResult.ref)
      }

      const eventId = crypto.randomUUID()
      const eventTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []

      const eventData = {
        id: eventId,
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
        organizerId: user.uid,
        isPromoted: isPromoted,
        price: price,
        rsvpCount: 0
      }

      const eventDocRef = doc(firestore, 'events', eventId)
      setDocumentNonBlocking(eventDocRef, eventData, { merge: true })

      updateDocumentNonBlocking(userDocRef, {
        passes: currentPasses - totalCost
      })

      toast({ title: "Trybe Created!", description: `Used ${totalCost} passes. Remaining: ${currentPasses - totalCost}` })
      router.push('/feed')
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background pb-64 font-body text-[13px]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-4">
        <Link href="/feed">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
            <ChevronLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="ml-4 text-sm font-black uppercase tracking-widest">Create New Trybe</h1>
      </header>

      <main className="container mx-auto px-4 pt-24 max-w-2xl">
        <div className="mb-8 text-left space-y-2">
          <h1 className="text-2xl font-headline font-bold">Bring your Trybe to life</h1>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest leading-relaxed">Gather your community and share an unforgettable experience.</p>
          <Dialog open={isPassesDialogOpen} onOpenChange={setIsPassesDialogOpen}>
            <DialogTrigger asChild>
              <button 
                type="button" 
                className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-1.5 rounded-full font-black w-fit text-[10px] uppercase tracking-widest mt-2 cursor-pointer transition-all active:scale-95 shadow-sm group"
                aria-label="View and replenish passes"
              >
                <Coins className="w-3.5 h-3.5 text-primary" />
                <span>{currentPasses} Passes Available</span>
                <span className="ml-1 text-[8px] bg-primary text-black font-black px-2 py-0.5 rounded-md group-hover:scale-105 transition-transform uppercase tracking-wider">
                  Top Up +
                </span>
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
                    type="button"
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
                <Button type="button" className="w-full h-12 rounded-xl font-black bg-white text-black hover:bg-white/90 text-[12px] uppercase tracking-widest" onClick={handleRedeem}>
                  Apply Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-none bg-card/40 backdrop-blur-sm shadow-xl rounded-[1.5rem]">
            <CardContent className="p-6 space-y-6">
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary fill-primary" />
                      <h3 className="font-black text-xs uppercase tracking-widest">Promote your Trybe!</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Featured trybes get 10x more visibility.</p>
                  </div>
                  <Switch checked={isPromoted} onCheckedChange={setIsPromoted} />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Promotion Cost</span>
                  <Badge className="bg-primary text-primary-foreground font-black text-[9px] px-2.5 py-1 uppercase tracking-widest">3 Passes</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Cover Image</Label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[21/9] border border-white/10 rounded-xl overflow-hidden cursor-pointer relative bg-secondary/10 hover:bg-secondary/20 transition-all flex items-center justify-center shadow-inner"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center space-y-1">
                      <ImageIcon className="w-6 h-6 text-primary mx-auto opacity-50" />
                      <p className="font-black text-[10px] uppercase tracking-widest">Upload Event Cover</p>
                    </div>
                  )}
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Trybe Name</Label>
                  <input 
                    name="title" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your trybe a name..." 
                    className="w-full h-11 px-4 bg-secondary/30 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary/20 text-xs font-bold" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Category</Label>
                    <Select name="category" value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="h-11 bg-secondary/30 border-none rounded-xl px-4 text-xs font-bold">
                        <SelectValue placeholder="What's the vibe?" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Event Fee ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
                      <input 
                        type="number" 
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        placeholder="0.00" 
                        className="w-full h-11 pl-10 px-4 bg-secondary/30 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary/20 text-xs font-bold" 
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground uppercase">USD</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Description</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-full font-black text-[9px] uppercase tracking-widest"
                      onClick={handleAiSuggestDescription}
                      disabled={!!aiLoading}
                    >
                      {aiLoading === "description" ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />}
                      AI Suggest
                    </Button>
                  </div>
                  <Textarea 
                    name="description" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What should people expect?" 
                    className="min-h-[100px] bg-secondary/30 border-none rounded-xl p-4 text-xs font-medium leading-relaxed" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Location Search</Label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        disabled={isLocating}
                        className="h-7 gap-1.5 text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-full font-black text-[9px] uppercase tracking-widest disabled:opacity-50"
                        onClick={handleGetLocation}
                      >
                        {isLocating ? (
                          <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Pinning...
                          </>
                        ) : (
                          <>
                            <MapPin className="w-2.5 h-2.5" />
                            Pin GPS
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
                      <input 
                        value={locationQuery}
                        onChange={(e) => {
                          setLocationQuery(e.target.value)
                          searchLocations(e.target.value)
                        }}
                        onFocus={() => setShowResults(true)}
                        className="w-full pl-10 h-11 bg-secondary/30 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary/20 text-xs font-bold" 
                        placeholder="Search for a real place..." 
                        required 
                      />
                      {isSearchingLocation && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    
                    {showResults && locationResults.length > 0 && (
                      <Card className="absolute z-50 w-full mt-1 border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden rounded-xl">
                        <div className="max-h-48 overflow-y-auto">
                          {locationResults.map((loc, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full text-left p-3 hover:bg-primary/10 transition-colors text-[10px] border-b border-white/5 last:border-0"
                              onClick={() => handleSelectLocation(loc)}
                            >
                              <p className="font-bold text-foreground line-clamp-1">{loc.display_name}</p>
                            </button>
                          ))}
                        </div>
                      </Card>
                    )}

                    {lat && (
                      <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest px-1.5 pt-1.5 flex items-center gap-1.5">
                        <Zap className="w-2.5 h-2.5 fill-emerald-500" /> Geotagged: {lat.toFixed(4)}, {lng?.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between min-h-[28px]">
                      <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Date & Time</Label>
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary pointer-events-none" />
                      <input 
                        name="date" 
                        type="datetime-local" 
                        className="w-full pl-10 pr-4 h-11 bg-secondary/30 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary/20 text-xs font-bold cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Tags</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-full font-black text-[9px] uppercase tracking-widest"
                      onClick={handleAiSuggestTags}
                      disabled={!!aiLoading}
                    >
                      {aiLoading === "tags" ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />}
                      AI Suggest
                    </Button>
                  </div>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
                    <input 
                      name="tags" 
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g. beginner, wellness (comma separated)" 
                      className="w-full pl-10 h-11 bg-secondary/30 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary/20 text-xs font-bold" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sticky Action Footer for Mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-white/5 md:relative md:bg-transparent md:border-none md:p-0 z-[60]">
            <div className="max-w-2xl mx-auto space-y-3 bg-card/40 backdrop-blur-sm p-4 rounded-2xl border border-white/5 shadow-2xl">
               <div className="flex justify-start items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                 <span className="text-muted-foreground">Total Cost:</span>
                 <span className="text-primary">{totalCost} {totalCost === 1 ? 'Pass' : 'Passes'}</span>
               </div>
               <Button 
                 type="submit" 
                 className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground transition-transform active:scale-95 shadow-xl shadow-primary/20"
                 disabled={loading || currentPasses < totalCost}
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create trybe"}
               </Button>
               {currentPasses < totalCost && (
                 <button
                   type="button"
                   onClick={() => setIsPassesDialogOpen(true)}
                   className="w-full text-center text-[10px] text-destructive hover:text-destructive/80 hover:underline font-black uppercase tracking-widest cursor-pointer py-1"
                 >
                   Insufficient passes available · Click to Top Up
                 </button>
               )}
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
