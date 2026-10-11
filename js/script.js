const toggleButton = document.querySelector(".nav__toggle");
const navList = document.querySelector(".nav__list");


toggleButton.addEventListener("click", () => {
  const isOpen = navList.classList.toggle("nav__list--open");
  toggleButton.setAttribute("aria-expanded", isOpen);
});