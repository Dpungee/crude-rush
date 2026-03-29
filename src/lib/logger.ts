/**
 * Structured logging for Crude Rush backend.
 *
 * Outputs JSON in production (for Vercel log aggregation) and
 * human-readable format in development.
 *
 * Usage:
 *   import { log } from '@/lib/logger'
 *   log.info('auth', 'Player authenticated', { wallet: '...' })
 *   log.warn('anti-cheat', 'Suspicious delta', { crude: 999999 })
 *   log.error('save', 'DB write failed', { error: err.message })
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  module: string
  message: string
  data?: Record<string, unknown>
  timestamp: string
}

const isProd = process.env.NODE_ENV === 'production'

function emit(level: LogLevel, module: string, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    module,
    message,
    data,
    timestamp: new Date().toISOString(),
  }

  if (isProd) {
    // JSON for log aggregators (Vercel, Datadog, etc.)
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    fn(JSON.stringify(entry))
  } else {
    // Human-readable for dev
    const prefix = `[${module}]`
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    if (data && Object.keys(data).length > 0) {
      fn(prefix, message, data)
    } else {
      fn(prefix, message)
    }
  }
}

export const log = {
  info: (module: string, message: string, data?: Record<string, unknown>) =>
    emit('info', module, message, data),
  warn: (module: string, message: string, data?: Record<string, unknown>) =>
    emit('warn', module, message, data),
  error: (module: string, message: string, data?: Record<string, unknown>) =>
    emit('error', module, message, data),
}
