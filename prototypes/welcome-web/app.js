/* global document */

const screens = [...document.querySelectorAll("[data-screen]")];
const navButtons = [...document.querySelectorAll(".bottom-nav [data-panel]")];

const concepts = {
  family: { symbol: "♧", eyebrow: "OUR CIRCLE", title: "Everybody has a place here.", body: "A shared view for staying close, checking in, and making room for what matters.", className: "family" },
  moments: { symbol: "✦", eyebrow: "MOMENTS", title: "Keep the little things close.", body: "A soft home for wins, memories, and the everyday moments your family wants to remember.", className: "moments" },
  more: { symbol: "•••", eyebrow: "MORE", title: "The rest of your Bip world.", body: "Settings, trusted people, safety tools, and the parts of the experience that grow with you.", className: "more" },
};

function show(panel) {
  const screenName = concepts[panel] ? "concept" : panel;
  screens.forEach((screen) => { screen.hidden = screen.dataset.screen !== screenName; });

  if (concepts[panel]) {
    const concept = concepts[panel];
    const symbol = document.querySelector("[data-concept-symbol]");
    symbol.textContent = concept.symbol;
    symbol.className = `panel-symbol ${concept.className}`;
    document.querySelector("[data-concept-eyebrow]").textContent = concept.eyebrow;
    document.querySelector("[data-concept-title]").textContent = concept.title;
    document.querySelector("[data-concept-body]").textContent = concept.body;
  }

  navButtons.forEach((button) => {
    const active = button.dataset.panel === panel;
    button.classList.toggle("active", active);
    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

document.addEventListener("click", (event) => {
  const panelButton = event.target.closest("[data-panel]");
  if (panelButton) show(panelButton.dataset.panel);

  const roleButton = event.target.closest("[data-role]");
  if (roleButton) {
    const role = roleButton.dataset.role;
    document.querySelector("[data-success-title]").textContent = role === "teen" ? "Your space is ready." : "Your family space is ready.";
    document.querySelector("[data-success-body]").textContent = `This is where the next part of the ${role} experience would begin.`;
    show("success");
  }

  const soundButton = event.target.closest("[data-sound]");
  if (soundButton) {
    const on = soundButton.getAttribute("aria-pressed") !== "true";
    soundButton.setAttribute("aria-pressed", String(on));
    soundButton.querySelector("span").textContent = on ? "♫" : "♪";
  }
});
