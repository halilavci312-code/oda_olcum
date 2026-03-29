# Proje: Yapay Zeka Destekli Mobilya Ölçüm Arayüzü ve API Entegrasyonu

## 1. Sistemin Çalışma Mantığı ve Mimari
1. **Frontend (Kullanıcı Arayüzü):** Kullanıcı siteye girer, galeriden fotoğraf seçer veya çeker. Site bu fotoğrafı **Base64** formatına çevirir.
2. **Backend (Hostinger API):** Frontend, bu Base64 verisini Hostinger'da kurulacak olan API'ye (FastAPI) POST eder.
3. **İşlem (Python/YOLO/OpenCV):** Hostinger'daki model fotoğrafı işler ve nesnelerin ölçülerini hesaplar.
4. **Çıktı (Response):** API, frontend'e JSON formatında şu çıktıyı döner: `{"genislik": "120cm", "yukseklik": "80cm"}`
5. **Otomasyon (n8n):** Çıkan ölçüm verileri bir Webhook üzerinden n8n'e gönderilir. n8n bunu Google Sheets'e kaydeder. (API yapısı ileride WhatsApp/Telegram botlarından gelecek Base64 fotoğrafları da kabul edecek esneklikte olmalıdır).

## 2. Kullanılacak Teknolojiler
* **Frontend:** HTML, Tailwind CSS, Vanilla JS
* **Backend:** Python, FastAPI, OpenCV, YOLO (Hostinger üzerinde)
* **Otomasyon:** n8n, Google Sheets API

## 3. Geliştirme Fazları (Phases)

### Faz 1: Backend API'nin Kurulması (Hostinger)
- Mevcut terminal tabanlı YOLO/OpenCV kodunu bir FastAPI uygulamasına entegre et.
- Gelen Base64 verisini okuyacak, işleyecek ve JSON formatında (Genişlik/Yükseklik) yanıt dönecek bir `/api/measure` POST uç noktası (endpoint) oluştur.
- Sunucuda uygulamanın sürekli çalışması için gerekli port/uvicorn ayarlarını yapılandır.

### Faz 2: Statik Arayüz (Frontend) Tasarımı
- Mobil uyumlu, kullanıcı dostu bir fotoğraf yükleme alanı tasarla.
- Yüklenen fotoğrafı Base64'e çeviren JavaScript fonksiyonunu yaz.
- İşlem sırasındaki bekleme animasyonlarını (Yükleniyor...) ekle.

### Faz 3: Frontend ve Backend Entegrasyonu
- Frontend'den API'ye (Fetch/Axios ile) istek atılmasını sağla.
- API'den dönen ölçüm sonuçlarını arayüzde göster.

### Faz 4: n8n ve Google Sheets Entegrasyonu
- Ölçüm tamamlandıktan sonra verileri n8n Webhook URL'sine POST eden eklemeyi backend'e yaz.