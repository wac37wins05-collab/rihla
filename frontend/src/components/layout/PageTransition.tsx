/**
 * PageTransition — wraps every routed page with a CSS-based enter animation.
 *
 * Usage (in AppShell or lazy Suspense boundaries):
 *   <PageTransition key={location.pathname}>
 *     <Outlet />
 *   </PageTransition>
 *
 * The key prop on the parent component re-mounts this component on every
 * route change, re-triggering the animation without any JS animation library.
 */

import { useEffect, useRef } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
  /** Override animation duration in ms (default: 220) */
  duration?: number
  /** Extra className applied to the wrapper div */
  className?: string
}

export function PageTransition({ children, duration = 220, className }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Force re-trigger if the component re-renders without unmounting
    el.classList.remove('page-transition')
    void el.offsetWidth // reflow
    el.classList.add('page-transition')
  }, [])

  return (
    <div
      ref={ref}
      className={`page-transition${className ? ` ${className}` : ''}`}
      style={{ '--pt-duration': `${duration}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
