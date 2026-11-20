import { useCallback, useState } from 'react'
import AnalyticsConsent from './components/AnalyticsConsent'
import GifTab from './features/GifTab'
import FrameTab from './features/FrameTab'
import TrimTab from './features/TrimTab'
import { useI18n, type Lang } from './i18n'
import type { Tool } from './analyticsEvents'
import './App.css'

const TAB_IDS = ['gif', 'trim', 'frame'] as const satisfies readonly Tool[]
type TabId = (typeof TAB_IDS)[number]

// 語言名稱固定用該語言自己的寫法，不隨介面語言變動
const LANGS: { id: Lang; label: string; htmlLang: string }[] = [
  { id: 'zh', label: '中文', htmlLang: 'zh-Hant' },
  { id: 'en', label: 'English', htmlLang: 'en' },
  { id: 'ja', label: '日本語', htmlLang: 'ja' },
]

function App() {
  const { lang, m, setLang } = useI18n()
  const [tab, setTab] = useState<TabId>('gif')
  // 哪個分頁正在處理影片。ffmpeg 一次只跑一個，另一個分頁要等它結束才能開始
  const [busyTool, setBusyTool] = useState<Tool | null>(null)
  const setGifBusy = useCallback((busy: boolean) => setBusyTool(busy ? 'gif' : null), [])
  const setTrimBusy = useCallback((busy: boolean) => setBusyTool(busy ? 'trim' : null), [])

  return (
    <main className="app">
      <header className="app-head">
        <h1>{m.siteTitle}</h1>
        <select
          className="lang-select"
          value={lang}
          aria-label={m.langSwitchLabel}
          onChange={(e) => setLang(e.target.value as Lang)}
        >
          {/* 目前的語言只在收合時顯示，展開的清單只列其他語言 */}
          {LANGS.map((l) => (
            <option key={l.id} value={l.id} lang={l.htmlLang} hidden={l.id === lang}>
              {l.label}
            </option>
          ))}
        </select>
      </header>

      <p className="hint privacy">{m.privacy}</p>

      <nav className="tabs" role="tablist">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {m.tabs[id]}
          </button>
        ))}
      </nav>

      {/* 分頁都保持掛載，切換時不會丟失已選的影片與處理中的進度 */}
      <div hidden={tab !== 'gif'}>
        <GifTab otherBusy={busyTool === 'trim'} setBusy={setGifBusy} />
      </div>
      <div hidden={tab !== 'trim'}>
        <TrimTab otherBusy={busyTool === 'gif'} setBusy={setTrimBusy} />
      </div>
      {/* 擷取畫面用瀏覽器本身的影片播放，不經過 ffmpeg，所以不受「一次只跑一個」的限制 */}
      <div hidden={tab !== 'frame'}>
        <FrameTab />
      </div>

      <AnalyticsConsent />
    </main>
  )
}

export default App
