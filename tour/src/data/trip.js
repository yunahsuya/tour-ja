/** @typedef {{ label: string, href: string }} TripLink */
/** @typedef {{ type: 'stay'|'block'|'activity', time?: string, title: string, detail?: string, mapUrl?: string, links?: TripLink[], emphasis?: 'question'|'alert'|'booking', regionTag?: string, imageIds?: string[] }} TripItem */
/** @typedef {{ id: string, label: string, subtitle?: string, items: TripItem[] }} TripDay */

const HOTEL_NAME = '加賀寶泉御宿野乃金澤天然溫泉飯店'
const HOTEL_MAP = 'https://maps.app.goo.gl/25p5XdxBpxAv3FYZ8?g_st=il'
const KUROBE_MAP = 'https://maps.app.goo.gl/pxaLpZWurzBADvHWA?g_st=il'

/** 整趟旅程共用：可放圖片＋選填雲端連結（預設種子，載入後可自行編輯／刪除） */
export const tripDriveLinks = [
  {
    id: 'drive-album-flight',
    label: '機票',
    href: 'https://drive.google.com/drive/folders/1HBqZNNU6W-Y2jYHuce0l5Hqup6QylDqJ',
    from: 'Google Drive',
  },
  {
    id: 'drive-album-entry',
    label: '入境',
    href: '',
    from: '本機圖片',
  },
  {
    id: 'drive-album-stay',
    label: '住宿',
    href: 'https://drive.google.com/drive/folders/1X0a38GZxkc0ZXJnVwLQ7elinHshHlDB2',
    from: 'Google Drive',
  },
  {
    id: 'drive-album-ticket',
    label: '票券',
    href: 'https://drive.google.com/drive/folders/13WZA2Nhrd0ms3bnN3WkyVxz1cLmpX-ZQ',
    from: 'Google Drive',
  },
]

/** @type {{ id: string, name: string, flag: string, code: string, days: TripDay[] }[]} */
export const regions = [
  {
    id: 'taiwan',
    name: '台灣（桃園出發／返抵）',
    flag: '🇹🇼',
    code: 'TW',
    days: [
      {
        id: '2026-10-29-out',
        label: '10/29（四）',
        subtitle: '出發往小松',
        items: [
          {
            type: 'activity',
            time: '11:50',
            title: '虎航：台北 → 小松',
            detail: '桃園第一航廈報到／候機／起飛',
            emphasis: 'booking',
          },
        ],
      },
      {
        id: '2026-10-31-ret',
        label: '10/31（六）',
        subtitle: '返抵台灣',
        items: [
          {
            type: 'activity',
            time: '14:25',
            title: '抵達台北（第二航廈）',
            detail: '長榮 小松 → 台北 · 入境、出關、領行李',
          },
        ],
      },
    ],
  },
  {
    id: 'japan',
    name: '日本（金澤／小松）',
    flag: '🇯🇵',
    code: 'JP',
    days: [
      {
        id: '2026-10-29',
        label: '10/29（四）',
        subtitle: '抵達小松 → 金澤',
        items: [
          {
            type: 'stay',
            title: HOTEL_NAME,
            detail: '住宿（10/29–10/31）',
            mapUrl: HOTEL_MAP,
          },
          {
            type: 'activity',
            time: '15:35',
            title: '抵達小松機場',
            detail: '虎航 台北 → 小松 · 出關、領行李',
          },
          {
            type: 'activity',
            title: '前往金澤入住',
            detail: HOTEL_NAME,
            mapUrl: HOTEL_MAP,
          },
        ],
      },
      {
        id: '2026-10-30',
        label: '10/30（五）',
        subtitle: '黑部峽谷觀光火車',
        items: [
          {
            type: 'stay',
            title: HOTEL_NAME,
            detail: '住宿',
            mapUrl: HOTEL_MAP,
          },
          {
            type: 'activity',
            title: '黑部峽谷觀光火車',
            detail: '黒部峡谷トロッコ電車',
            mapUrl: KUROBE_MAP,
            emphasis: 'booking',
          },
          {
            type: 'activity',
            title: '返回金澤住宿',
            detail: HOTEL_NAME,
            mapUrl: HOTEL_MAP,
          },
        ],
      },
      {
        id: '2026-10-31',
        label: '10/31（六）',
        subtitle: '退房 · 小松返台',
        items: [
          {
            type: 'stay',
            title: HOTEL_NAME,
            detail: '退房、前往小松機場',
            mapUrl: HOTEL_MAP,
          },
          {
            type: 'activity',
            time: '11:45',
            title: '長榮：小松 → 台北',
            detail: '報到、候機、起飛',
            emphasis: 'booking',
          },
        ],
      },
    ],
  },
]

/** 同日多段 id 後綴時的排序（數字愈大愈晚） */
const DAY_ID_SUFFIX_ORDER = { out: 0, am: 1, ret: 20 }

/**
 * @param {string} dayId
 * @returns {[number, number, string]}
 */
function chronTupleForDayId(dayId) {
  const id = String(dayId)
  const m = id.match(/^(\d{4})-(\d{2})-(\d{2})(?:-([a-z0-9]+))?$/i)
  if (!m) return [0, 0, id]
  const n =
    parseInt(m[1], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[3], 10)
  const suf = (m[4] ?? '').toLowerCase()
  const ord = DAY_ID_SUFFIX_ORDER[suf] ?? (suf ? 50 : 10)
  return [n, ord, id]
}

/**
 * @param {typeof regions} [data]
 */
export function flattenDays(data = regions) {
  const pairs = data.flatMap((r) => r.days.map((d) => ({ region: r, day: d })))
  pairs.sort((a, b) => {
    const [na, oa, ia] = chronTupleForDayId(a.day.id)
    const [nb, ob, ib] = chronTupleForDayId(b.day.id)
    if (na !== nb) return na - nb
    if (oa !== ob) return oa - ob
    return ia.localeCompare(ib)
  })
  return pairs
}
