const buttonThemeColor = "#e30000";


/**
 * Renders the quiz content based on the data type.
 * @param {Object[]} data 
 */
function renderQuiz(data) {
    const { type, subject, body, content } = data[0];
    switch (type) {
        case "Email": Email(subject, body); break;
        case "Tweet": Tweet(content); break;
        case "SMS": SMS(content); break;
        default: throw new Error(`Data type mismatched: renderQuiz does not know what ${type} is.`);
    }

    // Create buttons for reporting
    const reportButtonsContainer = createElement('div', '', { margin: '10px auto', textAlign: 'center' });

    const maliciousButton = createElement('button', 'Report as Malicious', {
        backgroundColor: buttonThemeColor,
        color: 'white',
        border: 'none',
        borderRadius: '980px',
        padding: '10px 20px',
        margin: '0 5px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background-color 0.3s',
    });
    maliciousButton.style.cssText += 'box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);';
    maliciousButton.onclick = () => alert('Reported as malicious!');

    const notMaliciousButton = createElement('button', 'Report as Not Malicious', {
        backgroundColor: 'transparent',
        color: buttonThemeColor,
        border: `2px solid ${buttonThemeColor}`,
        borderRadius: '980px',
        padding: '10px 20px',
        margin: '0 5px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background-color 0.3s, color 0.3s',
    });

    notMaliciousButton.onclick = () => alert('Reported as not malicious!');

    reportButtonsContainer.appendChild(maliciousButton);
    reportButtonsContainer.appendChild(notMaliciousButton);
    
    document.body.appendChild(reportButtonsContainer);
}

// Assuming createElement and other functions are defined as in the previous examples.


function createElement(tag, innerText, styles = {}) {
    const el = document.createElement(tag);
    el.innerText = innerText;
    Object.assign(el.style, styles);
    return el;
}

function Email(subjectContent, bodyContent) {
    const frame = createElement("div", "", {
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "10px",
        padding: "10px",
        margin: "10px auto",
        backgroundColor: "#1c1c1e", // Dark mode background
        color: "#fff",
        width: "85%",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)"
    });

    // Create elements for the email
    const sender = createElement("p", "Major League Hacking", { margin: "0 0 5px" });
    const subject = createElement("p", subjectContent, { fontWeight: "bold", fontSize: "18px", margin: "5px 0" });
    const hr = createElement("hr", "", { borderColor: "rgb(255, 255, 255)", margin: "5px 0" });
    const body = createElement("p", bodyContent, { fontSize: "14px" });

    // Append elements to the frame
    frame.appendChild(sender);
    frame.appendChild(subject);
    frame.appendChild(hr);
    frame.appendChild(body);

    document.body.appendChild(frame);
}

const twitterUsernames = [
    "BreadPitt", "NotAFBIagent", "TeaRexRoars", "ShrekOnMain",
    "GhostedAgain", "404UsernameNotFound", "GuacwardAF", "ElonMuskRat",
    "DankSinatra", "BezosBeGone"
];

function Tweet(content) {
    const frame = createElement("div", "", {
        border: "1px solid #2c2f33",
        backgroundColor: "#23272a",
        padding: "10px",
        margin: "10px auto",
        color: "#ffffff",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
        width: "85%"
    });

    // Create a container for the username and timestamp
    const header = createElement("div", "", {
        display: "flex",
        alignItems: "center",
        margin: "0 0 5px"
    });

    const username = createElement("p", twitterUsernames[Math.floor(Math.random() * twitterUsernames.length)], {
        fontWeight: "bold",
        color: "#1da1f2",
        margin: "0"
    });

    const timestamp = createElement("p", "• Just now", {
        fontSize: "12px",
        color: "#b9bbbe",
        margin: "0",
        marginLeft: "5px" // Small left margin for spacing
    });

    // Append username and timestamp to the header
    header.appendChild(username);
    header.appendChild(timestamp);

    // Create the content element for the tweet
    const contentElement = createElement("p", content, { margin: "5px 0" });

    // Append header and content to the frame
    frame.appendChild(header);
    frame.appendChild(contentElement);

    document.body.appendChild(frame);
}



function SMS(content) {
    const contentContainer = createElement('div', content, {
        backgroundColor: "#333", // Gray for incoming messages
        padding: "10px",
        maxWidth: "85%",
        borderRadius: "16px",
        color: "white",
        margin: "10px auto",
        textAlign: "left",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
        display: "inline-block",
        paddingRight: "30px",
        marginLeft: "5px"
    });

    document.body.appendChild(contentContainer);
}

// Dummy data
const dummyEmail = [{ id: 9087, type: "Email", subject: "Concert discount", body: "Dear user,\nwe want to extend you an offer for free Coldplay tickets.\n\nRegards,\nHecker" }];
const dummyTweet = [{ id: 1029, type: "Tweet", content: "100% JOB GuArantee" }];
const dummyMessage = [{ id: 102892, type: "SMS", content: "Your USPS package is stuck" }];

const dummyDataArray = [dummyEmail, dummyTweet, dummyMessage];

renderQuiz(dummyDataArray[Math.floor(Math.random() * dummyDataArray.length)]);