import { z } from "zod";

export type MightyRenderRequest = {
  component: string;
  props: Record<string, unknown>;
  context: Record<string, unknown>;
  partial: boolean;
};

export const MightyRenderRequestSchema: z.ZodType<MightyRenderRequest> =
  z.object({
    component: z.string(),
    props: z.record(z.string(), z.unknown()).default({}),
    context: z.record(z.string(), z.unknown()).default({}),
    partial: z.boolean().default(true),
  });
