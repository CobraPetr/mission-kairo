import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NanoCore } from './components/NanoCore'
import { TypewriterText } from './components/TypewriterText'
import { missionSound } from './lib/sound'
import { toFancyMono } from './lib/mono'

type Phase = 'standby' | 'intro' | 'questions' | 'complete'

const questions = [
  'Why are you starting now?',
  'What keeps you from becoming who you should be?',
  'If nothing changes, where will you be one year from now?',
  'What promise do you keep breaking?',
  'At day 90, what must be different?',
]

const sleep = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration))

function formatMissionDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

function MissionIntro({ onComplete }: { onComplete: () => void }) {
  const [display, setDisplay] = useState('')
  const date = useMemo(() => `${formatMissionDate()} // 00:01`, [])

  useEffect(() => {
    let active = true

    const type = async (text: string, speed: number) => {
      for (const character of text) {
        if (!active) return
        setDisplay((value) => value + character)
        if (character.trim()) missionSound.play('type')
        await sleep(speed)
      }
    }

    const erase = async () => {
      while (active) {
        let finished = false
        setDisplay((value) => {
          if (!value.length) {
            finished = true
            return value
          }
          return value.slice(0, -1)
        })
        if (finished) break
        missionSound.play('erase')
        await sleep(11)
      }
    }

    const run = async () => {
      await sleep(320)
      await type(date, 43)
      await sleep(520)
      await type('\nMISSION ACCEPTED.', 48)
      await sleep(1050)
      await erase()
      await sleep(280)
      if (active) onComplete()
    }

    void run()
    return () => {
      active = false
    }
  }, [date, onComplete])

  return (
    <section className="intro-stage" aria-live="polite" aria-label="Winter Arc mission introduction">
      <span className="intro-marker" aria-hidden="true" />
      <p className="intro-copy">
        <span aria-hidden="true">{toFancyMono(display)}</span>
        <span className="type-cursor" aria-hidden="true" />
      </p>
    </section>
  )
}

function LandingScreen({ onBegin }: { onBegin: () => void }) {
  const [titleComplete, setTitleComplete] = useState(false)
  const revealMission = useCallback(() => setTitleComplete(true), [])

  return (
    <section className={`standby-stage landing-v2 ${titleComplete ? 'is-armed' : ''}`}>
      <header className="landing-status">
        <span>{toFancyMono('CLASSIFIED // PERSONAL')}</span>
        <span>{toFancyMono(formatMissionDate())}</span>
      </header>

      <div className="landing-title-block">
        <p className="mission-code">{toFancyMono('MISSION FILE // WA-001')}</p>
        <h1>
          <TypewriterText
            text="WINTER ARC"
            speed={64}
            accentFrom={7}
            accentClassName="title-accent"
            onComplete={revealMission}
          />
        </h1>
        <p className={`landing-protocol ${titleComplete ? 'is-visible' : ''}`}>
          {toFancyMono('SELF-COMMAND PROTOCOL // 90 DAYS')}
        </p>
      </div>

      <NanoCore />

      <p className={`landing-directive ${titleComplete ? 'is-visible' : ''}`}>
        {toFancyMono('DECIDE ONCE. EXECUTE DAILY.')}
      </p>

      <div className={`landing-command ${titleComplete ? 'is-visible' : ''}`}>
        <button
          className="initiate-button landing-action"
          type="button"
          onClick={onBegin}
        >
          <span>{toFancyMono('ACCEPT MISSION')}</span>
          <i aria-hidden="true" />
        </button>
        <p className="landing-footer">{toFancyMono('SECURE CHANNEL // DEVICE LOCKED')}</p>
      </div>
    </section>
  )
}

function App() {
  const [phase, setPhase] = useState<Phase>('standby')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''))
  const [questionTyped, setQuestionTyped] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const beginMission = async () => {
    await missionSound.unlock()
    setPhase('intro')
  }

  const startQuestions = useCallback(() => {
    setPhase('questions')
  }, [])

  const finishTyping = useCallback(() => {
    setQuestionTyped(true)
  }, [])

  useEffect(() => {
    if (questionTyped) inputRef.current?.focus({ preventScroll: true })
  }, [questionTyped])

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input || phase !== 'questions') return

    input.style.height = '43px'
    input.style.height = `${Math.max(43, input.scrollHeight)}px`
  }, [answers, phase, questionIndex, questionTyped])

  const confirmAnswer = () => {
    if (!answers[questionIndex].trim() || transitioning) return

    setTransitioning(true)

    window.setTimeout(() => {
      if (questionIndex === questions.length - 1) {
        localStorage.setItem('winter-arc-intake', JSON.stringify(answers))
        setPhase('complete')
        setTransitioning(false)
        return
      }

      setQuestionIndex((value) => value + 1)
      setQuestionTyped(false)
      setTransitioning(false)
    }, 360)
  }

  const restart = () => {
    setQuestionIndex(0)
    setAnswers(questions.map(() => ''))
    setQuestionTyped(false)
    setTransitioning(false)
    setPhase('standby')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      confirmAnswer()
    }
  }

  return (
    <main className="app-shell">
      <div className="system-noise" aria-hidden="true" />
      <div className={`mission-frame ${phase === 'standby' ? 'is-landing' : ''}`}>
        {phase === 'standby' && <LandingScreen onBegin={beginMission} />}

        {phase === 'intro' && <MissionIntro onComplete={startQuestions} />}

        {phase === 'questions' && (
          <section className={`question-stage ${transitioning ? 'is-exiting' : ''}`}>
            <div className="progress-track" aria-label={`Question ${questionIndex + 1} of ${questions.length}`}>
              {questions.map((_, index) => (
                <span key={index} className={index <= questionIndex ? 'is-active' : ''} />
              ))}
            </div>

            <div className="question-content" key={questionIndex}>
              <h1>
                <TypewriterText
                  text={questions[questionIndex]}
                  speed={33}
                  onComplete={finishTyping}
                />
              </h1>
            </div>

            <div className={`response-zone ${questionTyped ? 'is-visible' : ''}`}>
              <p className="response-channel">
                {toFancyMono('RESPONSE CHANNEL')}
              </p>
              <div className="response-glass">
                <span className="response-prompt" aria-hidden="true">&gt;</span>
                <textarea
                  key={questionIndex}
                  ref={inputRef}
                  id="mission-answer"
                  aria-label="Your answer"
                  value={answers[questionIndex]}
                  onChange={(event) =>
                    setAnswers((current) =>
                      current.map((answer, index) =>
                        index === questionIndex ? event.target.value : answer,
                      ),
                    )
                  }
                  onKeyDown={handleKeyDown}
                  rows={1}
                  maxLength={360}
                  placeholder={toFancyMono('ENTER RESPONSE...')}
                  aria-describedby="response-help"
                />
                <div className="response-footer">
                  <span id="response-help" className="screen-reader-only">
                    Press Enter to continue. Press Shift and Enter for a new line.
                  </span>
                  <button
                    className="confirm-button"
                    type="button"
                    onClick={confirmAnswer}
                    disabled={!answers[questionIndex].trim()}
                    aria-label={questionIndex === 4 ? 'Lock dossier' : 'Confirm answer'}
                  >
                    <span>{toFancyMono(questionIndex === 4 ? 'LOCK IN' : 'CONTINUE')}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {phase === 'complete' && (
          <section className="complete-stage">
            <span className="complete-marker" aria-hidden="true" />
            <p className="micro-label">{toFancyMono('MISSION INTAKE // COMPLETE')}</p>
            <h1>{toFancyMono('FIRST STEP LOCKED.')}</h1>
            <p>Your answers are ready for profile generation.</p>
            <button className="initiate-button" type="button" onClick={restart}>
              <span>{toFancyMono('START AGAIN')}</span>
              <i aria-hidden="true" />
            </button>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
