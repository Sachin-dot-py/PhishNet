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
    const { type, subject, body, content } = data;

    if (!quizContainer) {
        quizContainer = createElement("div", "", { margin: "10px auto" });
        document.getElementById("quiz").appendChild(quizContainer);
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
        // For malicious selection, simply enable highlighting.
        // Feedback will be shown after the API call when the user clicks "Submit".
        enableHighlighting(reportButtonsContainer);
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
        const message = validateAnswer(false)
            ? "Correct! This message is not malicious."
            : "Incorrect! This message is malicious.";
        renderAlert(message, validateAnswer(false));
        // Remove report buttons but keep displaying the same question along with feedback.
        reportButtonsContainer.innerHTML = "";
        if (!document.getElementById("continueButton")) {
            const continueButton = createElement("button", "Continue", {
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "980px",
                padding: "10px 20px",
                margin: "10px auto",
                cursor: "pointer",
                fontSize: "16px",
                transition: "background-color 0.3s",
                display: "block",
            });
            continueButton.id = "continueButton";

            continueButton.onclick = async () => {
                continueButton.remove(); // Self destruct
                clearQuizContainer();
                const alertDiv = document.getElementById("alert");
                if (alertDiv) {
                    alertDiv.remove(); // Remove the alert feedback
                }
                await renderNextQuestion();
            };

            // Insert the Continue button right after the feedback alert.
            document.getElementById("alert").insertAdjacentElement("afterend", continueButton);
        }
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
            renderAlert("Selecting suspicious text is necessary.", false);
            return;
        }
    
        const selectedWordsArray = getOrderedSelectedWords();
        const requestBody = {
            id: window.currentQuestion?.id,
            userMalicious: currentMaliciousState,
        };
    
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
            const valid = !responseData.feedback.toLowerCase().startsWith("incorrect");
            // Display the API feedback instead of a default message.
            renderAlert(responseData.feedback, valid);
    
            if (!document.getElementById("continueButton")) {
                const continueButton = createElement("button", "Continue", {
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "980px",
                    padding: "10px 20px",
                    margin: "10px auto",
                    cursor: "pointer",
                    fontSize: "16px",
                    transition: "background-color 0.3s",
                    display: "block",
                });
                continueButton.id = "continueButton";
    
                continueButton.onclick = async () => {
                    continueButton.remove(); // Self destruct
                    clearQuizContainer();
                    const alertDiv = document.getElementById("alert");
                    if (alertDiv) {
                        alertDiv.remove(); // Remove the alert feedback
                    }
                    await renderNextQuestion();
                };
    
                // Insert the Continue button right after the feedback alert.
                document.getElementById("alert").insertAdjacentElement("afterend", continueButton);
                submitButton.style.display = "none"; // Hide submit button when continue button is visible
            }
        } catch (error) {
            console.error("Error submitting feedback:", error);
            renderAlert("An error occurred while submitting your response.", false);
        }
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
    // Attach click listener for toggling word selection.
    attachClickHandlerToSpans(body);

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
        backgroundImage: `url('https://i.pravatar.cc/40?u=${randomUsername}')`,
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
    // Attach click listener for toggling word selection.
    attachClickHandlerToSpans(contentElement);

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
    // Attach click listener for toggling word selection.
    attachClickHandlerToSpans(contentContainer);

    quizContainer.appendChild(contentContainer);
}

// Wrap words in spans for highlight toggling
function wrapTextInSpans(text) {
    return text
        .split(" ")
        .map(word => `<span style="cursor: pointer; transition: background-color 0.3s;">${word} </span>`)
        .join("");
}

// New function to toggle word selection on click
function toggleWordSelection(event) {
    if (!highlightEnabled) return;
    const span = event.target;
    if (span.tagName.toLowerCase() !== "span") return;
    const word = span.innerText.trim();
    if (selectedWords.has(word)) {
        selectedWords.delete(word);
        span.style.backgroundColor = "";
        span.style.color = "";
    } else {
        selectedWords.add(word);
        span.style.backgroundColor = "white";
        span.style.color = "black";
    }
}

// Attach click event to all spans within a container
function attachClickHandlerToSpans(container) {
    const spans = container.querySelectorAll("span");
    spans.forEach(span => {
       span.addEventListener("click", toggleWordSelection);
    });
}

// Get selected words in original order
function getOrderedSelectedWords() {
    const textContainer = document.querySelector("[data-original-text]");
    if (!textContainer) return [];

    const originalWords = textContainer.dataset.originalText.split(" ");
    return originalWords.filter(word => selectedWords.has(word));
}


function renderAlert(message, correct) {
    let alertDiv = document.getElementById("alert");
    const firstWord = message.split(" ")[0];
    const restOfMessage = message.substring(firstWord.length);

    const firstWordSpan = firstWord.includes("!") 
        ? `<span style="color: ${correct ? 'green' : 'red'};">${firstWord}</span>`
    : `<span style="color: white">${firstWord}</span>`;
    const restOfMessageSpan = `<span style="color: white;">${restOfMessage}</span>`;

    const formattedMessage = `${firstWordSpan}${restOfMessageSpan}`;

    if (!alertDiv) {
        alertDiv = createElement("div", "", {
            borderTop: "1px solid rgba(255, 255, 255, 0.2)",
            color: "black",
            padding: "10px",
            margin: "10px auto",
            width: "85%",
        });
        alertDiv.id = "alert";
        // Append alert to the quiz section so feedback stays with the quiz.
        document.getElementById("quiz").appendChild(alertDiv);
        alertDiv.innerHTML = formattedMessage;
    } else {
        alertDiv.innerHTML = formattedMessage;
    }
}

// Show loading screen until first question loads
const loadingScreen = createElement("div", "Loading Quiz...", {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "white",
    backgroundColor: "#000",
    padding: "20px",
    borderRadius: "10px",
    fontSize: "24px",
});
const quizSection = document.getElementById("quiz");
if (quizSection) {
    quizSection.appendChild(loadingScreen);
} else {
    document.body.appendChild(loadingScreen);
}

fetchQuestions().then(() => {
    loadingScreen.remove();
    renderNextQuestion();
});