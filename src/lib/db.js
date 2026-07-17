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

export const roomPath = (roomId, sub = '') => `rooms/${roomId}${sub ? '/' + sub : ''}`

export const dbSet = (path, value) => set(ref(db, path), value)
export const dbUpdate = (path, value) => update(ref(db, path), value)
export const dbRemove = (path) => remove(ref(db, path))
export const dbPush = (path, value) => push(ref(db, path), value)
export const dbGet = async (path) => (await get(ref(db, path))).val()
export const dbTransaction = (path, fn) => runTransaction(ref(db, path), fn)

// 연결 끊김 감지: 값을 즉시 쓰고, 끊기면 onDisconnect 로 정리
export const markPresence = (path, onlineValue, offlineValue) => {
  const r = ref(db, path)
  set(r, onlineValue)
  onDisconnect(r).set(offlineValue)
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
