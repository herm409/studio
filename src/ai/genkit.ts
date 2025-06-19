
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

console.log('[Genkit] Attempting to initialize Genkit...');

const apiKey = process.env.GOOGLE_API_KEY;
const placeholderKey = "!!! REPLACE_THIS_WITH_YOUR_ACTUAL_GOOGLE_AI_API_KEY !!!";

if (!apiKey) {
  console.error(
    '[Genkit] CRITICAL ERROR: The GOOGLE_API_KEY environment variable is not set. ' +
    'Genkit AI features will not work. ' +
    'For Firebase App Hosting, ensure this variable is set in your apphosting.yaml file.'
  );
  // Throw an error to prevent the app from starting if the key is definitely missing.
  // This will make the build fail or runtime fail early, which is better than `ai` being null later.
  throw new Error(
    '[Genkit] FATAL: GOOGLE_API_KEY is not set in the environment. ' +
    'Cannot initialize AI plugin. ' +
    'Please set this in apphosting.yaml for Firebase App Hosting.'
  );
} else if (apiKey === placeholderKey) {
  console.error(
    '[Genkit] CRITICAL ERROR: The GOOGLE_API_KEY environment variable is set to the placeholder value. ' +
    'You MUST replace "' + placeholderKey + '" with your actual Google AI API key in your apphosting.yaml file.'
  );
  throw new Error(
    '[Genkit] FATAL: GOOGLE_API_KEY is still the placeholder value. ' +
    'Please replace it with your actual key in apphosting.yaml.'
  );
} else {
  console.log('[Genkit] GOOGLE_API_KEY environment variable is present (value starts with: ' + apiKey.substring(0,4) + '...). The googleAI plugin will now attempt to use it.');
}

let aiInstance;

try {
  // If GOOGLE_API_KEY is present but invalid, or if there's another issue with the googleAI plugin,
  // googleAI() or genkit() will throw an error here.
  aiInstance = genkit({
    plugins: [
      googleAI(), // This can throw if the API key is invalid or service is unavailable
    ],
    // The 'model' option at the top level of genkit config is not standard for genkit v1.x.
    // Model selection should be done per API call (e.g., in ai.generate or ai.definePrompt).
  });
  console.log('[Genkit] Genkit instance created successfully.');
} catch (error) {
  console.error(
    '[Genkit] CRITICAL ERROR: Failed to initialize Genkit instance. This is often due to an invalid or unauthorized GOOGLE_API_KEY, or issues with the Google AI service.'
  );
  console.error('[Genkit] Error details:', error);
  // Re-throw the error to ensure the application fails to start if Genkit can't initialize.
  // This prevents `ai` from being null and causing issues later.
  throw new Error(`[Genkit] FATAL: Genkit initialization failed. Original error: ${(error as Error).message}`);
}

// If we reach here, aiInstance is successfully initialized and non-null.
export const ai = aiInstance;
