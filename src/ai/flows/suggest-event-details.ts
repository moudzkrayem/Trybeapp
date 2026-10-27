'use server';
/**
 * @fileOverview AI flows for suggesting event details like descriptions and tags.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the event.'),
  category: z.string().describe('The category of the event.'),
});
export type SuggestDescriptionInput = z.infer<typeof SuggestDescriptionInputSchema>;

const SuggestTagsInputSchema = z.object({
  title: z.string().describe('The title of the event.'),
  description: z.string().describe('The description of the event.'),
});
export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

function getFallbackDescription(title: string, category: string): string {
  const catClean = category.replace(/-/g, ' ');
  return `Get ready for ${title}! Join our local community for an engaging ${catClean} session designed to bring people together, spark new connections, and share unforgettable moments. All levels welcome—bring your best vibe!`;
}

function getFallbackTags(title: string, description: string): string {
  const words = `${title} ${description}`
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['with', 'this', 'that', 'from', 'your', 'have', 'will'].includes(w));
  const unique = Array.from(new Set(words)).slice(0, 5);
  if (unique.length < 3) {
    unique.push('community', 'trybe', 'meetup');
  }
  return unique.slice(0, 5).join(', ');
}

/**
 * Suggests an engaging event description.
 */
export async function suggestDescription(input: SuggestDescriptionInput): Promise<string> {
  try {
    const { text } = await ai.generate({
      prompt: `You are a creative copywriter for Trybe, a community event app. 
      Suggest a catchy and engaging description (max 100 words) for an event titled "${input.title}" in the category "${input.category}". 
      Make it sound inviting and community-focused.`,
    });
    return text || getFallbackDescription(input.title, input.category);
  } catch (error) {
    console.warn('AI suggestDescription error, falling back to template:', error);
    return getFallbackDescription(input.title, input.category);
  }
}

/**
 * Suggests relevant keywords/tags for an event.
 */
export async function suggestTags(input: SuggestTagsInput): Promise<string> {
  try {
    const { text } = await ai.generate({
      prompt: `Suggest 5 relevant keywords/tags for an event titled "${input.title}" with the description: "${input.description}". 
      Return them as a single string separated by commas.`,
    });
    return text || getFallbackTags(input.title, input.description);
  } catch (error) {
    console.warn('AI suggestTags error, falling back to extracted keywords:', error);
    return getFallbackTags(input.title, input.description);
  }
}
