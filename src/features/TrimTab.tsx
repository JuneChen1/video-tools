import { useRef, useState } from 'react'
import { trackFilesAdded, trackProcessStart } from '../analyticsEvents'
import Dropzone from '../components/Dropzone'
import Progress from '../components/Progress'
import ResultActions from '../components/ResultActions'
import ShareHint from '../components/ShareHint'
import { describeError, useI18n } from '../i18n'
import {
  clampSecondsInput,
  isValidTrimRange,
  maxStartSeconds,
  maxTrimEnd,
  trimArgs,
  trimDuration,
  trimOutput,
  type TrimMode,
} from '../utils/ffmpegArgs'
import { baseName, extensionOf, formatDuration, formatSize } from '../utils/video'
import { useObjectUrl, useVideoJob } from './hooks'

const MODES: TrimMode[] = ['fast', 'precise']

interface Props {
  /** 另一個分頁正在處理，現在不能開始 */
  otherBusy: boolean
  setBusy: (busy: boolean) => void
}

export default function TrimTab({ otherBusy, setBusy }: Props) {
  const { m } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [start, setStart] = useState('0')
  // 空字串代表「到影片結尾」；讀到影片長度後會自動填入
  const [end, setEnd] = useState('')
  // 終點是程式自動填入、使用者沒動過：實際處理時視為「到影片結尾」，不然無條件捨去到 0.1 秒的終點會切掉尾端最多 0.1 秒
  const [endAuto, setEndAuto] = useState(false)
  const [mode, setMode] = useState<TrimMode>('fast')
  // 影片長度由瀏覽器讀取；瀏覽器解不開的影片（例如某些 MKV）讀不到，這時終點可以留空（到結尾）
  const [videoSeconds, setVideoSeconds] = useState<number | null>(null)
  // 這一次結果的檔名（副檔名依當時選的方式決定，之後改選項不該影響已產生的結果）
  const [outputName, setOutputName] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const job = useVideoJob('trim', setBusy)
  const sourceUrl = useObjectUrl(file)
  const resultUrl = useObjectUrl(job.result)

  const running = job.progress !== null
  const startSeconds = start.trim() === '' ? 0 : Number(start)
  const endSeconds = endAuto || end.trim() === '' ? null : Number(end)
  const valid = isValidTrimRange(startSeconds, endSeconds)

  function startJob() {
    if (!file || !valid) return
    const output = trimOutput(extensionOf(file.name), mode)
    const duration = trimDuration(startSeconds, endSeconds)
    setOutputName(`${baseName(file.name)}_trimmed.${output.ext}`)
    trackProcessStart({ tool: 'trim', mode })
    void job.run({
      file,
      buildArgs: (input, out) => trimArgs(input, out, { mode, start: startSeconds, end: endSeconds }),
      outputExt: output.ext,
      outputMime: output.mime,
      // 已知片段長度時用已輸出的時間算進度；到結尾且知道影片長度時，用「影片長度 - 起點」
      expectedSeconds: duration ?? (videoSeconds !== null ? Math.max(0.1, videoSeconds - startSeconds) : undefined),
    })
  }

  function setCurrentTime(set: (value: string) => void, max: number | null) {
    const now = Math.round((videoRef.current?.currentTime ?? 0) * 10) / 10
    set(clampSecondsInput(String(now), max))
  }

  return (
    <div className="panel">
      {!file ? (
        <>
          <Dropzone
            tool="trim"
            label={m.trim.dropLabel}
            onFile={(picked) => {
              trackFilesAdded('trim', picked)
              job.reset()
              setVideoSeconds(null)
              setStart('0')
              setEnd('')
              setEndAuto(false)
              setFile(picked)
            }}
          />
          <p className="hint">{m.engine.note(31)}</p>
        </>
      ) : (
        <section className="card">
          <div className="card-head">
            <h2>
              {m.trim.previewTitle}{' '}
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
                setStart((old) => clampSecondsInput(old, maxStartSeconds(known)))
                // 終點預設是影片結尾（顯示捨去後的數字，但視為沒動過）；已經有填的就只做範圍整理
                if (end === '' && known !== null) {
                  setEnd(String(maxTrimEnd(known)))
                  setEndAuto(true)
                } else {
                  setEnd((old) => clampSecondsInput(old, maxTrimEnd(known)))
                }
              }}
            />
          )}
        </section>
      )}

      {file && (
        <section className="card">
          <h2>{m.trim.settingsTitle}</h2>
          <div className="options">
            <div className="field">
              <label htmlFor="trim-start">{m.trim.startLabel}</label>
              <input
                id="trim-start"
                type="number"
                min={0}
                max={maxStartSeconds(videoSeconds) ?? undefined}
                step={0.1}
                inputMode="decimal"
                value={start}
                disabled={running}
                onChange={(e) => setStart(clampSecondsInput(e.target.value, maxStartSeconds(videoSeconds)))}
              />
              <button
                disabled={running}
                onClick={() => setCurrentTime(setStart, maxStartSeconds(videoSeconds))}
              >
                {m.trim.useCurrent}
              </button>
            </div>
            <div className="field">
              <label htmlFor="trim-end">{m.trim.endLabel}</label>
              <input
                id="trim-end"
                type="number"
                min={0}
                max={maxTrimEnd(videoSeconds) ?? undefined}
                step={0.1}
                inputMode="decimal"
                value={end}
                disabled={running}
                onChange={(e) => {
                  setEndAuto(false)
                  setEnd(clampSecondsInput(e.target.value, maxTrimEnd(videoSeconds)))
                }}
              />
              <button
                disabled={running}
                onClick={() => {
                  setEndAuto(false)
                  setCurrentTime(setEnd, maxTrimEnd(videoSeconds))
                }}
              >
                {m.trim.useCurrent}
              </button>
            </div>
            <div className="field">
              <span>{m.trim.modeLabel}</span>
              <div className="segmented">
                {MODES.map((id) => (
                  <button
                    key={id}
                    className={mode === id ? 'active' : ''}
                    disabled={running}
                    onClick={() => setMode(id)}
                  >
                    {m.trim.mode[id]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="hint">{mode === 'fast' ? m.trim.fastNote : m.trim.preciseNote}</p>

          <div className="run-row">
            {running ? (
              <button onClick={job.cancel}>{m.common.cancel}</button>
            ) : (
              <button className="primary" disabled={otherBusy || !valid} onClick={startJob}>
                {m.trim.start}
              </button>
            )}
            {!valid && !running && <span className="error">{m.trim.rangeInvalid}</span>}
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
              <h2>{m.trim.resultTitle}</h2>
              <ShareHint items={[{ name: outputName, blob: job.result }]} />
            </div>
            <ResultActions tool="trim" item={{ name: outputName, blob: job.result }} />
          </div>
          <p className="result-size">
            <span>{m.trim.sizeLabel}</span>
            <span className="num">{formatSize(job.result.size)}</span>
          </p>
          <video className="video-preview" src={resultUrl} controls playsInline />
        </section>
      )}
    </div>
  )
}
