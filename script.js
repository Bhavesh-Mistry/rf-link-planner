const map = L.map("map").setView([20.5937, 78.9629], 5);

// ✅ Use OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
   maxZoom: 19,
   attribution: "© OpenStreetMap",
}).addTo(map);

let towerMode = false;
let towers = [];
let links = [];
let selectedTower = null;

const addTowerBtn = document.getElementById("addTowerBtn");
const towerList = document.getElementById("towerList");

addTowerBtn.addEventListener("click", () => {
   towerMode = !towerMode;
   addTowerBtn.textContent = towerMode ? "Click Map to Add Tower" : "Add Tower Mode";
});

map.on("click", (e) => {
   if (!towerMode) return;
   const freqGHz = parseFloat(document.getElementById("freqInput").value);
   const marker = L.marker(e.latlng, { draggable: true }).addTo(map);
   marker.bindPopup(`Tower ${towers.length + 1}<br>Freq: ${freqGHz} GHz`).openPopup();

   const tower = { id: towers.length + 1, freqGHz, marker, latlng: e.latlng };
   towers.push(tower);
   updateTowerList();

   marker.on("click", () => handleTowerClick(tower));
   marker.on("dragend", (ev) => {
      tower.latlng = ev.target.getLatLng();
      updateTowerList();
   });
});

function handleTowerClick(tower) {
   if (!selectedTower) {
      selectedTower = tower;
      alert(`Selected Tower ${tower.id}. Now select another tower to connect.`);
      return;
   }

   if (selectedTower.id === tower.id) {
      alert("Cannot connect a tower to itself.");
      selectedTower = null;
      return;
   }

   if (selectedTower.freqGHz !== tower.freqGHz) {
      alert("Frequencies don't match! Cannot connect.");
      selectedTower = null;
      return;
   }

   const link = L.polyline([selectedTower.latlng, tower.latlng], { color: "blue" }).addTo(map);

   // Calculate distance and add hover tooltip
   const distanceMeters = map.distance(selectedTower.latlng, tower.latlng);
   const distanceKm = (distanceMeters / 1000).toFixed(2);
   const tooltipText = `📶 ${selectedTower.freqGHz} GHz<br>📏 ${distanceKm} km`;
   link.bindTooltip(tooltipText, {
      permanent: false,
      direction: "top",
      className: "link-info",
      sticky: true,
   });

   links.push({ tower1: selectedTower, tower2: tower, line: link });

   link.on("click", () => showFresnelZone(selectedTower, tower, link));

   selectedTower = null;
}

function showFresnelZone(t1, t2, line) {
   const freqHz = t1.freqGHz * 1e9;
   const c = 3e8;
   const lambda = c / freqHz;

   const d = map.distance(t1.latlng, t2.latlng);
   const d1 = d / 2;
   const d2 = d / 2;
   const r = Math.sqrt((lambda * d1 * d2) / (d1 + d2));

   const midpoint = L.latLng(
      (t1.latlng.lat + t2.latlng.lat) / 2,
      (t1.latlng.lng + t2.latlng.lng) / 2
   );

   const ellipse = L.circle(midpoint, {
      radius: r,
      color: "red",
      fillColor: "rgba(255,0,0,0.2)",
   }).addTo(map);

   setTimeout(() => map.removeLayer(ellipse), 4000);
}

function updateTowerList() {
   towerList.innerHTML = "";

   towers.forEach((t) => {
      const div = document.createElement("div");
      div.className = "tower-item";
      div.innerHTML = `
          <strong>ID:</strong> ${t.id}<br>
          <strong>Freq:</strong> ${t.freqGHz} GHz<br>
          <strong>Lat:</strong> ${t.latlng.lat.toFixed(3)}<br>
          <strong>Lng:</strong> ${t.latlng.lng.toFixed(3)}
          <button onclick="deleteTower(${t.id})">Delete</button>
        `;
      towerList.appendChild(div);
   });
}

window.deleteTower = function (id) {
   const tower = towers.find((t) => t.id === id);
   if (!tower) return;

   map.removeLayer(tower.marker);

   // Remove all links associated with this tower
   links = links.filter((link) => {
      if (link.tower1.id === id || link.tower2.id === id) {
         map.removeLayer(link.line);
         return false;
      }
      return true;
   });

   towers = towers.filter((t) => t.id !== id);
   updateTowerList();
};