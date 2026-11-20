/**
 * 要送給 GA 的自訂事件。所有參數都在這裡產生，原則：
 * - 只放「固定的枚舉值」（工具名、格式縮寫、設定選項、原因代碼），**絕不放檔名、檔案大小、影片內容、影片長度或解析度、錯誤訊息文字**
 * - 參數產生器都是純函式，方便測試；真正送出的 trackXxx 只是薄薄一層包裝
 */
import { trackEvent, type EventParams } from './analytics'
import { extensionOf, VideoError } from './utils/video'

export type Tool = 'gif' | 'trim' | 'frame'
export type SaveMethod = 'single' | 'share'
export type RejectReason = 'unsupported' | 'oversized' | 'too_many_files'

const SHORT_FORMAT: Record<string, string> = {
  mp4: 'mp4',
  m4v: 'mp4',
  mov: 'mov',
  webm: 'webm',
  mkv: 'mkv',
  avi: 'avi',
  '3gp': '3gp',
  gif: 'gif',
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
}

/** 把檔案整理成 mp4 / mov / webm / mkv / avi / 3gp / gif / png / jpeg / other。看副檔名，沒有副檔名再看 MIME type */
export function formatLabel(file: Pick<File | Blob, 'type'> & { name?: string }): string {
  const byExt = SHORT_FORMAT[extensionOf(file.name ?? '')]
  if (byExt) return byExt
  const subtype = file.type.split('/')[1]
  if (subtype === 'quicktime') return 'mov'
  if (subtype === 'x-matroska') return 'mkv'
  return SHORT_FORMAT[subtype ?? ''] ?? 'other'
}

export function filesAddedParams(tool: Tool, file: Pick<File, 'name' | 'type'>): EventParams {
  return { tool, input_format: formatLabel(file) }
}

export function saveResultParams(input: {
  tool: Tool
  method: SaveMethod
  blob: Pick<Blob, 'type'>
}): EventParams {
  return {
    tool: input.tool,
    method: input.method,
    output_format: formatLabel(input.blob),
  }
}

/** 開始處理時的設定（全是固定的選項值） */
export type ProcessSettings =
  | { tool: 'gif'; fps: number; width: number; duration: number }
  | { tool: 'trim'; mode: 'fast' | 'precise' }
  | { tool: 'frame'; format: 'png' | 'jpeg' }

export function processStartParams(settings: ProcessSettings): EventParams {
  switch (settings.tool) {
    case 'gif':
      return { tool: 'gif', fps: settings.fps, width: settings.width, duration: settings.duration }
    case 'trim':
      return { tool: 'trim', mode: settings.mode }
    case 'frame':
      return { tool: 'frame', format: settings.format }
  }
}

export interface Rejection {
  reason: RejectReason
  count: number
}

/** 上傳區挑檔後，哪些原因擋掉了多少檔案（沒有被擋的就回傳空陣列） */
export function rejectionsOf(
  selection: { unsupported: string[]; oversized: string[]; tooMany: boolean },
  droppedCount: number,
): Rejection[] {
  const list: Rejection[] = []
  if (selection.unsupported.length > 0) list.push({ reason: 'unsupported', count: selection.unsupported.length })
  if (selection.oversized.length > 0) list.push({ reason: 'oversized', count: selection.oversized.length })
  if (selection.tooMany) list.push({ reason: 'too_many_files', count: droppedCount })
  return list
}

const KNOWN_ERROR_CODES = new Set(['engineLoadFailed', 'processFailed', 'outOfMemory', 'shareFailed'])

/** 處理失敗要回報的參數。錯誤代碼只收已知的幾個，其他一律寫成 unknown，避免把任意文字送出去 */
export function errorParams(tool: Tool, code: string): EventParams {
  return { tool, code: KNOWN_ERROR_CODES.has(code) ? code : 'unknown' }
}

export const trackFilesAdded = (tool: Tool, file: Pick<File, 'name' | 'type'>) =>
  trackEvent('files_added', filesAddedParams(tool, file))

export const trackProcessStart = (settings: ProcessSettings) =>
  trackEvent('process_start', processStartParams(settings))

export const trackSaveResult = (input: Parameters<typeof saveResultParams>[0]) =>
  trackEvent('save_result', saveResultParams(input))

export function trackRejections(tool: Tool, selection: Parameters<typeof rejectionsOf>[0], droppedCount: number) {
  for (const rejection of rejectionsOf(selection, droppedCount)) {
    trackEvent('upload_rejected', { tool, ...rejection })
  }
}

export function trackError(tool: Tool, error: unknown) {
  const code = error instanceof VideoError ? error.code : 'unknown'
  trackEvent('processing_error', errorParams(tool, code))
}

export const trackShareFailure = (tool: Tool) => trackEvent('processing_error', errorParams(tool, 'shareFailed'))
