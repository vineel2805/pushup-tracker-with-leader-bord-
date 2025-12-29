// Utility functions for calculating statistics
// 
// Date handling assumptions:
// - Session dates are stored as ISO date strings (YYYY-MM-DD) in UTC
// - All date comparisons use UTC midnight to avoid timezone issues
// - "Today" means the current UTC date, not local date

import { Session } from './mockData';

/**
 * Converts an ISO date string (YYYY-MM-DD) to a Date object at UTC midnight
 * @param dateStr ISO date string (e.g., "2024-01-15")
 * @returns Date object at UTC midnight, or null if invalid
 */
const dateStringToUTCDate = (dateStr: string): Date | null => {
  // Validate date string format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  
  // Parse YYYY-MM-DD and create UTC date at midnight
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Validate parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }
  
  // Validate month and day ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // Validate date object is valid (catches invalid dates like Feb 30)
  if (isNaN(date.getTime())) {
    return null;
  }
  
  // Verify the date components match (catches invalid dates)
  if (date.getUTCFullYear() !== year || 
      date.getUTCMonth() !== month - 1 || 
      date.getUTCDate() !== day) {
    return null;
  }
  
  return date;
};

/**
 * Gets the current UTC date as an ISO date string (YYYY-MM-DD)
 * @returns ISO date string
 */
const getTodayUTC = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Gets a Date object for today at UTC midnight
 * @returns Date object
 */
const getTodayUTCDate = (): Date => {
  const todayStr = getTodayUTC();
  return dateStringToUTCDate(todayStr);
};

export const getTodaysPushUps = (sessions: Session[]): number => {
  const today = getTodayUTC();
  return sessions
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + s.pushUps, 0);
};

export const getWeeklyTotal = (sessions: Session[]): number => {
  const today = getTodayUTCDate();
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);
  const oneWeekAgoTime = oneWeekAgo.getTime();
  
  return sessions
    .filter(s => {
      const sessionDate = dateStringToUTCDate(s.date);
      // Skip invalid dates - they cannot participate in comparisons
      if (!sessionDate) return false;
      return sessionDate.getTime() >= oneWeekAgoTime;
    })
    .reduce((sum, s) => sum + s.pushUps, 0);
};

export const getMonthlyTotal = (sessions: Session[]): number => {
  const today = getTodayUTCDate();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setUTCDate(oneMonthAgo.getUTCDate() - 30);
  const oneMonthAgoTime = oneMonthAgo.getTime();
  
  return sessions
    .filter(s => {
      const sessionDate = dateStringToUTCDate(s.date);
      // Skip invalid dates - they cannot participate in comparisons
      if (!sessionDate) return false;
      return sessionDate.getTime() >= oneMonthAgoTime;
    })
    .reduce((sum, s) => sum + s.pushUps, 0);
};

export const getCurrentStreak = (sessions: Session[]): number => {
  if (sessions.length === 0) return 0;
  
  // Filter out sessions with invalid dates before processing
  const validSessions = sessions.filter(s => {
    const date = dateStringToUTCDate(s.date);
    return date !== null;
  });
  
  if (validSessions.length === 0) return 0;
  
  // Sort sessions by date descending (most recent first)
  // Convert date strings to Date objects for proper comparison
  const sortedSessions = [...validSessions].sort((a, b) => {
    const dateA = dateStringToUTCDate(a.date);
    const dateB = dateStringToUTCDate(b.date);
    // Both dates are validated above, so they're not null
    return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
  });
  
  // Get today at UTC midnight
  const today = getTodayUTCDate();
  const todayStr = getTodayUTC();
  
  // Create a Set of valid session dates for O(1) lookup
  const sessionDates = new Set(validSessions.map(s => s.date));
  
  let streak = 0;
  let checkDate = new Date(today);
  
  // Check if there's a session today
  const hasSessionToday = sessionDates.has(todayStr);
  
  if (!hasSessionToday) {
    // If no session today, start checking from yesterday
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }
  
  // Count consecutive days with sessions
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasSession = sessionDates.has(dateStr);
    
    if (hasSession) {
      streak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      // Streak broken
      break;
    }
  }
  
  return streak;
};

export const getBestSession = (sessions: Session[]): number => {
  if (sessions.length === 0) return 0;
  return Math.max(...sessions.map(s => s.pushUps));
};

export const getLongestStreak = (sessions: Session[]): number => {
  if (sessions.length === 0) return 0;
  
  // Filter out sessions with invalid dates before processing
  const validSessions = sessions.filter(s => {
    const date = dateStringToUTCDate(s.date);
    return date !== null;
  });
  
  if (validSessions.length === 0) return 0;
  
  // Sort sessions by date ascending (oldest first)
  // Convert date strings to Date objects for proper comparison
  const sortedSessions = [...validSessions].sort((a, b) => {
    const dateA = dateStringToUTCDate(a.date);
    const dateB = dateStringToUTCDate(b.date);
    // Both dates are validated above, so they're not null
    return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
  });
  
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;
  
  sortedSessions.forEach(session => {
    // Convert session date string to UTC Date at midnight
    const sessionDate = dateStringToUTCDate(session.date);
    
    // Skip if date is invalid (shouldn't happen after filtering, but defensive)
    if (!sessionDate) return;
    
    if (lastDate === null) {
      // First session starts a streak of 1
      currentStreak = 1;
    } else {
      // Calculate difference in days (milliseconds / ms per day)
      const dayDiff = Math.floor((sessionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        // Consecutive day - continue streak
        currentStreak++;
      } else if (dayDiff > 1) {
        // Gap in days - streak broken, start new streak
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
      // If dayDiff === 0, same day (multiple sessions) - don't increment streak
    }
    
    lastDate = sessionDate;
  });
  
  // Check final streak
  return Math.max(maxStreak, currentStreak);
};

export const getLast7DaysData = (sessions: Session[]) => {
  const data = [];
  const today = getTodayUTCDate();
  
  // Create a map of date -> total push-ups for O(1) lookup
  // Only include sessions with valid dates
  const dateMap = new Map<string, number>();
  sessions.forEach(session => {
    // Validate date before adding to map
    const sessionDate = dateStringToUTCDate(session.date);
    if (sessionDate) {
      const current = dateMap.get(session.date) || 0;
      dateMap.set(session.date, current + session.pushUps);
    }
  });
  
  // Generate data for last 7 days (including today)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTotal = dateMap.get(dateStr) || 0;
    
    // Use UTC date for display, but format in user's locale
    // Note: toLocaleDateString uses local timezone, but dateStr is UTC
    const displayDate = new Date(dateStr + 'T00:00:00Z');
    
    data.push({
      date: dateStr,
      day: displayDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      pushUps: dayTotal,
    });
  }
  
  return data;
};

export const getLast30DaysData = (sessions: Session[]) => {
  const data = [];
  const today = getTodayUTCDate();
  
  // Create a map of date -> total push-ups for O(1) lookup
  // Only include sessions with valid dates
  const dateMap = new Map<string, number>();
  sessions.forEach(session => {
    // Validate date before adding to map
    const sessionDate = dateStringToUTCDate(session.date);
    if (sessionDate) {
      const current = dateMap.get(session.date) || 0;
      dateMap.set(session.date, current + session.pushUps);
    }
  });
  
  // Generate data for last 30 days (including today)
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTotal = dateMap.get(dateStr) || 0;
    
    // Use UTC date for display
    const displayDate = new Date(dateStr + 'T00:00:00Z');
    
    data.push({
      date: dateStr,
      day: displayDate.getUTCDate().toString(),
      pushUps: dayTotal,
    });
  }
  
  return data;
};

export const getLifetimeTotal = (sessions: Session[]): number => {
  return sessions.reduce((sum, s) => sum + s.pushUps, 0);
};
