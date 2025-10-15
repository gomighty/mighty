export type MightyRenderRequest = {
  component: string;
  props: Record<string, unknown>;
  context: Record<string, unknown>;
  partial: boolean;
};
