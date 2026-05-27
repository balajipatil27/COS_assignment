import { useCallback, useRef, useState } from 'react'
import type { Message } from '../../types'

interface FileUploadProps {
  onMessagesLoaded: (messages: Message[]) => void
  onSampleData: () => void
}

export default function FileUpload({ onMessagesLoaded, onSampleData }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parseFile = useCallback(
    (file: File) => {
      setError(null)
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const parsed = JSON.parse(text)
          if (!Array.isArray(parsed)) {
            setError('Invalid file. Please upload a JSON array of messages.')
            return
          }
          onMessagesLoaded(parsed as Message[])
        } catch {
          setError('Invalid file. Please upload a JSON array of messages.')
        }
      }
      reader.readAsText(file)
    },
    [onMessagesLoaded],
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '24px',
      }}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          width: '480px',
          maxWidth: '100%',
          height: '200px',
          border: `2px dashed ${dragOver ? '#4A90D9' : 'var(--border)'}`,
          borderRadius: '12px',
          background: dragOver ? '#F0F7FF' : '#FAFAFA',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 200ms ease',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
            stroke="#9AA5B4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p
          style={{
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginTop: '12px',
          }}
        >
          Drop your messages JSON
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Supports any JSON array of message objects
        </p>
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#C53030', marginTop: '12px' }}>{error}</p>
      )}

      <div
        style={{
          width: '480px',
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          margin: '16px 0',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          padding: '8px 20px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        Browse file
      </button>

      <button
        type="button"
        onClick={onSampleData}
        style={{
          marginTop: '16px',
          fontSize: '13px',
          color: '#4A90D9',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none'
        }}
      >
        Use sample data →
      </button>
    </div>
  )
}
