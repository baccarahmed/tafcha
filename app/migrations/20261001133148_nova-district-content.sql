CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'PRODUCT' CHECK (type IN ('CATEGORY', 'PRODUCT')),
  targets jsonb NOT NULL DEFAULT '["*"]'::jsonb,
  percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (percentage > 0 AND percentage <= 100),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  announcement_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  hero_title text,
  hero_subtitle text,
  hero_image text,
  hero_video text,
  site_bg_color text,
  site_panel_color text,
  featured_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  featured_limit integer NOT NULL DEFAULT 3,
  about_text text,
  contact_email text,
  contact_phone text,
  contact_address text,
  social_instagram text,
  social_facebook text,
  social_twitter text,
  social_youtube text,
  newsletter_enabled boolean NOT NULL DEFAULT true,
  maintenance_mode boolean NOT NULL DEFAULT false,
  announcement_enabled boolean NOT NULL DEFAULT true,
  announcement_text jsonb NOT NULL DEFAULT '[]'::jsonb,
  announcement_bg_color text,
  announcement_text_color text,
  animated_background boolean NOT NULL DEFAULT false,
  animated_blur text,
  free_shipping_threshold_dnt numeric(12,2),
  shipping_cost_dnt numeric(12,2),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);