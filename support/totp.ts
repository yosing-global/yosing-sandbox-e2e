import { generateSync } from "otplib";

// TOTP のコードを、認証アプリの代わりに計算する
//   決まりは api の TotpParameters と同じ（SHA1・6桁・30秒）
//   キー・コードは秘密の値。ログ・例外のメッセージに入れない

const PERIOD_MS = 30_000;
const DIGITS = 6;
// api が許す前後のずれ（ステップの数。api の TotpVerifier.ALLOWED_STEP_DRIFT）
const ALLOWED_STEP_DRIFT = 1;
// ステップの残りがこれより短ければ、次のステップを待ってから計算する
//   入力して送るまでの間にステップが変わると、計算したコードが前のステップのものになるため
export const MIN_REMAINING_MS = 2_000;

/** 時計（単体テストで差し替える） */
export type Clock = {
  now(): number;
  sleep(ms: number): Promise<void>;
};

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** 画面に出たセットアップキー（4文字ずつ空白で区切る）を、計算に使う形（Base32）にする */
export function normalizeSetupKey(displayed: string): string {
  const key = displayed.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z2-7]+=*$/.test(key)) {
    // キーの値はメッセージに入れない
    throw new Error("セットアップキーが Base32 の形ではない");
  }
  return key;
}

/** 時刻（ミリ秒）が属するステップ */
export function stepAt(epochMs: number): number {
  return Math.floor(epochMs / PERIOD_MS);
}

/** ステップのコード */
export function codeAt(secret: string, step: number): string {
  return generateSync({
    secret,
    algorithm: "sha1",
    digits: DIGITS,
    period: PERIOD_MS / 1000,
    epoch: step * (PERIOD_MS / 1000),
  });
}

/**
 * コードを計算してよくなるまでの待ち時間（ミリ秒）
 * - 前回使ったステップと同じか前なら、その次のステップの始まりまで待つ（一度使ったコードは使えないため）
 * - 今のステップの残りが MIN_REMAINING_MS より短ければ、次のステップの始まりまで待つ
 */
export function msUntilUsable(nowMs: number, lastUsedStep?: number): number {
  const current = stepAt(nowMs);
  let target = current;
  if (lastUsedStep !== undefined && target <= lastUsedStep) {
    target = lastUsedStep + 1;
  }
  if (target === current && (current + 1) * PERIOD_MS - nowMs < MIN_REMAINING_MS) {
    target = current + 1;
  }
  return target === current ? 0 : target * PERIOD_MS - nowMs;
}

/**
 * 認証アプリの代わり。1人のユーザーに1つ作り、登録とログインで使い回す
 * （前回使ったステップを覚えておき、同じステップのコードを2回出さない）
 */
export class Authenticator {
  private readonly secret: string;
  private lastUsedStep: number | undefined;

  constructor(
    setupKey: string,
    private readonly clock: Clock = systemClock,
  ) {
    this.secret = normalizeSetupKey(setupKey);
  }

  /** 送ってよいコード。必要なら次のステップまで待つ（最大30秒ほど） */
  async nextCode(): Promise<string> {
    const wait = msUntilUsable(this.clock.now(), this.lastUsedStep);
    if (wait > 0) {
      await this.clock.sleep(wait);
    }
    const step = stepAt(this.clock.now());
    this.lastUsedStep = step;
    return codeAt(this.secret, step);
  }

  /** 違うコード（api が許す前後のずれの、どのステップのコードとも一致しない6桁） */
  wrongCode(): string {
    const current = stepAt(this.clock.now());
    const valid = new Set<string>();
    // 送るまでにステップが変わってもよいように、1つ先まで含める
    for (let offset = -ALLOWED_STEP_DRIFT; offset <= ALLOWED_STEP_DRIFT + 1; offset++) {
      valid.add(codeAt(this.secret, current + offset));
    }
    for (let digit = 0; digit <= 9; digit++) {
      const candidate = String(digit).repeat(DIGITS);
      if (!valid.has(candidate)) {
        return candidate;
      }
    }
    // 10通りの候補は、4つのコードで全部は埋まらない
    throw new Error("違うコードを作れない");
  }
}
