import { useState, useEffect, useCallback } from 'react'

export type NotifDomain = 'finance' | 'ops' | 'crm' | 'cotation' | 'system' | 'security'
export type NotifType   = 'info' | 'warning' | 'success' | 'error'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: NotifType
  domain: NotifDomain
  timestamp: string
  isRead: boolean
  action?: { label: string; href: string }
}

const SEED: AppNotification[] = [
  {
    id: '1',
    title: 'Facture en retard',
    message: 'La facture F-2025-0142 (Acme Tours, 48 500 MAD) est en retard de 12 jours.',
    type: 'warning', domain: 'finance',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    isRead: false,
    action: { label: 'Voir la facture', href: '/invoices' },
  },
  {
    id: '2',
    title: 'Devis validé par le client',
    message: 'Globetrotter Ltd a accepté le devis DEV-2025-0089 — Maroc Impérial 8J. Convertir en bon de commande ?',
    type: 'success', domain: 'cotation',
    timestamp: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    isRead: false,
    action: { label: 'Créer la commande', href: '/quotations' },
  },
  {
    id: '3',
    title: 'Groupe Japon arrivé',
    message: 'Le groupe JP-2025-042 (22 pax) est arrivé à RAK — transfert vers Riad confirmé.',
    type: 'success', domain: 'ops',
    timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    isRead: false,
    action: { label: 'Ouvrir le cockpit', href: '/operations/cockpit' },
  },
  {
    id: '4',
    title: 'Lead chaud — relance urgente',
    message: 'Prospect "Wanderlust Reisen" (€45k estimé) n\'a pas été contacté depuis 5 jours.',
    type: 'warning', domain: 'crm',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    isRead: true,
    action: { label: 'Ouvrir le CRM', href: '/crm/leads' },
  },
  {
    id: '5',
    title: 'Retard vol détecté',
    message: 'Vol AT771 (groupe US-2025-019) retardé de 45 min — ajustement du programme de transfert requis.',
    type: 'error', domain: 'ops',
    timestamp: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    isRead: true,
    action: { label: 'Ajuster', href: '/operations/cockpit' },
  },
  {
    id: '6',
    title: 'Budget dépassé — Sahara Circuit',
    message: 'Le projet "Sahara Express 5J" dépasse le budget estimé de 8,3 %. Marge nette : 11,2 %.',
    type: 'warning', domain: 'finance',
    timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    isRead: true,
    action: { label: 'Voir le budget', href: '/budget-tracker' },
  },
  {
    id: '7',
    title: 'Rapport mensuel généré',
    message: 'Le rapport d\'activité d\'avril 2025 est disponible — 34 projets, CA 1,2M MAD.',
    type: 'info', domain: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    isRead: true,
    action: { label: 'Télécharger', href: '/analytics' },
  },
]

export function useAppNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(SEED)

  // Simulate a new real-time notification arriving after 20 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      const newNotif: AppNotification = {
        id: Date.now().toString(),
        title: 'Nouveau lead entrant',
        message: 'Un formulaire de demande vient d\'arriver via le portail B2B — "Tour Connect GmbH", budget estimé €28k.',
        type: 'info', domain: 'crm',
        timestamp: new Date().toISOString(),
        isRead: false,
        action: { label: 'Qualifier', href: '/crm/leads' },
      }
      setNotifications(prev => [newNotif, ...prev])
    }, 20_000)
    return () => clearTimeout(timer)
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length,
    markAsRead,
    markAllRead,
    clearAll,
    dismiss,
  }
}
