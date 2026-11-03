import type { SubmissionState } from './model.ts'

export function parseRegistrationCode(value: string): { courseCode: string; classId: string | null } {
  const match = /^([A-Z]{4}\d{4})(?:\.(\d+))?$/.exec(value.trim().toUpperCase())
  if (!match) throw new Error('INVALID_REGISTRATION_CODE')
  return { courseCode: match[1], classId: match[2] ?? null }
}

// Blank grade is unknown, never zero. Server must separately validate permitted range.
export function parseGrade(value: string | number | null | undefined): number | null {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 100) throw new Error('INVALID_GRADE')
  return number
}

export function isSubmitted(state: SubmissionState): boolean {
  return state === 'submitted' || state === 'graded'
}

// Conservative classification: quiz options and ambiguous checkboxes never become tasks.
export function classifyCheckbox(input: { line: string; context: 'quiz' | 'task-list' | 'unknown' }): 'answer_option' | 'task' | 'unclassified' {
  if (!/^\s*[-*] \[[ xX]\]/.test(input.line)) return 'unclassified'
  if (input.context === 'quiz') return 'answer_option'
  return input.context === 'task-list' ? 'task' : 'unclassified'
}

function normalize(path: string): string | null {
  const parts: string[] = []
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') { if (!parts.length) return null; parts.pop() }
    else parts.push(part)
  }
  return parts.join('/')
}
export type LinkResolution = { status: 'found'; path: string } | { status: 'missing' | 'ambiguous' | 'invalid' }
export function resolveNoteLink(target: string, currentPath: string, paths: string[], vaultPrefix = ''): LinkResolution {
  // Call with extracted wikilink target, not arbitrary Markdown. No content execution.
  let raw = target.replace(/\\\|/g, '|').split('|')[0].split('#')[0].trim()
  if (!raw) return { status: 'found', path: currentPath }
  if (/^[a-z]+:/i.test(raw) || raw.startsWith('/')) return { status: 'invalid' }
  if (vaultPrefix && raw.startsWith(vaultPrefix + '/')) raw = raw.slice(vaultPrefix.length + 1)
  const withExt = (s: string) => s.endsWith('.md') ? s : s + '.md'
  const folder = currentPath.split('/').slice(0, -1).join('/')
  const relative = normalize(folder + '/' + raw)
  if (raw.startsWith('.')) {
    if (relative === null) return { status: 'invalid' }
    return paths.includes(withExt(relative)) ? { status: 'found', path: withExt(relative) } : { status: 'missing' }
  }
  const root = normalize(raw)
  if (root === null) return { status: 'invalid' }
  const exact = [...new Set([relative && withExt(relative), withExt(root)].filter((p): p is string => typeof p === 'string' && paths.includes(p)))]
  if (exact.length === 1) return { status: 'found', path: exact[0] }
  if (exact.length > 1) return { status: 'ambiguous' }
  const matches = paths.filter(p => p.endsWith('/' + withExt(root)) || p === withExt(root))
  return matches.length === 1 ? { status: 'found', path: matches[0] } : { status: matches.length ? 'ambiguous' : 'missing' }
}
