from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn, cv2, numpy as np, io, json, logging
from PIL import Image
from fastapi.responses import JSONResponse
from typing import Optional

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Referans Nesne Boyutlari (cm) ──────────────────────────────────────────
A4_LONG, A4_SHORT = 29.7, 21.0
CARD_LONG, CARD_SHORT = 8.56, 5.40

# Oran Araliklari
A4_RATIO_MIN, A4_RATIO_MAX = 1.30, 1.50
CARD_RATIO_MIN, CARD_RATIO_MAX = 1.50, 1.75

# Alan yüzde araliklari
A4_AREA_MIN, A4_AREA_MAX = 0.003, 0.40
CARD_AREA_MIN, CARD_AREA_MAX = 0.0001, 0.05

def order_points(pts):
    pts = pts.reshape(4, 2).astype("float32")
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    return np.array([
        pts[np.argmin(s)],
        pts[np.argmin(diff)],
        pts[np.argmax(s)],
        pts[np.argmax(diff)]
    ], dtype="float32")

def find_rect(img, ratio_min, ratio_max, area_min_pct, area_max_pct):
    img_area = img.shape[0] * img.shape[1]
    cands = []
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (7, 7), 0)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    masks = []

    for lo, hi in [(10, 50), (30, 90), (60, 150), (100, 220)]:
        e = cv2.Canny(blur, lo, hi)
        masks.append(cv2.dilate(e, np.ones((3, 3)), iterations=2))

    masks.append(cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2))
    
    _, b = cv2.threshold(blur, 160, 255, cv2.THRESH_BINARY)
    masks.append(b)
    _, b2 = cv2.threshold(blur, 160, 255, cv2.THRESH_BINARY_INV)
    masks.append(b2)
    _, b3 = cv2.threshold(blur, 200, 255, cv2.THRESH_BINARY)
    masks.append(b3)
    _, b4 = cv2.threshold(blur, 120, 255, cv2.THRESH_BINARY)
    masks.append(b4)

    sat = cv2.inRange(hsv, (0, 40, 40), (180, 255, 255))
    masks.append(cv2.dilate(sat, np.ones((5, 5)), iterations=3))

    white_mask = cv2.inRange(hsv, (0, 0, 180), (180, 50, 255))
    masks.append(cv2.dilate(white_mask, np.ones((5, 5)), iterations=2))

    for m in masks:
        cnts, _ = cv2.findContours(m, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts:
            area = cv2.contourArea(c)
            if area < img_area * area_min_pct or area > img_area * area_max_pct:
                continue

            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.05 * peri, True)
            if len(approx) != 4:
                continue

            r = cv2.minAreaRect(approx)
            w, h = r[1]
            if w == 0 or h == 0:
                continue

            ratio = max(w, h) / min(w, h)
            if ratio_min <= ratio <= ratio_max:
                rect_area = w * h
                fill_ratio = area / rect_area if rect_area > 0 else 0
                score = area * fill_ratio
                cands.append((score, approx, area, ratio, fill_ratio))

    if not cands: return None
    cands.sort(key=lambda x: x[0], reverse=True)
    best = cands[0]
    return best[1]

def process_homography(img, corners, ref_contour, real_long, real_short):
    """
    Homography (perspektif yamulmayi duzeltme) ile olcum yapar.
    Sadece basit oran oranti yapmaz, acili cekimleri tolere eder.
    """
    ordered_ref = order_points(ref_contour)
    tl, tr, br, bl = ordered_ref

    w1 = np.linalg.norm(tr - tl)
    h1 = np.linalg.norm(bl - tl)

    # Kagit dikey mi yatay mi karar ver
    if w1 < h1:
        real_w, real_h = real_short, real_long
    else:
        real_w, real_h = real_long, real_short

    # İdeal dikdörtgen (Gerçek boyutlar: Santimetre)
    dst_pts = np.array([
        [0, 0],
        [real_w, 0],
        [real_w, real_h],
        [0, real_h]
    ], dtype="float32")

    # M = Perspektif Donusum Matrisi (Piksellerden gercek dunya santimetrelerine gecis koprusu)
    M = cv2.getPerspectiveTransform(ordered_ref, dst_pts)

    # Olculecek asil hedefleri sec:
    if corners and len(corners) == 4:
        # Kullanici kose secmisse bunlari kullan
        pts = np.array(corners, dtype="float32")
        ordered_wall = order_points(pts)
    else:
        # Kullanici kose secmedigse resmin tamamini duvar farzet
        ih, iw = img.shape[:2]
        ordered_wall = np.array([[0,0], [iw,0], [iw,ih], [0,ih]], dtype="float32")

    # Wall piksellerini gercek dunya cm karsiliklarina cevir
    real_wall_pts = cv2.perspectiveTransform(ordered_wall.reshape(1, 4, 2), M)[0]

    # Artik pikseller cm oldu. Noktalar arasi gercek mesafeyi hesapla
    wt = np.linalg.norm(real_wall_pts[1] - real_wall_pts[0])
    wb = np.linalg.norm(real_wall_pts[2] - real_wall_pts[3])
    hl = np.linalg.norm(real_wall_pts[3] - real_wall_pts[0])
    hr = np.linalg.norm(real_wall_pts[2] - real_wall_pts[1])

    # Ortalamalari al
    final_w = (wt + wb) / 2
    final_h = (hl + hr) / 2
    
    # Ortalama PPC hesapla (Guven skoru icin)
    ppc_avg = ((w1/real_w) + (h1/real_h)) / 2

    return float(round(final_w, 1)), float(round(final_h, 1)), float(ppc_avg)

@app.post("/api/olcum")
async def olcum_yap(
    file: UploadFile = File(...),
    duvar_koseler: Optional[str] = Form(None)
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        ih, iw = img.shape[:2]

        corners = []
        if duvar_koseler:
            try:
                corners = json.loads(duvar_koseler)
            except json.JSONDecodeError:
                pass

        ref_type = None
        genislik = yukseklik = ppc = 0
        aciklama = ""

        # A4 ARA
        a4 = find_rect(img, A4_RATIO_MIN, A4_RATIO_MAX, A4_AREA_MIN, A4_AREA_MAX)
        if a4 is not None:
            genislik, yukseklik, ppc = process_homography(img, corners, a4, A4_LONG, A4_SHORT)
            ref_type = "a4_kagit"
            aciklama = "A4 Kagit Algilandi (Homography 3D Perspektif dogrulamasi yapildi)."
            
        # KREDI KARTI ARA
        if ref_type is None:
            card = find_rect(img, CARD_RATIO_MIN, CARD_RATIO_MAX, CARD_AREA_MIN, CARD_AREA_MAX)
            if card is not None:
                genislik, yukseklik, ppc = process_homography(img, corners, card, CARD_LONG, CARD_SHORT)
                ref_type = "kredi_karti"
                aciklama = "Kredi Karti Algilandi (Homography 3D Perspektif dogrulamasi yapildi)."
                
        # A4 GENIS ARAMA (Fallback)
        if ref_type is None:
            a4_wide = find_rect(img, 1.20, 1.60, 0.001, 0.50)
            if a4_wide is not None:
                genislik, yukseklik, ppc = process_homography(img, corners, a4_wide, A4_LONG, A4_SHORT)
                ref_type = "a4_kagit"
                aciklama = "A4 Kagit (Genis Arama) (Perspektif duzeltildi)."

        if ref_type is None:
            return JSONResponse(content={
                "durum": "hata",
                "mesaj": "Referans nesne bulunamadi. Kredi karti veya A4 kagit koyun.",
                "cozum": "A4 kagidi duvara duz yapistirin, nesnenin egik de olsa net ciktigindan emin olun."
            })

        if ppc > 8:
            guven = "yuksek"
        elif ppc > 3:
            guven = "orta"
        else:
            guven = "dusuk"

        return JSONResponse(content={
            "durum": "success",
            "genislik_cm": genislik,
            "yukseklik_cm": yukseklik,
            "birim": "cm",
            "referans_nesne": ref_type,
            "pixels_per_cm": float(round(float(ppc), 3)),
            "aciklama": aciklama,
            "guven_skoru": guven
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"durum": "hata", "mesaj": str(e)}, status_code=500)

@app.get("/saglik")
def saglik(): return {"durum": "aktif", "versiyon": "6.0"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)
