-- Migration 003: Add banner_url column to events table for event media/banner uploads.

ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url TEXT;

COMMENT ON COLUMN events.banner_url IS 'Public URL of the event banner image hosted on Cloudinary or external storage.';

