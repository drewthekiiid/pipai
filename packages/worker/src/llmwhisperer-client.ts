/**
 * LLMWhisperer Client for PIP AI
 * Replaces Unstructured API with a more cost-effective solution
 */

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';

interface LLMWhispererConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

interface WhisperResponse {
  status_code: number;
  whisper_hash?: string;
  extraction?: {
    resultText: string;
    pageCount: number;
  };
  error?: string;
}

interface UsageInfo {
  current_page_count: number;
  daily_quota: number;
  monthly_quota: number;
  today_page_count: number;
  subscription_plan: string;
}

export class LLMWhispererClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: LLMWhispererConfig = {}) {
    this.apiKey = config.apiKey || process.env.LLMWHISPERER_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('LLMWhisperer API key is required. Set LLMWHISPERER_API_KEY environment variable.');
    }

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://llmwhisperer-api.us-central.unstract.com/api/v2',
      timeout: config.timeout || 300000, // 5 minutes
      headers: {
        'unstract-key': this.apiKey,
      },
    });
  }

  /**
   * Process a document with LLMWhisperer
   */
  async processDocument(
    filePath: string,
    options: {
      mode?: 'high_quality' | 'low_cost' | 'native_text' | 'form';
      outputMode?: 'layout_preserving' | 'text';
      waitForCompletion?: boolean;
      waitTimeout?: number;
    } = {}
  ): Promise<string> {
    const {
      mode = 'high_quality',
      outputMode = 'layout_preserving',
      waitForCompletion = true,
      waitTimeout = 300,
    } = options;

    console.log('🔄 Processing document with LLMWhisperer: ' + filePath);
    console.log('   Mode: ' + mode);
    console.log('   Output mode: ' + outputMode);

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('mode', mode);
      formData.append('output_mode', outputMode);
      formData.append('wait_for_completion', waitForCompletion.toString());
      formData.append('wait_timeout', waitTimeout.toString());

      // Submit document for processing
      const response = await this.client.post<WhisperResponse>('/whisper', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      if (response.data.status_code !== 200) {
        throw new Error('LLMWhisperer API error: ' + (response.data.error || 'Unknown error'));
      }

      // If waiting for completion, result should be in the response
      if (waitForCompletion && response.data.extraction?.resultText) {
        const text = response.data.extraction.resultText;
        const pageCount = response.data.extraction.pageCount || 0;
        
        console.log('✅ LLMWhisperer processing completed');
        console.log('   Pages processed: ' + pageCount);
        console.log('   Text length: ' + text.length.toLocaleString() + ' characters');
        
        return text;
      }

      // If not waiting, we need to poll for results
      if (response.data.whisper_hash) {
        return await this.pollForResults(response.data.whisper_hash, waitTimeout);
      }

      throw new Error('No result or whisper hash returned from LLMWhisperer');

    } catch (error) {
      console.error('❌ LLMWhisperer processing failed:', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        
        if (status === 429) {
          throw new Error('LLMWhisperer daily quota exceeded. Please try again tomorrow or upgrade your plan.');
        }
        
        if (status === 401) {
          throw new Error('LLMWhisperer API key is invalid or expired.');
        }
        
        throw new Error('LLMWhisperer API error (' + status + '): ' + (data?.error || error.message));
      }
      
      throw error;
    }
  }

  /**
   * Poll for processing results
   */
  private async pollForResults(whisperHash: string, timeoutSeconds: number): Promise<string> {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    console.log('🔄 Polling for LLMWhisperer results: ' + whisperHash);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.client.get<WhisperResponse>('/whisper-retrieve/' + whisperHash);
        
        if (response.data.status_code === 200 && response.data.extraction?.resultText) {
          const text = response.data.extraction.resultText;
          const pageCount = response.data.extraction.pageCount || 0;
          
          console.log('✅ LLMWhisperer processing completed');
          console.log('   Pages processed: ' + pageCount);
          console.log('   Text length: ' + text.length.toLocaleString() + ' characters');
          
          return text;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
        
      } catch (error) {
        console.warn('⚠️ Polling attempt failed:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    throw new Error('LLMWhisperer processing timeout after ' + timeoutSeconds + ' seconds');
  }

  /**
   * Get usage information
   */
  async getUsageInfo(): Promise<UsageInfo> {
    try {
      const response = await this.client.get<UsageInfo>('/get-usage-info');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get LLMWhisperer usage info:', error);
      throw error;
    }
  }

  /**
   * Check if we can process more documents today
   */
  async canProcessMore(): Promise<{ canProcess: boolean; reason?: string; remaining?: number }> {
    try {
      const usage = await this.getUsageInfo();
      
      if (usage.daily_quota === -1) {
        return { canProcess: true }; // Unlimited
      }
      
      const remaining = usage.daily_quota - usage.today_page_count;
      
      if (remaining <= 0) {
        return { 
          canProcess: false, 
          reason: 'Daily quota of ' + usage.daily_quota + ' pages exceeded. Used: ' + usage.today_page_count,
          remaining: 0
        };
      }
      
      return { 
        canProcess: true, 
        remaining 
      };
      
    } catch (error) {
      console.warn('⚠️ Could not check usage limits:', error);
      return { canProcess: true }; // Assume we can process if check fails
    }
  }
}

// Export a factory function for easy use
export function createLLMWhispererClient(config?: LLMWhispererConfig): LLMWhispererClient {
  return new LLMWhispererClient(config);
}

// Default export
export default LLMWhispererClient;    