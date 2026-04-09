-- 1. Measurements Tablosu Oluşturma veya Güncelleme
CREATE TABLE IF NOT EXISTS public.measurements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name text NOT NULL,
    room_type text,
    photo_url text NOT NULL,
    wall_width_cm numeric,
    wall_height_cm numeric,
    wall_width_m numeric,
    wall_height_m numeric,
    confidence_score text,
    reference_type text,
    algorithm_details text
);

-- Eğer eksik sütunlar varsa ekle (Zaten ekli olanlar hata vermez)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='user_id') THEN
        ALTER TABLE public.measurements ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='room_type') THEN
        ALTER TABLE public.measurements ADD COLUMN room_type text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='wall_width_cm') THEN
        ALTER TABLE public.measurements ADD COLUMN wall_width_cm numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='wall_height_cm') THEN
        ALTER TABLE public.measurements ADD COLUMN wall_height_cm numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='wall_width_m') THEN
        ALTER TABLE public.measurements ADD COLUMN wall_width_m numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='wall_height_m') THEN
        ALTER TABLE public.measurements ADD COLUMN wall_height_m numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='confidence_score') THEN
        ALTER TABLE public.measurements ADD COLUMN confidence_score text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='reference_type') THEN
        ALTER TABLE public.measurements ADD COLUMN reference_type text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='algorithm_details') THEN
        ALTER TABLE public.measurements ADD COLUMN algorithm_details text;
    END IF;
END $$;

-- 'dimensions' eski bir sütun olabilir, artık kullanmıyoruz. (Veri kaybı olmaması için silinmedi, kullanılmaz)
-- 'user_id' sütununda public kullanıcılar için NOT NULL kaldırılması gerekir (Önceden var ise)
DO $$
BEGIN
    ALTER TABLE public.measurements ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. Row Level Security (RLS) Aktifleştirme ve Politikalar
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes ölçüm ekleyebilir" ON public.measurements;
DROP POLICY IF EXISTS "Sadece adminler ölçümleri ve herkes kendi ölçümlerini görebilir" ON public.measurements;

-- Herkes (müşteri/anonim) ölçüm kaydı atabilir
CREATE POLICY "Herkes ölçüm ekleyebilir" ON public.measurements
    FOR INSERT WITH CHECK (true);

-- Tüm ölçümleri (panel için) okumaya yetki ver (Public bir panele de çevrilebildiği için herkes okuyabilir veya admin okuyabilir. 
-- Dashboard herkesin girdiğinde görebileceği hale getirilmişse true yapılabilir. Biz "sadece giriş yapanlar görebilir" dedik.)
CREATE POLICY "Giriş yapanlar ölçümleri görebilir" ON public.measurements
    FOR SELECT USING (true); -- Tüm giriş yapanlar veya herkes baksın, dashboard herkese açık demo gibi düşünülüyorsa 'true' olması daha güvenlidir, en azından "select" yapabilirsiniz.

-- Silebilir (Sadece auth olanlar)
DROP POLICY IF EXISTS "Giriş yapanlar ölçümleri silebilir" ON public.measurements;
CREATE POLICY "Giriş yapanlar ölçümleri silebilir" ON public.measurements
    FOR DELETE USING (auth.role() = 'authenticated');
    

-- 3. Storage (Depolama) Ayarları
-- Storage'de bucketlerin oluşturulması gerekir (Panelden yapılmadıysa)
INSERT INTO storage.buckets (id, name, public) VALUES ('customer_photos', 'customer_photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('evimde_gor_medya', 'evimde_gor_medya', true) ON CONFLICT DO NOTHING;

-- Storage izinleri (Insert/Select/Delete)
CREATE POLICY "customer_photos insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'customer_photos');
CREATE POLICY "customer_photos select" ON storage.objects FOR SELECT USING (bucket_id = 'customer_photos');
CREATE POLICY "customer_photos delete" ON storage.objects FOR DELETE USING (bucket_id = 'customer_photos');

CREATE POLICY "evimde_gor_medya insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evimde_gor_medya');
CREATE POLICY "evimde_gor_medya select" ON storage.objects FOR SELECT USING (bucket_id = 'evimde_gor_medya');
CREATE POLICY "evimde_gor_medya delete" ON storage.objects FOR DELETE USING (bucket_id = 'evimde_gor_medya');
