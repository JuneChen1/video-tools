import AnalyticsConsent from './components/AnalyticsConsent'
import GifTab from './features/GifTab'
import { useI18n, type Lang } from './i18n'
import './App.css'

// 語言名稱固定用該語言自己的寫法，不隨介面語言變動
const LANGS: { id: Lang; label: string; htmlLang: string }[] = [
  { id: 'zh', label: '中文', htmlLang: 'zh-Hant' },
  { id: 'en', label: 'English', htmlLang: 'en' },
  { id: 'ja', label: '日本語', htmlLang: 'ja' },
]

function App() {
  const { lang, m, setLang } = useI18n()

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

      {/* 目前只有「影片轉 GIF」一個工具，所以沒有分頁；之後新增工具時再加回 .tabs（樣式已保留） */}
      <GifTab />

      <AnalyticsConsent />
    </main>
  )
}

export default App
