-- ============================================================
-- 045 — Update landing page contact information
-- ============================================================

update public.website_content
set
  content = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            content,
            '{contact,chatLabel}',
            to_jsonb('Chat with Sales'::text),
            true
          ),
          '{contact,chatUrl}',
          to_jsonb('http://m.me/1235198083015833'::text),
          true
        ),
        '{contact,email}',
        to_jsonb('ilaganjimmlyod@gmail.com'::text),
        true
      ),
      '{contact,phone}',
      to_jsonb('0962 866 1920'::text),
      true
    ),
    '{contact,note}',
    to_jsonb('Tell us what you need and our team will get back to you within 24 hours.'::text),
    true
  ),
  updated_at = now()
where slug = 'landing';
