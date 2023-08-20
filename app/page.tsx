"use client";
import { useState } from 'react';

export default function QueryComponent() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const response = await fetch('/api/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.text();
    setLoading(false);
    setResult(data);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center">
        <div className="flex">
          <input
            id="query-input"
            type="text"
            placeholder='Write query request here...'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ height: 42, width: 420 }}
            className="border border-gray-400 rounded px-4 py-2 mb-4 mr-2"
          />
          <button type="submit" className="bg-purple-800 text-white px-4 py-2 rounded" style={{ height: 42 }}>
            Generate
          </button>
        </div>
      </form>
      {loading &&
        <div className="mt-4">
          <p>Generating...</p>
        </div>
      }
      {result &&
        <div className="mt-4">
          <pre>{result}</pre>
        </div>
      }
    </div>
  );
};
