import { describe, expect, it } from 'vitest'
import {
  errorParams,
  filesAddedParams,
  formatLabel,
  processStartParams,
  rejectionsOf,
  saveResultParams,
} from './analyticsEvents'

describe('formatLabel：只送格式縮寫，不送檔名', () => {
  it.each([
    [{ name: 'a.mp4', type: 'video/mp4' }, 'mp4'],
    [{ name: 'a.MOV', type: '' }, 'mov'],
    [{ name: 'a', type: 'video/quicktime' }, 'mov'],
    [{ name: 'a', type: 'video/x-matroska' }, 'mkv'],
    [{ name: 'a.webm', type: 'video/webm' }, 'webm'],
    [{ name: 'a.xyz', type: '' }, 'other'],
    [{ name: 'out.gif', type: 'image/gif' }, 'gif'],
    [{ name: 'a_1.0s.png', type: 'image/png' }, 'png'],
    [{ name: 'a_1.0s.jpg', type: 'image/jpeg' }, 'jpeg'],
  ])('%j → %s', (file, expected) => {
    expect(formatLabel(file)).toBe(expected)
  })

  it('Blob（沒有檔名）看 type', () => {
    expect(formatLabel({ type: 'video/mp4' })).toBe('mp4')
    expect(formatLabel({ type: 'image/gif' })).toBe('gif')
    expect(formatLabel({ type: 'image/png' })).toBe('png')
    expect(formatLabel({ type: 'image/jpeg' })).toBe('jpeg')
    expect(formatLabel({ type: '' })).toBe('other')
  })
})

describe('事件參數不含檔名、大小、尺寸', () => {
  it('files_added', () => {
    const params = filesAddedParams('gif', { name: '我的假期.mov', type: 'video/quicktime' })
    expect(params).toEqual({ tool: 'gif', input_format: 'mov' })
    expect(JSON.stringify(params)).not.toContain('假期')
  })

  it('save_result', () => {
    expect(saveResultParams({ tool: 'gif', method: 'single', blob: { type: 'image/gif' } })).toEqual({
      tool: 'gif',
      method: 'single',
      output_format: 'gif',
    })
  })

  it('process_start：只有固定的設定選項值', () => {
    expect(processStartParams({ tool: 'gif', fps: 10, width: 480, duration: 5 })).toEqual({
      tool: 'gif',
      fps: 10,
      width: 480,
      duration: 5,
    })
    expect(processStartParams({ tool: 'trim', mode: 'fast' })).toEqual({ tool: 'trim', mode: 'fast' })
    expect(processStartParams({ tool: 'frame', format: 'png' })).toEqual({ tool: 'frame', format: 'png' })
  })
})

describe('rejectionsOf', () => {
  it('沒有被擋的：空陣列', () => {
    expect(rejectionsOf({ unsupported: [], oversized: [], tooMany: false }, 1)).toEqual([])
  })

  it('依原因回報數量', () => {
    expect(rejectionsOf({ unsupported: ['a.png'], oversized: ['b.mp4', 'c.mp4'], tooMany: false }, 3)).toEqual([
      { reason: 'unsupported', count: 1 },
      { reason: 'oversized', count: 2 },
    ])
    expect(rejectionsOf({ unsupported: [], oversized: [], tooMany: true }, 2)).toEqual([
      { reason: 'too_many_files', count: 2 },
    ])
  })
})

describe('errorParams', () => {
  it('已知的錯誤代碼照送', () => {
    expect(errorParams('gif', 'outOfMemory')).toEqual({ tool: 'gif', code: 'outOfMemory' })
  })

  it('未知的代碼一律寫成 unknown，不送任意文字', () => {
    expect(errorParams('gif', 'some secret file name.mp4')).toEqual({ tool: 'gif', code: 'unknown' })
  })
})
