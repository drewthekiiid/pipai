'use client';

// Ensure this page is always dynamic
export const dynamic = 'force-dynamic';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Something went wrong!</h1>
        <p className="text-gray-600 mt-2">An error occurred while processing your request.</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  );
} 