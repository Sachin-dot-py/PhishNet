document.addEventListener("DOMContentLoaded", () => {
    const sections = {
      "phish-net-link": "phish-net",
      "quiz-yourself-link": "quiz"
    };
  
    Object.keys(sections).forEach(linkId => {
      document.getElementById(linkId).addEventListener("click", event => {
        event.preventDefault();
        Object.entries(sections).forEach(([id, section]) => {
          document.getElementById(section).style.display = (id === linkId) ? "block" : "none";
          document.getElementById(id).classList.toggle("active", id === linkId);
        });
        if (linkId === "phish-net-link") {
          resizeWindow(800, 600);
        } else {
          resizeWindow(800, 600);
        }
      });
    });
    document.getElementById("phish-net").style.display = "block";
    document.getElementById("quiz").style.display = "none";
    resizeWindow(800, 600);
  });
  
  function resizeWindow(width, height) {
    document.documentElement.style.width = `${width}px`;
    document.documentElement.style.height = `${height}px`;
    document.body.style.width = `${width}px`;
    document.body.style.height = `${height}px`;
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const checkbox = document.getElementById("flexSwitchCheckReverse");
    const label = document.querySelector("label[for='flexSwitchCheckReverse']");
    chrome.storage.sync.get("isOn", (data) => {
      const isOn = data.isOn ?? false;
      checkbox.checked = isOn;
      updateLabel(isOn);
    });
    function updateLabel(isOn) {
      label.textContent = isOn ? "We will be blocking malicious posts" : "We won't be blocking malicious posts";
    }
    checkbox.addEventListener("change", () => {
      const isOn = checkbox.checked;
      chrome.storage.sync.set({ isOn });
      updateLabel(isOn);
    });
  });