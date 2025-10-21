type ErrorTypes =
  | "AstroError"
  | "AstroUserError"
  | "CompilerError"
  | "CSSError"
  | "MarkdownError"
  | "InternalError"
  | "AggregateError";

export interface ErrorWithMetadata {
  name: string;
  type?: ErrorTypes;
  message: string;
  stack: string;
  hint?: string;
  loc?: {
    file?: string;
    line?: number;
    column?: number;
  };
}
