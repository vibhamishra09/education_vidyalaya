import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Join We for free! Create your account to start learning and teaching with peers. Connect with study rooms, share skills, and earn We Coins.",
  keywords: [
    "sign up",
    "register",
    "create account",
    "join we",
    "peer learning",
    "free education",
  ],
  openGraph: {
    title: "Sign Up | We",
    description: "Join We and start your peer-to-peer learning journey today!",
    url: "/sign-up",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Join We",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign Up | We",
    description: "Join We and start your peer-to-peer learning journey!",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/sign-up",
  },
};

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background selection:bg-primary-500/30">
      {/* Dynamic Mesh Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0a0a0a]" /> {/* Deep dark base */}
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-primary-600/20 blur-[120px] animate-float opacity-60" style={{ animationDuration: '20s', animationDelay: '-2s' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-secondary-600/20 blur-[120px] animate-float opacity-60" style={{ animationDuration: '25s', animationDelay: '-7s' }} />
        <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-primary-400/10 blur-[100px] animate-pulse opacity-30" />
        
        {/* Animated Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        {/* Grainy Texture */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Navbar - Ultra Glassmorphism */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/20 backdrop-blur-2xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Image
                  src="/we-main-logo.svg"
                  alt="We"
                  width={110}
                  height={110}
                  className="object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
                  priority
                />
                <div className="absolute -inset-2 bg-primary-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </Link>
            
            <div className="flex items-center gap-6">
              <Link
                href="/browse"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors py-2"
              >
                Explore Rooms
              </Link>
              <Link
                href="/sign-in"
                className="relative group px-5 py-2.5 rounded-xl overflow-hidden font-bold transition-all duration-300"
              >
                <div className="absolute inset-0 bg-secondary-500/10 group-hover:bg-secondary-500 transition-all duration-300" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-secondary-500" />
                <span className="relative text-secondary-500 group-hover:text-black text-sm">Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center container mx-auto px-6 pt-24 lg:pt-0 gap-16 lg:gap-24 overflow-visible">
        
        {/* Left Section - Hero Branding */}
        <section className="w-full lg:w-[45%] flex flex-col justify-center animate-slide-in-left">
          <div className="relative">
            {/* Floating Branded Element - Study */}
            <div className="absolute -top-16 -left-4 w-24 h-24 bg-gradient-to-br from-primary-400 to-green-600 rounded-3xl flex items-center justify-center shadow-2xl animate-float opacity-80 backdrop-blur-md border border-white/20 rotate-12 hidden lg:flex" style={{ animationDuration: '8s' }}>
              <span className="text-4xl">📚</span>
            </div>
            
            {/* Floating Branded Element - Community */}
            <div className="absolute bottom-4 -right-12 w-20 h-20 bg-gradient-to-br from-secondary-400 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl animate-float opacity-80 backdrop-blur-md border border-white/20 -rotate-12 hidden lg:flex" style={{ animationDuration: '9s', animationDelay: '-4s' }}>
              <span className="text-3xl">👥</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary-500"></span>
              </span>
              <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] font-tagline">Network Stable</span>
            </div>
            
            <h1 className="text-6xl lg:text-8xl font-black mb-8 leading-[0.9] tracking-tighter text-white">
              Join the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-400 to-primary-400 drop-shadow-[0_0_30px_rgba(0,140,210,0.3)]">Circle of Peer</span>
            </h1>
            
            <p className="text-xl text-white/60 mb-12 leading-relaxed max-w-lg font-medium">
              Step into the future of education. Create your account to start sharing knowledge, earning rewards, and learning without limits.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              {[
                { 
                  title: "Global Reach", 
                  desc: "Connect with peers across every timezone", 
                  color: "text-secondary-400"
                },
                { 
                  title: "Reward System", 
                  desc: "Earn while you learn and contribute", 
                  color: "text-primary-400"
                }
              ].map((item, idx) => (
                <div key={idx} className="group flex flex-col gap-3">
                  <div className="h-0.5 w-12 bg-white/10 group-hover:w-full group-hover:bg-gradient-to-r group-hover:from-white/40 group-hover:to-transparent transition-all duration-500" />
                  <h3 className={`text-lg font-bold ${item.color}`}>{item.title}</h3>
                  <p className="text-sm text-white/40 leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Premium Social Proof */}
            <div className="mt-16 flex items-center gap-6 pt-8 border-t border-white/5">
              <div className="flex -space-x-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="relative w-12 h-12 rounded-2xl border-2 border-background/50 bg-white/10 overflow-hidden ring-4 ring-black/20 hover:scale-110 hover:-translate-y-2 transition-all duration-300 cursor-pointer group">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i*123}`} alt="user" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-secondary-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm text-white/40 font-medium">Be the next among</p>
                <p className="text-lg font-bold text-white leading-none">10,000+ Visionaries</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section - Signup form */}
        <section className="w-full lg:w-[45%] flex items-center justify-center animate-slide-in-right relative">
          {/* Decorative aura */}
          <div className="absolute inset-0 bg-secondary-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="w-full max-w-[460px] relative">
            <div className="relative group">
              {/* Animated Border */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-white/10 via-white/40 to-white/10 rounded-[2.5rem] opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              
              <div className="relative bg-[#0d0d0d]/80 backdrop-blur-3xl rounded-[2.5rem] p-8 lg:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-white/10">
                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-4xl font-black text-white tracking-tight mb-3">Create Account</h2>
                  <p className="text-white/40 font-medium flex items-center gap-2 justify-center lg:justify-start">
                    Member already? 
                    <Link href="/sign-in" className="text-secondary-400 hover:text-secondary-300 font-black transition-all hover:underline underline-offset-4">
                      Re-enter Portal
                    </Link>
                  </p>
                </div>

                <div className="clerk-container rounded-2xl overflow-hidden shadow-inner bg-black/20">
                  <SignUp
                    forceRedirectUrl="/dashboard"
                    signInUrl="/sign-in"
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        cardBox: "shadow-none border-none p-0 w-full",
                        card: "bg-transparent shadow-none border-none p-0 w-full",
                        header: "hidden",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        formButtonPrimary:
                          "bg-gradient-to-r from-secondary-500 to-primary-500 hover:from-secondary-400 hover:to-primary-400 text-black font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(0,140,210,0.3)] transition-all duration-300 transform active:scale-95 text-sm uppercase tracking-[0.2em]",
                        socialButtonsBlockButton:
                          "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-2xl h-14 shadow-xl",
                        socialButtonsBlockButtonText: "text-white font-bold text-sm",
                        socialButtonsBlockButtonArrow: "text-white/40",
                        formFieldInput:
                          "bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-secondary-500/50 focus:bg-white/10 transition-all duration-500 rounded-2xl h-14 font-medium px-5",
                        formFieldLabel: "text-white/60 font-bold text-xs mb-2 ml-2 uppercase tracking-widest",
                        footer: "hidden",
                        dividerLine: "bg-white/5",
                        dividerText: "text-white/20 font-black text-[10px] tracking-[0.3em] uppercase py-4",
                        identityPreview: "bg-white/5 rounded-2xl p-4 border border-white/10",
                        identityPreviewText: "text-white font-bold",
                        identityPreviewEditButton: "text-secondary-400 hover:text-secondary-300",
                        alternativeMethodsBlockButton: "text-secondary-400 font-bold hover:text-secondary-300",
                      },
                      layout: {
                        socialButtonsPlacement: "bottom",
                        socialButtonsVariant: "blockButton",
                      }
                    }}
                  />
                </div>
                
                <div className="mt-10">
                  <p className="text-[10px] text-white/30 text-center leading-relaxed font-bold uppercase tracking-widest">
                    By accessing the portal, you accept our <br />
                    <Link href="/terms" className="text-white/60 hover:text-white underline underline-offset-4">Terms of service</Link> & <Link href="/privacy" className="text-white/60 hover:text-white underline underline-offset-4">Privacy protocol</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Subtle bottom decorative element */}



    </div>
  );
}
