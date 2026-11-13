import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createAutoRelogin } from '../napcat-core/helper/auto-relogin';

describe('automatic relogin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('tries the configured automatic login before requesting a QR code', async () => {
    const state = { loggedIn: false };
    const runAutomaticLogin = vi.fn(async () => {
      state.loggedIn = true;
    });
    const requestQRCode = vi.fn(async () => {});
    const onAttempt = vi.fn();
    const relogin = createAutoRelogin({
      isLoggedIn: () => state.loggedIn,
      runAutomaticLogin,
      requestQRCode,
      onAttempt,
      retryCooldownMs: 30_000,
    });

    await relogin('logout');

    expect(onAttempt).toHaveBeenCalledWith('logout');
    expect(runAutomaticLogin).toHaveBeenCalledTimes(1);
    expect(requestQRCode).not.toHaveBeenCalled();
  });

  test('requests a QR code when automatic login does not restore the account', async () => {
    const runAutomaticLogin = vi.fn(async () => {});
    const requestQRCode = vi.fn(async () => {});
    const relogin = createAutoRelogin({
      isLoggedIn: () => false,
      runAutomaticLogin,
      requestQRCode,
      onAttempt: vi.fn(),
    });

    await relogin('login-failed');

    expect(requestQRCode).toHaveBeenCalledTimes(1);
  });

  test('does not start concurrent automatic login attempts', async () => {
    let release!: () => void;
    const runAutomaticLogin = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const relogin = createAutoRelogin({
      isLoggedIn: () => false,
      runAutomaticLogin,
      requestQRCode: vi.fn(async () => {}),
      onAttempt: vi.fn(),
    });

    const first = relogin('first');
    const second = relogin('second');
    expect(runAutomaticLogin).toHaveBeenCalledTimes(1);

    release();
    await Promise.all([first, second]);
  });
});
