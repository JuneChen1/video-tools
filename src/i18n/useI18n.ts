import { createContext, useContext } from 'react'
import { VideoError } from '../utils/video'
import type { Lang } from './lang'
import type { Messages } from './zh'

export type { Lang }

export interface I18n {
  lang: Lang
  m: Messages
  setLang: (lang: Lang) => void
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

/** 把錯誤轉成目前語言的訊息；錯誤本身不存文字，切換語言時才會跟著更新 */
export function describeError(error: unknown, m: Messages): string {
  if (!(error instanceof VideoError)) return m.errors.generic
  switch (error.code) {
    case 'engineLoadFailed':
      return m.errors.engineLoadFailed
    case 'processFailed':
      return m.errors.processFailed
    case 'outOfMemory':
      return m.errors.outOfMemory
    case 'shareFailed':
      return m.common.shareFailed
  }
}
