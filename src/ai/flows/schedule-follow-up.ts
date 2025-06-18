
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
      'A summary of previous interactions with the prospect, including dates, content, and outcomes. This is crucial for determining if previous call attempts were unsuccessful.'
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

const FollowUpSuggestionSchema = z.object({
  date: z.string().describe('Suggested date for the follow-up in YYYY-MM-DD format.'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Suggested time in HH:MM format."),
  method: z.enum(['Email', 'Call', 'In-Person']).describe('Suggested method of follow-up. Must be one of Email, Call, or In-Person.'),
  notes: z.string().describe('Brief suggestion for the purpose or content of this follow-up.'),
});

const ScheduleFollowUpOutputSchema = z.object({
  followUpSchedule: z.array(FollowUpSuggestionSchema)
    .describe(
      'A JSON array of suggested follow-up objects. Each object represents a single follow-up.'
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

  Follow-up Method Prioritization:
  1.  Primarily suggest 'Call' as the method for follow-ups.
  2.  Review the 'Interaction History' carefully. If previous call attempts have been unsuccessful (e.g., no answer, voicemail left but no response), then you may suggest 'Email' as an alternative follow-up method for subsequent touchpoints.
  3.  'In-Person' meetings can be suggested if appropriate for the funnel stage and user preferences, but 'Call' should be the default.

  IMPORTANT: The 'followUpSchedule' field in your output MUST be a JSON array of objects.
  Each object in the array represents a single follow-up and MUST adhere to the following structure:
  {
    "date": "YYYY-MM-DD", // Suggested date for the follow-up
    "time": "HH:MM", // Suggested time
    "method": "Email" | "Call" | "In-Person", // Method of follow-up, adhering to the prioritization logic above
    "notes": "Brief suggestion for its purpose or content (e.g., 'a check-in call to see how they\\'re doing', 'an email sending resource X as discussed if calls were missed')"
  }
  
  Do NOT suggest specific 3rd party tools for these follow-ups; focus on the communication itself and planning multiple interactions.
  All suggested follow-up dates and times in the schedule MUST be in the future, relative to {{{currentDate}}}. Do not suggest past dates or times.
  For example, if today ({{{currentDate}}}) is 2024-07-15 (Monday), "tomorrow" would be 2024-07-16 (Tuesday). Ensure days of the week in your suggestions align with the actual dates if you mention them in the notes.
  Also, provide a reasoning for how the follow-up schedule was determined, including why a particular method was chosen if deviating from a phone call.
  Follow the output schema exactly for all fields.
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

