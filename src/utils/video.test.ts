import { describe, expect, it } from 'vitest'
import { looksLikeOutOfMemory } from './video'

describe('looksLikeOutOfMemory', () => {
  it.each([
    'Out of memory',
    'Cannot enlarge memory arrays',
    'memory access out of bounds',
    'RangeError: Array buffer allocation failed',
    'malloc failed',
    'abort(OOM)',
    'failed to allocate 1024 bytes',
  ])('%s → true', (text) => {
    expect(looksLikeOutOfMemory(text)).toBe(true)
  })

  it.each([
    'Conversion failed!',
    'Invalid data found when processing input',
    'No such file or directory: /work/room.mp4',
    'zoom filter error',
    'called FFmpeg.terminate()',
    '',
  ])('%s → false', (text) => {
    expect(looksLikeOutOfMemory(text)).toBe(false)
  })
})
