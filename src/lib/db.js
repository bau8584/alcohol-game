// RTDB 저수준 래퍼 + 구독 훅. 모든 경로는 rooms/{roomId}/... 하위를 문자열로 받습니다.
import { useEffect, useState } from 'react'
import {
  ref,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  query,
  limitToLast,
  set,
  update,
  remove,
  push,
  get,
  runTransaction,
  serverTimestamp,
  onDisconnect,
} from 'firebase/database'
import { db } from '../firebase'

export const SERVER_TS = serverTimestamp()

// 서버 시각 보정 — 기기 시계가 서로 어긋나도 같은 시간축을 쓰도록 Firebase가 추정한
// (서버 - 내 시계) 오프셋을 추적한다. serverNow()는 모든 기기에서 (거의) 같은 값을 준다.
// 치킨게임처럼 밀리초 단위 타이밍 판정을 하는 게임은 Date.now() 대신 이걸 써야 한다.
let _serverOffset = 0
onValue(ref(db, '.info/serverTimeOffset'), (snap) => { _serverOffset = snap.val() || 0 })
export const serverNow = () => Date.now() + _serverOffset

export const roomPath = (roomId, sub = '') => `rooms/${roomId}${sub ? '/' + sub : ''}`

export const dbSet = (path, value) => set(ref(db, path), value)
export const dbUpdate = (path, value) => update(ref(db, path), value)
export const dbRemove = (path) => remove(ref(db, path))
export const dbPush = (path, value) => push(ref(db, path), value)
export const dbGet = async (path) => (await get(ref(db, path))).val()
export const dbTransaction = (path, fn) => runTransaction(ref(db, path), fn)

// 연결 끊김 감지: .info/connected 를 구독해 '재연결될 때마다' online 값을 다시 쓴다.
// (최초 1회만 쓰면, 모바일에서 잠깐 끊겼다 붙을 때 onDisconnect 가 남긴 offline 값이
//  복구되지 않아 접속 중인데도 유령으로 남는 버그가 생긴다.)
// 반환값은 정리 함수 — 언마운트 시 호출해 구독을 끊는다.
export const markPresence = (path, onlineValue, offlineValue) => {
  const r = ref(db, path)
  const connRef = ref(db, '.info/connected')
  const unsub = onValue(connRef, (snap) => {
    if (snap.val() !== true) return // 끊긴 상태 — 아무것도 안 함(재연결 시 다시 호출됨)
    // 재연결될 때마다: 먼저 끊김 핸들러를 예약하고, 그 다음 online 값을 쓴다.
    onDisconnect(r).set(offlineValue).then(() => set(r, onlineValue))
  })
  return unsub
}

// 경로 값 실시간 구독 훅. 값이 없으면 null.
export function useValue(path) {
  const [value, setValue] = useState(undefined)
  useEffect(() => {
    if (!path) {
      setValue(undefined)
      return
    }
    const r = ref(db, path)
    const unsub = onValue(r, (snap) => setValue(snap.val()))
    return () => unsub()
  }, [path])
  return value
}

// 객체 맵을 [{id, ...value}] 배열로 변환하는 헬퍼
export const toList = (obj) =>
  obj ? Object.entries(obj).map(([id, v]) => ({ id, ...(v && typeof v === 'object' ? v : { value: v }) })) : []

const normChild = (snap) => {
  const v = snap.val()
  return { id: snap.key, ...(v && typeof v === 'object' ? v : { value: v }) }
}

// push 리스트(taps·posts·답변 등) 전용 구독 훅.
// onValue(리스트 전체 재다운로드) 대신 child_added/changed/removed → '변한 항목만' 받아 다운로드 급감.
// 반환: [{id, ...value}] 배열 (추가된 순서). opts.limit 로 최근 N개만 구독 가능.
export function useChildList(path, opts = {}) {
  const { limit } = opts
  const [items, setItems] = useState([])
  useEffect(() => {
    if (!path) {
      setItems([])
      return
    }
    const base = ref(db, path)
    const q = limit ? query(base, limitToLast(limit)) : base
    const map = new Map()
    const flush = () => setItems([...map.values()])
    setItems([])
    const u1 = onChildAdded(q, (s) => { map.set(s.key, normChild(s)); flush() })
    const u2 = onChildChanged(q, (s) => { map.set(s.key, normChild(s)); flush() })
    const u3 = onChildRemoved(q, (s) => { map.delete(s.key); flush() })
    return () => { u1(); u2(); u3() }
  }, [path, limit])
  return items
}
