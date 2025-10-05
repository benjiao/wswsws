/**
 * Date utilities for consistent timezone handling
 */

/**
 * Get today's date in a configurable timezone
 * Works regardless of server timezone - useful for deployments
 * @param {string} timeZone - IANA timezone string (e.g., "Asia/Singapore")
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getTodayInTimezone = (timeZone: string = "Asia/Singapore"): string => {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone }));
    return tzDate.toISOString().slice(0, 10);
};
