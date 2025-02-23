const AWS_LINK = "https://ba9cyigyp2.us-west-2.awsapprunner.com";
const endpoint = `${AWS_LINK}/api/blocker/predictMalicious`;

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
        top: '10px', // Position it at the top
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

    // Append feedback div to the target tweet element
    targetElement.appendChild(feedbackDiv);
}
