'use server';

/**
 * @fileOverview A flow to suggest 3rd party tools to encourage prospects.
 *
 * - suggestTools - A function that suggests 3rd party tools.
 * - SuggestToolsInput - The input type for the suggestTools function.
 * - SuggestToolsOutput - The return type for the suggestTools function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestToolsInputSchema = z.object({
  prospectName: z.string().describe('The name of the prospect.'),
  funnelStage: z.string().describe('The current stage of the funnel the prospect is in (e.g., "Prospect", "Viewed Media/Presentation", "Spoke with Third-Party", "Close").'),
  prospectInfo: z.string().describe('Information about the prospect, including their background, noted interests (e.g., "interested in membership", "owns a small business", "looking for extra income"), and needs.'),
  previousInteractions: z.string().describe('A summary of previous interactions with the prospect, including what tools or information might have already been shared.'),
});
export type SuggestToolsInput = z.infer<typeof SuggestToolsInputSchema>;

const SuggestToolsOutputSchema = z.object({
  toolSuggestions: z.array(
    z.object({
      toolName: z.string().describe('The specific name or title of the tool/resource being suggested (e.g., "Watch a Membership Testimonial Video", "Invite to Virtual Live Presentation").'),
      toolType: z.enum(['Prospect by LegalShield', '3-way call', 'Live Presentation']).describe('The category of the tool.'),
      reasoning: z.string().describe('Why this tool is suggested for this prospect at this stage, referencing their specific interests and how the tool helps move them through the sales process (Pique Interest, Full Presentation, Utilize Third-Party Expert).'),
      details: z.string().optional().describe('Additional details about the specific tool, like a hypothetical video category (e.g., "Small Business Solutions video"), type of expert for a call, or if a presentation is virtual/in-person.'),
    })
  ).describe('A list of suggested tools to encourage the prospect to move to the next stage in the funnel.'),
});
export type SuggestToolsOutput = z.infer<typeof SuggestToolsOutputSchema>;

export async function suggestTools(input: SuggestToolsInput): Promise<SuggestToolsOutput> {
  return suggestToolsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestToolsPrompt',
  input: {schema: SuggestToolsInputSchema},
  output: {schema: SuggestToolsOutputSchema},
  prompt: `You are an AI assistant designed to suggest 3rd party tools to help users move prospects through a 3-step sales process: 1. Pique Interest, 2. Full Presentation/Education, 3. Utilize Third-Party Expert.

  Available Tools:

  1.  **Prospect by LegalShield (Video Platform)**:
      *   Hosts various informational videos. Categories include:
          *   Membership Testimonials (for general service interest)
          *   Associate Testimonials (for opportunity interest)
          *   Legal Plan Explanation Videos (detailed service info)
          *   IDShield Membership Explanation Videos (detailed service info)
          *   Small Business Membership Videos (for business owners)
      *   Purpose: Primarily used to pique interest (Step 1) with short, targeted videos. Longer explanation videos can serve as pre-education before a full presentation.
      *   When to suggest:
          *   Early funnel stages ("Prospect"): Suggest short, specific videos based on \`prospectInfo\`.
              *   If \`prospectInfo\` mentions business ownership or interest, suggest a "Small Business Membership Video".
              *   If \`prospectInfo\` mentions interest in membership benefits, suggest a "Legal Plan Explanation Video" or "IDShield Membership Explanation Video", or a "Membership Testimonial".
              *   If \`prospectInfo\` mentions interest in the opportunity or extra income, suggest an "Associate Testimonial".
              *   If no specific interest is clear, a general "Membership Testimonial" or "Associate Testimonial" can be used to gauge interest.
          *   Avoid suggesting small business videos unless explicitly noted the prospect owns/is interested in a business.

  2.  **3-way call**:
      *   Description: Using an expert to interact with the prospect.
      *   Purpose: Can be used to pique interest (expert shares story), handle objections after a presentation, or help close (Step 3).
      *   When to suggest:
          *   After initial interest is piqued and some information shared.
          *   When a prospect has specific questions an expert can answer.
          *   Post-presentation to address objections or build more credibility.

  3.  **Live Presentations (Virtual or In-Person)**:
      *   Description: Structured events (Zoom or in-person) sharing comprehensive details about memberships and the opportunity.
      *   Purpose: Provides full education (Step 2) and allows prospects to see a larger community.
      *   When to suggest:
          *   Once a prospect's interest has been piqued (they've moved past initial contact and shown some engagement, e.g., viewed a short video).
          *   When the prospect is ready for detailed information to make a decision. This is the primary tool for the "Full Presentation/Education" step.
          *   Generally not for a first-touch interaction unless specifically requested or indicated by strong prior interest.

  Sales Process Context for Tool Suggestion:
  *   **Pique Interest (Step 1):** Focus on "Prospect by LegalShield" with short, targeted videos. A brief 3-way call with an expert sharing their story can also work here.
  *   **Full Presentation/Education (Step 2):** Primarily recommend "Live Presentations" (virtual or in-person). Longer, more detailed videos from "Prospect by LegalShield" can be supplemental.
  *   **Utilize Third-Party Expert/Closing (Step 3):** Focus on "3-way calls" with experts to answer final questions, handle objections, and move towards a close.

  Prospect Details:
  Prospect Name: {{{prospectName}}}
  Funnel Stage: {{{funnelStage}}}
  Prospect Information: {{{prospectInfo}}}
  Previous Interactions: {{{previousInteractions}}}

  Instructions:
  1.  Analyze the \`prospectInfo\` to understand their potential interests (e.g., personal membership, business solutions, income opportunity).
  2.  Consider the \`funnelStage\` and \`previousInteractions\` to determine which step of the 3-step sales process the prospect is likely in or heading towards.
  3.  Suggest exactly 3 distinct tools.
  4.  For each suggestion:
      *   Provide a 'toolName' that is specific and actionable (e.g., "Watch the 'Understanding Your Legal Plan' video", "Schedule a 3-way call with a Business Specialist", "Invite to the upcoming Virtual Live Presentation on Zoom").
      *   Set 'toolType' to one of: 'Prospect by LegalShield', '3-way call', or 'Live Presentation'.
      *   Explain 'reasoning' clearly, linking why this specific tool (and its content, if a video) is appropriate for *this* prospect, at *this* stage, and how it helps advance them through the Pique Interest, Full Presentation, or Third-Party Expert steps.
      *   Optionally, add 'details' such as a specific video category if from 'Prospect by LegalShield' (e.g., "Membership Testimonial video", "Small Business Legal Solutions video"), the type of expert for a call, or if a presentation is virtual/in-person.
  5.  Do not suggest a "Small Business Membership Video" unless the \`prospectInfo\` clearly indicates the prospect owns a business or has expressed interest in small business solutions.
  6.  Prioritize "Live Presentations" for the "Full Presentation/Education" step of the sales process, especially if the prospect has already engaged with initial pique-interest materials.

  Make sure the output is valid JSON and adheres to the output schema.
  `,
});

const suggestToolsFlow = ai.defineFlow(
  {
    name: 'suggestToolsFlow',
    inputSchema: SuggestToolsInputSchema,
    outputSchema: SuggestToolsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

