const STATIC_ALLOWED_ORIGINS = [
  'https://webyalaya-main-3pav6whkp-debanshu-ghoshs-projects.vercel.app',
  'https://www.webyalaya.com',
  'https://webyalaya.com',
  'https://webyalaya-next.vercel.app',
  'https://test.webyalaya.com',
  'https://test2.webyalaya.com',
  'https://webyalaya-next-test.vercel.app',
  'https://dev.webyalaya.com',
  'https://dev2.webyalaya.com',
  'https://hedera.webyalaya.com',
  'https://webyalaya-green.vercel.app',
  'https://webyalaya-purple.vercel.app',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3007',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
]

const PRIVATE_NETWORK_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
]

export function getAllowedOrigins(): string[] {
  const envUrls =
    process.env.FRONTEND_URLS?.split(',')
      .map((url) => url.trim())
      .filter(Boolean) || []

  // Support single FRONTEND_URL as well
  if (process.env.FRONTEND_URL) {
    envUrls.push(process.env.FRONTEND_URL.trim());
  }

  return [...new Set([...envUrls, ...STATIC_ALLOWED_ORIGINS])]
}

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) {
    return true
  }

  const allowedOrigins = getAllowedOrigins()
  if (allowedOrigins.includes(origin)) {
    return true
  }

  return PRIVATE_NETWORK_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
}

export function corsOriginDelegate(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  if (isAllowedOrigin(origin)) {
    callback(null, true)
    return
  }

  callback(new Error(`Origin ${origin || 'unknown'} is not allowed by CORS`))
}
