"use client";

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default function CDOUploadDockPage() {
  const handleFilesSelected = (files: File[]) => {
    console.log('Files selected:', files);
  };

  const handleFileRemove = (fileId: string) => {
    console.log('File removed:', fileId);
  };

  const handleSend = () => {
    console.log('Send clicked');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-800 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <svg width="80" height="32" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g fill="#EF2323">
                <path d="M12 8.5C9.5 8.5 7.5 10.5 7.5 13V17C7.5 19.5 9.5 21.5 12 21.5H15V18.5H12C11.2 18.5 10.5 17.8 10.5 17V13C10.5 12.2 11.2 11.5 12 11.5H15V8.5H12Z"/>
                <path d="M18 8.5V21.5H24C26.5 21.5 28.5 19.5 28.5 17V13C28.5 10.5 26.5 8.5 24 8.5H18ZM21 11.5H24C24.8 11.5 25.5 12.2 25.5 13V17C25.5 17.8 24.8 18.5 24 18.5H21V11.5Z"/>
                <path d="M31.5 13V17C31.5 19.5 33.5 21.5 36 21.5H39C41.5 21.5 43.5 19.5 43.5 17V13C43.5 10.5 41.5 8.5 39 8.5H36C33.5 8.5 31.5 10.5 31.5 13ZM34.5 13C34.5 12.2 35.2 11.5 36 11.5H39C39.8 11.5 40.5 12.2 40.5 13V17C40.5 17.8 39.8 18.5 39 18.5H36C35.2 18.5 34.5 17.8 34.5 17V13Z"/>
              </g>
              <text x="48" y="28" fill="#C0C0C0" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">GROUP</text>
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">
            EstimAItor
          </h1>
          <p className="text-xl text-red-100 mb-8">
            CDO Group Construction Document Analysis Platform
          </p>
        </div>
        
        {/* CDO Upload Dock */}
        <div className="bg-slate-800 rounded-2xl p-8 border-2 border-red-500 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Drop files here or click to upload</h3>
            <p className="text-gray-300">Support for PDF, images, and construction documents</p>
          </div>
          
          <div className="flex gap-4 mt-6">
            <input
              type="text"
              placeholder="Type a message about your construction project..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-700 text-white placeholder-gray-400 border border-gray-600 focus:border-red-500 outline-none"
            />
            <button className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors">
              Analyze
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-red-200 text-sm">
            Powered by CDO Group's advanced AI estimation technology
          </p>
        </div>
      </div>
    </div>
  );
}