import React, { useEffect, useState } from 'react'
import emailjs from '@emailjs/browser'
import { profile } from './profile'

function Section({ id, title, children, className = "" }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`section container-px ${className}`}>
      <div className="max-w-6xl mx-auto">
        <h2 className="section-title animate-fadeInUp">{title}</h2>
        <div className="section-content p-8 lg:p-12 animate-fadeInUp">{children}</div>
      </div>
    </section>
  )
}

export default function App() {
  const [scrollY, setScrollY] = useState(0)
  const [scrollVelocity, setScrollVelocity] = useState(0)
  const [lastScrollTime, setLastScrollTime] = useState(Date.now())
  const [activeSection, setActiveSection] = useState('home')
  const [showNavbar, setShowNavbar] = useState(false)
  const [lastScrollDirection, setLastScrollDirection] = useState('up')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (stored) return stored
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })
  
  // Gallery slider
  const imageModules = import.meta.glob('./*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
  const galleryImages = Object.values(imageModules).slice(0, 4)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    // Apply theme class to html
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))

  useEffect(() => {
    // Auto-advance gallery
    if (galleryImages.length === 0) return
    const id = window.setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % galleryImages.length)
    }, 4000)
    return () => window.clearInterval(id)
  }, [galleryImages.length])

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const name = (data.get('name') as string || '').trim()
    const email = (data.get('email') as string || '').trim()
    const message = (data.get('message') as string || '').trim()
    const formspreeEndpoint = (import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined)

    const serviceId = (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined)
    const templateId = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined)
    const publicKey = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined)

    const templateParams: Record<string, string> = {
      from_name: name,
      reply_to: email,
      message,
      to_email: profile.email,
      site_url: window.location.href,
    }

    if (formspreeEndpoint) {
      try {
        setSubmitStatus('sending')
        const res = await fetch(formspreeEndpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message })
        })
        if (res.ok) {
          setSubmitStatus('sent')
          form.reset()
          return
        }
        setSubmitStatus('error')
      } catch {
        setSubmitStatus('error')
      }
    }

    if (serviceId && templateId && publicKey) {
      try {
        setSubmitStatus('sending')
        await emailjs.send(serviceId, templateId, templateParams, { publicKey })
        setSubmitStatus('sent')
        form.reset()
        return
      } catch (err) {
        setSubmitStatus('error')
        // fall through to Gmail fallback below
      }
    }

    const subject = encodeURIComponent(`Portfolio contact from ${name || 'Visitor'}`)
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}\n\n— Sent from ${window.location.href}`)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}&su=${subject}&body=${body}`
    window.open(gmailUrl, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    const handleScroll = () => {
      const currentTime = Date.now()
      const timeDiff = currentTime - lastScrollTime
      const currentScrollY = window.scrollY
      
      // Calculate scroll velocity (pixels per millisecond)
      const velocity = Math.abs(currentScrollY - scrollY) / Math.max(timeDiff, 1)
      setScrollVelocity(velocity)
      
      // Determine scroll direction
      const scrollDirection = currentScrollY > scrollY ? 'down' : 'up'
      setLastScrollDirection(scrollDirection)
      
      // Show/hide navbar based on scroll position and direction
      if (currentScrollY > 100) {
        setShowNavbar(true)
      } else {
        setShowNavbar(false)
      }
      
      setScrollY(currentScrollY)
      setLastScrollTime(currentTime)

      // Update active section based on scroll position
      const sections = ['home', 'about', 'skills', 'qualification', 'projects', 'contact']
      const sectionElements = sections.map(id => document.getElementById(id)).filter(Boolean)
      
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const element = sectionElements[i]
        if (element && element.offsetTop - 100 <= currentScrollY) {
          setActiveSection(sections[i])
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrollY, lastScrollTime])

  // Calculate blur intensity based on scroll velocity (slower = more blur)
  const blurIntensity = Math.min(Math.max(0, 1 - scrollVelocity * 1000), 0.8)

  return (
    <div className="min-h-screen relative">
      {/* Static Background */}
      <div 
        className="parallax-bg"
        style={{
          transform: `translateY(${Math.max(-40, Math.min(40, scrollY * 0.04))}px)`,
          filter: `blur(${blurIntensity}px)`,
          transition: 'filter 0.3s ease-out',
        }}
      />
      {/* Aurora animated background (theme-aware) */}
      <div className="aurora-layer">
        <div className="aurora" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
            <header className={`fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300 ${
          showNavbar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}>
          <div className="container-px">
                <div className="max-w-6xl mx-auto flex items-center justify-between py-4">
                  <a href="#home" className="font-bold text-xl text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Kavindu</a>
                  <nav className="hidden sm:flex items-center gap-8 text-sm font-medium">
                    <a href="#home" className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${activeSection === 'home' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Home</a>
                    <a href="#about" className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${activeSection === 'about' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>About</a>
                    <a href="#skills" className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${activeSection === 'skills' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Skills</a>
                    <a href="#qualification" className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${activeSection === 'qualification' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Qualification</a>
                    <a href="#projects" className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${activeSection === 'projects' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Highlights</a>
                    <a href="#contact" className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${activeSection === 'contact' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Contact-Me</a>
              </nav>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} aria-label="Toggle theme" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                    </button>
                    <button
                      aria-label="Open menu"
                      className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => setMobileOpen(o => !o)}
                    >
                      {mobileOpen ? '✕' : '☰'}
                    </button>
                  </div>
            </div>
          </div>
              {/* Mobile menu */}
              <div className={`sm:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="container-px pb-4">
                  <div className="max-w-6xl mx-auto bg-white/95 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 rounded-b-xl shadow">
                    <nav className="flex flex-col items-center text-sm font-medium py-3">
                      <a onClick={() => setMobileOpen(false)} href="#home" className={`w-full py-3 text-center hover:text-blue-600 dark:hover:text-blue-400 ${activeSection === 'home' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Home</a>
                      <a onClick={() => setMobileOpen(false)} href="#about" className={`w-full py-3 text-center hover:text-blue-600 dark:hover:text-blue-400 ${activeSection === 'about' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>About</a>
                      <a onClick={() => setMobileOpen(false)} href="#gallery" className={`w-full py-3 text-center hover:text-blue-600 dark:hover:text-blue-400 ${activeSection === 'gallery' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Gallery</a>
                      <a onClick={() => setMobileOpen(false)} href="#skills" className={`w-full py-3 text-center hover:text-blue-600 dark:hover:text-blue-400 ${activeSection === 'skills' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Skills</a>
                      <a onClick={() => setMobileOpen(false)} href="#qualification" className={`w-full py-3 text-center hover:text-blue-600 dark:hover:text-blue-400 ${activeSection === 'qualification' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Qualification</a>
                      <a onClick={() => setMobileOpen(false)} href="#projects" className={`w-full py-3 text-center hover:text-blue-600 dark:hover:text-blue-400 ${activeSection === 'projects' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Highlights</a>
                      <a onClick={() => setMobileOpen(false)} href="#contact" className={`w-full py-3 text-center hover:text-blue-600 dark:hover:text-blue-400 ${activeSection === 'contact' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'dark:text-slate-200'}`}>Contact-Me</a>
                    </nav>
                  </div>
                </div>
              </div>
        </header>

        {/* Hero Section */}
        <section id="home" className="min-h-screen flex items-center justify-center pt-20">
          <div className="container-px">
            <div className="max-w-6xl mx-auto text-center px-4">
              <div className="animate-fadeInUp">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg">
                  Hi, I'm <span className="gradient-text">Kavindu</span>
                </h1>
                
                {/* Profile Image */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 backdrop-blur-sm mx-auto">
                      {profile.photoUrl ? (
                        <img 
                          src={profile.photoUrl} 
                          alt={profile.fullName} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                          Photo
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm sm:text-lg animate-pulse">
                      ✨
                    </div>
                  </div>
                </div>
                
                    <h2 className="text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 mb-8 font-light drop-shadow-md">
                      Technology Explorer & AI Enthusiast
                    </h2>
                    <p className="text-lg sm:text-xl text-slate-700 dark:text-slate-200 mb-12 max-w-3xl mx-auto drop-shadow-sm text-center">
                      Bridging engineering, industry, and innovation. From apparel manufacturing to crypto trading, 
                      now exploring the future of artificial intelligence and intelligent machines.
                    </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                  <a href="#contact" className="btn-primary text-lg px-8 py-4">
                    Contact me
                  </a>
                </div>
                <div className="flex justify-center">
                  <a href="#about" className="text-white/70 hover:text-white transition-colors animate-bounce">
                    <div className="flex flex-col items-center">
                      <span className="text-sm mb-2">Scroll down</span>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <Section id="about" title="About Me">
          <div className="text-center mb-12">
            <h3 className="text-xl text-slate-600 dark:text-slate-300 mb-8">My introduction</h3>
            <p className="text-lg text-slate-700 dark:text-slate-200 max-w-4xl mx-auto leading-relaxed">
              I'm a 25-year-old explorer of technology with a background that bridges engineering, industry, and innovation. 
              After completing my government education through Ordinary and Advanced Levels, I earned my HNDE and Automobile Diploma 
              at the ATI Institute (2018–2023). My journey began in the apparel sector, working at Star Apparel, Katunayaka, and 
              Hidramani Industries, where I built discipline and problem-solving skills that still guide my work today. Along the way, 
              I mastered Crypto Trading Analysis and the intricate theory of Elliott Wave. Since 2025, I've turned my focus toward 
              the world of computers and artificial intelligence — learning, experimenting, and building my competence for the future 
              of intelligent machines.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                25
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Years Old</h3>
            </div>
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                5+
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Years Industry Experience</h3>
            </div>
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2025
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">AI Journey Started</h3>
            </div>
          </div>

          <div className="text-center">
            <a href={profile.cvPath} download className="btn-primary">
              Download CV
            </a>
          </div>
        </Section>

        {/* Gallery Section */}
        {galleryImages.length > 0 && (
          <Section id="gallery" title="Gallery">
            <div className="max-w-5xl mx-auto">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
                <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-900">
                  <img
                    src={galleryImages[currentSlide]}
                    alt={`Slide ${currentSlide + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Controls */}
                <div className="absolute inset-0 flex items-center justify-between p-4">
                  <button
                    aria-label="Previous slide"
                    className="bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-full w-10 h-10 flex items-center justify-center shadow hover:shadow-lg"
                    onClick={() => setCurrentSlide(prev => (prev - 1 + galleryImages.length) % galleryImages.length)}
                  >
                    ‹
                  </button>
                  <button
                    aria-label="Next slide"
                    className="bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-full w-10 h-10 flex items-center justify-center shadow hover:shadow-lg"
                    onClick={() => setCurrentSlide(prev => (prev + 1) % galleryImages.length)}
                  >
                    ›
                  </button>
                </div>
                {/* Dots */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                  {galleryImages.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`w-2.5 h-2.5 rounded-full ${i === currentSlide ? 'bg-white dark:bg-slate-200' : 'bg-white/50 dark:bg-slate-600'}`}
                      onClick={() => setCurrentSlide(i)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Skills Section */}
        <Section id="skills" title="Skills">
          <div className="text-center mb-12">
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Design Skills */}
            <div className="skill-card">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">Design</h3>
              <div className="space-y-3">
                {['Adobe Photoshop', 'Adobe Illustrator'].map((skill) => (
                  <div key={skill} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 text-sm">{skill}</span>
                    <div className="w-16 bg-slate-200 rounded-full h-2">
                      <div className="skill-progress bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full" style={{width: '90%'}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Education Skills */}
            <div className="skill-card">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">Education</h3>
              <div className="space-y-3">
                {['HNDE Diploma', 'Automobile Diploma', 'ATI Institute Graduate'].map((skill) => (
                  <div key={skill} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 text-sm">{skill}</span>
                    <div className="w-16 bg-slate-200 rounded-full h-2">
                      <div className="skill-progress bg-gradient-to-r from-green-500 to-teal-600 h-2 rounded-full" style={{width: '90%'}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Skills */}
            <div className="skill-card">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">Financial</h3>
              <div className="space-y-3">
                {['Cryptocurrency Analysis', 'Elliott Wave Theory', 'Binance Trading', 'TradingView'].map((skill) => (
                  <div key={skill} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 text-sm">{skill}</span>
                    <div className="w-16 bg-slate-200 rounded-full h-2">
                      <div className="skill-progress bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full" style={{width: '80%'}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Skills */}
            <div className="skill-card">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">General</h3>
              <div className="space-y-3">
                {['Roof Selling', 'Customer Communication', 'Marketing', 'Product Presentation'].map((skill) => (
                  <div key={skill} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 text-sm">{skill}</span>
                    <div className="w-16 bg-slate-200 rounded-full h-2">
                      <div className="skill-progress bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Qualification Section */}
        <Section id="qualification" title="Qualification">
          <div className="text-center mb-12">
            <h3 className="text-xl text-slate-600 dark:text-slate-300 mb-8">Professional Experience</h3>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Star Apparel - Import/Export Operations */}
              <div className="card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xl">📦</div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Import/Export Operations Coordinator</h3>
                      <p className="text-slate-600 dark:text-slate-300">Star Apparel — Katunayaka BOI</p>
                    </div>
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-200">
                  <li>Managed item import/export workflows and BOI documentation across operations.</li>
                  <li>Coordinated with suppliers, customs, and internal teams to ensure compliance and on‑time movement.</li>
                  <li>Improved tracking and competency system handling for inventory movement.</li>
                </ul>
              </div>

              {/* Hidramani Washing Plant - Quality Inspection */}
              <div className="card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl">🔍</div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Quality Inspector (Garments)</h3>
                      <p className="text-slate-600 dark:text-slate-300">Hidramani Washing Plant</p>
                    </div>
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-200">
                  <li>Inspected garments to identify defects and ensure conformance to quality standards.</li>
                  <li>Collaborated with production teams to resolve issues and prevent recurrence.</li>
                  <li>Documented inspections and reported trends to support corrective actions.</li>
                </ul>
              </div>

              {/* Freelance Graphic Editing */}
              <div className="card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white text-xl">🎨</div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Freelance Graphic Editor</h3>
                      <p className="text-slate-600 dark:text-slate-300">Self‑employed</p>
                    </div>
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-200">
                  <li>Edited images and artworks in Photoshop and Illustrator per client specifications.</li>
                  <li>Prepared assets for print and web, ensuring color accuracy and brand consistency.</li>
                  <li>Delivered projects to deadline while incorporating client feedback effectively.</li>
                </ul>
              </div>

              {/* Cryptocurrency Trading & Business */}
              <div className="card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl">💹</div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Cryptocurrency Trader & Small Business Owner</h3>
                      <p className="text-slate-600 dark:text-slate-300">Self‑employed</p>
                    </div>
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-200">
                  <li>Executed profitable trades using Elliott Wave analysis on Binance and TradingView.</li>
                  <li>Managed risk, capital allocation, and performance tracking with disciplined processes.</li>
                  <li>Developed and iterated trading strategies aligned with market conditions.</li>
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* Professional Highlights Section */}
        <Section id="projects" title="Professional Highlights">
          <div className="text-center mb-12">
            <h3 className="text-xl text-slate-600 dark:text-slate-300 mb-8">Key roles and outcomes</h3>
          </div>
          {/* Mobile creative slider */}
          <div className="md:hidden -mx-4 px-4">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
              {/* Card 1 */}
              <div className="project-card min-w-[85%] snap-center active:scale-95">
                <div className="project-header bg-gradient-to-br from-blue-500 to-cyan-600 text-xl md:text-2xl text-center">
                  📦 Import/Export Operations
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-3 text-center">Star Apparel — Katunayaka BOI</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                  <li>Coordinated BOI documentation and supplier/customs communication.</li>
                  <li>Improved tracking and competency system handling for inventory.</li>
                </ul>
              </div>
              {/* Card 2 */}
              <div className="project-card min-w-[85%] snap-center active:scale-95">
                <div className="project-header bg-gradient-to-br from-purple-500 to-indigo-600 text-xl md:text-2xl text-center">
                  🔍 Garment Quality Inspection
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-3 text-center">Hidramani Washing Plant</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                  <li>Inspected garments for defects and standards compliance.</li>
                  <li>Partnered with production teams to resolve issues and prevent recurrence.</li>
                </ul>
              </div>
              {/* Card 3 */}
              <div className="project-card min-w-[85%] snap-center active:scale-95">
                <div className="project-header bg-gradient-to-br from-pink-500 to-purple-600 text-xl md:text-2xl text-center">
                  🎨 Freelance Graphic Editing
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-3 text-center">Photoshop & Illustrator</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                  <li>Edited images and artworks to client briefs for print and web.</li>
                  <li>Ensured brand consistency and color accuracy; delivered on time.</li>
                </ul>
              </div>
              {/* Card 4 */}
              <div className="project-card min-w-[85%] snap-center active:scale-95">
                <div className="project-header bg-gradient-to-br from-emerald-500 to-teal-600 text-xl md:text-2xl text-center">
                  💹 Crypto Trading & Business
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-3 text-center">Self‑employed</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                  <li>Executed trades using Elliott Wave analysis on Binance/TradingView.</li>
                  <li>Managed risk, allocation, and performance with disciplined processes.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Desktop/tablet grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {/* Highlight 1 */}
            <div className="project-card">
              <div className="project-header bg-gradient-to-br from-blue-500 to-cyan-600 text-center">
                📦 Import/Export Operations
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 text-center">Star Apparel — Katunayaka BOI</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Coordinated BOI documentation and supplier/customs communication.</li>
                <li>Improved tracking and competency system handling for inventory.</li>
              </ul>
            </div>

            {/* Highlight 2 */}
            <div className="project-card">
              <div className="project-header bg-gradient-to-br from-purple-500 to-indigo-600 text-center">
                🔍 Garment Quality Inspection
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 text-center">Hidramani Washing Plant</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Inspected garments for defects and standards compliance.</li>
                <li>Partnered with production teams to resolve issues and prevent recurrence.</li>
              </ul>
            </div>

            {/* Highlight 3 */}
            <div className="project-card">
              <div className="project-header bg-gradient-to-br from-pink-500 to-purple-600 text-center">
                🎨 Freelance Graphic Editing
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 text-center">Photoshop & Illustrator</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Edited images and artworks to client briefs for print and web.</li>
                <li>Ensured brand consistency and color accuracy; delivered on time.</li>
              </ul>
            </div>

            {/* Highlight 4 */}
            <div className="project-card">
              <div className="project-header bg-gradient-to-br from-emerald-500 to-teal-600 text-center">
                💹 Crypto Trading & Business
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 text-center">Self‑employed</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Executed trades using Elliott Wave analysis on Binance/TradingView.</li>
                <li>Managed risk, allocation, and performance with disciplined processes.</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Contact Section */}
        <Section id="contact" title="Contact Me">
          <div className="text-center mb-12">
            <h3 className="text-xl text-slate-600 dark:text-slate-300 mb-8">Get in touch</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Contact Me</h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    📞
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Phone</h4>
                    <p className="text-slate-600 dark:text-slate-300">{profile.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    ✉️
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Email</h4>
                    <p className="text-slate-600 dark:text-slate-300">{profile.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    📍
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Location</h4>
                    <p className="text-slate-600 dark:text-slate-300">Korasewattha, Udugampola, Sri Lanka</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="card p-8">
              <form className="space-y-6" onSubmit={handleContactSubmit}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your Name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Message</label>
                  <textarea 
                    id="message" 
                    rows={5}
                    name="message"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your message here..."
                  ></textarea>
                </div>
                
                <button type="submit" className="w-full btn-primary">
                  Send Message
                </button>
                <div className="text-center text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
                  {submitStatus === 'sending' && 'Sending…'}
                  {submitStatus === 'sent' && 'Message sent successfully.'}
                  {submitStatus === 'error' && 'Could not send via EmailJS. Opened Gmail compose as fallback.'}
                </div>
              </form>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <footer className="bg-slate-900/90 backdrop-blur-sm text-white py-12">
          <div className="container-px">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-bold mb-4">Kavindu</h3>
                      <p className="text-slate-400">Technology Explorer & AI Enthusiast</p>
                    </div>
                
                <div className="text-center">
                  <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                  <div className="space-y-2">
                    <a href="#qualification" className="block text-slate-400 hover:text-white transition-colors">Qualification</a>
                    <a href="#projects" className="block text-slate-400 hover:text-white transition-colors">Highlights</a>
                    <a href="#contact" className="block text-slate-400 hover:text-white transition-colors">Contact-Me</a>
                  </div>
                </div>
                
                <div className="text-center md:text-right">
                  <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
                  <div className="space-y-2 text-slate-400">
                    <p>{profile.phone}</p>
                    <p>{profile.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-slate-800 pt-8 text-center">
                <p className="text-slate-500">© {new Date().getFullYear()} Kavindu. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}