// RTDB 저수준 래퍼 + 구독 훅. 모든 경로는 rooms/{roomId}/... 하위를 문자열로 받습니다.
import { useEffect, useState } from 'react'
import {
  ref,
  onValue,
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
