// Force dynamic rendering to prevent static generation issues
import { PipAIUploadApp } from '../../../components/pip-ai-upload-app';

export const dynamic = 'force-dynamic';

export default function SimpleStreamingPage() {
  return <PipAIUploadApp />;
}