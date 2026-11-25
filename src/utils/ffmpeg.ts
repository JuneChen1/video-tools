import { FFmpeg, FFFSType } from '@ffmpeg/ffmpeg'
import { MEMORY_FALLBACK_MAX_BYTES } from './limits'
import { extensionOf, looksLikeOutOfMemory, VideoError } from './video'

/**
 * ffmpeg.wasm（單執行緒版）的執行引擎。
 * - @ffmpeg/ffmpeg 自己會開一個 Web Worker 跑 ffmpeg，主執行緒不會被卡住
 * - 核心（約 31 MB）由本站提供（見 scripts/copy-ffmpeg.mjs），只在使用者真正要處理時才下載，下載有進度
 * - 每次處理完就結束 Worker：wasm 記憶體只會長不會縮，不結束的話手機上第二次處理容易爆記憶體。
 *   核心檔案的 blob 網址會保留，下一次不必重新下載，只需重新編譯（約一兩秒）
 */

const BASE = import.meta.env.BASE_URL
const CORE_JS = `${BASE}ffmpeg/ffmpeg-core.js`
const CORE_WASM = `${BASE}ffmpeg/ffmpeg-core.wasm`
/** 伺服器有壓縮傳輸、拿不到原始大小時，用這個估算下載進度（ffmpeg-core.wasm 0.12.10 的實際大小） */
const WASM_BYTES = 32_232_419

export type Stage = 'download' | 'init' | 'run'

export interface JobProgress {
  stage: Stage
  /** 0–1；未知時為 null */
  ratio: number | null
}

export const abortError = () => new DOMException('Aborted', 'AbortError')
export const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

interface CoreUrls {
  coreURL: string
  wasmURL: string
}

let coreUrls: Promise<CoreUrls> | null = null

/** 下載並回報進度。伺服器若有壓縮傳輸，content-length 是壓縮後大小，讀到的卻是解壓後的位元組，所以改用已知大小估算 */
async function download(
  url: string,
  mime: string,
  fallbackBytes: number,
  onRatio: (ratio: number) => void,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(url, { signal })
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
  const length = Number(response.headers.get('content-length'))
  const total = !response.headers.get('content-encoding') && length > 0 ? length : fallbackBytes
  // 資料流經計數器只回報進度，不在 JS 裡留一份：交給 Response.blob() 由瀏覽器自己收成 Blob，
  // 避免「先把 31 MB 存進陣列、再複製成 Blob」讓記憶體峰值加倍（手機上很吃緊）
  let received = 0
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.length
      onRatio(Math.min(received / total, 0.99))
      controller.enqueue(chunk)
    },
  })
  const body = await new Response(response.body.pipeThrough(counter)).blob()
  onRatio(1)
  // 重新包一層只為了指定 MIME type（不會複製資料）
  return URL.createObjectURL(new Blob([body], { type: mime }))
}

function loadCoreUrls(onProgress: (p: JobProgress) => void, signal: AbortSignal): Promise<CoreUrls> {
  coreUrls ??= (async () => {
    const report = (ratio: number) => onProgress({ stage: 'download', ratio })
    report(0)
    const coreURL = await download(CORE_JS, 'text/javascript', 120_000, () => {}, signal)
    const wasmURL = await download(CORE_WASM, 'application/wasm', WASM_BYTES, report, signal)
    return { coreURL, wasmURL }
  })().catch((error) => {
    coreUrls = null // 失敗或被取消時，下次重新下載
    throw error
  })
  return coreUrls
}

function toVideoError(error: unknown): VideoError {
  if (error instanceof VideoError) return error
  const text = String(error instanceof Error ? error.message : error)
  return looksLikeOutOfMemory(text)
    ? new VideoError('outOfMemory')
    : new VideoError('processFailed')
}

export interface JobOptions {
  file: File
  /** 依輸入、輸出檔名組出 ffmpeg 指令列 */
  buildArgs: (input: string, output: string) => string[]
  outputExt: string
  outputMime: string
  /** 已知輸出長度（秒）時，用已輸出的時間算進度，比 ffmpeg 自己回報的比例準（例如只轉一小段時） */
  expectedSeconds?: number
  onProgress: (progress: JobProgress) => void
  signal: AbortSignal
}

/** 執行一次處理，回傳輸出檔案。被取消時丟出 AbortError，其他失敗丟出 VideoError */
export async function runVideoJob(options: JobOptions): Promise<Blob> {
  const { file, buildArgs, outputExt, outputMime, expectedSeconds, onProgress, signal } = options
  if (signal.aborted) throw abortError()

  let urls: CoreUrls
  try {
    urls = await loadCoreUrls(onProgress, signal)
  } catch (error) {
    if (signal.aborted || isAbort(error)) throw abortError()
    throw new VideoError('engineLoadFailed')
  }
  if (signal.aborted) throw abortError()

  onProgress({ stage: 'init', ratio: null })
  const ffmpeg = new FFmpeg()
  const onAbort = () => ffmpeg.terminate()
  signal.addEventListener('abort', onAbort)

  try {
    try {
      await ffmpeg.load(urls)
    } catch (error) {
      if (signal.aborted) throw abortError()
      throw error instanceof Error && looksLikeOutOfMemory(error.message)
        ? new VideoError('outOfMemory')
        : new VideoError('engineLoadFailed')
    }

    let last = 0
    ffmpeg.on('progress', ({ progress, time }) => {
      const raw = expectedSeconds ? time / 1_000_000 / expectedSeconds : progress
      // 進度只增不減，也不超過 99%（真正完成才顯示 100%）
      last = Math.max(last, Math.min(Number.isFinite(raw) ? raw : 0, 0.99))
      onProgress({ stage: 'run', ratio: last })
    })
    onProgress({ stage: 'run', ratio: 0 })

    // 輸入檔名固定成 input.<副檔名>，避免檔名裡的特殊字元干擾指令列
    const ext = extensionOf(file.name) || 'mp4'
    const inputName = `input.${ext}`
    const output = `output.${outputExt}`

    // 優先用 WORKERFS 直接掛載檔案：ffmpeg 讀取時才從 File 取資料，不必先把整個影片複製進 wasm 記憶體
    let inputPath = `/work/${inputName}`
    let mounted = false
    try {
      await ffmpeg.createDir('/work')
      mounted = await ffmpeg.mount(
        FFFSType.WORKERFS,
        { files: [new File([file], inputName, { type: file.type })] },
        '/work',
      )
    } catch {
      mounted = false
    }
    if (import.meta.env.DEV) console.info(`[ffmpeg] input via ${mounted ? 'WORKERFS' : 'memory copy'}`)
    if (!mounted) {
      // 退路要把整個檔案讀進記憶體，大檔案一定爆，所以直接回報記憶體不足，不要硬試
      if (file.size > MEMORY_FALLBACK_MAX_BYTES) throw new VideoError('outOfMemory')
      inputPath = inputName
      await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()))
    }

    const code = await ffmpeg.exec(buildArgs(inputPath, output))
    if (code !== 0) throw new VideoError('processFailed')

    const data = await ffmpeg.readFile(output)
    if (typeof data === 'string' || data.length === 0) throw new VideoError('processFailed')
    onProgress({ stage: 'run', ratio: 1 })
    return new Blob([data as Uint8Array<ArrayBuffer>], { type: outputMime })
  } catch (error) {
    if (signal.aborted) throw abortError()
    throw toVideoError(error)
  } finally {
    signal.removeEventListener('abort', onAbort)
    ffmpeg.terminate()
  }
}
