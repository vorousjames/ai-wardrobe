#!/usr/bin/env python3
"""
Cron job: polls Supabase for new body scans and processes them.
Runs every 5 minutes via crontab.

Environment variables needed:
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
"""

import os
import sys
import subprocess
import logging
from datetime import datetime, timezone, timedelta

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tmcfiscdluwwpkcaeyky.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SCAN_SCRIPT = "/root/ai-wardrobe/process_scan.py"
VENV_PYTHON = "/root/ai-wardrobe-venv/bin/python3"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("scan-cron")


def main():
    if not SUPABASE_SERVICE_KEY:
        logger.error("SUPABASE_SERVICE_KEY not set")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Find scans with status 'uploaded' that haven't been processed
    result = supabase.table("profiles").select("id,body_scan_status,body_scan_updated_at").eq("body_scan_status", "uploaded").execute()

    if not result.data:
        logger.info("No pending scans found")
        return

    for profile in result.data:
        user_id = profile["id"]
        logger.info(f"Found pending scan for user {user_id}")

        # The scan_id is derived from the storage path
        # List files in body-scans/{user_id}/
        files = supabase.storage.from_("body-scans").list(f"body-scan/{user_id}/")
        if not files:
            logger.warning(f"No files found for user {user_id}")
            continue

        # Get the most recent file
        latest = max(files, key=lambda f: f.get("created_at", ""))
        scan_id = latest["name"].replace(".mp4", "")
        logger.info(f"Processing scan {scan_id} for user {user_id}")

        # Run the processing script
        cmd = [
            VENV_PYTHON, SCAN_SCRIPT,
            user_id, scan_id,
        ]
        env = os.environ.copy()
        env["SUPABASE_URL"] = SUPABASE_URL
        env["SUPABASE_SERVICE_KEY"] = SUPABASE_SERVICE_KEY

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode == 0:
            logger.info(f"Scan {scan_id} for user {user_id} completed successfully")
        else:
            logger.error(f"Scan {scan_id} for user {user_id} failed: {result.stderr}")


if __name__ == "__main__":
    main()
