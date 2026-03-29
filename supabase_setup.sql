-- Supabase SQL Editor: Measurements Table Setup
-- Bu kodu Supabase panelinizde "SQL Editor" sekmesine kopyalayıp çalıştırın (RUN).

-- 1. Measurements tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text,
  wall_width_cm numeric NOT NULL,
  wall_height_cm numeric NOT NULL,
  wall_width_m numeric NOT NULL,
  wall_height_m numeric NOT NULL,
  confidence_score text NOT NULL,
  reference_type text NOT NULL,
  algorithm_details text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Row Level Security (RLS) Aktifleştir
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- 3. Güvenlik Politikaları (Kullanıcılar sadece kendi ölçümlerini görebilir ve silebilir)
CREATE POLICY "Users can only insert their own measurements"
  ON public.measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only view their own measurements"
  ON public.measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own measurements"
  ON public.measurements FOR DELETE
  USING (auth.uid() = user_id);

-- Başarılı: Artık sisteminiz "measurements" tablosuna güvenli bir şekilde kayıt atabilir!
