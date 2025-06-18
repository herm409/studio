
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
  currentDate: z.string().describe('The current date in YYYY-MM-DD format. This is "today".'),
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
  prompt: `You are an AI assistant designed to optimize follow-up schedules for sales prospects by suggesting a sequence of multiple touchpoints.
  The current date is {{{currentDate}}}. Use this as your reference for "today".

  Analyze the provided prospect data, interaction history, current funnel stage, and user preferences to create an intelligent follow-up schedule.

  Prospect Data: {{{prospectData}}}
  Interaction History: {{{interactionHistory}}}
  Current Funnel Stage: {{{currentFunnelStage}}}
  User Preferences: {{{userPreferences}}}

  Consider factors such as:
    - Time elapsed since last interaction (relative to {{{currentDate}}})
    - Prospect engagement level
    - Best days/times for communication
    - Alignment with funnel stage milestones
    - The importance of maintaining multiple touchpoints.

  Output a detailed follow-up schedule consisting of multiple potential future follow-up actions. For each action, include specific dates, times, and a brief suggestion for the communication's purpose or content (e.g., "check-in call", "send resource X", "follow up on previous discussion point Y").
  Do NOT suggest specific 3rd party tools for these follow-up actions; focus on the communication itself and planning multiple interactions.
  All suggested follow-up dates and times in the schedule MUST be in the future, relative to {{{currentDate}}}. Do not suggest past dates or times.
  For example, if today ({{{currentDate}}}) is 2024-07-15 (Monday), "tomorrow" would be 2024-07-16 (Tuesday). Ensure days of the week in your suggestions align with the actual dates.
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

