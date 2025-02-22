# Use the official Python image
FROM python:3.10

# Set the working directory inside the container
WORKDIR /app

# Copy the application files into the container
COPY api /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port 8080 (required for AWS App Runner)
EXPOSE 8080

# Run the Flask app with Gunicorn
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:8080", "app:app"]

