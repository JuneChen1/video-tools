import { describe, expect, it } from 'vitest'
import { VideoError, type VideoErrorCode } from '../utils/video'
import { en } from './en'
import { ja } from './ja'
import { describeError } from './useI18n'
import { zh } from './zh'

type Tree = { [key: string]: unknown }

/** 把字典攤平成「路徑 → 值」，函式與字串都是葉子 */
function leaves(tree: Tree, prefix = ''): [string, unknown][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? leaves(value as Tree, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value] as [string, unknown]],
  )
}

describe('中、英、日字典', () => {
  it.each([
    ['en', en],
    ['ja', ja],
  ])('%s 與中文的欄位完全一致（沒有漏翻、沒有多出來的）', (_name, messages) => {
    expect(leaves(messages).map(([path]) => path)).toEqual(leaves(zh).map(([path]) => path))
  })

  it.each([
    ['en', en],
    ['ja', ja],
  ])('%s 的每個欄位型態與中文相同，函式的參數個數也相同', (_name, messages) => {
    const shape = (value: unknown) => (typeof value === 'function' ? `fn(${value.length})` : typeof value)
    expect(leaves(messages).map(([path, value]) => [path, shape(value)])).toEqual(
      leaves(zh).map(([path, value]) => [path, shape(value)]),
    )
  })

  it.each([
    ['zh', zh],
    ['en', en],
    ['ja', ja],
  ])('%s：每個字串都不是空的，每個函式都回傳非空字串', (_name, messages) => {
    for (const [path, value] of leaves(messages)) {
      if (typeof value === 'function') {
        const result = (value as (...args: unknown[]) => unknown)(...Array(value.length).fill(3))
        expect(typeof result, path).toBe('string')
        expect(result as string, path).not.toBe('')
      } else {
        expect(typeof value, path).toBe('string')
        expect((value as string).length, path).toBeGreaterThan(0)
      }
    }
  })

  it('語言標記', () => {
    expect(zh.htmlLang).toBe('zh-Hant')
    expect(en.htmlLang).toBe('en')
    expect(ja.htmlLang).toBe('ja')
  })
})

describe('使用者指定的文字（改動前要先確認）', () => {
  it('隱私說明：影片不會上傳', () => {
    expect(zh.privacy).toBe('所有處理都在你的瀏覽器內完成，影片不會上傳到任何伺服器。')
    expect(en.privacy).toContain('never uploaded')
    expect(ja.privacy).toContain('アップロードされることはありません')
  })

  it('檔案過大的提示帶著上限', () => {
    expect(zh.dropzone.tooBig(1, 100, 'a.mp4')).toBe('已略過 1 個過大的檔案（單檔上限 100 MB）：a.mp4')
    expect(en.dropzone.tooBig(1, 100, 'a.mp4')).toContain('limit 100 MB')
    expect(ja.dropzone.tooBig(1, 100, 'a.mp4')).toContain('上限 100 MB')
  })

  it('中文用頓號、英文用逗號分隔檔名', () => {
    expect(zh.listSep).toBe('、')
    expect(en.listSep).toBe(', ')
    expect(ja.listSep).toBe('、')
  })
})

describe('英文的單複數', () => {
  it('檔案過大提示', () => {
    expect(en.dropzone.tooBig(1, 100, 'a.mp4')).toContain('1 oversized file ')
    expect(en.dropzone.tooBig(2, 100, 'a.mp4, b.mp4')).toContain('2 oversized files ')
  })

  it('不是影片的提示', () => {
    expect(en.dropzone.rejected(1, 'a.png')).toContain('1 file that is not video:')
    expect(en.dropzone.rejected(2, 'a.png, b.png')).toContain('2 files that are not video:')
  })
})

describe('describeError', () => {
  // 用 Record 讓 TypeScript 檢查「每一種錯誤代碼都有測到」，新增代碼卻沒補測試時會編譯失敗
  const samples: Record<VideoErrorCode, VideoError> = {
    engineLoadFailed: new VideoError('engineLoadFailed'),
    processFailed: new VideoError('processFailed'),
    outOfMemory: new VideoError('outOfMemory'),
    shareFailed: new VideoError('shareFailed'),
  }

  it.each(Object.entries(samples))('%s：中、英、日都有訊息，且不是通用的失敗訊息', (_code, error) => {
    for (const messages of [zh, en, ja]) {
      const text = describeError(error, messages)
      expect(text.length).toBeGreaterThan(0)
      expect(text).not.toBe(messages.errors.generic)
    }
  })

  it('記憶體不足：訊息帶著建議的檔案大小', () => {
    expect(describeError(samples.outOfMemory, zh)).toContain('100 MB')
    expect(describeError(samples.outOfMemory, en)).toContain('100 MB')
    expect(describeError(samples.outOfMemory, ja)).toContain('100 MB')
  })

  it('不是 VideoError 的錯誤用通用訊息', () => {
    expect(describeError(new Error('boom'), zh)).toBe(zh.errors.generic)
    expect(describeError('string error', en)).toBe(en.errors.generic)
    expect(describeError(null, en)).toBe(en.errors.generic)
  })
})
