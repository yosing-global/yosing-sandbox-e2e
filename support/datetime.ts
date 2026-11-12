// 画面の日時の表示（日本時間。例：2026年11月3日 10:25）を読む
//   web の表示の作りを読み込まず、4.1 の例の形から読む（0 で埋めるかどうかは問わない）

const DISPLAY = /^(\d{4})年(\d{1,2})月(\d{1,2})日 (\d{1,2}):(\d{2})$/;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 表示を日時（ミリ秒）にする。形が違えば undefined */
export function parseJstDisplay(text: string): number | undefined {
  const match = DISPLAY.exec(text.trim());
  if (!match) {
    return undefined;
  }
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const utc = Date.UTC(year, month - 1, day, hour, minute) - JST_OFFSET_MS;
  // 13月・25時のような値は、Date.UTC が繰り上げてしまうので、戻して比べる
  const back = new Date(utc + JST_OFFSET_MS);
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day ||
    back.getUTCHours() !== hour ||
    back.getUTCMinutes() !== minute
  ) {
    return undefined;
  }
  return utc;
}

/**
 * 表示の日時（分まで）が、from〜to（ミリ秒）の間に入るか
 * 表示は分で切り捨てているため、from は分の始まりにそろえる。端末とサーバーの時計のずれを marginMs だけ許す
 */
export function isDisplayedWithin(
  text: string,
  fromMs: number,
  toMs: number,
  marginMs = 60_000,
): boolean {
  const shown = parseJstDisplay(text);
  if (shown === undefined) {
    return false;
  }
  const fromMinute = Math.floor(fromMs / 60_000) * 60_000;
  return shown >= fromMinute - marginMs && shown <= toMs + marginMs;
}
