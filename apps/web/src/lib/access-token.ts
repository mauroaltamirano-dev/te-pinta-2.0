const accessTokenStorageKey = 'te-pinta.accessToken';

let accessToken: string | null = (() => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(accessTokenStorageKey);
  } catch {
    return null;
  }
})();

const writeStoredAccessToken = (token: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    if (token) {
      window.localStorage.setItem(accessTokenStorageKey, token);
    } else {
      window.localStorage.removeItem(accessTokenStorageKey);
    }
  } catch {
    // localStorage can be disabled; in-memory auth still works for this tab.
  }
};

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string) => {
  accessToken = token;
  writeStoredAccessToken(token);
};

export const clearAccessToken = () => {
  accessToken = null;
  writeStoredAccessToken(null);
};
