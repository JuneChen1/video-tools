import { useRef, useState } from 'react'
import { trackFilesAdded, trackProcessStart } from '../analyticsEvents'
import Dropzone from '../components/Dropzone'
import Progress from '../components/Progress'
import ResultActions from '../components/ResultActions'
import ShareHint from '../components/ShareHint'
import { describeError, useI18n } from '../i18n'
import { clampGifRange, clampStartInput, gifArgs, maxStartSeconds } from '../utils/ffmpegArgs'
import {
  GIF_DEFAULT_DURATION,
  GIF_DEFAULT_FPS,
  GIF_DEFAULT_WIDTH,
  GIF_DURATION_CHOICES,
  GIF_FPS_CHOICES,
  GIF_WIDTH_CHOICES,
  GIF_MAX_SECONDS,
} from '../utils/limits'
import { baseName, formatDuration, formatSize } from '../utils/video'
import { useObjectUrl, useVideoJob } from './hooks'

interface Props {
  /** 另一個分頁正在處理，現在不能開始 */
  otherBusy: boolean
  setBusy: (busy: boolean) => void
}

export default function GifTab({ otherBusy, setBusy }: Props) {
  const { m } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [start, setStart] = useState('0')
  const [duration, setDuration] = useState<number>(GIF_DEFAULT_DURATION)
  const [fps, setFps] = useState<number>(GIF_DEFAULT_FPS)
  const [width, setWidth] = useState<number>(GIF_DEFAULT_WIDTH)
  // 影片長度由瀏覽器讀取；瀏覽器解不開的影片（例如某些 MKV）讀不到，這時只套用長度上限
  const [videoSeconds, setVideoSeconds] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const job = useVideoJob('gif', setBusy)
  const sourceUrl = useObjectUrl(file)
  const resultUrl = useObjectUrl(job.result)

  const running = job.progress !== null
  const outputName = file ? `${baseName(file.name)}.gif` : ''

  function startJob() {
    if (!file) return
    const range = clampGifRange(Number(start), duration, videoSeconds)
    trackProcessStart({ tool: 'gif', fps, width, duration })
    void job.run({
      file,
      buildArgs: (input, output) => gifArgs(input, output, { ...range, fps, width }),
      outputExt: 'gif',
      outputMime: 'image/gif',
      expectedSeconds: range.duration,
    })
  }

  return (
    <div className="panel">
      {!file ? (
        <>
          <Dropzone
            tool="gif"
            label={m.gif.dropLabel}
            onFile={(picked) => {
              trackFilesAdded('gif', picked)
              job.reset()
              setVideoSeconds(null)
              setStart('0')
              setFile(picked)
            }}
          />
          <p className="hint">{m.engine.note(31)}</p>
        </>
      ) : (
        <section className="card">
          <div className="card-head">
            <h2>
              {m.gif.previewTitle}{' '}
              <small className="num">
                {file.name} · {formatSize(file.size)}
                {videoSeconds !== null && ` · ${formatDuration(videoSeconds)}`}
              </small>
            </h2>
            <button
              disabled={running}
              onClick={() => {
                job.reset()
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
              preload="metadata"
              onLoadedMetadata={(e) => {
                const seconds = e.currentTarget.duration
                const known = Number.isFinite(seconds) ? seconds : null
                setVideoSeconds(known)
                setStart((old) => clampStartInput(old, known))
              }}
            />
          )}
        </section>
      )}

      {file && (
        <section className="card">
          <h2>{m.gif.settingsTitle}</h2>
          <div className="options">
            <div className="field">
              <label htmlFor="gif-start">{m.gif.startLabel}</label>
              <input
                id="gif-start"
                type="number"
                min={0}
                max={maxStartSeconds(videoSeconds) ?? undefined}
                step={0.1}
                inputMode="decimal"
                value={start}
                disabled={running}
                onChange={(e) => setStart(clampStartInput(e.target.value, videoSeconds))}
              />
              <button
                disabled={running}
                onClick={() => setStart(String(Math.round((videoRef.current?.currentTime ?? 0) * 10) / 10))}
              >
                {m.gif.useCurrent}
              </button>
            </div>
            <div className="field">
              <span>{m.gif.durationLabel}</span>
              <div className="segmented">
                {GIF_DURATION_CHOICES.map((s) => (
                  <button
                    key={s}
                    className={duration === s ? 'active' : ''}
                    disabled={running}
                    onClick={() => setDuration(s)}
                  >
                    {m.gif.durationOption(s)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>{m.gif.fpsLabel}</span>
              <div className="segmented">
                {GIF_FPS_CHOICES.map((f) => (
                  <button
                    key={f}
                    className={`${fps === f ? 'active' : ''} num`}
                    disabled={running}
                    onClick={() => setFps(f)}
                  >
                    {m.gif.fpsOption(f)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>{m.gif.widthLabel}</span>
              <div className="segmented">
                {GIF_WIDTH_CHOICES.map((w) => (
                  <button
                    key={w}
                    className={`${width === w ? 'active' : ''} num`}
                    disabled={running}
                    onClick={() => setWidth(w)}
                  >
                    {m.gif.widthOption(w)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="hint">{m.gif.sizeNote(GIF_MAX_SECONDS)}</p>
          <p className="hint">{m.gif.outputNote}</p>

          <div className="run-row">
            {running ? (
              <button onClick={job.cancel}>{m.common.cancel}</button>
            ) : (
              <button className="primary" disabled={otherBusy} onClick={startJob}>
                {m.gif.start}
              </button>
            )}
            {otherBusy && !running && <span className="hint">{m.common.busyElsewhere}</span>}
          </div>
          {job.progress && <Progress progress={job.progress} />}
          {job.error !== null && <p className="error rejected">{describeError(job.error, m)}</p>}
        </section>
      )}

      {file && job.result && resultUrl && (
        <section className="card">
          <div className="card-head">
            <div className="card-head-text">
              <h2>{m.gif.resultTitle}</h2>
              <ShareHint items={[{ name: outputName, blob: job.result }]} />
            </div>
            <ResultActions tool="gif" item={{ name: outputName, blob: job.result }} />
          </div>
          <p className="result-size">
            <span>{m.gif.sizeLabel}</span>
            <span className="num">{formatSize(job.result.size)}</span>
          </p>
          <div className="gif-result">
            <img src={resultUrl} alt={m.gif.resultAlt} />
          </div>
        </section>
      )}
    </div>
  )
}
