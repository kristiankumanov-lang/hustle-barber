/**
 * Helper за reCAPTCHA v3.
 *
 * Скриптът НЕ се зарежда глобално при mount — 793 KiB transfer и всичките
 * long main-thread tasks на PageSpeed идваха точно от него, а реално се
 * ползва само в BookingForm (стъпка "form" от booking flow-а). Вместо това
 * loadRecaptchaScript() се вика от BookingForm при mount и инжектира <script>
 * тага лениво, точно когато потребителят реално стигне до тази стъпка.
 *
 * executeRecaptcha() чака `grecaptcha` да стане наличен и вика execute с
 * action-а. Връща низ-токен или хвърля грешка ако нещо не е наред —
 * извикващият (BookingForm) показва приятелски текст на потребителя.
 */

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

// По-дълъг от преди (5000ms), защото скриптът вече започва да се тегли чак
// при вход в стъпка "form", а не отрано при mount на страницата — на бавна
// мрежа трябва повече престой преди да отчетем неуспех.
const READY_TIMEOUT_MS = 8000;

let scriptRequested = false;

/**
 * Добавя reCAPTCHA v3 <script> тага в document — идемпотентно, безопасно е
 * да се вика при всеки mount на BookingForm (напр. потребител се връща със
 * "Назад" и после пак напред към формата). Не прави нищо, ако скриптът вече
 * е инжектиран/зареден, или ако липсва site key.
 */
export function loadRecaptchaScript(): void {
  if (typeof window === "undefined" || scriptRequested) return;
  if (window.grecaptcha || document.querySelector("script[data-recaptcha-loader]")) {
    scriptRequested = true;
    return;
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return;

  scriptRequested = true;
  const script = document.createElement("script");
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  script.async = true;
  script.dataset.recaptchaLoader = "true";
  document.head.appendChild(script);
}

function waitForGrecaptcha(): Promise<NonNullable<Window["grecaptcha"]>> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    function check() {
      if (typeof window !== "undefined" && window.grecaptcha?.execute) {
        resolve(window.grecaptcha);
        return;
      }
      if (Date.now() - startedAt > READY_TIMEOUT_MS) {
        reject(new Error("reCAPTCHA не успя да се зареди."));
        return;
      }
      setTimeout(check, 100);
    }

    check();
  });
}

export async function executeRecaptcha(action: string): Promise<string> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    throw new Error("Липсва NEXT_PUBLIC_RECAPTCHA_SITE_KEY.");
  }

  const grecaptcha = await waitForGrecaptcha();

  return new Promise<string>((resolve, reject) => {
    try {
      grecaptcha.ready(async () => {
        try {
          const token = await grecaptcha.execute(siteKey, { action });
          resolve(token);
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}
