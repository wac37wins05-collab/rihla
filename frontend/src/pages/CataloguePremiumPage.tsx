import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2, UtensilsCrossed, Mountain, UserRound, Star, MapPin, Phone,
  Mail, Globe, Sparkles, Crown, Search, RefreshCw, X, Calendar,
  Award, Users, Tag,
} from 'lucide-react'
import { catalogueApi, type CatalogueItem, type CatalogueStats } from '@/lib/api'

type Kind = 'hotel' | 'restaurant' | 'activity' | 'guide'

const VALID_KINDS: Kind[] = ['hotel', 'restaurant', 'activity', 'guide']

const KIND_META: Record<Kind, { label: string; icon: any; color: string; bg: string }> = {
  hotel:      { label: 'Hôtels',      icon: Building2,        color: 'text-amber-700',  bg: 'bg-amber-50  border-amber-200' },
  restaurant: { label: 'Restaurants', icon: UtensilsCrossed, color: 'text-rose-700',   bg: 'bg-rose-50   border-rose-200' },
  activity:   { label: 'Activités',   icon: Mountain,         color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200' },
  guide:      { label: 'Guides',      icon: UserRound,        color: 'text-sky-700',    bg: 'bg-sky-50    border-sky-200' },
}

function fmtMoney(n: number, ccy = 'MAD') {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' ' + ccy
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={
          i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
        } />
      ))}
      <span className="ml-1 text-[11px] font-semibold text-slate-700">{value.toFixed(2)}</span>
    </div>
  )
}

export function CataloguePremiumPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialKind = (() => {
    const k = searchParams.get('kind') as Kind | null
    return k && VALID_KINDS.includes(k) ? k : 'hotel'
  })()
  const [kind, setKindState] = useState<Kind>(initialKind)
  const setKind = (k: Kind) => {
    setKindState(k)
    const next = new URLSearchParams(searchParams)
    next.set('kind', k)
    setSearchParams(next, { replace: true })
  }
  // sync state when URL changes externally (sidebar nav between sub-entries)
  useEffect(() => {
    const k = searchParams.get('kind') as Kind | null
    if (k && VALID_KINDS.includes(k) && k !== kind) setKindState(k)
    // eslint-disable-next-line
  }, [searchParams])
  const [items, setItems] = useState<CatalogueItem[]>([])
  const [stats, setStats] = useState<CatalogueStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [city, setCity] = useState<string>('')
  const [preferredOnly, setPreferredOnly] = useState(false)
  const [selected, setSelected] = useState<CatalogueItem | null>(null)
  const [seedMessage, setSeedMessage] = useState<string>('')

  async function refresh() {
    setLoading(true)
    try {
      const [itemsRes, statsRes] = await Promise.all([
        catalogueApi.items({ kind, q: q || undefined, city: city || undefined, preferred: preferredOnly || undefined }),
        catalogueApi.stats(),
      ])
      setItems(itemsRes.data || [])
      setStats(statsRes.data || null)
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() /* eslint-disable-next-line */ }, [kind, q, city, preferredOnly])

  async function seedNow() {
    setLoading(true)
    try {
      const res = await catalogueApi.seedRich(false)
      setSeedMessage(`✓ ${res.data.created + res.data.updated} items chargés (${res.data.totals.hotels}H · ${res.data.totals.restaurants}R · ${res.data.totals.activities}A · ${res.data.totals.guides}G)`)
      await refresh()
    } finally { setLoading(false) }
  }

  const cities = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.by_city).sort((a, b) => b[1] - a[1])
  }, [stats])

  const kindStats = stats?.by_kind || {}
  const priceRange = stats?.price_ranges?.[kind]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Catalogue Premium</h1>
              <p className="mt-1 text-sm text-slate-500">
                Hôtels · Restaurants · Activités · Guides — données détaillées partenaires S'TOURS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={seedNow}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={14} />Seed démo
              </button>
              <button
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <RefreshCw size={14} />Rafraîchir
              </button>
            </div>
          </div>

          {seedMessage && (
            <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 border border-emerald-200">
              {seedMessage}
            </div>
          )}

          {/* Stats hero */}
          {stats && (
            <div className="mt-5 grid grid-cols-2 lg:grid-cols-6 gap-3">
              {(['hotel', 'restaurant', 'activity', 'guide'] as Kind[]).map(k => {
                const M = KIND_META[k]
                const count = kindStats[k] || 0
                const isActive = kind === k
                return (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`rounded-xl border-2 p-3 text-left transition ${isActive ? `${M.bg} shadow-sm` : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-2">
                      <M.icon size={18} className={M.color} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{M.label}</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <div className="text-2xl font-bold text-slate-900">{count}</div>
                      <span className="text-xs text-slate-500">items</span>
                    </div>
                  </button>
                )
              })}
              <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <Crown size={18} className="text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Préférés</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <div className="text-2xl font-bold text-amber-600">{stats.preferred}</div>
                  <span className="text-xs text-slate-500">/ {stats.total}</span>
                </div>
              </div>
              <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-violet-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Note moy.</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <div className="text-2xl font-bold text-violet-600">{stats.avg_rating.toFixed(2)}</div>
                  <span className="text-xs text-slate-500">/ 5</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body : filter sidebar + grid */}
      <div className="mx-auto max-w-[1400px] px-6 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar filters */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Recherche</div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Nom, ville, mot-clé…"
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Filtres</div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox" checked={preferredOnly}
                onChange={e => setPreferredOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Crown size={14} className="text-amber-500" />
              Partenaires préférés
            </label>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Villes</div>
            <div className="space-y-1 max-h-72 overflow-auto">
              <button
                onClick={() => setCity('')}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex justify-between items-center ${!city ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'}`}
              >
                <span>Toutes</span>
                <span className="text-xs text-slate-400">{stats?.total ?? 0}</span>
              </button>
              {cities.map(([c, n]) => (
                <button
                  key={c}
                  onClick={() => setCity(c === city ? '' : c)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex justify-between items-center ${city === c ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'}`}
                >
                  <span className="truncate">{c}</span>
                  <span className="text-xs text-slate-400">{n}</span>
                </button>
              ))}
            </div>
          </div>

          {priceRange && (
            <div className="rounded-xl border bg-white p-4 text-xs space-y-1">
              <div className="font-semibold uppercase tracking-wide text-slate-500 mb-2">Tarif {KIND_META[kind].label}</div>
              <div className="flex justify-between"><span className="text-slate-500">Min</span><span className="font-medium">{fmtMoney(priceRange.min)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Moyen</span><span className="font-medium">{fmtMoney(priceRange.avg)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Max</span><span className="font-medium">{fmtMoney(priceRange.max)}</span></div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="col-span-12 lg:col-span-9">
          {loading && <div className="text-sm text-slate-500 mb-2">Chargement…</div>}
          {!loading && items.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-slate-600 mb-3">Aucun item chargé.</p>
              <button onClick={seedNow} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium">
                Charger les 82 items démo
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(item => (
              <article
                key={item.id}
                onClick={() => setSelected(item)}
                className="rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition overflow-hidden cursor-pointer flex flex-col"
              >
                <div className="relative h-40 bg-slate-100">
                  {item.cover_url && (
                    <img src={item.cover_url} alt={item.name} className="w-full h-full object-cover" loading="lazy"
                         onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {item.is_preferred && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow"><Crown size={10} />Préféré</span>
                    )}
                    {item.is_exclusive && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-600/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow"><Sparkles size={10} />Exclusif</span>
                    )}
                  </div>
                  {item.stars && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/85 text-white text-[10px] font-semibold flex items-center gap-0.5">
                      {item.stars}<Star size={10} className="fill-amber-400 text-amber-400" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 leading-tight">{item.name}</h3>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                    <MapPin size={11} />{item.city}{item.region ? ` · ${item.region}` : ''}
                  </div>
                  {item.category && (
                    <span className="mt-2 inline-block self-start px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">{item.category}</span>
                  )}
                  {item.short_description && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2">{item.short_description}</p>
                  )}
                  <div className="mt-3 flex items-end justify-between">
                    <StarRating value={item.rating} />
                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900">{fmtMoney(item.unit_cost, item.currency)}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wide">{item.cost_unit.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

// ─── Detail modal ────────────────────────────────────────────────────────────
function DetailModal({ item, onClose }: { item: CatalogueItem; onClose: () => void }) {
  const M = KIND_META[item.kind as Kind]
  const specs = item.specs || {}

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center overflow-auto p-6"
         onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl my-6"
           onClick={e => e.stopPropagation()}>
        {/* Cover */}
        <div className="relative h-56 bg-slate-100 rounded-t-2xl overflow-hidden">
          {item.cover_url && (
            <img src={item.cover_url} alt={item.name} className="w-full h-full object-cover"
                 onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          )}
          <button onClick={onClose}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow">
            <X size={16} />
          </button>
          <div className="absolute bottom-3 left-4 flex gap-2 items-center">
            {item.is_preferred && (
              <span className="px-2 py-1 rounded-full bg-amber-500 text-white text-xs font-semibold flex items-center gap-1 shadow"><Crown size={12} />Préféré</span>
            )}
            {item.is_exclusive && (
              <span className="px-2 py-1 rounded-full bg-violet-600 text-white text-xs font-semibold flex items-center gap-1 shadow"><Sparkles size={12} />Exclusif</span>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Title + meta */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <M.icon size={16} className={M.color} />
                <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{M.label}</span>
                {item.category && <span className="text-xs text-slate-400">· {item.category}</span>}
              </div>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{item.name}</h2>
              <div className="mt-1 text-sm text-slate-600 flex items-center gap-1.5">
                <MapPin size={13} />{item.address || item.city}
              </div>
            </div>
            <div className="text-right">
              <StarRating value={item.rating} />
              <div className="mt-2 text-xl font-bold text-slate-900">{fmtMoney(item.unit_cost, item.currency)}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">{item.cost_unit.replace(/_/g, ' ')}</div>
              {item.single_supplement ? (
                <div className="text-[11px] text-slate-500 mt-0.5">+{fmtMoney(item.single_supplement)} sup. single</div>
              ) : null}
            </div>
          </div>

          {item.short_description && (
            <p className="mt-4 text-sm text-slate-700">{item.short_description}</p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">#{t}</span>
              ))}
            </div>
          )}

          {/* Contact bar */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {item.phone && (
              <a href={`tel:${item.phone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
                <Phone size={12} />{item.phone}
              </a>
            )}
            {item.email && (
              <a href={`mailto:${item.email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 truncate">
                <Mail size={12} />{item.email}
              </a>
            )}
            {item.website && (
              <a href={item.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 truncate">
                <Globe size={12} />{item.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {item.partner_since && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar size={12} />Partenaire depuis {new Date(item.partner_since).getFullYear()}
              </div>
            )}
          </div>

          {/* Specs by kind */}
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Caractéristiques</h3>
            <SpecsBlock kind={item.kind as Kind} specs={specs} item={item} />
          </div>

          {/* Internal note */}
          {item.internal_note && (
            <div className="mt-5 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Award size={12} className="text-amber-700" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Note interne S'TOURS</span>
              </div>
              <p className="text-xs text-amber-900">{item.internal_note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SpecsBlock({ kind, specs, item }: { kind: Kind; specs: Record<string, any>; item: CatalogueItem }) {
  const Row = ({ label, value, icon: Ic }: { label: string; value: any; icon?: any }) =>
    value !== undefined && value !== null && value !== '' ? (
      <div className="flex items-start gap-2 text-sm">
        {Ic && <Ic size={13} className="text-slate-400 mt-0.5 shrink-0" />}
        <div className="flex-1">
          <span className="text-slate-500">{label}:</span>{' '}
          <span className="text-slate-800 font-medium">
            {Array.isArray(value) ? value.join(' · ') : String(value)}
          </span>
        </div>
      </div>
    ) : null

  if (kind === 'hotel') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Row label="Étoiles" value={item.stars ? `${item.stars}*` : undefined} />
        <Row label="Chambres" value={specs.room_types} />
        <Row label="Aménités" value={specs.amenities} />
        <Row label="Petit-déj inclus" value={specs.breakfast_included ? 'Oui' : undefined} />
        <Row label="Piscine" value={specs.pool ? 'Oui' : undefined} />
        <Row label="Spa" value={specs.spa ? 'Oui' : undefined} />
        <Row label="Restaurant" value={specs.has_restaurant ? 'Oui' : undefined} />
        <Row label="Saison haute" value={specs.season_high} />
      </div>
    )
  }
  if (kind === 'restaurant') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Row label="Cuisine" value={specs.cuisine} icon={UtensilsCrossed} />
        <Row label="Ambiance" value={specs.ambiance} />
        <Row label="Plats signature" value={specs.signature_dishes} />
        <Row label="Terrasse" value={specs.has_terrace ? 'Oui' : undefined} />
        <Row label="Tenue" value={specs.dress_code} />
        <Row label="Régimes" value={specs.dietary} />
        <Row label="Capacité" value={`${item.min_pax}-${item.max_pax || '∞'} PAX`} icon={Users} />
      </div>
    )
  }
  if (kind === 'activity') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Row label="Durée" value={specs.duration_hours ? `${specs.duration_hours} h` : undefined} />
        <Row label="Difficulté" value={specs.difficulty} />
        <Row label="Âge min" value={specs.age_min ? `${specs.age_min} ans` : undefined} />
        <Row label="Capacité" value={`${item.min_pax}-${item.max_pax || '∞'} PAX`} icon={Users} />
        <Row label="Inclus" value={specs.includes} />
        <Row label="Saison" value={specs.best_season} />
        <Row label="Départ" value={specs.start_time || specs.departure_time} />
      </div>
    )
  }
  // guide
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <Row label="Langues" value={specs.languages} icon={Tag} />
      <Row label="Spécialités" value={specs.specialties} />
      <Row label="Régions couvertes" value={specs.regions} />
      <Row label="Expérience" value={specs.years_experience ? `${specs.years_experience} ans` : undefined} icon={Award} />
      <Row label="Certifications" value={specs.certifications} />
      <Row label="Capacité" value={`${item.min_pax}-${item.max_pax || '∞'} PAX/groupe`} icon={Users} />
    </div>
  )
}
