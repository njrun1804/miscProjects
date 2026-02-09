#!/usr/bin/env python3
"""Fast parallel download of ECD posts using requests + BeautifulSoup + ThreadPool."""

import json
import re
import time
import logging
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://dodgeball.livejournal.com"
PROJECT_DIR = Path(__file__).parent
RAW_DIR = PROJECT_DIR / "db" / "raw_ecd_posts"
RAW_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

# Rate limiter: max 3 requests per second
_rate_lock = threading.Lock()
_last_request_times = []
MAX_RPS = 3


def rate_limited_get(url, timeout=30):
    """GET with rate limiting."""
    with _rate_lock:
        now = time.time()
        # Remove old timestamps
        _last_request_times[:] = [t for t in _last_request_times if now - t < 1.0]
        if len(_last_request_times) >= MAX_RPS:
            wait = 1.0 - (now - _last_request_times[0])
            if wait > 0:
                time.sleep(wait)
        _last_request_times.append(time.time())

    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (compatible; personal-archive-bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
    })
    return session.get(url, timeout=timeout)


def download_single_post(pid):
    """Download a single post via requests + BeautifulSoup."""
    url = f"{BASE_URL}/{pid}.html"
    try:
        resp = rate_limited_get(url)
        if resp.status_code != 200:
            return {"id": pid, "url": url, "error": f"HTTP {resp.status_code}", "source": "requests_error"}

        soup = BeautifulSoup(resp.text, 'html.parser')

        # Extract title
        title_el = soup.select_one('.aentry-post__title, .b-singlepost-title, h1.entry-title')
        title = title_el.get_text(strip=True) if title_el else ""

        # Extract body
        body_el = soup.select_one('.aentry-post__text, .b-singlepost-body, .entry-content')
        body_text = body_el.get_text(separator='\n', strip=True) if body_el else ""
        body_html = str(body_el) if body_el else ""

        # Extract date
        date_el = soup.select_one('.aentry-post__date time, .b-singlepost-date time, time.published')
        if date_el:
            date_str = date_el.get('datetime', '') or date_el.get_text(strip=True)
        else:
            date_el2 = soup.select_one('.aentry-post__date, .date')
            date_str = date_el2.get_text(strip=True) if date_el2 else ""

        # Extract comment count
        comment_el = soup.select_one('.aentry-post__comments-count, .b-singlepost-comments-count, a[href*="mode=reply"]')
        comment_text = comment_el.get_text(strip=True) if comment_el else ""

        # Extract images from body
        images = []
        if body_el:
            for img in body_el.select('img'):
                src = img.get('src', '')
                if src:
                    images.append(src)

        # Extract tags
        tags = []
        for tag_el in soup.select('.aentry-post__tags a, .ljtags a, .tag a'):
            tags.append(tag_el.get_text(strip=True))

        post = {
            "id": pid,
            "url": url,
            "title": title,
            "date": date_str,
            "body_text": body_text,
            "body_html": body_html,
            "comment_count_text": comment_text,
            "images": images,
            "tags": tags,
            "source": "requests_bs4"
        }

        # Save immediately
        post_file = RAW_DIR / f"{pid}.json"
        with open(post_file, 'w') as f:
            json.dump(post, f, indent=2)

        return post

    except Exception as e:
        return {"id": pid, "url": url, "error": str(e), "source": "requests_error"}


def main():
    index_file = RAW_DIR / "posts_index.json"
    with open(index_file) as f:
        index = json.load(f)

    post_ids = index["post_ids"]
    log.info(f"Total post IDs: {len(post_ids)}")

    # Check already downloaded
    already = set()
    for f in RAW_DIR.glob("*.json"):
        if f.stem.isdigit():
            try:
                with open(f) as fh:
                    data = json.load(fh)
                if 'error' not in data and data.get('body_text', ''):
                    already.add(int(f.stem))
            except:
                pass

    remaining = [pid for pid in post_ids if pid not in already]
    log.info(f"Already downloaded: {len(already)}, Remaining: {len(remaining)}")

    if not remaining:
        log.info("All posts already downloaded!")
        return

    # Parallel download with 4 workers
    success = 0
    errors = 0
    error_ids = []

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(download_single_post, pid): pid for pid in remaining}

        for i, future in enumerate(as_completed(futures)):
            pid = futures[future]
            try:
                result = future.result()
                if 'error' not in result:
                    success += 1
                else:
                    errors += 1
                    error_ids.append(pid)
                    log.warning(f"  Error {pid}: {result['error']}")
            except Exception as e:
                errors += 1
                error_ids.append(pid)
                log.warning(f"  Exception {pid}: {e}")

            if (i + 1) % 50 == 0:
                log.info(f"  Progress: {i+1}/{len(remaining)} ({success} OK, {errors} errors)")

    log.info(f"Download complete: {success} succeeded, {errors} errors")
    log.info(f"Total posts on disk: {len(already) + success}")

    if error_ids:
        log.info(f"Error IDs: {error_ids[:20]}{'...' if len(error_ids) > 20 else ''}")
        error_file = RAW_DIR / "download_errors.json"
        with open(error_file, 'w') as f:
            json.dump({"error_ids": error_ids, "timestamp": datetime.now().isoformat()}, f, indent=2)


if __name__ == '__main__':
    main()
