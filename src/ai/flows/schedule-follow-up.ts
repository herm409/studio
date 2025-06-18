
'use server';

/**
 * @fileOverview A flow for intelligently scheduling future follow-ups based on interaction data, aligned with a specific sales process and available tools.
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
      'The current stage of the prospect in the sales funnel (e.g., prospect, viewed media, spoke with third-party, close). This helps map to our sales process.'
    ),
  userPreferences: z.string().describe('The users preferred follow up schedule.'),
  currentDate: z.string().describe('The current date in YYYY-MM-DD format. This is "today".'),
});
export type ScheduleFollowUpInput = z.infer<typeof ScheduleFollowUpInputSchema>;

const FollowUpSuggestionSchema = z.object({
  date: z.string().describe('Suggested date for the follow-up in YYYY-MM-DD format.'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Suggested time in HH:MM format."),
  method: z.enum(['Email', 'Call', 'In-Person']).describe('Suggested method of follow-up. Must be one of Email, Call, or In-Person.'),
  notes: z.string().describe('Brief suggestion for the purpose or content of this follow-up, linking it to the 3-step sales process and suggesting a relevant type of tool or action.'),
});

const ScheduleFollowUpOutputSchema = z.object({
  followUpSchedule: z.array(FollowUpSuggestionSchema)
    .describe(
      'A JSON array of suggested follow-up objects. Each object represents a single follow-up.'
    ),
  reasoning: z
    .string()
    .describe(
      'Explanation for how the follow-up schedule was determined, detailing how it aligns with the 3-step sales process (Pique Interest, Full Presentation, Utilize Third-Party Expert), incorporates tool usage, and moves the prospect forward.'
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
  prompt: `You are an AI assistant designed to optimize follow-up schedules for sales prospects by suggesting a sequence of multiple touchpoints. Your primary goal is to help the user move prospects through our defined 3-step sales process, incorporating relevant tool types.
  The current date is {{{currentDate}}}. Use this as your reference for "today".

  Our 3-Step Sales Process & Recommended Tool Types:

  1.  **Pique Interest:** Goal: Capture attention and curiosity.
      *   **Tool Types:** Share concise third-party media (e.g., a short informational or testimonial video from platforms like 'Prospect by LegalShield', a relevant article/website). Arrange brief introductions to successful peers or experts (can be an initial 3-way call).
      *   **Follow-up Focus:** Deliver initial value, gauge interest, set up the next step. Notes should suggest actions like "Call to share a [specific type, e.g., testimonial] video from Prospect by LegalShield" or "Email to schedule a quick intro call with an expert."

  2.  **Full Presentation/Education:** Goal: Provide comprehensive information.
      *   **Tool Types:** Get prospect to view a full presentation (e.g., 'Live Presentation' - virtual or in-person, or a comprehensive video).
      *   **Follow-up Focus:** Encourage viewing/attendance, address preliminary questions. Notes should suggest actions like "Follow up to invite to upcoming Live Presentation (virtual or in-person)" or "Send link to full product overview video available on Prospect by LegalShield."

  3.  **Utilize Third-Party Expert/Closing:** Goal: Leverage expert credibility to handle objections and close.
      *   **Tool Types:** '3-way calls' with subject matter experts.
      *   **Follow-up Focus:** Schedule expert interaction, address specific concerns, move to close. Notes should suggest "Arrange a 3-way call with a [type of expert, e.g., product specialist] to discuss [objection/question]" or "Follow up post-expert call for decision."

  Analyze the provided prospect data, interaction history, current funnel stage, and user preferences to create an intelligent follow-up schedule based on this 3-step process and the associated tool types.

  Prospect Data: {{{prospectData}}}
  Interaction History: {{{interactionHistory}}}
  Current Funnel Stage: {{{currentFunnelStage}}}
  User Preferences: {{{userPreferences}}}

  Mapping Current Funnel Stage to the 3-Step Process:
  *   If 'Current Funnel Stage' is 'Prospect', focus follow-ups on the 'Pique Interest' step, suggesting appropriate tools.
  *   If 'Current Funnel Stage' is 'Viewed Media/Presentation', the prospect has likely engaged with 'Pique Interest' or 'Full Presentation' materials. Your follow-ups should aim to solidify understanding, encourage the next step (e.g., full presentation if only media was viewed, or expert call if presentation was viewed), or address questions from the viewed material, suggesting relevant tools.
  *   If 'Current Funnel Stage' is 'Spoke with Third-Party', they are in or have completed the 'Utilize Third-Party Expert' step. Follow-ups should focus on closing or addressing final concerns, possibly with another expert interaction if needed.
  *   If 'Current Funnel Stage' is 'Close', this prospect is likely closed or very near to it. Suggest minimal, perhaps congratulatory or onboarding-related follow-ups if appropriate.

  Important Considerations for Your Suggestions:
  *   **Multiple Follow-Ups Per Step:** Recognize that a prospect might not move through a step after a single interaction. Your suggested schedule should reflect this by potentially including multiple follow-ups designed to achieve the goal of the current step in our 3-step process.
  *   **Purposeful Notes with Tool Integration:** For each suggested follow-up in the 'followUpSchedule' array, the 'notes' field MUST clearly state the purpose of that specific follow-up, how it relates to moving the prospect through the Pique Interest, Full Presentation, or Third-Party Expert stages, AND *suggest a relevant type of tool or action* that aligns with that stage and the tool types described above (e.g., 'Call to share a short video from Prospect by LegalShield to pique interest', 'Email to invite to the full product presentation', 'Schedule 3-way call with expert to answer financial questions'). The user can consult the AI Tool Advisor for more specific tool recommendations if needed.
  *   **Timely Initial Follow-Up (Crucial for Pique Interest):** For the *very first* suggested follow-up, especially if the prospect is new or in the 'Pique Interest' stage (as indicated by 'Current Funnel Stage' being 'Prospect'), aim to schedule it within **24 hours** of 'today' ({{{currentDate}}}). For subsequent early follow-ups (e.g., the second in the sequence if the first didn't connect), maintain a 24-48 hour window. The only exception is if the 'Interaction History' or 'User Preferences' clearly indicates a specific later time requested by the prospect (e.g., 'prospect asked to call back next week', 'user prefers not to contact on weekends if initial contact is Friday'). The primary goal is to capitalize on initial interest and maintain momentum.

  Follow-up Method Prioritization:
  1.  Primarily suggest 'Call' as the method for follow-ups.
  2.  Review the 'Interaction History' carefully. If previous call attempts have been unsuccessful (e.g., no answer, voicemail left but no response), then you may suggest 'Email' as an alternative follow-up method for subsequent touchpoints.
  3.  'In-Person' meetings can be suggested if appropriate for the sales process stage and user preferences, but 'Call' should be the default.

  IMPORTANT: The 'followUpSchedule' field in your output MUST be a JSON array of objects.
  Each object in the array represents a single follow-up and MUST adhere to the following structure:
  {
    "date": "YYYY-MM-DD", // Suggested date for the follow-up
    "time": "HH:MM", // Suggested time
    "method": "Email" | "Call" | "In-Person", // Method of follow-up, adhering to the prioritization logic above
    "notes": "Brief suggestion for its purpose or content, clearly linking to the 3-step sales process and incorporating a suggestion for a relevant tool type (e.g., 'Call to share a short testimonial video from Prospect by LegalShield to pique interest', 'Email to invite to the full product presentation', 'Schedule 3-way call with expert to answer financial questions')"
  }
  
  All suggested follow-up dates and times in the schedule MUST be in the future, relative to {{{currentDate}}}. Do not suggest past dates or times.
  For example, if today ({{{currentDate}}}) is 2024-07-15 (Monday), "tomorrow" would be 2024-07-16 (Tuesday). Ensure days of the week in your suggestions align with the actual dates if you mention them in the notes.
  
  Your 'reasoning' field should explain how the entire suggested schedule aligns with our 3-step sales process, incorporates relevant tool usage, and why the sequence of follow-ups is logical for the prospect's current situation and funnel stage.
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

