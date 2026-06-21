import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send httpOnly refresh token cookie
  headers: { 'Content-Type': 'application/json' }
});

// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for the in-memory/sessionStorage access token.
// EVERY place in the app that needs to read or write the access token must
// go through getAuthToken()/setAuthToken() in this file — never read/write
// sessionStorage directly elsewhere. This was the root cause of a serious
// "randomly logged out / access denied" bug: AuthContext used to keep its
// own separate React-state copy of the token that never got synced here,
// so the request interceptor below would silently send no Authorization
// header at all after a silent refresh or on page reload.
// ─────────────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'accessToken';

export const getAuthToken = () => sessionStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token) => {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  }
};

// Attach access token on every request. We read from sessionStorage (not a
// closure variable) so this always reflects the latest token even if it was
// just updated by a concurrent refresh.
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// On 401, attempt exactly one silent refresh, queue any other in-flight
// requests that also got a 401 while the refresh is in progress, then retry
// all of them with the new token. If refresh itself fails, clear the token
// and send the user to /login — but only do this redirect once, and only
// for 401s (never for 403 "access denied due to role", which is a separate,
// legitimate state the UI should handle by showing a message, not bouncing
// the user out).
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // No response at all (network error, server down) — don't try to refresh,
    // just reject so the caller's catch block can show a meaningful message.
    if (!error.response) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register');

    if (error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // A refresh is already in flight — queue this request and resolve it
        // once the in-progress refresh completes, instead of firing a second
        // parallel refresh call (which would otherwise race and could cause
        // the backend's refresh-token-rotation reuse detection to invalidate
        // the session entirely).
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post('/auth/refresh');
        const newToken = res.data?.data?.accessToken;

        if (!newToken) {
          throw new Error('Refresh response did not include an access token');
        }

        setAuthToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAuthToken(null);
        // Only force a hard redirect if we're not already on a public auth page —
        // avoids an infinite redirect loop if /auth/refresh itself ever 401s
        // while the user is sitting on the login page.
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
        const onPublicPage = publicPaths.some((p) => window.location.pathname.startsWith(p));
        if (!onPublicPage) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
