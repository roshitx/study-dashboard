import { test, expect } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SnapshotReader } from '../src/components/snapshot-reader'
import { indexSnapshot } from '../src/domain/snapshot-index'

test('renders GFM/math while removing active HTML and keeping plugin code inert', async () => {
  const text = '# Safe\n\n> [!WARNING] Sumber sintetis\n> Periksa sumber.\n\n| A | B |\n|---|---|\n|1|2|\n\n$x^2$\n\n<script>alert(1)</script>\n\n<img src="https://evil.test" onerror="alert(1)">\n\n[bad](javascript:alert(1))\n\n```dataviewjs\nwindow.pwned=1\n```'
  const index = await indexSnapshot([{ path: 'safe.md', bytes: new TextEncoder().encode(text) }], 'University', [])
  const html = renderToStaticMarkup(<SnapshotReader index={index} note={index.notes[0]!} onNavigate={() => { }} />)
  expect(html).toContain('<table>')
  expect(html).toContain('class="katex"')
  expect(html).toContain('window.pwned=1')
  expect(html).not.toContain('<script')
  expect(html).not.toContain('<img')
  expect(html).not.toContain('href="javascript:')
  expect(html).toContain('<strong>WARNING: </strong>Sumber sintetis')
  expect(html).not.toContain('[!WARNING]')
})
