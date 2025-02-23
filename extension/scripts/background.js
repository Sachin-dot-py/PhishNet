const AWS_LINK = "https://ba9cyigyp2.us-west-2.awsapprunner.com";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendToAWS") {
    fetch(`${AWS_LINK}/api/blocker/predictMalicious`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message.requestBody)
    })
    .then(response => response.json())
    .then(data => {
      console.log("Response from AWS:", data);
      sendResponse(data);
    })
    .catch(error => {
      console.error("Error sending request to AWS:", error);
      sendResponse({ error: error.message });
    });
    return true;
  }
});