# KZN Surf Facebook Capture

This is a local, user-driven helper for collecting permitted surf-photo references
from a Facebook group into the KZN Surf project.

It does not log in for you, store Facebook cookies, automate scrolling, or bypass
private-group access. Use it only for photos that the group rules and posters
allow you to save for this project.

## Run

```bash
python3 tools/facebook-capture/capture_server.py
```

Open the dashboard shown in the terminal, normally:

```text
http://127.0.0.1:8765
```

Drag the **Capture visible surf photos** button to your browser bookmarks bar.

## Capture Batches

1. Keep the local server running.
2. Open Facebook in your normal browser session.
3. Go to the Skinny Surfers Durban group, a group media page, or an individual
   photo viewer.
4. Manually scroll until the permitted surf photos are visible.
5. Click the bookmarklet.
6. Add a short batch note, such as `North Beach morning posts`.
7. Repeat in batches.

If Facebook blocks direct local saving, the bookmarklet copies a JSON batch to
your clipboard. Paste it into the dashboard's fallback box.

## Output

Captured records are saved under:

```text
data/facebook-capture/
```

Important files:

- `photos.csv` - one row per captured photo candidate.
- `captures.jsonl` - the same records in JSON Lines format.
- `images/` - downloaded image files, when the signed image URL can be fetched.

Useful columns for the weather-matching step:

- `captured_at` - when you ran the capture.
- `raw_time_text` - visible Facebook time text if the page exposed it.
- `batch_note` - your note for the batch.
- `post_url` - source post/photo link.
- `local_path` - downloaded image path when available.

Facebook timestamps can be vague on list pages. For the best weather match, open
individual posts/photos when possible so the exact date/time is visible before
running the bookmarklet.
