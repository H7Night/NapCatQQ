export interface AutoReloginOptions {
  isLoggedIn: () => boolean;
  runAutomaticLogin: () => Promise<void>;
  requestQRCode: () => Promise<void>;
  onAttempt: (reason: string) => void;
  retryCooldownMs?: number;
}

/** Try the configured automatic login once, then fall back to QR login. */
export function createAutoRelogin ({
  isLoggedIn,
  runAutomaticLogin,
  requestQRCode,
  onAttempt,
  retryCooldownMs = 30_000,
}: AutoReloginOptions) {
  let inFlight = false;
  let nextAllowedAt = 0;

  return async (reason: string): Promise<void> => {
    const now = Date.now();
    if (inFlight || now < nextAllowedAt) return;

    inFlight = true;
    nextAllowedAt = now + retryCooldownMs;
    onAttempt(reason);
    try {
      await runAutomaticLogin();
      if (!isLoggedIn()) await requestQRCode();
    } catch {
      await requestQRCode();
    } finally {
      inFlight = false;
    }
  };
}
