const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTW9bj91CB10n8fciv4NykoBf0JYDvBIrnYWas7I125uc-hltvtjNloatvpAsBCY1G7uD0VImPrfUzJ/pub?output=csv";

const stanceColors = {
  "supportive": "#2ECC71",
  "neutral": "#F1C40F",
  "neutral-bad": "#E67E22",
  "opposed": "#E74C3C"
};

async function loadCSV() {
  const res = await fetch(csvUrl);
  const text = await res.text();
  const rows = text.split("\n").map(r => r.split(","));

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] ? row[i].trim() : "");
    return obj;
  });

  return data;
}

async function loadMap() {
  const map = L.map('map').setView([20, 0], 2);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 6
  }).addTo(map);

  const csvData = await loadCSV();
  const geo = await fetch("world_countries.geo.json").then(r => r.json());

  const stanceMap = {};
  csvData.forEach(r => {
    stanceMap[r.country.toLowerCase()] = {
      stance: r.stance.toLowerCase(),
      notes: r.notes || ""
    };
  });

  function style(feature) {
    const name = feature.properties.ADMIN.toLowerCase();
    const entry = stanceMap[name];

    let color = "#cccccc";
    if (entry && stanceColors[entry.stance]) {
      color = stanceColors[entry.stance];
    }

    return {
      weight: 1,
      color: "#333",
      fillColor: color,
      fillOpacity: 0.75
    };
  }

  function onEachFeature(feature, layer) {
    const name = feature.properties.ADMIN;
    const entry = stanceMap[name.toLowerCase()];

    if (entry) {
      const tooltipText = `${name}\n${entry.notes}`;
      layer.bindTooltip(tooltipText, { sticky: true });
    } else {
      layer.bindTooltip(name, { sticky: true });
    }
  }

  L.geoJson(geo, {
    style: style,
    onEachFeature: onEachFeature
  }).addTo(map);
}

loadMap();
