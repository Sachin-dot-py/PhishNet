import json
import pandas as pd
import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer, Trainer, TrainingArguments, DataCollatorForLanguageModeling
from torch.utils.data import Dataset

# Define a dataset class for our JSON strings
class EmailDataset(Dataset):
    def __init__(self, texts, tokenizer, block_size=128):
        self.examples = []
        for text in texts:
            tokenized = tokenizer(text, truncation=True, max_length=block_size, padding="max_length")
            self.examples.append(tokenized)
    
    def __len__(self):
        return len(self.examples)
    
    def __getitem__(self, i):
        return {key: torch.tensor(val) for key, val in self.examples[i].items()}

def train_model(texts, model_save_path):
    # Load pre-trained GPT-2 model and tokenizer
    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    model = GPT2LMHeadModel.from_pretrained("gpt2")
    
    # GPT-2 doesn't have a pad token; set it to eos_token
    tokenizer.pad_token = tokenizer.eos_token
    model.resize_token_embeddings(len(tokenizer))
    
    # Prepare our dataset
    dataset = EmailDataset(texts, tokenizer, block_size=128)
    
    # Data collator for language modeling (no masked LM for GPT-2)
    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
    
    training_args = TrainingArguments(
        output_dir=model_save_path,
        overwrite_output_dir=True,
        num_train_epochs=3,
        per_device_train_batch_size=2,
        save_steps=500,
        save_total_limit=2,
        logging_steps=100,
        prediction_loss_only=True,
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        data_collator=data_collator,
        train_dataset=dataset,
    )
    
    trainer.train()
    
    # Save model and tokenizer
    model.save_pretrained(model_save_path)
    tokenizer.save_pretrained(model_save_path)

if __name__ == "__main__":
    # List of dataset files and their column mappings
    datasets_info = [
        {"file": "PhishingEmailDataset/CEAS_08.csv", "cols": ["subject", "body", "label"]},
        {"file": "PhishingEmailDataset/Enron.csv",   "cols": ["subject", "body", "label"]},
        {"file": "PhishingEmailDataset/Ling.csv",    "cols": ["subject", "body", "label"]},
        {"file": "PhishingEmailDataset/Nazario.csv",   "cols": ["subject", "body", "label"]},
        {"file": "PhishingEmailDataset/Nigerian_Fraud.csv", "cols": ["subject", "body", "label"]},
        {"file": "PhishingEmailDataset/SpamAssasin.csv", "cols": ["subject", "body", "label"]}
    ]
    
    # Merge all datasets into one DataFrame
    dfs = []
    for dataset in datasets_info:
        df = pd.read_csv(dataset["file"])
        # Only keep the desired columns
        df = df[dataset["cols"]]
        dfs.append(df)
    merged_df = pd.concat(dfs, ignore_index=True)
    merged_df = merged_df.head(15000)  # TODO for testing have limited to 15000 rows for faster training!!!
    
    # Convert each email into a JSON string with keys "subject" and "body"
    merged_df["json_text"] = merged_df.apply(
        lambda row: json.dumps({
            "subject": str(row["subject"]), 
            "body": str(row["body"])
        }), 
        axis=1
    )
    
    # Split texts based on label (1 for malicious, 0 for non-malicious)
    malicious_texts = merged_df[merged_df["label"] == 1]["json_text"].tolist()
    non_malicious_texts = merged_df[merged_df["label"] == 0]["json_text"].tolist()
    
    print("Training malicious email model...")
    train_model(malicious_texts, "malicious_model")
    
    print("Training non-malicious email model...")
    train_model(non_malicious_texts, "non_malicious_model")
    
    print("Training complete. Models saved in 'malicious_model' and 'non_malicious_model' directories.")