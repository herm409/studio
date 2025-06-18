'use server';
/**
 * @fileOverview AI flow to assign a color code to a prospect based on their follow-up stage.
 *
 * - colorCodeProspect - Assigns a color code to a prospect.
 * - ColorCodeProspectInput - The input type for the colorCodeProspect function.
 * - ColorCodeProspectOutput - The return type for the colorCodeProspect function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ColorCodeProspectInputSchema = z.object({
  stage: z
    .number()
    .min(1)
    .max(12)
    .describe(
      'The current follow-up stage of the prospect, ranging from 1 (fresh) to 12 (ripe).'
    ),
  prospectName: z.string().describe('The name of the prospect.'),
});
export type ColorCodeProspectInput = z.infer<typeof ColorCodeProspectInputSchema>;

const ColorCodeProspectOutputSchema = z.object({
  colorCode: z
    .string()
    .describe(
      'A hexadecimal color code (e.g., #RRGGBB) representing the follow-up stage of the prospect. Fresh prospects (stage 1) should be a shade of red, ripe prospects (stage 12) should be a shade of green.'
    ),
  reasoning: z.string().describe('The AI reasoning behind the color code assignment.'),
});
export type ColorCodeProspectOutput = z.infer<typeof ColorCodeProspectOutputSchema>;

export async function colorCodeProspect(input: ColorCodeProspectInput): Promise<ColorCodeProspectOutput> {
  return colorCodeProspectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'colorCodeProspectPrompt',
  input: {schema: ColorCodeProspectInputSchema},
  output: {schema: ColorCodeProspectOutputSchema},
  prompt: `You are an AI assistant that color-codes prospects based on their follow-up stage to help users visually assess their status.

  The prospect's name is: {{{prospectName}}}.
  The prospect's stage is: {{{stage}}}.

  Assign a hexadecimal color code to the prospect, considering that stage 1 is fresh and stage 12 is ripe.
  Fresh prospects (stage 1) should be a shade of red to indicate they are not ready yet.
  Ripe prospects (stage 12) should be a shade of green to indicate they are ready.
  Explain your reasoning for choosing the color.

  Example output for a fresh prospect (stage 1):
  {
    "colorCode": "#FF0000",
    "reasoning": "The prospect is at stage 1 (fresh), thus assigned a red color to indicate they are not yet ready for intensive follow-up."
  }

  Example output for a ripe prospect (stage 12):
  {
    "colorCode": "#00FF00",
    "reasoning": "The prospect is at stage 12 (ripe), thus assigned a green color to indicate readiness for closing."
  }`,
});

const colorCodeProspectFlow = ai.defineFlow(
  {
    name: 'colorCodeProspectFlow',
    inputSchema: ColorCodeProspectInputSchema,
    outputSchema: ColorCodeProspectOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
