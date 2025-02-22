const observer = new MutationObserver((mutations, obs) => {
    const articles = document.querySelectorAll('article');
    if (articles.length > 0) {
        articles.forEach(article => {
            let requestBody = {
                type: null,
                subject: null,
                content: null,
                body: null
            };

            const hostname = window.location.hostname;

            if (hostname.includes('x.com')) {
                requestBody.type = 'tweet';
                
                // Extract lines from the tweet
                let lines = article.innerText.split('\n');

                // Remove first two lines (username and handle)
                if (lines.length > 2) {
                    lines = lines.slice(2);
                }

                // Remove timestamp (typically a date or "• Xh" format)
                lines = lines.filter(line => !/^\s*·|^\d{1,2}[mhd]$|^\w+ \d{1,2}$/.test(line));

                // Remove excessive mentions (e.g., long lists of @usernames)
                let content = lines.join(' ').trim();
                
                requestBody.content = content;
            }

            console.log(requestBody);
        });
        obs.disconnect(); // Stop observing once the articles are loaded
    }
});

observer.observe(document, {
    childList: true,
    subtree: true
});
