"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold text-red-600 mb-4">エラーが発生しました</h2>
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-700 font-mono break-all">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-red-500 mt-2">
              Digest: {error.digest}
            </p>
          )}
        </div>
        <details className="mb-4">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
            スタックトレース
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-48 text-gray-700">
            {error.stack}
          </pre>
        </details>
        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
