/**
 * Comprehensive date utilities for Next.js applications
 * Handles timezone consistently across server and client
 */

export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';

/**
 * Get date in a specific timezone - MOST RELIABLE METHOD
 * Works consistently in server and client environments
 * @param timezone - IANA timezone identifier (default: Asia/Singapore for UTC+8)
 * @param format - Output format
 */
export const getDateInTimezone = (
  timezone: string = "Asia/Singapore",
  format: DateFormat = 'YYYY-MM-DD'
): string => {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  switch (format) {
    case 'YYYY-MM-DD':
      return tzDate.toISOString().slice(0, 10);
    case 'MM/DD/YYYY':
      return tzDate.toLocaleDateString('en-US');
    case 'DD/MM/YYYY':
      return tzDate.toLocaleDateString('en-GB');
    default:
      return tzDate.toISOString().slice(0, 10);
  }
};

/**
 * Get user's actual local timezone date - CLIENT SIDE ONLY
 * Use this in useEffect or 'use client' components only
 * @param format - Output format
 */
export const getUserLocalDate = (format: DateFormat = 'YYYY-MM-DD'): string => {
  if (typeof window === 'undefined') {
    // Fallback for SSR - use UTC+8
    return getDateInTimezone("Asia/Singapore", format);
  }
  
  const now = new Date();
  
  switch (format) {
    case 'YYYY-MM-DD':
      return now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    case 'MM/DD/YYYY':
      return now.toLocaleDateString('en-US');
    case 'DD/MM/YYYY':
      return now.toLocaleDateString('en-GB');
    default:
      return now.toLocaleDateString('en-CA');
  }
};

/**
 * Get today's date with automatic timezone detection
 * Tries to use user's timezone, falls back to Asia/Singapore
 */
export const getTodaySmartly = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use consistent timezone
    return getDateInTimezone("Asia/Singapore");
  }
  
  // Client-side: use user's actual timezone
  return getUserLocalDate();
};

/**
 * Get user's detected timezone
 */
export const getUserTimezone = (): string => {
  if (typeof window === 'undefined') {
    return "Asia/Singapore"; // Default for SSR
  }
  
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Compare if two dates are the same day in a specific timezone
 */
export const isSameDayInTimezone = (
  date1: Date | string, 
  date2: Date | string, 
  timezone: string = "Asia/Singapore"
): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const tz1 = new Date(d1.toLocaleString("en-US", { timeZone: timezone }));
  const tz2 = new Date(d2.toLocaleString("en-US", { timeZone: timezone }));
  
  return tz1.toDateString() === tz2.toDateString();
};

/**
 * React hook for getting current date with auto-refresh
 */
import { useState, useEffect } from 'react';

export const useCurrentDate = (
  refreshInterval: number = 60000, // 1 minute
  timezone?: string
) => {
  const [currentDate, setCurrentDate] = useState<string>('');
  
  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(timezone ? getDateInTimezone(timezone) : getTodaySmartly());
    };
    
    updateDate(); // Initial update
    const interval = setInterval(updateDate, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval, timezone]);
  
  return currentDate;
};

// Convenience exports for common use cases
export const getTodayInUTC8 = () => getDateInTimezone("Asia/Singapore");
export const getTodayInUserTimezone = () => getUserLocalDate();
export const getTodayForAPI = () => getTodayInUTC8(); // Consistent for API calls