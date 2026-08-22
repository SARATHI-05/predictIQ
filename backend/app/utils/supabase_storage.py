import os
import requests
import time
from typing import Optional

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://juvpwwvyakldziwxltkm.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY") or ""

def upload_file_to_supabase_storage(bucket: str, file_name: str, file_content: bytes, content_type: str = "text/csv") -> str:
    """
    Uploads a raw binary file to Supabase Storage bucket and returns the file storage URL.
    """
    timestamp = int(time.time())
    safe_name = f"{timestamp}_{file_name.replace(' ', '_')}"
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{safe_name}"

    try:
        url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{safe_name}"
        headers = {
            "Content-Type": content_type,
        }
        if SUPABASE_KEY:
            headers["Authorization"] = f"Bearer {SUPABASE_KEY}"
            headers["apikey"] = SUPABASE_KEY

        res = requests.post(url, headers=headers, data=file_content, timeout=5)
        if res.status_code in [200, 201]:
            return public_url
    except Exception as e:
        print(f"[Supabase Storage Upload Notice]: {e}")

    return public_url
