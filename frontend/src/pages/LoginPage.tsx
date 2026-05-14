import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { getHomeRoute } from '@/lib/roleConfig'
import { Spinner } from '@/components/ui'
import { ArrowRight, Mail, Lock } from 'lucide-react'
import rihlaLogoLight from '@/assets/rihla_logo_light_bg.png'

export function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      const role = useAuthStore.getState().user?.role?.name ?? 'sales_agent'
      navigate(getHomeRoute(role))
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Identifiants invalides')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F3EA] text-slate-950">
      {/* Top header bar */}
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-[#E2D2C2] bg-white/95 shadow-sm">
        <img src={rihlaLogoLight} alt="RIHLA" className="h-9 w-auto" />
        <div className="text-[13px] font-semibold text-slate-700">
          Besoin d'un compte ?{' '}
          <a href="mailto:a.chakir@stoursvoyages.ma" className="text-rihla font-extrabold hover:underline">
            Nous contacter
          </a>
        </div>
      </header>

      {/* Centered form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 bg-[radial-gradient(circle_at_top_left,_rgba(91,25,20,0.10),_transparent_36%),linear-gradient(135deg,_#fff7ee_0%,_#f8f3ea_50%,_#ffffff_100%)]">
        <div className="w-full max-w-[460px] rounded-[28px] border border-[#D6C0AF] bg-white p-8 sm:p-10 shadow-[0_28px_70px_rgba(54,16,13,0.16)]">
          <h1 className="text-[34px] font-black text-slate-950 tracking-tight">
            RIHLA Suite
          </h1>
          <p className="text-[13px] uppercase tracking-[0.2em] text-rihla mt-1 font-black">
            DMC Operating System
          </p>
          <p className="text-[15px] text-slate-700 mt-4 font-semibold leading-6">
            O2C · P2P · Itinerary Studio · Field Ops · Joule Agents
          </p>
          <p className="text-[16px] text-slate-900 mt-6 font-bold">
            Connexion à votre espace STOURS VOYAGES.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-300 px-4 py-3 text-[14px] font-semibold text-rose-800">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[13px] font-extrabold text-slate-900 mb-2">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-rihla" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@stoursvoyages.ma"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-slate-300 bg-white text-[15px]
                             text-slate-950 placeholder:text-slate-500 font-semibold
                             focus:outline-none focus:border-rihla focus:ring-4 focus:ring-rihla/15
                             transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[13px] font-extrabold text-slate-900">
                  Mot de passe
                </label>
                <a href="#" className="text-[13px] font-bold text-rihla hover:underline">
                  Oublié&nbsp;?
                </a>
              </div>
              <div className="relative">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-rihla" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-slate-300 bg-white text-[15px]
                             text-slate-950 placeholder:text-slate-500 font-semibold
                             focus:outline-none focus:border-rihla focus:ring-4 focus:ring-rihla/15
                             transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl
                         bg-rihla text-white text-[16px] font-extrabold shadow-lg shadow-rihla/20
                         hover:bg-rihla-dark active:bg-rihla-dark
                         disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <Spinner className="text-white" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] font-semibold text-slate-600">
            Accès restreint aux membres de l'équipe STOURS VOYAGES.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-10 py-5 border-t border-[#E2D2C2] bg-white/95 flex items-center justify-between text-[12px] font-semibold text-slate-600">
        <span>© 2026 RIHLA Suite · STOURS VOYAGES Morocco</span>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-rihla">Statut</a>
          <a href="#" className="hover:text-rihla">Confidentialité</a>
          <a href="#" className="hover:text-rihla">CGU</a>
        </div>
      </footer>
    </div>
  )
}
