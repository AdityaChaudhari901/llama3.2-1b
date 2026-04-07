import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const STORAGE_KEY = 'ollama_conversations'

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)
const SendIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
)
const StopIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
)
const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
)
const BotIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="8.5" cy="16" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="16" r="1" fill="currentColor" stroke="none" />
        <path d="M9.5 19.5c.8.5 2.5.5 3 0" />
    </svg>
)
const SearchIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)
const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
)
const CopyIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
)
const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)
const SettingsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
)
const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)
const MenuIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
)
const ChatIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function newConversation() {
    return { id: genId(), title: 'New chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() }
}

function loadConversations() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
        if (Array.isArray(raw) && raw.length > 0) return raw
    } catch { /* */ }
    const first = newConversation()
    return [first]
}

function saveConversations(convos) {
    const clean = convos.map(c => ({
        ...c,
        messages: c.messages.filter(m => !m.loading && !m.streaming),
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
}

function groupByDate(convos) {
    const now = Date.now()
    const DAY = 86_400_000
    const groups = { Today: [], Yesterday: [], 'Past 7 days': [], Older: [] }
    for (const c of convos) {
        const age = now - c.updatedAt
        if (age < DAY)           groups.Today.push(c)
        else if (age < 2 * DAY)  groups.Yesterday.push(c)
        else if (age < 7 * DAY)  groups['Past 7 days'].push(c)
        else                     groups.Older.push(c)
    }
    return groups
}

// ── Markdown code block ───────────────────────────────────────────────────────
function CodeBlock({ inline, className, children, ...props }) {
    const [copied, setCopied] = useState(false)
    const code = String(children).replace(/\n$/, '')
    const lang  = /language-(\w+)/.exec(className || '')?.[1] ?? 'text'

    if (inline) return <code className="inline-code" {...props}>{children}</code>

    return (
        <div className="code-block">
            <div className="code-block__header">
                <span className="code-block__lang">{lang}</span>
                <button className="code-block__copy" onClick={() => {
                    navigator.clipboard.writeText(code)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                }}>
                    {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                </button>
            </div>
            <SyntaxHighlighter style={oneDark} language={lang} PreTag="div"
                customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '13px' }} {...props}>
                {code}
            </SyntaxHighlighter>
        </div>
    )
}

const MD_COMPONENTS = {
    code: CodeBlock,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
    return (
        <span className="typing-dots">
            <span /><span /><span />
        </span>
    )
}

// ── Message ───────────────────────────────────────────────────────────────────
function Message({ msg }) {
    const [copied, setCopied] = useState(false)
    return (
        <div className={`message message--${msg.role}`}>
            <div className="message__avatar">
                {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
            </div>
            <div className="message__body">
                <div className="message__bubble">
                    {msg.loading ? <TypingDots /> : (
                        msg.role === 'assistant' ? (
                            <div className="message__markdown">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                                    {msg.content}
                                </ReactMarkdown>
                                {msg.streaming && <span className="stream-cursor" />}
                            </div>
                        ) : (
                            <span className="message__text">{msg.content}</span>
                        )
                    )}
                </div>
                {msg.role === 'assistant' && !msg.loading && !msg.streaming && msg.content && (
                    <div className="message__actions">
                        <button className="action-btn" onClick={() => {
                            navigator.clipboard.writeText(msg.content)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                        }}>
                            {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                        </button>
                        {msg.ttft_ms && <span className="ttft-badge">{msg.ttft_ms}ms</span>}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ convos, activeId, onSelect, onNew, onDelete, collapsed, onToggle, search, onSearch }) {
    const groups = groupByDate([...convos].sort((a, b) => b.updatedAt - a.updatedAt))
    const filtered = search.trim()
        ? convos.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
        : null

    const renderItem = (c) => (
        <div
            key={c.id}
            className={`sidebar__item ${c.id === activeId ? 'sidebar__item--active' : ''}`}
            onClick={() => onSelect(c.id)}
        >
            <ChatIcon />
            <span className="sidebar__item-title">{c.title}</span>
            <button
                className="sidebar__item-delete"
                onClick={e => { e.stopPropagation(); onDelete(c.id) }}
                title="Delete"
            >
                <TrashIcon />
            </button>
        </div>
    )

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            {/* Header */}
            <div className="sidebar__header">
                {!collapsed && <span className="sidebar__logo">Fynd AI</span>}
                <button className="sidebar__toggle" onClick={onToggle} title="Toggle sidebar">
                    <MenuIcon />
                </button>
            </div>

            {!collapsed && (
                <>
                    {/* New chat */}
                    <button className="sidebar__new-btn" onClick={onNew}>
                        <PlusIcon />
                        <span>New chat</span>
                    </button>

                    {/* Search */}
                    <div className="sidebar__search">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={search}
                            onChange={e => onSearch(e.target.value)}
                        />
                    </div>

                    {/* Conversation list */}
                    <div className="sidebar__list">
                        {filtered ? (
                            filtered.length > 0
                                ? filtered.map(renderItem)
                                : <div className="sidebar__empty">No results</div>
                        ) : (
                            Object.entries(groups).map(([label, items]) =>
                                items.length === 0 ? null : (
                                    <div key={label} className="sidebar__group">
                                        <div className="sidebar__group-label">{label}</div>
                                        {items.map(renderItem)}
                                    </div>
                                )
                            )
                        )}
                    </div>

                </>
            )}

            {collapsed && (
                <div className="sidebar__collapsed-actions">
                    <button className="sidebar__icon-btn" onClick={onNew} title="New chat"><PlusIcon /></button>
                </div>
            )}
        </aside>
    )
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ personality, setPersonality, customPrompt, setCustomPrompt, onClose }) {
    const personalities = {
        helpful:      'You are a helpful assistant. Answer clearly and accurately.',
        creative:     'You are a creative assistant. Give imaginative and original answers.',
        technical:    'You are a technical assistant. Give precise, detailed explanations with correct terminology.',
        casual:       'You are a casual, friendly assistant. Use simple, natural language.',
        professional: 'You are a professional assistant. Give structured, concise, business-focused answers.',
    }
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal__header">
                    <h2>Settings</h2>
                    <button className="modal__close" onClick={onClose}><CloseIcon /></button>
                </div>
                <div className="modal__content">
                    <p className="modal__description">Choose how the AI assistant responds:</p>
                    <div className="personality-grid">
                        {Object.entries(personalities).map(([key, desc]) => (
                            <button
                                key={key}
                                className={`personality-card ${personality === key ? 'personality-card--active' : ''}`}
                                onClick={() => { setPersonality(key); onClose() }}
                            >
                                <div className="personality-card__name">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                                <div className="personality-card__desc">{desc.split('.')[0]}.</div>
                            </button>
                        ))}
                    </div>
                    <div className="custom-section">
                        <div className="custom-section__header">
                            <h3>Custom Instructions</h3>
                            <button
                                className={`custom-toggle ${personality === 'custom' ? 'custom-toggle--active' : ''}`}
                                onClick={() => setPersonality('custom')}
                            >
                                {personality === 'custom' ? '✓ Active' : 'Use Custom'}
                            </button>
                        </div>
                        <textarea
                            className="custom-textarea"
                            value={customPrompt}
                            onChange={e => setCustomPrompt(e.target.value)}
                            placeholder="Enter your custom instructions..."
                            rows={4}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
    const [convos, setConvos]               = useState(loadConversations)
    const [activeId, setActiveId]           = useState(() => loadConversations()[0]?.id)
    const [input, setInput]                 = useState('')
    const [loading, setLoading]             = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [showSettings, setShowSettings]   = useState(false)
    const [personality, setPersonality]     = useState('helpful')
    const [customPrompt, setCustomPrompt]   = useState('You are a helpful AI assistant.')
    const [search, setSearch]               = useState('')

    const textareaRef    = useRef(null)
    const bottomRef      = useRef(null)
    const chatRef        = useRef(null)
    const abortRef       = useRef(null)
    const fileRef        = useRef(null)
    const userScrolledUp = useRef(false)

    const personalities = {
        helpful:      'You are a helpful assistant. Answer clearly and accurately.',
        creative:     'You are a creative assistant. Give imaginative and original answers.',
        technical:    'You are a technical assistant. Give precise, detailed explanations.',
        casual:       'You are a casual, friendly assistant. Use simple, natural language.',
        professional: 'You are a professional assistant. Give structured, concise answers.',
        custom:       customPrompt,
    }

    const activeConvo = convos.find(c => c.id === activeId) ?? convos[0]
    const messages    = activeConvo?.messages ?? []
    const isHome      = messages.length === 0

    // Persist on every convos change
    useEffect(() => { saveConversations(convos) }, [convos])

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current
        if (!ta) return
        ta.style.height = 'auto'
        ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
    }, [input])

    // Auto-scroll
    useEffect(() => {
        if (!userScrolledUp.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleChatScroll = useCallback(() => {
        const el = chatRef.current
        if (!el) return
        userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
    }, [])

    const updateConvo = useCallback((id, updater) => {
        setConvos(prev => prev.map(c => c.id === id ? { ...updater(c), updatedAt: Date.now() } : c))
    }, [])

    const handleNew = () => {
        const c = newConversation()
        setConvos(prev => [c, ...prev])
        setActiveId(c.id)
        setInput('')
        userScrolledUp.current = false
    }

    const handleDelete = (id) => {
        setConvos(prev => {
            const next = prev.filter(c => c.id !== id)
            if (next.length === 0) {
                const fresh = newConversation()
                setActiveId(fresh.id)
                return [fresh]
            }
            if (id === activeId) setActiveId(next[0].id)
            return next
        })
    }

    const handleSelect = (id) => {
        setActiveId(id)
        userScrolledUp.current = false
    }

    const handleSubmit = async (text = input) => {
        const question = text.trim()
        if (!question || loading) return

        userScrolledUp.current = false
        setInput('')

        const history = messages
            .filter(m => !m.loading && !m.streaming && m.content)
            .map(({ role, content }) => ({ role, content }))

        const userMsg = { role: 'user',      content: question, id: genId() }
        const botMsg  = { role: 'assistant', content: '',        id: genId(), loading: true }

        // Set title from first user message
        const isFirstMsg = messages.filter(m => m.role === 'user').length === 0
        const title = isFirstMsg ? question.slice(0, 60) + (question.length > 60 ? '…' : '') : activeConvo.title

        updateConvo(activeId, c => ({
            ...c,
            title,
            messages: [...c.messages, userMsg, botMsg],
        }))

        setLoading(true)
        const messagesPayload = [...history, { role: 'user', content: question }]

        try {
            const controller = new AbortController()
            abortRef.current = controller

            const res = await fetch(`${API_URL}/ask/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesPayload,
                    personality: personality === 'custom' ? customPrompt : personalities[personality],
                }),
                signal: controller.signal,
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || err.detail || `Server error ${res.status}`)
            }

            const reader  = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer    = ''
            let firstToken = true

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    let event
                    try { event = JSON.parse(line.slice(6)) } catch { continue }

                    if (event.type === 'token' && event.content) {
                        if (firstToken) {
                            firstToken = false
                            updateConvo(activeId, c => {
                                const msgs = [...c.messages]
                                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], loading: false, streaming: true, content: event.content }
                                return { ...c, messages: msgs }
                            })
                        } else {
                            updateConvo(activeId, c => {
                                const msgs = [...c.messages]
                                const last = msgs[msgs.length - 1]
                                msgs[msgs.length - 1] = { ...last, content: last.content + event.content }
                                return { ...c, messages: msgs }
                            })
                        }
                    } else if (event.type === 'done') {
                        updateConvo(activeId, c => {
                            const msgs = [...c.messages]
                            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], streaming: false, ttft_ms: event.ttft_ms ?? null }
                            return { ...c, messages: msgs }
                        })
                    } else if (event.type === 'error' || event.type === 'blocked') {
                        updateConvo(activeId, c => {
                            const msgs = [...c.messages]
                            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: event.message || event.refusal, loading: false, streaming: false }
                            return { ...c, messages: msgs }
                        })
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') return
            updateConvo(activeId, c => {
                const msgs = [...c.messages]
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: err.message || 'Could not reach the server.', loading: false, streaming: false }
                return { ...c, messages: msgs }
            })
        } finally {
            setLoading(false)
            abortRef.current = null
        }
    }

    const handleStop = () => {
        abortRef.current?.abort()
        setLoading(false)
        updateConvo(activeId, c => {
            const msgs = [...c.messages]
            const last = msgs[msgs.length - 1]
            if (last?.loading || last?.streaming) {
                msgs[msgs.length - 1] = { ...last, content: last.content || '(stopped)', loading: false, streaming: false }
            }
            return { ...c, messages: msgs }
        })
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
    }

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files)
        if (!files.length) return
        setInput(prev => (prev ? prev + ' ' : '') + `[${files.map(f => f.name).join(', ')}]`)
        textareaRef.current?.focus()
        e.target.value = ''
    }

    return (
        <div className="app">
            <Sidebar
                convos={convos}
                activeId={activeId}
                onSelect={handleSelect}
                onNew={handleNew}
                onDelete={handleDelete}

                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(v => !v)}
                search={search}
                onSearch={setSearch}
            />

            <div className="workspace">
                {/* Top bar */}
                <header className="topbar">
                    <span className="topbar__title">{!isHome && activeConvo?.title}</span>
                    <button className="topbar__settings-btn" onClick={() => setShowSettings(true)} title="Settings">
                        <SettingsIcon />
                    </button>
                </header>

                {/* Main */}
                <main className={`main ${isHome ? 'main--home' : 'main--chat'}`}>
                    {isHome ? (
                        <div className="home">
                            <img src="/logo.png" alt="Fynd AI" className="home__logo" />
                            <h1 className="home__heading">What can I help you with?</h1>
                        </div>
                    ) : (
                        <div className="chat" ref={chatRef} onScroll={handleChatScroll}>
                            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
                            <div ref={bottomRef} />
                        </div>
                    )}

                    {/* Composer */}
                    <div className={`composer-wrap ${isHome ? 'composer-wrap--home' : 'composer-wrap--bottom'}`}>
                        <div className="composer">
                            <textarea
                                ref={textareaRef}
                                className="composer__input"
                                placeholder="Ask anything..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                            />
                            <div className="composer__toolbar">
                                <div className="composer__toolbar-left">
                                    <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                                    <button className="icon-btn" title="Attach" onClick={() => fileRef.current?.click()}>
                                        <PlusIcon />
                                    </button>
                                </div>
                                <div className="composer__toolbar-right">
                                    {loading ? (
                                        <button className="send-btn send-btn--stop" onClick={handleStop} title="Stop">
                                            <StopIcon />
                                        </button>
                                    ) : (
                                        <button
                                            className={`send-btn ${input.trim() ? 'send-btn--active' : ''}`}
                                            onClick={() => handleSubmit()}
                                            disabled={!input.trim()}
                                            title="Send"
                                        >
                                            <SendIcon />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {showSettings && (
                <SettingsModal
                    personality={personality}
                    setPersonality={setPersonality}
                    customPrompt={customPrompt}
                    setCustomPrompt={setCustomPrompt}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    )
}
