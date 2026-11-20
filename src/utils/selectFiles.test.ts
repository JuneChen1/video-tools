import { describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES, MAX_FILE_MB } from './limits'
import { ACCEPT_ATTR, isAccepted, selectFiles } from './selectFiles'

const f = (name: string, type = 'video/mp4', size = 1000) => ({ name, type, size })
const names = (list: { name: string }[]) => list.map((x) => x.name)

describe('單檔大小上限', () => {
  it('上限是 650 MB（600.47 MiB 的影片要收得下）', () => {
    expect(MAX_FILE_MB).toBe(650)
    expect(MAX_FILE_BYTES).toBe(650 * 1024 * 1024)
    expect(MAX_FILE_BYTES).toBeGreaterThan(629_633_220) // 實測用的 600.47 MiB 影片
  })
})

describe('isAccepted / 支援的格式', () => {
  it.each(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'])('收 %s', (type) => {
    expect(isAccepted(f('x', type))).toBe(true)
  })

  it.each(['a.mp4', 'a.MOV', 'a.mkv', 'a.webm', 'a.m4v', 'a.avi', 'a.3gp'])(
    '瀏覽器沒回報類型時，看副檔名收 %s',
    (name) => {
      expect(isAccepted(f(name, ''))).toBe(true)
    },
  )

  it.each([
    ['photo.png', 'image/png'],
    ['anim.gif', 'image/gif'],
    ['song.mp3', 'audio/mpeg'],
    ['doc.pdf', 'application/pdf'],
    ['noextension', ''],
  ])('不收 %s（%j）', (name, type) => {
    expect(isAccepted(f(name, type))).toBe(false)
  })

  it('檔案選擇視窗的 accept 屬性包含 video/* 與副檔名', () => {
    expect(ACCEPT_ATTR).toContain('video/*')
    expect(ACCEPT_ATTR).toContain('.mkv')
  })
})

describe('selectFiles：在載入 ffmpeg 之前先擋掉不合格的檔案', () => {
  it('一部合格的影片：收下', () => {
    const result = selectFiles([f('a.mp4')])
    expect(names(result.taken)).toEqual(['a.mp4'])
    expect(result).toMatchObject({ unsupported: [], oversized: [], tooMany: false })
  })

  it('剛好等於上限：收下；多 1 byte：拒絕並記下檔名', () => {
    expect(selectFiles([f('a.mp4', 'video/mp4', MAX_FILE_BYTES)]).taken).toHaveLength(1)
    const over = selectFiles([f('big.mp4', 'video/mp4', MAX_FILE_BYTES + 1)])
    expect(over.taken).toEqual([])
    expect(over.oversized).toEqual(['big.mp4'])
  })

  it('不是影片：略過並記下檔名', () => {
    const result = selectFiles([f('a.png', 'image/png')])
    expect(result.taken).toEqual([])
    expect(result.unsupported).toEqual(['a.png'])
  })

  it('一次選了多部影片：整批不處理（不悄悄只挑第一部）', () => {
    const result = selectFiles([f('a.mp4'), f('b.mp4')])
    expect(result.taken).toEqual([])
    expect(result.tooMany).toBe(true)
  })

  it('一部影片加一張圖：收下影片，圖片記為不支援', () => {
    const result = selectFiles([f('a.mp4'), f('b.png', 'image/png')])
    expect(names(result.taken)).toEqual(['a.mp4'])
    expect(result.unsupported).toEqual(['b.png'])
    expect(result.tooMany).toBe(false)
  })

  it('一部過大、一部合格：只剩合格的那部，不算「選太多」', () => {
    const result = selectFiles([f('big.mp4', 'video/mp4', MAX_FILE_BYTES + 1), f('ok.mp4')])
    expect(names(result.taken)).toEqual(['ok.mp4'])
    expect(result.oversized).toEqual(['big.mp4'])
    expect(result.tooMany).toBe(false)
  })
})
