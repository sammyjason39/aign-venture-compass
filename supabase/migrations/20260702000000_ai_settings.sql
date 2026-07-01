-- Create public.ai_settings table
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode text NOT NULL DEFAULT 'full_cloud',
  ollama_url text NOT NULL DEFAULT 'http://localhost:11434',
  ollama_model text NOT NULL DEFAULT 'llama3',
  openrouter_url text NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
  openrouter_key text,
  openrouter_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone authenticated can view AI settings" ON public.ai_settings;
CREATE POLICY "Anyone authenticated can view AI settings"
  ON public.ai_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage AI settings" ON public.ai_settings;
CREATE POLICY "Admins can manage AI settings"
  ON public.ai_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.ai_settings (id, mode, ollama_url, ollama_model, openrouter_url, openrouter_key, openrouter_model)
VALUES (1, 'full_cloud', 'http://localhost:11434', 'llama3', 'https://openrouter.ai/api/v1', NULL, 'google/gemini-2.5-flash')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
