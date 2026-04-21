import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your We account. Continue your learning journey with peer-to-peer education, study rooms, and skill sharing.",
  keywords: [
    "sign in",
    "login",
    "we login",
    "peer learning login",
  ],
  openGraph: {
    title: "Sign In | We",
    description: "Sign in to continue your learning journey on We.",
    url: "/sign-in",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sign In | We",
    description: "Sign in to continue your learning journey.",
  },
  alternates: {
    canonical: "/sign-in",
  },
};

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background selection:bg-primary-500/30">
      {/* Dynamic Mesh Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0a0a0a]" /> {/* Deep dark base */}
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-primary-600/20 blur-[120px] animate-float opacity-60" style={{ animationDuration: '15s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-secondary-600/20 blur-[120px] animate-float opacity-60" style={{ animationDuration: '18s', animationDelay: '-5s' }} />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-primary-400/10 blur-[100px] animate-pulse opacity-40" />
        
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
                href="/sign-up"
                className="relative group px-5 py-2.5 rounded-xl overflow-hidden font-bold transition-all duration-300"
              >
                <div className="absolute inset-0 bg-primary-500/10 group-hover:bg-primary-500 transition-all duration-300" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-primary-500" />
                <span className="relative text-primary-500 group-hover:text-black text-sm">Join Free</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center container mx-auto px-6 pt-24 lg:pt-0 gap-16 lg:gap-24 overflow-visible">
        
        {/* Left Section - Hero Branding */}
        <section className="w-full lg:w-[45%] flex flex-col justify-center animate-slide-in-left">
          <div className="relative">
            {/* Floating Branded Element - Coins */}
            <div className="absolute -top-12 -left-8 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl animate-float opacity-80 backdrop-blur-md border border-white/20 rotate-12 hidden lg:flex">
              <span className="text-3xl">🪙</span>
            </div>
            
            {/* Floating Branded Element - Video */}
            <div className="absolute bottom-12 -right-8 w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl animate-float opacity-80 backdrop-blur-md border border-white/20 -rotate-6 hidden lg:flex" style={{ animationDelay: '-3s' }}>
              <span className="text-2xl">📽️</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] font-tagline">Portal Active</span>
            </div>
            
            <h1 className="text-6xl lg:text-8xl font-black mb-8 leading-[0.9] tracking-tighter text-white">
              Elevate <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400 drop-shadow-[0_0_30px_rgba(0,220,110,0.3)]">Your Potential</span>
            </h1>
            
            <p className="text-xl text-white/60 mb-12 leading-relaxed max-w-lg font-medium">
              We is where high-performers meet. Sign in to your exclusive dashboard and continue mastering skills with global peers.
            </p>

            <div className="flex flex-col gap-6">
              {[
                { title: "Smart Study Rooms", desc: "AI-enhanced peer learning sessions", color: "text-primary-400" },
                { title: "Skill Monetization", desc: "Turn your knowledge into We Coins", color: "text-secondary-400" }
              ].map((item, id) => (
                <div key={id} className="flex items-start gap-4 group cursor-default">
                  <div className={`mt-1 h-px w-8 bg-white/20 transition-all duration-300 group-hover:w-12 group-hover:bg-white/60`} />
                  <div>
                    <h3 className={`text-lg font-bold mb-1 ${item.color}`}>{item.title}</h3>
                    <p className="text-sm text-white/40">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Premium Social Proof */}
            <div className="mt-16 flex items-center gap-6 pt-8 border-t border-white/5">
              <div className="flex -space-x-4">
                {[5,6,7,8].map(i => (
                  <div key={i} className="relative w-12 h-12 rounded-2xl border-2 border-background/50 bg-white/10 overflow-hidden ring-4 ring-black/20 hover:scale-110 hover:-translate-y-2 transition-all duration-300 cursor-pointer group">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i*567}`} alt="user" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-primary-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm text-white/40 font-medium">Trusted by</p>
                <p className="text-lg font-bold text-white leading-none">10,000+ Students</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section - Login form */}
        <section className="w-full lg:w-[45%] flex items-center justify-center animate-slide-in-right relative">
          {/* Decorative aura */}
          <div className="absolute inset-0 bg-primary-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="w-full max-w-[460px] relative">
            <div className="relative group">
              {/* Animated Border */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-white/10 via-white/40 to-white/10 rounded-[2.5rem] opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              
              <div className="relative bg-[#0d0d0d]/80 backdrop-blur-3xl rounded-[2.5rem] p-8 lg:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-white/10">
                <div className="mb-10">
                  <h2 className="text-4xl font-black text-white tracking-tight mb-3">Welcome Back</h2>
                  <p className="text-white/40 font-medium flex items-center gap-2">
                    New here? 
                    <Link href="/sign-up" className="text-primary-400 hover:text-primary-300 font-black transition-all hover:underline underline-offset-4">
                      Create Visionary Account
                    </Link>
                  </p>
                </div>

                <div className="clerk-container rounded-2xl overflow-hidden shadow-inner bg-black/20">
                  <SignIn
                    forceRedirectUrl="/dashboard"
                    signUpUrl="/sign-up"
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        cardBox: "shadow-none border-none p-0 w-full",
                        card: "bg-transparent shadow-none border-none p-0 w-full",
                        header: "hidden",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        formButtonPrimary:
                          "bg-primary-500 hover:bg-primary-400 text-black font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(0,220,110,0.3)] transition-all duration-300 transform active:scale-95 text-base uppercase tracking-widest",
                        socialButtonsBlockButton:
                          "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-2xl h-14 shadow-xl",
                        socialButtonsBlockButtonText: "text-white font-bold text-sm",
                        socialButtonsBlockButtonArrow: "text-white/40",
                        formFieldInput:
                          "bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-primary-500/50 focus:bg-white/10 transition-all duration-500 rounded-2xl h-14 font-medium px-5",
                        formFieldLabel: "text-white/60 font-bold text-xs mb-2 ml-2 uppercase tracking-widest",
                        footer: "hidden",
                        dividerLine: "bg-white/5",
                        dividerText: "text-white/20 font-black text-[10px] tracking-[0.3em] uppercase py-4",
                        identityPreview: "bg-white/5 rounded-2xl p-4 border border-white/10",
                        identityPreviewText: "text-white font-bold",
                        identityPreviewEditButton: "text-primary-400 hover:text-primary-300",
                        alternativeMethodsBlockButton: "text-primary-400 font-bold hover:text-primary-300",
                        formFieldAction: "text-primary-400 hover:text-primary-300 font-bold text-xs transition-colors",
                      },
                      layout: {
                        socialButtonsPlacement: "bottom",
                        socialButtonsVariant: "blockButton",
                      }
                    }}
                  />
                </div>
                
                <div className="mt-10 flex flex-col items-center gap-4">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  <p className="text-[10px] text-white/30 tracking-[0.2em] font-bold uppercase text-center flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary-500" />
                    Military Grade Encryption
                    <span className="w-1 h-1 rounded-full bg-primary-500" />
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
