"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type MeasurementUnit = "metric" | "imperial";
type Language = "tr" | "en";

interface SettingsContextType {
  measurementUnit: MeasurementUnit;
  setMeasurementUnit: (unit: MeasurementUnit) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  tr: {
    "settings.title": "Ayarlar",
    "measurement.panel": "Ölçüm Paneli",
    "measurement.title.1": "Pratik",
    "measurement.title.2": "Alan",
    "measurement.title.3": "Ölçümü",
    "measurement.desc": "Fotoğrafınızı yükleyin, duvarın 4 köşesini seçin. Yapay zeka ortalama %90 doğruluk payıyla (±10-15 cm sapma payı olabilir) saniyeler içinde alanınızı hesaplasın.",
    "measurement.upload_rules": "Doğru Ölçüm İçin Fotoğraf Kuralları",
    "measurement.history": "Geçmiş Ölçümlerim",
    "common.width": "En",
    "common.height": "Boy",
    "measurement.customer_name": "Müşteri Adı - Soyadı",
    "measurement.upload_photo": "Fotoğraf Yükle",
    "measurement.select_corners": "Köşeleri Seçin",
    "measurement.corners_selected": "Seçildi",
    "measurement.choose_different": "Farklı Görsel Seç",
    "measurement.clear": "Temizle",
    "measurement.calculate": "Hesapla",
    "measurement.analyzing": "Yapay Zeka Analiz Ediyor...",
    "measurement.completed": "Ölçüm Tamamlandı"
  },
  en: {
    "settings.title": "Settings",
    "measurement.panel": "Measurement Panel",
    "measurement.title.1": "Practical",
    "measurement.title.2": "Area",
    "measurement.title.3": "Measurement",
    "measurement.desc": "Upload your photo, select the 4 corners of the wall. AI will calculate your area in seconds with an average accuracy of 90% (±10-15 cm margin of error).",
    "measurement.upload_rules": "Photography Rules for Accurate Measurement",
    "measurement.history": "My Measurement History",
    "common.width": "Width",
    "common.height": "Height",
    "measurement.customer_name": "Customer Full Name",
    "measurement.upload_photo": "Upload Photo",
    "measurement.select_corners": "Select Corners",
    "measurement.corners_selected": "Selected",
    "measurement.choose_different": "Select Different Image",
    "measurement.clear": "Clear",
    "measurement.calculate": "Calculate",
    "measurement.analyzing": "AI is Analyzing...",
    "measurement.completed": "Measurement Completed"
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>("metric");
  const [language, setLanguage] = useState<Language>("tr");

  useEffect(() => {
    const savedUnit = localStorage.getItem("measurementUnit") as MeasurementUnit | null;
    const savedLang = localStorage.getItem("language") as Language | null;
    
    if (savedUnit) setMeasurementUnit(savedUnit);
    if (savedLang) setLanguage(savedLang);
  }, []);

  const handleSetMeasurementUnit = (unit: MeasurementUnit) => {
    setMeasurementUnit(unit);
    localStorage.setItem("measurementUnit", unit);
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string) => {
    const translation = translations[language];
    return (translation as any)[key] || key;
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        measurementUnit, 
        setMeasurementUnit: handleSetMeasurementUnit, 
        language, 
        setLanguage: handleSetLanguage,
        t
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
