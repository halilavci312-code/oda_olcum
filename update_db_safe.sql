-- 1. Eksik Sütunları Güvenle Ekle (Hata Almamak İçin Kontrollü)
DO $$ 
BEGIN 
    -- customer_name ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='customer_name') THEN
        ALTER TABLE public.measurements ADD COLUMN customer_name text;
    END IF;

    -- room_type ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='room_type') THEN
        ALTER TABLE public.measurements ADD COLUMN room_type text;
    END IF;

    -- photo_url ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='photo_url') THEN
        ALTER TABLE public.measurements ADD COLUMN photo_url text;
    END IF;

    -- dimensions ekle (genislik x yukseklik verisi buraya gelecek)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='dimensions') THEN
        ALTER TABLE public.measurements ADD COLUMN dimensions text;
    END IF;

    -- Mevcut user_id sütununu opsiyonel (NULL) yap (Çünkü müşteriler giriş yapmadan gönderecek)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='user_id') THEN
        ALTER TABLE public.measurements ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- 2. RLS Politikalarını Yeni Sisteme Göre Güncelle
-- Önce eski politikaları temizleyelim (Varsa)
DROP POLICY IF EXISTS "Users can only insert their own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can only view their own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Herkes ölçüm ekleyebilir" ON public.measurements;
DROP POLICY IF EXISTS "Sadece adminler ölçümleri görebilir" ON public.measurements;

-- Yeni politikaları ekle
CREATE POLICY "Herkes ölçüm ekleyebilir" ON public.measurements
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Sadece adminler ölçümleri görebilir" ON public.measurements
    FOR SELECT USING (auth.role() = 'authenticated');
