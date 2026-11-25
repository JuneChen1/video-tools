/**
 * Google Analytics（GA4）。原則：
 * - 使用者按「同意」之後才載入；拒絕或沒表態就完全不載入、不送任何資料
 * - 只在「正式版」「有衡量 ID」「使用者沒開啟瀏覽器的『不要追蹤』」時才可用，本機開發與測試不會送資料
 * - 只送頁面瀏覽與少量操作事件，**絕不帶檔名、影片內容、尺寸**，事件參數只放工具名稱、格式、設定選項這類固定的枚舉值
 * - 不啟用廣告相關功能（Google signals、廣告個人化）
 * - 使用者可以隨時撤回同意：停用收集並清掉 GA 的 cookie
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

export type EventParams = Record<string, string | number>

export interface AnalyticsDeps {
  /** 衡量 ID，格式 G-XXXXXXXXXX；沒有就不可用 */
  id?: string
  production: boolean
  /** navigator.doNotTrack，'1' 代表使用者不想被追蹤 */
  doNotTrack?: string | null
  win: Record<string, unknown> & { dataLayer?: unknown[] }
  doc: {
    head: { appendChild: (node: never) => unknown }
    createElement: (tag: 'script') => { async: boolean; src: string }
  }
  /** 撤回同意時清掉 GA 的 cookie */
  clearCookies?: (names: string[]) => void
}

export interface Analytics {
  /** 這個環境有沒有條件使用 GA（正式版、有 ID、沒開「不要追蹤」）；沒有的話連同意橫幅都不用顯示 */
  available: () => boolean
  /** 使用者同意後呼叫：載入並啟用。可重複呼叫，回傳目前是否已啟用 */
  init: () => boolean
  /** 使用者撤回同意：停止收集並清掉 cookie */
  disable: () => void
  track: (name: string, params?: EventParams) => void
}

export function isAnalyticsEnabled(
  env: Pick<AnalyticsDeps, 'id' | 'production' | 'doNotTrack'>,
): boolean {
  return env.production && /^G-[A-Z0-9]+$/.test(env.id ?? '') && env.doNotTrack !== '1'
}

export function createAnalytics(deps: AnalyticsDeps): Analytics {
  let started = false // 目前是否在收集
  let loaded = false // gtag.js 是否已載入過（撤回後再同意時不重複載入）

  // gtag.js 要求推進 dataLayer 的是 arguments 物件，不是一般陣列，所以不能用 rest 參數
  function gtag(..._args: unknown[]): void {
    ;(deps.win.dataLayer ??= []).push(arguments)
  }

  const config = () =>
    gtag('config', deps.id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    })

  return {
    available: () => isAnalyticsEnabled(deps),

    init() {
      if (!isAnalyticsEnabled(deps)) return false
      if (started) return true
      started = true
      deps.win[`ga-disable-${deps.id}`] = false
      if (loaded) {
        config()
        return true
      }
      loaded = true
      gtag('js', new Date())
      config()
      const script = deps.doc.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${deps.id}`
      deps.doc.head.appendChild(script as never)
      return true
    },

    disable() {
      started = false
      if (!deps.id) return
      // Google 官方的停用開關：設成 true 之後 gtag 不會再送任何資料
      deps.win[`ga-disable-${deps.id}`] = true
      deps.clearCookies?.(['_ga', `_ga_${deps.id.slice(2)}`])
    },

    track(name, params = {}) {
      if (!started) return
      gtag('event', name, params)
    },
  }
}

/**
 * 產生清除 cookie 用的字串。GA4 預設把 cookie 設在上層網域（例如 videotools.junenaga.com 的 cookie 會在 .junenaga.com），
 * 刪除時沒帶 domain 只會刪到 host-only 的那份，所以要對主機名稱的每一層都送一次過期設定
 */
export function expiredCookieStrings(names: string[], hostname: string): string[] {
  const parts = hostname.split('.')
  // host-only，加上 a.b.c → .a.b.c、.b.c（至少兩層，不嘗試 .com 這種頂級網域）
  const domains = ['']
  if (parts.length >= 2 && !/^[\d.]+$/.test(hostname) && !hostname.includes(':')) {
    for (let i = 0; i <= parts.length - 2; i++) domains.push(`; domain=.${parts.slice(i).join('.')}`)
  }
  return names.flatMap((name) =>
    domains.map((domain) => `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`),
  )
}

let instance: Analytics | null = null

function real(): Analytics {
  instance ??= createAnalytics({
    id: import.meta.env.VITE_GA_ID as string | undefined,
    production: import.meta.env.PROD,
    doNotTrack: navigator.doNotTrack,
    win: window as unknown as AnalyticsDeps['win'],
    doc: document as unknown as AnalyticsDeps['doc'],
    clearCookies: (names) => {
      for (const cookie of expiredCookieStrings(names, location.hostname)) {
        document.cookie = cookie
      }
    },
  })
  return instance
}

export const isAnalyticsAvailable = () => real().available()

/** 使用者同意之後呼叫 */
export const initAnalytics = () => real().init()

/** 使用者撤回同意之後呼叫 */
export const disableAnalytics = () => real().disable()

/** 回報一個操作事件；沒有啟用（沒同意、開發環境…）時什麼都不做，所以可以放心在任何地方呼叫 */
export const trackEvent = (name: string, params?: EventParams) => real().track(name, params)
