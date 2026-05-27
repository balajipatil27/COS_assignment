import { useCallback, useMemo, useState } from 'react'
import { analyzeMessages, generateDrafts } from './api/analyze'
import { sampleMessages } from './data/sampleMessages'
import type { AnalysisResponse, Message } from './types'
import FileUpload from './components/Upload/FileUpload'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import BriefingView from './components/Briefing/BriefingView'
import TriageView from './components/Triage/TriageView'
import FlagsView from './components/Flags/FlagsView'

type AppState = 'idle' | 'loading' | 'results'
type Section = 'briefing' | 'triage' | 'flags'

function LoadingView() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '960px', display: 'flex', gap: '16px' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: '24px', marginBottom: '16px' }} />
            <div className="skeleton" style={{ height: '160px', marginBottom: '16px' }} />
            <div className="skeleton" style={{ height: '140px' }} />
          </div>
        ))}
      </div>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '32px' }}>
        Analysing your messages...
      </p>
      <div style={{ marginTop: '12px' }} aria-hidden="true">
        <div className="progress-track">
          <div className="progress-bar" />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [activeSection, setActiveSection] = useState<Section>('briefing')
  const [error, setError] = useState<string | null>(null)
  const [lastMessages, setLastMessages] = useState<Message[] | null>(null)
  const [drafting, setDrafting] = useState(false)

  const runAnalysis = useCallback(async (messages: Message[]) => {
    setAppState('loading')
    setError(null)
    setActiveSection('briefing')
    setLastMessages(messages)
    setDrafting(false)
    try {
      const result = await analyzeMessages(messages)
      setAnalysis(result)
      setAppState('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setAppState('results')
    }
  }, [])

  const handleMessagesLoaded = useCallback(
    (messages: Message[]) => {
      runAnalysis(messages)
    },
    [runAnalysis],
  )

  const handleSampleData = useCallback(() => {
    runAnalysis(sampleMessages)
  }, [runAnalysis])

  const handleNewAnalysis = useCallback(() => {
    setAppState('idle')
    setAnalysis(null)
    setError(null)
    setActiveSection('briefing')
    setLastMessages(null)
    setDrafting(false)
  }, [])

  const draftsMissing = useMemo(() => {
    if (!analysis) return false
    return analysis.triage.some(
      (t) => t.category !== 'IGNORE' && t.drafted_response.trim().length === 0,
    )
  }, [analysis])

  const handleGenerateDrafts = useCallback(async () => {
    if (!analysis || !lastMessages) return
    setDrafting(true)
    setError(null)
    try {
      const res = await generateDrafts(lastMessages, analysis.triage)
      const map = new Map(res.updates.map((u) => [u.id, u]))
      setAnalysis({
        ...analysis,
        triage: analysis.triage.map((t) => {
          const u = map.get(t.id)
          if (!u) return t
          return { ...t, drafted_response: u.drafted_response, delegate_to: u.delegate_to }
        }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft generation failed')
    } finally {
      setDrafting(false)
    }
  }, [analysis, lastMessages])

  if (appState === 'idle') {
    return <FileUpload onMessagesLoaded={handleMessagesLoaded} onSampleData={handleSampleData} />
  }

  const decideCount = analysis?.triage.filter((t) => t.category === 'DECIDE').length ?? 0
  const delegatedCount = analysis?.triage.filter((t) => t.category === 'DELEGATE').length ?? 0
  const flagsCount = analysis?.flags.length ?? 0

  return (
    <div className="app-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onNewAnalysis={handleNewAnalysis}
        decideCount={decideCount}
        flagsCount={flagsCount}
      />
      <div
        className="main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-primary)',
          overflow: 'hidden',
        }}
      >
        {appState === 'loading' ? (
          <>
            <header
              className="no-print"
              style={{
                height: '56px',
                flexShrink: 0,
                borderBottom: '1px solid var(--border)',
              }}
            />
            <LoadingView />
          </>
        ) : (
          <>
            <Header
              section={activeSection}
              decideCount={decideCount}
              delegatedCount={delegatedCount}
              flags={analysis?.flags ?? []}
            />
            {error && (
              <div
                style={{
                  background: '#FFF5F5',
                  color: '#C53030',
                  padding: '12px 24px',
                  fontSize: '14px',
                  borderBottom: '1px solid #FEB2B2',
                }}
              >
                {error}
              </div>
            )}
            {analysis && activeSection === 'triage' && draftsMissing && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 24px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                }}
              >
                <span>
                  Drafted responses are not generated yet. Generate them on-demand to speed up analysis.
                </span>
                <button
                  type="button"
                  onClick={handleGenerateDrafts}
                  disabled={drafting}
                  style={{
                    padding: '8px 14px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: drafting ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    opacity: drafting ? 0.7 : 1,
                  }}
                >
                  {drafting ? 'Generating…' : 'Generate drafted responses'}
                </button>
              </div>
            )}
            <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {analysis ? (
                <>
                  {activeSection === 'briefing' && <BriefingView briefing={analysis.briefing} />}
                  {activeSection === 'triage' && <TriageView items={analysis.triage} />}
                  {activeSection === 'flags' && <FlagsView flags={analysis.flags} />}
                </>
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                  }}
                >
                  No results yet.
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  )
}
