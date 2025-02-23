const AWS_LINK = "https://ba9cyigyp2.us-west-2.awsapprunner.com";
const endpoint = `${AWS_LINK}/api/blocker/predictMalicious`;

function extractContentWithLinks(element) {
    let content = "";

    function traverseNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            content += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === "A" && node.hasAttribute("href")) {
                let href = node.getAttribute("href");
                let text = node.textContent.trim();
                content += `<a href="${href}">${text}</a>`;
            } else {
                node.childNodes.forEach(traverseNodes);
            }
        }

        if (node.nextSibling) {
            content += "\n";
        }
    }

    element.childNodes.forEach(traverseNodes);
    return content.trim();
}

if (window.location.hostname === 'x.com') {
    const processedTweets = new Set(); // Track processed tweet texts

    const observer = new MutationObserver(() => {
        const articles = document.querySelectorAll('article');

        articles.forEach(article => {
            // Select the main content of the tweet
            const mainTweetText = article.querySelector('div[lang]'); // Assuming the main text is in a div with lang attribute
            if (mainTweetText) {
                const tweetText = mainTweetText.innerText;

                // Only process the tweet if it hasn't been processed
                if (!processedTweets.has(tweetText)) {
                    processedTweets.add(tweetText); // Mark this tweet as processed

                    // Prepare request body for AWS
                    const requestBody = {
                        type: 'tweet',
                        content: tweetText
                    };

                    // Send request to background.js
                    chrome.runtime.sendMessage({ action: "sendToAWS", requestBody }, response => {
                        console.log(response); // Log the response from background.js
                        renderFeedback(article, response.explanation); // Render feedback for this tweet
                    });
                }
            }
        });
    });

    observer.observe(document, {
        childList: true,
        subtree: true
    });
} else if (window.location.hostname === 'mail.google.com') {
    const processedEmails = new Set(); // Track processed email subjects
    let lastEmail = { subject: null, content: null };

    const observer = new MutationObserver(() => {
        const emailSubject = document.querySelector('h2.hP');
        const emailBody = document.querySelector('div.a3s');

        if (emailSubject && emailBody) {
            let currentEmail = {
                subject: emailSubject.innerText.trim(),
                content: extractContentWithLinks(emailBody)
            };

            // Only process the email if the subject has changed and it hasn't been processed
            if (
                currentEmail.subject !== lastEmail.subject &&
                !processedEmails.has(currentEmail.subject)
            ) {
                processedEmails.add(currentEmail.subject); // Mark this email as processed

                let requestBody = {
                    type: 'email',
                    subject: currentEmail.subject,
                    content: currentEmail.content,
                    body: currentEmail.content
                };

                // Send request to background.js
                chrome.runtime.sendMessage({ action: "sendToAWS", requestBody }, response => {
                    renderFeedback(emailBody, response.explanation); // Render feedback for this email
                });

                lastEmail = { ...currentEmail }; // Update the lastEmail object
            }
        }
    });

    observer.observe(document, {
        childList: true,
        subtree: true
    });
}

// Function to render feedback
function renderFeedback(targetElement, message) {
    if (!message) return;

    // Create a feedback div
    let feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-message';
    feedbackDiv.innerText = message;

    // Style the feedback component
    Object.assign(feedbackDiv.style, {
        position: 'absolute', // Set position to absolute
        top: '2px', // Position it at the top
        right: '10px', // Position it to the right
        padding: '8px',
        backgroundColor: '#ffebcc',
        color: '#993d00',
        fontSize: '14px',
        fontWeight: 'bold',
        borderRadius: '4px',
        border: '1px solid #ffb84d',
        zIndex: '10000',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)', // Add some shadow for better visibility
        fontFamily: 'Arial' // Set font family to Arial
    });

    // Set the target element's position to relative if it's not already
    if (getComputedStyle(targetElement).position === 'static') {
        targetElement.style.position = 'relative';
    }

    // Append feedback div to the target element
    targetElement.appendChild(feedbackDiv);
}
