import { MAX_FILE_BYTES } from './limits'
import { extensionOf } from './video'

/** 接受的副檔名。瀏覽器對 mkv、mov 等常回報空的 type，所以也看副檔名 */
export const ACCEPTED_EXTENSIONS = ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', '3gp']

/** 檔案選擇視窗的 accept 屬性 */
export const ACCEPT_ATTR = ['video/*', ...ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`)].join(',')

type FileLike = Pick<File, 'name' | 'type' | 'size'>

export const isAccepted = (file: FileLike) =>
  file.type.startsWith('video/') || ACCEPTED_EXTENSIONS.includes(extensionOf(file.name))

export interface Selection<T extends FileLike> {
  /** 要交給處理的檔案（最多一個） */
  taken: T[]
  /** 不是影片而略過的檔名 */
  unsupported: string[]
  /** 超過大小上限而略過的檔名 */
  oversized: string[]
  /** 一次選了多個影片：整批不處理（不悄悄只挑第一個） */
  tooMany: boolean
}

/**
 * 決定使用者選的（或拖進來的）檔案要不要收，以及為什麼不收。
 * 在載入 ffmpeg 之前執行，超過大小的檔案不會進到處理流程
 */
export function selectFiles<T extends FileLike>(all: T[]): Selection<T> {
  const accepted = all.filter(isAccepted)
  const files = accepted.filter((f) => f.size <= MAX_FILE_BYTES)
  const unsupported = all.filter((f) => !isAccepted(f)).map((f) => f.name)
  const oversized = accepted.filter((f) => f.size > MAX_FILE_BYTES).map((f) => f.name)

  if (files.length > 1) return { taken: [], unsupported, oversized, tooMany: true }
  return { taken: files, unsupported, oversized, tooMany: false }
}
