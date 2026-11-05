import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const changing = useRef(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  async function toggle(button: HTMLButtonElement) {
    if (changing.current) return
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    const update = () => {
      root.classList.toggle('dark', next)
      flushSync(() => setDark(next))
    }
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update()
      return
    }
    const rect = button.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    changing.current = true
    root.classList.add('theme-reveal')
    const transition = document.startViewTransition(update)
    try {
      await transition.ready
      await root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 450, easing: 'cubic-bezier(0.2, 0, 0, 1)', pseudoElement: '::view-transition-new(root)' },
      ).finished
    } catch {
      transition.skipTransition()
    } finally {
      await transition.finished.catch(() => { })
      root.classList.remove('theme-reveal')
      changing.current = false
    }
  }

  return <Button variant="ghost" size="icon" className="relative size-11 shrink-0" aria-label={dark ? 'Gunakan mode terang' : 'Gunakan mode gelap'} aria-pressed={dark} onClick={event => { void toggle(event.currentTarget) }}>
    <Sun aria-hidden="true" className={`absolute size-5 transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${dark ? 'scale-100 opacity-100 blur-none' : 'scale-25 opacity-0 blur-[4px]'}`} />
    <Moon aria-hidden="true" className={`size-5 transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${dark ? 'scale-25 opacity-0 blur-[4px]' : 'scale-100 opacity-100 blur-none'}`} />
  </Button>
}
