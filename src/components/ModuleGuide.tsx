import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, Copy, Search, X } from 'lucide-react'
import {
  getModuleGuide,
  moduleGuides,
  sectionSearchText,
  type GuideBlock,
  type GuideTopic,
} from './guide-content'
import './ModuleGuide.css'

export type { GuideTopic } from './guide-content'

function CodeExample({ text, caption }: { text: string; caption?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <figure className="ivc-guide-example">
      <div className="ivc-guide-example-heading">
        <figcaption>{caption ?? 'Example Input'}</figcaption>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text)
              setCopied(true)
              clearTimeout(timer.current)
              timer.current = setTimeout(() => setCopied(false), 1600)
            } catch {
              // The selectable source remains available when clipboard access is denied.
            }
          }}
          aria-label="Copy example input"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre tabIndex={0}>
        <code>{text}</code>
      </pre>
    </figure>
  )
}

function ContentBlock({ block }: { block: GuideBlock }) {
  if (block.kind === 'paragraph') return <p>{block.text}</p>
  if (block.kind === 'code')
    return <CodeExample text={block.text} caption={block.caption} />
  if (block.kind === 'list')
    return (
      <ul>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  if (block.kind === 'note')
    return (
      <aside className="ivc-guide-note">
        <strong>{block.title}</strong>
        <p>{block.text}</p>
      </aside>
    )
  return (
    <div
      className="ivc-guide-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={`${block.headers[0]} reference table`}
    >
      <table>
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th scope="col" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) =>
                column === 0 ? (
                  <th scope="row" key={column}>
                    {cell}
                  </th>
                ) : (
                  <td key={column}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ModuleGuide({
  initialTopic = 'linear',
  onClose,
}: {
  initialTopic?: GuideTopic
  onClose: () => void
}) {
  const [topic, setTopic] = useState<GuideTopic>(initialTopic)
  const [query, setQuery] = useState('')
  const dialog = useRef<HTMLDivElement>(null)
  const readingPane = useRef<HTMLElement>(null)
  const closeCallback = useRef(onClose)
  closeCallback.current = onClose
  const uid = useId()
  const guide = getModuleGuide(topic)
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const sections = useMemo(
    () =>
      guide.sections.filter((item) => {
        const searchText = sectionSearchText(item)
        return terms.every((term) => searchText.includes(term))
      }),
    [guide, query],
  ) // The search is confined to the active module.

  useEffect(() => {
    setTopic(initialTopic)
    setQuery('')
  }, [initialTopic])

  useEffect(() => {
    readingPane.current?.scrollTo({ top: 0 })
  }, [topic, query])

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus({ preventScroll: true })
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeCallback.current()
        return
      }
      if (event.key !== 'Tab' || !dialog.current) return
      const focusable = [
        ...dialog.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ].filter(
        (element) =>
          element.tabIndex >= 0 && element.getClientRects().length > 0,
      )
      const first = focusable[0]
      const last = focusable.at(-1)
      const active = document.activeElement
      const outside =
        !dialog.current.contains(active) || active === dialog.current
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault()
        last?.focus({ preventScroll: true })
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault()
        first?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true })
    }
  }, [])

  const chooseTopic = (next: GuideTopic) => {
    setTopic(next)
    setQuery('')
  }
  const tabId = (id: GuideTopic) => `${uid}-tab-${id}`
  const panelId = `${uid}-panel`
  const jumpTo = (id: string) => {
    const pane = readingPane.current
    const target = document.getElementById(`${uid}-${topic}-${id}`)
    if (!pane || !target) return
    pane.scrollTo({
      top:
        pane.scrollTop +
        target.getBoundingClientRect().top -
        pane.getBoundingClientRect().top -
        20,
    })
    target.focus({ preventScroll: true })
  }

  return (
    <div
      className="ivc-guide-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="ivc-guide-dialog"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        tabIndex={-1}
      >
        <header className="ivc-guide-header">
          <h2 id={`${uid}-title`}>
            <BookOpen size={20} aria-hidden="true" />
            User Guide
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ivc-guide-close"
            aria-label="Close User Guide"
          >
            <X size={20} />
          </button>
        </header>
        <div className="ivc-guide-layout">
          <aside className="ivc-guide-sidebar">
            <div
              className="ivc-guide-tabs"
              role="tablist"
              aria-label="Module guides"
              aria-orientation="vertical"
            >
              {moduleGuides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={tabId(item.id)}
                  aria-selected={item.id === topic}
                  aria-controls={item.id === topic ? panelId : undefined}
                  tabIndex={item.id === topic ? 0 : -1}
                  onClick={() => chooseTopic(item.id)}
                  onKeyDown={(event) => {
                    let nextIndex: number
                    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
                      nextIndex = (index + 1) % moduleGuides.length
                    else if (
                      event.key === 'ArrowUp' ||
                      event.key === 'ArrowLeft'
                    )
                      nextIndex =
                        (index + moduleGuides.length - 1) % moduleGuides.length
                    else if (event.key === 'Home') nextIndex = 0
                    else if (event.key === 'End')
                      nextIndex = moduleGuides.length - 1
                    else return
                    event.preventDefault()
                    chooseTopic(moduleGuides[nextIndex].id)
                    document
                      .getElementById(tabId(moduleGuides[nextIndex].id))
                      ?.focus({ preventScroll: true })
                  }}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <nav
              className="ivc-guide-toc"
              aria-label={`${guide.title} contents`}
            >
              <h3>Contents</h3>
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpTo(item.id)}
                >
                  {item.title.replace(/^\d+\.\s*/, '')}
                </button>
              ))}
            </nav>
          </aside>
          <div
            className="ivc-guide-reading-layout"
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId(topic)}
          >
            <div className="ivc-guide-search">
              <label htmlFor={`${uid}-search`}>
                <Search size={16} aria-hidden="true" />
                <span className="ivc-guide-sr-only">Search current guide</span>
              </label>
              <input
                id={`${uid}-search`}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this guide · 용어 검색"
              />
              {query && (
                <span className="ivc-guide-search-count" aria-live="polite">
                  {sections.length} sections
                </span>
              )}
            </div>
            <main className="ivc-guide-reading" ref={readingPane} key={topic}>
              <header className="ivc-guide-chapter-heading">
                <h3>{guide.title}</h3>
                <p>{guide.summary}</p>
              </header>
              {sections.length === 0 ? (
                <p className="ivc-guide-no-results" role="status">
                  이 가이드에서 찾을 수 없습니다. 다른 용어로 검색하거나
                  검색어를 지워 전체 목차를 보세요.
                </p>
              ) : (
                sections.map((item) => (
                  <section
                    className="ivc-guide-section"
                    key={item.id}
                    aria-labelledby={`${uid}-${topic}-${item.id}`}
                  >
                    <h4 id={`${uid}-${topic}-${item.id}`} tabIndex={-1}>
                      {item.title}
                    </h4>
                    {item.blocks.map((block, index) => (
                      <ContentBlock block={block} key={index} />
                    ))}
                  </section>
                ))
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
