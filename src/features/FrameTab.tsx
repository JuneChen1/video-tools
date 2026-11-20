import { useEffect, useRef, useState } from 'react'
import { trackFilesAdded, trackProcessStart } from '../analyticsEvents'
import Dropzone from '../components/Dropzone'
import ResultActions from '../components/ResultActions'
import ShareHint from '../components/ShareHint'
import { useI18n } from '../i18n'
import { baseName, formatSize } from '../utils/video'
import { useObjectUrl } from './hooks'

type Format = 'png' | 'jpeg'

const FORMATS: Format[] = ['png', 'jpeg']
const MIME: Record<Format, string> = { png: 'image/png', jpeg: 'image/jpeg' }
const EXT: Record<Format, string> = { png: 'png', jpeg: 'jpg' }
const JPEG_QUALITY = 0.92
/** 逐格微調的步距（秒） */
const STEP_SECONDS = 0.1
/** 最多保留幾張：每張都留在記憶體裡（4K 的 PNG 可能超過 10 MB） */
const MAX_CAPTURES = 20

interface Capture {
  id: number
  name: string
  blob: Blob
  url: string
  time: number
  width: number
  height: number
}

/**
 * 擷取畫面：用 <video> 播放到想要的位置，再畫到 canvas 存成圖片。
 * 完全在瀏覽器內完成，不需要載入 ffmpeg；缺點是只能擷取瀏覽器本身解得開的影片
 */
export default function FrameTab() {
  const { m } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<Format>('png')
  const [time, setTime] = useState(0)
  const [unplayable, setUnplayable] = useState(false)
  const [captures, setCaptures] = useState<Capture[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const nextId = useRef(1)
  // 目前畫面上每一張的網址，離開頁面時一併釋放
  const urlsRef = useRef<string[]>([])
  const sourceUrl = useObjectUrl(file)

  useEffect(() => () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u)), [])

  function release(items: Capture[]) {
    for (const item of items) {
      URL.revokeObjectURL(item.url)
      urlsRef.current = urlsRef.current.filter((u) => u !== item.url)
    }
  }

  function clearAll() {
    release(captures)
    setCaptures([])
  }

  async function capture() {
    const video = videoRef.current
    if (!file || !video || video.videoWidth === 0 || captures.length >= MAX_CAPTURES) return
    // 剛拖曳過進度條時，等畫面真的換好再擷取，不然會拍到上一個位置
    if (video.seeking) await new Promise((r) => video.addEventListener('seeked', r, { once: true }))
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const at = video.currentTime
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, MIME[format], format === 'jpeg' ? JPEG_QUALITY : undefined),
    )
    if (!blob) return
    trackProcessStart({ tool: 'frame', format })
    const url = URL.createObjectURL(blob)
    urlsRef.current.push(url)
    const id = nextId.current++
    setCaptures((old) => [
      ...old,
      {
        id,
        name: `${baseName(file.name)}_${at.toFixed(1)}s.${EXT[format]}`,
        blob,
        url,
        time: at,
        width: canvas.width,
        height: canvas.height,
      },
    ])
  }

  function step(delta: number) {
    const video = videoRef.current
    if (!video) return
    video.pause()
    const end = Number.isFinite(video.duration) ? video.duration : Infinity
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), end)
  }

  const full = captures.length >= MAX_CAPTURES

  return (
    <div className="panel">
      {!file ? (
        <>
          <Dropzone
            tool="frame"
            label={m.frame.dropLabel}
            onFile={(picked) => {
              trackFilesAdded('frame', picked)
              clearAll()
              setUnplayable(false)
              setTime(0)
              setFile(picked)
            }}
          />
        </>
      ) : (
        <section className="card">
          <div className="card-head">
            <h2>
              {m.frame.previewTitle}{' '}
              <small className="num">
                {file.name} · {formatSize(file.size)}
              </small>
            </h2>
            <button
              onClick={() => {
                clearAll()
                setFile(null)
              }}
            >
              {m.common.reselect}
            </button>
          </div>
          {sourceUrl && (
            <video
              ref={videoRef}
              className="video-preview"
              src={sourceUrl}
              controls
              playsInline
              preload="auto"
              onError={() => setUnplayable(true)}
              // 有聲音但解不出畫面的影片（例如瀏覽器不支援的編碼）：寬度會是 0
              onLoadedMetadata={(e) => {
                if (e.currentTarget.videoWidth === 0) setUnplayable(true)
              }}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onSeeked={(e) => setTime(e.currentTarget.currentTime)}
            />
          )}
          {unplayable && <p className="error rejected">{m.frame.unplayable}</p>}
        </section>
      )}

      {file && !unplayable && (
        <section className="card">
          <h2>{m.frame.settingsTitle}</h2>
          <div className="options">
            <div className="field">
              <span>{m.frame.formatLabel}</span>
              <div className="segmented">
                {FORMATS.map((id) => (
                  <button key={id} className={`${format === id ? 'active' : ''} num`} onClick={() => setFormat(id)}>
                    {id === 'png' ? 'PNG' : 'JPEG'}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>{m.frame.currentTime(time)}</span>
              <div className="segmented">
                <button onClick={() => step(-STEP_SECONDS)}>{m.frame.stepBack}</button>
                <button onClick={() => step(STEP_SECONDS)}>{m.frame.stepForward}</button>
              </div>
            </div>
          </div>
          <p className="hint">{m.frame.formatNote}</p>

          <div className="run-row">
            <button className="primary" disabled={full} onClick={() => void capture()}>
              {m.frame.capture}
            </button>
            {full && <span className="hint">{m.frame.limit(MAX_CAPTURES)}</span>}
          </div>
        </section>
      )}

      {captures.length > 0 && (
        <section className="card">
          <div className="card-head">
            <div className="card-head-text">
              <h2>
                {m.frame.resultsTitle} <small className="num">{captures.length}</small>
              </h2>
              <ShareHint items={captures.map((c) => ({ name: c.name, blob: c.blob }))} />
            </div>
            <button onClick={clearAll}>{m.frame.clearAll}</button>
          </div>
          <ul className="capture-list">
            {[...captures].reverse().map((c) => (
              <li key={c.id}>
                <img src={c.url} alt={m.frame.timeLabel(c.time)} />
                <span className="capture-info">
                  <strong className="num">{m.frame.timeLabel(c.time)}</strong>
                  <span className="num">
                    {c.width}×{c.height} · {formatSize(c.blob.size)}
                  </span>
                </span>
                <span className="capture-actions">
                  <ResultActions tool="frame" item={{ name: c.name, blob: c.blob }} variant="plain" />
                  <button
                    onClick={() => {
                      release([c])
                      setCaptures((old) => old.filter((x) => x.id !== c.id))
                    }}
                  >
                    {m.frame.remove}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
