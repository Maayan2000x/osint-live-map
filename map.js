const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTW9bj91CB10n8fciv4NykoBf0JYDvBIrnYWas7I125uc-hltvtjNloatvpAsBCY1G7uD0VImPrfUzJ/pub?output=csv";

const stanceColors = {
  supportive: "#2ECC71",
  neutral: "#F1C40F",
  "neutral-bad": "#E67E22",
  opposed: "#E74C3C"
};

// A robust CSV parser that safely handles Google Sheets formatting
function parseCSV(text) {
  const rows = [];
  let current = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    } else if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      current.push(value.trim());
      value = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (value.length > 0 || current.length > 0) {
        current.push(value.trim());
        rows.push(current);
      }
      current = [];
      value = "";
    } else {
      value += c;
    }
  }

  if (value.length > 0 || current.length > 0) {
    current.push(value.trim());
    rows.push(current);
  }

  return rows;
}

async function loadCSV() {
  const res = await fetch(csvUrl);
  const text = await res.text();
  const rows = parseCSV(text);

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (row[i] || "").trim());
    return obj;
  });

  return data.filter(r =>
    r.country &&
    r.country.trim() !== "" &&
    r.stance &&
    r.stance.trim() !== ""
  );
}

async function loadMap() {
  const map = L.map("map").setView([20, 0], 2);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 6
  }).addTo(map);

  const csvData = await loadCSV();
  const geo = await fetch("world_countries.geo.json").then(r => r.json());

  const stanceMap = {};
  csvData.forEach(r => {
    const country = (r.country || "").toLowerCase();
    stanceMap[country] = {
      stance: (r.stance || "").toLowerCase(),
      notes: r.notes || ""
    };
  });

  function style(feature) {
    const name = (feature.properties.ADMIN || "").toLowerCase();
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
    const name = feature.properties.ADMIN || "";
    const entry = stanceMap[name.toLowerCase()];
    let tooltip = name;
    if (entry && entry.notes) {
      tooltip += "\n" + entry.notes;
    }
    layer.bindTooltip(tooltip, { sticky: true });
  }

  L.geoJson(geo, {
    style,
    onEachFeature
  }).addTo(map);
}

loadMap();
