-- 1. Measurements Tablosu Oluşturma
CREATE TABLE IF NOT EXISTS public.measurements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name text NOT NULL,
    room_type text CHECK (room_type IN ('Salon', 'Düz Oda')),
    photo_url text NOT NULL,
    dimensions text
);

-- 2. Row Level Security (RLS) Aktifleştir
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- 3. Veritabanı Politikaları
-- Herkes (Müşteri) ölçüm gönderebilir
CREATE POLICY "Herkes ölçüm ekleyebilir" ON public.measurements
    FOR INSERT WITH CHECK (true);

-- Sadece giriş yapmış kullanıcılar (Admin) ölçümleri görebilir
CREATE POLICY "Sadece adminler ölçümleri görebilir" ON public.measurements
    FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Storage (Depolama) Ayarları
-- Bu kısım Supabase Storage panelinde 'customer_photos' adında 'PUBLIC' bir bucket açmanızı gerektirir.
-- Aşağıdaki politikalar panelden elle de ayarlanabilir:

-- Herkes fotoğraf yükleyebilir
CREATE POLICY "Herkes fotoğraf yükleyebilir" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'customer_photos');

-- Herkes fotoğrafları görebilir (Admin panelinde görüntülemek için)
CREATE POLICY "Herkes fotoğrafları görebilir" ON storage.objects
    FOR SELECT USING (bucket_id = 'customer_photos');
