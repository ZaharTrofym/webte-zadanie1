const toggleButton = document.querySelector(".nav__toggle");
const navList = document.querySelector(".nav__list");


toggleButton.addEventListener("click", () => {
  const isOpen = navList.classList.toggle("nav__list--open");
  toggleButton.setAttribute("aria-expanded", isOpen);
});


const timetable = document.querySelector(".timetable");

if (timetable) {
  const SEMESTER_START = new Date(2026, 8, 21);
  const SEMESTER_END = new Date(2026, 11, 18, 23, 59);

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
