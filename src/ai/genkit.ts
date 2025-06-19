
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

console.log('[Genkit] Attempting to initialize Genkit...');

if (!process.env.GOOGLE_API_KEY) {
  console.error(
    '[Genkit] CRITICAL ERROR: The GOOGLE_API_KEY environment variable is not set. ' +
    'Genkit AI features will not work and this is likely the cause of server startup failure. ' +
    'Please set this variable in your Firebase App Hosting environment configuration.'
  );
} else {
  console.log('[Genkit] GOOGLE_API_KEY environment variable is present (length: ' + process.env.GOOGLE_API_KEY.length + '). Verifying its validity is the next step for the plugin.');
}

let aiInstance = null; // Default to null

try {
  aiInstance = genkit({
    plugins: [
      googleAI(), // This is the most likely point of failure if GOOGLE_API_KEY is missing/invalid
    ],
    model: 'googleai/gemini-2.0-flash', // Ensure this model is appropriate for your key
  });
  console.log('[Genkit] Genkit initialized successfully.');
} catch (error) {
  console.error(
    '[Genkit] CRITICAL ERROR: Failed to initialize Genkit instance. AI features will be disabled. See error details below.'
  );
  console.error(error);
  // aiInstance remains null, so AI features will fail at runtime,
  // but this might allow the server to start and listen.
}

export const ai = aiInstance;
