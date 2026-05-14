import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Medal, Star, Target, Zap,
  Crown, Flame, Award, ChevronRight,
  TrendingUp, Users, RefreshCw, MapPin,
  Calendar, BarChart3, Shield, Sparkles,
  CheckCircle2, Lock, Gift, ChevronUp,
  Swords, Flag, ArrowUp, ArrowDown, Minus,
} from 'lucide-react'
import { gamificationApi } from '@/lib/api'
import { clsx } from 'clsx'

// ─── Types & Config ──────────────────────────────────────────────────────────

interface LeaderUser {
  name: string
  points: number
  level: number
  won: number
  rev: string
  avatar: null
  badges: string[]
  streak?: number
  change?: number   // rank change from last week: +n/-n/0
  xpCurrent?: number
  xpNext?: number
}

const MOCK_USERS: LeaderUser[] = [
  { name: 'Youssef Alami',   points: 12450, level: 12, won: 45, rev: '2.4M',  avatar: null, badges: ['top_seller','marrakech_expert','luxury_guru'], streak: 14, change: 0,  xpCurrent: 950, xpNext: 1200 },
  { name: 'Sarah Mansouri',  points: 10200, level: 10, won: 38, rev: '1.8M',  avatar: null, badges: ['fast_closer','mice_king'],                       streak: 7,  change: 2,  xpCurrent: 400, xpNext: 1000 },
  { name: 'Karim Bennani',   points: 9800,  level: 9,  won: 34, rev: '1.5M',  avatar: null, badges: ['desert_specialist'],                             streak: 5,  change: -1, xpCurrent: 750, xpNext: 800  },
  { name: 'Meryem Idrissi',  points: 8500,  level: 8,  won: 29, rev: '1.2M',  avatar: null, badges: [],                                               streak: 3,  change: 1,  xpCurrent: 200, xpNext: 700  },
  { name: 'Ahmed Zaki',      points: 7200,  level: 7,  won: 22, rev: '950k',  avatar: null, badges: ['fast_closer'],                                   streak: 0,  change: -2, xpCurrent: 600, xpNext: 650  },
  { name: 'Laila Boukhris',  points: 6100,  level: 6,  won: 18, rev: '780k',  avatar: null, badges: [],                                               streak: 8,  change: 3,  xpCurrent: 100, xpNext: 500  },
  { name: 'Omar Tazi',       points: 5300,  level: 5,  won: 15, rev: '620k',  avatar: null, badges: [],                                               streak: 1,  change: 0,  xpCurrent: 300, xpNext: 450  },
]

const BADGE_CATALOG: Record<string, { label: string; description: string; icon: typeof Crown; color: string; bg: string; rare?: boolean }> = {
  top_seller:        { label: 'Top Seller',        description: '+50 dossiers confirmés',     icon: Crown,   color: 'text-amber-500',  bg: 'bg-amber-100 dark:bg-amber-500/15',  rare: true },
  fast_closer:       { label: 'Fast Closer',        description: 'Cotation → Confirmation < 48h', icon: Zap, color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-500/15' },
  marrakech_expert:  { label: 'Marrakech Master',   description: 'Expert destination Marrakech',  icon: MapPin, color: 'text-rihla',  bg: 'bg-rihla/10' },
  luxury_guru:       { label: 'Luxury Guru',         description: '10 circuits 5★ vendus',         icon: Star,   color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/15', rare: true },
  desert_specialist: { label: 'Desert King',         description: 'Expert circuits désert',         icon: Flame,  color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/15' },
  mice_king:         { label: 'MICE King',            description: '5 événements corporate',         icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
  customer_star:     { label: 'Client Favorite',     description: 'Note moyenne > 4.8★',           icon: Star,   color: 'text-pink-500',  bg: 'bg-pink-100 dark:bg-pink-500/15' },
  streak_master:     { label: 'Streak Master',        description: '14 jours consécutifs actif',    icon: Flame,  color: 'text-rose-500',  bg: 'bg-rose-100 dark:bg-rose-500/15', rare: true },
}

const MONTHLY_CHALLENGES = [
  { id: 'c1', title: 'Qualifier 20 leads',         icon: Target,   points: 500,  progress: 14, total: 20, done: false },
  { id: 'c2', title: 'Convertir 5 dossiers MICE',  icon: Swords,   points: 800,  progress: 3,  total: 5,  done: false },
  { id: 'c3', title: 'Envoyer 10 devis en 48h',    icon: Zap,      points: 300,  progress: 10, total: 10, done: true },
  { id: 'c4', title: 'Atteindre 1 MDH de CA',      icon: Flag,     points: 1000, progress: 780000, total: 1000000, done: false, isBudget: true },
]

const TEAMS = [
  { name: 'Team Sahara',   members: ['Youssef Alami', 'Ahmed Zaki'],             points: 19650, color: 'bg-amber-400' },
  { name: 'Team Atlas',    members: ['Sarah Mansouri', 'Laila Boukhris'],         points: 16300, color: 'bg-blue-400' },
  { name: 'Team Medina',   members: ['Karim Bennani', 'Meryem Idrissi', 'Omar Tazi'], points: 23600, color: 'bg-emerald-400' },
]

const ROLE_LABELS: Record<string, string> = {
  travel_designer: 'Travel Designer',
  guide: 'Guide',
  driver: 'Chauffeur',
  sales_agent: 'Commercial',
}

type TabId = 'classement' | 'equipes' | 'badges' | 'defis'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2)
}

function fmtBudget(v: number) {
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const [activeRole, setActiveRole] = useState('travel_designer')
  const [tab, setTab] = useState<TabId>('classement')
  const [selectedUser, setSelectedUser] = useState<LeaderUser | null>(null)

  const { data: leaderboard = [], isLoading, refetch } = useQuery({
    queryKey: ['leaderboard', activeRole],
    queryFn: () => gamificationApi.getLeaderboard(activeRole).then(r => r.data),
  })

  const displayData: LeaderUser[] = leaderboard.length > 0 ? leaderboard : MOCK_USERS

  const topThree = displayData.slice(0, 3)
  const rest = displayData.slice(3)

  const TABS: { id: TabId; label: string; icon: typeof Trophy }[] = [
    { id: 'classement', label: 'Classement', icon: Trophy },
    { id: 'equipes',    label: 'Équipes',    icon: Users },
    { id: 'badges',     label: 'Badges',     icon: Award },
    { id: 'defis',      label: 'Défis',      icon: Target },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-white/10">
        {/* Decorative glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 left-1/3 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
          <div className="absolute -top-12 right-1/4 w-64 h-64 bg-rihla/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-6">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-[28px] bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-2xl shadow-amber-400/30">
                <Trophy size={30} className="text-slate-900" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tighter italic">Champions Arena</h1>
                <p className="text-slate-400 text-[11px] mt-1 uppercase tracking-[0.3em] font-bold">Performance & Gamification S'TOURS · Mai 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
                <Flame size={12} /> Mois en cours
              </div>
              <button onClick={() => refetch()} className="text-slate-400 hover:text-white p-2 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Role selector */}
          <div className="flex gap-1 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit">
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={clsx(
                  'px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all',
                  activeRole === role
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Podium ── */}
        <div className="relative max-w-6xl mx-auto px-6 pb-10">
          <div className="grid grid-cols-3 gap-4 md:gap-8 items-end max-w-2xl mx-auto">
            {/* Silver #2 */}
            <PodiumCard rank={2} user={topThree[1]} color="from-slate-300 to-slate-400" textColor="text-slate-600" onClick={() => setSelectedUser(topThree[1])} />
            {/* Gold #1 — elevated */}
            <PodiumCard rank={1} user={topThree[0]} color="from-amber-300 to-amber-500" textColor="text-amber-700" featured onClick={() => setSelectedUser(topThree[0])} />
            {/* Bronze #3 */}
            <PodiumCard rank={3} user={topThree[2]} color="from-orange-300 to-orange-400" textColor="text-orange-700" onClick={() => setSelectedUser(topThree[2])} />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[16px] p-1.5">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-bold transition-all',
                  tab === t.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ── TAB: CLASSEMENT ── */}
        {tab === 'classement' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Classement Général · {ROLE_LABELS[activeRole]}</h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                <TrendingUp size={11} /> +12% ce mois
              </div>
            </div>

            {isLoading && (
              <div className="text-center py-16 text-slate-400 text-sm">Chargement…</div>
            )}

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {rest.map((user, i) => {
                const rank = i + 4
                const xpPct = user.xpCurrent && user.xpNext ? Math.round((user.xpCurrent / user.xpNext) * 100) : 0
                return (
                  <button
                    key={user.name}
                    onClick={() => setSelectedUser(selectedUser?.name === user.name ? null : user)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-5">
                      {/* Rank */}
                      <div className="w-8 text-center">
                        <span className="text-[13px] font-black text-slate-300 group-hover:text-rihla transition-colors">#{rank}</span>
                      </div>
                      {/* Change indicator */}
                      <div className="w-5 flex justify-center">
                        {user.change == null || user.change === 0 ? (
                          <Minus size={11} className="text-slate-300" />
                        ) : user.change > 0 ? (
                          <ArrowUp size={11} className="text-emerald-500" />
                        ) : (
                          <ArrowDown size={11} className="text-rose-500" />
                        )}
                      </div>
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-black text-slate-400 dark:text-slate-300 text-[12px] group-hover:scale-105 transition-transform">
                            {initials(user.name)}
                          </div>
                          {user.streak && user.streak >= 7 && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                              <Flame size={8} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-800 dark:text-cream">{user.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">Niv. {user.level}</span>
                            {user.streak ? (
                              <span className="text-[10px] text-orange-500 font-bold">{user.streak}🔥</span>
                            ) : null}
                            {/* Mini XP bar */}
                            <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                              <div className="bg-rihla h-1 rounded-full" style={{ width: `${xpPct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-10">
                      {/* Badges */}
                      <div className="hidden md:flex items-center gap-1">
                        {user.badges.slice(0, 3).map(b => {
                          const badge = BADGE_CATALOG[b]
                          if (!badge) return null
                          const Icon = badge.icon
                          return (
                            <div key={b} title={badge.label} className={clsx('w-6 h-6 rounded-lg flex items-center justify-center', badge.bg)}>
                              <Icon size={11} className={badge.color} />
                            </div>
                          )
                        })}
                      </div>
                      <div className="text-right min-w-[70px]">
                        <p className="text-[13px] font-black text-slate-800 dark:text-cream">{user.points.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Points</p>
                      </div>
                      <div className="text-right min-w-[50px] hidden sm:block">
                        <p className="text-[13px] font-black text-amber-500">{user.rev}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CA</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-200 group-hover:text-rihla transition-colors" />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Expanded user detail */}
            {selectedUser && !topThree.includes(selectedUser) && (
              <UserDetailPanel user={selectedUser} />
            )}
          </div>
        )}

        {/* ── TAB: ÉQUIPES ── */}
        {tab === 'equipes' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEAMS.sort((a, b) => b.points - a.points).map((team, i) => (
                <div key={team.name} className={clsx(
                  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5 relative overflow-hidden',
                  i === 0 ? 'ring-2 ring-amber-400' : '',
                )}>
                  {i === 0 && (
                    <div className="absolute top-3 right-3">
                      <Crown size={16} className="text-amber-500" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={clsx('w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-[11px] shadow', team.color)}>
                      #{i + 1}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 dark:text-cream">{team.name}</p>
                      <p className="text-[10px] text-slate-400">{team.members.length} membres</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-cream mb-1">{team.points.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">Points équipe</p>
                  <div className="space-y-1.5">
                    {team.members.map(m => {
                      const u = displayData.find(d => d.name === m)
                      return (
                        <div key={m} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-400">
                            {initials(m)}
                          </div>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">{m}</span>
                          {u && <span className="ml-auto text-[10px] font-bold text-rihla">{u.points.toLocaleString()}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Team points bar chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Comparatif des équipes</p>
              <div className="space-y-4">
                {TEAMS.sort((a, b) => b.points - a.points).map((team, i) => {
                  const maxPts = Math.max(...TEAMS.map(t => t.points))
                  const pct = Math.round((team.points / maxPts) * 100)
                  return (
                    <div key={team.name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[12px] font-bold text-slate-700 dark:text-cream">{team.name}</span>
                        <span className="text-[12px] font-black text-rihla">{team.points.toLocaleString()} pts</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div
                          className={clsx('h-3 rounded-full transition-all', i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-blue-400' : 'bg-emerald-400')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: BADGES ── */}
        {tab === 'badges' && (
          <div className="space-y-4">
            {/* Earned */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">
                🏅 Badges disponibles ({Object.keys(BADGE_CATALOG).length})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(BADGE_CATALOG).map(([id, badge]) => {
                  const Icon = badge.icon
                  const earnedBy = displayData.filter(u => u.badges.includes(id))
                  return (
                    <div
                      key={id}
                      className={clsx(
                        'relative p-4 rounded-[16px] border transition-all hover:shadow-md',
                        badge.bg,
                        badge.rare ? 'border-amber-300 dark:border-amber-500/30' : 'border-slate-200 dark:border-slate-700',
                      )}
                    >
                      {badge.rare && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-400/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                          <Sparkles size={9} />
                          <span className="text-[8px] font-black uppercase">Rare</span>
                        </div>
                      )}
                      <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center mb-3', 'bg-white dark:bg-slate-900/50 shadow-sm')}>
                        <Icon size={22} className={badge.color} />
                      </div>
                      <p className="text-[12px] font-bold text-slate-800 dark:text-cream">{badge.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{badge.description}</p>
                      {earnedBy.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <div className="flex -space-x-1.5">
                            {earnedBy.slice(0, 3).map(u => (
                              <div key={u.name} className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-900 flex items-center justify-center text-[7px] font-black text-slate-500">
                                {initials(u.name)}
                              </div>
                            ))}
                          </div>
                          <span className="text-[9px] text-slate-400">{earnedBy.length} détenteur{earnedBy.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {earnedBy.length === 0 && (
                        <div className="flex items-center gap-1 mt-2 text-slate-400">
                          <Lock size={9} />
                          <span className="text-[9px]">Pas encore décerné</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: DÉFIS ── */}
        {tab === 'defis' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-rihla/5 to-amber-500/5 border border-rihla/20 rounded-[20px] p-5">
              <div className="flex items-center gap-3 mb-1">
                <Target size={18} className="text-rihla" />
                <p className="font-bold text-slate-800 dark:text-cream">Défis du Mois — Mai 2026</p>
              </div>
              <p className="text-[12px] text-slate-500">Complétez les défis pour gagner des points XP et des badges exclusifs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MONTHLY_CHALLENGES.map(challenge => {
                const Icon = challenge.icon
                const pct = challenge.isBudget
                  ? Math.round((challenge.progress / challenge.total) * 100)
                  : Math.round((challenge.progress / challenge.total) * 100)
                const pctCapped = Math.min(pct, 100)

                return (
                  <div
                    key={challenge.id}
                    className={clsx(
                      'bg-white dark:bg-slate-900 border rounded-[20px] p-5 transition-all',
                      challenge.done
                        ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
                        : 'border-slate-200 dark:border-slate-800',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-11 h-11 rounded-2xl flex items-center justify-center',
                          challenge.done ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-slate-100 dark:bg-slate-800',
                        )}>
                          {challenge.done
                            ? <CheckCircle2 size={20} className="text-emerald-500" />
                            : <Icon size={20} className="text-slate-500" />
                          }
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-800 dark:text-cream">{challenge.title}</p>
                          {challenge.done && (
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full">✓ Complété</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-xl shrink-0">
                        <Gift size={12} />
                        <span className="text-[11px] font-black">+{challenge.points} pts</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-500">Progression</span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {challenge.isBudget
                            ? `${fmtBudget(challenge.progress)} / ${fmtBudget(challenge.total)}`
                            : `${challenge.progress} / ${challenge.total}`
                          }
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={clsx(
                            'h-2.5 rounded-full transition-all duration-700',
                            challenge.done ? 'bg-emerald-500' : pctCapped >= 80 ? 'bg-amber-400' : 'bg-rihla',
                          )}
                          style={{ width: `${pctCapped}%` }}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-slate-400">{pctCapped}% accompli</span>
                        {!challenge.done && pctCapped < 100 && (
                          <span className="text-[10px] text-rihla font-bold">
                            encore {challenge.isBudget
                              ? fmtBudget(challenge.total - challenge.progress)
                              : `${challenge.total - challenge.progress}`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Point shop teaser */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border border-white/10 rounded-[20px] p-6 text-center">
              <Sparkles size={24} className="mx-auto text-amber-400 mb-3" />
              <p className="text-white font-black text-lg mb-1">Boutique de Récompenses</p>
              <p className="text-slate-400 text-[12px] mb-4">Échangez vos points contre des avantages exclusifs</p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { label: 'Jour off supplémentaire', pts: 2000 },
                  { label: 'Formation certifiante', pts: 5000 },
                  { label: 'Badge Légende', pts: 10000 },
                ].map(item => (
                  <div key={item.label} className="bg-white/10 border border-white/10 rounded-xl px-4 py-2">
                    <p className="text-white text-[12px] font-bold">{item.label}</p>
                    <p className="text-amber-400 text-[11px] font-black">{item.pts.toLocaleString()} pts</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Podium Card ─────────────────────────────────────────────────────────────

function PodiumCard({ rank, user, color, textColor, featured, onClick }: {
  rank: number
  user?: LeaderUser
  color: string
  textColor: string
  featured?: boolean
  onClick?: () => void
}) {
  if (!user) return <div />

  const badges = user.badges.slice(0, 2)
  const xpPct = user.xpCurrent && user.xpNext ? Math.round((user.xpCurrent / user.xpNext) * 100) : 0

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative bg-white/10 backdrop-blur-sm rounded-[32px] border border-white/10 text-center transition-all duration-300 hover:bg-white/15 hover:scale-105 group w-full',
        featured ? 'p-6 scale-110 z-10 border-amber-400/30 bg-white/15' : 'p-4 z-0',
      )}
    >
      {/* Rank badge */}
      <div className={clsx(
        'absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl bg-gradient-to-br',
        color,
      )}>
        {rank === 1 ? <Crown size={16} className={textColor} />
          : rank === 2 ? <Medal size={16} className={textColor} />
          : <Award size={16} className={textColor} />}
      </div>

      <div className="mt-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-[24px] bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 text-xl font-black text-white group-hover:scale-105 transition-transform duration-300">
          {initials(user.name)}
        </div>

        <p className="text-[13px] font-black text-white leading-tight">{user.name}</p>
        <div className="flex items-center justify-center gap-1 mt-1 text-slate-400 text-[10px]">
          <span>Niv. {user.level}</span>
          {user.streak ? <span className="text-orange-400">· {user.streak}🔥</span> : null}
        </div>

        {/* XP bar */}
        <div className="w-full bg-white/10 rounded-full h-1 mt-2 mb-3 overflow-hidden">
          <div className="bg-amber-400 h-1 rounded-full" style={{ width: `${xpPct}%` }} />
        </div>

        <div className="flex justify-center gap-3">
          <div>
            <p className={clsx('text-lg font-black', featured ? 'text-xl' : 'text-base',
              rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-200' : 'text-orange-300')}>
              {user.points.toLocaleString()}
            </p>
            <p className="text-[8px] text-slate-500 uppercase tracking-wider">pts</p>
          </div>
          <div>
            <p className="text-[14px] font-black text-white">{user.rev}</p>
            <p className="text-[8px] text-slate-500 uppercase tracking-wider">CA</p>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex justify-center gap-1 mt-3">
            {badges.map(b => {
              const badge = BADGE_CATALOG[b]
              if (!badge) return null
              const Icon = badge.icon
              return (
                <div key={b} title={badge.label} className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon size={12} className={badge.color} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </button>
  )
}

// ─── User Detail Panel ────────────────────────────────────────────────────────

function UserDetailPanel({ user }: { user: LeaderUser }) {
  const xpPct = user.xpCurrent && user.xpNext ? Math.round((user.xpCurrent / user.xpNext) * 100) : 0
  return (
    <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-950/50 px-6 py-5">
      <div className="flex flex-wrap gap-6 items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Niveau & XP</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-black text-rihla">Niv. {user.level}</span>
            <span className="text-[11px] text-slate-500">{user.xpCurrent} / {user.xpNext} XP</span>
          </div>
          <div className="w-40 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="bg-rihla h-2 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Badges ({user.badges.length})</p>
          <div className="flex gap-2 flex-wrap">
            {user.badges.length > 0 ? user.badges.map(b => {
              const badge = BADGE_CATALOG[b]
              if (!badge) return null
              const Icon = badge.icon
              return (
                <div key={b} title={badge.label} className={clsx('flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold', badge.bg, badge.color)}>
                  <Icon size={11} />
                  {badge.label}
                </div>
              )
            }) : <span className="text-[11px] text-slate-400">Aucun badge</span>}
          </div>
        </div>

        <div className="ml-auto grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-black text-slate-800 dark:text-cream">{user.won}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Confirmés</p>
          </div>
          <div>
            <p className="text-lg font-black text-amber-500">{user.rev}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">CA généré</p>
          </div>
          <div>
            <p className="text-lg font-black text-orange-500">{user.streak ?? 0}🔥</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Jours actif</p>
          </div>
        </div>
      </div>
    </div>
  )
}
