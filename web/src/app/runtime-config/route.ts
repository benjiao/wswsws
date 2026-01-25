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
  
  // Log to server console every time this route is called (for debugging)
  // Check container logs in Portainer to see these logs
  console.log('[Runtime Config API] Request received');
  console.log('[Runtime Config API] process.env.DEPLOYMENT_ENV:', process.env.DEPLOYMENT_ENV);
  console.log('[Runtime Config API] process.env.DEPLOYMENT_ENV type:', typeof process.env.DEPLOYMENT_ENV);
  console.log('[Runtime Config API] process.env.DEPLOYMENT_ENV === "development":', process.env.DEPLOYMENT_ENV === 'development');
  console.log('[Runtime Config API] process.env.NODE_ENV:', process.env.NODE_ENV);
  
  // Get raw value
  const rawDeploymentEnv = process.env.DEPLOYMENT_ENV;
  console.log('[Runtime Config API] Raw DEPLOYMENT_ENV value:', JSON.stringify(rawDeploymentEnv));
  
  // Determine deployment environment
  const deploymentEnv = rawDeploymentEnv || 
                        (process.env.NODE_ENV === 'development' ? 'development' : 'production');
  
  console.log('[Runtime Config API] Final deploymentEnv:', deploymentEnv);
  
  const isDevelopment = deploymentEnv === 'development';
  console.log('[Runtime Config API] isDevelopment:', isDevelopment);
  
  // Debug: Log all environment variables (for troubleshooting)
  // Remove in production if sensitive data is a concern
  const envDebug = {
    DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV,
    DEPLOYMENT_ENV_raw: JSON.stringify(process.env.DEPLOYMENT_ENV),
    DEPLOYMENT_ENV_undefined: process.env.DEPLOYMENT_ENV === undefined,
    DEPLOYMENT_ENV_null: process.env.DEPLOYMENT_ENV === null,
    NODE_ENV: process.env.NODE_ENV,
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  };
  
  const response = {
    deploymentEnv,
    isDevelopment,
    // Also expose API URL if needed (can be set at runtime)
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '/api',
    // Debug info (remove in production)
    _debug: envDebug,
  };
  
  console.log('[Runtime Config API] Response:', JSON.stringify(response, null, 2));
  
  return NextResponse.json(response);
}
