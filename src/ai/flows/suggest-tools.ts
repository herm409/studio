
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
  funnelStage: z.string().describe('The current stage of the funnel the prospect is in.'),
  prospectInfo: z.string().describe('Information about the prospect, including their interests and needs.'),
  previousInteractions: z.string().describe('A summary of previous interactions with the prospect.'),
});
export type SuggestToolsInput = z.infer<typeof SuggestToolsInputSchema>;

const SuggestToolsOutputSchema = z.object({
  toolSuggestions: z.array(
    z.object({
      toolName: z.string().describe('The specific name or title of the tool/resource being suggested (e.g., "Watch a Membership Testimonial Video").'),
      toolType: z.enum(['Prospect by LegalShield', '3-way call', 'Live Presentation']).describe('The category of the tool.'),
      reasoning: z.string().describe('Why this tool is suggested for this prospect at this stage.'),
      details: z.string().optional().describe('Additional details about the specific tool, like a video link, expert name, or event information.'),
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
  prompt: `You are an AI assistant designed to suggest 3rd party tools to encourage prospects to move to the next stage in a sales funnel.

  You have the following tools at your disposal:

  1.  **Prospect by LegalShield**:
      *   Description: This tool hosts informational videos about our services and opportunity. These videos focus in several categories: membership testimonials, Associate testimonials, legal plan explanation videos, IDShield membership explanation videos, small business membership videos.
      *   Purpose: These videos are used to pique the interest of the prospect while they are making a decision.
      *   When to suggest: Good for early to mid-funnel stages to provide information and build interest. Can be targeted based on prospect's specific interest (e.g., small business owner gets a small business video).

  2.  **3-way call**:
      *   Description: This involves using an expert to interact with the prospect.
      *   Purpose: Can be used to pique interest, have the expert share their story for credibility, or help close/move the prospect to a live presentation.
      *   When to suggest: Useful when a prospect has specific questions an expert can answer, needs social proof, or is close to a decision but needs a nudge.

  3.  **Live Presentations**:
      *   Description: These events are held either virtually by Zoom or in person. They share our memberships and opportunity in an orderly fashion.
      *   Purpose: Allows associates to invite guests to leverage other people speaking. They also offer great networking opportunities for guests to see the community built.
      *   When to suggest: Good for prospects who are seriously considering the opportunity or services, benefit from structured information, or would be influenced by seeing a larger community.

  Based on the prospect's name, current funnel stage, prospect information, and previous interactions, suggest 3 specific tools.
  For each suggestion:
  - Provide a 'toolName' that is a specific, actionable title (e.g., "Watch the 'Understanding Your Legal Plan' video on Prospect by LegalShield", "Schedule a 3-way call with a Business Specialist", "Invite to the upcoming Virtual Live Presentation on Zoom").
  - Set 'toolType' to one of: 'Prospect by LegalShield', '3-way call', or 'Live Presentation'.
  - Explain 'reasoning' why this specific tool instance is suggested for this prospect at this stage.
  - Optionally, add 'details' like a hypothetical video title, type of expert for a call, or if a presentation is virtual/in-person.

  Prospect Name: {{{prospectName}}}
  Funnel Stage: {{{funnelStage}}}
  Prospect Information: {{{prospectInfo}}}
  Previous Interactions: {{{previousInteractions}}}

  Suggest 3 distinct tools.
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
