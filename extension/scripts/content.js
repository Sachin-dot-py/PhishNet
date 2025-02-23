let lastEmail = { subject: null, content: null };

const observer = new MutationObserver((mutations, obs) => {
    const hostname = window.location.hostname;
    const articles = document.querySelectorAll('article');

    if (hostname.includes("x.com") && articles.length > 0) {
        articles.forEach(article => {
            let requestBody = {
                type: 'tweet',
                content: null
            };

            // Extract lines from the tweet
            let lines = article.innerText.split('\n');

            // Remove first two lines (username and handle)
            if (lines.length > 2) {
                lines = lines.slice(2);
            }

            // Remove timestamp (typically a date or "• Xh" format)
            lines = lines.filter(line => !/^\s*·|^\d{1,2}[mhd]$|^\w+ \d{1,2}$/.test(line));

            // Remove excessive mentions (e.g., long lists of @usernames)
            requestBody.content = lines.join(' ').trim();

            console.log(requestBody);
        });

        obs.disconnect(); // Stop observing once the articles are loaded
    } else if (hostname.includes("mail.google.com")) {
        const emailSubject = document.querySelector('h2.hP');
        const emailBody = document.querySelector('div.a3s');

        if (emailSubject && emailBody) {
            let currentEmail = {
                subject: emailSubject.innerText.trim(),
                content: emailBody.innerText.trim()
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
                lastEmail = currentEmail;
            }
        }
    }
});

observer.observe(document, {
    childList: true,
    subtree: true
});
