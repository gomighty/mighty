import { z } from "zod";

export const MightyRenderRequestSchema = z.object({
  component: z.string(),
  props: z.record(z.string(), z.unknown()).default({}),
  context: z.record(z.string(), z.unknown()).default({}),
  partial: z.boolean().default(true),
});

export type MightyRenderRequest = z.infer<typeof MightyRenderRequestSchema>;
