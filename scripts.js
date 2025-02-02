// Global variables for map functionality
let map;
let geoJsonLayer;
let boundaryLayer;
let selectedRegions = [];  // Array holding the selected boundary layers
let allBoundaryFeatures = [];  // All boundary features loaded from the DB

// Static budget data (fake numbers) for each Montreal region.
// Ensure that these keys match the region names (after fix_encoding) from your DB.
const regionBudgetData = {
  "LaSalle": {
    renting: { min: 800, max: 1500 },
    buying: { min: 200000, max: 400000 }
  },
  "Dollard-des-Ormeaux": {
    renting: { min: 900, max: 1600 },
    buying: { min: 250000, max: 450000 }
  },
  "Rivière-des-Prairies-Pointe-aux-Trembles": {
    renting: { min: 700, max: 1300 },
    buying: { min: 180000, max: 350000 }
  }
  // Add more regions as needed.
};

// --- Helper Functions ---

// Convert an object to a plain JavaScript object
function makePlain(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}

// Fix encoding issues (using cp1252 decoding for French text)
function fix_encoding(text) {
  if (typeof text === 'string') {
    try {
      return text.encode('cp1252').decode('utf8');
    } catch (e) {
      return text;
    }
  }
  return text;
}

// A no-op filterRegions function so that the oninput attribute in HTML doesn't fail.
function filterRegions(searchText) {
  console.log("filterRegions called with:", searchText);
  // (Optional) You could implement region name filtering for a dropdown here.
}

// --- Map & Data Functions ---

// Initialize the map (loads only boundaries initially)
function initMap() {
  console.log('Initializing map...');
  const mapElement = document.getElementById('map');
  if (!mapElement) {
    console.error('Map element not found');
    return;
  }
  if (!map) {
    console.log('Creating new map instance');
    map = L.map('map').setView([45.5017, -73.5673], 12);

    // ✅ Replacing OpenStreetMap with Mapbox Custom Style
    L.tileLayer('https://api.mapbox.com/styles/v1/relusme/cm6mqwdfr00mm01s943kh6y0i/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmVsdXNtZSIsImEiOiJjbTZtcTI4dmswb2JsMmtweWJweDJ2cThuIn0.r_rXgxgomdiVXq_Tg-bnUQ', {
      attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20

    }).addTo(map);
    // Load boundaries from DB
    loadMontrealBoundaries();
    setTimeout(() => {
      console.log('Invalidating map size');
      map.invalidateSize();
    }, 200);
  }
}

// Load boundaries (region polygons) from the DB
function loadMontrealBoundaries() {
  fetch('/data?collection=limites_administratives_agglomeration')
    .then(response => response.json())
    .then(data => {
      console.log('DEBUG: Boundaries data:', data);
      const features = Array.isArray(data) ? data : [data];
      allBoundaryFeatures = features; // Store globally
      boundaryLayer = L.geoJSON({
        type: "FeatureCollection",
        features: features
      }, {
        style: {
          color: '#2196F3',
          weight: 2,
          opacity: 0.8,
          fillColor: '#2196F3',
          fillOpacity: 0.2,
          dashArray: '3'
        },
        onEachFeature: function(feature, layer) {
          const props = makePlain(feature.properties) || {};
          const rawName = props.NOM || props.NOM_OFFICIEL;
          const name = rawName && rawName.trim() ? fix_encoding(rawName) : 'Unknown Region';
          layer.bindPopup(`
            <b>${name}</b><br>
            Type: ${props.TYPE || 'N/A'}<br>
            Code: ${props.CODE_3C || 'N/A'}
          `);
          layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: function(e) {
              toggleRegionSelection(e);
            }
          });
          // Optionally add region to dropdown if present
          addRegionToDropdown(name, feature);
        }
      }).addTo(map);
      try {
        const bounds = boundaryLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        } else {
          console.error('Invalid bounds');
          map.setView([45.5017, -73.5673], 12);
        }
      } catch (error) {
        console.error('Error setting bounds:', error);
        map.setView([45.5017, -73.5673], 12);
      }
    })
    .catch(error => {
      console.error('Error loading boundaries:', error);
      map.setView([45.5017, -73.5673], 12);
    });
}

function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 3,
    color: '#4CAF50',
    opacity: 0.8,
    fillOpacity: 0.3
  });
}

function resetHighlight(e) {
  const layer = e.target;
  if (!selectedRegions.includes(layer)) {
    boundaryLayer.resetStyle(layer);
  }
}

function toggleRegionSelection(e) {
  const layer = e.target;
  const index = selectedRegions.indexOf(layer);
  if (index === -1) {
    selectedRegions.push(layer);
    layer.setStyle({
      color: '#4CAF50',
      weight: 3,
      opacity: 0.8,
      fillOpacity: 0.3
    });
  } else {
    selectedRegions.splice(index, 1);
    boundaryLayer.resetStyle(layer);
  }
}

// Add region to dropdown (if present)
function addRegionToDropdown(name, feature) {
  const select = document.getElementById('region-select');
  if (select) {
    if ([...select.options].some(option => option.value.toLowerCase() === name.toLowerCase())) {
      return;
    }
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    option.dataset.feature = JSON.stringify(feature);
    select.appendChild(option);
  }
}

// Filter regions by budget. This uses static budget data to filter boundaries.
function filterRegionsByBudget() {
  const toggle = document.getElementById("budget-toggle").value; // "renting" or "buying"
  const minBudget = parseFloat(document.getElementById("budget-min").value);
  const maxBudget = parseFloat(document.getElementById("budget-max").value);
  console.log("Budget filter:", toggle, minBudget, maxBudget);
  if (isNaN(minBudget) || isNaN(maxBudget)) {
    alert("Please enter both a minimum and maximum budget.");
    return;
  }
  let matchingRegions = [];
  for (let region in regionBudgetData) {
    let data = regionBudgetData[region][toggle];
    if (data.min <= maxBudget && data.max >= minBudget) {
      matchingRegions.push(region);
    }
  }
  console.log("Matching regions:", matchingRegions);
  if (matchingRegions.length === 0) {
    alert("No regions match the selected budget range.");
    return;
  }
  // Remove current boundaryLayer
  if (boundaryLayer) {
    map.removeLayer(boundaryLayer);
  }
  // Filter the global allBoundaryFeatures based on matching region names
  const filteredFeatures = allBoundaryFeatures.filter(feature => {
    const props = makePlain(feature.properties) || {};
    const rawName = props.NOM || props.NOM_OFFICIEL;
    const name = rawName && rawName.trim() ? fix_encoding(rawName) : '';
    return matchingRegions.includes(name);
  });
  boundaryLayer = L.geoJSON({
    type: "FeatureCollection",
    features: filteredFeatures
  }, {
    style: {
      color: '#2196F3',
      weight: 2,
      opacity: 0.8,
      fillColor: '#2196F3',
      fillOpacity: 0.2,
      dashArray: '3'
    },
    onEachFeature: function(feature, layer) {
      const props = makePlain(feature.properties) || {};
      const rawName = props.NOM || props.NOM_OFFICIEL;
      const name = rawName && rawName.trim() ? fix_encoding(rawName) : 'Unknown Region';
      layer.bindPopup(`
        <b>${name}</b><br>
        Type: ${props.TYPE || 'N/A'}<br>
        Code: ${props.CODE_3C || 'N/A'}<br>
        ${toggle === "renting"
          ? `<b>Rent Range:</b> $${regionBudgetData[name].renting.min} - $${regionBudgetData[name].renting.max} / month`
          : `<b>Buy Range:</b> $${regionBudgetData[name].buying.min} - $${regionBudgetData[name].buying.max}`
        }
      `);
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: function(e) {
          toggleRegionSelection(e);
        }
      });
    }
  }).addTo(map);
  // Update selectedRegions with the newly displayed layers.
  selectedRegions = [];
  boundaryLayer.eachLayer(layer => {
    selectedRegions.push(layer);
  });
  try {
    const bounds = boundaryLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  } catch (e) {
    console.error(e);
  }
}

// Load point data based on the currently selected regions and zoom level.
// This function is triggered when the user clicks the "Load Data" button.
function loadData() {
  const dataType = document.getElementById('data-type').value;
  if (!dataType) return;
  if (selectedRegions.length === 0) {
    alert("Please select one or more regions (or apply a budget filter) before loading data.");
    return;
  }
  fetch(`/data?collection=${dataType}`)
    .then(response => response.json())
    .then(data => {
      console.log('DEBUG: Data from Flask:', data);
      if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
      }
      let features = data;
      // Filter point features by checking if they fall within any selected region using Turf.js.
      const regionPolygons = selectedRegions.map(layer => layer.feature.geometry);
      features = features.filter(feature => {
        if (feature.geometry && feature.geometry.type === "Point") {
          const pt = turf.point(feature.geometry.coordinates);
          return regionPolygons.some(poly => turf.booleanPointInPolygon(pt, poly));
        }
        return true;
      });
      // Apply zoom-level sampling: when zoomed out, show fewer points.
      const currentZoom = map.getZoom();
      let samplingRate = 1;
      if (currentZoom < 10) {
        samplingRate = 0.05;
      } else if (currentZoom < 12) {
        samplingRate = 0.1;
      } else if (currentZoom < 14) {
        samplingRate = 0.5;
      }
      if (samplingRate < 1) {
        features = features.filter(() => Math.random() < samplingRate);
      }
      geoJsonLayer = L.geoJSON(features, {
        pointToLayer: function(feature, latlng) {
          return L.marker(latlng);
        },
        onEachFeature: function(feature, layer) {
          if (feature.properties) {
            let popupContent = `<b>Location Information</b><br>`;
            if (dataType === "inspections_salubrite") {
              popupContent += `<b>Borough:</b> ${fix_encoding(feature.properties["Borough"]) || "N/A"}<br>`;
              popupContent += `<b>First Inspection Date:</b> ${fix_encoding(feature.properties["First Inspection Date"]) || "N/A"}<br>`;
              popupContent += `<b>Number of Inspected Homes:</b> ${fix_encoding(feature.properties["Number of Inspected Homes"]) || "N/A"}<br>`;
              popupContent += `<b>Reference Neighborhood:</b> ${fix_encoding(feature.properties["Reference Neighborhood"]) || "N/A"}<br>`;
              popupContent += `<b>Inspection Status:</b> ${fix_encoding(feature.properties["Inspection Status"]) || "Inconnu"}`;
            } else if (dataType === "bornes_recharge_publiques") {
              popupContent += `<b>Charging Station:</b> ${fix_encoding(feature.properties["Charging Station Name"]) || "N/A"}<br>`;
              popupContent += `<b>Location:</b> ${fix_encoding(feature.properties["Location Name"]) || "N/A"}<br>`;
              popupContent += `<b>Address:</b> ${fix_encoding(feature.properties["Address"]) || "N/A"}<br>`;
              popupContent += `<b>City:</b> ${fix_encoding(feature.properties["City"]) || "N/A"}<br>`;
              popupContent += `<b>Province:</b> ${fix_encoding(feature.properties["Province"]) || "N/A"}<br>`;
              popupContent += `<b>Charging Level:</b> ${fix_encoding(feature.properties["Charging Level"]) || "N/A"}<br>`;
              popupContent += `<b>Pricing Model:</b> ${fix_encoding(feature.properties["Pricing Model"]) || "N/A"}`;
            }
            layer.bindPopup(popupContent);
          }
        }
      }).addTo(map);
    })
    .catch(error => console.error('Fetching error:', error));
}

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements from the main page (index.html)
  const mainContainer = document.getElementById('mainContainer');
  const logoContainer = document.getElementById('logoContainer');
  const searchContainer = document.getElementById('searchContainer');
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const mainContent = document.getElementById('mainContent');
  const chatToggle = document.getElementById('chatToggle');
  const chatContainer = document.getElementById('chatContainer');
  const closeChat = document.getElementById('closeChat');
  const userInput = document.getElementById('userInput');
  const sendButton = document.getElementById('sendButton');
  const messages = document.getElementById('messages');
  const regionSelect = document.getElementById('region-select'); // Optional dropdown
  const loadDataButton = document.getElementById('loadDataButton'); // "Load Data" button
  // Note: The budget filter elements are in items.html and are loaded dynamically.

  // After loading items.html into the page, attach the event listener for the "Apply Budget Filter" button.
  // We'll call this inside showContent() after setting innerHTML.
  
  function showContent() {
    mainContainer.classList.add('content-visible');
    logoContainer.classList.add('minimized');
    searchContainer.style.transform = 'translateY(-20px)';
    setTimeout(() => { searchContainer.style.transform = 'translateY(0)'; }, 300);
    mainContent.style.display = 'block';
    setTimeout(() => { mainContent.classList.add('visible'); }, 50);
    fetch('items.html')
      .then(response => response.text())
      .then(html => {
        document.getElementById('itemsContainer').innerHTML = html;
        // Attach event listener for the budget filter button AFTER items.html is loaded:
        const applyBudgetFilterBtn = document.getElementById('applyBudgetFilter');
        if (applyBudgetFilterBtn) {
          applyBudgetFilterBtn.addEventListener('click', filterRegionsByBudget);
        }
        setTimeout(initMap, 100);
        document.querySelectorAll('.data-card').forEach((card, index) => {
          card.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`;
          card.style.opacity = '0';
        });
      })
      .catch(error => console.error('Error loading items:', error));
  }

  showContent();

  function handleSearch() {
    if (!mainContent.classList.contains('visible')) {
      showContent();
    }
  }
  searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { handleSearch(); } });
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('focus', () => { if (!mainContent.classList.contains('visible')) { searchInput.placeholder = 'Press Enter to search...'; } });
  searchInput.addEventListener('blur', () => { searchInput.placeholder = 'Type to search...'; });

  chatToggle.addEventListener('click', () => { chatContainer.style.display = 'block'; chatToggle.style.display = 'none'; });
  closeChat.addEventListener('click', () => { chatContainer.style.display = 'none'; chatToggle.style.display = 'flex'; });

  function addMessage(content, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    messageDiv.textContent = content;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message ai-message typing-indicator';
    indicator.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    messages.appendChild(indicator);
    messages.scrollTop = messages.scrollHeight;
    return indicator;
  }

  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addMessage(message, true);
    userInput.value = '';
    const typingIndicator = addTypingIndicator();
    try {
      const response = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      typingIndicator.remove();
      if (data.error) {
        addMessage('Sorry, there was an error processing your request.', false);
      } else {
        addMessage(data.summary, false);
      }
    } catch (error) {
      typingIndicator.remove();
      addMessage('Sorry, there was an error connecting to the server.', false);
    }
  }

  sendButton.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { sendMessage(); } });
  document.addEventListener('click', (e) => {
    if (!chatContainer.contains(e.target) &&
        !chatToggle.contains(e.target) &&
        chatContainer.style.display === 'block') {
      chatContainer.style.display = 'none';
      chatToggle.style.display = 'flex';
    }
  });
  chatContainer.addEventListener('click', (e) => { e.stopPropagation(); });
});
  
// Expose functions to global scope for inline HTML usage.
window.loadData = loadData;
window.filterRegions = filterRegions;
window.addRegionToDropdown = addRegionToDropdown;
window.filterRegionsByBudget = filterRegionsByBudget;
