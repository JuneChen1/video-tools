export type VideoErrorCode =
  | 'engineLoadFailed'
  | 'processFailed'
  | 'outOfMemory'
  | 'shareFailed'

/** 錯誤只帶代碼，顯示文字交給 i18n，這樣切換語言時訊息會跟著變 */
export class VideoError extends Error {
  code: VideoErrorCode

  constructor(code: VideoErrorCode) {
    super(code)
    this.code = code
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function baseName(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

/** 副檔名（小寫、不含點）；沒有的回傳空字串 */
export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : ''
}

/** 秒數轉成 m:ss（例如 83.4 → 1:23），預覽與說明用 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
