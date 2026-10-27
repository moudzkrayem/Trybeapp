import Link from "next/link"
import { Compass, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
        <Compass className="w-10 h-10 text-primary animate-pulse" />
      </div>
      <h1 className="text-4xl font-headline font-black tracking-tight mb-2">Trybe Not Found</h1>
      <p className="text-muted-foreground text-sm max-w-md mb-8 font-medium">
        The experience you are looking for doesn't exist, has ended, or moved to a new coordinate.
      </p>
      <Link href="/feed">
        <Button className="h-12 px-6 rounded-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Discover
        </Button>
      </Link>
    </div>
  )
}
