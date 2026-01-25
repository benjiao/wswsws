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
  
  // Force log output to stderr (more reliable in production)
  const log = (msg: string) => {
    console.error(`[Runtime Config API] ${msg}`);
    process.stderr.write(`[Runtime Config API] ${msg}\n`);
  };
  
  log('═══════════════════════════════════════════════════════');
  log('Request received at: ' + new Date().toISOString());
  log('process.env.DEPLOYMENT_ENV: ' + (process.env.DEPLOYMENT_ENV || 'UNDEFINED'));
  log('process.env.DEPLOYMENT_ENV type: ' + typeof process.env.DEPLOYMENT_ENV);
  log('process.env.DEPLOYMENT_ENV === "development": ' + (process.env.DEPLOYMENT_ENV === 'development'));
  log('process.env.NODE_ENV: ' + (process.env.NODE_ENV || 'UNDEFINED'));
  
  // Get raw value
  const rawDeploymentEnv = process.env.DEPLOYMENT_ENV;
  log('Raw DEPLOYMENT_ENV value: ' + JSON.stringify(rawDeploymentEnv));
  
  // Determine deployment environment
  const deploymentEnv = rawDeploymentEnv || 
                        (process.env.NODE_ENV === 'development' ? 'development' : 'production');
  
  log('Final deploymentEnv: ' + deploymentEnv);
  
  const isDevelopment = deploymentEnv === 'development';
  log('isDevelopment: ' + isDevelopment);
  log('═══════════════════════════════════════════════════════');
  
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
  
  log('Response: ' + JSON.stringify(response, null, 2));
  
  const responseObj = NextResponse.json(response);
  // Add custom header to verify route was hit
  responseObj.headers.set('X-Runtime-Config-Route', 'hit');
  return responseObj;
}
