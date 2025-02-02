// Global variables for map functionality
let map;
let geoJsonLayer;
let boundaryLayer;
let selectedRegions = [];

// Map initialization function
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
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Load Montreal boundaries
        loadMontrealBoundaries();

        setTimeout(() => {
            console.log('Invalidating map size');
            map.invalidateSize();
        }, 200);
    }
}

// Load Montreal boundaries
function loadMontrealBoundaries() {
    // Use the GeoJSON data directly since we have it
    const data = {
        type: "Feature",
        properties: {
            "CODEID": 10,
            "NOM": "LaSalle",
            "NOM_OFFICIEL": "LaSalle",
            "CODEMAMH": "REM17",
            "CODE_3C": "LAS",
            "NUM": 18,
            "ABREV": "LS",
            "TYPE": "Arrondissement"
        },
        geometry: {
            type: "MultiPolygon",
            coordinates: [/* Your coordinates array here */]
        }
    };

    if (boundaryLayer) {
        map.removeLayer(boundaryLayer);
    }

    boundaryLayer = L.geoJSON(data, {
        style: {
            color: '#2196F3',
            weight: 2,
            opacity: 0.6,
            fillOpacity: 0.1
        },
        onEachFeature: function(feature, layer) {
            if (feature.properties) {
                const name = feature.properties.NOM || feature.properties.NOM_OFFICIEL || 'Unknown Region';
                layer.bindPopup(`<b>${name}</b><br>Type: ${feature.properties.TYPE || 'N/A'}`);
                
                layer.on({
                    mouseover: highlightFeature,
                    mouseout: resetHighlight,
                    click: toggleRegionSelection
                });

                // Add to region select dropdown
                addRegionToDropdown(name, feature);
            }
        }
    }).addTo(map);

    map.fitBounds(boundaryLayer.getBounds());
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

function addRegionToDropdown(name, feature) {
    const select = document.getElementById('region-select');
    if (select) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        option.dataset.feature = JSON.stringify(feature);
        select.appendChild(option);
    }
}

function filterRegions(searchText) {
    const select = document.getElementById('region-select');
    if (select) {
        const options = select.getElementsByTagName('option');
        for (let option of options) {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(searchText.toLowerCase()) ? '' : 'none';
        }
    }
}

// Encoding fix function
function fixEncoding(text) {
    if (typeof text === 'string') {
        try {
            return decodeURIComponent(escape(text));
        } catch (e) {
            return text;
        }
    }
    return text;
}

// Load data function
function loadData() {
    var dataType = document.getElementById('data-type').value;
    if (dataType) {
        fetch(`/data?collection=${dataType}`)
            .then(response => response.json())
            .then(data => {
                console.log('DEBUG: Data from Flask:', data);

                if (geoJsonLayer) {
                    map.removeLayer(geoJsonLayer);
                }

                geoJsonLayer = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng);
                    },
                    onEachFeature: function (feature, layer) {
                        if (feature.properties) {
                            let popupContent = `<b>Location Information</b><br>`;
                            
                            if (dataType === "inspections_salubrite") {
                                popupContent += `<b>Borough:</b> ${fixEncoding(feature.properties["Borough"]) || "N/A"}<br>`;
                                popupContent += `<b>First Inspection Date:</b> ${fixEncoding(feature.properties["First Inspection Date"]) || "N/A"}<br>`;
                                popupContent += `<b>Number of Inspected Homes:</b> ${fixEncoding(feature.properties["Number of Inspected Homes"]) || "N/A"}<br>`;
                                popupContent += `<b>Reference Neighborhood:</b> ${fixEncoding(feature.properties["Reference Neighborhood"]) || "N/A"}<br>`;
                                popupContent += `<b>Inspection Status:</b> ${fixEncoding(feature.properties["Inspection Status"]) || "Inconnu"}`;
                            } else if (dataType === "bornes_recharge_publiques") {
                                popupContent += `<b>Charging Station:</b> ${fixEncoding(feature.properties["Charging Station Name"]) || "N/A"}<br>`;
                                popupContent += `<b>Location:</b> ${fixEncoding(feature.properties["Location Name"]) || "N/A"}<br>`;
                                popupContent += `<b>Address:</b> ${fixEncoding(feature.properties["Address"]) || "N/A"}<br>`;
                                popupContent += `<b>City:</b> ${fixEncoding(feature.properties["City"]) || "N/A"}<br>`;
                                popupContent += `<b>Province:</b> ${fixEncoding(feature.properties["Province"]) || "N/A"}<br>`;
                                popupContent += `<b>Charging Level:</b> ${fixEncoding(feature.properties["Charging Level"]) || "N/A"}<br>`;
                                popupContent += `<b>Pricing Model:</b> ${fixEncoding(feature.properties["Pricing Model"]) || "N/A"}`;
                            }
                            
                            layer.bindPopup(popupContent);
                        }
                    }
                }).addTo(map);
            })
            .catch(error => console.error('Fetching error:', error));
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
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

    // Function to show content and animate transition
    function showContent() {
        mainContainer.classList.add('content-visible');
        logoContainer.classList.add('minimized');
        
        searchContainer.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            searchContainer.style.transform = 'translateY(0)';
        }, 300);

        mainContent.style.display = 'block';
        setTimeout(() => {
            mainContent.classList.add('visible');
        }, 50);

        // Load items after transition
        fetch('items.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('itemsContainer').innerHTML = html;
                // Initialize map after content is loaded
                setTimeout(initMap, 100);
                // Add animation to cards
                document.querySelectorAll('.data-card').forEach((card, index) => {
                    card.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`;
                    card.style.opacity = '0';
                });
            })
            .catch(error => console.error('Error loading items:', error));
    }

    // Show content immediately
    showContent();

    // Handle search function
    function handleSearch() {
        if (!mainContent.classList.contains('visible')) {
            showContent();
        }
    }

    // Event Listeners
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    searchButton.addEventListener('click', handleSearch);

    // Search input focus effects
    searchInput.addEventListener('focus', () => {
        if (!mainContent.classList.contains('visible')) {
            searchInput.placeholder = 'Press Enter to search...';
        }
    });

    searchInput.addEventListener('blur', () => {
        searchInput.placeholder = 'Type to search...';
    });

    // Chat functionality
    chatToggle.addEventListener('click', () => {
        chatContainer.style.display = 'block';
        chatToggle.style.display = 'none';
    });

    closeChat.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        chatToggle.style.display = 'flex';
    });

    // Message handling functions
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
        indicator.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        messages.appendChild(indicator);
        messages.scrollTop = messages.scrollHeight;
        return indicator;
    }

    // Send message function
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, true);
        userInput.value = '';

        const typingIndicator = addTypingIndicator();

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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

    // Chat message event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Handle click outside chat container
    document.addEventListener('click', (e) => {
        if (!chatContainer.contains(e.target) && 
            !chatToggle.contains(e.target) && 
            chatContainer.style.display === 'block') {
            chatContainer.style.display = 'none';
            chatToggle.style.display = 'flex';
        }
    });

    // Prevent clicks inside chat container from closing it
    chatContainer.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

// Make functions globally available
window.loadData = loadData;
window.filterRegions = filterRegions;