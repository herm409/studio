
console.log('<<<<< EXECUTION OF src/ai/genkit.ts STARTED - CHECK THIS LOG IN CLOUD RUN LOGS >>>>>'); // VERY FIRST LINE
console.log(`[Genkit] src/ai/genkit.ts - Timestamp: ${new Date().toISOString()}`);

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

console.log('[Genkit] Attempting to initialize Genkit plugin...');

const apiKeyFromEnv = process.env.GOOGLE_API_KEY;
const apiKeyFromEnvType = typeof apiKeyFromEnv;

// More direct logging of the raw environment variable
console.log(`[Genkit] Raw GOOGLE_API_KEY from process.env: Value='${apiKeyFromEnv}', Type='${apiKeyFromEnvType}'`);

const apiKey = apiKeyFromEnv; // Use the already retrieved value

// Define the specific placeholder strings to check against.
const specificPlaceholderKey = "!!! REPLACE_THIS_WITH_YOUR_ACTUAL_GOOGLE_AI_API_KEY !!!";
const oldPlaceholderKey = "AIzaSyCMNAhRSkrFohaunN3itamXlZ7IafIUcfM";

if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === "") {
  const reason = !apiKey ? "NOT_SET (undefined or null)" : (typeof apiKey !== 'string' ? `WRONG_TYPE (type: ${typeof apiKey})` : "EMPTY_STRING_OR_WHITESPACE");
  console.error(
    `[Genkit] CRITICAL ERROR: GOOGLE_API_KEY check failed. Reason: ${reason}. Raw value: '${apiKeyFromEnv}'. ` +
    'Genkit AI features will not work. ' +
    'For Firebase App Hosting, ensure this variable is set correctly in your apphosting.yaml file.'
  );
  // This is the error being thrown (around original line 22)
  throw new Error(
    `[Genkit] FATAL: GOOGLE_API_KEY is ${reason}. Current raw value: '${apiKeyFromEnv}'. ` +
    'Cannot initialize AI plugin. ' +
    'Please set this correctly in apphosting.yaml for Firebase App Hosting.'
  );
} else if (apiKey === specificPlaceholderKey || apiKey === oldPlaceholderKey) {
  console.error(
    `[Genkit] CRITICAL ERROR: The GOOGLE_API_KEY environment variable is set to a placeholder value ("${apiKey}"). ` +
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
  console.log(`[Genkit] GOOGLE_API_KEY is present and not a placeholder. Length: ${apiKey.length}. Starts with: '${maskedKeyStart}'. Ends with: '${maskedKeyEnd}'. The googleAI plugin will now attempt to use it.`);
}

let aiInstance;

try {
  console.log('[Genkit] Attempting to call genkit({plugins: [googleAI()]}) with the validated API key.');
  aiInstance = genkit({
    plugins: [
      googleAI(),
    ],
  });
  console.log('[Genkit] Genkit instance created successfully.');
} catch (error: any) { // Explicitly type error as any or unknown then cast
  console.error(
    '[Genkit] CRITICAL ERROR: Failed to initialize Genkit instance. This is often due to an invalid or unauthorized GOOGLE_API_KEY, or issues with the Google AI service.'
  );
  console.error('[Genkit] Error details during genkit() call:', error);
  throw new Error(`[Genkit] FATAL: Genkit initialization failed. Original error: ${(error as Error).message}`);
}

export const ai = aiInstance;
