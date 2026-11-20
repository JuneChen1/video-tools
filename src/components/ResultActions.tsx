import { useState } from 'react'
import { trackSaveResult, trackShareFailure, type Tool } from '../analyticsEvents'
import { useI18n } from '../i18n'
import { canShareFiles, shareFiles, toFiles, type NamedBlob } from '../utils/share'
import { downloadBlob } from '../utils/video'

interface Props {
  tool: Tool
  item: NamedBlob
  /** primary：結果區右上角的實心下載按鈕（預設）；plain：清單每一列用的文字按鈕 */
  variant?: 'primary' | 'plain'
}

/**
 * 結果區右上角的按鈕：「分享」（支援時才顯示）與「下載」。
 * 手機（尤其是 iPhone）下載的檔案只會進「檔案 App」，要用分享選單才進得了相簿
 */
export default function ResultActions({ tool, item, variant = 'primary' }: Props) {
  const { m } = useI18n()
  const [failed, setFailed] = useState(false)

  const files = toFiles([item])
  const shareable = canShareFiles(files)

  async function onShare() {
    setFailed(false)
    try {
      // 使用者自己關掉分享選單（cancelled）不算「存下結果」
      if ((await shareFiles(files)) === 'shared') {
        trackSaveResult({ tool, method: 'share', blob: item.blob })
      }
    } catch {
      setFailed(true)
      trackShareFailure(tool)
    }
  }

  return (
    <div className="card-actions">
      <div className="card-actions-row">
        {shareable && <button onClick={onShare}>{m.common.share}</button>}
        <button
          className={variant === 'primary' ? 'primary' : undefined}
          onClick={() => {
            trackSaveResult({ tool, method: 'single', blob: item.blob })
            downloadBlob(item.blob, item.name)
          }}
        >
          {m.common.download}
        </button>
      </div>
      {failed && <p className="error">{m.common.shareFailed}</p>}
    </div>
  )
}
