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
        });
    });

    // Set default active section
    document.getElementById("phish-net").style.display = "block";
    document.getElementById("quiz").style.display = "none";
});
