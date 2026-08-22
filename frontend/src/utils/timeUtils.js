import { useState, useEffect } from 'react';

/**
 * Format a Date object, ISO string, or timestamp into 12-hour India Standard Time (IST, UTC+5:30)
 * Example: "20 Aug 2026, 06:22:34 PM IST"
 */
export const formatIST = (dateInput, includeSeconds = true) => {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Invalid Date';

    const options = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true
    };

    return new Intl.DateTimeFormat('en-IN', options).format(d) + ' IST';
  } catch (e) {
    return String(dateInput);
  }
};

/**
 * Format time only in 12-hour IST format (e.g. "06:22:34 PM IST" or "06:22 PM IST")
 */
export const formatISTTime = (dateInput = new Date(), includeSeconds = true) => {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Invalid Time';

    const options = {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true
    };

    return new Intl.DateTimeFormat('en-IN', options).format(d) + ' IST';
  } catch (e) {
    return 'N/A';
  }
};

/**
 * Format date only in IST (e.g. "20 Aug 2026")
 */
export const formatISTDate = (dateInput = new Date()) => {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Invalid Date';

    const options = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };

    return new Intl.DateTimeFormat('en-IN', options).format(d);
  } catch (e) {
    return 'N/A';
  }
};

/**
 * React Hook for a live ticking 12-hour IST clock
 */
export const useISTClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return {
    now,
    time12: formatISTTime(now, true),
    time12Short: formatISTTime(now, false),
    dateStr: formatISTDate(now),
    fullIST: formatIST(now, true)
  };
};
