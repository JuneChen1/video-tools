import { useRef, useState } from 'react'
import { trackRejections, type Tool } from '../analyticsEvents'
import { useI18n } from '../i18n'
import { MAX_FILE_MB } from '../utils/limits'
import { ACCEPT_ATTR, selectFiles } from '../utils/selectFiles'

interface Props {
  /** 哪個工具的上傳區，回報統計用 */
  tool: Tool
  label: string
  /** 通過檢查（是影片、沒超過大小上限）的影片；一次只收一部 */
  onFile: (file: File) => void
}

export default function Dropzone({ tool, label, onFile }: Props) {
  const { m } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState<string[]>([])
  const [oversized, setOversized] = useState<string[]>([])
  const [tooMany, setTooMany] = useState(false)

  // 在載入 ffmpeg 之前就檢查：不是影片、超過大小上限的檔案，不會進到處理流程
  function pick(list: FileList | null) {
    const dropped = Array.from(list ?? [])
    const result = selectFiles(dropped)
    trackRejections(tool, result, dropped.length)
    setRejected(result.unsupported)
    setOversized(result.oversized)
    setTooMany(result.tooMany)
    if (result.taken.length > 0) onFile(result.taken[0])
  }

  return (
    <div>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          pick(e.dataTransfer.files)
        }}
      >
        <svg
          className="dropzone-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <p>{label}</p>
        <span>{m.dropzone.hint}</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          hidden
          onChange={(e) => {
            pick(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {tooMany && <p className="error rejected">{m.dropzone.singleOnly}</p>}
      {oversized.length > 0 && (
        <p className="error rejected">
          {m.dropzone.tooBig(oversized.length, MAX_FILE_MB, oversized.join(m.listSep))}
        </p>
      )}
      {rejected.length > 0 && (
        <p className="error rejected">
          {m.dropzone.rejected(rejected.length, rejected.join(m.listSep))}
        </p>
      )}
    </div>
  )
}
