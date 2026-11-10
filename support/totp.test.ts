import { expect, test } from "@playwright/test";
import {
  Authenticator,
  codeAt,
  MIN_REMAINING_MS,
  msUntilUsable,
  normalizeSetupKey,
  stepAt,
  type Clock,
} from "./totp";

// RFC 6238 の付録 B のキー（ASCII の "12345678901234567890" を Base32 にしたもの）
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

/** 時計の差し替え：sleep は待たずに時刻を進める */
function fakeClock(startMs: number): Clock & { slept: number[] } {
  let now = startMs;
  const slept: number[] = [];
  return {
    slept,
    now: () => now,
    sleep: (ms) => {
      slept.push(ms);
      now += ms;
      return Promise.resolve();
    },
  };
}

test.describe("codeAt", () => {
  // RFC 6238 のテストベクター（SHA1・8桁）の下6桁と一致すること
  for (const [epochSeconds, expected] of [
    [59, "287082"],
    [1111111109, "081804"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ] as const) {
    test(`時刻 ${epochSeconds} 秒のコードが ${expected} になる`, () => {
      expect(codeAt(RFC_SECRET, stepAt(epochSeconds * 1000))).toBe(expected);
    });
  }
});

test.describe("normalizeSetupKey", () => {
  // 画面の表示（4文字ずつ空白で区切る）から、空白を除いた Base32 にすること
  test("空白を除き、大文字にする", () => {
    expect(normalizeSetupKey("gezd GNBV GY3T\nQOJQ")).toBe("GEZDGNBVGY3TQOJQ");
  });

  // Base32 で使わない文字があれば、キーを読み違えているので止めること
  test("Base32 でない文字があれば例外", () => {
    expect(() => normalizeSetupKey("ABC1")).toThrow("セットアップキーが Base32 の形ではない");
  });
});

test.describe("msUntilUsable", () => {
  const stepStart = 1_000 * 30_000;

  // 初めて使うときは、残りが十分なら待たないこと
  test("初回・残りが十分なら 0", () => {
    expect(msUntilUsable(stepStart + 10_000)).toBe(0);
  });

  // 残りがちょうど MIN_REMAINING_MS なら待たないこと（境界）
  test("残りがちょうど下限なら 0", () => {
    expect(msUntilUsable(stepStart + 30_000 - MIN_REMAINING_MS)).toBe(0);
  });

  // 残りが MIN_REMAINING_MS より短ければ、次のステップの始まりまで待つこと
  test("残りが下限より短ければ、次のステップまで待つ", () => {
    expect(msUntilUsable(stepStart + 30_000 - MIN_REMAINING_MS + 1)).toBe(MIN_REMAINING_MS - 1);
  });

  // 前回と同じステップなら、次のステップの始まりまで待つこと
  test("前回と同じステップなら、次のステップまで待つ", () => {
    expect(msUntilUsable(stepStart + 5_000, 1_000)).toBe(25_000);
  });

  // 前回より後のステップで、残りが十分なら待たないこと
  test("前回より後のステップなら 0", () => {
    expect(msUntilUsable(stepStart + 5_000, 999)).toBe(0);
  });
});

test.describe("Authenticator", () => {
  const stepStart = 1_000 * 30_000;

  // 登録とログインで続けて使うと、2回目は次のステップのコードになること（同じコードを2回出さない）
  test("続けて使うと、次のステップまで待ってから計算する", async () => {
    const clock = fakeClock(stepStart + 10_000);
    const app = new Authenticator("GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ", clock);

    const first = await app.nextCode();
    const second = await app.nextCode();

    expect(clock.slept).toEqual([20_000]);
    expect(first).toBe(codeAt(RFC_SECRET, 1_000));
    expect(second).toBe(codeAt(RFC_SECRET, 1_001));
  });

  // 境目の直前なら、次のステップまで待ってから計算すること
  test("境目の直前なら、次のステップまで待つ", async () => {
    const clock = fakeClock(stepStart + 29_000);
    const app = new Authenticator(RFC_SECRET, clock);

    expect(await app.nextCode()).toBe(codeAt(RFC_SECRET, 1_001));
    expect(clock.slept).toEqual([1_000]);
  });

  // 違うコードは、前後のずれを含めたどのステップのコードとも一致しないこと
  test("違うコードは、近くのステップのどのコードとも一致しない", () => {
    // 時刻をずらしながら、いくつかのステップで確かめる
    for (let step = 1_000; step < 1_050; step++) {
      const app = new Authenticator(RFC_SECRET, fakeClock(step * 30_000));
      const wrong = app.wrongCode();

      expect(wrong).toMatch(/^\d{6}$/);
      for (let offset = -1; offset <= 2; offset++) {
        expect(wrong).not.toBe(codeAt(RFC_SECRET, step + offset));
      }
    }
  });
});
