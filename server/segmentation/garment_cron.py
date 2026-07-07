#!/usr/bin/env python3
"""
Cron job: polls Supabase for garments needing segmentation and processes them.
Runs every 5 minutes via crontab.

Environment:
  SUPABASE_URL, SUPABASE_SERVICE_KEY
  R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME
"""

import os
import sys
import subprocess
import logging
from datetime import datetime, timezone, timedelta

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tmcfiscdluwwpkcaeyky.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
VENV_PYTHON = "/root/ai-wardrobe-venv/bin/python3"
SCRIPT = "/root/ai-wardrobe/segment_garment.py"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("garment-cron")


def main():
    if not SUPABASE_SERVICE_KEY:
        logger.error("SUPABASE_SERVICE_KEY not set")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Find garments with status 'not_started'
    result = supabase.table("garments").select("id").eq("segmentation_status", "not_started").execute()

    if not result.data:
        logger.info("No pending garments found")
        return

    for row in result.data:
        gid = row["id"]
        logger.info(f"Processing garment {gid}")

        env = os.environ.copy()
        proc = subprocess.run(
            [VENV_PYTHON, SCRIPT, gid],
            env=env,
            capture_output=True,
            text=True,
        )

        if proc.returncode == 0:
            logger.info(f"Garment {gid} segmented successfully")
        else:
            logger.error(f"Garment {gid} failed: {proc.stderr[-500:]}")


if __name__ == "__main__":
    main()
