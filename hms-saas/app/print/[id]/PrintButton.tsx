'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        background: 'linear-gradient(135deg, #038bbf, #00437b)',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        padding: '10px 20px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 2px 8px rgba(3,139,191,0.35)',
        zIndex: 9999,
      }}
    >
      🖨 Print Invoice
    </button>
  )
}
