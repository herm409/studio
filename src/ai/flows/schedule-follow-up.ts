'use server';

/**
 * @fileOverview A flow for intelligently scheduling future follow-ups based on interaction data.
 *
 * - scheduleFollowUp - A function that schedules the follow up process.
 * - ScheduleFollowUpInput - The input type for the scheduleFollowUp function.
 * - ScheduleFollowUpOutput - The return type for the scheduleFollowUp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScheduleFollowUpInputSchema = z.object({
  prospectData: z
    .string()
    .describe('The prospect name, contact information, and any other relevant data.'),
  interactionHistory: z
    .string()
    .describe(
      'A summary of previous interactions with the prospect, including dates, content, and outcomes.'
    ),
  currentFunnelStage: z
    .string()
    .describe(
      'The current stage of the prospect in the sales funnel (e.g., prospect, viewed media, spoke with third-party, close).'
    ),
  userPreferences: z.string().describe('The users preferred follow up schedule.'),
});
export type ScheduleFollowUpInput = z.infer<typeof ScheduleFollowUpInputSchema>;

const ScheduleFollowUpOutputSchema = z.object({
  followUpSchedule: z
    .string()
    .describe(
      'A schedule of future follow-up actions, including dates, times, and suggested content, optimized for conversion.'
    ),
  reasoning: z
    .string()
    .describe(
      'Explanation for how the follow-up schedule was determined, detailing the factors considered and the optimization strategies used.'
    ),
});
export type ScheduleFollowUpOutput = z.infer<typeof ScheduleFollowUpOutputSchema>;

export async function scheduleFollowUp(input: ScheduleFollowUpInput): Promise<ScheduleFollowUpOutput> {
  return scheduleFollowUpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scheduleFollowUpPrompt',
  input: {schema: ScheduleFollowUpInputSchema},
  output: {schema: ScheduleFollowUpOutputSchema},
  prompt: `You are an AI assistant designed to optimize follow-up schedules for sales prospects.

  Analyze the provided prospect data, interaction history, current funnel stage, and user preferences to create an intelligent follow-up schedule.

  Prospect Data: {{{prospectData}}}
  Interaction History: {{{interactionHistory}}}
  Current Funnel Stage: {{{currentFunnelStage}}}
  User Preferences: {{{userPreferences}}}

  Consider factors such as:
    - Time elapsed since last interaction
    - Prospect engagement level
    - Best days/times for communication
    - Alignment with funnel stage milestones

  Output a detailed follow-up schedule, including specific dates, times, and suggested content for each follow-up.
  All suggested follow-up dates and times in the schedule MUST be in the future. Do not suggest past dates or times.
  Also, provide a reasoning for how the follow-up schedule was determined.
  Follow the output schema exactly.
  `,
});

const scheduleFollowUpFlow = ai.defineFlow(
  {
    name: 'scheduleFollowUpFlow',
    inputSchema: ScheduleFollowUpInputSchema,
    outputSchema: ScheduleFollowUpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
