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

/** 起點最大值：影片結尾前 0.1 秒（無條件捨去到 0.1），影片長度未知時為 null（不設上限） */
export function maxGifStart(videoSeconds: number | null): number | null {
  if (videoSeconds === null || videoSeconds <= 0) return null
  return Math.max(0, Math.floor((videoSeconds - 0.1) * 10) / 10)
}

/**
 * 整理起點輸入框的文字：小數只留一位（多的直接捨去，和上下箭頭的 0.1 一致）、
 * 負數改成 0、超過影片長度改成最大值，其餘照原樣保留
 * （空字串與打到一半的「1.」保持不動，才不會打字時被改掉）
 */
export function clampStartInput(input: string, videoSeconds: number | null): string {
  const raw = input.replace(/^(-?\d*\.\d)\d+$/, '$1')
  const n = Number(raw)
  if (raw.trim() === '' || !Number.isFinite(n)) return raw
  if (n < 0) return '0'
  const max = maxGifStart(videoSeconds)
  return max !== null && n > max ? String(max) : raw
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
