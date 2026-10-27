
"use client"

import { useState, useEffect, useContext } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FirebaseContext, initiateEmailSignIn, initiateGoogleSignIn, setDocumentNonBlocking } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Lock, User, Sparkles, ChevronLeft } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

export default function AuthPage() {
  const router = useRouter()
  const { toast } = useToast()
  const firebase = useContext(FirebaseContext)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (firebase?.user) {
      router.push("/feed")
    }
  }, [firebase?.user, router])

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firebase?.auth) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      await initiateEmailSignIn(firebase.auth, email, password)
      toast({ title: "Welcome Back!", description: "Signed in successfully." })
      router.push("/feed")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign In Failed", description: error.message || "Invalid credentials." })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firebase?.auth || !firebase?.firestore) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const displayName = formData.get("displayName") as string
    const username = email.split('@')[0]

    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth")
      const userCredential = await createUserWithEmailAndPassword(firebase.auth, email, password)
      
      await updateProfile(userCredential.user, { displayName })

      const userDocRef = doc(firebase.firestore, "users", userCredential.user.uid)
      const userData = {
        id: userCredential.user.uid,
        username,
        email,
        displayName,
        bio: "New trybe member",
        profilePictureUrl: `https://picsum.photos/seed/${userCredential.user.uid}/200/200`,
        passes: 4
      }
      
      setDocumentNonBlocking(userDocRef, userData, { merge: true })

      toast({ title: "Account Created!", description: "Welcome to Trybe." })
      router.push("/feed")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign Up Failed", description: error.message })
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!firebase?.auth || !firebase?.firestore) return
    setLoading(true)
    try {
      const userCredential = await initiateGoogleSignIn(firebase.auth)
      const user = userCredential.user

      const userDocRef = doc(firebase.firestore, "users", user.uid)
      const userSnap = await getDoc(userDocRef)
      
      if (!userSnap.exists()) {
        const userData = {
          id: user.uid,
          username: user.email?.split('@')[0] || user.uid,
          email: user.email || "",
          displayName: user.displayName || "Trybe Member",
          bio: "New trybe member",
          profilePictureUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
          passes: 4
        }
        setDocumentNonBlocking(userDocRef, userData, { merge: true })
      }
      
      toast({ title: "Welcome!", description: `Signed in as ${user.displayName || user.email}` })
      router.push("/feed")
    } catch (error: any) {
      let title = "Google Sign In Failed"
      let description = error.message

      if (error.code === 'auth/unauthorized-domain') {
        title = "Domain Not Authorized"
        description = "This domain isn't authorized for sign-in. Please add it to your Authorized Domains in the Firebase Console (Authentication > Settings)."
      } else if (error.code === 'auth/popup-blocked') {
        title = "Popup Blocked"
        description = "The sign-in popup was blocked by your browser. Please allow popups or try again."
      }

      toast({ 
        variant: "destructive", 
        title, 
        description,
        duration: 8000
      })
      setLoading(false)
    }
  }

  if (!mounted) return null

  const SocialButtons = () => (
    <div className="space-y-4 w-full">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <Button 
        type="button" 
        variant="outline" 
        className="w-full rounded-full h-12 font-bold flex items-center justify-center gap-2 border-white/10 hover:bg-secondary/20"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.01h2.64c1.54-1.42 2.43-3.5 2.43-5.44z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 flex justify-start">
        <Link href="/">
          <Button variant="ghost" className="rounded-full gap-2 font-black uppercase tracking-widest text-[10px]">
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </Button>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/studio-586593360-b85c9.firebasestorage.app/o/Logo.png?alt=media&token=57a9cbe8-ed9d-4be0-aded-c12a0fde9150" 
              alt="Trybe Logo" 
              className="h-16 mx-auto"
            />
            <p className="text-muted-foreground">Discover community events or lead your own.</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-full h-12 p-1 bg-secondary/40">
              <TabsTrigger value="login" className="rounded-full">Login</TabsTrigger>
              <TabsTrigger value="register" className="rounded-full">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn}>
                <Card className="border-none bg-card/40 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Welcome Back</CardTitle>
                    <CardDescription>Enter your credentials to access your account.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="login-email" name="email" type="email" placeholder="name@example.com" className="pl-10 bg-secondary/30 border-none h-12" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="login-password" name="password" type="password" placeholder="••••••••" className="pl-10 bg-secondary/30 border-none h-12" required />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-4">
                    <Button type="submit" className="w-full rounded-full h-12 font-bold" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Sign In"}
                    </Button>
                    <SocialButtons />
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp}>
                <Card className="border-none bg-card/40 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Create Account</CardTitle>
                    <CardDescription>Join our growing community today.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="reg-name" name="displayName" placeholder="John Doe" className="pl-10 bg-secondary/30 border-none h-12" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="reg-email" name="email" type="email" placeholder="name@example.com" className="pl-10 bg-secondary/30 border-none h-12" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="reg-password" name="password" type="password" placeholder="••••••••" className="pl-10 bg-secondary/30 border-none h-12" required />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-4">
                    <Button type="submit" className="w-full rounded-full h-12 font-bold bg-primary hover:bg-primary/90" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <><Sparkles className="w-4 h-4 mr-2" /> Create Profile</>}
                    </Button>
                    <SocialButtons />
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
