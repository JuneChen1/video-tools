import { describe, expect, it } from 'vitest'
import { clampGifRange, clampStartInput, gifArgs, maxGifStart } from './ffmpegArgs'

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

describe('maxGifStart', () => {
  it('影片結尾前 0.1 秒（捨去到 0.1）', () => {
    expect(maxGifStart(10)).toBe(9.9)
    expect(maxGifStart(3.97)).toBe(3.8)
  })

  it('長度未知或為 0：不設上限', () => {
    expect(maxGifStart(null)).toBeNull()
    expect(maxGifStart(0)).toBeNull()
  })

  it('比 0.1 秒還短的影片：上限是 0', () => {
    expect(maxGifStart(0.05)).toBe(0)
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
