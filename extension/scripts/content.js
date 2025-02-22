// Log that the content script is running
console.log("Content script loaded");

// Get the current page URL
const currentURL = window.location.href;

// Function to send extracted data to the background script or API
function sendData(type, content = "", subject = "", body = "") {
    const data = {
        type: type,
        content: content,
        subject: subject,
        body: body
    };

    console.log("Extracted Data:", data);

    // Send data to background.js or API endpoint
    chrome.runtime.sendMessage({ action: "analyzeContent", payload: data });
}

// Function to extract Gmail email content
async function extractEmail() {
    const subjectElement = document.querySelector("h2.hP"); // Subject line
    const bodyElement = document.querySelector("div.a3s"); // Email body container

    if (subjectElement && bodyElement) {
        const emailSubject = subjectElement.innerText.trim();
        let emailBodyHTML = bodyElement.innerHTML; // Get full HTML content

        // Clean and extract text
        const emailBody = extractTextFromEmail(emailBodyHTML);

        // Ensure meaningful content
        if (emailSubject.length > 0 && emailBody.length > 10) {
            console.log("Cleaned Full Email Text:", emailBody);
            sendData("email", "", emailSubject, emailBody); // Correct JSON format for emails
        } else {
            console.log("Email content not fully loaded yet. Retrying...");
            setTimeout(extractEmail, 2000); // Retry after a delay
        }
    } else {
        console.log("Gmail email content not found.");
    }
}

// Function to clean HTML and extract text
function extractTextFromEmail(emailString) {
    if (typeof emailString !== 'string') {
        throw new Error("Input must be a string.");
    }

    // Remove all HTML tags
    let textContent = emailString.replace(/<[^>]*>?/gm, '');

    // Replace common HTML entities
    textContent = textContent.replace(/&nbsp;/g, ' ');  // Convert non-breaking spaces
    textContent = textContent.replace(/&amp;/g, '&');  // Convert ampersands
    textContent = textContent.replace(/&lt;/g, '<').replace(/&gt;/g, '>');  // Convert < and >

    // Remove excessive spaces and newlines
    textContent = textContent.replace(/\n{2,}/g, '\n');  // Replace multiple newlines with a single newline
    textContent = textContent.replace(/\s{2,}/g, ' ');   // Replace multiple spaces with a single space

    return textContent.trim();  // Trim leading/trailing spaces
}

// Function to extract tweet content
function extractTweet() {
    const tweetElement = document.querySelector("article div[lang]"); // Twitter/X tweet content

    if (tweetElement) {
        let tweetText = tweetElement.innerText.trim();

        // Remove duplicate spaces & newlines
        tweetText = tweetText.replace(/\n{2,}/g, '\n').replace(/\s{2,}/g, ' ');

        // Check if tweet is valid
        if (tweetText.length > 5) {
            console.log("Extracted Tweet Text:", tweetText);
            sendData("tweet", tweetText, "", ""); // Correct JSON format for tweets
        } else {
            console.log("Tweet content is empty or not fully loaded. Retrying...");
            setTimeout(extractTweet, 1000); // Retry after a short delay
        }
    } else {
        console.log("No tweet found on this page.");
    }
}

// Function to continuously detect email changes
function observeGmail() {
    const gmailContainer = document.querySelector("div[role='main']"); // Main email container in Gmail

    if (!gmailContainer) {
        console.log("Gmail email container not found.");
        return;
    }

    let lastEmailSubject = "";

    // Use MutationObserver to detect when a new email is opened
    const observer = new MutationObserver((mutationsList, observer) => {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList" || mutation.type === "subtree") {
                const currentSubjectElement = document.querySelector("h2.hP"); // Subject line
                
                if (currentSubjectElement) {
                    const currentSubject = currentSubjectElement.innerText.trim();
                    
                    // Check if the email subject has changed
                    if (currentSubject && currentSubject !== lastEmailSubject) {
                        console.log("New email detected:", currentSubject);
                        lastEmailSubject = currentSubject;
                    }
                }
                break;
            }
        }
    });

    observer.observe(gmailContainer, { childList: true, subtree: true });

    console.log("MutationObserver started: Watching for Gmail email changes...");
}

// Function to detect tweet changes dynamically
function observeTwitter() {
    const twitterContainer = document.querySelector("main"); // Main content area in X

    if (!twitterContainer) {
        console.log("Twitter/X content area not found.");
        return;
    }

    let lastTweetText = "";

    // Use MutationObserver to detect when a new tweet is opened
    const observer = new MutationObserver((mutationsList, observer) => {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList" || mutation.type === "subtree") {
                const currentTweetElement = document.querySelector("article div[lang]"); // Tweet content

                if (currentTweetElement) {
                    let currentTweetText = currentTweetElement.innerText.trim();

                    // Check if the tweet content has changed
                    if (currentTweetText && currentTweetText !== lastTweetText) {
                        console.log("New tweet detected:", currentTweetText);
                        lastTweetText = currentTweetText;
                    }
                }
                break;
            }
        }
    });

    observer.observe(twitterContainer, { childList: true, subtree: true });

    console.log("MutationObserver started: Watching for Twitter/X tweet changes...");
}

// Check if the user is on Gmail or X and extract data
if (currentURL.includes("mail.google.com")) {
    console.log("User is on Gmail:", currentURL);
    alert("You are on Gmail!");
    setTimeout(extractEmail, 3000); // Extract the first email
    observeGmail(); // Start watching for email changes
} else if (currentURL.includes("x.com")) {
    console.log("User is on X:", currentURL);
    alert("You are on X!");
    setTimeout(extractTweet, 2000); // Extract first tweet
    observeTwitter(); // Start watching for tweet changes
}

// Handle API response
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "displayAnalysis") {
        const { score, explanation } = message.result;

        // Show alert or inject banner
        if (score === 1) {
            alert("WARNING \n\n" + explanation);
        } else {
            alert("It is safe \n\n" + explanation);
        }
    }
});
