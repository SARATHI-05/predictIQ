from datetime import datetime, timezone, timedelta

# India Standard Time (IST) is UTC + 5:30
IST_OFFSET = timedelta(hours=5, minutes=30)
IST_TZ = timezone(IST_OFFSET)

def get_ist_now() -> datetime:
    """
    Returns the current datetime in Indian Standard Time (IST, UTC+5:30)
    """
    return datetime.now(timezone.utc).astimezone(IST_TZ)

def format_ist_12h(dt: datetime = None, include_seconds: bool = True) -> str:
    """
    Formats a datetime object to 12-hour IST format (India)
    Example: "20 Aug 2026, 06:22:34 PM IST"
    """
    if dt is None:
        dt = get_ist_now()

    if dt.tzinfo is None:
        # Assume UTC if naive, convert to IST
        dt = dt.replace(tzinfo=timezone.utc).astimezone(IST_TZ)
    else:
        dt = dt.astimezone(IST_TZ)

    fmt = "%d %b %Y, %I:%M:%S %p IST" if include_seconds else "%d %b %Y, %I:%M %p IST"
    return dt.strftime(fmt)

def format_ist_time_12h(dt: datetime = None, include_seconds: bool = True) -> str:
    """
    Formats time only in 12-hour IST format (India)
    Example: "06:22:34 PM IST"
    """
    if dt is None:
        dt = get_ist_now()

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc).astimezone(IST_TZ)
    else:
        dt = dt.astimezone(IST_TZ)

    fmt = "%I:%M:%S %p IST" if include_seconds else "%I:%M %p IST"
    return dt.strftime(fmt)
