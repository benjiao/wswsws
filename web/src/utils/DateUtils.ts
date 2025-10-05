/**
 * Date utilities for consistent timezone handling
 */

/**
 * Get today's date in a configurable timezone
 * Works regardless of server timezone - useful for deployments
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getUserLocalDate = () => {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
};