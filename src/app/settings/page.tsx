"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  ChevronLeft, 
  Bell, 
  Shield, 
  Eye, 
  LogOut, 
  Trash2, 
  FileText, 
  FileCheck, 
  LifeBuoy, 
  ChevronRight,
  ShieldAlert,
  Moon,
  Sun,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOutUser, useAuth, useUser, useFirestore, addDocumentNonBlocking } from "@/firebase"
import { collection, doc, deleteDoc } from "firebase/firestore"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    setMounted(true)
    const theme = localStorage.getItem('trybe-theme') || 'dark'
    setIsDarkMode(theme === 'dark')
  }, [])

  useEffect(() => {
    if (mounted && !isUserLoading && !user) {
      router.push("/auth")
    }
  }, [user, isUserLoading, router, mounted])

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked)
    const newTheme = checked ? 'dark' : 'light'
    localStorage.setItem('trybe-theme', newTheme)
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast({
      title: `${checked ? 'Dark' : 'Light'} Mode Enabled`,
      description: "We've adjusted the interface to your preference.",
    })
  }

  const handleSignOut = () => {
    if (!auth) return
    toast({ title: "Signing out...", description: "See you soon in the trybe." })
    signOutUser(auth)
  }

  const handleDeleteAccount = async () => {
    if (!user || !firestore || !auth) return
    try {
      toast({ title: "Deleting Account...", description: "Removing your data from Trybe." })
      const userRef = doc(firestore, "users", user.uid)
      await deleteDoc(userRef)
      try {
        await user.delete()
      } catch {
        await signOutUser(auth)
      }
      toast({ title: "Account Deleted", description: "Your profile and data have been removed." })
      router.push("/")
    } catch (error: any) {
      console.warn("Account delete error:", error)
      toast({ variant: "destructive", title: "Action Failed", description: error.message || "Failed to delete account." })
    }
  }

  const firestore = useFirestore()

  const handleSendSupport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const message = formData.get("message") as string

    if (firestore) {
      addDocumentNonBlocking(collection(firestore, "support_tickets"), {
        userId: user?.uid || null,
        name: name || user?.displayName || "Anonymous",
        email: email || user?.email || "",
        message,
        createdAt: new Date().toISOString(),
        status: "open",
      })
    }

    toast({
      title: "Message Sent",
      description: "Our support team has received your request and will get back to you shortly.",
    })
    setIsSupportOpen(false)
  }

  if (!mounted || isUserLoading) return null

  return (
    <div className="min-h-screen bg-background text-[15px]">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><ChevronLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="text-2xl font-headline font-bold">Settings</h1>
        </div>

        <div className="space-y-6 pb-32">
          <Card className="border-none bg-card/40 backdrop-blur-sm overflow-hidden rounded-[1.5rem]">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription className="text-[12px] font-medium uppercase tracking-widest opacity-70">Customize how Trybe looks for you.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                <SettingItem 
                  icon={isDarkMode ? Moon : Sun} 
                  title="Dark Mode" 
                  description="Choose a high-contrast or light theme" 
                  action={<Switch checked={isDarkMode} onCheckedChange={toggleTheme} />} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-card/40 backdrop-blur-sm overflow-hidden rounded-[1.5rem]">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg">Preferences</CardTitle>
              <CardDescription className="text-[12px] font-medium uppercase tracking-widest opacity-70">Manage your notifications and privacy.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                <SettingItem 
                  icon={Bell} 
                  title="Push Notifications" 
                  description="Updates about Trybes you joined" 
                  action={<Switch defaultChecked />} 
                />
                <SettingItem 
                  icon={Eye} 
                  title="Profile Visibility" 
                  description="Let others see your profile in chats" 
                  action={<Switch defaultChecked />} 
                />
                <SettingItem 
                  icon={Shield} 
                  title="Privacy Mode" 
                  description="Hide your exact location on the map" 
                  action={<Switch />} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-card/40 backdrop-blur-sm overflow-hidden rounded-[1.5rem]">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg">Support & Legal</CardTitle>
              <CardDescription className="text-[12px] font-medium uppercase tracking-widest opacity-70">Help center and legal documentation.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                
                {/* Terms of Service */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="w-full flex items-center gap-4 p-6 hover:bg-white/5 transition-colors text-left group">
                      <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                        <FileCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold">Terms of Service</p>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">User agreement and rules</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-xl bg-card border-white/5 p-0">
                    <ScrollArea className="h-full">
                      <div className="p-8 space-y-6">
                        <SheetHeader className="text-left space-y-2">
                          <SheetTitle className="text-2xl font-black">Terms of Service</SheetTitle>
                          <SheetDescription className="text-[11px] font-black text-primary uppercase tracking-widest">Last Updated: November 13, 2025</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground font-medium">
                          <p>Welcome to Trybe! These Terms of Service ("Terms") govern your access to and use of the Trybe mobile application, website, and services (collectively, the "Service"). By accessing or using Trybe, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Service.</p>
                          
                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">1. Acceptance of Terms</h4>
                            <p>By creating an account or using Trybe, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. These Terms apply to all users, including visitors, registered users, and premium subscribers.</p>
                            <p>You must be at least 18 years old to use Trybe. By using our Service, you represent and warrant that you meet this age requirement.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">2. Account Registration and Responsibilities</h4>
                            <p><strong>Account Creation:</strong> To use certain features of Trybe, you must register for an account. You agree to provide accurate information, maintain the security of your credentials, and accept responsibility for all activities under your account.</p>
                            <p><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account password. Trybe will not be liable for any loss or damage arising from your failure to protect your credentials.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">3. User Conduct and Prohibited Activities</h4>
                            <p>When using Trybe, you agree NOT to post false or misleading info, share illegal or harmful content, harass others, impersonate any person, or attempt to gain unauthorized access to the Service. Use of automated systems (bots, scrapers) without permission is strictly prohibited.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">4. Content and Intellectual Property</h4>
                            <p><strong>Your Content:</strong> You retain ownership of any content you post. By posting, you grant Trybe a worldwide license to use and distribute your content in connection with operating the Service.</p>
                            <p><strong>Trybe's Intellectual Property:</strong> The Service design, graphics, and code are owned by Trybe and protected by law.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">5. Events and Community Guidelines</h4>
                            <p><strong>Event Creation:</strong> Creators must provide accurate info and host events in safe, legal locations. <strong>Event Participation:</strong> Trybe is a platform only; we do not organize or supervise events. Users participate at their own risk.</p>
                            <p><strong>Safety:</strong> Exercise caution when meeting other users. Meet in public places and trust your instincts.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">6. Premium Subscriptions and Payments</h4>
                            <p>Subscriptions automatically renew unless cancelled. Fees are non-refundable except as required by law. You may cancel at any time through account settings.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">7. Termination and Suspension</h4>
                            <p>Trybe reserves the right to suspend or terminate your account at any time for violation of Terms, fraudulent activity, or behavior that harms other users.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">8. Disclaimers and Limitation of Liability</h4>
                            <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES. TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRYBE SHALL NOT BE LIABLE FOR ANY INDIRECT OR CONSEQUENTIAL DAMAGES RESULTING FROM YOUR USE OF THE SERVICE.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">9. Indemnification</h4>
                            <p>You agree to indemnify Trybe from any claims or expenses arising out of your use of the Service or violation of these Terms.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">10. Dispute Resolution</h4>
                            <p>These Terms are governed by the laws of the State of California. Any disputes shall be resolved through binding arbitration.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">11. Changes to Terms</h4>
                            <p>Trybe reserves the right to modify these Terms at any time. Continued use of the Service after changes indicates acceptance.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">12. Contact Information</h4>
                            <p>If you have any questions about these Terms, please contact us.</p>
                          </section>

                          <p className="pt-4 font-bold text-foreground">Acknowledgment: By using Trybe, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
                        </div>
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>

                {/* Privacy Policy */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="w-full flex items-center gap-4 p-6 hover:bg-white/5 transition-colors text-left group">
                      <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold">Privacy Policy</p>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">How we handle your data</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-xl bg-card border-white/5 p-0">
                    <ScrollArea className="h-full">
                      <div className="p-8 space-y-6">
                        <SheetHeader className="text-left space-y-2">
                          <SheetTitle className="text-2xl font-black">Privacy Policy</SheetTitle>
                          <SheetDescription className="text-[11px] font-black text-primary uppercase tracking-widest">Last Updated: November 13, 2025</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground font-medium">
                          <p>At Trybe, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.</p>
                          
                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">1. Information We Collect</h4>
                            <p><strong>Personal Information:</strong> We collect info you provide directly: name, age, email, photos, location data (city, state), interests, and bio.</p>
                            <p><strong>Usage Information:</strong> We automatically collect device info, log data, event history, and geolocation data (with permission).</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">2. How We Use Your Information</h4>
                            <p>We use info to manage accounts, facilitate events, enable messaging, personalize recommendations, send notifications, and improve our services.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">3. Information Sharing and Disclosure</h4>
                            <p><strong>With Other Users:</strong> Profile data and photos may be visible based on settings.</p>
                            <p><strong>Service Providers:</strong> We share info with hosting (Firebase), analytics, and payment processors.</p>
                            <p><strong>Legal Requirements:</strong> We may disclose info if required by law or valid legal requests.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">4. Data Security</h4>
                            <p>We implement technical measures like encryption and authentication. However, no method is 100% secure.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">5. Your Privacy Rights</h4>
                            <p>You have the right to access, correct, or delete your data. To exercise these rights, please contact us at privacy@trybe.app.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">6. Data Retention</h4>
                            <p>We retain info as long as needed. Upon account deletion, we delete or anonymize info within 90 days.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">7. Children's Privacy</h4>
                            <p>Trybe is not intended for users under 18. We do not knowingly collect data from children.</p>
                          </section>

                          <section className="space-y-2">
                            <h4 className="font-bold text-foreground">8. California & European Rights</h4>
                            <p><strong>CCPA:</strong> California residents have the right to know what data is collected and request deletion.</p>
                            <p><strong>GDPR:</strong> EEA/UK users have rights to access, rectification, and erasure under GDPR.</p>
                          </section>
                        </div>
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>

                {/* Important Notice */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="w-full flex items-center gap-4 p-6 hover:bg-white/5 transition-colors text-left group">
                      <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold">Important Notice</p>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Platform role & responsibilities</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-xl bg-card border-white/5 p-0">
                    <ScrollArea className="h-full">
                      <div className="p-8 space-y-6">
                        <SheetHeader className="text-left space-y-2">
                          <SheetTitle className="text-2xl font-black">Important Notice</SheetTitle>
                          <SheetDescription className="text-[11px] font-black text-primary uppercase tracking-widest">Please Read Carefully</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground font-medium">
                          <p>Welcome to our community! Before you start exploring, creating, or joining events, please take a moment to read this important notice regarding how our platform works and your role within it.</p>
                          
                          <section className="space-y-3">
                            <h4 className="font-bold text-foreground flex items-center gap-2">
                              <div className="w-1 h-4 bg-primary rounded-full" />
                              Your Platform, Your Judgment
                            </h4>
                            <p>This app is designed as a facilitation tool. We provide the digital space for you to discover new experiences and connect with others. However, the decision to participate rests entirely with you.</p>
                            <p><strong>Exercise Self-Judgment:</strong> Whether you are creating an event or hitting the "Join" button, we urge you to use your best judgment. Research the location, vet the details, and trust your instincts.</p>
                            <p><strong>Personal Choice:</strong> You are the primary guardian of your own safety and experience. If a situation or a user interaction feels uncomfortable, you have the full power to decline or withdraw.</p>
                          </section>

                          <section className="space-y-3">
                            <h4 className="font-bold text-foreground flex items-center gap-2">
                              <div className="w-1 h-4 bg-primary rounded-full" />
                              Liability & Responsibility
                            </h4>
                            <p>By using this platform, you acknowledge and agree to the following:</p>
                            <ul className="list-disc pl-5 space-y-2">
                              <li><strong>No Event Oversight:</strong> The app does not organize, manage, or supervise the events listed. We do not verify the accuracy of event descriptions or the physical safety of event locations.</li>
                              <li><strong>User Behavior:</strong> We are not responsible for the conduct, actions, or omissions of any user—whether they are an event creator or a participant. Interactions occur at your own risk.</li>
                              <li><strong>Assumption of Risk:</strong> The app is not liable for any injury, loss, or dispute that may occur during or as a result of an event organized through this platform.</li>
                            </ul>
                          </section>

                          <section className="space-y-3">
                            <h4 className="font-bold text-foreground flex items-center gap-2">
                              <div className="w-1 h-4 bg-primary rounded-full" />
                              Stay Safe
                            </h4>
                            <p>We encourage all users to meet in public spaces, share their plans with friends or family, and treat every community member with respect. Your safety and the quality of your experiences are shaped by the choices you make.</p>
                          </section>
                        </div>
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>

                {/* Help & Support */}
                <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                  <DialogTrigger asChild>
                    <button className="w-full flex items-center gap-4 p-6 hover:bg-white/5 transition-colors text-left group">
                      <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                        <LifeBuoy className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold">Help & Support</p>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Contact our support team</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[450px] bg-card/95 backdrop-blur-3xl border-white/10 rounded-[2rem] p-8">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-headline font-black">Help & Support</DialogTitle>
                      <DialogDescription className="text-[12px] font-medium">
                        Have a question or need help? Send us a message and we'll get back to you as soon as possible.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSendSupport} id="support-ticket-form" className="space-y-5 py-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase font-black tracking-widest text-muted-foreground ml-1">Name</Label>
                        <Input name="name" defaultValue={user?.displayName || ""} placeholder="Your name" className="bg-secondary/30 border-none rounded-xl h-12 text-sm px-4" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase font-black tracking-widest text-muted-foreground ml-1">Email</Label>
                        <Input name="email" defaultValue={user?.email || ""} type="email" placeholder="your.email@example.com" className="bg-secondary/30 border-none rounded-xl h-12 text-sm px-4" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase font-black tracking-widest text-muted-foreground ml-1">Message</Label>
                        <Textarea name="message" placeholder="Tell us more..." className="bg-secondary/30 border-none rounded-xl min-h-[120px] text-sm resize-none p-4" required />
                      </div>
                    </form>
                    <DialogFooter className="flex-row gap-4 pt-4">
                      <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setIsSupportOpen(false)}>Cancel</Button>
                      <Button type="submit" form="support-ticket-form" className="flex-1 rounded-xl h-12 font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20">Send Message</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-card/40 backdrop-blur-sm overflow-hidden rounded-[1.5rem]">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg text-destructive">Account Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-4 p-6 hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold">Log Out</p>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Sign out on this device</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-30" />
                </button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center gap-4 p-6 hover:bg-destructive/10 transition-colors text-left group">
                      <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20">
                        <Trash2 className="w-5 h-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold text-destructive">Delete Account</p>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Permanently remove your data</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-destructive opacity-30" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-white/10 rounded-[2rem]">
                    <AlertDialogHeader>
                      <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center mb-2">
                        <ShieldAlert className="w-6 h-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-xl font-headline font-black">Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm">
                        This action cannot be undone. This will permanently delete your account
                        and remove all your Trybes and community connections from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-12 font-black uppercase tracking-widest text-[11px]">
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function SettingItem({ icon: Icon, title, description, action }: any) {
  return (
    <div className="flex items-center gap-4 p-6">
      <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-base font-bold">{title}</p>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">{description}</p>
      </div>
      <div>{action}</div>
    </div>
  )
}
