import { describe, expect, it } from 'vitest'
import { clampGifRange, gifArgs } from './ffmpegArgs'

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
