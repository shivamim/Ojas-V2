import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { z } from 'zod'
import apiClient from '@/api/client'
import {
  Stethoscope,
  Shield,
  Activity,
  Users,
  Clock,
  FileText,
  MessageSquare,
  BarChart3,
  ChevronDown,
  Menu,
  X,
  Heart,
  Lock,
  Zap,
  Globe,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  Bell,
  TrendingUp,
  Award,
  Send,
  Loader2,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

const features = [
  {
    icon: MessageSquare,
    title: 'WhatsApp Check-ins',
    description: 'Automated daily recovery monitoring via WhatsApp. No app installation required for patients.',
  },
  {
    icon: Activity,
    title: 'AI Risk Scoring',
    description: 'Real-time heuristic analysis detects pain, fever, swelling, and bleeding patterns automatically.',
  },
  {
    icon: BarChart3,
    title: 'Readmission Prediction',
    description: 'Predictive analytics based on age, surgery type, response rates, and missed check-ins.',
  },
  {
    icon: Bell,
    title: 'Smart Escalations',
    description: 'AI-powered triage with context-aware suggestions for critical patient alerts.',
  },
  {
    icon: FileText,
    title: 'NABH Compliance',
    description: 'Automated COP 7.3, 7.3.1, 7.4, and 5.6 reporting with one-click PDF generation.',
  },
  {
    icon: Users,
    title: 'Family Engagement',
    description: 'Automatic nudges to family members for missed check-ins and critical alerts.',
  },
]

const howItWorks = [
  {
    step: '01',
    icon: Users,
    title: 'Enroll Patient',
    description: 'Quick 2-minute enrollment captures patient details, surgery type, and discharge instructions.',
  },
  {
    step: '02',
    icon: MessageSquare,
    title: 'Automated Check-ins',
    description: 'Patients receive daily WhatsApp messages for 14 days with simple response buttons.',
  },
  {
    step: '03',
    icon: Activity,
    title: 'AI Analysis',
    description: 'Every response is analyzed in real-time for risk signals and engagement patterns.',
  },
  {
    step: '04',
    icon: Shield,
    title: 'Proactive Care',
    description: 'Critical alerts trigger immediate escalation with AI-suggested clinical actions.',
  },
]

const testimonials = [
  {
    quote: 'Ojas reduced our post-discharge complications by 40% in the first quarter. The AI alerts catch issues before they become emergencies.',
    author: 'Dr. Priya Sharma',
    role: 'Medical Director, Apollo Hospitals',
    avatar: 'PS',
  },
  {
    quote: 'The NABH compliance reports saved us countless hours during our accreditation audit. Everything was automated and audit-ready.',
    author: 'Rajesh Kumar',
    role: 'Quality Head, Fortis Healthcare',
    avatar: 'RK',
  },
  {
    quote: 'Our patients love the simplicity of WhatsApp check-ins. No apps to download, just familiar messaging that takes 30 seconds.',
    author: 'Dr. Anil Mehta',
    role: 'Chief Surgeon, Max Healthcare',
    avatar: 'AM',
  },
]

const faqs = [
  {
    question: 'How does the WhatsApp integration work?',
    answer: 'Ojas integrates with 360dialog WhatsApp Business API to send automated check-in messages. Patients simply reply to messages — no app installation needed. If WhatsApp is unavailable, the system gracefully falls back to SMS simulation.',
  },
  {
    question: 'Is patient data secure and compliant?',
    answer: 'All patient PII is encrypted at rest using AES-256 with PBKDF2HMAC key derivation. We comply with Indian healthcare data protection standards and NABH requirements. Our infrastructure uses SOC 2 Type II certified data centers.',
  },
  {
    question: 'What surgeries are supported?',
    answer: 'Ojas supports all major surgery types including orthopedic (knee/hip replacement), cardiac, general surgery, bariatric, and more. The AI scoring engine adapts risk thresholds based on surgery type and patient demographics.',
  },
  {
    question: 'How long is the monitoring period?',
    answer: 'The standard protocol is 14 days post-discharge, which covers the critical early recovery period. This aligns with NABH COP 7.3 requirements for post-discharge follow-up documentation.',
  },
  {
    question: 'Can we customize the check-in questions?',
    answer: 'Yes, hospital administrators can customize check-in questions, risk thresholds, and escalation workflows through the settings panel. Changes take effect for new enrollments immediately.',
  },
  {
    question: 'What happens when a critical alert is triggered?',
    answer: 'Critical alerts immediately notify the care team via the escalation dashboard and send WhatsApp alerts to family members. The AI coach provides suggested clinical actions based on the specific symptoms detected.',
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    price: '₹8,999',
    period: '/month',
    description: 'Perfect for small clinics and nursing homes',
    features: ['Up to 100 patients/month', '14-day monitoring protocol', 'Basic AI risk scoring', 'WhatsApp check-ins', 'Email support', 'Standard reports'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹24,999',
    period: '/month',
    description: 'For growing hospitals and surgical centers',
    features: ['Up to 500 patients/month', 'Advanced AI scoring', 'Family nudges', 'NABH compliance reports', 'Priority support', 'Custom check-in questions', 'API access'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Large hospital chains and healthcare networks',
    features: ['Unlimited patients', 'Multi-hospital dashboard', 'White-label option', 'SSO integration', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee'],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

// Contact form validation schema
const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  hospitalName: z.string().min(1, 'Hospital name is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

type ContactForm = z.infer<typeof contactSchema>

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
}

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true },
}

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4 },
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Contact form state
  const [form, setForm] = useState<Partial<ContactForm>>({})
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToSection = (href: string) => {
    setMobileMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  // Contact form handlers
  const validate = () => {
    const result = contactSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactForm, string>> = {}
      result.error.issues.forEach((e) => {
        const path = e.path[0] as keyof ContactForm
        fieldErrors[path] = e.message
      })
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleChange = (field: keyof ContactForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the errors in the form')
      return
    }
    setIsSubmitting(true)
    try {
      await apiClient.post('/contact', form)
      setSubmitted(true)
      toast.success("Message sent successfully! We will get back to you soon.")
      setForm({})
    } catch (err: any) {
      toast.error('Failed to send message. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md border-b shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="section-container">
          <nav className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[hsl(var(--ojas-600))] rounded-xl flex items-center justify-center">
                <Stethoscope className="text-white w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-foreground leading-tight">Ojas</span>
                <span className="hidden sm:inline text-xs text-muted-foreground ml-1.5">HealthTech</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button className="bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))]" asChild>
                <Link to="/login">Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-muted"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </nav>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-b shadow-lg overflow-hidden"
            >
              <div className="section-container py-4 space-y-2">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => scrollToSection(link.href)}
                    className="block w-full text-left px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="pt-2 flex flex-col gap-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button className="w-full bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))]" asChild>
                    <Link to="/login">Get Started</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ojas-50))] via-white to-[hsl(var(--ojas-100))] opacity-70" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-[hsl(var(--ojas-200))] rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[hsl(var(--ojas-300))] rounded-full blur-3xl opacity-20" />

        <div className="section-container relative">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--ojas-100))] text-[hsl(var(--ojas-700))] rounded-full text-sm font-medium mb-8">
                <Award size={16} />
                NABH-Compliant Post-Discharge Monitoring
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
                Reduce Readmissions.
                <br />
                <span className="bg-gradient-to-r from-[hsl(var(--ojas-600))] to-[hsl(var(--ojas-800))] bg-clip-text text-transparent">
                  Improve Recovery.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Ojas automates post-discharge patient monitoring through AI-powered WhatsApp check-ins,
                predictive risk scoring, and NABH-compliant reporting.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Button
                  size="lg"
                  className="bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))] px-8 py-6 text-base transition-all duration-200 active:scale-[0.98]"
                  asChild
                >
                  <Link to="/login">
                    Start Free Trial <ArrowRight size={18} className="ml-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-base border-2 border-[hsl(var(--ojas-600))] text-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-50))] transition-all duration-200 active:scale-[0.98]"
                  onClick={() => scrollToSection('#how-it-works')}
                >
                  See How It Works
                </Button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            >
              {[
                { value: '40%', label: 'Fewer Complications' },
                { value: '14 Days', label: 'Monitoring Protocol' },
                { value: '92%', label: 'Patient Response Rate' },
                { value: 'NABH', label: 'Compliant Reports' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-[hsl(var(--ojas-700))]">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:block">
          <button onClick={() => scrollToSection('#features')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown size={24} className="animate-bounce" />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-muted/30">
        <div className="section-container">
          <motion.div {...fadeInUp} className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[hsl(var(--ojas-600))] uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need for Post-Discharge Care</h2>
            <p className="text-muted-foreground text-lg">
              Comprehensive tools designed specifically for Indian healthcare standards
            </p>
          </motion.div>

          <motion.div {...staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                {...staggerItem}
                whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="card-default group cursor-pointer"
              >
                <div className="w-11 h-11 bg-[hsl(var(--ojas-100))] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--ojas-200))] transition-colors">
                  <feature.icon size={22} className="text-[hsl(var(--ojas-700))]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Choose Ojas */}
      <section className="py-20 lg:py-28">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeInUp}>
              <p className="text-sm font-semibold text-[hsl(var(--ojas-600))] uppercase tracking-wider mb-3">Why Ojas</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">Built for Indian Healthcare</h2>
              <div className="space-y-5">
                {[
                  { icon: Smartphone, title: 'No App Required', desc: 'Patients use WhatsApp — no downloads, no learning curve.' },
                  { icon: Zap, title: 'AI-Powered Intelligence', desc: 'Heuristic scoring catches complications before they escalate.' },
                  { icon: Lock, title: 'Enterprise Security', desc: 'AES-256 encryption, RBAC, audit trails, and NABH compliance.' },
                  { icon: Globe, title: 'Built for India', desc: 'Hindi keyword detection, local compliance standards, and regional support.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center shrink-0">
                      <item.icon size={18} className="text-[hsl(var(--ojas-700))]" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-white rounded-2xl border border-border shadow-lg p-6 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
                      <Activity size={20} className="text-[hsl(var(--ojas-700))]" />
                    </div>
                    <div>
                      <p className="font-semibold">Risk Distribution</p>
                      <p className="text-xs text-muted-foreground">Live Dashboard</p>
                    </div>
                  </div>
                  <span className="text-xs text-[hsl(var(--success-700))] bg-[hsl(var(--success-50))] px-2 py-1 rounded-full font-medium">
                    Live
                  </span>
                </div>

                {[
                  { label: 'Low Risk', value: 64, color: 'bg-[hsl(var(--success-500))]', count: '64 patients' },
                  { label: 'Medium', value: 21, color: 'bg-[hsl(var(--warning-500))]', count: '21 patients' },
                  { label: 'High Risk', value: 10, color: 'bg-orange-400', count: '10 patients' },
                  { label: 'Critical', value: 5, color: 'bg-[hsl(var(--error-500))]', count: '5 patients' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xl font-bold text-[hsl(var(--ojas-700))]">100</p>
                      <p className="text-xs text-muted-foreground">Total Patients</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[hsl(var(--error-500))]">5</p>
                      <p className="text-xs text-muted-foreground">Open Escalations</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[hsl(var(--success-500))]">87%</p>
                      <p className="text-xs text-muted-foreground">Response Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-muted/30">
        <div className="section-container">
          <motion.div {...fadeInUp} className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[hsl(var(--ojas-600))] uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple Four-Step Process</h2>
            <p className="text-muted-foreground text-lg">
              From enrollment to recovery, Ojas handles everything automatically
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-16 h-16 bg-[hsl(var(--ojas-600))] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[hsl(var(--ojas-600)/0.2)]"
                >
                  <item.icon size={28} className="text-white" />
                </motion.div>
                <span className="text-xs font-bold text-[hsl(var(--ojas-600))] uppercase tracking-wider">{item.step}</span>
                <h3 className="text-lg font-semibold mt-2 mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>

                {idx < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-full">
                    <ArrowRight size={20} className="text-[hsl(var(--ojas-300))]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 lg:py-28">
        <div className="section-container">
          <motion.div {...fadeInUp} className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[hsl(var(--ojas-600))] uppercase tracking-wider mb-3">Security</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Enterprise-Grade Security</h2>
            <p className="text-muted-foreground text-lg">
              Your patient data is protected with the highest security standards
            </p>
          </motion.div>

          <motion.div {...staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: 'AES-256 Encryption', desc: 'All patient PII encrypted at rest with PBKDF2HMAC key derivation' },
              { icon: Shield, title: 'RBAC Access Control', desc: '4-tier role hierarchy with granular permission guards' },
              { icon: FileText, title: 'Audit Logging', desc: 'Complete IP, user agent, and timestamp tracking on every action' },
              { icon: Users, title: 'Multi-Tenancy', desc: 'Hospital-level data isolation with automatic tenant scoping' },
              { icon: Clock, title: 'JWT Authentication', desc: 'Short-lived access tokens with secure refresh token rotation' },
              { icon: TrendingUp, title: 'Rate Limiting', desc: 'Configurable per-endpoint throttling to prevent abuse' },
            ].map((item) => (
              <motion.div
                key={item.title}
                {...staggerItem}
                whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
                className="card-default flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center shrink-0">
                  <item.icon size={18} className="text-[hsl(var(--ojas-700))]" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="section-container">
          <motion.div {...fadeInUp} className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[hsl(var(--ojas-600))] uppercase tracking-wider mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Trusted by Leading Hospitals</h2>
            <p className="text-gray-600 text-lg">
              See what healthcare professionals say about Ojas
            </p>
          </motion.div>

          <motion.div {...staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <motion.div
                key={t.author}
                {...staggerItem}
                whileHover={{ y: -4 }}
                className="bg-gray-50 border border-gray-100 rounded-xl p-6 transition-all duration-300 hover:shadow-lg"
              >
                <Heart size={20} className="text-[hsl(var(--ojas-600))] mb-4" />
                <p className="text-gray-900 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[hsl(var(--ojas-600))] rounded-full flex items-center justify-center text-sm font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.author}</p>
                    <p className="text-xs text-gray-600">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-28 bg-muted/30">
        <div className="section-container">
          <motion.div {...fadeInUp} className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[hsl(var(--ojas-600))] uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-lg">
              Start free, upgrade when you are ready. No hidden fees.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`rounded-2xl p-6 transition-all duration-300 ${
                  plan.highlighted
                    ? 'bg-[hsl(var(--ojas-700))] text-white shadow-xl shadow-[hsl(var(--ojas-700)/0.2)] scale-105'
                    : 'bg-white border border-border'
                }`}
              >
                <p className="text-sm font-medium mb-2">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-[hsl(var(--ojas-200))]' : 'text-muted-foreground'}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-[hsl(var(--ojas-200))]' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${plan.highlighted ? 'text-[hsl(var(--ojas-300))]' : 'text-[hsl(var(--ojas-600))]'}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-11 transition-all duration-200 active:scale-[0.98] ${
                    plan.highlighted
                      ? 'bg-white text-[hsl(var(--ojas-700))] hover:bg-[hsl(var(--ojas-50))]'
                      : 'bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))] text-white'
                  }`}
                  asChild
                >
                  <Link to="/login">{plan.cta}</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-28">
        <div className="section-container">
          <motion.div {...fadeInUp} className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[hsl(var(--ojas-600))] uppercase tracking-wider mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about Ojas
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                >
                  <span className="font-medium pr-4">{faq.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground shrink-0 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 lg:py-28 bg-slate-50">
        <div className="section-container">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              <motion.div {...fadeInUp}>
                <p className="text-sm font-semibold text-[hsl(var(--ojas-600))] uppercase tracking-wider mb-3">Contact</p>
                <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
                <p className="text-muted-foreground mb-8">
                  Ready to transform your post-discharge care? Our team is here to help you get started.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
                      <Mail size={18} className="text-[hsl(var(--ojas-700))]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">team.ojas@outlook.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
                      <Phone size={18} className="text-[hsl(var(--ojas-700))]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">+91 7007473337</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
                      <MapPin size={18} className="text-[hsl(var(--ojas-700))]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">Gurugram, Haryana, India</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
                      <Clock size={18} className="text-[hsl(var(--ojas-700))]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Support Hours</p>
                      <p className="text-sm text-muted-foreground">Monday - Saturday, 9AM - 6PM IST</p>
                    </div>
                  </div>
                </div>
              </motion.div>

                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center text-center py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckCircle2 size={32} className="text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                      <p className="text-slate-600 mb-6">We&apos;ll get back to you within 24 hours.</p>
                      <Button variant="outline" onClick={() => setSubmitted(false)}>
                        Send another message
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="form-label">First Name *</Label>
                          <Input
                            value={form.firstName || ''}
                            onChange={(e) => handleChange('firstName', e.target.value)}
                            placeholder="John"
                            className={`form-input h-11 ${errors.firstName ? 'error' : ''}`}
                          />
                          {errors.firstName && <p className="form-error">{errors.firstName}</p>}
                        </div>
                        <div>
                          <Label className="form-label">Last Name *</Label>
                          <Input
                            value={form.lastName || ''}
                            onChange={(e) => handleChange('lastName', e.target.value)}
                            placeholder="Doe"
                            className={`form-input h-11 ${errors.lastName ? 'error' : ''}`}
                          />
                          {errors.lastName && <p className="form-error">{errors.lastName}</p>}
                        </div>
                      </div>
                      <div>
                        <Label className="form-label">Email *</Label>
                        <Input
                          type="email"
                          value={form.email || ''}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="john@hospital.com"
                          className={`form-input h-11 ${errors.email ? 'error' : ''}`}
                        />
                        {errors.email && <p className="form-error">{errors.email}</p>}
                      </div>
                      <div>
                        <Label className="form-label">Hospital Name *</Label>
                        <Input
                          value={form.hospitalName || ''}
                          onChange={(e) => handleChange('hospitalName', e.target.value)}
                          placeholder="Apollo Hospitals"
                          className={`form-input h-11 ${errors.hospitalName ? 'error' : ''}`}
                        />
                        {errors.hospitalName && <p className="form-error">{errors.hospitalName}</p>}
                      </div>
                      <div>
                        <Label className="form-label">Message *</Label>
                        <Textarea
                          value={form.message || ''}
                          onChange={(e) => handleChange('message', e.target.value)}
                          placeholder="Tell us about your requirements..."
                          rows={4}
                          className={`form-input ${errors.message ? 'error' : ''}`}
                        />
                        {errors.message && <p className="form-error">{errors.message}</p>}
                      </div>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 btn-primary text-base gap-2 transition-all duration-200 active:scale-[0.98]"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={18} />
                            Send Message
                          </>
                        )}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — FIXED: White button now visible with border */}
      <section className="py-20 lg:py-28">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(var(--ojas-700))] to-[hsl(var(--ojas-900))] p-8 sm:p-12 lg:p-16 text-center"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Transform Post-Discharge Care?
              </h2>
              <p className="text-[hsl(var(--ojas-200))] text-lg max-w-xl mx-auto mb-8">
                Join leading hospitals across India using Ojas to improve patient outcomes and achieve NABH compliance.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-white text-[hsl(var(--ojas-700))] hover:bg-[hsl(var(--ojas-50))] px-8 h-12 font-semibold transition-all duration-300 active:scale-[0.98]"
                  asChild
                >
                  <Link to="/login">
                    Start Free Trial <ArrowRight size={18} className="ml-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[hsl(var(--ojas-700))] px-8 h-12 font-semibold transition-all duration-300 active:scale-[0.98]"
                  onClick={() => scrollToSection('#contact')}
                >
                  Contact Sales
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="section-container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-[hsl(var(--ojas-600))] rounded-lg flex items-center justify-center">
                  <Stethoscope className="text-white w-4 h-4" />
                </div>
                <span className="font-bold text-foreground">Ojas</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                NABH-compliant post-discharge patient recovery monitoring for Indian healthcare.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-3">Product</p>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('#features')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('#pricing')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollToSection('#security')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</button></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">Company</p>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('#how-it-works')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</button></li>
                <li><button onClick={() => scrollToSection('#faq')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</button></li>
                <li><button onClick={() => scrollToSection('#contact')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</button></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">Legal</p>
              <ul className="space-y-2">
                <li><span className="text-sm text-muted-foreground">Privacy Policy</span></li>
                <li><span className="text-sm text-muted-foreground">Terms of Service</span></li>
                <li><span className="text-sm text-muted-foreground">HIPAA Compliance</span></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Ojas HealthTech. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Built with care for better patient outcomes across India.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
