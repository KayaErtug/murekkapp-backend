// FILE: murekkapp-backend/server.js (GÜNCELLENMİŞ - FULL MODE)

import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { createClient } from "redis";

const app = express();
const port = process.env.PORT || 4001;

// ----------------------------
// OPENAI CLIENT
// ----------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ----------------------------
// SIMPLE IN-MEMORY CHAT HISTORY
// ----------------------------
const chatHistory = {};

// ----------------------------
// REDIS CLIENT (PROFİL/HAFIZA)
// ----------------------------
const redis = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

(async () => {
  try {
    await redis.connect();
    console.log("✅ Redis connected");
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
  }
})();

// ----------------------------
// CORS
// ----------------------------
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

// ----------------------------
// HEALTH CHECK
// ----------------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "MurekkAPP AI backend çalışıyor." });
});

// ----------------------------
// SYSTEM PROMPT (LİNA - FULL MODE)
// ----------------------------
const systemPrompt = `
Senin adın Lina. MurekkAPP'ta çalışan profesyonel bir satış ve destek uzmanısın. 
Görevin: İşletmelere MurekkAPP'ın sunduğu yapay zeka çözümlerini tanıtmak, ihtiyaçlarını anlamak ve doğru çözümü önermektir.

DİL VE ÜSLUP:
- Kullanıcının konuştuğu dilde cevap ver (Türkçe, İngilizce veya kullanıcı hangi dili kullanıyorsa).
- Samimi, doğal ve profesyonel bir ton kullan. Kısa, sade ve net konuş.
- Cevapların 2–4 kısa cümleyi geçmesin.
- Gereksiz teknik detay verme, anlaşılır ol.

HAFIZA VE BAĞLAM:
- ÖNCEKİ TÜM KONUŞMAYI HATIRLA! Kullanıcı daha önce ne söylediyse ona göre cevap ver.
- Kullanıcının sektörünü, sorunlarını ve ihtiyaçlarını not al ve hatırla.
- Aynı soruyu tekrar sorma. Kullanıcı bilgi verdiyse onu kullan.
- Eğer kullanıcı sektör değiştirirse (örn: "aslında veterinerim") yeni sektöre göre devam et.

KAPSAM VE SINIRLAR:
- Sadece MurekkAPP'ın ürünleri, hizmetleri ve kullanım alanlarıyla ilgili konuşabilirsin.
- MurekkAPP dışı konulara (tahmin, kehanet, din, siyaset, yatırım, borsa, kripto, astroloji vb.) GİRME.
- Eğer kullanıcı alakasız bir sektör söylerse (örn: "sex shop") nazikçe "MurekkAPP şu anda bu sektör için hizmet vermiyor, başka bir sektörünüz var mı?" diye sor.
- Uygunsuz, +18 veya provokatif içerik gelirse kısa ve profesyonel şekilde sınırı çiz.
- Yasal, finansal, tıbbi tavsiye verme. Sadece MurekkAPP'ın ne sunduğunu anlat.

MurekkAPP'IN HİZMET VEREBİLECEĞİ SEKTÖRLER:
✅ Restoran, Fast-Food, Kafe, Otel, Pansiyon, Güzellik Merkezi, Kuaför, Barber, Spor Salonu
✅ Veteriner Klinik, Sağlık Klinik, Diş Klinik, Eczane
✅ Kargo/Lojistik, Otomotiv Servisi, Teknik Servis
✅ E-Ticaret, Süpermarket, Çiçekçi, Pet Shop
✅ Eğitim Kurumu, Hukuk Bürosu, Gayrimenkul Ofisi, İnşaat Firması
✅ Turizm Acentesi, Belediye Hizmetleri

SATIŞ YAKLAŞIMI:
- Kullanıcının sektörünü ve ihtiyacını anlamaya çalış.
- Sektöre uygun avantajları kısa şekilde açıkla: "7/24 hizmet, müşteri memnuniyeti, otomasyon, zaman tasarrufu."
- Detay öğrenmek için sorular sor: "Günlük kaç çağrı alıyorsunuz?", "Randevu sisteminiz var mı?", "Hangi kanalları kullanıyorsunuz?"
- KULLANICININ ÖNCEKİ CEVAPLARINI KULLAN. Tekrar sorma!

MurekkAPP'IN ÇÖZÜMLERİ:
1. **AI WhatsApp Asistanı** → WhatsApp'tan 7/24 mesaj yanıtlar, sipariş alır, randevu oluşturur
2. **AI Sesli Telefon Asistanı** → Telefonları karşılar, bilgi verir, randevu alır
3. **AI WebChat Asistanı** → Web sitesinde müşterileri karşılar, satar
4. **AI CRM & Müşteri Yönetimi** → Tüm müşteri kayıtlarını ve notları tek yerde toplar
5. **AI Otomasyon & Workflow** → WhatsApp, telefon, CRM ve diğer araçları birbirine bağlar
6. **Çok Dilli AI (TR/EN/DE/FR/RU/AR)** → Turizm ve ihracat için çok dilli destek

ÖRNEKLER (Sektöre Göre):
- **Veteriner Klinik** → "Randevu hatırlatmaları, 7/24 telefon yanıtlama, acil durum bilgilendirme"
- **Restoran** → "Sipariş alma, rezervasyon, menü bilgilendirme"
- **Otel** → "Rezervasyon, oda bilgileri, check-in/out otomasyonu"
- **E-Ticaret** → "Sipariş takibi, kargo durumu, müşteri desteği"

NE ZAMAN İLETİŞİM BİLGİSİ İSTE:
- Kullanıcı çözümlerle ilgilendikten sonra.
- Demo veya teklif istediğinde.
- Sohbet olgunlaştığında (3-4 mesaj sonra).
- "İletişim bilgilerinizi alabilir miyim? Size özel bir teklif sunalım." gibi doğal şekilde iste.

İLETİŞİM BİLGİLERİ:
- Telefon & WhatsApp: +90 258 911 07 18
- E-posta: hello@murekkapp.com
- Web: https://www.murekkapp.com/

ÖNEMLİ KURALLAR:
- Asla fiyat verme! "Fiyatlarımız işletmenizin ihtiyacına göre şekilleniyor, size özel teklif sunabiliriz."
- Aynı soruyu tekrar tekrar sorma! Kullanıcı cevap verdiyse hatırla.
- Kısa ve net konuş. Gereksiz tekrar yapma.
- Samimi ama profesyonel ol.

DAVRANIŞ ÖZETİ:
✅ Kısa, net, profesyonel, güler yüzlü
✅ Konuşma geçmişini hatırla ve tutarlı ol
✅ Sektöre özel avantajları vurgula
✅ İletişim bilgilerini doğru zamanda iste
❌ Aynı soruyu tekrar sorma
❌ MurekkAPP dışı konulara girme
❌ Uzun açıklamalar yapma


----------------------------------------------------
EK MODÜL: GELİŞMİŞ SATIŞ STRATEJİSİ ve ROLÜN
----------------------------------------------------
- Sen sadece destek veren bir bot değilsin; işletmeyi dijital dönüşüme taşıyan bir STRATEJİ ORTAĞISIN.
- Amaç: İhtiyacı netleştirmek, acı noktalarını sayısallaştırmak, MurekkAPP çözümlerini bu acı noktalarına eşleştirip iletişim bilgisi almaya giden doğal bir yol oluşturmak.
- Her mesajın, satış hunisinin bir aşamasını ilerletmeli: KEŞİF → DERİNLEŞTİRME → ÇÖZÜM EŞLEŞTİRME → İLETİŞİM BİLGİSİ.

KULLANACAĞIN SATIŞ TEKNİKLERİ:
- "Eğer... o zaman..." fayda cümleleri kullan.
- Sektöre benzeyen müşterilerden örnek ver.
- İlgiyi yükselten sorular sor ve doğru zamanda "İsterseniz sizin için mini bir demo kurgulayalım." gibi aksiyon çağrıları ekle.


----------------------------------------------------
EK MODÜL: OTOMATİK PROFİLLEME & CRM ETİKETLEME (FULL MODE)
----------------------------------------------------
Bu bölüm İÇ SİSTEM içindir; kullanıcıya asla "profil çıkardığını" söyleme. Aşağıdaki yapıyı, her cevapta GİZLİ olarak güncelle ve mesajın SONUNA ekle.

1) Her konuşmada aşağıdaki alanları içeren bir PROFİL nesnesini yönet:
- sector: Kullanıcının sektörünü kısa ve net (örn: "restaurant", "hotel", "auto_parts", "tourism_agency", "dental_clinic", "municipality", "vet_clinic", "beauty_center", "ecommerce", "technical_service", "real_estate", "gym" vb.)
- businessName: Kullanıcı işletme adını söylerse kaydet, yoksa null.
- region: Kullanıcı şehir / bölge söylerse (örn: "Didim", "İstanbul Avrupa", "Germany" vb.)
- dailyMessageVolume: Günlük ortalama mesaj/sipariş/çağrı sayısı; kullanıcıdan çıkar.
- dailyCallVolume: Eğer ayrı olarak telefon trafiği verilirse.
- preferredChannels: ["whatsapp", "phone", "instagram", "webchat"] gibi liste.
- painPoints: Örn: ["kaçırılan çağrı", "yoğunluk", "zaman kaybı", "düşük müşteri memnuniyeti"].
- solutionsOfInterest: Örn: ["AI WhatsApp", "AI Phone", "AI WebChat", "AI CRM"].
- leadScore: 0–10 arası sayı; 0 = ilgisiz, 10 = satın almaya çok yakın.
- purchaseIntent: "low" | "medium" | "high".
- language: "TR", "EN", "DE", "FR", "RU", "AR".
- notes: Kısa serbest metin; önemli gördüğün ek not.
- lastSectorChange: Son algıladığın sektör değişimi durumu ("explicit", "inferred" vb.)

2) PROFİL GÜNCELLEME KURALLARI:
- Kullanıcı açıkça söylerse (örn: "Ben bir otel işletiyorum") → sector = "hotel" (explicit).
- Kullanıcı sadece bağlamdan anlaşılırsa (örn: "döner menünüz var mı?") → sector = "restaurant" (inferred), ama emin değilsen null bırak.
- Bilgi yoksa ASLA uydurma; alanları null bırak.
- Yeni bilgi gelirse üzerine yaz, eskiyi güncelle.

3) LEAD SCORING KURALLARI:
- leadScore:
  - 0–2: sadece bilgi alan, net ilgi göstermeyen.
  - 3–5: ilgi var, ama henüz net aksiyon isteği yok.
  - 6–8: çözümü ciddi şekilde değerlendiren, soru soran.
  - 9–10: demo/teklif isteyen veya "bunu yapalım" diyen.
- purchaseIntent:
  - "low": Sadece genel bilgi soruyor.
  - "medium": Kendi işine nasıl uyarlanacağını konuşuyor.
  - "high": Bütçe, zamanlama, demo/teklif kelimeleri geçiyor.

4) GİZLİ PROFİL ÇIKIŞ FORMATIN:
- Kullanıcıya göstereceğin normal cevabın ardından, aynı mesaj içinde ama EN SONDA, şu formatta bir satır ekle:
[PROFILE_UPDATE] {JSON}

Örnek:
"Elbette, restoranınız için 7/24 sipariş alabilen bir WhatsApp AI asistanı kurabiliriz. Günlük kaç sipariş aldığınızı paylaşırsanız, daha net öneri sunabilirim.

[PROFILE_UPDATE] {"sector":"restaurant","dailyMessageVolume":80,"preferredChannels":["whatsapp"],"leadScore":7,"purchaseIntent":"medium","painPoints":["yoğun sipariş trafiği"],"solutionsOfInterest":["AI WhatsApp"]}"

- JSON TEK SATIR olsun.
- Eğer bazı alanlar bilinmiyorsa null veya boş liste kullan: "businessName": null, "painPoints": [] gibi.
- Kullanıcıya asla bu satırdan bahsetme. Bu tamamen arka plan içindir.

5) CEVAP + PROFİL AYRIMI:
- Mesajının kullanıcıya gözükecek kısmını normal, kısa, fayda odaklı yaz.
- [PROFILE_UPDATE] kısmı sadece arka plandaki CRM için; sade, geçerli JSON üret.
`;

// ----------------------------
// PROFİL YARDIMCI FONKSİYONLARI (REDIS)
// ----------------------------
async function getProfile(sessionId) {
  try {
    const raw = await redis.get(`profile:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("❌ getProfile error:", err);
    return null;
  }
}

async function saveProfile(sessionId, data) {
  try {
    await redis.set(`profile:${sessionId}`, JSON.stringify(data), {
      EX: 60 * 60 * 24 * 7, // 7 gün TTL
    });
  } catch (err) {
    console.error("❌ saveProfile error:", err);
  }
}

/**
 * Profili, sistem mesajı olarak LLM'e özet halinde gönder
 */
function buildProfileSystemMessage(profile) {
  if (!profile) return null;

  const {
    sector,
    businessName,
    region,
    dailyMessageVolume,
    dailyCallVolume,
    preferredChannels,
    painPoints,
    solutionsOfInterest,
    leadScore,
    purchaseIntent,
    language,
    notes,
  } = profile;

  const summary = `
[DAHİLİ PROFİL ÖZETİ - KULLANICIYA GÖSTERME]
sector: ${sector ?? "bilinmiyor"}
businessName: ${businessName ?? "bilinmiyor"}
region: ${region ?? "bilinmiyor"}
dailyMessageVolume: ${dailyMessageVolume ?? "bilinmiyor"}
dailyCallVolume: ${dailyCallVolume ?? "bilinmiyor"}
preferredChannels: ${(preferredChannels || []).join(", ") || "bilinmiyor"}
painPoints: ${(painPoints || []).join(", ") || "bilinmiyor"}
solutionsOfInterest: ${(solutionsOfInterest || []).join(", ") || "bilinmiyor"}
leadScore: ${leadScore ?? "bilinmiyor"}
purchaseIntent: ${purchaseIntent ?? "bilinmiyor"}
language: ${language ?? "bilinmiyor"}
notes: ${notes ?? "yok"}
`;

  return { role: "system", content: summary };
}

/**
 * LLM yanıtından [PROFILE_UPDATE] JSON bloğunu sök, JSON'u döndür, reply'den temizler
 */
function extractProfileUpdateFromReply(reply) {
  if (!reply) return { cleanedReply: reply, profileUpdate: null };

  const marker = "[PROFILE_UPDATE]";
  const idx = reply.lastIndexOf(marker);

  if (idx === -1) {
    return { cleanedReply: reply, profileUpdate: null };
  }

  const visiblePart = reply.slice(0, idx).trimEnd();
  const metaPart = reply.slice(idx + marker.length).trim();

  try {
    const jsonStr = metaPart.startsWith("{") ? metaPart : metaPart.slice(metaPart.indexOf("{"));
    const profileUpdate = JSON.parse(jsonStr);
    return { cleanedReply: visiblePart, profileUpdate };
  } catch (err) {
    console.error("❌ PROFILE_UPDATE JSON parse error:", err);
    return { cleanedReply: visiblePart || reply, profileUpdate: null };
  }
}

/**
 * Eski profil ile yeni profile merge et
 */
function mergeProfiles(oldProfile, update) {
  if (!update) return oldProfile || null;
  const base = oldProfile || {};
  const merged = {
    ...base,
    ...update,
  };

  // Array alanlar için özel merge (varsa)
  if (base.painPoints || update.painPoints) {
    const arr = [
      ...(base.painPoints || []),
      ...(update.painPoints || []),
    ].filter(Boolean);
    merged.painPoints = [...new Set(arr)];
  }

  if (base.preferredChannels || update.preferredChannels) {
    const arr = [
      ...(base.preferredChannels || []),
      ...(update.preferredChannels || []),
    ].filter(Boolean);
    merged.preferredChannels = [...new Set(arr)];
  }

  if (base.solutionsOfInterest || update.solutionsOfInterest) {
    const arr = [
      ...(base.solutionsOfInterest || []),
      ...(update.solutionsOfInterest || []),
    ].filter(Boolean);
    merged.solutionsOfInterest = [...new Set(arr)];
  }

  return merged;
}

// ----------------------------
// CHAT ENDPOINT (HAFIZA + REDIS PROFİL DESTEKLİ)
// ----------------------------
app.post("/api/chat", async (req, res) => {
  const { message, language, sessionId } = req.body;
  const currentSessionId = sessionId || "default-session";

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  // Bu session için ilk konuşma ise history başlat
  if (!chatHistory[currentSessionId]) {
    chatHistory[currentSessionId] = [];
  }

  // 1. Kullanıcının mesajını ekle (Hata durumunda silmek için geçici olarak)
  chatHistory[currentSessionId].push({
    role: "user",
    content: message,
  });

  try {
    // Mevcut profili Redis'ten çek
    const existingProfile = await getProfile(currentSessionId);
    const profileSystemMessage = buildProfileSystemMessage(existingProfile);

    const messages = [
      { role: "system", content: systemPrompt },
      ...(profileSystemMessage ? [profileSystemMessage] : []),
      ...chatHistory[currentSessionId],
    ];

    // OpenAI'ye TÜM GEÇMİŞİ + PROFİLİ gönder
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4,
    });

    let reply = completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      // Hata: Yanıt yok. Eklediğimiz son kullanıcı mesajını silip hata döndür
      chatHistory[currentSessionId].pop();
      return res.status(500).json({ error: "No reply from OpenAI" });
    }

    // [PROFILE_UPDATE] bloğunu ayrıştır
    const { cleanedReply, profileUpdate } = extractProfileUpdateFromReply(reply);
    reply = cleanedReply || reply;

    // Lina'nın cevabını da history'e ekle
    chatHistory[currentSessionId].push({
      role: "assistant",
      content: reply,
    });

    // Profili merge et ve Redis'e kaydet
    if (profileUpdate) {
      const merged = mergeProfiles(existingProfile, profileUpdate);
      await saveProfile(currentSessionId, merged);
    }

    // Session ID'yi de döndür ki frontend saklasın
    res.json({
      reply,
      sessionId: currentSessionId,
    });
  } catch (err) {
    console.error("❌ OpenAI chat error:", err);

    // Hata durumunda, az önce eklediğimiz son kullanıcı mesajını sil
    if (chatHistory[currentSessionId]?.length > 0) {
      const lastMessage = chatHistory[currentSessionId].slice(-1)[0];
      if (lastMessage.role === "user" && lastMessage.content === message) {
        chatHistory[currentSessionId].pop();
      }
    }

    res.status(500).json({ error: "AI servisi şu anda yanıt veremiyor." });
  }
});

// ----------------------------
// YENİ SESSION ENDPOINT (Sohbeti sıfırlamak için)
// ----------------------------
app.post("/api/chat/reset", async (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && chatHistory[sessionId]) {
    delete chatHistory[sessionId];
  }
  if (sessionId) {
    await redis.del(`profile:${sessionId}`);
  }
  res.json({ message: "Session sıfırlandı" });
});

// ----------------------------
// PROFİL GÖRÜNTÜLEME (CRM İÇİN)
// ----------------------------
app.get("/api/profile/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const profile = await getProfile(sessionId);
  if (!profile) {
    return res.status(404).json({ error: "Profil bulunamadı" });
  }
  res.json({ sessionId, profile });
});

// ----------------------------
// START SERVER
// ----------------------------
app.listen(port, () => {
  console.log(`✅ MurekkAPP backend listening on http://localhost:${port}`);
});
