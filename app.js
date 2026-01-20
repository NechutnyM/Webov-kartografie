// 1. Map initialization
const map = L.map('map').setView([-27, 133], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Map scale
L.control.scale({
    metric: true,      // Metric measurments
    imperial: false,   
    position: 'bottomleft' // Position
}).addTo(map);


// Polygon layers
let statesLayer;
let postcodesLayer;

// Default values
let currentFilter = 'Agriculture'; 
let opacityStates = 0.5;    // Transparency
let opacityPostcodes = 0.5; // Transparency

// polygon style of states
function styleStates(feature) {
    return {
        fillColor: '#e9e761', // Tvoje žlutá barva
        weight: 1,
        opacity: 0.8,
        color: '#574c4c',
        fillOpacity: opacityStates 
    };
}

// Function for colour of postcodes polygon
function stylePostcodes(feature) {
    const p = feature.properties;
    // Zjistíme, jestli je polygon pro daný filtr aktivní
    const isActive = p[currentFilter] === 1;

    let fillColor = '#555555'; // Tmavší šedá pro neaktivní
    
    // Pokud je aktivní, použijeme nastavenou průhlednost.
    // Pokud je neaktivní, použijeme jen 30 % z této hodnoty.
    let currentFillOpacity = isActive ? opacityPostcodes : (opacityPostcodes * 0.3);
    
    // STYLE FOR ACTIVE POLYGON
    if (isActive) {
        if (currentFilter === 'Agriculture') fillColor = '#4daf4a';
        else if (currentFilter === 'Construction') fillColor = '#e41a1c';
        else if (currentFilter === 'Hospitality_Tourism') fillColor = '#377eb8'; 
        else if (currentFilter === 'Fishing_Forestry') fillColor = '#984ea3';
    }

    return {
        fillColor: fillColor,
        fillOpacity: currentFillOpacity,
        // Outliner
        color: '#333333',
        weight: 0.8,
        opacity: 1 // Hranice mizí spolu s výplní
    };
}


// DATA LOADING

// STATES
fetch('data/states.json')
    .then(res => res.json())
    .then(data => {
        statesLayer = L.geoJSON(data, { style: styleStates });
        // Hned přidáme do mapy (checkbox je defaultně zapnutý)
        statesLayer.addTo(map);
    });

// POSTCODE
fetch('data/postcodes.json')
    .then(res => res.json())
    .then(data => {
        postcodesLayer = L.geoJSON(data, {
            renderer: L.canvas(),
            style: stylePostcodes,
            onEachFeature: function(feature, layer) {
                const p = feature.properties;
                layer.bindPopup(`
                    <b>Postcode: ${p.POA_CODE21 || p.POSTCODE}</b><br>
                    ${p.State}<br><hr>
                    🌱 Agriculture: ${p.Agriculture === 1 ? 'YES' : 'NO'}<br>
                    🏗️ Construction: ${p.Construction === 1 ? 'YES' : 'NO'}<br>
                    ☕ Hospitality and tourism: ${p.Hospitality_Tourism === 1 ? 'YES' : 'NO'}<br>
                    🌲 Forestry and fishing: ${p.Fishing_Forestry === 1 ? 'YES' : 'NO'}
                `);
            }
        });
        // Add to map
        postcodesLayer.addTo(map);
    });


// LAYER CONTROLLING (Sidebar) 

// 1. STATES
const checkStates = document.getElementById('check-states');
const sliderStates = document.getElementById('slider-states');

checkStates.addEventListener('change', function(e) {
    if (e.target.checked) {
        if (statesLayer) map.addLayer(statesLayer);
    } else {
        if (statesLayer) map.removeLayer(statesLayer);
    }
});

sliderStates.addEventListener('input', function(e) {
    opacityStates = parseFloat(e.target.value);
    if (statesLayer) statesLayer.setStyle(styleStates);
});

// 2. POSTCODE
const checkPostcodes = document.getElementById('check-postcodes');
const sliderPostcodes = document.getElementById('slider-postcodes');
const radioFilters = document.querySelectorAll('input[name="jobFilter"]');

checkPostcodes.addEventListener('change', function(e) {
    if (e.target.checked) {
        if (postcodesLayer) map.addLayer(postcodesLayer);
    } else {
        if (postcodesLayer) map.removeLayer(postcodesLayer);
    }
});

sliderPostcodes.addEventListener('input', function(e) {
    opacityPostcodes = parseFloat(e.target.value);
    if (postcodesLayer) postcodesLayer.setStyle(stylePostcodes);
});

// Category switching
radioFilters.forEach(radio => {
    radio.addEventListener('change', function(e) {
        currentFilter = e.target.value;
        if (postcodesLayer) {
            postcodesLayer.setStyle(stylePostcodes);
        }
    });
});


// SIDEBAR FUNCTIONALITY (Sliding)
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarIcon = sidebarToggle.querySelector('i');

sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('collapsed');
    
    // Icon changing
    if (sidebar.classList.contains('collapsed')) {
        sidebarIcon.classList.remove('fa-chevron-right');
        sidebarIcon.classList.add('fa-chevron-left');
    } else {
        sidebarIcon.classList.remove('fa-chevron-left');
        sidebarIcon.classList.add('fa-chevron-right');
    }
});


// SEARCHING BOX
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

function searchPostcode() {
    const query = searchInput.value.trim();
    
    if (!query) return;
    if (!postcodesLayer) {
        alert("Data loading");
        return;
    }

    let foundLayer = null;

    postcodesLayer.eachLayer(function(layer) {
        const props = layer.feature.properties;
        if (String(props.POA_CODE21) === query) {
            foundLayer = layer;
        }
    });

    if (foundLayer) {
        map.fitBounds(foundLayer.getBounds());
        foundLayer.openPopup();
        
        const originalStyle = postcodesLayer.options.style(foundLayer.feature);
        foundLayer.setStyle({ color: 'red', weight: 3, fillOpacity: 0.8 });
        
        setTimeout(() => {
            foundLayer.setStyle(originalStyle);
            // Musíme znovu aplikovat styl, aby se to vrátilo do správné barvy
            postcodesLayer.setStyle(stylePostcodes); 
        }, 3000);
    } else {
        alert("PSČ " + query + " nebylo nalezeno.");
    }
}

searchBtn.addEventListener('click', searchPostcode);
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchPostcode();
    }
});


// --- 6. LOGIKA PRO ROZBALOVACÍ MENU (AKORDEON) ---

// Najdeme všechny hlavičky v menu
const accHeaders = document.querySelectorAll('.accordion-header');

accHeaders.forEach(header => {
    header.addEventListener('click', function(e) {
        // DŮLEŽITÉ: Pokud uživatel klikl přímo na checkbox (input),
        // nechceme spouštět rozbalování/sbalování, chceme jen vypnout vrstvu.
        // Takže funkci ukončíme (return).
        if (e.target.tagName === 'INPUT') {
            return;
        }

        // Najdeme rodičovský element (.accordion-item)
        const item = this.parentElement;

        // Přepneme třídu 'active' -> to v CSS spustí zobrazení obsahu a otočení šipky
        item.classList.toggle('active');
    });
});