import React, { useState, useRef, useEffect } from 'react';
import { Search, ChefHat, Clock, Users, Minus, Plus, ShoppingCart, ExternalLink, ChevronDown, ChevronUp, LightbulbIcon } from 'lucide-react';
import { getRecipe } from './lib/gemini';

type Recipe = {
  name: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
  baseServings: number;
  basePrepTime: number;
  baseCookTime: number;
  mainIngredient: string;
  tips: string[];
};

function App() {
  const [query, setQuery] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentServings, setCurrentServings] = useState(4);
  const [showShoppingMenu, setShowShoppingMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const extractIngredientName = (ingredient: string): string => {
    // "için:" içeren başlıkları filtrele
    if (ingredient.toLowerCase().includes('için:')) {
      return '';
    }

    // Yasaklı kelimeler (ölçü birimleri, boyutlar, sıcaklıklar ve ekler)
    const bannedWords = [
      // Ölçü birimleri
      'su bardağı', 'çay bardağı', 'bardak', 'bardağı',
      'tatlı kaşığı', 'çay kaşığı', 'yemek kaşığı', 'kaşık', 'kaşığı',
      'gram', 'gr', 'kg', 'ml', 'litre', 'lt', 'l',
      'adet', 'dilim', 'demet', 'tutam', 'paket', 'kutu',
      'diş', 'baş', 'yaprak', 'dal', 'avuç',
      
      // Boyut belirteçleri
      'büyük boy', 'orta boy', 'küçük boy',
      'büyük', 'orta', 'küçük', 'boy', 'ince', 'kalın',
      
      // Sıcaklık ve durum belirteçleri
      'ılık', 'sıcak', 'soğuk', 'kızgın', 'kaynar',
      'oda sıcaklığında', 'buzdolabı', 'dondurulmuş',
      
      // Hazırlık durumları
      'doğranmış', 'rendelenmiş', 'dövülmüş', 'çekilmiş',
      'kurutulmuş', 'kavrulmuş', 'haşlanmış', 'soyulmuş',
      'dilimlenmiş', 'küp küp', 'püre', 'ezilmiş',
      'taze', 'kuru', 'yumuşak', 'sert', 'püresi',
      
      // Miktar belirteçleri
      'yemek', 'çay', 'tatlı', 'yarım', 'çeyrek',
      'tam', 'bütün', 'az', 'çok', 'biraz',
      
      // Diğer
      'ölçü', 'ölçek', 'tepeleme', 'silme',
      'hamur', 'hamuru', 'isteğe bağlı', 'göz kararı',
      'suyu', 'için'
    ];

    // Önce sayıları ve ölçü birimlerini kaldır
    let cleanedIngredient = ingredient.replace(/^[\d.,/]+ /, '');
    
    // Yasaklı kelimeleri kaldır
    for (const word of bannedWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanedIngredient = cleanedIngredient.replace(regex, '');
    }

    // Parantez içindeki açıklamaları ve virgülden sonrasını kaldır
    cleanedIngredient = cleanedIngredient
      .replace(/\(.*?\)/g, '')
      .split(',')[0]
      .split(':')[0]  // ":" işaretinden sonrasını kaldır
      .trim();
    
    // Birden fazla boşlukları tek boşluğa indir
    cleanedIngredient = cleanedIngredient.replace(/\s+/g, ' ');
    
    // Eğer boş string kaldıysa veya sadece boşluk varsa boş string döndür
    if (!cleanedIngredient.trim()) {
      return '';
    }
    
    // Son kelimeyi al (ana malzeme genelde sonda olur)
    const words = cleanedIngredient.trim().split(' ');
    return words[words.length - 1];
  };

  const generateMarketUrl = (store: 'migros' | 'carrefour', ingredient: string) => {
    const searchTerm = encodeURIComponent(ingredient);
    
    if (store === 'migros') {
      return `https://www.migros.com.tr/arama?q=${searchTerm}`;
    } else {
      return `https://www.carrefoursa.com/search/?text=${searchTerm}`;
    }
  };

  const scaleIngredient = (ingredient: string, scale: number): string => {
    const regex = /^([\d.,/]+)\s*(.+)$/;
    const match = ingredient.match(regex);
    
    if (!match) return ingredient;
    
    const [, amount, rest] = match;
    let numericAmount: number;
    
    if (amount.includes('/')) {
      const [num, den] = amount.split('/');
      numericAmount = parseFloat(num) / parseFloat(den);
    } else {
      numericAmount = parseFloat(amount.replace(',', '.'));
    }
    
    const scaledAmount = (numericAmount * scale).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${scaledAmount} ${rest}`;
  };

  const calculateTime = (baseTime: number, currentServings: number, baseServings: number): string => {
    const scale = Math.log(currentServings) / Math.log(baseServings);
    const scaledTime = Math.round(baseTime * (1 + (scale - 1) * 0.5));
    return `${scaledTime} dakika`;
  };

  const handleServingsChange = (change: number) => {
    const newServings = Math.max(1, Math.min(20, currentServings + change));
    setCurrentServings(newServings);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    try {
      const recipeData = await getRecipe(query, 4);
      setRecipe(recipeData);
      setCurrentServings(4);
    } catch (err) {
      console.error('Recipe search error:', err);
      setError('Tarif aranırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowShoppingMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-teal-50 to-cyan-100">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center">
          <ChefHat className="h-8 w-8 text-red-600 mr-3" />
          <h1 className="text-3xl font-bold text-slate-800">Lezzetli Tarifler</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Yemek adı girin..."
              className="w-full px-4 py-3 pl-12 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-amber-500 text-white px-6 py-3 rounded-lg font-medium hover:from-red-700 hover:to-amber-600 transition-all disabled:from-slate-400 disabled:to-slate-500"
          >
            {loading ? 'Aranıyor...' : 'Tarif Ara'}
          </button>
        </form>

        {error && (
          <div className="max-w-2xl mx-auto p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {recipe && (
          <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-md overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-4">{recipe.name}</h2>
                  <p className="text-slate-600">{recipe.description}</p>
                </div>
                <div className="bg-teal-50/80 backdrop-blur-sm p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2 text-center">Porsiyon Sayısı</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleServingsChange(-1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 hover:bg-teal-200 transition-colors"
                      type="button"
                    >
                      <Minus className="w-4 h-4 text-teal-700" />
                    </button>
                    <span className="w-8 text-center font-semibold text-teal-700">
                      {currentServings}
                    </span>
                    <button
                      onClick={() => handleServingsChange(1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 hover:bg-teal-200 transition-colors"
                      type="button"
                    >
                      <Plus className="w-4 h-4 text-teal-700" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 mb-8">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-cyan-600 mr-2" />
                  <span className="text-sm text-slate-600">
                    Hazırlık: {calculateTime(recipe.basePrepTime, currentServings, recipe.baseServings)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-cyan-600 mr-2" />
                  <span className="text-sm text-slate-600">
                    Pişirme: {calculateTime(recipe.baseCookTime, currentServings, recipe.baseServings)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-cyan-600 mr-2" />
                  <span className="text-sm text-slate-600">
                    {currentServings} Kişilik
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-slate-100">
                  <div className="p-6 bg-gradient-to-r from-red-50 to-amber-50">
                    <div className="flex items-center">
                      <ChefHat className="h-6 w-6 text-red-600 mr-3" />
                      <h3 className="text-xl font-semibold text-slate-800">Malzemeler</h3>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      {recipe.ingredients.map((ingredient, index) => {
                        const ingredientName = extractIngredientName(ingredient);
                        const scaledIngredient = recipe.baseServings === currentServings 
                          ? ingredient 
                          : scaleIngredient(ingredient, currentServings / recipe.baseServings);
                        
                        if (ingredientName) {
                          return (
                            <li key={index} className="flex items-center p-3 bg-gradient-to-r from-red-50 to-amber-50 rounded-lg list-none hover:from-red-100 hover:to-amber-100 transition-colors">
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                              <span className="font-medium text-slate-700">{scaledIngredient}</span>
                            </li>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-slate-100">
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <Clock className="h-6 w-6 text-teal-600 mr-3" />
                      <h3 className="text-xl font-semibold text-slate-800">Hazırlanışı</h3>
                    </div>
                    {showInstructions ? (
                      <ChevronUp className="h-5 w-5 text-teal-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-teal-600" />
                    )}
                  </button>
                  
                  {showInstructions && (
                    <div className="p-6">
                      <div className="space-y-6">
                        {recipe.instructions.map((step, index) => {
                          if (step.endsWith(':')) {
                            return (
                              <h4 key={index} className="font-semibold text-lg text-teal-800 mt-6 first:mt-0">
                                {step}
                              </h4>
                            );
                          }
                          return (
                            <div key={index} className="flex p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg hover:from-teal-100 hover:to-cyan-100 transition-colors">
                              <span className="font-bold text-teal-700 mr-3 shrink-0">
                                {index + 1}.
                              </span>
                              <p className="text-slate-700">{step.replace(/^\d+\.\s*/, '')}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {recipe.tips && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-slate-100">
                    <button
                      onClick={() => setShowTips(!showTips)}
                      className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <LightbulbIcon className="h-6 w-6 text-amber-600 mr-3" />
                        <h3 className="text-xl font-semibold text-slate-800">Püf Noktaları</h3>
                      </div>
                      {showTips ? (
                        <ChevronUp className="h-5 w-5 text-amber-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-amber-600" />
                      )}
                    </button>
                    
                    {showTips && (
                      <div className="p-6">
                        <ul className="space-y-4">
                          {recipe.tips.map((tip, index) => (
                            <li key={index} className="flex items-start p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg hover:from-amber-100 hover:to-yellow-100 transition-colors">
                              <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 mt-2"></span>
                              <p className="text-slate-700">{tip}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowShoppingMenu(!showShoppingMenu)}
                    className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Malzemeleri Satın Al</span>
                  </button>

                  {showShoppingMenu && recipe && (
                    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div 
                        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in duration-300"
                        ref={dropdownRef}
                      >
                        <div className="sticky top-0 bg-gradient-to-r from-red-50 to-teal-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ShoppingCart className="h-5 w-5 text-red-600" />
                            <h3 className="font-semibold text-lg text-slate-800">Alışveriş Listesi</h3>
                          </div>
                          <button
                            onClick={() => setShowShoppingMenu(false)}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                          >
                            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(85vh-4rem)]">
                          <div className="grid gap-2 p-6">
                            {recipe.ingredients.map((ingredient, index) => {
                              const ingredientName = extractIngredientName(ingredient);
                              
                              if (ingredientName) {
                                return (
                                  <div key={index} className="bg-slate-50/50 rounded-xl p-4 hover:bg-slate-50 transition-all">
                                    <p className="text-slate-700 mb-3 font-medium flex items-center gap-2">
                                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                      {ingredientName}
                                    </p>
                                    <div className="flex gap-2">
                                      <a
                                        href={generateMarketUrl('migros', ingredientName)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-red-100 to-amber-100 text-red-700 text-sm font-medium hover:from-red-200 hover:to-amber-200 transition-all group"
                                      >
                                        Migros'tan Al
                                        <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                      </a>
                                      <a
                                        href={generateMarketUrl('carrefour', ingredientName)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 text-sm font-medium hover:from-teal-200 hover:to-cyan-200 transition-all group"
                                      >
                                        CarrefourSA'dan Al
                                        <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;