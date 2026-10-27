ARCHIVE ADMIN UPDATES

Added:
- Edit existing track metadata (title, artist, genre, BPM, key, release date).
- Optional audio replacement while editing; leaving the audio field empty keeps the current file.
- Optional artwork replacement or a checkbox to remove existing artwork.
- Batch upload of multiple audio files.
- Batch defaults for artist, genre, and release date.
- Optional batch artwork matched by filename stem (for example, LOCA.mp3 matches LOCA.jpg).
- Per-file batch progress and a summary of failed uploads.
- Worker PATCH /api/tracks/:id endpoint with admin-password protection and cleanup of replaced media files.

DEPLOYMENT
1. Replace public/admin/index.html and src/index.js in your existing project with the versions in this package.
2. Commit and push the changes to the GitHub repository connected to your Cloudflare deployment, then wait for a successful deployment.
3. If your project is not configured for automatic Git deployments, deploy it using the same Cloudflare/Wrangler method you originally used. Do not create a new R2 bucket or change existing bindings just for this update.
4. Visit /admin/ on your site and test editing a track before trying a larger batch.

Batch upload notes:
- Supported audio extensions: MP3, WAV, FLAC, M4A, AAC, OGG.
- Supported artwork extensions: JPG, JPEG, PNG, WEBP, GIF.
- Audio filename (without extension) becomes the title. Underscores and hyphens are converted to spaces.
- BPM and key are left blank for batch-created tracks so you can fill them in later using EDIT.
- Artwork is matched by filename, ignoring extension and capitalization.
- Files upload sequentially to make progress visible. Large batches may take some time.
