// Environment configuration
// Make sure to set these in your .env.local file

export const env = {
  // OpenRouter Configuration
  OPENROUTER_API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY,
  OPENAI_ASSISTANT_ID: import.meta.env.VITE_OPENAI_ASSISTANT_ID || 'asst_0IGtbLANauxTpbn8rSj7MVy5',
  
  // Application Settings
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Leadership Assessment',
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'Discover your leadership style through our comprehensive assessment',
  
  // Development Settings
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  
  // Supabase (these should already be configured via integrations)
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const;

// Validate required environment variables
const requiredEnvVars = {
  SUPABASE_URL: env.SUPABASE_URL,
  SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
} as const;

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`Missing required environment variable: VITE_${key}`);
  }
}

export default env;
