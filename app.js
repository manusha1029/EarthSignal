const STORAGE_KEY = "earthsignal_reports_v1";
const form = document.getElementById("report-form");
const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photo-preview");
const uploadTitle = document.getElementById("upload-title");
const uploadHint = document.getElementById("upload-hint");
const formMessage = document.getElementById("form-message");
const reportsList = document.getElementById("reports-list");
const statusFilter = document.getElementById("status-filter");
let selectedPhotoData = "";
let map = null;
let markersLayer = null;

function loadReports() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch (error) { return []; }
}
function saveReports(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    return true;
  } catch (error) {
    formMessage.textContent = "Your browser storage is full. Try a smaller photo.";
    return false;
  }
}
function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, function (char) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char];
  });
}
function prettyDate(value) {
  return new Date(value).toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});
}
function statusClass(status) {
  if (status === "Resolved") return "resolved";
  if (status === "Under review") return "review";
  return "";
}
let selectedCoordinates = null;
function setCoordinateSelection(latlng) {
  selectedCoordinates = {lat: Number(latlng.lat.toFixed(6)), lng: Number(latlng.lng.toFixed(6))};
  const status = document.getElementById("coordinate-status");
  if (status) status.textContent = "Selected location: " + selectedCoordinates.lat + ", " + selectedCoordinates.lng;
  if (map) {
    if (window.selectionMarker) map.removeLayer(window.selectionMarker);
    window.selectionMarker = L.marker([selectedCoordinates.lat, selectedCoordinates.lng]).addTo(map).bindPopup("Selected report location").openPopup();
  }
}
function initMap() {
  const mapElement = document.getElementById("map");
  if (!window.L) {
    mapElement.innerHTML = '<div class="empty-state"><strong>Map library could not load</strong><p>Check your internet connection and refresh.</p></div>';
    return;
  }
  map = L.map("map", {scrollWheelZoom:false}).setView([13.02, 80.18], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  map.on("click", function (event) { setCoordinateSelection(event.latlng); });
  document.getElementById("use-my-location").addEventListener("click", function () {
    const status = document.getElementById("coordinate-status");
    if (!navigator.geolocation) { status.textContent = "Location is not supported by this browser. Tap the map to choose a point."; return; }
    status.textContent = "Requesting location permission…";
    navigator.geolocation.getCurrentPosition(function (position) {
      const point = {lat:position.coords.latitude,lng:position.coords.longitude};
      map.setView([point.lat,point.lng], 15);
      setCoordinateSelection(point);
    }, function () {
      status.textContent = "Location unavailable or permission denied. Tap the map to choose a point.";
    }, {enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  });
  renderMapMarkers();
}
function renderMapMarkers() {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();
  const reports = loadReports();
  reports.forEach(function (report) {
    if (typeof report.lat !== "number" || typeof report.lng !== "number") return;
    const color = report.status === "Resolved" ? "#5d9c69" : "#d39a45";
    const marker = L.circleMarker([report.lat, report.lng], {
      radius:8, color:"#ffffff", weight:2, fillColor:color, fillOpacity:0.95
    }).addTo(markersLayer);
    marker.bindPopup('<div class="popup-title">' + escapeHTML(report.title) + '</div><div>' + escapeHTML(report.category) + '</div><div class="popup-status">' + escapeHTML(report.status) + '</div><div>' + escapeHTML(report.location) + '</div>');
  });
}
function renderDashboard() {
  const reports = loadReports();
  document.getElementById("stat-total").textContent = reports.length;
  document.getElementById("stat-review").textContent = reports.filter(r => r.status !== "Resolved").length;
  document.getElementById("stat-resolved").textContent = reports.filter(r => r.status === "Resolved").length;
  document.getElementById("stat-categories").textContent = new Set(reports.map(r => r.category)).size;
  document.getElementById("nav-count").textContent = reports.length;
  document.getElementById("reports-count").textContent = reports.length;
  const filter = statusFilter.value;
  const visible = reports.filter(r => filter === "all" || r.status === filter);
  if (!visible.length) {
    reportsList.innerHTML = '<div class="empty-state"><span class="empty-icon">⌖</span><strong>' + (reports.length ? 'No reports match this filter' : 'No reports yet') + '</strong><p>' + (reports.length ? 'Choose another status to see more reports.' : 'Be the first to document an environmental issue in your community.') + '</p></div>';
  } else {
    reportsList.innerHTML = visible.slice().reverse().map(function (report) {
      const image = report.photo || "";
      return '<article class="report-row">' +
        '<img class="report-thumb" src="' + image + '" alt="Evidence photo for ' + escapeHTML(report.title) + '">' +
        '<div class="report-details"><h3>' + escapeHTML(report.title) + '</h3>' +
        '<div class="report-meta">⌖ ' + escapeHTML(report.location) + '<br>▦ ' + escapeHTML(report.category) + ' · ' + prettyDate(report.createdAt) + '</div>' +
        '<span class="report-tag">Evidence saved · '+(report.analysis ? 'AI analyzed' : 'AI analysis available')+'</span>' +
        '<div class="report-actions">' +
        (report.status !== "Under review" ? '<button class="mini-button" data-action="review" data-id="' + report.id + '">Mark under review</button>' : '') +
        (report.status !== "Resolved" ? '<button class="mini-button" data-action="resolve" data-id="' + report.id + '">Mark resolved</button>' : '') +
        '<button class="mini-button" data-action="analyze" data-id="' + report.id + '">Analyze with AI</button>' +
        '<button class="mini-button" data-action="summary" data-id="' + report.id + '">Evidence summary</button>' +
        (report.analysis ? '<div class="ai-result"><strong>AI-assisted observations</strong><pre>' + escapeHTML(report.analysis) + '</pre><small>AI output can be wrong; human review is required.</small></div>' : '') +
        '</div></div><span class="report-status ' + statusClass(report.status) + '">' + escapeHTML(report.status) + '</span></article>';
    }).join("");
  }
  renderMapMarkers();
}
function buildSummary(report) {
  return "EARTHSIGNAL — EVIDENCE SUMMARY\n\nReport: " + report.title +
    "\nCategory selected by reporter: " + report.category +
    "\nLocation supplied: " + report.location +
    "\nDate submitted: " + prettyDate(report.createdAt) +
    "\nCurrent status: " + report.status +
    "\nReporter observation: " + (report.description || "No additional description supplied.") +
    "\nAI-assisted observations: " + (report.analysis || "No AI analysis run.") +
    "\n\nEvidence note: This summary records user-submitted information only. The photograph and location have not been independently verified, AI observations, if included, are assistive and may be inaccurate.";
}
photoInput.addEventListener("change", function () {
  const file = photoInput.files && photoInput.files[0];
  selectedPhotoData = "";
  photoPreview.hidden = true;
  if (!file) {
    uploadTitle.textContent = "Choose a photo to upload";
    uploadHint.textContent = "JPG, PNG or WEBP · up to 8 MB";
    return;
  }
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
    photoInput.value = "";
    formMessage.textContent = "Please choose a JPG, PNG or WEBP image.";
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    photoInput.value = "";
    formMessage.textContent = "This photo is larger than 8 MB. Please choose a smaller image.";
    return;
  }
  const reader = new FileReader();
  reader.onload = function () {
    const image = new Image();
    image.onload = function () {
      const canvas = document.createElement("canvas");
      const maxSide = 1100;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      selectedPhotoData = canvas.toDataURL("image/jpeg", 0.78);
      photoPreview.src = selectedPhotoData;
      photoPreview.hidden = false;
      uploadTitle.textContent = file.name;
      uploadHint.textContent = "Photo ready · " + Math.max(1, Math.round(file.size / 1024)) + " KB original";
      formMessage.textContent = "";
    };
    image.onerror = function () {
      formMessage.textContent = "This image could not be opened. Try another photo.";
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});
form.addEventListener("submit", function (event) {
  event.preventDefault();
  if (!selectedPhotoData) {
    formMessage.textContent = "Please choose a photo as evidence before submitting.";
    return;
  }
  if (!selectedCoordinates) {
    formMessage.textContent = "Please select the report location by tapping the map or using your current location button.";
    document.getElementById("coordinate-status").textContent = "Location needed before submitting a report.";
    document.getElementById("map-section").scrollIntoView({behavior:"smooth",block:"center"});
    return;
  }
  const reports = loadReports();
  const report = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    title: form.title.value.trim(),
    category: form.category.value,
    location: form.location.value.trim(),
    description: form.description.value.trim(),
    photo: selectedPhotoData,
    status: "Submitted",
    createdAt: new Date().toISOString(),
    lat: selectedCoordinates.lat,
    lng: selectedCoordinates.lng
  };
  const possibleDuplicate = reports.some(function (old) {
    return old.category === report.category &&
      old.location.trim().toLowerCase() === report.location.trim().toLowerCase() &&
      old.title.trim().toLowerCase() === report.title.trim().toLowerCase();
  });
  if (possibleDuplicate) {
    formMessage.textContent = "Possible duplicate: a report with the same title, category and location already exists. Check the report log before submitting again.";
    return;
  }
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Submitting report…";
  fetch("/api/reports", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(report)})
    .then(async function(response) {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Report submission failed.");
      const saved = data.report;
      const updated = loadReports().filter(r => String(r.id) !== String(saved.id));
      updated.push(saved);
      saveReports(updated);
      form.reset(); selectedPhotoData = ""; selectedCoordinates = null;
      const coordinateStatus = document.getElementById("coordinate-status");
      if (coordinateStatus) coordinateStatus.textContent = "Tap the map to select the report location.";
      if (window.selectionMarker && map) { map.removeLayer(window.selectionMarker); window.selectionMarker = null; }
      photoPreview.hidden = true; uploadTitle.textContent = "Choose a photo to upload"; uploadHint.textContent = "JPG, PNG or WEBP · up to 8 MB";
      formMessage.textContent = "Report submitted to the shared EarthSignal database. Its evidence has not yet been independently verified.";
      renderDashboard();
    }).catch(function(error) { formMessage.textContent = error.message || "Report submission failed. Please try again."; })
    .finally(function() { submitButton.disabled = false; submitButton.innerHTML = '<span>＋</span> Submit report <span class="button-arrow">↗</span>'; });
});
statusFilter.addEventListener("change", renderDashboard);
reportsList.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const reports = loadReports();
  const report = reports.find(r => r.id === button.dataset.id);
  if (!report) return;
  if (action === "review" || action === "resolve") {
    const nextStatus = action === "review" ? "Under review" : "Resolved";
    button.disabled = true;
    fetch("/api/report-status", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:report.id,status:nextStatus})})
      .then(async function(response) { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Could not update status."); report.status = data.status; saveReports(reports); renderDashboard(); })
      .catch(function(error) { button.disabled = false; alert(error.message || "Could not update report status. Moderator access may be required."); });
  } else if (action === "analyze") {
    button.disabled = true;
    button.textContent = "Analyzing…";
    fetch("/api/analyze-image", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({reportId: report.id})
    }).then(async function (response) {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "AI analysis failed.");
      report.analysis = data.analysis;
      saveReports(reports);
      renderDashboard();
    }).catch(function (error) {
      button.disabled = false;
      button.textContent = "Analyze with AI";
      alert(error.message || "AI analysis failed. Please try again.");
    });
  } else if (action === "summary") {
    const blob = new Blob([buildSummary(report)], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "earthsignal-evidence-" + report.id.slice(0,8) + ".txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
});
document.getElementById("jump-report").addEventListener("click", function () {
  document.getElementById("report-section").scrollIntoView({behavior:"smooth",block:"start"});
  document.getElementById("issue-title").focus({preventScroll:true});
});
initMap();
renderDashboard();
fetch('/api/reports')
  .then(async function(response) {
    if (!response.ok) throw new Error('Shared reports unavailable');
    const data = await response.json();
    if (Array.isArray(data.reports)) {
      saveReports(data.reports);
      renderDashboard();
    }
  })
  .catch(function() {
    const message = document.getElementById('form-message');
    if (message) message.textContent = 'Could not connect to the shared report database. Refresh the page or try again later.';
  });