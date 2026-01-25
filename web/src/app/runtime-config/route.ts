import { NextResponse } from 'next/server';

/**
 * Runtime configuration API route
 * Exposes server-side environment variables that can be set at runtime
 * (not at build time). This allows the same build to behave differently
 * based on deployment environment.
 */
export async function GET() {
  // Read deployment environment from server-side env var
  // This is NOT prefixed with NEXT_PUBLIC_ so it's only available server-side
  // and can be set at runtime (e.g., via Docker ENV or system environment)
  const deploymentEnv = process.env.DEPLOYMENT_ENV || 
                        (process.env.NODE_ENV === 'development' ? 'development' : 'production');
  
  const isDevelopment = deploymentEnv === 'development';
  
  // Debug: Log all environment variables (for troubleshooting)
  // Remove in production if sensitive data is a concern
  const envDebug = {
    DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV,
    NODE_ENV: process.env.NODE_ENV,
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  };
  
  return NextResponse.json({
    deploymentEnv,
    isDevelopment,
    // Also expose API URL if needed (can be set at runtime)
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '/api',
    // Debug info (remove in production)
    _debug: envDebug,
  });
}
