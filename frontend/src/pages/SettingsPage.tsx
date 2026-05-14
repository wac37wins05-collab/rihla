import { useState } from 'react'
import {
  Settings, Building2, Shield,
  Key, Bell, Palette, Save,
  CheckCircle, AlertTriangle, CreditCard,
  Mail, Phone, MapPin, Percent, User2, Check,
  Clock, Calendar, Rows3, Lock, Smartphone, LogOut,
  Camera, ChevronRight,
} from 'lucide-react'
import { usePref } from '@/hooks/usePref'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui'
import { clsx } from 'clsx'

// ── Reusable toggle ──────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      className={clsx(
        'relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rihla focus:ring-offset-2',
        value ? 'bg-rihla' : 'bg-slate-200 dark:bg-white/10'
      )}
    >
      <span className={clsx(
        'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
        value ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

// ── Pill selector ────────────────────────────────────────────────────────
function PillSelect<T extends string | number>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all',
            value === opt.value
              ? 'bg-rihla text-white border-rihla shadow-md'
              : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-rihla/30',
          )}
        >
          {value === opt.value && <Check size={11} />}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Settings card wrapper ─────────────────────────────────────────────────
function SettingsCard({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
      <h3 className="text-lg font-black text-slate-800 dark:text-cream mb-6 flex items-center gap-2">
        <Icon size={18} className="text-rihla" /> {title}
      </h3>
      {children}
    </div>
  )
}

// ── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuthStore()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      <SettingsCard icon={User2} title="Mon profil">
        <div className="flex items-start gap-6 mb-6 pb-6 border-b border-slate-100 dark:border-white/5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar name={user?.full_name} size={72} />
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-rihla text-white flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity">
              <Camera size={12} />
            </button>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-cream">{user?.full_name ?? '—'}</p>
            <p className="text-[12px] text-slate-500">{user?.email ?? '—'}</p>
            <span className="mt-2 inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rihla/10 text-rihla">
              {(user as any)?.role ?? 'Utilisateur'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Nom complet</label>
            <input type="text" defaultValue={user?.full_name} className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rihla transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Adresse email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
              <input type="email" defaultValue={user?.email} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rihla transition-all" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
              <input type="tel" placeholder="+212 6 00 00 00 00" className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rihla transition-all" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Poste / Titre</label>
            <input type="text" placeholder="Travel Designer, Operations Manager…" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rihla transition-all" />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-rihla text-white text-xs font-bold rounded-xl shadow hover:-translate-y-0.5 transition-all"
          >
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Profil enregistré !' : 'Enregistrer le profil'}
          </button>
        </div>
      </SettingsCard>
    </div>
  )
}

// ── Preferences Tab ────────────────────────────────────────────────────────
function PreferencesTab() {
  const [theme, setTheme]             = usePref<string>('theme', 'light')
  const [language, setLanguage]       = usePref<string>('language', 'fr')
  const [currency, setCurrency]       = usePref<string>('default_currency', 'MAD')
  const [density, setDensity]         = usePref<string>('table_density', 'standard')
  const [dateFormat, setDateFormat]   = usePref<string>('date_format', 'dd/MM/yyyy')
  const [timezone, setTimezone]       = usePref<string>('timezone', 'Africa/Casablanca')
  const [showTips, setShowTips]       = usePref<boolean>('show_tips', true)
  const [emailNotifs, setEmailNotifs] = usePref<boolean>('notifications_email', true)
  const [pushNotifs, setPushNotifs]   = usePref<boolean>('notifications_push', false)
  const [weeklyDigest, setWeeklyDigest] = usePref<boolean>('notifications_weekly_digest', true)
  const [smsNotifs, setSmsNotifs]     = usePref<boolean>('notifications_sms', false)
  const [period, setPeriod]           = usePref<number>('dashboard_period', 30)

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <SettingsCard icon={Palette} title="Apparence">
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">Thème</label>
            <PillSelect
              options={[
                { value: 'light',  label: '☀️ Clair' },
                { value: 'dark',   label: '🌙 Sombre' },
                { value: 'system', label: '🖥 Système' },
              ]}
              value={theme}
              onChange={setTheme}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block flex items-center gap-1">
              <Rows3 size={11} /> Densité des tableaux
            </label>
            <PillSelect
              options={[
                { value: 'comfortable', label: '😌 Confortable' },
                { value: 'standard',    label: '📋 Standard' },
                { value: 'compact',     label: '⚡ Compact' },
              ]}
              value={density}
              onChange={setDensity}
            />
            <p className="mt-2 text-[11px] text-slate-400">
              Contrôle la hauteur des lignes dans tous les tableaux de la plateforme.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Localisation */}
      <SettingsCard icon={Clock} title="Localisation & Formats">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Langue interface</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rihla"
              >
                {[['fr','🇫🇷 Français'],['en','🇬🇧 English'],['de','🇩🇪 Deutsch'],['it','🇮🇹 Italiano'],['es','🇪🇸 Español'],['ar','🇲🇦 العربية']].map(([code, lbl]) => (
                  <option key={code} value={code}>{lbl}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-1">
                <Clock size={11} /> Fuseau horaire
              </label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rihla"
              >
                {[
                  ['Africa/Casablanca', '🇲🇦 Casablanca (WET)'],
                  ['Europe/Paris',      '🇫🇷 Paris (CET)'],
                  ['Europe/London',     '🇬🇧 Londres (GMT)'],
                  ['Asia/Dubai',        '🇦🇪 Dubaï (GST)'],
                  ['America/New_York',  '🇺🇸 New York (ET)'],
                ].map(([tz, lbl]) => (
                  <option key={tz} value={tz}>{lbl}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block flex items-center gap-1">
                <Calendar size={11} /> Format de date
              </label>
              <PillSelect
                options={[
                  { value: 'dd/MM/yyyy', label: '31/12/2025' },
                  { value: 'MM/dd/yyyy', label: '12/31/2025' },
                  { value: 'yyyy-MM-dd', label: '2025-12-31' },
                ]}
                value={dateFormat}
                onChange={setDateFormat}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Devise par défaut</label>
              <PillSelect
                options={[
                  { value: 'MAD', label: 'MAD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'USD', label: 'USD' },
                  { value: 'GBP', label: 'GBP' },
                ]}
                value={currency}
                onChange={setCurrency}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Période par défaut du dashboard</label>
            <PillSelect
              options={[
                { value: 7,  label: '7 jours' },
                { value: 30, label: '30 jours' },
                { value: 90, label: '90 jours' },
              ]}
              value={period}
              onChange={setPeriod}
            />
          </div>
        </div>
      </SettingsCard>

      {/* Notifications */}
      <SettingsCard icon={Bell} title="Notifications">
        <div className="space-y-1">
          {[
            { label: 'Emails de notifications',         sub: 'Alertes projets, devis, factures',           value: emailNotifs,   onChange: setEmailNotifs },
            { label: 'Notifications push (navigateur)', sub: 'Activez dans les permissions du navigateur', value: pushNotifs,    onChange: setPushNotifs },
            { label: 'Digest hebdomadaire',             sub: 'Résumé des KPIs chaque lundi matin',         value: weeklyDigest,  onChange: setWeeklyDigest },
            { label: 'SMS opérationnels',               sub: 'Alertes critiques missions & groupes',       value: smsNotifs,     onChange: setSmsNotifs },
            { label: 'Conseils & tutoriels',            sub: 'Bulles d\'aide in-app pour les nouvelles fonctionnalités', value: showTips, onChange: setShowTips },
          ].map(({ label, sub, value, onChange }) => (
            <div key={label} className="flex items-center justify-between py-3.5 border-b border-slate-100 dark:border-white/5 last:border-0">
              <div>
                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
              </div>
              <Toggle value={value} onChange={onChange} />
            </div>
          ))}
        </div>
      </SettingsCard>
    </div>
  )
}

// ── Security Tab ───────────────────────────────────────────────────────────
function SecurityTab() {
  const [pwSaved, setPwSaved] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [twoFA, setTwoFA] = useState(false)

  const handleChangePassword = () => {
    if (!currentPw || !newPw || newPw !== confirmPw) return
    setPwSaved(true)
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  const INPUT_CLS = 'w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rihla transition-all'

  return (
    <div className="space-y-6">
      <SettingsCard icon={Lock} title="Modifier le mot de passe">
        <div className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Mot de passe actuel</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" className={INPUT_CLS} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Nouveau mot de passe</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" className={INPUT_CLS} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Confirmer le nouveau</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" className={INPUT_CLS} />
            {confirmPw && newPw !== confirmPw && (
              <p className="text-[11px] text-rose-500 font-medium">Les mots de passe ne correspondent pas.</p>
            )}
          </div>
          <button
            onClick={handleChangePassword}
            disabled={!currentPw || !newPw || newPw !== confirmPw}
            className="flex items-center gap-2 px-5 py-2.5 bg-rihla text-white text-xs font-bold rounded-xl shadow hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {pwSaved ? <CheckCircle size={14} /> : <Lock size={14} />}
            {pwSaved ? 'Mot de passe mis à jour !' : 'Changer le mot de passe'}
          </button>
        </div>
      </SettingsCard>

      <SettingsCard icon={Smartphone} title="Authentification à deux facteurs (2FA)">
        <div className="flex items-center justify-between py-3 mb-4 border-b border-slate-100 dark:border-white/5">
          <div>
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Activer la 2FA via application TOTP</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Google Authenticator, Authy, etc.</p>
          </div>
          <Toggle value={twoFA} onChange={setTwoFA} />
        </div>
        {twoFA && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/30 rounded-2xl">
            <p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium">
              Scannez le QR code dans votre application d'authentification pour activer la 2FA.
              Un QR code sera généré lors de la prochaine sauvegarde.
            </p>
          </div>
        )}
      </SettingsCard>

      <SettingsCard icon={LogOut} title="Sessions actives">
        <div className="space-y-2">
          {[
            { device: 'Chrome · macOS', location: 'Marrakech, Maroc', current: true,  lastSeen: 'Maintenant'  },
            { device: 'Firefox · Windows 11', location: 'Casablanca, Maroc', current: false, lastSeen: 'Il y a 2h' },
            { device: 'Chrome · iPhone 15',   location: 'Paris, France',    current: false, lastSeen: 'Hier'       },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-cream flex items-center gap-2">
                  {s.device}
                  {s.current && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Session actuelle</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.location} · {s.lastSeen}</p>
              </div>
              {!s.current && (
                <button className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors">
                  Révoquer
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="mt-4 text-[12px] font-bold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1">
          <LogOut size={13} /> Déconnecter toutes les autres sessions
        </button>
      </SettingsCard>
    </div>
  )
}

type TabId = 'profile' | 'agency' | 'finance' | 'api' | 'security' | 'prefs'

const INPUT_CLS = 'w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rihla transition-all'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'profile',  label: 'Mon Profil',         icon: User2 },
    { id: 'prefs',    label: 'Mes Préférences',     icon: Palette },
    { id: 'security', label: 'Sécurité',            icon: Shield },
    { id: 'agency',   label: 'Profil Agence',       icon: Building2 },
    { id: 'finance',  label: 'Finance & Taxes',     icon: Percent },
    { id: 'api',      label: 'Intégrations API',    icon: Key },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 shadow-inner">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-cream">Paramètres</h1>
              <p className="text-slate-400 text-xs mt-0.5 uppercase tracking-widest font-bold">Profil · Préférences · Configuration Enterprise</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 flex gap-8">

        {/* Navigation Sidebar */}
        <aside className="w-60 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={clsx(
                  'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group',
                  activeTab === item.id
                    ? 'bg-rihla text-white shadow-md'
                    : 'text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon size={16} />
                  {item.label}
                </span>
                <ChevronRight size={13} className={activeTab === item.id ? 'opacity-70' : 'opacity-0 group-hover:opacity-30'} />
              </button>
            ))}
          </nav>

          <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertTriangle size={14} />
              <p className="text-[10px] font-black uppercase">Note</p>
            </div>
            <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 leading-relaxed">
              Certaines modifications (Finance, API) peuvent impacter les cotations et opérations en cours.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 space-y-6">

          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'prefs'   && <PreferencesTab />}
          {activeTab === 'security' && <SecurityTab />}

          {activeTab === 'agency' && (
            <SettingsCard icon={Building2} title="Identité de l'Agence">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nom commercial</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" defaultValue="S'TOURS DMC Morocco" className={clsx(INPUT_CLS, 'pl-12')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Identifiant Fiscal (ICE)</label>
                  <input type="text" defaultValue="001524389000065" className={INPUT_CLS} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email de contact</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="email" defaultValue="ops@stours.ma" className={clsx(INPUT_CLS, 'pl-12')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" defaultValue="+212 524 433 030" className={clsx(INPUT_CLS, 'pl-12')} />
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Siège Social</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" defaultValue="Angle Av. Mansour Eddahbi & Rue Imam Chaffai, Marrakech" className={clsx(INPUT_CLS, 'pl-12')} />
                  </div>
                </div>
              </div>
            </SettingsCard>
          )}

          {activeTab === 'finance' && (
            <SettingsCard icon={CreditCard} title="Paramètres Financiers">
              <div className="space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'TVA sur Prestations', defaultValue: 20 },
                    { label: 'TVA sur Transport',   defaultValue: 14 },
                    { label: 'Marge Sécurité',      defaultValue: 3  },
                  ].map(({ label, defaultValue }) => (
                    <div key={label} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{label}</p>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue={defaultValue} className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-cream outline-none" />
                        <span className="font-black text-slate-400">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-800 dark:text-cream flex items-center gap-2">
                    <CreditCard size={16} className="text-rihla" /> Informations Bancaires
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Nom de la Banque" defaultValue="Attijariwafa Bank" className={INPUT_CLS} />
                    <input type="text" placeholder="SWIFT / BIC" defaultValue="BCPAMA21" className={INPUT_CLS} />
                    <input type="text" placeholder="IBAN" defaultValue="MA64 007 123 0000 4567 8901 2345" className={clsx(INPUT_CLS, 'col-span-2')} />
                  </div>
                </div>
              </div>
            </SettingsCard>
          )}

          {activeTab === 'api' && (
            <SettingsCard icon={Key} title="Connecteurs Externes">
              <div className="space-y-4">
                {[
                  { name: 'OpenAI GPT-4',          desc: 'Génération d\'itinéraires et Content Studio', error: false },
                  { name: 'Fixer.io API',           desc: 'Taux de change Live (Forex)',                 error: false },
                  { name: 'Google Maps Platform',   desc: 'Calcul des distances et géocodage',           error: true  },
                  { name: 'WhatsApp Business API',  desc: 'Notifications clients & communication',       error: false },
                ].map((api, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', api.error ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-600')}>
                        <Key size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-cream text-[13px]">{api.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{api.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={clsx('text-[10px] font-black uppercase', api.error ? 'text-red-500' : 'text-emerald-600')}>
                        {api.error ? 'Action requise' : 'Connecté'}
                      </span>
                      <button className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-50 transition-all">
                        Configurer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SettingsCard>
          )}
        </div>
      </div>
    </div>
  )
}
