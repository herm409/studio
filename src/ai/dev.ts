import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-follow-up-message.ts';
import '@/ai/flows/schedule-follow-up.ts';
import '@/ai/flows/suggest-tools.ts';
import '@/ai/flows/color-code-prospect.ts';