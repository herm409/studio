
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

console.log('[Genkit] Attempting to initialize Genkit...');

const apiKey = process.env.GOOGLE_API_KEY;
// Define the specific placeholder strings to check against.
const specificPlaceholderKey = "!!! REPLACE_THIS_WITH_YOUR_ACTUAL_GOOGLE_AI_API_KEY !!!";
const oldPlaceholderKey = "AIzaSyCMNAhRSkrFohaunN3itamXlZ7IafIUcfM"; // As previously used in apphosting.yaml

if (!apiKey || apiKey.trim() === "") {
  console.error(
    '[Genkit] CRITICAL ERROR: The GOOGLE_API_KEY environment variable is not set or is empty. ' +
    'Genkit AI features will not work. ' +
    'For Firebase App Hosting, ensure this variable is set in your apphosting.yaml file.'
  );
  throw new Error(
    '[Genkit] FATAL: GOOGLE_API_KEY is not set or is empty in the environment. ' +
    'Cannot initialize AI plugin. ' +
    'Please set this in apphosting.yaml for Firebase App Hosting.'
  );
} else if (apiKey === specificPlaceholderKey || apiKey === oldPlaceholderKey) {
  console.error(
    '[Genkit] CRITICAL ERROR: The GOOGLE_API_KEY environment variable is set to a placeholder value ("' + apiKey + '"). ' +
    'You MUST replace it with your actual Google AI API key in your apphosting.yaml file.'
  );
  throw new Error(
    '[Genkit] FATAL: GOOGLE_API_KEY is still a placeholder value. ' +
    'Please replace it with your actual key in apphosting.yaml for Firebase App Hosting.'
  );
} else {
  // Log details about the key that is present (partially masked for security)
  const maskedKeyStart = apiKey.substring(0, Math.min(4, apiKey.length));
  const maskedKeyEnd = apiKey.length > 4 ? apiKey.substring(apiKey.length - 4) : "";
  console.log(`[Genkit] GOOGLE_API_KEY is present. Length: ${apiKey.length}. Starts with: ${maskedKeyStart}. Ends with: ${maskedKeyEnd}. The googleAI plugin will now attempt to use it.`);
}

let aiInstance;

try {
  // If GOOGLE_API_KEY is present but invalid, or if there's another issue with the googleAI plugin,
  // googleAI() or genkit() will throw an error here.
  aiInstance = genkit({
    plugins: [
      googleAI(), // This can throw if the API key is invalid or service is unavailable
    ],
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
