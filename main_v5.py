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
A4_LONG, A4_SHORT = 29.7, 21.0    # A4 en-boy orani: 1.414
CARD_LONG, CARD_SHORT = 8.56, 5.40  # Kredi karti en-boy orani: 1.585

# ── Oran Araliklari (CAKISMAYAN) ───────────────────────────────────────────
# A4:  1.30 - 1.50  (gercek: 1.414)
# Kart: 1.50 - 1.75 (gercek: 1.585)
A4_RATIO_MIN, A4_RATIO_MAX = 1.30, 1.50
CARD_RATIO_MIN, CARD_RATIO_MAX = 1.50, 1.75

# ── Alan yüzde araliklari ──────────────────────────────────────────────────
# A4 kagit genelde daha buyuk gorunur (resmin %0.5 - %40'i)
# Kredi karti genelde daha kucuk gorunur (resmin %0.01 - %5'i)
A4_AREA_MIN, A4_AREA_MAX = 0.003, 0.40
CARD_AREA_MIN, CARD_AREA_MAX = 0.0001, 0.05


def order_points(pts):
    """4 noktayi sirayla duz: sol-ust, sag-ust, sag-alt, sol-alt"""
    pts = pts.reshape(4, 2).astype("float32")
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    return np.array([
        pts[np.argmin(s)],
        pts[np.argmin(diff)],
        pts[np.argmax(s)],
        pts[np.argmax(diff)]
    ], dtype="float32")


def calc_ppc(contour, long_cm, short_cm):
    """Piksel-basina-cm hesapla"""
    rect = order_points(contour)
    tl, tr, br, bl = rect
    top = np.linalg.norm(tr - tl)
    bottom = np.linalg.norm(br - bl)
    left = np.linalg.norm(bl - tl)
    right = np.linalg.norm(br - tr)

    al = (max(top, bottom) + max(left, right)) / 2
    as_ = (min(top, bottom) + min(left, right)) / 2
    if al < as_:
        al, as_ = as_, al

    return float((al / long_cm + as_ / short_cm) / 2)


def find_rect(img, ratio_min, ratio_max, area_min_pct, area_max_pct):
    """Verilen oran ve alan araligindaki dikdortgenleri bul"""
    img_area = img.shape[0] * img.shape[1]
    cands = []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (7, 7), 0)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    masks = []

    # Canny edge detection - birden fazla esik degeri
    for lo, hi in [(10, 50), (30, 90), (60, 150), (100, 220)]:
        e = cv2.Canny(blur, lo, hi)
        masks.append(cv2.dilate(e, np.ones((3, 3)), iterations=2))

    # Adaptive threshold
    masks.append(cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2))

    # Binary thresholds
    _, b = cv2.threshold(blur, 160, 255, cv2.THRESH_BINARY)
    masks.append(b)
    _, b2 = cv2.threshold(blur, 160, 255, cv2.THRESH_BINARY_INV)
    masks.append(b2)

    # Beyaz/acik renkli nesneler icin ek threshold'lar
    _, b3 = cv2.threshold(blur, 200, 255, cv2.THRESH_BINARY)
    masks.append(b3)
    _, b4 = cv2.threshold(blur, 120, 255, cv2.THRESH_BINARY)
    masks.append(b4)

    # HSV saturation based
    sat = cv2.inRange(hsv, (0, 40, 40), (180, 255, 255))
    masks.append(cv2.dilate(sat, np.ones((5, 5)), iterations=3))

    # Beyaz nesne tespiti (A4 kagit genelde beyaz)
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
                # Dikdortgenlik skoru (ne kadar duzgun dikdortgen)
                rect_area = w * h
                fill_ratio = area / rect_area if rect_area > 0 else 0
                # Daha duzgun dikdortgenler daha yuksek skor
                score = area * fill_ratio
                cands.append((score, approx, area, ratio, fill_ratio))

    if not cands:
        return None

    # En iyi skora gore sirala
    cands.sort(key=lambda x: x[0], reverse=True)
    best = cands[0]
    logger.info(f"  Bulunan dikdortgen: alan={best[2]:.0f}px ({best[2]/img_area*100:.2f}%), oran={best[3]:.3f}, doluluk={best[4]:.3f}")
    return best[1]


def calculate_wall_from_corners(img, ppc, corners):
    """Duvar koselerinden gercek olcuyu hesapla"""
    if len(corners) != 4:
        # Koseler yoksa tum resmi olc
        ih, iw = img.shape[:2]
        return float(round(float(iw) / float(ppc), 1)), float(round(float(ih) / float(ppc), 1))

    pts = np.array(corners, dtype="float32")
    ordered = order_points(pts.reshape(4, 1, 2))
    tl, tr, br, bl = ordered

    # Ust ve alt kenar genislikleri
    top_w = np.linalg.norm(tr - tl)
    bottom_w = np.linalg.norm(br - bl)
    avg_width_px = (top_w + bottom_w) / 2

    # Sol ve sag kenar yukseklikleri
    left_h = np.linalg.norm(bl - tl)
    right_h = np.linalg.norm(br - tr)
    avg_height_px = (left_h + right_h) / 2

    width_cm = float(round(avg_width_px / ppc, 1))
    height_cm = float(round(avg_height_px / ppc, 1))

    return width_cm, height_cm


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

        logger.info(f"Gorsel alindi: {iw}x{ih} piksel")

        # Duvar koselerini parse et
        corners = []
        if duvar_koseler:
            try:
                corners = json.loads(duvar_koseler)
                logger.info(f"Duvar koseleri: {corners}")
            except json.JSONDecodeError:
                logger.warning("Duvar koseleri parse edilemedi, tum resim kullanilacak")

        # ── ONCELIKLE A4 KAGIT ARA (daha buyuk nesne, daha guvenilir) ──
        ref_type = None
        ppc = None
        aciklama = ""

        logger.info("--- A4 kagit araniyor ---")
        a4 = find_rect(img, A4_RATIO_MIN, A4_RATIO_MAX, A4_AREA_MIN, A4_AREA_MAX)
        if a4 is not None:
            ppc = calc_ppc(a4, A4_LONG, A4_SHORT)
            if ppc > 0:
                ref_type = "a4_kagit"
                aciklama = f"A4 kagit referans olarak kullanildi. PPC: {round(ppc, 3)}"
                logger.info(f"A4 kagit bulundu! PPC={ppc:.3f}")
            else:
                logger.info("A4 kagit bulundu ama PPC gecersiz")
                ppc = None

        # ── A4 BULUNAMAZSA KREDI KARTI ARA ──
        if ppc is None or ppc <= 0:
            logger.info("--- Kredi karti araniyor ---")
            card = find_rect(img, CARD_RATIO_MIN, CARD_RATIO_MAX, CARD_AREA_MIN, CARD_AREA_MAX)
            if card is not None:
                ppc = calc_ppc(card, CARD_LONG, CARD_SHORT)
                if ppc > 0:
                    ref_type = "kredi_karti"
                    aciklama = f"Kredi karti referans olarak kullanildi. PPC: {round(ppc, 3)}"
                    logger.info(f"Kredi karti bulundu! PPC={ppc:.3f}")
                else:
                    logger.info("Kredi karti bulundu ama PPC gecersiz")
                    ppc = None

        # ── GENIS ARALIKLA TEKRAR DENE (fallback) ──
        if ppc is None or ppc <= 0:
            logger.info("--- Genis aralik ile A4 araniyor (fallback) ---")
            a4_wide = find_rect(img, 1.20, 1.60, 0.001, 0.50)
            if a4_wide is not None:
                ppc = calc_ppc(a4_wide, A4_LONG, A4_SHORT)
                if ppc > 0:
                    ref_type = "a4_kagit"
                    aciklama = f"A4 kagit (genis tespit) referans olarak kullanildi. PPC: {round(ppc, 3)}"
                    logger.info(f"A4 kagit (genis aralik) bulundu! PPC={ppc:.3f}")
                else:
                    ppc = None

        if ppc is None or ppc <= 0:
            logger.warning("Hicbir referans nesne bulunamadi!")
            return JSONResponse(content={
                "durum": "hata",
                "mesaj": "Referans nesne bulunamadi. Kredi karti veya A4 kagit koyun.",
                "cozum": "A4 kagidi duvara duz yapisturin, iyi aydinlatilmis ortamda tekrar deneyin."
            })

        # ── Duvar olculerini hesapla ──
        if corners and len(corners) == 4:
            genislik, yukseklik = calculate_wall_from_corners(img, ppc, corners)
            aciklama += f" | Duvar koseleri kullanildi ({len(corners)} nokta)"
        else:
            genislik = float(round(float(iw) / float(ppc), 1))
            yukseklik = float(round(float(ih) / float(ppc), 1))
            aciklama += " | Tum gorsel olculdu (kose secilmedi)"

        # Guven skoru hesapla
        if ppc > 8:
            guven = "yuksek"
        elif ppc > 3:
            guven = "orta"
        else:
            guven = "dusuk"

        logger.info(f"SONUC: {genislik}cm x {yukseklik}cm | Referans: {ref_type} | Guven: {guven}")

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
        logger.error(f"Hata: {str(e)}")
        return JSONResponse(content={"durum": "hata", "mesaj": str(e)}, status_code=500)


@app.get("/saglik")
def saglik():
    return {"durum": "aktif", "versiyon": "5.0"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)
