import { describe, expect, it } from 'vitest'
import {
  clampGifRange,
  clampSecondsInput,
  clampStartInput,
  gifArgs,
  isValidTrimRange,
  maxStartSeconds,
  maxTrimEnd,
  trimArgs,
  trimDuration,
  trimOutput,
} from './ffmpegArgs'

const after = (args: string[], flag: string) => args[args.indexOf(flag) + 1]

describe('gifArgs', () => {
  const args = gifArgs('in.mp4', 'out.gif', { start: 1.5, duration: 5, fps: 10, width: 480 })

  it('-ss 與 -t 在 -i 前面（直接跳到起點）', () => {
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'))
    expect(args.indexOf('-t')).toBeLessThan(args.indexOf('-i'))
    expect(after(args, '-ss')).toBe('1.5')
    expect(after(args, '-t')).toBe('5')
  })

  it('濾鏡含幀率、寬度（不放大）與兩階段調色盤', () => {
    const filter = after(args, '-vf')
    expect(filter).toContain('fps=10')
    expect(filter).toContain("scale='min(480,iw)':-1")
    expect(filter).toContain('palettegen')
    expect(filter).toContain('paletteuse')
  })

  it('不含聲音、無限循環、最後是輸出檔', () => {
    expect(args).toContain('-an')
    expect(after(args, '-loop')).toBe('0')
    expect(args.at(-1)).toBe('out.gif')
  })
})

describe('clampGifRange', () => {
  it('影片長度未知：只整理起點，長度照給', () => {
    expect(clampGifRange(2, 5, null)).toEqual({ start: 2, duration: 5 })
  })

  it('起點不是合法數字或為負數：從 0 開始', () => {
    expect(clampGifRange(NaN, 5, null).start).toBe(0)
    expect(clampGifRange(-3, 5, null).start).toBe(0)
  })

  it('起點加長度超過影片長度：長度縮短到影片結尾', () => {
    expect(clampGifRange(8, 5, 10)).toEqual({ start: 8, duration: 2 })
  })

  it('起點超過影片長度：拉回結尾之前，至少保留一點長度', () => {
    const range = clampGifRange(99, 5, 10)
    expect(range.start).toBeLessThan(10)
    expect(range.duration).toBeGreaterThan(0)
  })

  it('影片夠長時不變', () => {
    expect(clampGifRange(1, 5, 60)).toEqual({ start: 1, duration: 5 })
  })
})

describe('maxStartSeconds', () => {
  it('影片結尾前 0.1 秒（捨去到 0.1）', () => {
    expect(maxStartSeconds(10)).toBe(9.9)
    expect(maxStartSeconds(3.97)).toBe(3.8)
  })

  it('長度未知或為 0：不設上限', () => {
    expect(maxStartSeconds(null)).toBeNull()
    expect(maxStartSeconds(0)).toBeNull()
  })

  it('比 0.1 秒還短的影片：上限是 0', () => {
    expect(maxStartSeconds(0.05)).toBe(0)
  })
})

describe('clampStartInput', () => {
  it('超過影片長度：改成最大值', () => {
    expect(clampStartInput('2002.1', 10)).toBe('9.9')
    expect(clampStartInput('10', 10)).toBe('9.9')
  })

  it('範圍內：原樣保留，包含打到一半的文字', () => {
    expect(clampStartInput('3.5', 10)).toBe('3.5')
    expect(clampStartInput('1.', 10)).toBe('1.')
    expect(clampStartInput('', 10)).toBe('')
  })

  it('小數只留一位（捨去，不進位）', () => {
    expect(clampStartInput('140.11', 200)).toBe('140.1')
    expect(clampStartInput('1.99', 10)).toBe('1.9')
    expect(clampStartInput('1.2345', null)).toBe('1.2')
    expect(clampStartInput('2.5', 10)).toBe('2.5')
  })

  it('小數捨去後仍會檢查上限', () => {
    expect(clampStartInput('99.99', 10)).toBe('9.9')
  })

  it('負數：改成 0', () => {
    expect(clampStartInput('-2', 10)).toBe('0')
    expect(clampStartInput('-2', null)).toBe('0')
  })

  it('影片長度未知：不限制上限', () => {
    expect(clampStartInput('2002.1', null)).toBe('2002.1')
  })
})

describe('clampSecondsInput / maxTrimEnd', () => {
  it('終點上限是影片長度（捨去到 0.1）', () => {
    expect(maxTrimEnd(10)).toBe(10)
    expect(maxTrimEnd(3.97)).toBe(3.9)
    expect(maxTrimEnd(null)).toBeNull()
  })

  it('超過上限改成上限、負數改成 0、多的小數捨去', () => {
    expect(clampSecondsInput('99', 10)).toBe('10')
    expect(clampSecondsInput('-1', 10)).toBe('0')
    expect(clampSecondsInput('2.56', null)).toBe('2.5')
    expect(clampSecondsInput('', 10)).toBe('')
  })
})

describe('isValidTrimRange / trimDuration', () => {
  it('終點必須大於起點；沒有終點代表到結尾', () => {
    expect(isValidTrimRange(1, 5)).toBe(true)
    expect(isValidTrimRange(5, 5)).toBe(false)
    expect(isValidTrimRange(6, 5)).toBe(false)
    expect(isValidTrimRange(0, null)).toBe(true)
  })

  it('起點不能是負數或非數字', () => {
    expect(isValidTrimRange(-1, 5)).toBe(false)
    expect(isValidTrimRange(NaN, 5)).toBe(false)
    expect(isValidTrimRange(1, NaN)).toBe(false)
  })

  it('片段長度取到 0.1，沒有浮點誤差', () => {
    expect(trimDuration(0.1, 0.4)).toBe(0.3)
    expect(trimDuration(1.2, 3.5)).toBe(2.3)
    expect(trimDuration(2, null)).toBeNull()
  })
})

describe('trimOutput', () => {
  it('快速模式沿用原本的容器', () => {
    expect(trimOutput('mov', 'fast')).toEqual({ ext: 'mov', mime: 'video/quicktime' })
    expect(trimOutput('mkv', 'fast')).toEqual({ ext: 'mkv', mime: 'video/x-matroska' })
    expect(trimOutput('webm', 'fast')).toEqual({ ext: 'webm', mime: 'video/webm' })
    expect(trimOutput('mp4', 'fast')).toEqual({ ext: 'mp4', mime: 'video/mp4' })
  })

  it('其他容器與精準模式一律輸出 mp4', () => {
    expect(trimOutput('avi', 'fast')).toEqual({ ext: 'mp4', mime: 'video/mp4' })
    expect(trimOutput('m4v', 'fast')).toEqual({ ext: 'mp4', mime: 'video/mp4' })
    expect(trimOutput('', 'fast')).toEqual({ ext: 'mp4', mime: 'video/mp4' })
    expect(trimOutput('webm', 'precise')).toEqual({ ext: 'mp4', mime: 'video/mp4' })
  })
})

describe('trimArgs', () => {
  it('快速模式：不重新編碼，-ss 與 -t 在 -i 前面', () => {
    const args = trimArgs('in.mp4', 'out.mp4', { mode: 'fast', start: 1.5, end: 4 })
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'))
    expect(after(args, '-ss')).toBe('1.5')
    expect(after(args, '-t')).toBe('2.5')
    expect(after(args, '-c')).toBe('copy')
    expect(args).not.toContain('libx264')
    expect(args.at(-1)).toBe('out.mp4')
  })

  it('快速模式：保留所有影像與音軌，丟掉資料軌', () => {
    const args = trimArgs('i', 'o', { mode: 'fast', start: 0, end: 1 })
    expect(args).toContain('0:v?')
    expect(args).toContain('0:a?')
  })

  it('沒有終點：不加 -t（一直到結尾）', () => {
    const args = trimArgs('i', 'o', { mode: 'fast', start: 2, end: null })
    expect(args).not.toContain('-t')
    expect(after(args, '-ss')).toBe('2')
  })

  it('精準模式：重新編碼成 H.264 + AAC，高度取偶數', () => {
    const args = trimArgs('i', 'o', { mode: 'precise', start: 1, end: 3 })
    expect(after(args, '-c:v')).toBe('libx264')
    expect(after(args, '-c:a')).toBe('aac')
    expect(after(args, '-vf')).toBe("scale=-2:'trunc(ih/2)*2'")
    expect(args).not.toContain('copy')
    expect(after(args, '-t')).toBe('2')
  })
})
