export interface AutoReloginOptions {
  isLoggedIn: () => boolean;
  runAutomaticLogin: () => Promise<void>;
  requestQRCode: () => Promise<void>;
  onAttempt: (reason: string) => void;
  onExhausted?: (reason: string, attempts: number) => void;
  retryCooldownMs?: number;
  maxAttempts?: number;
}

/** Try the configured automatic login once, then fall back to QR login. */
export function createAutoRelogin ({
  isLoggedIn,
  runAutomaticLogin,
  requestQRCode,
  onAttempt,
  onExhausted,
  retryCooldownMs = 30_000,
  maxAttempts = 3,
}: AutoReloginOptions) {
  let inFlight = false;
  let nextAllowedAt = 0;
  let attempts = 0;

  const requestFallbackQRCode = async (reason: string) => {
    await requestQRCode();
    if (attempts >= maxAttempts) onExhausted?.(reason, attempts);
  };

  const relogin = async (reason: string): Promise<void> => {
    const now = Date.now();
    if (inFlight || now < nextAllowedAt || attempts >= maxAttempts) return;

    inFlight = true;
    attempts += 1;
    nextAllowedAt = now + retryCooldownMs;
    onAttempt(reason);
    try {
      await runAutomaticLogin();
      if (isLoggedIn()) {
        attempts = 0;
      } else {
        await requestFallbackQRCode(reason);
      }
    } catch {
      await requestFallbackQRCode(reason);
    } finally {
      inFlight = false;
    }
  };

  relogin.reset = () => {
    attempts = 0;
    nextAllowedAt = 0;
  };

  if (maxAttempts < 1) throw new Error('maxAttempts must be at least 1');

  return relogin;
}
