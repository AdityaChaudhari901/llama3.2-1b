import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

// Icons as inline SVGs to avoid extra deps
const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

const AttachIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
)

const BrowseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)

const MicIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
)

const EmojiIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 13s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
)

const SendIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
)

const StopIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
)

const UserIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
)

const BotIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <line x1="12" y1="3" x2="12" y2="7" />
        <circle cx="8.5" cy="16" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="16" r="1" fill="currentColor" stroke="none" />
        <path d="M9.5 19.5c.8.5 2.5.5 3 0" />
    </svg>
)


function TypingDots() {
    return (
        <span className="typing-dots">
            <span /><span /><span />
        </span>
    )
}

function Message({ msg }) {
    return (
        <div className={`message message--${msg.role}`}>
            <div className="message__avatar">
                {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
            </div>
            <div className="message__bubble">
                {msg.loading ? <TypingDots /> : <span className="message__text">{msg.content}</span>}
            </div>
        </div>
    )
}

export default function App() {
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)
    const textareaRef = useRef(null)
    const bottomRef = useRef(null)
    const abortRef = useRef(null)
    const fileRef = useRef(null)

    const isHome = messages.length === 0

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current
        if (!ta) return
        ta.style.height = 'auto'
        ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
    }, [input])

    // Scroll to bottom on new message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSubmit = async (text = input) => {
        const question = text.trim()
        if (!question || loading) return

        setInput('')
        setMessages(prev => [
            ...prev,
            { role: 'user', content: question, id: Date.now() },
            { role: 'assistant', content: '', loading: true, id: Date.now() + 1 },
        ])
        setLoading(true)

        try {
            const controller = new AbortController()
            abortRef.current = controller

            const res = await fetch(`${API_URL}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
                signal: controller.signal,
            })

            if (!res.ok) throw new Error(`Server error ${res.status}`)
            const data = await res.json()

            setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: 'assistant', content: data.answer, id: Date.now() + 2 }
                return next
            })
        } catch (err) {
            if (err.name === 'AbortError') return
            setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = {
                    role: 'assistant',
                    content: '⚠️ Could not reach the server. Check the backend is running.',
                    id: Date.now() + 3,
                }
                return next
            })
        } finally {
            setLoading(false)
            abortRef.current = null
        }
    }

    const handleStop = () => {
        abortRef.current?.abort()
        setLoading(false)
        setMessages(prev => {
            const next = [...prev]
            if (next[next.length - 1]?.loading) {
                next[next.length - 1] = { ...next[next.length - 1], content: '(stopped)', loading: false }
            }
            return next
        })
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files)
        if (!files.length) return
        const names = files.map(f => f.name).join(', ')
        setInput(prev => (prev ? prev + ' ' : '') + `[${names}]`)
        textareaRef.current?.focus()
        e.target.value = '' // reset so same file can be picked again
    }

    return (
        <div className="app">

            {/* Main area */}
            <main className={`main ${isHome ? 'main--home' : 'main--chat'}`}>
                {isHome ? (
                    <div className="home">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="home__logo"
                        />
                        <h1 className="home__heading">What can I do for you?</h1>
                    </div>
                ) : (
                    <div className="chat">
                        {messages.map(msg => (
                            <Message key={msg.id} msg={msg} />
                        ))}
                        <div ref={bottomRef} />
                    </div>
                )}

                {/* Input area */}
                <div className={`composer-wrap ${isHome ? 'composer-wrap--home' : 'composer-wrap--bottom'}`}>
                    <div className="composer">
                        {/* Textarea */}
                        <textarea
                            ref={textareaRef}
                            className="composer__input"
                            placeholder="Assign a task or ask anything"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                        />

                        {/* Bottom toolbar */}
                        <div className="composer__toolbar">
                            <div className="composer__toolbar-left">
                                {/* Hidden file input */}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                                <button
                                    className="icon-btn"
                                    title="Attach file"
                                    onClick={() => fileRef.current?.click()}
                                >
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
    )
}
