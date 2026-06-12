/**
 * Helper за reCAPTCHA v3.
 *
 * Скриптът се зарежда от layout.tsx (afterInteractive). Тук просто чакаме
 * `grecaptcha` да стане наличен и викаме execute с action-а.
 *
 * Връща низ-токен или хвърля грешка ако нещо не е наред — извикващият
 * (BookingForm) показва приятелски текст на потребителя.
 */

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

const READY_TIMEOUT_MS = 5000;

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
