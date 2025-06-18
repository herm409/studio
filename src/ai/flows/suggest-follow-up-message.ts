'use server';
/**
 * @fileOverview An AI agent that suggests the tone and content of follow-up messages.
 *
 * - suggestFollowUpMessage - A function that suggests follow-up messages based on prospect data and interactions.
 * - SuggestFollowUpMessageInput - The input type for the suggestFollowUpMessage function.
 * - SuggestFollowUpMessageOutput - The return type for the suggestFollowUpMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFollowUpMessageInputSchema = z.object({
  prospectData: z
    .string()
    .describe('Initial data about the prospect, including their background and interests.'),
  previousInteractions: z
    .string()
    .describe('Details of previous interactions with the prospect, including dates and content.'),
  followUpNumber: z
    .number()
    .describe('The number follow up. 1 means first follow up and 12 means the twelfth follow up.'),
  funnelStage: z
    .string()
    .describe("The current stage of the prospect in the funnel: prospect, viewed media/presentation, spoke with third-party, close."),
});
export type SuggestFollowUpMessageInput = z.infer<typeof SuggestFollowUpMessageInputSchema>;

const SuggestFollowUpMessageOutputSchema = z.object({
  tone: z.string().describe('The suggested tone for the follow-up message (e.g., friendly, professional, urgent).'),
  content: z.string().describe('The suggested content for the follow-up message.'),
  suggestedTool: z.string().describe('A suggestion for a 3rd party tool. (e.g. informational videos, in person presentations, 3 way calls with experts.)'),
});
export type SuggestFollowUpMessageOutput = z.infer<typeof SuggestFollowUpMessageOutputSchema>;

export async function suggestFollowUpMessage(input: SuggestFollowUpMessageInput): Promise<SuggestFollowUpMessageOutput> {
  return suggestFollowUpMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFollowUpMessagePrompt',
  input: {schema: SuggestFollowUpMessageInputSchema},
  output: {schema: SuggestFollowUpMessageOutputSchema},
  prompt: `You are an AI assistant designed to suggest the tone, content, and suggested 3rd party tools for follow-up messages to prospects, optimizing for conversion.

  Prospect Data: {{{prospectData}}}
  Previous Interactions: {{{previousInteractions}}}
  Follow Up Number: {{{followUpNumber}}}
  Funnel Stage: {{{funnelStage}}}

  Based on the prospect's data, previous interactions, follow up number, and current funnel stage, suggest a tone, message content, and suggested tool to use.
  Consider the follow up number, and funnel stage when suggesting the tone and content of the follow up. Encourage the use of a 3rd party tool.
  Make a determination as to whether the plant is healthy or not, and what is wrong with it, and set the isHealthy output field appropriately.

  Your tone suggestion MUST be one of the following: friendly, professional, urgent. NEVER suggest any other tones.

  Output MUST be valid JSON.
  `,
});

const suggestFollowUpMessageFlow = ai.defineFlow(
  {
    name: 'suggestFollowUpMessageFlow',
    inputSchema: SuggestFollowUpMessageInputSchema,
    outputSchema: SuggestFollowUpMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
