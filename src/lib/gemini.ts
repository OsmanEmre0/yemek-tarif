import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();

if (!API_KEY) {
  console.error('Missing VITE_GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

export async function getRecipe(query: string, servings: number = 4) {
  if (!API_KEY) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen .env dosyasını yapılandırın.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Kendini profesyonel bir şef olarak düşün ve "${query}" için ${servings} kişilik modern bir tarif oluştur.

    Önemli kurallar:
    1. Malzemeler listesinde, ana malzemeyi HER ZAMAN SONDA yaz ve şu formatta ver:
       - Doğru format: "2 su bardağı [ANA_MALZEME]" (örn: "2 su bardağı un", "1 adet domates")
       - Yanlış format: "ılık süt", "küp küp doğranmış soğan", "taze maydanoz"
    2. mainIngredient alanında tarifte en önemli malzemenin SADECE ismini ver (örn: "un", "patates", "kıyma")
    3. Alt başlıklar ("... için:" gibi) kullanma, tüm malzemeleri tek liste olarak ver
    4. Malzeme miktarlarını net ve anlaşılır yaz
    5. Hazırlık adımlarını detaylı ve anlaşılır şekilde açıkla
    6. En az 3 püf noktası ekle
    
    Yanıtını aşağıdaki JSON formatında ver:
    {
      "name": "Yemek Adı",
      "description": "Modern ve detaylı bir açıklama",
      "prepTime": "10 dakika",
      "cookTime": "20 dakika",
      "servings": "${servings}",
      "baseServings": ${servings},
      "basePrepTime": 10,
      "baseCookTime": 20,
      "mainIngredient": "un",
      "ingredients": [
        "2 su bardağı un",
        "1 su bardağı süt",
        "2 adet yumurta",
        "1 tatlı kaşığı tuz",
        "2 yemek kaşığı şeker",
        "3 adet domates",
        "2 adet soğan"
      ],
      "instructions": [
        "Hazırlık:",
        "1. Tüm malzemeleri oda sıcaklığında hazırlayın",
        "2. Fırını 180°C'ye ısıtın",
        
        "Ana Adımlar:",
        "3. Unu bir kaba eleyin ve ortasını havuz şeklinde açın",
        "4. Ilık sütü yavaşça ekleyerek karıştırın",
        "5. Yumurtaları teker teker kırıp çırpın",
        "6. Tuz ve şekeri ilave edip homojen hale getirin",
        
        "Sebzelerin Hazırlanması:",
        "7. Domatesleri küp küp doğrayın",
        "8. Soğanları ince ince kıyın",
        
        "Birleştirme:",
        "9. Tüm malzemeleri dikkatli bir şekilde karıştırın"
      ],
      "tips": [
        "Malzemeleri oda sıcaklığında kullanmak daha iyi sonuç verir",
        "Hamuru fazla karıştırmamaya özen gösterin, aksi halde sertleşebilir",
        "Pişirme süresini fırınınıza göre ayarlayabilirsiniz"
      ]
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    try {
      // JSON içeriğini bul
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON içeriği bulunamadı');
      }
      
      const jsonText = jsonMatch[0];
      const parsedRecipe = JSON.parse(jsonText);
      
      // Gerekli alanları kontrol et
      const requiredFields = [
        'name', 'description', 'prepTime', 'cookTime', 'servings',
        'ingredients', 'instructions', 'baseServings', 'basePrepTime', 'baseCookTime',
        'mainIngredient'
      ];

      for (const field of requiredFields) {
        if (!parsedRecipe[field]) {
          throw new Error(`Eksik alan: ${field}`);
        }
      }

      // Dizileri kontrol et
      if (!Array.isArray(parsedRecipe.ingredients) || !Array.isArray(parsedRecipe.instructions)) {
        throw new Error('Malzemeler veya hazırlanış adımları geçersiz formatta');
      }

      if (parsedRecipe.ingredients.length === 0 || parsedRecipe.instructions.length === 0) {
        throw new Error('Malzemeler veya hazırlanış adımları boş olamaz');
      }

      // Süreleri sayıya çevir
      parsedRecipe.baseServings = Number(servings);
      parsedRecipe.basePrepTime = Number(parsedRecipe.prepTime.replace(/\D/g, ''));
      parsedRecipe.baseCookTime = Number(parsedRecipe.cookTime.replace(/\D/g, ''));

      if (isNaN(parsedRecipe.basePrepTime) || isNaN(parsedRecipe.baseCookTime)) {
        throw new Error('Geçersiz süre formatı');
      }

      return parsedRecipe;
    } catch (parseError) {
      console.error('Parse error:', parseError);
      throw new Error('Tarif formatı geçersiz. Lütfen tekrar deneyin.');
    }
  } catch (error) {
    console.error('API error:', error);
    throw new Error('Tarif alınırken bir hata oluştu. Lütfen tekrar deneyin.');
  }
}