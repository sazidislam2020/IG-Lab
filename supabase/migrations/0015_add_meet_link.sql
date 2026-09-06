-- Add meet_link column to live_classes for external video call links
-- (Google Meet, Zoom, or any meeting URL)
ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS meet_link TEXT;

-- Update RLS to allow hosts to set meet_link
-- (existing policies already cover this since hosts can update their own classes)
