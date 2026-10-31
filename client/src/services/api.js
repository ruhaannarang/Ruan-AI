const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Calls the backend decoupled health check endpoint (GET /api/health).
 * Records response payload and measures network latency in milliseconds.
 */
export async function checkHealth() {
  const start = performance.now();
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        status: response.status,
        error: errorData?.error?.message || `HTTP ${response.status}: Failed to reach health service`,
        latencyMs
      };
    }

    const data = await response.json();
    return {
      success: true,
      status: response.status,
      data,
      latencyMs
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      error: err.message || 'Network connection failed. Is the Express server running on port 5000?',
      latencyMs
    };
  }
}
