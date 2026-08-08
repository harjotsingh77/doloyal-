/** Lightweight UA parser for login-history metadata. No external deps. */
export function parseUserAgent(ua: string): {
  browser: string | null;
  os: string | null;
  device: string | null;
} {
  if (!ua) return { browser: null, os: null, device: null };
  let browser: string | null = null;
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/msie|trident/i.test(ua)) browser = 'Internet Explorer';
  else if (/mozilla/i.test(ua)) browser = 'Browser';
  else browser = null;

  let os: string | null = null;
  if (/windows nt 11/i.test(ua)) os = 'Windows 11';
  else if (/windows nt 10/i.test(ua)) os = 'Windows 10';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else os = null;

  let device: string | null = null;
  if (/iphone/i.test(ua)) device = 'Mobile';
  else if (/ipad/i.test(ua)) device = 'Tablet';
  else if (/android/i.test(ua)) device = /mobile/i.test(ua) ? 'Mobile' : 'Android Device';
  else if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet/i.test(ua)) device = 'Tablet';
  else if (/macintosh|windows|linux|ubuntu/i.test(ua)) device = 'Desktop';
  else device = null;

  return { browser, os, device };
}
