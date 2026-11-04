import { useEffect, useState, type ReactNode } from 'react'
import type { Root, RootContent, Parent } from 'mdast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import mermaidCode from 'mermaid/dist/mermaid.min.js?raw'
import 'katex/dist/katex.min.css'
import type { IndexedNote, SnapshotIndex } from '@/domain/snapshot-index'
import { headingId, resolveSnapshotLink } from '@/domain/snapshot-links'
import { Button } from './ui/button'
import { SnapshotQuery } from './snapshot-queries'

function Mermaid({ source }: { source: string }) {
  // Opaque sandbox: generated SVG and diagram directives never enter the app document.
  const document = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'"><style>body{margin:0}svg{max-width:100%;height:auto}</style><div id="diagram"></div><script>${mermaidCode.replace(/<\/script/gi, '<\\/script')}<\/script><script>mermaid.initialize({startOnLoad:false,securityLevel:'strict',maxTextSize:20000});mermaid.render('graph',${JSON.stringify(source).replace(/</g, '\\u003c')}).then(r=>document.getElementById('diagram').innerHTML=r.svg).catch(()=>document.getElementById('diagram').textContent='Diagram tidak dapat ditampilkan.');<\/script>`
  return <><iframe title="Diagram Mermaid terisolasi" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={document} className="h-96 w-full border-0" /><details><summary>Sumber diagram</summary><pre>{source}</pre></details></>
}

function Callout({ children }: { children: ReactNode }) {
  return <blockquote className="border-l-2 border-border pl-4">{children}</blockquote>
}
function plain(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(plain).join('')
  if (node && typeof node === 'object' && 'props' in node && node.props && typeof node.props === 'object' && 'children' in node.props) {
    const children = node.props.children as ReactNode // React element children are already validated by React.
    return plain(children)
  }
  return ''
}

export function SnapshotReader({ index, note, onNavigate }: { index: SnapshotIndex; note: IndexedNote; onNavigate: (path: string) => void }) {
  const [versionIndex, setVersionIndex] = useState(0)
  const [notice, setNotice] = useState('')
  useEffect(() => { setVersionIndex(0); setNotice('') }, [note.canonicalPath])
  const version = note.versions[versionIndex] ?? note.versions[0]!
  const raw = new TextDecoder().decode(version.bytes)
  const body = version.rawFrontmatter ? raw.slice(version.rawFrontmatter.replace(/^\uFEFF/, '').length) : raw
  function follow(target: string) {
    const result = resolveSnapshotLink(index, note, target)
    if (result.status !== 'found') { setNotice(result.status === 'ambiguous' ? `Tautan ambigu: ${result.candidates.join(', ')}` : result.status === 'unsafe' ? 'Tautan diblokir: skema/path tidak aman.' : 'Sumber unavailable/missing: tidak tersedia dalam snapshot.'); return }
    setNotice('')
    onNavigate(result.note.canonicalPath)
    if (result.heading) requestAnimationFrame(() => {
      const element = document.getElementById('snapshot-heading-' + headingId(result.heading))
      if (element) element.scrollIntoView({ block: 'start' })
      else setNotice(`Heading tidak ditemukan: ${result.heading}`)
    })
  }
  // Transform only Markdown text nodes through the parser; code/HTML remain data.
  const wikilinks = () => (tree: Root) => {
    function walk(node: Root | RootContent) {
      if (!('children' in node) || ['link', 'code', 'inlineCode', 'html'].includes(node.type)) return
      if (node.type === 'blockquote') {
        const paragraph = node.children[0]
        const first = paragraph?.type === 'paragraph' ? paragraph.children[0] : undefined
        if (paragraph?.type === 'paragraph' && first?.type === 'text') {
          const marker = /^\[!([\w-]+)\][+-]?[ \t]*/.exec(first.value)
          if (marker) {
            first.value = first.value.slice(marker[0].length)
            paragraph.children.unshift({ type: 'strong', children: [{ type: 'text', value: marker[1]! + ': ' }] })
          }
        }
      }
      const parent = node as Parent // Markdown nodes with children are parent nodes.
      parent.children = parent.children.flatMap((child): RootContent[] => {
        if (child.type !== 'text') { walk(child); return [child] }
        const pieces: RootContent[] = []; let offset = 0
        for (const match of child.value.matchAll(/!?\[\[([^\]\n]+)\]\]/g)) {
          pieces.push({ type: 'text', value: child.value.slice(offset, match.index) })
          const [target, alias] = match[1]!.split('|')
          pieces.push({ type: 'link', url: 'snapshot:' + encodeURIComponent(target!), children: [{ type: 'text', value: alias || target! }] })
          offset = match.index! + match[0].length
        }
        pieces.push({ type: 'text', value: child.value.slice(offset) }); return pieces
      })
    }
    walk(tree)
  }
  return <article className="snapshot-reader min-w-0 break-words [&_th]:p-2 [&_td]:p-2 [&_th]:border [&_td]:border [&_p]:my-3 [&_li]:ml-5 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg" aria-label="Reader snapshot">
    <h3 className="break-all">{note.canonicalPath}</h3>
    <p>Snapshot lokal · hanya baca. Sumber tidak diubah.</p>
    {note.versions.length > 1 && <label>Versi konflik <select className="w-full min-w-0 max-w-full" value={versionIndex} onChange={e => setVersionIndex(Number(e.target.value))}>{note.versions.map((v, i) => <option key={v.hash} value={i}>{v.hash}</option>)}</select></label>}
    {version.diagnostics.map(d => <p key={d} role="note">{d}</p>)}
    {notice && <p role="alert">{notice}</p>}
    <ReactMarkdown skipHtml remarkPlugins={[remarkGfm, remarkMath, wikilinks]} rehypePlugins={[[rehypeKatex, { trust: false, strict: 'error' }]]} urlTransform={url => url} components={{
      a: ({ href, children }) => {
        const target = href ?? ''
        if (/^https?:\/\//i.test(target)) return <a href={target} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a>
        let decoded = target
        try { if (target.startsWith('snapshot:')) decoded = decodeURIComponent(target.slice(9)) } catch { decoded = 'invalid:' }
        return <Button variant="link" className="h-auto max-w-full whitespace-normal" onClick={() => follow(decoded)}>{children}</Button>
      },
      img: ({ alt, src }) => <span role="note">Lampiran unavailable: {alt || src || 'gambar'}. Tidak dimuat dari jaringan.</span>,
      h1: ({ children }) => <h1 id={'snapshot-heading-' + headingId(plain(children))}>{children}</h1>,
      h2: ({ children }) => <h2 id={'snapshot-heading-' + headingId(plain(children))}>{children}</h2>,
      h3: ({ children }) => <h3 id={'snapshot-heading-' + headingId(plain(children))}>{children}</h3>,
      h4: ({ children }) => <h4 id={'snapshot-heading-' + headingId(plain(children))}>{children}</h4>,
      h5: ({ children }) => <h5 id={'snapshot-heading-' + headingId(plain(children))}>{children}</h5>,
      h6: ({ children }) => <h6 id={'snapshot-heading-' + headingId(plain(children))}>{children}</h6>,
      pre: ({ children }) => <div className="max-w-full overflow-x-auto"><pre>{children}</pre></div>,
      table: ({ children }) => <div className="max-w-full overflow-x-auto"><table>{children}</table></div>,
      blockquote: ({ children }) => <Callout>{children}</Callout>,
      code: ({ className, children }) => className === 'language-mermaid' ? <Mermaid source={String(children)} /> : className === 'language-dataview' ? <SnapshotQuery index={index} note={note} source={String(children)} onNavigate={onNavigate} /> : <code className={className}>{children}</code>,
    }}>{body}</ReactMarkdown>
  </article>
}
