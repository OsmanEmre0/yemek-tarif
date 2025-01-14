# Netlify Kurulum Talimatları

## Environment Variables

Netlify'da aşağıdaki environment variable'ı ayarlamanız gerekiyor:

1. Site ayarlarına gidin (Site settings)
2. "Environment variables" sekmesine tıklayın
3. "Add a variable" butonuna tıklayın
4. Aşağıdaki değişkeni ekleyin:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

## Build Settings

Build ayarları `netlify.toml` dosyasında otomatik olarak yapılandırılmıştır:

- Build command: `npm run build`
- Publish directory: `dist`

## Deploy Settings

1. Netlify'da yeni site oluşturun
2. GitHub repository'nizi bağlayın
3. Build ayarları otomatik olarak algılanacaktır
4. Environment variable'ı ekleyin
5. Deploy butonuna tıklayın

## SSL/HTTPS

Netlify otomatik olarak SSL sertifikası sağlar ve HTTPS'i etkinleştirir.

## Custom Domain (İsteğe Bağlı)

1. "Domain settings" sekmesine gidin
2. "Add custom domain" butonuna tıklayın
3. Domain adınızı girin ve talimatları takip edin 