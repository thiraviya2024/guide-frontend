"use client"

import { motion } from "framer-motion"
import {
  Activity,
  ArrowRight,
  Brain,
  FileScan,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/medical/brand-logo"
import { ThemeToggle } from "@/components/medical/theme-toggle"
import { BackendStatusPill } from "@/components/medical/backend-status-pill"
import { MedicalHeroAnimation } from "@/components/medical/medical-hero-animation"
import { MODULE_META } from "@/lib/medical"
import { CLINICAL_MODULES } from "@/types"

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

const FEATURES = [
  {
    icon: FileScan,
    title: "Universal Report Intake",
    body: "Upload any lab report — PDF, image or spreadsheet. The backend detects the report type and routes it to the right clinical engine.",
  },
  {
    icon: Brain,
    title: "Dual-AI Clinical Reasoning",
    body: "Groq and Gemini analyze results server-side and produce an explanation with a consensus and physician-review flag.",
  },
  {
    icon: Activity,
    title: "Eight Clinical Modules",
    body: "Lipid, CBC, LFT, KFT, Thyroid, Diabetes, Vitamins and Electrolytes — each with real reference ranges and rules.",
  },
  {
    icon: Users,
    title: "Roles For Everyone",
    body: "Purpose-built experiences for patients, doctors and administrators, from AI intake to dataset governance.",
  },
  {
    icon: ShieldCheck,
    title: "Secrets Stay Server-Side",
    body: "The browser only knows the API base URL. Database, Groq and Gemini credentials never leave the backend.",
  },
  {
    icon: Stethoscope,
    title: "Decision Support, Not Diagnosis",
    body: "Every result is framed as guidance and clearly recommends professional medical review.",
  },
]

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 ls-glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLogo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Platform
            </a>
            <a href="#modules" className="transition-colors hover:text-foreground">
              Clinical Modules
            </a>
            <a href="#security" className="transition-colors hover:text-foreground">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/auth" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:pb-24 lg:pt-20">
          <div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
              <BackendStatusPill />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="mt-5 text-pretty text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl"
            >
              LIFE <span className="text-primary">SAVER</span>
              <span className="mt-2 block text-2xl font-semibold text-muted-foreground sm:text-3xl">
                Medical Intelligence Platform
              </span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="mt-5 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground"
            >
              Understand your health. Connect with care. Make informed decisions.
            </motion.p>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={3}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <a href="/auth" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#features" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "gap-2")}>
                <Sparkles className="h-4 w-4" /> Explore Platform
              </a>
            </motion.div>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={4}
              className="mt-6 text-sm text-muted-foreground"
            >
              Intelligent Healthcare. Connected Care.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="rounded-3xl border border-border bg-card/60 p-4 shadow-xl">
              <MedicalHeroAnimation className="aspect-square w-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            One platform, from intake to insight
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            LIFE SAVER connects patients, doctors and administrators to a single AI-assisted clinical backend.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-2 hover:shadow-md"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Eight clinical modules, live now
            </h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              Backed by real reference ranges and clinical rules served from the FastAPI engine.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CLINICAL_MODULES.map((m) => {
              const meta = MODULE_META[m]
              return (
                <div
                  key={m}
                  className="rounded-2xl border border-border bg-card p-5 transition-shadow duration-300 animate-in fade-in hover:shadow-md"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{meta.short}</p>
                  <p className="mt-1 font-semibold text-foreground">{meta.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Security / CTA */}
      <section id="security" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="overflow-hidden rounded-3xl border border-border bg-primary px-6 py-12 text-primary-foreground sm:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <ShieldCheck className="mx-auto h-10 w-10 opacity-90" />
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Built for medical trust
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-primary-foreground/85">
              Analysis, AI reasoning and data all live on the secured backend. The browser never touches your database
              or AI provider keys — and results are always framed as decision support requiring physician review.
            </p>
            <div className="mt-8">
              <a href="/auth" className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "gap-2")}>
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <BrandLogo size={28} />
          <p className="text-center text-xs text-muted-foreground">
            For educational and decision-support purposes only. Not a substitute for professional medical advice.
          </p>
          <BackendStatusPill />
        </div>
      </footer>
    </div>
  )
}
