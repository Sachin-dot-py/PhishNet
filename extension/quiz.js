const AWS_LINK = "https://ba9cyigyp2.us-west-2.awsapprunner.com/";
const buttonThemeColor = "#e30000";
const greenButton = "#09b852";

let questionDeque = [];
let quizContainer;
let selectedWords = new Set();
let highlightEnabled = false;
let currentMaliciousState = null;

// Fetch questions from API
async function fetchQuestions() {
    const response = await fetch(`${AWS_LINK}/api/game/question/starter`);
    const questions = await response.json();
    questionDeque = questions;
}

// Load more questions if needed
async function loadMoreQuestions() {
    const response = await fetch(`${AWS_LINK}/api/game/question/lazy_loading`);
    const questions = await response.json();
    questionDeque.push(...questions);
}

// Render the next question
async function renderNextQuestion() {
    if (questionDeque.length === 0) {
        await loadMoreQuestions();
    }
    
    const currentQuestion = questionDeque.shift(); // Store current question

    if (!currentQuestion) {
        console.error("No question data available to render");
        return;
    }

    highlightEnabled = false; // Reset highlighting
    currentMaliciousState = currentQuestion.malicious;
    selectedWords.clear(); // Clear previous selections
    clearQuizContainer();
    renderQuiz(currentQuestion);
    
    // Attach currentQuestion to the window for reference in submitButton.onclick
    window.currentQuestion = currentQuestion;
}


function validateAnswer(isMalicious) {
    return isMalicious === currentMaliciousState;
}

// Clear quiz container
function clearQuizContainer() {
    if (quizContainer) {
        quizContainer.innerHTML = "";
    }
}

// Render quiz content
function renderQuiz(data) {
    const { type, subject, body, content, malicious } = data;

    if (!quizContainer) {
        quizContainer = createElement("div", "", { margin: "10px auto" });
        document.body.appendChild(quizContainer);
    }

    switch (type) {
        case "email":
            Email(subject, body);
            break;
        case "tweet":
            Tweet(content);
            break;
        case "message":
            SMS(content);
            break;
        default:
            throw new Error(`Unknown data type: ${type}`);
    }

    // Buttons container
    const reportButtonsContainer = createElement("div", "", { margin: "10px auto", textAlign: "center" });

    const maliciousButton = createElement("button", "Report as Malicious", {
        backgroundColor: buttonThemeColor,
        color: "white",
        border: "none",
        borderRadius: "980px",
        padding: "10px 20px",
        margin: "0 5px",
        cursor: "pointer",
        fontSize: "16px",
        transition: "background-color 0.3s",
    });
    maliciousButton.onclick = async () => {
        const message = validateAnswer(true) ? "Correct! This message is malicious." : "Incorrect! This message is not malicious.";
        alert(message);

        if (validateAnswer(true)) {
            enableHighlighting(reportButtonsContainer);
            return;
        }

        await renderNextQuestion();
    };

    const notMaliciousButton = createElement("button", "Report as Not Malicious", {
        backgroundColor: greenButton,
        color: "white",
        border: "none",
        borderRadius: "980px",
        padding: "10px 20px",
        margin: "0 5px",
        cursor: "pointer",
        fontSize: "16px",
        transition: "background-color 0.3s",
    });

    notMaliciousButton.onclick = async () => {
        const message = validateAnswer(false) ? "Correct! This message is not malicious." : "Incorrect! This message is malicious.";
        alert(message);
        await renderNextQuestion();
    };

    reportButtonsContainer.appendChild(maliciousButton);
    reportButtonsContainer.appendChild(notMaliciousButton);
    quizContainer.appendChild(reportButtonsContainer);
}

// Enable highlighting and show submit button
function enableHighlighting(reportButtonsContainer) {
    highlightEnabled = true;
    reportButtonsContainer.innerHTML = ""; // Remove previous buttons

    const submitButton = createElement("button", "Submit", {
        backgroundColor: buttonThemeColor,
        color: "white",
        border: "none",
        borderRadius: "980px",
        padding: "10px 20px",
        margin: "0 auto",
        cursor: "pointer",
        fontSize: "16px",
        transition: "background-color 0.3s",
        display: "block",
    });

    submitButton.onclick = async () => {
        if (selectedWords.size === 0) {
            alert("Selecting suspicious text is necessary.");
            return;
        }
    
        // Use the stored current question instead of questionDeque[0]
        const selectedWordsArray = getOrderedSelectedWords();
        const requestBody = {
            id: window.currentQuestion?.id, // Use stored question reference
            userMalicious: currentMaliciousState, // User's determination
        };
    
        console.log(window.currentQuestion); // Now logs the correct question
    
        if (window.currentQuestion?.type === "email") {
            requestBody.wordsListSubject = selectedWordsArray;
            requestBody.wordsListBody = [];
        } else {
            requestBody.wordsList = selectedWordsArray;
        }
    
    
        try {
            const response = await fetch(`${AWS_LINK}/api/game/getFeedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });
    
            const responseData = await response.json();
            alert(responseData.feedback);
        } catch (error) {
            console.error("Error submitting feedback:", error);
            alert("An error occurred while submitting your response.");
        }
    
        clearQuizContainer();
        renderNextQuestion();
    };
    


    quizContainer.appendChild(submitButton);
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
        backgroundColor: "#1c1c1e",
        color: "#fff",
        width: "85%",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
    });

    const sender = createElement("p", "Major League Hacking", { margin: "0 0 5px" });
    const subject = createElement("p", subjectContent, { fontWeight: "bold", fontSize: "18px", margin: "5px 0" });
    const hr = createElement("hr", "", { borderColor: "rgb(255, 255, 255)", margin: "5px 0" });
    const body = createElement("p", "", { fontSize: "14px" });

    body.innerHTML = wrapTextInSpans(bodyContent);
    body.dataset.originalText = bodyContent;
    body.addEventListener("mouseup", handleMouseUp);
    body.addEventListener("mousedown", clearSelection);

    frame.appendChild(sender);
    frame.appendChild(subject);
    frame.appendChild(hr);
    frame.appendChild(body);

    quizContainer.appendChild(frame);
}

function Tweet(content) {
    const funnyUsernames = [
        "DrunkShakespeare",
        "LordOfTheMemes",
        "ToiletPaperCEO",
        "ElonMusketeer",
        "404UsernameNotFound",
        "BoredAndScrolling",
        "OopsIDidItAgain",
        "SarcasmOverdose",
        "WiFiGoneAgain",
        "ProcrastinationKing"
    ];

    const randomUsername = funnyUsernames[Math.floor(Math.random() * funnyUsernames.length)];
    const twitterHandle = `@${randomUsername.toLowerCase().replace(/\s/g, "_")}`;
    const randomMinutesAgo = Math.floor(Math.random() * 1440); // Random time within 24 hours

    const frame = createElement("div", "", {
        border: "1px solid #2c2f33",
        backgroundColor: "#000",
        padding: "15px",
        margin: "10px auto",
        color: "#ffffff",
        width: "85%",
        borderRadius: "10px",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
    });

    const header = createElement("div", "", { display: "flex", alignItems: "center", marginBottom: "10px" });

    const profilePic = createElement("div", "", {
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        backgroundColor: "#444",
        marginRight: "10px",
        backgroundImage: `url('https://i.pravatar.cc/40?u=${randomUsername}')`, // Random profile pic
        backgroundSize: "cover",
    });

    const userInfo = createElement("div", "");
    const name = createElement("p", randomUsername, { fontWeight: "bold", margin: "0", fontSize: "14px" });
    const handle = createElement("p", `${twitterHandle} · ${randomMinutesAgo}m`, {
        color: "#8899a6",
        margin: "0",
        fontSize: "12px",
    });

    userInfo.appendChild(name);
    userInfo.appendChild(handle);
    header.appendChild(profilePic);
    header.appendChild(userInfo);

    const contentElement = createElement("p", "", { margin: "5px 0", fontSize: "15px", lineHeight: "1.5" });
    contentElement.innerHTML = wrapTextInSpans(content);
    contentElement.dataset.originalText = content;
    contentElement.addEventListener("mouseup", handleMouseUp);
    contentElement.addEventListener("mousedown", clearSelection);

    const actions = createElement("div", "", {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "10px",
        color: "#8899a6",
        fontSize: "14px",
    });

    frame.appendChild(header);
    frame.appendChild(contentElement);
    frame.appendChild(actions);
    quizContainer.appendChild(frame);
}

// SMS rendering function
function SMS(content) {
    const contentContainer = createElement("div", "", {
        backgroundColor: "#333",
        padding: "10px",
        maxWidth: "85%",
        borderRadius: "16px",
        color: "white",
        margin: "10px auto",
        textAlign: "left",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
        display: "inline-block",
        paddingRight: "30px",
        marginLeft: "20px",
    });

    contentContainer.innerHTML = wrapTextInSpans(content);
    contentContainer.dataset.originalText = content;
    contentContainer.addEventListener("mouseup", handleMouseUp);
    contentContainer.addEventListener("mousedown", clearSelection);

    quizContainer.appendChild(contentContainer);
}

// Wrap words in spans for highlight toggling
function wrapTextInSpans(text) {
    return text
        .split(" ")
        .map(word => `<span style="cursor: pointer; transition: background-color 0.3s;">${word} </span>`)
        .join("");
}

// Handle mouse up event to toggle highlight
function handleMouseUp(event) {
    if (!highlightEnabled) return;

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const ranges = [];
    for (let i = 0; i < selection.rangeCount; i++) {
        ranges.push(selection.getRangeAt(i));
    }

    const selectedTextSet = new Set();
    ranges.forEach(range => {
        const selectedText = range.toString().trim();
        if (selectedText) {
            const selectedWordsInRange = selectedText.split(/\s+/).filter(word => word.length > 0);
            selectedWordsInRange.forEach(word => selectedTextSet.add(word));
        }
    });

    const spans = document.querySelectorAll("span");
    spans.forEach(span => {
        const word = span.innerText.trim();
        if (selectedTextSet.has(word)) {
            // Toggle highlight
            if (selectedWords.has(word)) {
                selectedWords.delete(word);
                span.style.backgroundColor = ""; // Remove highlight
                span.style.color = ""; // Reset text color
            } else {
                selectedWords.add(word);
                span.style.backgroundColor = "white"; // Highlight background color
                span.style.color = "black"; // Highlight text color
            }
        }
    });

    selection.removeAllRanges(); // Clear selection after handling
}

// Clear selection on mouse down
function clearSelection() {
    const selection = window.getSelection();
    selection.removeAllRanges();
}

// Get selected words in original order
function getOrderedSelectedWords() {
    const textContainer = document.querySelector("[data-original-text]");
    if (!textContainer) return [];

    const originalWords = textContainer.dataset.originalText.split(" ");
    return originalWords.filter(word => selectedWords.has(word));
}

// Fetch questions and render the first one
fetchQuestions().then(renderNextQuestion);