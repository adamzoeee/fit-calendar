const TOKEN_KEY = 'fitcalendar_api_token';

export const tokenStore = {
  get(): string {
    return localStorage.getItem(TOKEN_KEY) || '';
  },
  save(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
};
