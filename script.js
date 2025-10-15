const map = L.map('map').setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
   attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const towers = [];
const links = [];
let selectedTower = null;

const towerList = document.getElementById('towerList');
const linkList = document.getElementById('linkList');

map.on('click', (e) => {
   const towerName = `Tower ${towers.length + 1}`;
   const freq = prompt(`Enter frequency for ${towerName} (GHz):`, '5');
   if (!freq) return;

   const marker = L.marker(e.latlng, { draggable: true }).addTo(map);
   marker.bindPopup(`${towerName}<br>Freq: ${freq} GHz`);
   marker.freq = parseFloat(freq);
   marker.name = towerName;
   marker.latlng = e.latlng;

   towers.push(marker);
   updateTowerList();

   marker.on('click', () => handleTowerClick(marker));
   marker.on('dragend', () => marker.latlng = marker.getLatLng());
});

function handleTowerClick(tower) {
   if (!selectedTower) {
      selectedTower = tower;
      tower.openPopup();
   } else {
      if (selectedTower === tower) {
         selectedTower = null;
         return;
      }

      if (selectedTower.freq !== tower.freq) {
         alert('Frequencies must match to connect towers!');
         selectedTower = null;
         return;
      }

      createLink(selectedTower, tower);
      selectedTower = null;
   }
}

function createLink(t1, t2) {
   const latlngs = [t1.getLatLng(), t2.getLatLng()];
   const line = L.polyline(latlngs, { color: '#0078ff', weight: 3 }).addTo(map);
   line.t1 = t1;
   line.t2 = t2;
   line.freq = t1.freq;
   line.on('click', () => showFresnelZone(line));

   links.push(line);
   updateLinkList();
}

function showFresnelZone(line) {
   const t1 = line.t1.getLatLng();
   const t2 = line.t2.getLatLng();
   const fGHz = line.freq;
   const fHz = fGHz * 1e9;
   const c = 3e8;
   const λ = c / fHz;
   const distance = map.distance(t1, t2);
   const d1 = distance / 2;
   const d2 = distance / 2;
   const r = Math.sqrt((λ * d1 * d2) / (d1 + d2));

   const latMid = (t1.lat + t2.lat) / 2;
   const lngMid = (t1.lng + t2.lng) / 2;

   if (line.fresnelLayer) map.removeLayer(line.fresnelLayer);

   const ellipse = L.circle([latMid, lngMid], {
      radius: r,
      color: '#0078ff',
      fillColor: '#0078ff',
      fillOpacity: 0.25,
      dashArray: '4'
   }).addTo(map);

   line.fresnelLayer = ellipse;
   ellipse.bindPopup(
      `<b>Fresnel Zone</b><br>
         Frequency: ${fGHz} GHz<br>
         Radius: ${r.toFixed(2)} m<br>
         Distance: ${distance.toFixed(2)} m`
   ).openPopup();
}

function deleteTower(index) {
   const tower = towers[index];
   map.removeLayer(tower);
   towers.splice(index, 1);
   updateTowerList();
}

function deleteLink(index) {
   const line = links[index];
   if (line.fresnelLayer) map.removeLayer(line.fresnelLayer);
   map.removeLayer(line);
   links.splice(index, 1);
   updateLinkList();
}

function updateTowerList() {
   towerList.innerHTML = '';
   towers.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'tower-item';
      div.innerHTML = `${t.name} (${t.freq} GHz)
          <button class="delete-btn" onclick="deleteTower(${i})">X</button>`;
      towerList.appendChild(div);
   });
}

function updateLinkList() {
   linkList.innerHTML = '';
   links.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'link-item';
      const d = map.distance(l.t1.getLatLng(), l.t2.getLatLng()).toFixed(1);
      div.innerHTML = `${l.t1.name} ↔ ${l.t2.name} (${l.freq} GHz)
          <button class="delete-btn" onclick="deleteLink(${i})">X</button>`;
      linkList.appendChild(div);
   });
}

// expose delete functions globally for inline onclick
window.deleteTower = deleteTower;
window.deleteLink = deleteLink;