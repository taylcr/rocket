// Global variables for map functionality
let map;
let geoJsonLayer;
let boundaryLayer;
let selectedRegions = []; // Holds the selected region boundaries
let allBoundaryFeatures = []; // All boundaries loaded from DB
let bikeLaneLayer = null;
// Static budget data
const regionBudgetData = {
  "Ahuntsic-Cartierville": {
    renting: {
      min: 1999,
      max: 3955,
    },
    buying: {
      min: 383484,
      max: 930929,
    },
  },
  Anjou: {
    renting: {
      min: 1958,
      max: 3353,
    },
    buying: {
      min: 373748,
      max: 733719,
    },
  },
  "Cote-des-Neiges-Notre-Dame-de-Grace": {
    renting: {
      min: 2278,
      max: 4907,
    },
    buying: {
      min: 449624,
      max: 1287520,
    },
  },
  "Cote-Saint-Luc": {
    renting: {
      min: 2798,
      max: 4636,
    },
    buying: {
      min: 572919,
      max: 1165378,
    },
  },
  "Dollard-des-Ormeaux": {
    renting: {
      min: 1841,
      max: 3753,
    },
    buying: {
      min: 350935,
      max: 872125,
    },
  },
  Hampstead: {
    renting: {
      min: 1841,
      max: 9945,
    },
    buying: {
      min: 350935,
      max: 3160600,
    },
  },
  Kirkland: {
    renting: {
      min: 1841,
      max: 4110,
    },
    buying: {
      min: 350935,
      max: 959638,
    },
  },
  "L Ile Bizard Sainte Genevieve": {
    renting: {
      min: 1841,
      max: 3519,
    },
    buying: {
      min: 350935,
      max: 796012,
    },
  },
  LaSalle: {
    renting: {
      min: 2236,
      max: 3462,
    },
    buying: {
      min: 437942,
      max: 762018,
    },
  },
  Lachine: {
    renting: {
      min: 2059,
      max: 3443,
    },
    buying: {
      min: 397406,
      max: 763256,
    },
  },
  "Le Plateau-Mont-Royal": {
    renting: {
      min: 2588,
      max: 4620,
    },
    buying: {
      min: 526565,
      max: 1188488,
    },
  },
  "Le Sud-Ouest": {
    renting: {
      min: 2543,
      max: 3891,
    },
    buying: {
      min: 519786,
      max: 921651,
    },
  },
  "Mercier-Hochelaga-Maisonneuve": {
    renting: {
      min: 2061,
      max: 3454,
    },
    buying: {
      min: 397284,
      max: 776501,
    },
  },
  "Mont-Royal": {
    renting: {
      min: 1833,
      max: 5144,
    },
    buying: {
      min: 347948,
      max: 1347682,
    },
  },
  "Montreal-Est": {
    renting: {
      min: 1833,
      max: 2382,
    },
    buying: {
      min: 347948,
      max: 467314,
    },
  },
  "Montreal-Nord": {
    renting: {
      min: 1833,
      max: 3332,
    },
    buying: {
      min: 347948,
      max: 740735,
    },
  },
  "Montreal-Ouest": {
    renting: {
      min: 2638,
      max: 4312,
    },
    buying: {
      min: 534221,
      max: 1041956,
    },
  },
  Outremont: {
    renting: {
      min: 3426,
      max: 5911,
    },
    buying: {
      min: 766710,
      max: 1663648,
    },
  },
  "Pierrefonds-Roxboro": {
    renting: {
      min: 1930,
      max: 3440,
    },
    buying: {
      min: 369347,
      max: 735050,
    },
  },
  "Riviere-des-Prairies-Pointe-aux-Trembles": {
    renting: {
      min: 1692,
      max: 2836,
    },
    buying: {
      min: 317795,
      max: 594172,
    },
  },
};

// --- Helper Functions ---
function makePlain(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}
function fix_encoding(text) {
  if (typeof text === "string") {
    try {
      return text.encode("cp1252").decode("utf8");
    } catch (e) {
      return text;
    }
  }
  return text;
}
// function filterRegions(searchText) {
//   console.log("filterRegions called with:", searchText);
//   // Optional: implement filtering if desired.
// }

// --- Custom Icons ---
const evIcon = L.divIcon({
  html: "<div class='custom-marker ev-marker'><i class='fas fa-charging-station'></i></div>",
  className: "custom-div-icon",
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});
const houseIcon = L.divIcon({
  html: "<div class='custom-marker house-marker'><i class='fas fa-home'></i></div>",
  className: "custom-div-icon",
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

// --- Map & Data Functions ---
function initMap() {
  console.log("Initializing map...");
  const mapElement = document.getElementById("map");
  if (!mapElement) {
    console.error("Map element not found");
    return;
  }
  if (!map) {
    console.log("Creating new map instance");
    map = L.map("map").setView([45.5017, -73.5673], 12);

    // Replacing OpenStreetMap with Mapbox Custom Style
    L.tileLayer(
      "https://api.mapbox.com/styles/v1/relusme/cm6mqwdfr00mm01s943kh6y0i/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmVsdXNtZSIsImEiOiJjbTZtcTI4dmswb2JsMmtweWJweDJ2cThuIn0.r_rXgxgomdiVXq_Tg-bnUQ",
      {
        attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 20,
      }
    ).addTo(map);

    loadMontrealBoundaries();
    setTimeout(() => {
      console.log("Invalidating map size");
      map.invalidateSize();
    }, 200);
  }
}

// Function to load and display bike lanes on the map
function loadBikeLanes() {
  fetch("/data?collection=reseau_cyclable")
    .then((response) => response.json())
    .then((data) => {
      console.log("Bike Lanes Data Loaded:", data);

      // Create a GeoJSON layer for bike lanes
      const bikeLaneLayer = L.geoJSON(data, {
        style: function (feature) {
          return {
            color: "#e1e348", // Orange-red color for bike lanes
            weight: 1.5, // Line thickness
            opacity: 0.4,
          };
        },
        onEachFeature: function (feature, layer) {
          if (feature.properties) {
            const name =
              feature.properties.NOM_ARR_VILLE_DESC || "Unknown Area";
            const type = feature.properties.TYPE_VOIE_DESC || "Unknown Type";
            layer.bindPopup(
              `<b>Bike Lane</b><br>Area: ${name}<br>Type: ${type}`
            );
          }
        },
      });

      // Add the bike lanes layer to the existing map
      bikeLaneLayer.addTo(map);
    })
    .catch((error) => console.error("Error loading bike lanes:", error));
}

function loadMontrealBoundaries() {
  fetch("/data?collection=limites_administratives_agglomeration")
    .then((response) => response.json())
    .then((data) => {
      console.log("DEBUG: Boundaries data:", data);
      const features = Array.isArray(data) ? data : [data];
      allBoundaryFeatures = features;
      boundaryLayer = L.geoJSON(
        {
          type: "FeatureCollection",
          features: features,
        },
        {
          style: {
            color: "#2196F3",
            weight: 2,
            opacity: 0.8,
            fillColor: "#2196F3",
            fillOpacity: 0.2,
            dashArray: "3",
          },
          onEachFeature: function (feature, layer) {
            const props = makePlain(feature.properties) || {};
            const rawName = props.NOM || props.NOM_OFFICIEL;
            const name =
              rawName && rawName.trim()
                ? fix_encoding(rawName)
                : "Unknown Region";
            layer.bindPopup(`
            <b>${name}</b><br>
            Type: ${props.TYPE || "N/A"}<br>
            Code: ${props.CODE_3C || "N/A"}
          `);
            layer.on({
              mouseover: highlightFeature,
              mouseout: resetHighlight,
              click: function (e) {
                toggleRegionSelection(e);
              },
            });
            addRegionToDropdown(name, feature);
          },
        }
      ).addTo(map);
      try {
        const bounds = boundaryLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        } else {
          console.error("Invalid bounds");
          map.setView([45.5017, -73.5673], 12);
        }
      } catch (error) {
        console.error("Error setting bounds:", error);
        map.setView([45.5017, -73.5673], 12);
      }
    })
    .catch((error) => {
      console.error("Error loading boundaries:", error);
      map.setView([45.5017, -73.5673], 12);
    });
}
function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 3,
    color: "#4CAF50",
    opacity: 0.8,
    fillOpacity: 0.3,
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
      color: "#4CAF50",
      weight: 3,
      opacity: 0.8,
      fillOpacity: 0.3,
    });
  } else {
    selectedRegions.splice(index, 1);
    boundaryLayer.resetStyle(layer);
  }

  //Reload bike lanes based on selected regions
  filterBikeLanesByRegion();
}
function addRegionToDropdown(name, feature) {
  const select = document.getElementById("region-select");
  if (select) {
    if (
      [...select.options].some(
        (option) => option.value.toLowerCase() === name.toLowerCase()
      )
    ) {
      return;
    }
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.dataset.feature = JSON.stringify(feature);
    select.appendChild(option);
  }
}

// --- Combined Search Function ---
// Applies a budget filter (if provided), loads point data, requests a region summary,
// and automatically retrieves a property advisor plan.
function search() {
  // 1. Apply budget filter if budget values are provided.
  const budgetMinElem = document.getElementById("budget-min");
  const budgetMaxElem = document.getElementById("budget-max");
  if (budgetMinElem.value !== "" && budgetMaxElem.value !== "") {
    const budgetToggle = document.getElementById("budget-toggle").value;
    const minBudget = parseFloat(budgetMinElem.value);
    const maxBudget = parseFloat(budgetMaxElem.value);
    console.log("Budget filter:", budgetToggle, minBudget, maxBudget);
    if (isNaN(minBudget) || isNaN(maxBudget)) {
      alert("Please enter valid numbers for budget.");
      return;
    }
    let matchingRegions = [];
    for (let region in regionBudgetData) {
      let data = regionBudgetData[region][budgetToggle];
      if (data.min <= maxBudget && data.max >= minBudget) {
        matchingRegions.push(region);
      }
    }
    console.log("Matching regions:", matchingRegions);
    if (matchingRegions.length === 0) {
      alert("No regions match the selected budget range.");
      return;
    }
    if (boundaryLayer) {
      map.removeLayer(boundaryLayer);
    }
    const filteredFeatures = allBoundaryFeatures.filter((feature) => {
      const props = makePlain(feature.properties) || {};
      const rawName = props.NOM || props.NOM_OFFICIEL;
      const name = rawName && rawName.trim() ? fix_encoding(rawName) : "";
      return matchingRegions.includes(name);
    });
    boundaryLayer = L.geoJSON(
      {
        type: "FeatureCollection",
        features: filteredFeatures,
      },
      {
        style: {
          color: "#2196F3",
          weight: 2,
          opacity: 0.8,
          fillColor: "#2196F3",
          fillOpacity: 0.2,
          dashArray: "3",
        },
        onEachFeature: function (feature, layer) {
          const props = makePlain(feature.properties) || {};
          const rawName = props.NOM || props.NOM_OFFICIEL;
          const name =
            rawName && rawName.trim()
              ? fix_encoding(rawName)
              : "Unknown Region";
          layer.bindPopup(`
          <b>${name}</b><br>
          Type: ${props.TYPE || "N/A"}<br>
          Code: ${props.CODE_3C || "N/A"}<br>
          ${
            budgetToggle === "renting"
              ? `<b>Rent Range:</b> $${regionBudgetData[name].renting.min} - $${regionBudgetData[name].renting.max} / month`
              : `<b>Buy Range:</b> $${regionBudgetData[name].buying.min} - $${regionBudgetData[name].buying.max}`
          }
        `);
          layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: function (e) {
              toggleRegionSelection(e);
            },
          });
        },
      }
    ).addTo(map);
    selectedRegions = [];
    boundaryLayer.eachLayer((layer) => {
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
  } else {
    console.log("No budget filter applied; using full boundaries.");
  }

  // 2. Process category filters.
  const filterToggles = document.querySelectorAll(".filter-toggle.active");
  let activeFilters = Array.from(filterToggles).map(
    (btn) => btn.dataset.filter
  );
  if (activeFilters.length === 0) {
    activeFilters = ["bornes_recharge_publiques", "inspections_salubrite"];
  }
  console.log("Active category filters:", activeFilters);

  // 3. Fetch data for each active category.
  let allFeatures = [];
  let fetchPromises = activeFilters.map((filterType) => {
    return fetch(`/data?collection=${filterType}`)
      .then((response) => response.json())
      .then((data) => data);
  });
  Promise.all(fetchPromises)
    .then((results) => {
      results.forEach((arr) => {
        allFeatures = allFeatures.concat(arr);
      });
      console.log("All features from active filters:", allFeatures);
      // 4. Filter point features by selected region boundaries (if any).
      let regionPolygons = [];
      if (selectedRegions.length > 0) {
        regionPolygons = selectedRegions.map((layer) => layer.feature.geometry);
      }
      let filteredFeatures = allFeatures;
      if (regionPolygons.length > 0) {
        filteredFeatures = allFeatures.filter((feature) => {
          if (feature.geometry && feature.geometry.type === "Point") {
            const pt = turf.point(feature.geometry.coordinates);
            return regionPolygons.some((poly) =>
              turf.booleanPointInPolygon(pt, poly)
            );
          }
          return true;
        });
      }
      // 5. Apply zoom-level sampling.
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
        filteredFeatures = filteredFeatures.filter(
          () => Math.random() < samplingRate
        );
      }
      if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
      }
      geoJsonLayer = L.geoJSON(filteredFeatures, {
        pointToLayer: function (feature, latlng) {
          if (
            feature.properties &&
            feature.properties["Charging Station Name"]
          ) {
            return L.marker(latlng, { icon: evIcon });
          } else {
            return L.marker(latlng, { icon: houseIcon });
          }
        },
        onEachFeature: function (feature, layer) {
          if (feature.properties) {
            let popupContent = `<b>Location Information</b><br>`;
            if (feature.properties["Charging Station Name"]) {
              popupContent += `<b>Charging Station:</b> ${
                fix_encoding(feature.properties["Charging Station Name"]) ||
                "N/A"
              }<br>`;
              popupContent += `<b>Location:</b> ${
                fix_encoding(feature.properties["Location Name"]) || "N/A"
              }<br>`;
              popupContent += `<b>Address:</b> ${
                fix_encoding(feature.properties["Address"]) || "N/A"
              }<br>`;
              popupContent += `<b>City:</b> ${
                fix_encoding(feature.properties["City"]) || "N/A"
              }<br>`;
              popupContent += `<b>Province:</b> ${
                fix_encoding(feature.properties["Province"]) || "N/A"
              }<br>`;
              popupContent += `<b>Charging Level:</b> ${
                fix_encoding(feature.properties["Charging Level"]) || "N/A"
              }<br>`;
              popupContent += `<b>Pricing Model:</b> ${
                fix_encoding(feature.properties["Pricing Model"]) || "N/A"
              }`;
            } else {
              popupContent += `<b>Borough:</b> ${
                fix_encoding(feature.properties["Borough"]) || "N/A"
              }<br>`;
              popupContent += `<b>First Inspection Date:</b> ${
                fix_encoding(feature.properties["First Inspection Date"]) ||
                "N/A"
              }<br>`;
              popupContent += `<b>Number of Inspected Homes:</b> ${
                fix_encoding(feature.properties["Number of Inspected Homes"]) ||
                "N/A"
              }<br>`;
              popupContent += `<b>Reference Neighborhood:</b> ${
                fix_encoding(feature.properties["Reference Neighborhood"]) ||
                "N/A"
              }<br>`;
              popupContent += `<b>Inspection Status:</b> ${
                fix_encoding(feature.properties["Inspection Status"]) ||
                "Inconnu"
              }`;
            }
            layer.bindPopup(popupContent);
          }
        },
      }).addTo(map);
      // 6. Request region summary and update Mission Log.
      getRegionSummary();
      // 7. Automatically request the advisor plan and update the advisor chat log.
      getAdvisorPlan();
      // 8. Reveal the Property Advisor Chat card.
      const advisorCard = document.getElementById("advisorChatCard");
      if (advisorCard) {
        advisorCard.style.display = "block";
      }
    })
    .catch((error) => console.error("Fetching error:", error));
}

// --- Get Region Summary ---
// Sends search parameters to /summarize and updates the Mission Log.
function getRegionSummary() {
  const regionNames = selectedRegions.map((layer) => {
    const props = layer.feature.properties || {};
    const rawName = props.NOM || props.NOM_OFFICIEL;
    return fix_encoding(rawName);
  });
  const budgetOption = document.getElementById("budget-toggle").value;
  const budgetMin = document.getElementById("budget-min").value;
  const budgetMax = document.getElementById("budget-max").value;
  const filterToggles = document.querySelectorAll(".filter-toggle.active");
  let activeFilters = Array.from(filterToggles).map(
    (btn) => btn.dataset.filter
  );
  if (activeFilters.length === 0) {
    activeFilters = ["bornes_recharge_publiques", "inspections_salubrite"];
  }
  const payload = {
    regions: regionNames,
    budget_option: budgetOption,
    budget_min: budgetMin,
    budget_max: budgetMax,
    categories: activeFilters,
  };
  console.log("Sending summary payload:", payload);
  fetch("/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.summary) {
        const missionLog = document.getElementById("missionLog");
        if (missionLog) {
          missionLog.textContent = data.summary;
        } else {
          console.log("Mission log element not found.");
        }
      } else if (data.error) {
        console.error("Summary error:", data.error);
      }
    })
    .catch((error) => console.error("Error fetching summary:", error));
}

// --- Get Advisor Plan ---
// Automatically sends a pre-defined prompt (using the current search parameters)
// to the /advisor endpoint and updates the advisor chat log.
function getAdvisorPlan() {
  const regionNames = selectedRegions.map((layer) => {
    const props = layer.feature.properties || {};
    const rawName = props.NOM || props.NOM_OFFICIEL;
    return fix_encoding(rawName);
  });
  const budgetOption = document.getElementById("budget-toggle").value;
  const budgetMin = document.getElementById("budget-min").value;
  const budgetMax = document.getElementById("budget-max").value;
  const filterToggles = document.querySelectorAll(".filter-toggle.active");
  let activeFilters = Array.from(filterToggles).map(
    (btn) => btn.dataset.filter
  );
  if (activeFilters.length === 0) {
    activeFilters = ["bornes_recharge_publiques", "inspections_salubrite"];
  }
  const advisorPrompt = `Based on the following information:
Regions: ${regionNames.join(", ")}
Budget Option: ${budgetOption}
Budget Range: ${budgetMin} to ${budgetMax}${
    budgetMin && budgetMax && budgetOption.toLowerCase() === "renting"
      ? " per month"
      : ""
  }
Categories: ${activeFilters.join(", ")}

Please provide a detailed, step-by-step plan for a user looking to ${
    budgetOption === "renting" ? "rent" : "buy"
  } a property in Montreal. Include current interest rates, explain the "taxe de bienvenue", and list all necessary steps.`;

  console.log("Sending advisor prompt:", advisorPrompt);
  fetch("/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: advisorPrompt }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.advisor) {
        const advisorChatLog = document.getElementById("advisorChatLog");
        if (advisorChatLog) {
          advisorChatLog.textContent = data.advisor;
        } else {
          console.log("Advisor chat log element not found.");
        }
      } else if (data.error) {
        console.error("Advisor error:", data.error);
      }
    })
    .catch((error) => console.error("Error fetching advisor plan:", error));
}

// --- DOMContentLoaded and UI Binding ---
document.addEventListener("DOMContentLoaded", () => {
  const mainContainer = document.getElementById("mainContainer");
  const logoContainer = document.getElementById("logoContainer");
  const searchContainer = document.getElementById("searchContainer");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const mainContent = document.getElementById("mainContent");
  const chatToggle = document.getElementById("chatToggle");
  const chatContainer = document.getElementById("chatContainer");
  const closeChat = document.getElementById("closeChat");
  const userInput = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const messages = document.getElementById("messages");

  function showContent() {
    mainContainer.classList.add("content-visible");
    logoContainer.classList.add("minimized");
    searchContainer.style.transform = "translateY(-20px)";
    setTimeout(() => {
      searchContainer.style.transform = "translateY(0)";
    }, 300);
    mainContent.style.display = "block";
    setTimeout(() => {
      mainContent.classList.add("visible");
    }, 50);
    fetch("items.html")
      .then((response) => response.text())
      .then((html) => {
        document.getElementById("itemsContainer").innerHTML = html;
        setTimeout(initMap, 100);

        setTimeout(loadBikeLanes, 1000); // Load bike lanes after map is ready


        document.querySelectorAll(".data-card").forEach((card, index) => {
          card.style.animation = `fadeInUp 0.5s ease-out ${
            index * 0.1
          }s forwards`;
          card.style.opacity = "0";
        });
        const filterToggles = document.querySelectorAll(".filter-toggle");
        filterToggles.forEach((button) => {
          button.addEventListener("click", function () {
            this.classList.toggle("active");
          });
        });
        const searchFiltersBtn = document.getElementById("searchFiltersButton");
        if (searchFiltersBtn) {
          searchFiltersBtn.addEventListener("click", search);
        }
        const advisorSendBtn = document.getElementById("advisorSendButton");
        if (advisorSendBtn) {
          advisorSendBtn.addEventListener("click", sendAdvisorMessage);
        }
        const advisorInput = document.getElementById("advisorUserInput");
        if (advisorInput) {
          advisorInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
              sendAdvisorMessage();
            }
          });
        }
      })
      .catch((error) => console.error("Error loading items:", error));
  }

  showContent();

  function handleSearch() {
    if (!mainContent.classList.contains("visible")) {
      showContent();
    }
  }
  //   searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { handleSearch(); } });
  searchButton.addEventListener("click", handleSearch);
  searchInput.addEventListener("focus", () => {
    if (!mainContent.classList.contains("visible")) {
      searchInput.placeholder = "Press Enter to search...";
    }
  });
  searchInput.addEventListener("blur", () => {
    searchInput.placeholder = "Type to search...";
  });

  chatToggle.addEventListener("click", () => {
    chatContainer.style.display = "block";
    chatToggle.style.display = "none";
  });
  closeChat.addEventListener("click", () => {
    chatContainer.style.display = "none";
    chatToggle.style.display = "flex";
  });

  function addMessage(content, isUser) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user-message" : "ai-message"}`;
    messageDiv.textContent = content;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "message ai-message typing-indicator";
    indicator.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    messages.appendChild(indicator);
    messages.scrollTop = messages.scrollHeight;
    return indicator;
  }

  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addMessage(message, true);
    userInput.value = "";
    const typingIndicator = addTypingIndicator();
    try {
      const response = await fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      typingIndicator.remove();
      if (data.error) {
        addMessage("Sorry, there was an error processing your request.", false);
      } else {
        addMessage(data.summary, false);
      }
    } catch (error) {
      typingIndicator.remove();
      addMessage("Sorry, there was an error connecting to the server.", false);
    }
  }

  sendButton.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
  document.addEventListener("click", (e) => {
    if (
      !chatContainer.contains(e.target) &&
      !chatToggle.contains(e.target) &&
      chatContainer.style.display === "block"
    ) {
      chatContainer.style.display = "none";
      chatToggle.style.display = "flex";
    }
  });
  chatContainer.addEventListener("click", (e) => {
    e.stopPropagation();
  });
});

// --- Advisor Chat Functions ---
function sendAdvisorMessage() {
  const input = document.getElementById("advisorUserInput");
  const chatLog = document.getElementById("advisorChatLog");
  const message = input.value.trim();
  if (!message) return;
  appendAdvisorMessage(message, true);
  input.value = "";
  const typingIndicator = addAdvisorTypingIndicator();
  fetch("/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: message }),
  })
    .then((response) => response.json())
    .then((data) => {
      typingIndicator.remove();
      if (data.advisor) {
        appendAdvisorMessage(data.advisor, false);
      } else if (data.error) {
        appendAdvisorMessage("Sorry, there was an error: " + data.error, false);
      }
    })
    .catch((error) => {
      typingIndicator.remove();
      appendAdvisorMessage(
        "Sorry, there was an error connecting to the server.",
        false
      );
    });
}
function appendAdvisorMessage(text, isUser) {
  const chatLog = document.getElementById("advisorChatLog");
  const msgDiv = document.createElement("div");
  msgDiv.className = "message " + (isUser ? "user-message" : "advisor-message");
  msgDiv.textContent = text;
  chatLog.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}
function addAdvisorTypingIndicator() {
  const chatLog = document.getElementById("advisorChatLog");
  const indicator = document.createElement("div");
  indicator.className = "message advisor-message typing-indicator";
  indicator.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
  chatLog.appendChild(indicator);
  chatLog.scrollTop = chatLog.scrollHeight;
  return indicator;
}
// Automatically request the advisor plan after search.
function getAdvisorPlan() {
  const regionNames = selectedRegions.map((layer) => {
    const props = layer.feature.properties || {};
    const rawName = props.NOM || props.NOM_OFFICIEL;
    return fix_encoding(rawName);
  });
  const budgetOption = document.getElementById("budget-toggle").value;
  const budgetMin = document.getElementById("budget-min").value;
  const budgetMax = document.getElementById("budget-max").value;
  const filterToggles = document.querySelectorAll(".filter-toggle.active");
  let activeFilters = Array.from(filterToggles).map(
    (btn) => btn.dataset.filter
  );
  if (activeFilters.length === 0) {
    activeFilters = ["bornes_recharge_publiques", "inspections_salubrite"];
  }
  const advisorPrompt = `Based on the following information:
Regions: ${regionNames.join(", ")}
Budget Option: ${budgetOption}
Budget Range: ${budgetMin} to ${budgetMax}${
    budgetMin && budgetMax && budgetOption.toLowerCase() === "renting"
      ? " per month"
      : ""
  }
Categories: ${activeFilters.join(", ")}

Please provide a detailed, step-by-step plan for a user looking to ${
    budgetOption === "renting" ? "rent" : "buy"
  } a property in Montreal. Include current interest rates, explain the 'taxe de bienvenue', and list all necessary steps.`;

  console.log("Sending advisor prompt:", advisorPrompt);
  fetch("/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: advisorPrompt }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.advisor) {
        const advisorChatLog = document.getElementById("advisorChatLog");
        if (advisorChatLog) {
          advisorChatLog.textContent = data.advisor;
        } else {
          console.log("Advisor chat log element not found.");
        }
      } else if (data.error) {
        console.error("Advisor error:", data.error);
      }
    })
    .catch((error) => console.error("Error fetching advisor plan:", error));
}

// --- DOMContentLoaded and UI Binding ---
document.addEventListener("DOMContentLoaded", () => {
  const mainContainer = document.getElementById("mainContainer");
  const logoContainer = document.getElementById("logoContainer");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const mainContent = document.getElementById("mainContent");
  const chatToggle = document.getElementById("chatToggle");
  const chatContainer = document.getElementById("chatContainer");
  const closeChat = document.getElementById("closeChat");
  const userInput = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const messages = document.getElementById("messages");

  function showContent() {
    mainContainer.classList.add("content-visible");
    logoContainer.classList.add("minimized");
    mainContent.style.display = "block";
    setTimeout(() => {
      mainContent.classList.add("visible");
    }, 50);
    fetch("items.html")
      .then((response) => response.text())
      .then((html) => {
        document.getElementById("itemsContainer").innerHTML = html;
        setTimeout(initMap, 100);
        document.querySelectorAll(".data-card").forEach((card, index) => {
          card.style.animation = `fadeInUp 0.5s ease-out ${
            index * 0.1
          }s forwards`;
          card.style.opacity = "0";
        });
        const filterToggles = document.querySelectorAll(".filter-toggle");
        filterToggles.forEach((button) => {
          button.addEventListener("click", function () {
            this.classList.toggle("active");
          });
        });
        const searchFiltersBtn = document.getElementById("searchFiltersButton");
        if (searchFiltersBtn) {
          searchFiltersBtn.addEventListener("click", search);
        }
        const advisorSendBtn = document.getElementById("advisorSendButton");
        if (advisorSendBtn) {
          advisorSendBtn.addEventListener("click", sendAdvisorMessage);
        }
        const advisorInput = document.getElementById("advisorUserInput");
        if (advisorInput) {
          advisorInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
              sendAdvisorMessage();
            }
          });
        }
      })
      .catch((error) => console.error("Error loading items:", error));
  }

  showContent();

  function handleSearch() {
    if (!mainContent.classList.contains("visible")) {
      showContent();
    }
  }
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  });
  searchButton.addEventListener("click", handleSearch);
  searchInput.addEventListener("focus", () => {
    if (!mainContent.classList.contains("visible")) {
      searchInput.placeholder = "Press Enter to search...";
    }
  });
  searchInput.addEventListener("blur", () => {
    searchInput.placeholder = "Type to search...";
  });

  chatToggle.addEventListener("click", () => {
    chatContainer.style.display = "block";
    chatToggle.style.display = "none";
  });
  closeChat.addEventListener("click", () => {
    chatContainer.style.display = "none";
    chatToggle.style.display = "flex";
  });

  function addMessage(content, isUser) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user-message" : "ai-message"}`;
    messageDiv.textContent = content;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "message ai-message typing-indicator";
    indicator.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    messages.appendChild(indicator);
    messages.scrollTop = messages.scrollHeight;
    return indicator;
  }

  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addMessage(message, true);
    userInput.value = "";
    const typingIndicator = addTypingIndicator();
    try {
      const response = await fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      typingIndicator.remove();
      if (data.error) {
        addMessage("Sorry, there was an error processing your request.", false);
      } else {
        addMessage(data.summary, false);
      }
    } catch (error) {
      typingIndicator.remove();
      addMessage("Sorry, there was an error connecting to the server.", false);
    }
  }

  sendButton.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
  document.addEventListener("click", (e) => {
    if (
      !chatContainer.contains(e.target) &&
      !chatToggle.contains(e.target) &&
      chatContainer.style.display === "block"
    ) {
      chatContainer.style.display = "none";
      chatToggle.style.display = "flex";
    }
  });
  chatContainer.addEventListener("click", (e) => {
    e.stopPropagation();
  });
});

// Expose functions to global scope.
window.loadData = loadData;
window.filterRegions = filterRegions;
window.addRegionToDropdown = addRegionToDropdown;
window.filterRegionsByBudget = filterRegionsByBudget;
window.search = search;
