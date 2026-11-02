export interface ModerationIssue {
  code: "abusive_language" | "personal_information" | "violent_threat";
  message: string;
}
