import { useState } from 'react'
import { trackSaveResult, trackShareFailure, type Tool } from '../analyticsEvents'
import { useI18n } from '../i18n'
import { canShareFiles, shareFiles, toFiles, type NamedBlob } from '../utils/share'
import { downloadBlob } from '../utils/video'

interface Props {
  tool: Tool
  item: NamedBlob
}

/**
 * 結果區右上角的按鈕：「分享」（支援時才顯示）與「下載」。
 * 手機（尤其是 iPhone）下載的檔案只會進「檔案 App」，要用分享選單才進得了相簿
 */
export default function ResultActions({ tool, item }: Props) {
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
          className="primary"
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
