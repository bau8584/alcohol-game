// 게임 모드 선택 탭 (호스트가 라운드 시작 전 모드 선택).
export default function ModeTabs({ modes, value, onChange }) {
  return (
    <div className="inline-flex gap-2 clay-inset p-1.5">
      {modes.map((m) => {
        const active = m.id === value
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="font-display px-4 py-2 rounded-2xl text-base transition"
            style={
              active
                ? { background: 'var(--c-grape)', color: '#fff' }
                : { color: 'var(--ink-soft)' }
            }
          >
            {m.emoji} {m.label}
          </button>
        )
      })}
    </div>
  )
}
