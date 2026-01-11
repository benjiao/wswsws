// This file reads the version from package.json at build time
// Next.js will bundle this at build time, so it works in client components too
import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
