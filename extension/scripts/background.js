chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "analyzeContent") {
        console.log("Sending extracted content to API:", message.payload);

        // API endpoint for analysis
        const API_URL = "https://phishnet.tech/api/blocker/predictMalicious";

        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message.payload)
        })
        .then(response => response.json())
        .then(data => {
            console.log("API Response:", data);

            // Send response back to content script
            chrome.tabs.sendMessage(sender.tab.id, {
                action: "displayAnalysis",
                result: data
            });
        })
        .catch(error => console.error("API Error:", error));
    }
});
