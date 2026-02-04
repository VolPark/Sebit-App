import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables for tests
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('NEXT_PUBLIC_CURRENCY_SYMBOL', 'Kč')
vi.stubEnv('NEXT_PUBLIC_RATE_DISPLAY_MODE', 'HOURLY')
