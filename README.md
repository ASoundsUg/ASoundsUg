# ASounds Standalone Music Hub

This version makes ASounds an independent music-discovery website. It does **not** describe itself as an extension of another website. The source site is shown only as the first listening button on each song page, alongside YouTube.

## What is included

- `index.html` — ASounds homepage
- `song.html` — strong individual song page with cover art, artist, genre, long description and streaming buttons
- `admin.html` — private content-entry form
- `style.css` — responsive design
- `apps-script.gs` — free Google Sheets backend

## Song page design

Each release gets:

1. Cover artwork
2. Genre
3. Song title
4. Artist
5. Added date
6. Long, multi-paragraph description
7. **STREAM THE SONG ON MUSIC STORES**
8. GandiWave button
9. YouTube button

There is no download/play section on ASounds.

## Automatic cover retrieval

When you paste a GandiWave song URL into the admin form and press **Fetch from URL**, the Apps Script tries to read:

- Open Graph cover image (`og:image`)
- Page title
- Description
- Artist
- Genre
- YouTube URL if one is present in the source page

The cover image is referenced from its original public URL; ASounds does not copy or host the image.

If automatic retrieval does not work for a particular page, you can paste the cover image URL manually.

## Setup

1. Create a Google Sheet named `ASounds`.
2. Open **Extensions → Apps Script**.
3. Paste `apps-script.gs`.
4. Change `ADMIN_KEY` to a long private secret.
5. Run `setup()` once and authorize the script.
6. Deploy → New deployment → Web app.
7. Execute as **Me**.
8. Set access to **Anyone**.
9. Copy the `/exec` URL.
10. Replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` in:
   - `index.html`
   - `song.html`
   - `admin.html`
11. Upload the files to your GitHub repository.
12. GitHub Pages should publish from the `main` branch and `/ (root)`.

## Adding releases

Open:

`https://YOUR-GITHUB-PAGES-DOMAIN/admin.html`

Paste the song page URL and press **Fetch from URL**. Review everything, write/edit the description, enter a YouTube URL if necessary, enter your private admin key, and publish.

## Important SEO note

ASounds is presented as its own music discovery hub. Avoid stuffing descriptions with repeated search phrases. Write useful, human descriptions with real information about the song, artist, sound, production, release context and message.

