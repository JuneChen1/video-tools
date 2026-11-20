/** 組 ffmpeg 指令列的純函式（不需要瀏覽器，可以直接測試） */

export interface GifOptions {
  /** 起點（秒） */
  start: number
  /** 長度（秒） */
  duration: number
  fps: number
  /** 輸出寬度（px），來源比較窄時不放大 */
  width: number
}

/**
 * 轉成 GIF。用兩階段調色盤（palettegen + paletteuse）：先依這段影片的顏色做出最佳 256 色調色盤，
 * 畫質比預設調色盤好很多，檔案大小差不多。-ss 放在 -i 前面，直接跳到起點，不用解碼前面的部分
 */
export function gifArgs(input: string, output: string, options: GifOptions): string[] {
  const { start, duration, fps, width } = options
  const filter =
    `fps=${fps},scale='min(${width},iw)':-1:flags=lanczos,` +
    'split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5'
  return [
    '-ss', String(start),
    '-t', String(duration),
    '-i', input,
    '-an',
    '-vf', filter,
    '-loop', '0',
    output,
  ]
}

/** 起點最大值（轉 GIF 與剪輯影片共用）：影片結尾前 0.1 秒（無條件捨去到 0.1），影片長度未知時為 null（不設上限） */
export function maxStartSeconds(videoSeconds: number | null): number | null {
  if (videoSeconds === null || videoSeconds <= 0) return null
  return Math.max(0, Math.floor((videoSeconds - 0.1) * 10) / 10)
}

/**
 * 整理起點輸入框的文字：小數只留一位（多的直接捨去，和上下箭頭的 0.1 一致）、
 * 負數改成 0、超過影片長度改成最大值，其餘照原樣保留
 * （空字串與打到一半的「1.」保持不動，才不會打字時被改掉）
 */
export function clampStartInput(input: string, videoSeconds: number | null): string {
  return clampSecondsInput(input, maxStartSeconds(videoSeconds))
}

/** 秒數輸入框的通用整理：小數只留一位（捨去）、負數改成 0、超過 max 改成 max（max 為 null 時不設上限） */
export function clampSecondsInput(input: string, max: number | null): string {
  const raw = input.replace(/^(-?\d*\.\d)\d+$/, '$1')
  const n = Number(raw)
  if (raw.trim() === '' || !Number.isFinite(n)) return raw
  if (n < 0) return '0'
  return max !== null && n > max ? String(max) : raw
}

/** 終點最大值：影片長度（無條件捨去到 0.1），長度未知時為 null */
export function maxTrimEnd(videoSeconds: number | null): number | null {
  if (videoSeconds === null || videoSeconds <= 0) return null
  return Math.floor(videoSeconds * 10) / 10
}

/** 轉 GIF 時，起點與長度要符合影片實際長度（長度未知時 duration 給 null，只套用上限） */
export function clampGifRange(
  start: number,
  duration: number,
  videoSeconds: number | null,
): { start: number; duration: number } {
  const safeStart = Number.isFinite(start) && start > 0 ? start : 0
  if (videoSeconds === null || videoSeconds <= 0) return { start: safeStart, duration }
  const s = Math.min(safeStart, Math.max(0, videoSeconds - 0.1))
  return { start: s, duration: Math.min(duration, Math.max(0.1, videoSeconds - s)) }
}

/**
 * 剪輯影片的方式：
 * - fast：不重新編碼（-c copy），速度接近即時、畫質完全不變；但只能從關鍵影格切，起點可能比設定的早幾秒
 * - precise：重新編碼成 H.264 + AAC 的 MP4，起訖點精確，但速度慢（wasm 單執行緒）
 */
export type TrimMode = 'fast' | 'precise'

export interface TrimOptions {
  mode: TrimMode
  /** 起點（秒） */
  start: number
  /** 終點（秒）；null 代表一直到影片結尾 */
  end: number | null
}

/** 起點與終點是否構成有效片段（沒有終點代表到結尾，一定有效） */
export function isValidTrimRange(start: number, end: number | null): boolean {
  return Number.isFinite(start) && start >= 0 && (end === null || (Number.isFinite(end) && end > start))
}

/** 片段長度（秒，取到 0.1，避免浮點誤差）；終點未知時為 null */
export function trimDuration(start: number, end: number | null): number | null {
  return end === null ? null : Math.round((end - start) * 10) / 10
}

const COPY_CONTAINERS: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
}

/**
 * 輸出的副檔名與類型。快速模式不重新編碼，所以盡量沿用原本的容器（mp4、mov、mkv、webm）；
 * 其他（m4v、avi、3gp…）與精準模式一律輸出 mp4
 */
export function trimOutput(inputExt: string, mode: TrimMode): { ext: string; mime: string } {
  if (mode === 'fast' && inputExt in COPY_CONTAINERS) return { ext: inputExt, mime: COPY_CONTAINERS[inputExt] }
  return { ext: 'mp4', mime: 'video/mp4' }
}

export function trimArgs(input: string, output: string, options: TrimOptions): string[] {
  const { mode, start, end } = options
  const duration = trimDuration(start, end)
  // -ss 放在 -i 前面：直接跳到起點，不用解碼前面的部分
  const range = ['-ss', String(start), ...(duration === null ? [] : ['-t', String(duration)])]
  if (mode === 'fast') {
    // -map 0:v? -map 0:a? 保留所有影像與音軌，丟掉字幕與資料軌（例如 iPhone 的時間碼軌，封裝進 mp4 會失敗）
    return [
      ...range,
      '-i', input,
      '-map', '0:v?',
      '-map', '0:a?',
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      output,
    ]
  }
  return [
    ...range,
    '-i', input,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-vf', "scale=-2:'trunc(ih/2)*2'",
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    output,
  ]
}
