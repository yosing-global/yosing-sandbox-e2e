import { randomInt } from "node:crypto";

// テストのデータ（ユーザーはテストごとに画面から新規登録して作る。テストどうしで共有しない）
//   作ったユーザーはテストの中では消さない。溜まったものは api の CI の cleanup で消す
//   cleanup は LOGIN_ID_PREFIX でテストのユーザーを見分けるため、接頭辞を変えるときは api の側もそろえる

export const LOGIN_ID_PREFIX = "e2e_dummy_";

// 本物でないと分かるように dummy を含める（api の規則：表示できる ASCII で 12〜64 文字）
export const TEST_PASSWORD = "e2e-dummy-Passw0rd!";

const TIME_LENGTH = 9;
const RANDOM_LENGTH = 6;

/**
 * ログイン ID：接頭辞 ＋ 時刻（36進数で9文字）＋ 乱数（36進数で6文字）＝25文字
 * 小文字・数字・_ だけ（api の規則：[a-z0-9_-]{3,32}）
 * テストごとの fixture の中で作る（ファイルの読み込み時や beforeAll では作らない）
 */
export function createLoginId(
  nowMs: number = Date.now(),
  random: (max: number) => number = randomInt,
): string {
  const time = nowMs.toString(36).padStart(TIME_LENGTH, "0");
  const rand = random(36 ** RANDOM_LENGTH)
    .toString(36)
    .padStart(RANDOM_LENGTH, "0");
  return `${LOGIN_ID_PREFIX}${time}${rand}`;
}
