const AWS_LINK = "https://ba9cyigyp2.us-west-2.awsapprunner.com";
let lastEmail = { subject: null, content: null };

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

const observer = new MutationObserver(() => {
    const hostname = window.location.hostname;

    if (hostname.includes("x.com")) {
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) {
            articles.forEach(article => {
                let requestBody = {
                    type: 'tweet',
                    content: extractContentWithLinks(article),
                    body: null,
                    subject: null
                };

                // Send request to background.js
                chrome.runtime.sendMessage({ action: "sendToAWS", requestBody }, response => {
                    renderFeedback(article, response.explanation);
                });
            });
        }
    } 
    
    else if (hostname.includes("mail.google.com")) {
        const emailSubject = document.querySelector('h2.hP');
        const emailBody = document.querySelector('div.a3s');

        if (emailSubject && emailBody) {
            let currentEmail = {
                subject: emailSubject.innerText.trim(),
                content: extractContentWithLinks(emailBody)
            };

            if (
                currentEmail.subject !== lastEmail.subject ||
                currentEmail.content !== lastEmail.content
            ) {
                let requestBody = {
                    type: 'email',
                    subject: currentEmail.subject,
                    content: currentEmail.content,
                    body: currentEmail.content
                };

                // Send request to background.js
                chrome.runtime.sendMessage({ action: "sendToAWS", requestBody }, response => {
                    renderFeedback(emailBody, response.explanation);
                });

                lastEmail = { ...currentEmail };
            }
        }
    }
});

observer.observe(document, {
    childList: true,
    subtree: true
});

function renderFeedback(targetElement, message) {
    if (!message) return;

    let existingFeedback = targetElement.querySelector('.feedback-message');
    
    if (existingFeedback) {
        existingFeedback.innerText = `⚠️ ${message}`;
    } else {
        let feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'feedback-message';
        feedbackDiv.innerText = `⚠️ ${message}`;
        
        Object.assign(feedbackDiv.style, {
            position: 'absolute', // Use absolute positioning
            top: '10px', // Position it at the top
            right: '10px', // Position it to the right
            padding: '8px',
            backgroundColor: '#ffebcc',
            color: '#993d00',
            fontSize: '14px',
            fontWeight: 'bold',
            borderRadius: '4px',
            border: '1px solid #ffb84d',
            zIndex: '10000', // Ensure it's on top
            maxWidth: '90%', // Prevent overflow
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' // Add some shadow for better visibility
        });

        // Set the target element's position to relative if it's not already
        if (getComputedStyle(targetElement).position === 'static') {
            targetElement.style.position = 'relative';
        }

        targetElement.appendChild(feedbackDiv);
    }
}
