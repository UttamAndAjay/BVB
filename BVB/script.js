document.addEventListener('DOMContentLoaded', () => {

    // --- 14. NAVIGATION & SCROLLING ---
    function scrollToSection(sectionId) {
        const section = document.querySelector(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    document.querySelector('nav ul').addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            const href = e.target.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                scrollToSection(href);
            }
        }
    });

    // --- 8. MODERN WEATHER API + REAL AQI (Open-Meteo) ---
    async function fetchWeather() {
        const weatherIconElement = document.getElementById('weather-icon');
        const aqiValElement = document.getElementById('aqi-val');
        
        // Icon Mapper
        function getWeatherInfo(code) {
            let desc = "Unknown";
            let iconClass = "fas fa-question-circle"; 

            if (code === 0) {
                desc = "Clear Sky";
                iconClass = "fas fa-sun"; 
            } else if (code >= 1 && code <= 3) {
                desc = "Partly Cloudy";
                iconClass = "fas fa-cloud-sun"; 
            } else if (code >= 51 && code <= 65) {
                desc = "Rainy Showers";
                iconClass = "fas fa-cloud-showers-heavy"; 
            } else if (code >= 71 && code <= 75) {
                desc = "Snowfall";
                iconClass = "fas fa-snowflake"; 
            } else if (code >= 95) {
                desc = "Thunderstorm";
                iconClass = "fas fa-cloud-bolt"; 
            } else if (code >= 45 && code <= 48) {
                 desc = "Foggy";
                 iconClass = "fas fa-smog";
            }
            return { desc, iconClass };
        }

        // AQI Color Mapper
        function getAqiInfo(aqi) {
            let text = `${aqi}`;
            let color = "#28a745"; // Green
            let label = "Good";

            if (aqi <= 50) { label = "Good"; color = "#28a745"; }
            else if (aqi <= 100) { label = "Moderate"; color = "#ffc107"; text += " (Mod)"; }
            else if (aqi <= 150) { label = "Unhealthy (Sen)"; color = "#fd7e14"; }
            else if (aqi <= 200) { label = "Unhealthy"; color = "#dc3545"; }
            else { label = "Hazardous"; color = "#6f42c1"; }
            
            return { text: `${label} (${aqi})`, color };
        }

        try {
            // Pune Coordinates + AQI
            const res = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=18.5204&longitude=73.8567&current=us_aqi');
            const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=18.5204&longitude=73.8567&current_weather=true');
            
            const data = await res.json();
            const weatherData = await weatherRes.json();
            
            // Weather
            const temp = weatherData.current_weather.temperature;
            const wind = weatherData.current_weather.windspeed;
            const code = weatherData.current_weather.weathercode;
            const { desc, iconClass } = getWeatherInfo(code);

            document.getElementById('temp-val').innerText = temp;
            document.getElementById('wind-speed').innerText = wind + " km/h";
            document.getElementById('weather-desc').innerText = desc;
            weatherIconElement.innerHTML = `<i class="${iconClass}"></i>`;

            // AQI
            const aqi = data.current.us_aqi;
            const { text, color } = getAqiInfo(aqi);
            
            aqiValElement.innerHTML = `<span class="aqi-badge" style="background-color: ${color}">${text}</span>`;

        } catch (error) {
            console.error("Weather data fetch error:", error);
            document.getElementById('weather-desc').innerText = "Unavailable";
            document.getElementById('temp-val').innerText = "--";
            aqiValElement.innerText = "N/A";
        }
    }

    // --- 9. NEWS API (BBC & News18 via rss2json) ---
async function fetchNews() {
    const newsContainer = document.getElementById('news-container');
    
    // Updated Feeds: 1 (BBC), 2 (News18 India), 3 (News18 Politics)
    const feeds = [
        { 
            title: "International News", 
            source: "BBC World",
            url: "https://feeds.bbci.co.uk/news/world/rss.xml" 
        },
        { 
            title: "National News (India)", 
            source: "News18 India",
            url: "https://www.news18.com/rss/india.xml" 
        },
        { 
            title: "Political News (India)", 
            source: "News18 Politics",
            url: "https://www.news18.com/rss/politics.xml" 
        } 
    ];

    newsContainer.innerHTML = ''; 
    const proxy = "https://api.rss2json.com/v1/api.json?rss_url=";

    for (const feed of feeds) {
        try {
            const res = await fetch(proxy + encodeURIComponent(feed.url));
            const data = await res.json();
            
            // Find the first valid item (Top News)
            const topItem = data.items.find(item => item.title && (item.content || item.description));
            if (!topItem) continue; 

            // --- SMART IMAGE EXTRACTION ---
            // 1. Try standard thumbnail
            // 2. Try 'enclosure' (common in News18)
            // 3. Try regex extracting <img src> from the description
            // 4. Fallback to placeholder
            let imgUrl = topItem.thumbnail || topItem.enclosure?.link;

            if (!imgUrl && topItem.description) {
                const imgMatch = topItem.description.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) {
                    imgUrl = imgMatch[1];
                }
            }

            // Fallback if still no image
            if (!imgUrl) {
                imgUrl = `https://placehold.co/500x300/023020/ffffff?text=${encodeURIComponent(feed.title)}`;
            }

            const card = document.createElement('a');
            card.className = 'news-card'; 
            card.href = topItem.link;
            card.target = "_blank"; 

            card.innerHTML = `
                <div class="news-header">
                    ${feed.title} <span style="font-size:0.8em; opacity:0.8">(${feed.source})</span>
                </div>
                <img src="${imgUrl}" alt="${topItem.title}" onerror="this.onerror=null;this.src='https://placehold.co/500x300/023020/ffffff?text=News+Image'">
                <div class="news-body">
                    <h4>${topItem.title}</h4>
                    <small>${new Date(topItem.pubDate).toDateString()}</small>
                    <p style="font-size: 0.9em; margin-top: 10px;">${cleanDescription(topItem.description)}</p>
                </div>
            `;
            newsContainer.appendChild(card);
        } catch (e) {
            console.error(`Error fetching ${feed.title}:`, e);
            const errorCard = document.createElement('a'); 
            errorCard.className = 'news-card';
            errorCard.href = "javascript:void(0)";
            errorCard.innerHTML = `
                <div class="news-header">${feed.title}</div>
                <div class="news-body">
                    <h4>News failed to load.</h4>
                    <p>Please check your connection or try again later.</p>
                </div>`;
            newsContainer.appendChild(errorCard);
        }
    }
}

// Helper to remove HTML tags (like <img> or <br>) from the text description
function cleanDescription(html) {
    if (!html) return "";
    // Create a temporary element to strip HTML tags
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    // Get text content and shorten it
    let text = tempDiv.textContent || tempDiv.innerText || "";
    return text.substring(0, 100) + "...";
}

    // --- 10. FINANCE API (ACCURATE SPOT PRICES) ---
    async function fetchFinance() {
        const financeContainer = document.getElementById('finance-container');
        financeContainer.innerHTML = ''; 

        const financeItems = [
            { id: 'Gold', name: 'Gold (1gm/24k)', icon: 'fas fa-gavel', price: 0, unit: 'Market Spot (Est.)' },
            { id: 'Silver', name: 'Silver (1kg)', icon: 'fas fa-gem', price: 0, unit: 'Market Spot (Est.)' },
            { id: 'Bitcoin', name: 'Bitcoin (BTC)', icon: 'fab fa-bitcoin', price: 0, unit: '' },
            { id: 'USD', name: 'USD to INR', icon: 'fas fa-dollar-sign', price: 0, unit: '' },
            { id: 'EUR', name: 'EUR to INR', icon: 'fas fa-euro-sign', price: 0, unit: '' },
        ];

        try {
            // 1. Fetch Fiat Rates
            const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD');
            const fiatData = await fiatRes.json();
            const usdInr = fiatData.rates.INR;
            const eurInr = usdInr / fiatData.rates.EUR;
            
            // 2. Fetch Crypto & Metal Tokens
            const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold,kinesis-silver&vs_currencies=inr');
            const cryptoData = await cryptoRes.json();
            
            const btcInr = cryptoData.bitcoin ? cryptoData.bitcoin.inr : 0;
            
            // GOLD CALCULATION
            let goldPricePerGram = 0;
            if (cryptoData['pax-gold']) {
                 const goldPerOunceInr = cryptoData['pax-gold'].inr;
                 goldPricePerGram = goldPerOunceInr / 31.1035;
            } else {
                 goldPricePerGram = 7600; 
            }

            // SILVER CALCULATION
            let silverPricePerKg = 0;
            if (cryptoData['kinesis-silver']) {
                const silverPerOunceInr = cryptoData['kinesis-silver'].inr;
                silverPricePerKg = (silverPerOunceInr / 31.1035) * 1000;
            } else {
                 silverPricePerKg = 92000; // Fallback
            }

            // Update item prices
            financeItems.find(item => item.id === 'Bitcoin').price = btcInr;
            financeItems.find(item => item.id === 'USD').price = usdInr;
            financeItems.find(item => item.id === 'EUR').price = eurInr;
            financeItems.find(item => item.id === 'Gold').price = goldPricePerGram;
            financeItems.find(item => item.id === 'Silver').price = silverPricePerKg;

        } catch (e) { 
            console.error("API Data Error:", e); 
            // Fallback values close to 2024/25 market
            financeItems.find(item => item.id === 'Gold').price = 7800;
            financeItems.find(item => item.id === 'Silver').price = 93000;
        }

        // 3. Generate Cards
        financeItems.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'finance-card';
            card.setAttribute('data-item', item.id);
            
            let formattedPrice;
            if (item.id === 'Bitcoin' || item.id === 'Gold' || item.id === 'Silver') {
                formattedPrice = "₹ " + Math.round(item.price).toLocaleString('en-IN');
            } else {
                formattedPrice = "₹ " + item.price.toFixed(2);
            }

            card.innerHTML = `
                <div class="finance-icon"><i class="${item.icon}"></i></div>
                <h4>${item.name}</h4>
                <div class="finance-price">${formattedPrice}</div>
                <small>${item.unit}</small>
            `;
            financeContainer.appendChild(card);
        });
    }

    // --- INITIALIZATION ---
    fetchWeather();
    fetchNews();
    fetchFinance();
});

