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
            content += "\n"; // Ensure proper line breaks between elements
        }
    }

    element.childNodes.forEach(traverseNodes);
    return content.trim();
}

const observer = new MutationObserver(() => {
    const hostname = window.location.hostname;

    // Handle X (Twitter)
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

                console.log(requestBody);
            });
        }
    } 
    
    // Handle Gmail
    else if (hostname.includes("mail.google.com")) {
        const emailSubject = document.querySelector('h2.hP');
        const emailBody = document.querySelector('div.a3s');

        if (emailSubject && emailBody) {
            let currentEmail = {
                subject: emailSubject.innerText.trim(),
                content: extractContentWithLinks(emailBody)
            };

            // Check if the email is different from the last logged one
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

                console.log(requestBody);

                // Update last logged email
                lastEmail = { ...currentEmail };
            }
        }
    }
});

observer.observe(document, {
    childList: true,
    subtree: true
});
