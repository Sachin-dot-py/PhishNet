const AWS_LINK = "https://ba9cyigyp2.us-west-2.awsapprunner.com";
const endpoint = `${AWS_LINK}/api/blocker/predictMalicious`;

// Increments the posts screened counter and updates the #num-tracked element.
function incrementAndDisplayPostsScreened() {
  let count = localStorage.getItem("postsScreened");
  count = count ? parseInt(count) : 0;
  count++;
  localStorage.setItem("postsScreened", count);
  const counterEl = document.getElementById("num-tracked");
  if (counterEl) {
    counterEl.innerText = count;
  }
}

// Creates and appends a loading indicator ("Loading analysis...") to targetElement.
function showLoadingAnalysis(targetElement) {
  let analysisDiv = document.createElement("div");
  analysisDiv.className = "analysis-loading";
  analysisDiv.innerText = "Loading analysis...";
  Object.assign(analysisDiv.style, {
    position: "absolute",
    top: "2px",
    right: "10px",
    padding: "8px",
    backgroundColor: "#f0f0f0",
    color: "#333",
    fontSize: "14px",
    fontWeight: "bold",
    borderRadius: "4px",
    border: "1px solid #ccc",
    zIndex: "10000",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    fontFamily: "Arial"
  });
  if (getComputedStyle(targetElement).position === "static") {
    targetElement.style.position = "relative";
  }
  targetElement.appendChild(analysisDiv);
  return analysisDiv;
}

// Updates the analysisDiv with the explanation text along with a "Malicious:" or "Not Malicious:" label.
function updateAnalysisDiv(analysisDiv, score, explanation) {
  if (score >= 0.5) {
    analysisDiv.innerText = `Malicious: ${explanation}`;
    Object.assign(analysisDiv.style, {
      backgroundColor: "#ffcccc", // light red
      color: "#cc0000",
      border: "1px solid #ff0000"
    });
  } else {
    analysisDiv.innerText = `Not Malicious: ${explanation}`;
    Object.assign(analysisDiv.style, {
      backgroundColor: "#ccffcc", // light green
      color: "#006600",
      border: "1px solid #00cc00"
    });
  }
}

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
  const processedTweets = new Set();
  const observer = new MutationObserver(() => {
    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
      const mainTweetText = article.querySelector('div[lang]');
      if (mainTweetText) {
        const tweetText = mainTweetText.innerText;
        if (!processedTweets.has(tweetText)) {
          processedTweets.add(tweetText);
          const requestBody = { type: 'tweet', content: tweetText };
          incrementAndDisplayPostsScreened();
          // Show loading analysis indicator.
          const analysisDiv = showLoadingAnalysis(article);
          chrome.runtime.sendMessage({ action: "sendToAWS", requestBody }, response => {
            let score = parseFloat(response.score);
            if (!isNaN(score)) {
              updateAnalysisDiv(analysisDiv, score, response.explanation || "");
            } else {
              analysisDiv.innerText = response.explanation || "Analysis unavailable";
            }
          });
        }
      }
    });
  });
  observer.observe(document, { childList: true, subtree: true });
} else if (window.location.hostname === 'mail.google.com') {
  const processedEmails = new Set();
  let lastEmail = { subject: null, content: null };
  const observer = new MutationObserver(() => {
    const emailSubject = document.querySelector('h2.hP');
    const emailBody = document.querySelector('div.a3s');
    if (emailSubject && emailBody) {
      let currentEmail = {
        subject: emailSubject.innerText.trim(),
        content: extractContentWithLinks(emailBody)
      };
      if (currentEmail.subject !== lastEmail.subject && !processedEmails.has(currentEmail.subject)) {
        processedEmails.add(currentEmail.subject);
        let requestBody = {
          type: 'email',
          subject: currentEmail.subject,
          content: currentEmail.content,
          body: currentEmail.content
        };
        incrementAndDisplayPostsScreened();
        // Show loading indicator in the email body.
        const analysisDiv = showLoadingAnalysis(emailBody);
        chrome.runtime.sendMessage({ action: "sendToAWS", requestBody }, response => {
          let score = parseFloat(response.score);
          if (!isNaN(score)) {
            updateAnalysisDiv(analysisDiv, score, response.explanation || "");
          } else {
            analysisDiv.innerText = response.explanation || "Analysis unavailable";
          }
        });
        lastEmail = { ...currentEmail };
      }
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}

function renderFeedback(targetElement, message) {
  if (!message) return;
  let feedbackDiv = document.createElement('div');
  feedbackDiv.className = 'feedback-message';
  feedbackDiv.innerText = message;
  Object.assign(feedbackDiv.style, {
    position: 'absolute',
    top: '2px',
    right: '10px',
    padding: '8px',
    backgroundColor: '#ffebcc',
    color: '#993d00',
    fontSize: '14px',
    fontWeight: 'bold',
    borderRadius: '4px',
    border: '1px solid #ffb84d',
    zIndex: '10000',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    fontFamily: 'Arial'
  });
  if (getComputedStyle(targetElement).position === 'static') {
    targetElement.style.position = 'relative';
  }
  targetElement.appendChild(feedbackDiv);
}