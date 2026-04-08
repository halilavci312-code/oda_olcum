STDOUT: from fastapi import FastAPI, File, UploadFile
import uvicorn, cv2, numpy as np, io
from PIL import Image
from fastapi.responses import JSONResponse

app = FastAPI()

A4_LONG, A4_SHORT = 29.7, 21.0
CARD_LONG, CARD_SHORT = 8.56, 5.40

def order_points(pts):
    pts = pts.reshape(4,2).astype("float32")
    s = pts.sum(axis=1); diff = np.diff(pts,axis=1)
    return np.array([pts[np.argmin(s)],pts[np.argmin(diff)],pts[np.argmax(s)],pts[np.argmax(diff)]],dtype="float32")

def calc_ppc(contour, long_cm, short_cm):
    rect = order_points(contour)
    tl,tr,br,bl = rect
    top=np.linalg.norm(tr-tl); bottom=np.linalg.norm(br-bl)
    left=np.linalg.norm(bl-tl); right=np.linalg.norm(br-tr)
    al=(max(top,bottom)+max(left,right))/2
    as_=(min(top,bottom)+min(left,right))/2
    if al<as_: al,as_=as_,al
    return (al/long_cm+as_/short_cm)/2

def find_rect(img, ratio_min, ratio_max, area_min_pct, area_max_pct):
    img_area = img.shape[0]*img.shape[1]
    cands = []
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray,(7,7),0)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    masks = []
    for lo,hi in [(10,50),(30,90),(60,150),(100,220)]:
        e = cv2.Canny(blur,lo,hi)
        masks.append(cv2.dilate(e,np.ones((3,3)),iterations=2))
    masks.append(cv2.adaptiveThreshold(blur,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,11,2))
    _,b=cv2.threshold(blur,160,255,cv2.THRESH_BINARY); masks.append(b)
    _,b2=cv2.threshold(blur,160,255,cv2.THRESH_BINARY_INV); masks.append(b2)
    sat=cv2.inRange(hsv,(0,40,40),(180,255,255))
    masks.append(cv2.dilate(sat,np.ones((5,5)),iterations=3))
    for m in masks:
        cnts,_=cv2.findContours(m,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts:
            area=cv2.contourArea(c)
            if area<img_area*area_min_pct or area>img_area*area_max_pct: continue
            peri=cv2.arcLength(c,True)
            approx=cv2.approxPolyDP(c,0.05*peri,True)
            if len(approx)!=4: continue
            r=cv2.minAreaRect(approx); w,h=r[1]
            if w==0 or h==0: continue
            ratio=max(w,h)/min(w,h)
            if ratio_min<=ratio<=ratio_max:
                cands.append((area,approx))
    if not cands: return None
    cands.sort(key=lambda x:x[0],reverse=True)
    return cands[0][1]

@app.post("/api/olcum")
async def olcum_yap(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img = cv2.cvtColor(np.array(image),cv2.COLOR_RGB2BGR)
        ih,iw = img.shape[:2]
        ref_type = None
        ppc = None
        card = find_rect(img,1.4,1.7,0.0001,0.30)
        if card is not None:
            ppc = calc_ppc(card,CARD_LONG,CARD_SHORT)
            ref_type = "kredi_karti"
        if ppc is None or ppc<=0:
            a4 = find_rect(img,1.2,1.6,0.005,0.90)
            if a4 is not None:
                ppc = calc_ppc(a4,A4_LONG,A4_SHORT)
                ref_type = "a4_kagit"
        if ppc is None or ppc<=0:
            return JSONResponse(content={"durum":"hata","mesaj":"Referans nesne bulunamadi. Kredi karti veya A4 kagit koyun."})
        genislik = round(float(iw)/ppc,1)
        yukseklik = round(float(ih)/ppc,1)
        return JSONResponse(content={"durum":"success","genislik_cm":genislik,"yukseklik_cm":yukseklik,"birim":"cm","referans_nesne":ref_type,"pixels_per_cm":round(float(ppc),3)})
    except Exception as e:
        return JSONResponse(content={"durum":"hata","mesaj":str(e)},status_code=500)

@app.get("/saglik")
def saglik():
    return {"durum":"aktif","versiyon":"4.0"}

if __name__ == "__main__":
    uvicorn.run(app,host="0.0.0.0",port=9000)

