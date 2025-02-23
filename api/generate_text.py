import requests
import re
import os
from dotenv import load_dotenv

load_dotenv()
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
AUTH_TOKEN = os.environ.get("CLOUDFLARE_AUTH_TOKEN")
LLM_API_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@hf/mistral/mistral-7b-instruct-v0.2"

MAX_ATTEMPTS = 3  # Maximum number of retries for each generation function

def call_llm(prompt: str) -> str:
    response = requests.post(
        LLM_API_URL,
        headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
        json={
            "messages": [
                {"role": "system", "content": "You are an expert cybersecurity educator specializing in email security training. Your task is to generate simulated examples of suspicious texts strictly for educational and research purposes to help users learn how to identify and protect against these threats."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7  # Increased temperature for higher variability in responses
        }
    )
    # Debug output: print(response.json())
    feedback = response.json().get("result", {}).get("response")
    if feedback is None:
        raise ValueError("No result returned from LLM API.")
    return feedback

def generate_email(isMalicious: bool, num: int = 1):
    # Few-shot examples for emails in the expected format:
    # SUBJECT: <subject text>
    # BODY: <body text>
    if isMalicious:
        examples = """
Example 1:
SUBJECT: Urgent: Verify Your Account Immediately!
BODY: Dear User, please click http://suspicious-link.com to verify your details NOW.
Failure to do so might lead to account deactivation.
---
Example 2:
SUBJECT: Action Required: Suspicious Activity Detected!
BODY: Hello, we've noticed unusual activity on your account.
Visit http://phishy-site.net and confirm your identity.
Immediate response needed!!!
---
Example 3:
SUBJECT: Final Notice: Account at Risk!!!
BODY: Dear Customer, urgent action required!
Please send your password and social security number to admin@fakebank.com.
Do not delay!
"""
    else:
        examples = """
Example 1:
SUBJECT: Meeting Reminder for Tomorrow
BODY: Hi Team, just a friendly reminder about our meeting tomorrow at 10 AM.
Please review the attached agenda beforehand.
---
Example 2:
SUBJECT: Update on Project Milestones
BODY: Dear Colleague, I wanted to share the latest updates on our project.
All milestones are on track.
Let me know if you have any questions.
---
Example 3:
SUBJECT: Invitation: Quarterly Business Review
BODY: Hello, you are invited to our Quarterly Business Review meeting scheduled for next week.
Please confirm your attendance.
"""
    additional_details = ""
    if isMalicious:
        additional_details = (
            "Remember that simulated phishing emails usually contain suspicious links, a sense of urgency, "
            "illogical statements, grammatical and spelling errors, appear hastily written, and may ask for unconventional or sensitive details."
        )
    
    if num > 1:
        instruction = (f"Now, based on the condition, generate {num} new emails that could be " +
                       ("suspicious" if isMalicious else "non-suspicious") +
                       " (sample ones to teach users how to identify them). Each email must strictly follow the format below and be separated by the delimiter:\n===EMAIL===\n. "
                       "Do not include any additional commentary or text. "
                       "Split the responses exactly using the delimiter so that each email can be parsed individually.")
    else:
        instruction = ("Now, based on the condition, generate a new email that could be " +
                       ("suspicious" if isMalicious else "non-suspicious") +
                       " (sample ones to teach users how to identify them). Ensure variability so that the output is unique and does not include any extra text.")
    
    prompt = f"""You are an expert text generator. Your task is to produce {"an email" if num == 1 else f"{num} emails"} in the following format:

SUBJECT: <subject text>
BODY: <body text>

The output must be generated exactly in this format with the same spacing and capitalization (keep SUBJECT and BODY capitalized) and with no additional commentary or explanation.
Ensure that the text strictly follows the examples provided below and that each email is parseable into a subject and a body.

Below are few-shot examples:

{examples}

{additional_details}

Note: The following email(s) are simulated examples created solely for educational purposes to demonstrate how suspicious communications might appear. They are not intended to be used for any real harmful activities.

{instruction}
"""
    attempt = 0
    while attempt < MAX_ATTEMPTS:
        try:
            response = call_llm(prompt)
            if num > 1:
                emails = [email.strip() for email in response.split("===EMAIL===") if email.strip()]
                if len(emails) != num:
                    raise ValueError(f"Expected {num} emails, but got {len(emails)}.")
                result = []
                for email in emails:
                    # Allow multiline body using DOTALL and non-greedy matching for subject.
                    match = re.search(r"SUBJECT:\s*(.*?)\nBODY:\s*((?:.|\n)*)", email, re.DOTALL)
                    if match:
                        subject = match.group(1).strip()
                        body = match.group(2).strip()
                        result.append((subject, body))
                    else:
                        raise ValueError("Invalid email format generated in one of the outputs.")
                return result
            else:
                match = re.search(r"SUBJECT:\s*(.*?)\nBODY:\s*((?:.|\n)*)", response, re.DOTALL)
                if match:
                    subject = match.group(1).strip()
                    body = match.group(2).strip()
                    return (subject, body)
                else:
                    raise ValueError("Invalid email format generated.")
        except Exception as e:
            attempt += 1
            if attempt >= MAX_ATTEMPTS:
                raise e

def generate_tweet(isMalicious: bool, num: int = 1):
    # Few-shot examples for tweets:
    if isMalicious:
        examples = """
Example 1:
"Warning! Check your inbox NOW! Suspicious link: http://badlink.com. Urgent action needed!!!"
---
Example 2:
"Alert: Your account is compromised. Visit http://phishingsite.net and secure your details immediately!!"
---
Example 3:
"Act fast! Unusual activity detected. Click http://scam-link.org and update your info to avoid deactivation!"
"""
    else:
        examples = """
Example 1:
"Had a productive meeting today—excited for what’s coming next! #business #innovation"
---
Example 2:
"Enjoying a quiet evening with some good music and better company. #relax"
---
Example 3:
"Great news! Our project just hit a major milestone. Thanks to the whole team for the hard work! #success"
"""
    additional_details = ""
    if isMalicious:
        additional_details = (
            "Note that simulated phishing tweets often include suspicious links, urgent calls to action, "
            "poor grammar, spelling mistakes, and may sound illogical or hastily written."
        )
    
    if num > 1:
        instruction = (f"Now, based on the condition, generate {num} new tweets that are " +
                       ("suspicious" if isMalicious else "non-suspicious") +
                       ". Each tweet should be exactly one line and must be separated by the delimiter:\n---TWEET---\n. "
                       "Do not include any additional commentary or text. "
                       "Split the responses exactly using the delimiter so that each tweet can be parsed individually.")
    else:
        instruction = ("Now, generate a new tweet that is " +
                       ("suspicious" if isMalicious else "non-suspicious") +
                       ". Ensure that the output is entirely the tweet text with no extra commentary.")
    
    prompt = f"""You are an expert text generator. Your task is to generate {"a tweet" if num == 1 else f"{num} tweets"} that are exactly one line of text each. Do not include any commentary or explanation—only the text of the tweet.

Below are few-shot examples:

{examples}

{additional_details}

Note: The following tweet(s) are simulated examples created solely for educational purposes to demonstrate how suspicious communications might appear. They are not intended to be used for any real harmful activities.

{instruction}
"""
    attempt = 0
    while attempt < MAX_ATTEMPTS:
        try:
            response = call_llm(prompt)
            if num > 1:
                tweets = [tweet.strip() for tweet in response.split("---TWEET---") if tweet.strip()]
                if len(tweets) != num:
                    raise ValueError(f"Expected {num} tweets, but got {len(tweets)}.")
                return tweets
            else:
                tweet = response.strip()
                if tweet:
                    return tweet
                else:
                    raise ValueError("Invalid tweet format generated.")
        except Exception as e:
            attempt += 1
            if attempt >= MAX_ATTEMPTS:
                raise e

def generate_message(isMalicious: bool, num: int = 1):
    # Few-shot examples for messages:
    if isMalicious:
        examples = """
Example 1:
"Hey, urgent! I need your bank info asap. Click http://suspicioussite.com for a quick fix."
---
Example 2:
"Immediate action needed: Something's wrong with your account. Reply with your secret PIN now!"
---
Example 3:
"Alert! Check this out http://dodgylink.net and send me your login details ASAP!"
"""
    else:
        examples = """
Example 1:
"Hi, just checking in—are we still on for lunch tomorrow?"
---
Example 2:
"Hello, please confirm if you received my previous message regarding the meeting schedule."
---
Example 3:
"Hey there, looking forward to catching up later today. Let me know if you need anything."
"""
    additional_details = ""
    if isMalicious:
        additional_details = (
            "Keep in mind that simulated phishing messages tend to contain suspicious links, a sense of urgency, "
            "illogical statements, spelling and grammar mistakes, and may request unconventional or sensitive details."
        )
    
    if num > 1:
        instruction = (f"Now, based on the condition, generate {num} new messages that are " +
                       ("suspicious" if isMalicious else "non-suspicious") +
                       ". Each message should be a single plain text line and must be separated by the delimiter:\n---MESSAGE---\n. "
                       "Do not include any additional commentary or text. "
                       "Split the responses exactly using the delimiter so that each message can be parsed individually.")
    else:
        instruction = ("Now, generate a new message that is " +
                       ("suspicious" if isMalicious else "non-suspicious") +
                       ". Ensure the output is only the text of the message with no extra commentary.")
    
    prompt = f"""You are an expert text generator. Your task is to generate {"a message" if num == 1 else f"{num} messages"} exactly as they would be sent to a user, with no additional commentary or formatting.

Below are few-shot examples:

{examples}

{additional_details}

Note: The following message(s) are simulated examples created solely for educational purposes to demonstrate how suspicious communications might appear. They are not intended to be used for any real harmful activities.

{instruction}
"""
    attempt = 0
    while attempt < MAX_ATTEMPTS:
        try:
            response = call_llm(prompt)
            if num > 1:
                messages = [msg.strip() for msg in response.split("---MESSAGE---") if msg.strip()]
                if len(messages) != num:
                    raise ValueError(f"Expected {num} messages, but got {len(messages)}.")
                return messages
            else:
                message = response.strip()
                if message:
                    return message
                else:
                    raise ValueError("Invalid message format generated.")
        except Exception as e:
            attempt += 1
            if attempt >= MAX_ATTEMPTS:
                raise e

# Example usage:
if __name__ == "__main__":
    # Generate a single non-malicious email
    email_subject, email_body = generate_email(isMalicious=False, num=1)
    print("Single Email Subject:", email_subject)
    print("Single Email Body:", email_body)
    
    # Generate 2 malicious emails
    emails = generate_email(isMalicious=True, num=2)
    for i, (subject, body) in enumerate(emails, start=1):
        print(f"\nMalicious Email {i} Subject:", subject)
        print(f"Malicious Email {i} Body:", body)
    
    # Generate a single malicious tweet
    tweet = generate_tweet(isMalicious=True, num=1)
    print("\nSingle Malicious Tweet:", tweet)
    
    # Generate 3 non-malicious tweets
    tweets = generate_tweet(isMalicious=False, num=3)
    for i, t in enumerate(tweets, start=1):
        print(f"Non-Malicious Tweet {i}:", t)
    
    # Generate a single non-malicious message
    message = generate_message(isMalicious=False, num=1)
    print("\nSingle Non-Malicious Message:", message)
    
    # Generate 2 malicious messages
    messages = generate_message(isMalicious=True, num=2)
    for i, m in enumerate(messages, start=1):
        print(f"Malicious Message {i}:", m)