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

            // Adjust window size based on selection
            if (linkId === "phish-net-link") {
                resizeWindow(800, 600);
            } else {
                resizeWindow(800, 600);
            }
        });
    });

    // Set default active section
    document.getElementById("phish-net").style.display = "none";
    document.getElementById("quiz").style.display = "block";
    resizeWindow(800, 200); // Set initial size
});

// Function to resize the window
function resizeWindow(width, height) {
    document.documentElement.style.width = `${width}px`;
    document.documentElement.style.height = `${height}px`;
    document.body.style.width = `${width}px`;
    document.body.style.height = `${height}px`;
}


document.addEventListener("DOMContentLoaded", () => {
    const checkbox = document.getElementById("flexSwitchCheckReverse");
    const label = document.querySelector("label[for='flexSwitchCheckReverse']");

    // Load the stored state from Chrome storage
    chrome.storage.sync.get("isOn", (data) => {
        const isOn = data.isOn ?? false; // Default to false if not set
        checkbox.checked = isOn;
        updateLabel(isOn);
    });

    // Function to update the label text
    function updateLabel(isOn) {
        label.textContent = isOn ? "We will be blocking malicious posts" : "We won't be blocking malicious posts";
    }

    // Event listener for checkbox toggle
    checkbox.addEventListener("change", () => {
        const isOn = checkbox.checked;
        chrome.storage.sync.set({ isOn }); // Save state in Chrome storage
        updateLabel(isOn);
    });
});
