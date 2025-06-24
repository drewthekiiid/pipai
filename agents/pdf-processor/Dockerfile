FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install required packages
RUN apt-get update && apt-get install -y \
    poppler-utils \
    imagemagick \
    awscli \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip3 install boto3 Pillow

# Configure ImageMagick to allow PDF processing
RUN sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml

WORKDIR /app
COPY . .

# Create output directory
RUN mkdir -p /app/output

# Set proper permissions
RUN chmod +x /app/convert_pdf.py

CMD ["python3", "convert_pdf.py"] 