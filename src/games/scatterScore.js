// 동시 입력 배틀 채점 — 순수 함수(React·firebase 의존 없음)라 단독으로 테스트할 수 있다.
export const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '')

// ans = { pid: { pushId: { t } } } → { pid: { items:[{text,n,uniq}], uniq, dup } }
// · 같은 사람이 같은 답을 두 번 써도 1개로만 센다.
// · 다른 사람과 겹친 답(uniq=false)은 0점, 나만 쓴 답만 점수.
export function tally(ansRaw) {
  const perPlayer = {}
  Object.entries(ansRaw || {}).forEach(([pid, obj]) => {
    const seen = new Set()
    const list = []
    Object.values(obj || {}).forEach((v) => {
      const n = norm(v?.t)
      if (!n || seen.has(n)) return
      seen.add(n)
      list.push({ text: v.t, n })
    })
    perPlayer[pid] = list
  })

  const owners = {}
  Object.entries(perPlayer).forEach(([pid, list]) =>
    list.forEach((e) => {
      if (!owners[e.n]) owners[e.n] = new Set()
      owners[e.n].add(pid)
    })
  )

  const out = {}
  Object.entries(perPlayer).forEach(([pid, list]) => {
    const items = list.map((e) => ({ ...e, uniq: owners[e.n].size === 1 }))
    out[pid] = {
      items,
      uniq: items.filter((i) => i.uniq).length,
      dup: items.filter((i) => !i.uniq).length,
    }
  })
  return out
}
