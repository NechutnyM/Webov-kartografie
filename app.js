// 1. MAP INITIALIZATION
const map = L.map('map').setView([-27, 133], 4);

// Base layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Map scale control
L.control.scale({
    metric: true,      // Enable metric units
    imperial: false,   // Disable imperial units
    position: 'bottomleft'
}).addTo(map);


// 2. GLOBAL VARIABLES & CONFIGURATION
let statesLayer;
let postcodesLayer;

// Default filter and opacity settings
let currentFilter = 'Agriculture'; 
let opacityStates = 0.5;    
let opacityPostcodes = 0.5; 

// 3. STYLE FUNCTIONS

// Style definition for State borders
function styleStates(feature) {
    return {
        fillColor: '#e9e761', // Default yellow fill
        weight: 1,
        opacity: 0.8,
        color: '#a642d0',     // Purple border
        fillOpacity: opacityStates 
    };
}

// Style definition for Postcodes based on active filter
function stylePostcodes(feature) {
    const p = feature.properties;
    
    // Check if the postcode is eligible for the selected visa category
    const isActive = p[currentFilter] === 1;

    let fillColor = '#555555'; // Dark gray for inactive areas
    
    // Opacity logic: Active areas use full setting, inactive areas are dimmed (30%)
    let currentFillOpacity = isActive ? opacityPostcodes : (opacityPostcodes * 0.3);
    
    // Set color based on the active industry filter
    if (isActive) {
        if (currentFilter === 'Agriculture') fillColor = '#4daf4a';
        else if (currentFilter === 'Construction') fillColor = '#e41a1c';
        else if (currentFilter === 'Hospitality_Tourism') fillColor = '#377eb8'; 
        else if (currentFilter === 'Fishing_Forestry') fillColor = '#984ea3';
    }

    return {
        fillColor: fillColor,
        fillOpacity: currentFillOpacity,
        color: '#333333', // Dark border
        weight: 0.8,
        opacity: 1 
    };
}


// 4. DATA LOADING (GeoJSON)

// Load States data
fetch('data/states.json')
    .then(res => res.json())
    .then(data => {
        statesLayer = L.geoJSON(data, { style: styleStates });
        statesLayer.addTo(map); 
    });

// Load Postcodes data
fetch('data/postcodes.json')
    .then(res => res.json())
    .then(data => {
        postcodesLayer = L.geoJSON(data, {
            renderer: L.canvas(), // Use Canvas renderer 
            style: stylePostcodes,
            onEachFeature: function(feature, layer) {
                const p = feature.properties;
                // Popup content definition
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
        postcodesLayer.addTo(map);
    });


// 5. SIDEBAR CONTROLS & INTERACTIVITY

// --- STATES LAYER CONTROL ---
const checkStates = document.getElementById('check-states');
const sliderStates = document.getElementById('slider-states');

// Toggle layer visibility
checkStates.addEventListener('change', function(e) {
    if (e.target.checked) {
        if (statesLayer) map.addLayer(statesLayer);
    } else {
        if (statesLayer) map.removeLayer(statesLayer);
    }
});

// Adjust opacity
sliderStates.addEventListener('input', function(e) {
    opacityStates = parseFloat(e.target.value);
    if (statesLayer) statesLayer.setStyle(styleStates);
});

// --- POSTCODES LAYER CONTROL ---
const checkPostcodes = document.getElementById('check-postcodes');
const sliderPostcodes = document.getElementById('slider-postcodes');
const radioFilters = document.querySelectorAll('input[name="jobFilter"]');

// Toggle layer visibility
checkPostcodes.addEventListener('change', function(e) {
    if (e.target.checked) {
        if (postcodesLayer) map.addLayer(postcodesLayer);
    } else {
        if (postcodesLayer) map.removeLayer(postcodesLayer);
    }
});

// Adjust opacity
sliderPostcodes.addEventListener('input', function(e) {
    opacityPostcodes = parseFloat(e.target.value);
    if (postcodesLayer) postcodesLayer.setStyle(stylePostcodes);
});

// Switch industry category filter
radioFilters.forEach(radio => {
    radio.addEventListener('change', function(e) {
        currentFilter = e.target.value;
        if (postcodesLayer) {
            postcodesLayer.setStyle(stylePostcodes);
        }
    });
});


// 6. UI FUNCTIONALITY

// Sidebar toggling (Slide in/out)
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarIcon = sidebarToggle.querySelector('i');

sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('collapsed');
    
    // Toggle arrow icon direction
    if (sidebar.classList.contains('collapsed')) {
        sidebarIcon.classList.remove('fa-chevron-right');
        sidebarIcon.classList.add('fa-chevron-left');
    } else {
        sidebarIcon.classList.remove('fa-chevron-left');
        sidebarIcon.classList.add('fa-chevron-right');
    }
});


// Search Functionality
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

function searchPostcode() {
    const query = searchInput.value.trim();
    
    if (!query) return;
    if (!postcodesLayer) {
        alert("Data is still loading...");
        return;
    }

    let foundLayer = null;

    // Iterate through layers to find matching postcode
    postcodesLayer.eachLayer(function(layer) {
        const props = layer.feature.properties;
        // Ensure comparison handles both string/number formats
        if (String(props.POA_CODE21) === query) {
            foundLayer = layer;
        }
    });

    if (foundLayer) {
        // Zoom to feature and open popup
        map.fitBounds(foundLayer.getBounds());
        foundLayer.openPopup();
        
        // Highlight effect (red border for 3 seconds)
        const originalStyle = postcodesLayer.options.style(foundLayer.feature);
        foundLayer.setStyle({ color: 'red', weight: 3, fillOpacity: 0.8 });
        
        setTimeout(() => {
            foundLayer.setStyle(originalStyle);
            // Re-apply global style to ensure consistency
            postcodesLayer.setStyle(stylePostcodes); 
        }, 3000);
    } else {
        alert("Postcode " + query + " not found.");
    }
}

// Event listeners for search
searchBtn.addEventListener('click', searchPostcode);
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission page reload
        searchPostcode();
    }
});


// 7. ACCORDION LOGIC (Collapsible Sidebar Sections)
const accHeaders = document.querySelectorAll('.accordion-header');

accHeaders.forEach(header => {
    header.addEventListener('click', function(e) {
        // IMPORTANT: Prevent toggling if the user clicks the checkbox input directly
        if (e.target.tagName === 'INPUT') {
            return;
        }

        // Toggle 'active' class on the parent item to show/hide content
        const item = this.parentElement;
        item.classList.toggle('active');
    });
});