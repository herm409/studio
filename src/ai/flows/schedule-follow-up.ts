
'use server';

/**
 * @fileOverview A flow for intelligently scheduling future follow-ups based on interaction data, aligned with a specific sales process.
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
  notes: z.string().describe('Brief suggestion for the purpose or content of this follow-up, linking it to the 3-step sales process.'),
});

const ScheduleFollowUpOutputSchema = z.object({
  followUpSchedule: z.array(FollowUpSuggestionSchema)
    .describe(
      'A JSON array of suggested follow-up objects. Each object represents a single follow-up.'
    ),
  reasoning: z
    .string()
    .describe(
      'Explanation for how the follow-up schedule was determined, detailing how it aligns with the 3-step sales process (Pique Interest, Full Presentation, Utilize Third-Party Expert) and moves the prospect forward.'
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
  prompt: `You are an AI assistant designed to optimize follow-up schedules for sales prospects by suggesting a sequence of multiple touchpoints. Your primary goal is to help the user move prospects through our defined 3-step sales process.
  The current date is {{{currentDate}}}. Use this as your reference for "today".

  Our 3-Step Sales Process:

  1.  **Pique Interest:** The initial goal is to capture the prospect's attention and curiosity. This is often achieved by:
      *   Sharing concise and relevant third-party media (e.g., a short video, a link to an informative website or article).
      *   Arranging a brief introduction to someone who has found success or value with our offering.
      *   Follow-ups in this stage should aim to deliver this initial piece of value and gauge interest.

  2.  **Full Presentation/Education:** Once interest is piqued, the next step is to provide comprehensive information. This involves:
      *   Getting the prospect to view a full presentation (live or recorded) that details our product/service/opportunity.
      *   Follow-ups in this stage should focus on encouraging attendance/viewing of the presentation and addressing any initial questions that might prevent them from doing so.

  3.  **Utilize Third-Party Expert/Closing:** After the prospect is educated, a third-party expert can be invaluable. This stage focuses on:
      *   Leveraging an expert to answer detailed questions, handle objections, and build further credibility.
      *   Moving the prospect towards a decision or commitment.
      *   Follow-ups here might involve scheduling a 3-way call with an expert, addressing specific concerns that arose from the presentation, or directly asking for the close.

  Analyze the provided prospect data, interaction history, current funnel stage, and user preferences to create an intelligent follow-up schedule based on this 3-step process.

  Prospect Data: {{{prospectData}}}
  Interaction History: {{{interactionHistory}}}
  Current Funnel Stage: {{{currentFunnelStage}}}
  User Preferences: {{{userPreferences}}}

  Mapping Current Funnel Stage to the 3-Step Process:
  *   If 'Current Funnel Stage' is 'Prospect', focus follow-ups on the 'Pique Interest' step.
  *   If 'Current Funnel Stage' is 'Viewed Media/Presentation', the prospect has likely engaged with 'Pique Interest' or 'Full Presentation' materials. Your follow-ups should aim to solidify understanding, encourage the next step (e.g., full presentation if only media was viewed, or expert call if presentation was viewed), or address questions from the viewed material.
  *   If 'Current Funnel Stage' is 'Spoke with Third-Party', they are in or have completed the 'Utilize Third-Party Expert' step. Follow-ups should focus on closing or addressing final concerns.
  *   If 'Current Funnel Stage' is 'Close', this prospect is likely closed or very near to it. Suggest minimal, perhaps congratulatory or onboarding-related follow-ups if appropriate.

  Important Considerations for Your Suggestions:
  *   **Multiple Follow-Ups Per Step:** Recognize that a prospect might not move through a step after a single interaction. Your suggested schedule should reflect this by potentially including multiple follow-ups designed to achieve the goal of the current step in our 3-step process.
  *   **Purposeful Notes:** For each suggested follow-up in the 'followUpSchedule' array, the 'notes' field MUST clearly state the purpose of that specific follow-up and how it relates to moving the prospect through the Pique Interest, Full Presentation, or Third-Party Expert stages.
  *   **Prioritize Quick Initial Follow-Up:** For the first one or two suggested follow-ups in the schedule, aim to schedule them within 24-48 hours of 'today' ({{{currentDate}}}), unless the 'Interaction History' or 'User Preferences' clearly indicates a specific later time requested by the prospect (e.g., 'prospect asked to call back next week', 'user prefers not to contact on weekends if initial contact is Friday'). The goal is to maintain momentum with fresh prospects.

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
    "notes": "Brief suggestion for its purpose or content, clearly linking to the 3-step sales process (e.g., 'Call to share a short testimonial video to pique interest', 'Email to invite to the full product presentation', 'Schedule 3-way call with expert to answer financial questions')"
  }
  
  Do NOT suggest specific 3rd party tools beyond what's implied by the 3-step process (e.g., "sharing a video" is fine, but don't name a specific video platform or CRM). Focus on the communication's role in the sales process.
  All suggested follow-up dates and times in the schedule MUST be in the future, relative to {{{currentDate}}}. Do not suggest past dates or times.
  For example, if today ({{{currentDate}}}) is 2024-07-15 (Monday), "tomorrow" would be 2024-07-16 (Tuesday). Ensure days of the week in your suggestions align with the actual dates if you mention them in the notes.
  
  Your 'reasoning' field should explain how the entire suggested schedule aligns with our 3-step sales process and why the sequence of follow-ups is logical for the prospect's current situation and funnel stage.
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

