const SEMESTER_START = new Date(2026, 8, 14);
const SEMESTER_END = new Date(2027, 2, 13, 23, 59);

const toggleButton = document.querySelector(".nav__toggle");
const navList = document.querySelector(".nav__list");


toggleButton.addEventListener("click", () => {
  const isOpen = navList.classList.toggle("nav__list--open");
  toggleButton.setAttribute("aria-expanded", isOpen);
});


const timetable = document.querySelector(".timetable");

if (timetable) {
  const TYPE_NAMES = {
    lecture: "prednáška",
    exercise: "cvičenie",
    pe: "telesná kultúra",
  };
  const DAY_PHRASES = ["v nedeľu", "v pondelok", "v utorok", "v stredu", "vo štvrtok", "v piatok", "v sobotu"];

  const statusText = document.querySelector("#status-text");
  const filterButtons = document.querySelectorAll(".filters__button");
  const filterEmpty = document.querySelector("#filter-empty");
  const progressFill = document.querySelector("#progress-fill");
  const progressValue = document.querySelector("#progress-value");
  const progressTrack = document.querySelector(".progress__track");

  const lessons = [];
  document.querySelectorAll(".lesson").forEach((cell) => {
    lessons.push({
      cell: cell,
      day: Number(cell.dataset.day),
      start: Number(cell.dataset.start),
      end: Number(cell.dataset.end),
      type: cell.dataset.type,
      title: cell.dataset.title,
    });
  });

  function updateStatus() {
    const now = new Date();
    const today = now.getDay();
    const hour = now.getHours() + now.getMinutes() / 60;

    lessons.forEach((lesson) => {
      lesson.cell.classList.remove("lesson--now");
      lesson.cell.removeAttribute("aria-current");
    });

    if (now < SEMESTER_START || now > SEMESTER_END) {
      statusText.textContent =
        "Semester práve neprebieha, takže výuku nemám. Rozvrh platí od " +
        SEMESTER_START.toLocaleDateString("sk-SK") +
        " do " +
        SEMESTER_END.toLocaleDateString("sk-SK") +
        ".";
      return;
    }

    const current = lessons.find((lesson) => {
      return lesson.day === today && hour >= lesson.start && hour < lesson.end;
    });

    if (current) {
      current.cell.classList.add("lesson--now");
      current.cell.setAttribute("aria-current", "time");
      statusText.textContent =
        "Práve prebieha: " + current.title + " (" + TYPE_NAMES[current.type] + "), do " + current.end + ":00.";
      return;
    }

    for (let offset = 0; offset <= 7; offset++) {
      const checkDay = (today + offset) % 7;
      const dayLessons = lessons.filter((lesson) => {
        return lesson.day === checkDay && (offset > 0 || lesson.start > hour);
      });

      if (dayLessons.length > 0) {
        dayLessons.sort((a, b) => a.start - b.start);
        const next = dayLessons[0];

        let when = DAY_PHRASES[checkDay];
        if (offset === 0) {
          when = "dnes";
        } else if (offset === 1) {
          when = "zajtra";
        }

        statusText.textContent =
          "Práve nemám výuku. Najbližšie ma zastihnete " +
          when +
          " o " +
          next.start +
          ":00 – " +
          next.title +
          " (" +
          TYPE_NAMES[next.type] +
          ").";
        return;
      }
    }

    statusText.textContent = "V rozvrhu nemám žiadne hodiny.";
  }

  function updateProgress() {
    const now = new Date();
    let percent = ((now - SEMESTER_START) / (SEMESTER_END - SEMESTER_START)) * 100;
    percent = Math.min(100, Math.max(0, Math.round(percent)));

    progressFill.style.width = percent + "%";
    progressValue.textContent = percent + " %";
    progressTrack.setAttribute("aria-valuenow", percent);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      let visibleCount = 0;

      filterButtons.forEach((other) => {
        other.setAttribute("aria-pressed", other === button);
      });

      lessons.forEach((lesson) => {
        const hidden = filter !== "all" && lesson.type !== filter;
        lesson.cell.classList.toggle("lesson--dimmed", hidden);
        if (!hidden) {
          visibleCount++;
        }
      });

      filterEmpty.hidden = visibleCount > 0;
    });
  });

  updateStatus();
  updateProgress();
  setInterval(updateStatus, 60000);
}

const mapElement = document.querySelector("#map");

if (mapElement && typeof L !== "undefined") {
  const PLACES = {
    school: {
      name: "Škola – FEI STU",
      lat: 48.151965,
      lng: 17.072995,
      letter: "Š",
      className: "map-marker--school",
      from: "zo školy",
      to: "do školy",
      away: "od školy",
    },
    home: {
      name: "Domov (približne)",
      lat: 48.118,
      lng: 17.109,
      letter: "D",
      className: "map-marker--home",
      from: "z domu",
      to: "domov",
      away: "od domova",
    },
  };
  const STORAGE_KEY = "webte1-map-points";

  const targetButtons = document.querySelectorAll(".filters__button");
  const distanceText = document.querySelector("#distance-text");
  const addCenterButton = document.querySelector("#add-center");
  const pointForm = document.querySelector("#point-form");
  const pointName = document.querySelector("#point-name");
  const cancelButton = document.querySelector("#point-cancel");
  const pointsList = document.querySelector("#points-list");
  const pointsEmpty = document.querySelector("#points-empty");

  let points = loadPoints();
  let target = "school";
  let selected = null;
  let pending = null;
  let pendingMarker = null;
  let routeLine = null;

  function loadPoints() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved)) {
        return saved.filter((point) => {
          return (
            typeof point.name === "string" &&
            typeof point.lat === "number" &&
            typeof point.lng === "number"
          );
        });
      }
    } catch (error) {
      console.error(error);
    }
    return [];
  }

  function savePoints() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    } catch (error) {
      console.error(error);
    }
  }

  function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const earthRadius = 6371;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatKm(km) {
    return km.toFixed(2).replace(".", ",") + " km";
  }

  function createIcon(extraClass, text) {
    return L.divIcon({
      className: "map-marker " + extraClass,
      html: text,
      iconSize: [34, 34],
    });
  }

  function createPopup(title, text) {
    const box = document.createElement("div");
    const strong = document.createElement("strong");
    const info = document.createElement("div");
    strong.textContent = title;
    info.textContent = text;
    box.append(strong, info);
    return box;
  }

  const map = L.map(mapElement);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  map.fitBounds(
    [
      [PLACES.school.lat, PLACES.school.lng],
      [PLACES.home.lat, PLACES.home.lng],
    ],
    { padding: [50, 50] }
  );

  const placeMarkers = {};
  Object.keys(PLACES).forEach((key) => {
    const place = PLACES[key];
    placeMarkers[key] = L.marker([place.lat, place.lng], {
      icon: createIcon(place.className, place.letter),
      title: place.name,
    }).addTo(map);
  });

  const pointsLayer = L.layerGroup().addTo(map);

  function render() {
    const targetPlace = PLACES[target];
    let start;

    if (selected !== null) {
      const point = points[selected];
      start = { lat: point.lat, lng: point.lng, from: "z bodu " + point.name };
    } else {
      const other = target === "school" ? PLACES.home : PLACES.school;
      start = { lat: other.lat, lng: other.lng, from: other.from };
    }

    const km = calculateDistanceKm(start.lat, start.lng, targetPlace.lat, targetPlace.lng);

    if (routeLine) {
      routeLine.remove();
    }
    routeLine = L.polyline(
      [
        [start.lat, start.lng],
        [targetPlace.lat, targetPlace.lng],
      ],
      { className: "route-line" }
    ).addTo(map);
    routeLine.bindTooltip(formatKm(km), {
      permanent: true,
      direction: "center",
      className: "route-tooltip",
    });

    const sentence = start.from + " " + targetPlace.to + " je to približne " + formatKm(km) + ".";
    distanceText.textContent = sentence.charAt(0).toUpperCase() + sentence.slice(1);

    Object.keys(PLACES).forEach((key) => {
      const place = PLACES[key];
      let info = "Cieľ";
      if (key !== target) {
        const distance = calculateDistanceKm(place.lat, place.lng, targetPlace.lat, targetPlace.lng);
        info = formatKm(distance) + " " + targetPlace.away;
      }
      placeMarkers[key].bindPopup(createPopup(place.name, info));
    });

    pointsLayer.clearLayers();
    pointsList.innerHTML = "";
    pointsEmpty.hidden = points.length > 0;

    points.forEach((point, index) => {
      const distance = calculateDistanceKm(point.lat, point.lng, targetPlace.lat, targetPlace.lng);
      const info = formatKm(distance) + " " + targetPlace.away;

      let markerClass = "map-marker--point";
      if (index === selected) {
        markerClass += " map-marker--selected";
      }
      const marker = L.marker([point.lat, point.lng], {
        icon: createIcon(markerClass, String(index + 1)),
        title: point.name,
      }).addTo(pointsLayer);
      marker.bindPopup(createPopup(point.name, info));
      marker.on("click", () => {
        selected = index;
        render();
        fitRoute();
      });

      const item = document.createElement("li");
      item.className = "points__item";

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "points__select";
      selectButton.setAttribute("aria-pressed", index === selected);

      const nameSpan = document.createElement("span");
      nameSpan.className = "points__name";
      nameSpan.textContent = point.name;

      const distanceSpan = document.createElement("span");
      distanceSpan.className = "points__distance";
      distanceSpan.textContent = info;

      selectButton.append(nameSpan, distanceSpan);
      selectButton.addEventListener("click", () => {
        if (selected === index) {
          selected = null;
        } else {
          selected = index;
        }
        render();
        fitRoute();
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "points__delete";
      deleteButton.textContent = "×";
      deleteButton.setAttribute("aria-label", "Odstrániť bod " + point.name);
      deleteButton.addEventListener("click", () => {
        points.splice(index, 1);
        if (selected === index) {
          selected = null;
        } else if (selected !== null && selected > index) {
          selected--;
        }
        savePoints();
        render();
      });

      item.append(selectButton, deleteButton);
      pointsList.appendChild(item);
    });
  }

  function fitRoute() {
    map.fitBounds(routeLine.getBounds(), { padding: [60, 60], maxZoom: 16 });
  }

  function openForm(latlng) {
    pending = latlng;
    if (pendingMarker) {
      pendingMarker.remove();
    }
    pendingMarker = L.marker(latlng, {
      icon: createIcon("map-marker--new", "+"),
      title: "Nový bod",
    }).addTo(map);
    pointForm.hidden = false;
    pointName.value = "";
    pointName.focus();
  }

  function closeForm() {
    pending = null;
    if (pendingMarker) {
      pendingMarker.remove();
      pendingMarker = null;
    }
    pointForm.hidden = true;
  }

  map.on("click", (event) => {
    openForm(event.latlng);
  });

  addCenterButton.addEventListener("click", () => {
    openForm(map.getCenter());
  });

  cancelButton.addEventListener("click", closeForm);

  pointForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = pointName.value.trim();
    if (name === "" || pending === null) {
      pointName.focus();
      return;
    }
    points.push({ name: name, lat: pending.lat, lng: pending.lng });
    selected = points.length - 1;
    savePoints();
    closeForm();
    render();
    fitRoute();
  });

  targetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      target = button.dataset.target;
      targetButtons.forEach((other) => {
        other.setAttribute("aria-pressed", other === button);
      });
      render();
      fitRoute();
    });
  });

  render();
} else if (mapElement) {
  mapElement.textContent = "Mapu sa nepodarilo načítať. Skontroluj pripojenie na internet a obnov stránku.";
}
