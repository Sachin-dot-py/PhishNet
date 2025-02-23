import json
import re
from transformers import GPT2LMHeadModel, GPT2Tokenizer

# Load fine-tuned models and their tokenizers
malicious_tokenizer = GPT2Tokenizer.from_pretrained("models/malicious_model")
malicious_model = GPT2LMHeadModel.from_pretrained("models/malicious_model")

non_malicious_tokenizer = GPT2Tokenizer.from_pretrained("models/non_malicious_model")
non_malicious_model = GPT2LMHeadModel.from_pretrained("models/non_malicious_model")

def generate_email(model, tokenizer, prompt, max_length=200, temperature=0.8):
    # Encode the prompt and explicitly request the attention mask.
    encoded = tokenizer(prompt, return_tensors="pt")
    input_ids = encoded["input_ids"]
    attention_mask = encoded["attention_mask"]
    
    # Generate text with sampling to get varied outputs.
    output_ids = model.generate(
        input_ids,
        attention_mask=attention_mask,
        max_length=max_length,
        do_sample=True,
        temperature=temperature,
        top_p=0.95,
        num_return_sequences=1,
        pad_token_id=tokenizer.eos_token_id
    )
    generated_text = tokenizer.decode(output_ids[0], skip_special_tokens=True)
    return generated_text.strip()

def parse_email_json(generated_text):
    """
    Try to extract a JSON substring and parse it.
    We search for the first '{' and the last '}' and attempt JSON parsing.
    """
    try:
        json_start = generated_text.find("{")
        json_end = generated_text.rfind("}") + 1
        json_str = generated_text[json_start:json_end]
        email_data = json.loads(json_str)
        if "subject" in email_data and "body" in email_data:
            return email_data
        else:
            raise ValueError("JSON missing required keys.")
    except Exception:
        return None

def fallback_parse(generated_text):
    """
    Fallback parser that first removes the prompt text and then extracts the JSON.
    This helps in case the model output includes extra tokens.
    """
    split_prompt = "Now generate one:"
    if split_prompt in generated_text:
        generated_text = generated_text.split(split_prompt, 1)[-1].strip()
    
    json_start = generated_text.find("{")
    json_end = generated_text.rfind("}")
    if json_start != -1 and json_end != -1 and json_end > json_start:
        json_str = generated_text[json_start:json_end+1]
        try:
            email_data = json.loads(json_str)
            return email_data
        except Exception:
            pass
    return {"subject": "Parsing failed", "body": generated_text}

def parse_email(generated_text):
    parsed = parse_email_json(generated_text)
    if parsed is not None:
        return parsed
    else:
        return fallback_parse(generated_text)

def generate_malicious_email():
    prompt = (
        "Generate a malicious email and output a valid JSON object with two keys: "
        '"subject" and "body". For example:\n'
        '{\n  "subject": "Your account alert",\n  "body": "Dear user, ..."\n}\n'
        "Now generate one:\n"
    )
    generated_text = generate_email(malicious_model, malicious_tokenizer, prompt)
    return parse_email(generated_text)

def generate_non_malicious_email():
    prompt = (
        "Generate a non-malicious email and output a valid JSON object with two keys: "
        '"subject" and "body". For example:\n'
        '{\n  "subject": "Meeting reminder",\n  "body": "Hello team, ..."\n}\n'
        "Now generate one:\n"
    )
    generated_text = generate_email(non_malicious_model, non_malicious_tokenizer, prompt)
    return parse_email(generated_text)

# Example usage:
if __name__ == "__main__":
    print("Malicious Email:")
    email = generate_malicious_email()
    print("Subject:", email["subject"])
    print("Body:", email["body"])
    
    print("\nNon-Malicious Email:")
    email = generate_non_malicious_email()
    print("Subject:", email["subject"])
    print("Body:", email["body"])