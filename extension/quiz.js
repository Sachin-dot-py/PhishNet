const AWS_LINK = "https://ba9cyigyp2.us-west-2.awsapprunner.com/";
const buttonThemeColor = "#e30000";
const greenButton = "#09b852";

let questionDeque = [];
let quizContainer; // Container to hold quiz content

// Function to fetch questions from the API
async function fetchQuestions() {
    const response = await fetch(`${AWS_LINK}/api/game/question/starter`);
    const questions = await response.json();
    questionDeque = questions; // Initialize the deque with the fetched questions
}

// Function to enqueue new questions
async function loadMoreQuestions() {
    const response = await fetch(`${AWS_LINK}/api/game/question/lazy_loading`);
    const questions = await response.json();
    questionDeque.push(...questions); // Add new questions to the deque
}

// Function to render a question
async function renderNextQuestion() {
    if (questionDeque.length === 0) {
        await loadMoreQuestions(); // Load more questions if the deque is empty
    }
    const questionData = questionDeque.shift(); // Dequeue the first question

    if (!questionData) {
        console.error('No question data available to render');
        return;
    }

    console.log('Rendering question data:', questionData); // Debug log to check question data
    clearQuizContainer(); // Clear previous question
    renderQuiz(questionData); // Render the question
}

// Function to clear the quiz container
function clearQuizContainer() {
    if (quizContainer) {
        quizContainer.innerHTML = ''; // Clear the container
    }
}

// Function to render the quiz content based on the data type.
function renderQuiz(data) {
    const { type, subject, body, content, malicious } = data; // Include malicious property

    // Create a new quiz container if it doesn't exist
    if (!quizContainer) {
        quizContainer = createElement('div', '', { margin: '10px auto' });
        document.body.appendChild(quizContainer);
    }

    // Render the question based on its type
    switch (type) {
        case "email": Email(subject, body); break;
        case "tweet": Tweet(content); break;
        case "message": SMS(content); break;
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
    maliciousButton.onclick = async () => {
        if (malicious) {
            alert('Correct! It is malicious.');
        } else {
            alert('Wrong! It is not malicious.');
        }
        await renderNextQuestion(); // Render the next question after reporting
    };

    const notMaliciousButton = createElement('button', 'Report as Not Malicious', {
        backgroundColor: greenButton,
        color: 'white',
        border: 'none',
        borderRadius: '980px',
        padding: '10px 20px',
        margin: '0 5px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background-color 0.3s',
    });
    notMaliciousButton.onclick = async () => {
        if (!malicious) {
            alert('Correct! It is not malicious.');
        } else {
            alert('Wrong! It is malicious.');
        }
        await renderNextQuestion(); // Render the next question after reporting
    };

    reportButtonsContainer.appendChild(maliciousButton);
    reportButtonsContainer.appendChild(notMaliciousButton);
    
    quizContainer.appendChild(reportButtonsContainer); // Append buttons to the quiz container
}

// Function to create elements
function createElement(tag, innerText, styles = {}) {
    const el = document.createElement(tag);
    el.innerText = innerText;
    Object.assign(el.style, styles);
    return el;
}

// Email rendering function
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

    const sender = createElement("p", "Major League Hacking", { margin: "0 0 5px" });
    const subject = createElement("p", subjectContent, { fontWeight: "bold", fontSize: "18px", margin: "5px 0" });
    const hr = createElement("hr", "", { borderColor: "rgb(255, 255, 255)", margin: "5px 0" });
    const br = createElement("br");
    const body = createElement("p", bodyContent, { fontSize: "14px" });

    frame.appendChild(sender);
    frame.appendChild(subject);
    frame.appendChild(hr);
    frame.appendChild(br);
    frame.appendChild(body);

    quizContainer.appendChild(frame); // Append the email frame to the quiz container
}

// Tweet rendering function
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

    header.appendChild(username);
    header.appendChild(timestamp);

    const contentElement = createElement("p", content, { margin: "5px 0" });

    frame.appendChild(header);
    frame.appendChild(contentElement);

    quizContainer.appendChild(frame); // Append the tweet frame to the quiz container
}

// SMS rendering function
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
        marginLeft: "20px"
    });

    quizContainer.appendChild(contentContainer); // Append the SMS content to the quiz container
}

// Fetch the initial questions
fetchQuestions().then(renderNextQuestion); // Start by fetching questions and rendering the first one
