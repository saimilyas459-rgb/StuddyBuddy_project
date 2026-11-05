
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const STORAGE_KEY = 'studybuddy-data-v2'

const initialDecks = [
  {
    id: 'ds',
    icon: '💻',
    title: 'Data Structures',
    subject: 'Computer Science',
    cards: [
      {
        id: 'ds1',
        question: 'What is a Stack in Data Structures?',
        answer: 'A Stack is a linear data structure that follows LIFO (Last In, First Out).',
      },
      {
        id: 'ds2',
        question: 'What is a Queue?',
        answer: 'A Queue is a linear data structure that follows FIFO (First In, First Out).',
      },
      {
        id: 'ds3',
        question: 'What is the time complexity of binary search?',
        answer: 'Binary search has O(log n) time complexity on sorted data.',
      },
      {
        id: 'ds4',
        question: 'What is an Array?',
        answer: 'An Array stores elements in indexed positions, usually in contiguous memory.',
      },
    ],
  },
  {
    id: 'js',
    icon: '⚡',
    title: 'JavaScript Basics',
    subject: 'Programming',
    cards: [
      {
        id: 'js1',
        question: 'What is a variable in JavaScript?',
        answer: 'A variable stores a value. JavaScript provides let, const, and var.',
      },
      {
        id: 'js2',
        question: 'What does === mean?',
        answer: 'It checks strict equality without converting operand types.',
      },
      {
        id: 'js3',
        question: 'What is an arrow function?',
        answer: 'An arrow function is a concise way to write a function using =>.',
      },
    ],
  },
  {
    id: 'os',
    icon: '🖥️',
    title: 'Operating Systems',
    subject: 'Computer Science',
    cards: [
      {
        id: 'os1',
        question: 'What is an Operating System?',
        answer: 'An Operating System manages hardware, software resources, and processes.',
      },
      {
        id: 'os2',
        question: 'What is a process?',
        answer: 'A process is a program currently being executed.',
      },
      {
        id: 'os3',
        question: 'What is multitasking?',
        answer: 'Multitasking allows an operating system to manage multiple tasks over time.',
      },
    ],
  },
]

// Load saved browser data
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      const parsed = JSON.parse(saved)

      if (
        Array.isArray(parsed.decks) &&
        Array.isArray(parsed.reviews)
      ) {
        return {
          decks: parsed.decks,
          reviews: parsed.reviews,
          studyDays: Array.isArray(parsed.studyDays)
            ? parsed.studyDays
            : [],
        }
      }
    }

    // Import older saved data
    const oldSaved = localStorage.getItem('studybuddy-data')

    if (oldSaved) {
      const oldData = JSON.parse(oldSaved)

      if (Array.isArray(oldData.decks)) {
        return {
          decks: oldData.decks,
          reviews: Array.isArray(oldData.reviews)
            ? oldData.reviews
            : [],
          studyDays: Array.isArray(oldData.studyDays)
            ? oldData.studyDays
            : [],
        }
      }
    }
  } catch (error) {
    console.error('Could not load saved data:', error)
  }

  return {
    decks: initialDecks,
    reviews: [],
    studyDays: [],
  }
}

function getToday() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function calculateStreak(days) {
  const uniqueDays = [...new Set(days)].sort().reverse()

  if (uniqueDays.length === 0) return 0

  const today = getToday()

  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)

  const yesterday = [
    yesterdayDate.getFullYear(),
    String(yesterdayDate.getMonth() + 1).padStart(2, '0'),
    String(yesterdayDate.getDate()).padStart(2, '0'),
  ].join('-')

  if (
    uniqueDays[0] !== today &&
    uniqueDays[0] !== yesterday
  ) {
    return 0
  }

  let streak = 1
  let previous = new Date(`${uniqueDays[0]}T12:00:00`)

  for (let i = 1; i < uniqueDays.length; i++) {
    const current = new Date(`${uniqueDays[i]}T12:00:00`)

    const difference = Math.round(
      (previous.getTime() - current.getTime()) / 86400000
    )

    if (difference !== 1) break

    streak++
    previous = current
  }

  return streak
}

function App() {
  // Main application state
  const [data, setData] = useState(loadData)

  const [activeSection, setActiveSection] = useState('dashboard')
  const [search, setSearch] = useState('')

  const [selectedDeckId, setSelectedDeckId] = useState(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [answerShown, setAnswerShown] = useState(false)

  const [showCreateDeck, setShowCreateDeck] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)

  const [newTitle, setNewTitle] = useState('')
  const [newSubject, setNewSubject] = useState('Computer Science')
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [cardDeckId, setCardDeckId] = useState('')

  const [notice, setNotice] = useState('')

  // Supabase shared deck states
  const [sharedDecks, setSharedDecks] = useState([])
  const [sharingDeckId, setSharingDeckId] = useState(null)
  const [loadingShared, setLoadingShared] = useState(false)
  const [importingDeckId, setImportingDeckId] = useState(null)

  // Save data automatically
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Could not save StudyBuddy data:', error)
      setNotice('Could not save data. Check browser storage.')
    }
  }, [data])

  // Load shared decks when application starts
  useEffect(() => {
    loadSharedDecks()
  }, [])

  // Load shared decks from Supabase
  async function loadSharedDecks() {
    setLoadingShared(true)

    const { data: sharedData, error } = await supabase
      .from('shared_decks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Shared decks error:', error)
      setNotice(`Could not load shared decks: ${error.message}`)
    } else {
      setSharedDecks(sharedData || [])
    }

    setLoadingShared(false)
  }

  // Share a deck with other users
  async function shareDeck(deck) {
    if (!deck) return

    setSharingDeckId(deck.id)
    setNotice('')

    const { error } = await supabase
      .from('shared_decks')
      .insert({
        title: deck.title,
        subject: deck.subject,
        icon: deck.icon || '📘',
        cards: deck.cards,
      })

    setSharingDeckId(null)

    if (error) {
      console.error('Sharing error:', error)
      setNotice(`Sharing failed: ${error.message}`)
      return
    }

    setNotice(`"${deck.title}" shared successfully! 🎉`)

    await loadSharedDecks()
  }

  // Import shared deck into personal decks
  function importSharedDeck(sharedDeck) {
    if (!sharedDeck) return

    setImportingDeckId(sharedDeck.id)

    const alreadyImported = data.decks.some(
      (deck) =>
        deck.title === sharedDeck.title &&
        deck.subject === sharedDeck.subject
    )

    if (alreadyImported) {
      setNotice('This deck is already in your personal decks.')
      setImportingDeckId(null)
      return
    }

    const importedDeck = {
      id: `import-${Date.now()}`,
      title: sharedDeck.title,
      subject: sharedDeck.subject,
      icon: sharedDeck.icon || '📘',
      cards: (Array.isArray(sharedDeck.cards)
        ? sharedDeck.cards
        : []
      ).map((card, index) => ({
        id: `import-card-${Date.now()}-${index}`,
        question: card.question,
        answer: card.answer,
      })),
    }

    setData((previous) => ({
      ...previous,
      decks: [...previous.decks, importedDeck],
    }))

    setImportingDeckId(null)
    setNotice(`"${sharedDeck.title}" imported successfully! 📚`)
  }

  // Dashboard calculations
  const totalCards = data.decks.reduce(
    (total, deck) => total + deck.cards.length,
    0
  )

  const reviewedCount = data.reviews.length

  const correctCount = data.reviews.filter(
    (review) => review.correct
  ).length

  const accuracy = reviewedCount
    ? Math.round((correctCount / reviewedCount) * 100)
    : 0

  const streak = calculateStreak(data.studyDays)

  // Deck statistics
  function getDeckStats(deck) {
    const deckReviews = data.reviews.filter(
      (review) => review.deckId === deck.id
    )

    const reviewedCardIds = new Set(
      deckReviews.map((review) => review.cardId)
    )

    const progress = deck.cards.length
      ? Math.round(
          (deck.cards.filter((card) =>
            reviewedCardIds.has(card.id)
          ).length /
            deck.cards.length) *
            100
        )
      : 0

    return {
      progress,
      reviewed: reviewedCardIds.size,
      total: deck.cards.length,
    }
  }

  // Search decks and flashcards
  const filteredDecks = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return data.decks

    return data.decks.filter((deck) => {
      const deckMatches =
        deck.title.toLowerCase().includes(query) ||
        deck.subject.toLowerCase().includes(query)

      const cardMatches = deck.cards.some(
        (card) =>
          card.question.toLowerCase().includes(query) ||
          card.answer.toLowerCase().includes(query)
      )

      return deckMatches || cardMatches
    })
  }, [data.decks, search])

  const selectedDeck = data.decks.find(
    (deck) => deck.id === selectedDeckId
  )

  const currentCard = selectedDeck?.cards[cardIndex]

  function updateData(updater) {
    setData((previous) => updater(previous))
  }

  // Record study day
  function markStudyDay() {
    const today = getToday()

    updateData((previous) => ({
      ...previous,
      studyDays: previous.studyDays.includes(today)
        ? previous.studyDays
        : [...previous.studyDays, today],
    }))
  }

  // Start study session
  function startStudy(deckId) {
    const deck = data.decks.find(
      (item) => item.id === deckId
    )

    if (!deck || deck.cards.length === 0) {
      setNotice('Add at least one flashcard before studying.')
      return
    }

    setSelectedDeckId(deckId)
    setCardIndex(0)
    setAnswerShown(false)
    setNotice('')

    markStudyDay()
  }

  // Close study session
  function closeStudy() {
    setSelectedDeckId(null)
    setAnswerShown(false)
    setCardIndex(0)
  }

  // Record correct or incorrect answer
  function recordAnswer(correct) {
    if (!selectedDeck || !currentCard) return

    const today = getToday()

    const review = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      deckId: selectedDeck.id,
      cardId: currentCard.id,
      correct,
      date: today,
      timestamp: new Date().toISOString(),
    }

    updateData((previous) => ({
      ...previous,
      reviews: [...previous.reviews, review],
      studyDays: previous.studyDays.includes(today)
        ? previous.studyDays
        : [...previous.studyDays, today],
    }))

    if (cardIndex < selectedDeck.cards.length - 1) {
      setCardIndex((index) => index + 1)
      setAnswerShown(false)
    } else {
      closeStudy()
      setNotice('Deck completed! Great work. 🎉')
    }
  }

  // Create a new deck
  function createDeck(event) {
    event.preventDefault()

    const title = newTitle.trim()

    if (!title) return

    const deck = {
      id: `deck-${Date.now()}`,
      icon: '📘',
      title,
      subject: newSubject,
      cards: [],
    }

    updateData((previous) => ({
      ...previous,
      decks: [...previous.decks, deck],
    }))

    setNewTitle('')
    setNewSubject('Computer Science')
    setShowCreateDeck(false)

    setNotice('New deck created successfully!')
  }

  // Add flashcard
  function addFlashcard(event) {
    event.preventDefault()

    const question = newQuestion.trim()
    const answer = newAnswer.trim()
    const targetDeckId = cardDeckId || data.decks[0]?.id

    if (!question || !answer || !targetDeckId) {
      setNotice('Enter a question, answer, and select a deck.')
      return
    }

    const card = {
      id: `card-${Date.now()}`,
      question,
      answer,
    }

    updateData((previous) => ({
      ...previous,
      decks: previous.decks.map((deck) =>
        deck.id === targetDeckId
          ? { ...deck, cards: [...deck.cards, card] }
          : deck
      ),
    }))

    setNewQuestion('')
    setNewAnswer('')
    setShowAddCard(false)

    setNotice('Flashcard added and saved! 📚')
  }

  // Reset review progress
  function resetProgress() {
    const confirmed = window.confirm(
      'Reset all review history and progress? Your decks and flashcards will remain.'
    )

    if (!confirmed) return

    updateData((previous) => ({
      ...previous,
      reviews: [],
      studyDays: [],
    }))

    setNotice('Review history reset. Your decks are still saved.')
  }

  // Navigation
  function navigate(section) {
    setActiveSection(section)
    setSearch('')

    document.getElementById(section)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">🎓</span>
          <div>
            <h2>StudyBuddy</h2>
            <p>Learn · Revise · Remember</p>
          </div>
        </div>

        <nav className="nav-menu">
          {[
            ['dashboard', '🏠', 'Dashboard'],
            ['decks', '📚', 'My Decks'],
            ['review-section', '▶️', 'Review Cards'],
            ['progress', '📊', 'Progress'],
            ['shared', '👥', 'Shared Decks'],
            ['achievements', '🏆', 'Achievements'],
            ['settings', '⚙️', 'Settings'],
          ].map(([id, icon, label]) => (
            <a
              key={id}
              className={`nav-link ${
                activeSection === id ? 'active' : ''
              }`}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault()
                navigate(id)
              }}
            >
              {icon} <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="trophy">🏆</div>
          <h3>Keep Learning!</h3>
          <p>Small steps, big results.</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content" id="dashboard">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="search-box">
            <span>🔍</span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search decks, cards, or topics..."
            />
          </div>

          <div className="topbar-actions">
            <button
              className="notification-btn"
              aria-label="Notifications"
              onClick={() =>
                setNotice('Welcome to StudyBuddy! 🎓')
              }
            >
              🔔
            </button>

            <div className="profile">
              <div className="profile-avatar">S</div>
              <span>Student</span>
            </div>
          </div>
        </header>

        {/* NOTIFICATION */}
        {notice && (
          <div
            role="status"
            style={{
              margin: '12px 0',
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#eee8ff',
              color: '#5130d0',
            }}
          >
            {notice}

            <button
              onClick={() => setNotice('')}
              style={{
                float: 'right',
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
              }}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        {/* WELCOME BANNER */}
        <section className="welcome-banner">
          <div className="welcome-text">
            <span className="welcome-tag">
              ✨ YOUR LEARNING SPACE
            </span>

            <h1>Welcome back, Student! 👋</h1>

            <p>
              Every card you review brings you one step closer
              to mastering your goals. Let&apos;s keep learning!
            </p>

            <button
              className="start-btn"
              onClick={() => {
                const deck = data.decks.find(
                  (item) => item.cards.length > 0
                )

                if (deck) {
                  startStudy(deck.id)
                } else {
                  setNotice(
                    'Create a deck and add a flashcard first.'
                  )
                }
              }}
            >
              Start Studying <span>→</span>
            </button>
          </div>

          <div className="welcome-art">
            <div className="art-circle">
              <span className="book-icon">📚</span>
            </div>

            <span className="floating-icon star">⭐</span>
            <span className="floating-icon bulb">💡</span>
            <span className="floating-icon pencil">✏️</span>
          </div>
        </section>

        {/* DASHBOARD OVERVIEW */}
        <section className="stats-section">
          <div className="section-heading">
            <div>
              <h2>Your Overview</h2>
              <p>Track your real learning progress.</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <h2>{data.decks.length}</h2>
              <p>Total Study Decks</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🧠</div>
              <h2>{reviewedCount}</h2>
              <p>Cards Reviewed</p>
              <span>Total review attempts</span>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <h2>{streak} Days</h2>
              <p>Study Streak</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <h2>{accuracy}%</h2>
              <p>Accuracy Rate</p>
              <span>
                {correctCount} correct out of {reviewedCount}
              </span>
            </div>
          </div>
        </section>

        {/* MY DECKS */}
        <section className="study-content" id="decks">
          <div className="section-heading">
            <div>
              <h2>My Study Decks</h2>
              <p>Choose a subject to start learning.</p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <button
                className="create-deck-btn"
                onClick={() =>
                  setShowCreateDeck(!showCreateDeck)
                }
              >
                + Create Deck
              </button>

              <button
                className="create-deck-btn"
                onClick={() => {
                  setCardDeckId(data.decks[0]?.id || '')
                  setShowAddCard(!showAddCard)
                }}
                disabled={data.decks.length === 0}
              >
                + Add Flashcard
              </button>
            </div>
          </div>

          {/* CREATE DECK FORM */}
          {showCreateDeck && (
            <form
              className="quick-review-card create-deck-form"
              onSubmit={createDeck}
              style={{
                display: 'grid',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              <h3>Create a new study deck</h3>

              <input
                value={newTitle}
                onChange={(event) =>
                  setNewTitle(event.target.value)
                }
                placeholder="Deck title"
                required
                maxLength={80}
              />

              <select
                value={newSubject}
                onChange={(event) =>
                  setNewSubject(event.target.value)
                }
              >
                <option>Computer Science</option>
                <option>Programming</option>
                <option>Mathematics</option>
                <option>English</option>
                <option>Other</option>
              </select>

              <button className="study-btn" type="submit">
                Save Deck
              </button>
            </form>
          )}

          {/* ADD FLASHCARD FORM */}
          {showAddCard && (
            <form
              className="quick-review-card create-deck-form"
              onSubmit={addFlashcard}
              style={{
                display: 'grid',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              <h3>Add a flashcard</h3>

              <select
                value={cardDeckId}
                onChange={(event) =>
                  setCardDeckId(event.target.value)
                }
                required
              >
                {data.decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.title}
                  </option>
                ))}
              </select>

              <textarea
                value={newQuestion}
                onChange={(event) =>
                  setNewQuestion(event.target.value)
                }
                placeholder="Enter your question"
                rows={3}
                required
              />

              <textarea
                value={newAnswer}
                onChange={(event) =>
                  setNewAnswer(event.target.value)
                }
                placeholder="Enter the answer"
                rows={3}
                required
              />

              <button className="study-btn" type="submit">
                Save Flashcard
              </button>
            </form>
          )}

          {/* DECK CARDS */}
          <div className="decks-grid">
            {filteredDecks.map((deck) => {
              const stats = getDeckStats(deck)

              return (
                <div className="deck-card" key={deck.id}>
                  <div className="deck-icon">{deck.icon}</div>

                  <p>{deck.subject}</p>
                  <h3>{deck.title}</h3>

                  <p>{deck.cards.length} flashcards</p>

                  <div className="deck-progress">
                    <div className="progress-info">
                      <span>Progress</span>
                      <strong>{stats.progress}%</strong>
                    </div>

                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label={`${deck.title} progress`}
                      aria-valuenow={stats.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="progress-fill"
                        style={{
                          width: `${stats.progress}%`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    className="study-btn"
                    onClick={() => startStudy(deck.id)}
                    disabled={deck.cards.length === 0}
                  >
                    {deck.cards.length
                      ? 'Study Now →'
                      : 'Add Cards First'}
                  </button>

                  {/* SHARE DECK BUTTON */}
                  <button
                    className="reveal-btn"
                    style={{ marginTop: '10px', width: '100%' }}
                    onClick={() => shareDeck(deck)}
                    disabled={
                      sharingDeckId === deck.id ||
                      deck.cards.length === 0
                    }
                  >
                    {sharingDeckId === deck.id
                      ? 'Sharing...'
                      : '👥 Share Deck'}
                  </button>
                </div>
              )
            })}
          </div>

          {filteredDecks.length === 0 && (
            <p>No matching decks found. Try another search.</p>
          )}
        </section>

        {/* QUICK REVIEW */}
        <section className="review-section" id="review-section">
          <h2>Quick Review 🧠</h2>
          <p>Test your knowledge with a flashcard.</p>

          <div className="quick-review-card">
            {(() => {
              const deck = data.decks.find(
                (item) => item.cards.length > 0
              )

              const card = deck?.cards[0]

              return card ? (
                <>
                  <span className="question-label">
                    {deck.title}
                  </span>

                  <h3>{card.question}</h3>

                  <button
                    className="reveal-btn"
                    onClick={() => startStudy(deck.id)}
                  >
                    Start Flashcard Review →
                  </button>
                </>
              ) : (
                <>
                  <h3>No flashcards yet</h3>
                  <p>
                    Create a deck and add your first question.
                  </p>
                </>
              )
            })()}
          </div>
        </section>

        {/* PROGRESS */}
        <section className="stats-section" id="progress">
          <div className="section-heading">
            <div>
              <h2>Learning Progress 📊</h2>
              <p>
                Your results are calculated from recorded reviews.
              </p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <h2>{totalCards}</h2>
              <p>Total Flashcards</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <h2>{correctCount}</h2>
              <p>Correct Answers</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔁</div>
              <h2>{reviewedCount - correctCount}</h2>
              <p>Incorrect Answers</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <h2>{data.studyDays.length}</h2>
              <p>Days Studied</p>
            </div>
          </div>

          <div className="quick-review-card">
            <h3>Progress by Deck</h3>

            {data.decks.map((deck) => {
              const stats = getDeckStats(deck)

              return (
                <div className="deck-progress" key={deck.id}>
                  <div className="progress-info">
                    <span>{deck.title}</span>
                    <strong>{stats.progress}%</strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${stats.progress}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* SHARED DECKS */}
        <section className="study-content" id="shared">
          <div className="section-heading">
            <div>
              <h2>Shared Decks 👥</h2>
              <p>
                Discover and import flashcards shared by other users.
              </p>
            </div>

            <button
              className="create-deck-btn"
              onClick={loadSharedDecks}
              disabled={loadingShared}
            >
              {loadingShared ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {loadingShared ? (
            <div className="quick-review-card">
              <p>Loading shared decks...</p>
            </div>
          ) : sharedDecks.length === 0 ? (
            <div className="quick-review-card">
              <h3>No shared decks available</h3>
              <p>
                Be the first person to share a study deck!
              </p>
            </div>
          ) : (
            <div className="decks-grid">
              {sharedDecks.map((deck) => (
                <div className="deck-card" key={deck.id}>
                  <div className="deck-icon">
                    {deck.icon || '📘'}
                  </div>

                  <p>{deck.subject}</p>
                  <h3>{deck.title}</h3>

                  <p>
                    {Array.isArray(deck.cards)
                      ? deck.cards.length
                      : 0}{' '}
                    flashcards
                  </p>

                  <button
                    className="study-btn"
                    style={{ width: '100%' }}
                    onClick={() => importSharedDeck(deck)}
                    disabled={importingDeckId === deck.id}
                  >
                    {importingDeckId === deck.id
                      ? 'Importing...'
                      : '📥 Import Deck'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ACHIEVEMENTS */}
        <section className="study-content" id="achievements">
          <div className="section-heading">
            <div>
              <h2>Achievements 🏆</h2>
              <p>
                Unlock milestones through real study activity.
              </p>
            </div>
          </div>

          <div className="stats-grid">
            {[
              {
                icon: '🌱',
                title: 'First Review',
                unlocked: reviewedCount >= 1,
                description: 'Review your first card.',
              },
              {
                icon: '📚',
                title: '10 Reviews',
                unlocked: reviewedCount >= 10,
                description: 'Record 10 review attempts.',
              },
              {
                icon: '🎯',
                title: 'Accuracy Star',
                unlocked:
                  reviewedCount >= 5 && accuracy >= 80,
                description:
                  'Reach 80% accuracy over 5 reviews.',
              },
              {
                icon: '🔥',
                title: '3-Day Streak',
                unlocked: streak >= 3,
                description:
                  'Study on 3 consecutive days.',
              },
            ].map((achievement) => (
              <div
                className="stat-card"
                key={achievement.title}
              >
                <div className="stat-icon">
                  {achievement.icon}
                </div>

                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>

                <span>
                  {achievement.unlocked
                    ? '✅ Unlocked'
                    : '🔒 Locked'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* SETTINGS */}
        <section className="study-content" id="settings">
          <div className="section-heading">
            <div>
              <h2>Settings ⚙️</h2>
              <p>Manage your local study data.</p>
            </div>
          </div>

          <div className="quick-review-card">
            <h3>Data Storage</h3>

            <p>
              Your personal data is automatically saved in this
              browser. Shared decks are stored in Supabase.
            </p>

            <button
              className="reveal-btn"
              onClick={() => {
                try {
                  const saved = localStorage.getItem(STORAGE_KEY)

                  if (saved) {
                    JSON.parse(saved)
                    setNotice(
                      'Your saved data is available in this browser.'
                    )
                  } else {
                    setNotice('No saved data found yet.')
                  }
                } catch {
                  setNotice('Could not verify your saved data.')
                }
              }}
            >
              Check Saved Data
            </button>

            <button
              className="reveal-btn"
              onClick={resetProgress}
              style={{
                marginLeft: '10px',
                background: '#fff0f0',
                color: '#b42318',
              }}
            >
              Reset Review Progress
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer
          style={{
            padding: '28px 0',
            color: '#777d97',
          }}
        >
          StudyBuddy · Learn · Revise · Remember
        </footer>
      </main>

      {/* STUDY MODAL */}
      {selectedDeck && currentCard && (
        <div
          className="study-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="study-question"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeStudy()
            }
          }}
        >
          <div className="study-modal">
            <div className="study-modal-header">
              <div>
                <span className="question-label">
                  {selectedDeck.title}
                </span>

                <h3 style={{ margin: '8px 0 0' }}>
                  Study Session
                </h3>
              </div>

              <button
                className="close-study"
                onClick={closeStudy}
                aria-label="Close study session"
              >
                ✕
              </button>
            </div>

            <p className="study-counter">
              Card {cardIndex + 1} of {selectedDeck.cards.length}
            </p>

            <div className="study-modal-progress">
              <div
                className="progress-fill"
                style={{
                  width: `${
                    ((cardIndex + 1) /
                      selectedDeck.cards.length) *
                    100
                  }%`,
                }}
              />
            </div>

            <h2 id="study-question">
              {currentCard.question}
            </h2>

            {answerShown ? (
              <div className="answer-box" id="stack-answer">
                <strong>Answer</strong>
                <p>{currentCard.answer}</p>
              </div>
            ) : (
              <p>
                Think about your answer, then reveal it.
              </p>
            )}

            {!answerShown ? (
              <button
                className="reveal-btn"
                onClick={() => setAnswerShown(true)}
              >
                Reveal Answer
              </button>
            ) : (
              <>
                <p>How well did you know the answer?</p>

                <div className="study-actions">
                  <button
                    className="practice-btn"
                    onClick={() => recordAnswer(false)}
                  >
                    Need Practice
                  </button>

                  <button
                    className="known-btn"
                    onClick={() => recordAnswer(true)}
                  >
                    Got It ✓
                  </button>
                </div>
              </>
            )}

            <button
              className="cancel-study"
              onClick={closeStudy}
            >
              End Study Session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
