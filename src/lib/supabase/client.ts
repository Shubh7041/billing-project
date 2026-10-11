import { createClient } from '@supabase/supabase-js'

type SupabaseEnvironment = Pick<
  ImportMetaEnv,
  'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'
>

export type SupabaseConfiguration =
  | {
      readonly configured: true
      readonly url: string
      readonly publishableKey: string
    }
  | {
      readonly configured: false
      readonly missingVariables: readonly string[]
      readonly error: string
    }

export function validateSupabaseConfiguration(
  environment: SupabaseEnvironment = import.meta.env,
): SupabaseConfiguration {
  const url = environment.VITE_SUPABASE_URL?.trim()
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  const missingVariables: string[] = []

  if (!url) missingVariables.push('VITE_SUPABASE_URL')
  if (!publishableKey) missingVariables.push('VITE_SUPABASE_PUBLISHABLE_KEY')

  if (!url || !publishableKey) {
    return {
      configured: false,
      missingVariables,
      error: `Supabase is not configured. Set ${missingVariables.join(' and ')} in .env.local.`,
    }
  }

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error()
    }
  } catch {
    return {
      configured: false,
      missingVariables: [],
      error: 'VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.',
    }
  }

  return { configured: true, url, publishableKey }
}

export const supabaseConfiguration = validateSupabaseConfiguration()

export const supabase = supabaseConfiguration.configured
  ? createClient(
      supabaseConfiguration.url,
      supabaseConfiguration.publishableKey,
    )
  : null