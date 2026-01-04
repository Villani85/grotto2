"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import {
  FiPlay,
  FiUsers,
  FiAward,
  FiTrendingUp,
  FiArrowRight,
  FiTarget,
  FiZap,
  FiStar,
  FiCheck,
  FiEye,
  FiHeart,
  FiMessageCircle,
} from "react-icons/fi"
import { GiBrain } from "react-icons/gi"

// Helper function to format numbers consistently (avoid hydration mismatch)
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export default function HomePage() {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const stats = {
    totalUsers: 1250,
    liveEvents: 12,
    communityPosts: 3250,
    hoursContent: 156,
  }

  const features = [
    {
      icon: <FiTarget />,
      title: "Choice Architecture",
      description:
        "Nudging e architettura delle scelte per influenzare decisioni in modo etico ed efficace nel business e nella vita.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: <GiBrain />,
      title: "Bias & Heuristics",
      description:
        "Economia comportamentale applicata: comprendi e sfrutta i bias cognitivi per decisioni migliori e strategie vincenti.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: <FiEye />,
      title: "Behavioral Analysis",
      description:
        "Analizza linguaggio verbale e non verbale per comprendere veramente le persone e migliorare la comunicazione.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: <FiZap />,
      title: "Neuro-Persuasion",
      description:
        "Tecniche avanzate di persuasione inconscia basate su neuroscienze per influenzare e convincere in modo naturale.",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: <FiHeart />,
      title: "Mind Performance",
      description:
        "Ottimizza abitudini, obiettivi ed emozioni per raggiungere performance mentali eccezionali nella vita quotidiana.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: <FiUsers />,
      title: "Community Privata",
      description:
        "Accesso esclusivo alla community con Michele Grotto e networking con altri Brain Hacker per crescere insieme.",
      color: "from-indigo-500 to-blue-500",
    },
  ]

  const testimonials = [
    {
      name: "Marco Rossi",
      role: "Imprenditore",
      content:
        "Brain Hacking Academy ha trasformato completamente il mio approccio al business. Le tecniche di neuro-persuasione hanno raddoppiato le mie conversioni.",
      avatar: "MR",
      rating: 5,
    },
    {
      name: "Laura Bianchi",
      role: "Manager",
      content:
        "Finalmente una formazione che non finisce! La community e i live training mensili mantengono la motivazione altissima.",
      avatar: "LB",
      rating: 5,
    },
    {
      name: "Andrea Verdi",
      role: "Freelance",
      content:
        "Le interviste agli esperti e le sessioni di Q&A hanno cambiato il mio modo di lavorare. Investimento migliore dell'anno.",
      avatar: "AV",
      rating: 5,
    },
  ]

  const methodSteps = [
    {
      number: "01",
      title: "Community",
      description: "Accesso esclusivo alla community privata con Michele Grotto e altri Brain Hacker",
      icon: <FiUsers />,
    },
    {
      number: "02",
      title: "Online Masterclass",
      description: "Decine di ore di formazione on-demand sempre disponibili e in continua evoluzione",
      icon: <FiPlay />,
    },
    {
      number: "03",
      title: "Live Training",
      description: "12 sessioni live all'anno con masterclass in diretta streaming su temi specifici",
      icon: <FiZap />,
    },
    {
      number: "04",
      title: "Expert Interview",
      description: "12 interviste esclusive all'anno con i migliori esperti di mente e comportamento",
      icon: <FiMessageCircle />,
    },
    {
      number: "05",
      title: "Live Q&A",
      description: "12 sessioni personalizzate all'anno per rispondere a tutte le tue domande",
      icon: <FiAward />,
    },
  ]

  return (
    <div className="space-y-24 overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#000E20] to-[#001D41]">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#005FD7]/20 rounded-full blur-3xl animate-float" />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-[#005FD7]/30 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#005FD7]/10 rounded-full blur-3xl animate-pulse" />

          {/* Electric grid background */}
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                linear-gradient(rgba(0, 95, 215, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 95, 215, 0.1) 1px, transparent 1px)
              `,
                backgroundSize: "50px 50px",
                animation: "background-pan 30s linear infinite",
              }}
            ></div>
          </div>

          {/* Brain Animation Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <svg width="600" height="600" viewBox="0 0 600 600" className="animate-brain-breathe">
              {/* Left Hemisphere - forma realistica con lobi ben definiti */}
              <g className="animate-hemisphere-glow">
                {/* Emisfero sinistro principale con lobi frontale, parietale, temporale, occipitale */}
                <path
                  d="M 300 120 C 240 125, 190 145, 155 185 C 140 205, 130 230, 125 255 C 120 285, 120 315, 125 345 C 130 375, 140 405, 155 430 C 170 455, 190 475, 215 490 C 240 505, 270 515, 295 520 C 297 521, 299 521, 300 522 L 300 120 Z"
                  fill="rgba(0, 95, 215, 0.08)"
                  stroke="#005FD7"
                  strokeWidth="3"
                  opacity="0.8"
                  className="animate-brain-pulse"
                />

                {/* Lobo frontale sinistro - circonvoluzioni */}
                <path
                  d="M 220 160 Q 190 170, 180 195 T 170 230"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="3"
                  opacity="0.7"
                  className="animate-brain-wave-path"
                />
                <path
                  d="M 240 180 Q 220 185, 210 200 T 200 220"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2.5"
                  opacity="0.6"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.2s" }}
                />

                {/* Lobo parietale sinistro */}
                <path
                  d="M 165 270 Q 145 285, 142 310 T 148 345"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="3"
                  opacity="0.7"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.3s" }}
                />
                <path
                  d="M 180 290 Q 165 300, 162 320 T 165 345"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2.5"
                  opacity="0.6"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.5s" }}
                />

                {/* Lobo temporale sinistro */}
                <path
                  d="M 170 380 Q 155 395, 158 420 T 175 455"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="3"
                  opacity="0.7"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.6s" }}
                />
                <path
                  d="M 190 400 Q 175 410, 178 430 T 195 460"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2.5"
                  opacity="0.6"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.8s" }}
                />

                {/* Lobo occipitale sinistro */}
                <path
                  d="M 220 485 Q 205 492, 215 505 T 240 512"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2.5"
                  opacity="0.6"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "1s" }}
                />

                {/* Circonvoluzioni secondarie dettagliate */}
                <path
                  d="M 205 210 Q 195 218, 200 230"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.15s" }}
                />
                <path
                  d="M 170 250 Q 160 260, 165 275"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.4s" }}
                />
                <path
                  d="M 155 330 Q 148 340, 152 355"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.65s" }}
                />
                <path
                  d="M 168 410 Q 160 420, 168 435"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.9s" }}
                />
                <path
                  d="M 205 475 Q 198 483, 208 495"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "1.1s" }}
                />
              </g>

              {/* Right Hemisphere - forma realistica speculare con lobi ben definiti */}
              <g className="animate-hemisphere-glow" style={{ animationDelay: "0.5s" }}>
                {/* Emisfero destro principale con lobi */}
                <path
                  d="M 300 120 C 360 125, 410 145, 445 185 C 460 205, 470 230, 475 255 C 480 285, 480 315, 475 345 C 470 375, 460 405, 445 430 C 430 455, 410 475, 385 490 C 360 505, 330 515, 305 520 C 303 521, 301 521, 300 522 L 300 120 Z"
                  fill="rgba(0, 95, 215, 0.08)"
                  stroke="#005FD7"
                  strokeWidth="3"
                  opacity="0.8"
                  className="animate-brain-pulse"
                />

                {/* Lobo frontale destro - circonvoluzioni */}
                <path
                  d="M 380 160 Q 410 170, 420 195 T 430 230"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="3"
                  opacity="0.7"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.1s" }}
                />
                <path
                  d="M 360 180 Q 380 185, 390 200 T 400 220"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2.5"
                  opacity="0.6"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.3s" }}
                />

                {/* Lobo parietale destro */}
                <path
                  d="M 435 270 Q 455 285, 458 310 T 452 345"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="3"
                  opacity="0.7"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.4s" }}
                />
                <path
                  d="M 420 290 Q 435 300, 438 320 T 435 345"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2.5"
                  opacity="0.6"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.6s" }}
                />

                {/* Lobo temporale destro */}
                <path
                  d="M 430 380 Q 445 395, 442 420 T 425 455"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="3"
                  opacity="0.7"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.7s" }}
                />
                <path
                  d="M 410 400 Q 425 410, 422 430 T 405 460"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2.5"
                  opacity="0.6"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.9s" }}
                />

                {/* Lobo occipitale destro */}
                <path
                  d="M 435 485 Q 455 492, 445 505 T 420 512"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2.5"
                  opacity="0.6"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "1.1s" }}
                />

                {/* Circonvoluzioni secondarie dettagliate */}
                <path
                  d="M 395 210 Q 405 218, 400 230"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.25s" }}
                />
                <path
                  d="M 430 250 Q 440 260, 435 275"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.5s" }}
                />
                <path
                  d="M 445 330 Q 452 340, 448 355"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "0.75s" }}
                />
                <path
                  d="M 432 410 Q 440 420, 432 435"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "1s" }}
                />
                <path
                  d="M 395 475 Q 402 483, 392 495"
                  fill="none"
                  stroke="#005FD7"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-brain-wave-path"
                  style={{ animationDelay: "1.2s" }}
                />
              </g>

              <line
                x1="300"
                y1="140"
                x2="300"
                y2="510"
                stroke="#005FD7"
                strokeWidth="2"
                opacity="0.4"
                strokeDasharray="10 5"
                className="animate-brain-pulse"
              />

              {/* Nodi sinaptici - emisfero sinistro */}
              {[
                { cx: 195, cy: 195, delay: "0s" },
                { cx: 165, cy: 255, delay: "0.4s" },
                { cx: 155, cy: 310, delay: "0.8s" },
                { cx: 168, cy: 380, delay: "1.2s" },
                { cx: 190, cy: 435, delay: "1.6s" },
                { cx: 220, cy: 495, delay: "2s" },
              ].map((node, i) => (
                <g key={`synapse-left-${i}`}>
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r="5"
                    fill="#005FD7"
                    className="animate-synapse-light"
                    style={{ animationDelay: node.delay }}
                  />
                  <circle cx={node.cx} cy={node.cy} r="5" fill="none" stroke="#005FD7" strokeWidth="2" opacity="0">
                    <animate attributeName="r" from="5" to="18" dur="2s" begin={node.delay} repeatCount="indefinite" />
                    <animate
                      attributeName="opacity"
                      from="0.8"
                      to="0"
                      dur="2s"
                      begin={node.delay}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}

              {/* Nodi sinaptici - emisfero destro */}
              {[
                { cx: 405, cy: 195, delay: "0.2s" },
                { cx: 435, cy: 255, delay: "0.6s" },
                { cx: 445, cy: 310, delay: "1s" },
                { cx: 432, cy: 380, delay: "1.4s" },
                { cx: 410, cy: 435, delay: "1.8s" },
                { cx: 380, cy: 495, delay: "2.2s" },
              ].map((node, i) => (
                <g key={`synapse-right-${i}`}>
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r="5"
                    fill="#005FD7"
                    className="animate-synapse-light"
                    style={{ animationDelay: node.delay }}
                  />
                  <circle cx={node.cx} cy={node.cy} r="5" fill="none" stroke="#005FD7" strokeWidth="2" opacity="0">
                    <animate attributeName="r" from="5" to="18" dur="2s" begin={node.delay} repeatCount="indefinite" />
                    <animate
                      attributeName="opacity"
                      from="0.8"
                      to="0"
                      dur="2s"
                      begin={node.delay}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}

              {/* Particelle di pensiero che viaggiano tra neuroni */}
              <circle cx="195" cy="195" r="3" fill="#FFFFFF" opacity="0.9" className="animate-thought-particle">
                <animateMotion dur="4s" repeatCount="indefinite" path="M 0 0 Q 50 40, 100 30 Q 150 20, 210 0" />
              </circle>
              <circle
                cx="405"
                cy="195"
                r="3"
                fill="#FFFFFF"
                opacity="0.9"
                className="animate-thought-particle"
                style={{ animationDelay: "1s" }}
              >
                <animateMotion dur="4s" repeatCount="indefinite" path="M 0 0 Q -50 40, -100 30 Q -150 20, -210 0" />
              </circle>
              <circle
                cx="300"
                cy="320"
                r="3"
                fill="#FFFFFF"
                opacity="0.9"
                className="animate-thought-particle"
                style={{ animationDelay: "2s" }}
              >
                <animateMotion dur="4s" repeatCount="indefinite" path="M 0 0 Q 40 50, 0 100 Q -40 150, 0 200" />
              </circle>
            </svg>
          </div>
        </div>

        <div
          className={`relative z-10 max-w-7xl mx-auto text-center px-4 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <h1 className="text-5xl md:text-6xl lg:text-8xl font-black mb-8 leading-none tracking-tight">
            <span
              className="block text-[#005FD7] animate-reveal-text"
              style={{
                textShadow:
                  "0 0 40px rgba(0, 95, 215, 0.8), 0 0 80px rgba(0, 95, 215, 0.6), 0 4px 20px rgba(0, 0, 0, 0.9)",
              }}
            >
              HACKERA
            </span>
            <span
              className="block animate-reveal-text text-white"
              style={{
                animationDelay: "0.3s",
                textShadow:
                  "0 0 60px rgba(255, 255, 255, 0.5), 0 0 100px rgba(255, 255, 255, 0.3), 0 4px 20px rgba(0, 0, 0, 0.9)",
              }}
            >
              LA TUA MENTE
            </span>
          </h1>
          <p
            className="text-xl md:text-2xl text-[#B1BAC5] mb-12 max-w-4xl mx-auto font-light leading-relaxed animate-reveal-text"
            style={{
              animationDelay: "0.6s",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)",
            }}
          >
            La scelta è tua:{" "}
            <span className="text-[#005FD7] font-semibold animate-electric-pulse">controlla la tua mente</span>
            <span className="text-white">, oppure la tua mente controlla te</span>
          </p>
          <div
            className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-scale-in"
            style={{ animationDelay: "0.9s" }}
          >
            {user ? (
              <Link
                href="/area-riservata/dashboard"
                className="group relative inline-flex items-center justify-center px-16 py-6 bg-[#005FD7] hover:bg-[#0051b8] rounded-2xl font-bold text-2xl transition-all hover:scale-110 animate-pulse-glow overflow-hidden"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                <span className="relative z-10 flex items-center">
                  Vai alla Dashboard
                  <FiArrowRight className="ml-3 group-hover:translate-x-2 transition-transform" />
                </span>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/register"
                  className="group relative inline-flex items-center justify-center px-16 py-6 bg-[#005FD7] hover:bg-[#0051b8] rounded-2xl font-bold text-2xl transition-all hover:scale-110 animate-pulse-glow overflow-hidden"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  <span className="relative z-10">Inizia Gratuitamente</span>
                </Link>
                <Link
                  href="/marketing/come-funziona"
                  className="inline-flex items-center justify-center px-16 py-6 glass-effect rounded-2xl font-bold text-2xl transition-all hover:scale-105 hover:border-[#005FD7] text-white"
                >
                  Scopri di più
                </Link>
              </>
            )}
          </div>

          <div
            className="mt-20 flex flex-wrap justify-center gap-12 text-lg text-[#F4F5F7] animate-slide-up"
            style={{ animationDelay: "1.5s" }}
          >
            <div className="flex items-center gap-3">
              <FiCheck className="text-[#005FD7] text-2xl animate-scale-in" style={{ animationDelay: "1.6s" }} />
              <span className="font-semibold">Solo 1€ al giorno</span>
            </div>
            <div className="flex items-center gap-3">
              <FiCheck className="text-[#005FD7] text-2xl animate-scale-in" style={{ animationDelay: "1.7s" }} />
              <span className="font-semibold">Cancella quando vuoi</span>
            </div>
            <div className="flex items-center gap-3">
              <FiCheck className="text-[#005FD7] text-2xl animate-scale-in" style={{ animationDelay: "1.8s" }} />
              <span className="font-semibold">+1250 membri attivi</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="text-center mb-12 animate-reveal-text">
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            Il <span className="text-gradient">Problema</span>
          </h2>
          <p className="text-xl text-[#B1BAC5] max-w-3xl mx-auto leading-relaxed">
            La formazione tradizionale ha un limite fondamentale
          </p>
        </div>

        <div className="max-w-4xl mx-auto glass-effect rounded-3xl p-12 md:p-16">
          <p className="text-2xl md:text-3xl text-[#F4F5F7] leading-relaxed mb-8 text-center">
            <span className="text-[#005FD7] font-bold">La formazione non funziona.</span>
          </p>
          <p className="text-xl md:text-2xl text-[#B1BAC5] leading-relaxed text-center">
            I corsi sono utili. Ma hanno un enorme problema: <span className="text-white font-semibold">finiscono</span>
            . Acquisti un corso, lo segui (se va bene), e poi tutto si ferma. Nessun aggiornamento, nessun supporto
            continuo, nessuna crescita nel tempo.
          </p>
        </div>
      </section>

      <section className="relative">
        <div className="text-center mb-12 animate-reveal-text">
          <h2 className="text-5xl md:text-6xl font-black mb-4">
            Brain Hacking Academy in <span className="text-gradient">Numeri</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Membri Attivi",
              value: stats.totalUsers,
              icon: <FiUsers />,
              suffix: "+",
            },
            {
              label: "Live al Mese",
              value: stats.liveEvents,
              icon: <FiPlay />,
              suffix: "",
            },
            {
              label: "Post Community",
              value: stats.communityPosts,
              icon: <FiTrendingUp />,
              suffix: "+",
            },
            {
              label: "Ore On-Demand",
              value: stats.hoursContent,
              icon: <FiAward />,
              suffix: "h",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="glass-effect rounded-3xl p-8 hover:scale-105 transition-all duration-300 group animate-scale-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div
                className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#005FD7] flex items-center justify-center text-3xl group-hover:rotate-12 transition-transform animate-electric-pulse`}
              >
                {stat.icon}
              </div>
              <div className="text-5xl md:text-6xl font-black mb-2 text-gradient">
                {formatNumber(stat.value)}
                {stat.suffix}
              </div>
              <div className="text-[#B1BAC5] font-medium uppercase tracking-wider text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="text-center mb-16 animate-reveal-text">
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            Il Metodo in <span className="text-gradient">5 Step</span>
          </h2>
          <p className="text-xl text-[#B1BAC5] max-w-2xl mx-auto">
            Un sistema completo per una formazione continua e risultati duraturi
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {methodSteps.map((step, index) => (
            <div
              key={index}
              className="glass-effect rounded-3xl p-8 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#005FD7]/10 rounded-full blur-3xl group-hover:bg-[#005FD7]/20 transition-all" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-6xl font-black text-[#005FD7]/20">{step.number}</div>
                  <div className="w-14 h-14 rounded-xl bg-[#005FD7] flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-[#B1BAC5] leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="text-center mb-16 animate-reveal-text">
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            Cosa <span className="text-gradient">Imparerai</span>
          </h2>
          <p className="text-xl text-[#B1BAC5] max-w-2xl mx-auto">
            Le competenze più avanzate su mente e comportamento umano
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-effect rounded-3xl p-10 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#005FD7]/10 rounded-full blur-3xl group-hover:bg-[#005FD7]/20 transition-all animate-pulse" />

              <div className="relative z-10">
                <div className="w-20 h-20 rounded-2xl bg-[#005FD7] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform animate-electric-pulse">
                  <div className="text-white text-3xl">{feature.icon}</div>
                </div>
                <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
                <p className="text-[#B1BAC5] text-lg leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="text-center mb-16 animate-reveal-text">
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            Cosa Dicono i <span className="text-gradient">Brain Hacker</span>
          </h2>
          <p className="text-xl text-[#B1BAC5] max-w-2xl mx-auto">
            Persone reali che stanno già trasformando le loro vite
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="glass-effect rounded-3xl p-8 hover:scale-105 transition-all duration-300 relative animate-scale-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <FiStar
                    key={i}
                    className="text-[#005FD7] fill-[#005FD7] animate-scale-in"
                    style={{ animationDelay: `${index * 150 + i * 50}ms` }}
                    size={20}
                  />
                ))}
              </div>

              <p className="text-[#F4F5F7] text-lg mb-8 italic leading-relaxed">"{testimonial.content}"</p>

              <div className="flex items-center">
                <div className="w-14 h-14 bg-[#005FD7] rounded-full flex items-center justify-center font-bold text-xl animate-pulse-glow">
                  {testimonial.avatar}
                </div>
                <div className="ml-4">
                  <h4 className="font-bold text-lg text-white">{testimonial.name}</h4>
                  <p className="text-sm text-[#B1BAC5]">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-[#005FD7]/20 via-[#005FD7]/30 to-[#005FD7]/20 rounded-3xl blur-3xl animate-pulse" />

        <div className="relative glass-effect rounded-3xl p-12 md:p-20 text-center overflow-hidden">
          {/* Animated background grid */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                linear-gradient(rgba(0, 95, 215, 0.3) 2px, transparent 2px),
                linear-gradient(90deg, rgba(0, 95, 215, 0.3) 2px, transparent 2px)
              `,
                backgroundSize: "30px 30px",
                animation: "background-pan 20s linear infinite",
              }}
            ></div>
          </div>

          <h2 className="relative text-5xl md:text-7xl font-black mb-8 leading-tight animate-reveal-text">
            <span className="text-white">Investi Sulla Tua </span>
            <span className="text-gradient animate-gradient">Mente</span>
            <br />
            <span className="text-white">Investi Sul Tuo </span>
            <span className="text-gradient animate-gradient">Futuro</span>
          </h2>
          <p
            className="relative text-2xl text-[#B1BAC5] mb-4 max-w-3xl mx-auto leading-relaxed animate-reveal-text"
            style={{ animationDelay: "0.2s" }}
          >
            Solo <span className="text-[#005FD7] font-bold text-3xl">1€ al giorno</span> per accedere a tutto
          </p>
          <p
            className="relative text-lg text-[#B1BAC5] mb-12 max-w-2xl mx-auto animate-reveal-text"
            style={{ animationDelay: "0.3s" }}
          >
            Formazione continua, community esclusiva, 12 live al mese, e supporto diretto da Michele Grotto
          </p>
          <Link
            href={user ? "/area-riservata/dashboard" : "/auth/register"}
            className="group relative inline-flex items-center justify-center px-14 py-6 bg-[#005FD7] hover:bg-[#0051b8] rounded-2xl font-black text-2xl transition-all hover:scale-110 shadow-2xl animate-pulse-glow overflow-hidden animate-scale-in"
            style={{ animationDelay: "0.4s" }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            <span className="relative z-10 flex items-center">
              {user ? "Vai alla Dashboard" : "Inizia Ora"}
              <FiArrowRight className="ml-4 text-3xl group-hover:translate-x-3 transition-transform" />
            </span>
          </Link>

          <p className="relative mt-8 text-[#B1BAC5] animate-slide-up" style={{ animationDelay: "0.6s" }}>
            Nessuna carta richiesta • Cancella quando vuoi • Accesso immediato
          </p>
        </div>
      </section>
    </div>
  )
}
