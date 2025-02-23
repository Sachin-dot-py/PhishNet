const AWS_LINK = "https://ba9cyigyp2.us-west-2.awsapprunner.com/";
const buttonThemeColor = "#e30000";
const greenButton = "#09b852";

let questionDeque = [];
let quizContainer;
let selectedWords = new Set(); // Now stores indices (as strings)
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

    // Preload more questions if queue is running low
    if (questionDeque.length < 3) {
        loadMoreQuestions();
    }
    
    if (!currentQuestion) {
        console.error("No question data available to render");
        return;
    }

    highlightEnabled = false; // Reset highlighting
    currentMaliciousState = currentQuestion.malicious;
    selectedWords.clear(); // Clear previous selections
    clearQuizContainer();
    renderQuiz(currentQuestion);
    
    // Attach currentQuestion to the window for reference
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
        // Append only to the quiz section so that the loading overlay shows only here
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

    // Buttons container with swapped order:
    const reportButtonsContainer = createElement("div", "", { margin: "10px auto", textAlign: "center" });
    
    // "Report as Not Malicious" button appears on the left now.
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
        // Add a loading indicator while waiting for the API response.
        const loadingIndicator = createElement("div", "Loading...", {
            textAlign: "center",
            color: "white",
            margin: "10px auto"
        });
        quizContainer.appendChild(loadingIndicator);
        try {
            const requestBody = {
                id: window.currentQuestion?.id,
                userMalicious: false,
            };
            const response = await fetch(`${AWS_LINK}/api/game/getFeedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });
            const responseData = await response.json();
            const valid = !responseData.feedback.toLowerCase().startsWith("incorrect");
            // Show API feedback instead of a generic message
            renderAlert(responseData.feedback, valid);
            
            // Remove report buttons but keep displaying the same question with feedback.
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
                        alertDiv.remove();
                    }
                    await renderNextQuestion();
                };

                // Place Continue button immediately below the feedback alert.
                document.getElementById("alert").insertAdjacentElement("afterend", continueButton);
            }
        } catch (error) {
            console.error("Error submitting feedback:", error);
            renderAlert("An error occurred while submitting your response.", false);
        } finally {
            loadingIndicator.remove();
        }
    };

    // "Report as Malicious" button appears on the right now.
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
        // For malicious selection, enable highlighting and show instructions.
        enableHighlighting(reportButtonsContainer);
    };

    // Append buttons in the new desired order:
    reportButtonsContainer.appendChild(notMaliciousButton);
    reportButtonsContainer.appendChild(maliciousButton);
    quizContainer.appendChild(reportButtonsContainer);
}

// Enable highlighting and show submit button (for malicious selections)
function enableHighlighting(reportButtonsContainer) {
    highlightEnabled = true;
    reportButtonsContainer.innerHTML = ""; // Remove previous buttons

    // Add updated instructions for the user.
    const instructionText = createElement("p", "Pick the words that are sus.", {
        color: "white",
        textAlign: "center",
        margin: "10px auto"
    });
    quizContainer.appendChild(instructionText);

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
        // Add loading indicator during API call
        const loadingIndicator = createElement("div", "Loading...", {
            textAlign: "center",
            color: "white",
            margin: "10px auto"
        });
        quizContainer.appendChild(loadingIndicator);
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
            // Show API feedback instead of a generic message.
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
                    continueButton.remove();
                    clearQuizContainer();
                    const alertDiv = document.getElementById("alert");
                    if (alertDiv) {
                        alertDiv.remove();
                    }
                    await renderNextQuestion();
                };
    
                // Insert Continue button immediately after the feedback alert.
                document.getElementById("alert").insertAdjacentElement("afterend", continueButton);
                submitButton.style.display = "none"; // Hide submit button when Continue button appears
            }
        } catch (error) {
            console.error("Error submitting feedback:", error);
            renderAlert("An error occurred while submitting your response.", false);
        } finally {
            loadingIndicator.remove();
        }
    };
    
    quizContainer.appendChild(submitButton);
}

// Helper to create DOM elements with styles
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

    // Use updated wrapTextInSpans to include data-index on each word
    body.innerHTML = wrapTextInSpans(bodyContent);
    body.dataset.originalText = bodyContent;
    // Attach click handler for toggling selection
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
    attachClickHandlerToSpans(contentContainer);

    quizContainer.appendChild(contentContainer);
}

// Updated: Wrap each word in a span with a unique data-index.
function wrapTextInSpans(text) {
    return text
        .split(" ")
        .map((word, index) => `<span data-index="${index}" style="cursor: pointer; transition: background-color 0.3s;">${word} </span>`)
        .join("");
}

// Toggle word selection based on its data-index
function toggleWordSelection(event) {
    if (!highlightEnabled) return;
    const span = event.target;
    if (span.tagName.toLowerCase() !== "span") return;
    const index = span.getAttribute("data-index");
    if (selectedWords.has(index)) {
        selectedWords.delete(index);
        span.style.backgroundColor = "";
        span.style.color = "";
    } else {
        selectedWords.add(index);
        span.style.backgroundColor = "white";
        span.style.color = "black";
    }
}

// Attach click event listener to all span elements within a container
function attachClickHandlerToSpans(container) {
    const spans = container.querySelectorAll("span");
    spans.forEach(span => {
       span.addEventListener("click", toggleWordSelection);
    });
}

// Get selected words in the original order using indices
function getOrderedSelectedWords() {
    const textContainer = document.querySelector("[data-original-text]");
    if (!textContainer) return [];
    const originalWords = textContainer.dataset.originalText.split(" ");
    const selectedArray = [];
    for (let i = 0; i < originalWords.length; i++) {
        if (selectedWords.has(i.toString())) {
            selectedArray.push(originalWords[i]);
        }
    }
    return selectedArray;
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
        // Append alert to the quiz section so that feedback stays with the quiz.
        document.getElementById("quiz").appendChild(alertDiv);
        alertDiv.innerHTML = formattedMessage;
    } else {
        alertDiv.innerHTML = formattedMessage;
    }
}

// Show loading screen only on the quiz page
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