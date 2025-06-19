import OpenAI from 'openai';

// Construction Estimator Assistant configuration
const ASSISTANT_NAME = "EstimAItor - Construction Estimator";
const ASSISTANT_INSTRUCTIONS = `You are EstimAItor, the greatest commercial construction estimator ever.

PRIMARY FUNCTION: Analyze construction documents and generate accurate trade-specific scope of work and material takeoffs.

CAPABILITIES:
- Trade detection from construction drawings and specifications
- CSI Division and Cost Code tagging
- Contract-ready Scope of Work generation
- Detailed Material Takeoff calculations
- RFI generation for missing information

ANALYSIS PROCESS:
1. Scan all uploaded documents (PDFs, images, specifications)
2. Detect all trades represented in the drawings
3. Generate CSI-organized scope of work for each trade
4. Calculate material takeoffs with quantities
5. Flag any unclear or missing information

OUTPUT FORMAT:
For each detected trade, provide:
- Trade name and CSI Division
- Complete scope of work with task checklist
- Material takeoff with quantities and units
- References to drawing sheets and specifications
- Yellow flags for unclear items

QUALITY STANDARDS:
- All outputs must be contract-ready and defensible
- Include proper CSI formatting and cost codes
- Provide accurate quantity calculations
- Flag assumptions and coordinate dependencies
- Ensure compliance with commercial construction standards

Focus on accuracy, detail, and professional construction industry standards.`;

export class ConstructionAssistant {
  private openai: OpenAI;
  private assistantId: string | null = null;

  constructor(apiKey: string, assistantId?: string) {
    this.openai = new OpenAI({ apiKey });
    this.assistantId = assistantId || null;
  }

  /**
   * Create or retrieve the construction estimator assistant
   */
  async getAssistant(): Promise<string> {
    if (this.assistantId) {
      console.log('📋 Using specified assistant ID:', this.assistantId);
      return this.assistantId;
    }

    try {
      // First, try to find existing assistant by name
      const assistants = await this.openai.beta.assistants.list();
      const existingAssistant = assistants.data.find(
        assistant => assistant.name === ASSISTANT_NAME
      );

      if (existingAssistant) {
        console.log('📋 Found existing EstimAItor assistant:', existingAssistant.id);
        this.assistantId = existingAssistant.id;
        return existingAssistant.id;
      }

      // Create new assistant if none exists
      console.log('🔨 Creating new EstimAItor assistant...');
      const assistant = await this.openai.beta.assistants.create({
        name: ASSISTANT_NAME,
        instructions: ASSISTANT_INSTRUCTIONS,
        model: "gpt-4o",
        tools: [
          { type: "file_search" }, // For searching through uploaded documents
          { type: "code_interpreter" } // For calculations and data analysis
        ],
        tool_resources: {
          file_search: {
            vector_store_ids: [] // Will create vector stores as needed
          }
        },
        temperature: 0.1, // Low temperature for consistent construction analysis
      });

      console.log('✅ Created new EstimAItor assistant:', assistant.id);
      console.log('💡 Save this ID in OPENAI_ASSISTANT_ID environment variable for future use!');
      this.assistantId = assistant.id;
      return assistant.id;

    } catch (error) {
      console.error('❌ Failed to get/create assistant:', error);
      throw error;
    }
  }

  /**
   * Upload files to OpenAI and return file IDs
   */
  async uploadFiles(files: File[]): Promise<string[]> {
    console.log(`📁 Uploading ${files.length} file(s) to OpenAI...`);
    
    const uploadPromises = files.map(async (file) => {
      console.log(`⬆️ Uploading: ${file.name} (${Math.round(file.size / 1024)}KB)`);
      
      const uploadedFile = await this.openai.files.create({
        file: file,
        purpose: "assistants",
      });
      
      console.log(`✅ Uploaded: ${file.name} → ${uploadedFile.id}`);
      return uploadedFile.id;
    });

    const fileIds = await Promise.all(uploadPromises);
    console.log(`📋 All files uploaded:`, fileIds);
    return fileIds;
  }

  /**
   * Create a new thread for conversation
   */
  async createThread(fileIds?: string[]): Promise<string> {
    console.log('🧵 Creating new conversation thread...');
    
    const threadData: any = {};
    
    // If files provided, attach them to the thread
    if (fileIds && fileIds.length > 0) {
      threadData.tool_resources = {
        file_search: {
          vector_stores: [{
            file_ids: fileIds
          }]
        }
      };
    }

    const thread = await this.openai.beta.threads.create(threadData);
    console.log('✅ Created thread:', thread.id);
    return thread.id;
  }

  /**
   * Send a message and get assistant response
   */
  async sendMessage(
    threadId: string, 
    message: string, 
    fileIds?: string[]
  ): Promise<string> {
    try {
      console.log(`💬 Sending message to thread ${threadId}...`);

      // Add the user message to the thread
      const messageData: any = {
        role: "user",
        content: message,
      };

      // Attach files to the specific message if provided
      if (fileIds && fileIds.length > 0) {
        messageData.attachments = fileIds.map(fileId => ({
          file_id: fileId,
          tools: [
            { type: "file_search" },
            { type: "code_interpreter" }
          ]
        }));
      }

      await this.openai.beta.threads.messages.create(threadId, messageData);

      // Get the assistant ID
      const assistantId = await this.getAssistant();

      // Run the assistant
      console.log('🤖 Running EstimAItor analysis...');
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        instructions: "Analyze the uploaded construction documents thoroughly. Provide complete trade detection, scope of work, and material takeoffs in professional CSI format.",
      });

      // Wait for completion
      console.log('⏳ Waiting for analysis to complete...');
      const completedRun = await this.waitForRunCompletion(threadId, run.id);

      if (completedRun.status === 'failed') {
        throw new Error(`Assistant run failed: ${completedRun.last_error?.message || 'Unknown error'}`);
      }

      // Get the assistant's response
      const messages = await this.openai.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(
        msg => msg.role === 'assistant' && msg.run_id === run.id
      );

      if (!assistantMessage) {
        throw new Error('No response from assistant');
      }

      // Extract text content from the message
      const textContent = assistantMessage.content.find(
        content => content.type === 'text'
      );

      if (!textContent || textContent.type !== 'text') {
        throw new Error('Assistant response has no text content');
      }

      console.log('✅ Analysis completed successfully');
      return textContent.text.value;

    } catch (error) {
      console.error('❌ Failed to get assistant response:', error);
      throw error;
    }
  }

  /**
   * Wait for assistant run to complete
   */
  private async waitForRunCompletion(
    threadId: string, 
    runId: string, 
    maxWaitTime = 300000 // 5 minutes
  ): Promise<OpenAI.Beta.Threads.Runs.Run> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      
      console.log(`🔄 Run status: ${run.status}`);
      
      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
        return run;
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Assistant run timed out');
  }

  /**
   * Download file from URL and convert to File object
   */
  private async downloadFileFromUrl(url: string, name: string): Promise<File> {
    console.log(`📥 Downloading file from S3: ${name}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file ${name}: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], name, { type: blob.type });
    
    console.log(`✅ Downloaded: ${name} (${Math.round(file.size / 1024)}KB)`);
    return file;
  }

  /**
   * Analyze construction documents from S3 URLs (bypasses 4.5MB Vercel limit)
   */
  async analyzeDocumentsFromUrls(
    fileUrls: { name: string; url: string; size: number }[], 
    userMessage: string = "Analyze these construction documents"
  ): Promise<string> {
    try {
      console.log('🏗️ Starting construction document analysis from S3 URLs...');
      console.log(`📂 Processing ${fileUrls.length} files from S3`);
      
      // Download files from S3 URLs
      const downloadPromises = fileUrls.map(fileInfo => 
        this.downloadFileFromUrl(fileInfo.url, fileInfo.name)
      );
      
      const files = await Promise.all(downloadPromises);
      console.log(`📁 Downloaded all ${files.length} files from S3`);
      
      // Now use the regular analyzeDocuments method
      return await this.analyzeDocuments(files, userMessage);
      
    } catch (error) {
      console.error('❌ Construction analysis from URLs failed:', error);
      throw error;
    }
  }

  /**
   * Analyze construction documents (main method)
   */
  async analyzeDocuments(files: File[], userMessage: string = "Analyze these construction documents"): Promise<string> {
    try {
      console.log('🏗️ Starting construction document analysis...');
      
      // Upload files to OpenAI
      const fileIds = await this.uploadFiles(files);
      
      // Create thread with files
      const threadId = await this.createThread(fileIds);
      
      // Send message and get analysis
      const analysis = await this.sendMessage(threadId, userMessage, fileIds);
      
      console.log('🎉 Construction analysis completed!');
      return analysis;
      
    } catch (error) {
      console.error('❌ Construction analysis failed:', error);
      throw error;
    }
  }

  /**
   * Continue conversation in existing thread
   */
  async continueConversation(threadId: string, message: string): Promise<string> {
    return this.sendMessage(threadId, message);
  }
} 