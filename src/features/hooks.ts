import { useCallback, useEffect, useRef, useState } from 'react'
import { trackError, type Tool } from '../analyticsEvents'
import { isAbort, runVideoJob, type JobOptions, type JobProgress } from '../utils/ffmpeg'

/** 把 File / Blob 變成可以放進 <video> 或 <img> 的網址，不用時自動釋放 */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  // 網址要在 effect 裡建立：StrictMode 會先執行一次清除函式，若網址是在 render 時建立就會被提早釋放
  useEffect(() => {
    if (!blob) {
      // oxlint-disable-next-line react/set-state-in-effect
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(blob)
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}

export interface VideoJob {
  /** 處理中才有值 */
  progress: JobProgress | null
  result: Blob | null
  error: unknown
  run: (options: Omit<JobOptions, 'onProgress' | 'signal'>) => Promise<void>
  /** 取消目前的處理 */
  cancel: () => void
  /** 清掉結果與錯誤（換影片時用），處理中會一併取消 */
  reset: () => void
}

/** 一次影片處理的狀態：進度、結果、錯誤，以及取消 */
export function useVideoJob(tool: Tool): VideoJob {
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [result, setResult] = useState<Blob | null>(null)
  const [error, setError] = useState<unknown>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => controllerRef.current?.abort(), [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    setResult(null)
    setError(null)
  }, [])

  // 離開頁面時結束處理
  useEffect(() => () => controllerRef.current?.abort(), [])

  const run = useCallback(
    async (options: Omit<JobOptions, 'onProgress' | 'signal'>) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      setResult(null)
      setError(null)
      setProgress({ stage: 'download', ratio: null })
      try {
        const blob = await runVideoJob({
          ...options,
          signal: controller.signal,
          onProgress: (p) => {
            if (controllerRef.current === controller) setProgress(p)
          },
        })
        if (controllerRef.current === controller) setResult(blob)
      } catch (e) {
        if (isAbort(e)) return
        if (controllerRef.current === controller) setError(e)
        trackError(tool, e)
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null
          setProgress(null)
        }
      }
    },
    [tool],
  )

  return { progress, result, error, run, cancel, reset }
}
