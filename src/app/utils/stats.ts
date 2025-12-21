// Utility functions for calculating statistics

import { Session } from './mockData';

export const getTodaysPushUps = (sessions: Session[]): number => {
  const today = new Date().toISOString().split('T')[0];
  return sessions
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + s.pushUps, 0);
};

export const getWeeklyTotal = (sessions: Session[]): number => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStr = oneWeekAgo.toISOString().split('T')[0];
  
  return sessions
    .filter(s => s.date >= weekAgoStr)
    .reduce((sum, s) => sum + s.pushUps, 0);
};

export const getMonthlyTotal = (sessions: Session[]): number => {
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const monthAgoStr = oneMonthAgo.toISOString().split('T')[0];
  
  return sessions
    .filter(s => s.date >= monthAgoStr)
    .reduce((sum, s) => sum + s.pushUps, 0);
};

export const getCurrentStreak = (sessions: Session[]): number => {
  if (sessions.length === 0) return 0;
  
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let checkDate = new Date(today);
  
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasSession = sortedSessions.some(s => s.date === dateStr);
    
    if (hasSession) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // Check yesterday if no session today
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
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
  
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;
  
  sortedSessions.forEach(session => {
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);
    
    if (lastDate === null) {
      currentStreak = 1;
    } else {
      const dayDiff = Math.floor((sessionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    
    lastDate = sessionDate;
  });
  
  return Math.max(maxStreak, currentStreak);
};

export const getLast7DaysData = (sessions: Session[]) => {
  const data = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTotal = sessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + s.pushUps, 0);
    
    data.push({
      date: dateStr,
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      pushUps: dayTotal,
    });
  }
  
  return data;
};

export const getLast30DaysData = (sessions: Session[]) => {
  const data = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTotal = sessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + s.pushUps, 0);
    
    data.push({
      date: dateStr,
      day: date.getDate().toString(),
      pushUps: dayTotal,
    });
  }
  
  return data;
};

export const getLifetimeTotal = (sessions: Session[]): number => {
  return sessions.reduce((sum, s) => sum + s.pushUps, 0);
};
