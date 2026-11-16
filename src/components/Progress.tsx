import { useI18n } from '../i18n'
import type { JobProgress } from '../utils/ffmpeg'

/** 處理進度：一條細線加等寬數字。下載引擎、啟動引擎、處理影片三個階段各有說明 */
export default function Progress({ progress }: { progress: JobProgress }) {
  const { m } = useI18n()
  const label = {
    download: m.engine.downloading,
    init: m.engine.initializing,
    run: m.engine.running,
  }[progress.stage]
  const percent = progress.ratio === null ? null : Math.round(progress.ratio * 100)

  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuenow={percent ?? undefined} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-head">
        <span>{label}</span>
        {percent !== null && <span className="num">{percent}%</span>}
      </div>
      <div className="progress-line">
        <span style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
  )
}
