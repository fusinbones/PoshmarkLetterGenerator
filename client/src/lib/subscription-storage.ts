const STORAGE_KEYS = {
  subscribedEmail: "subscribedEmail",
  confirmationAcknowledged: "confirmationAcknowledged",
  emailConfirmed: "emailConfirmed",
  confirmationBannerDismissed: "confirmationBannerDismissed",
} as const;

function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

export function getStoredEmail(): string | null {
  return getItem(STORAGE_KEYS.subscribedEmail);
}

export function isConfirmationAcknowledged(): boolean {
  const value = getItem(STORAGE_KEYS.confirmationAcknowledged);
  if (value === null && getStoredEmail()) {
    return true;
  }
  return value === "true";
}

export function isEmailConfirmed(): boolean {
  return getItem(STORAGE_KEYS.emailConfirmed) === "true";
}

export function isConfirmationBannerDismissed(): boolean {
  return getItem(STORAGE_KEYS.confirmationBannerDismissed) === "true";
}

export function savePendingSubscription(email: string): void {
  setItem(STORAGE_KEYS.subscribedEmail, email);
  setItem(STORAGE_KEYS.confirmationAcknowledged, "false");
}

export function acknowledgeConfirmation(): void {
  setItem(STORAGE_KEYS.confirmationAcknowledged, "true");
}

export function markEmailConfirmed(): void {
  setItem(STORAGE_KEYS.emailConfirmed, "true");
  setItem(STORAGE_KEYS.confirmationAcknowledged, "true");
}

export function dismissConfirmationBanner(): void {
  setItem(STORAGE_KEYS.confirmationBannerDismissed, "true");
}

export function shouldShowConfirmationBanner(): boolean {
  return (
    Boolean(getStoredEmail()) &&
    isConfirmationAcknowledged() &&
    !isEmailConfirmed() &&
    !isConfirmationBannerDismissed()
  );
}
