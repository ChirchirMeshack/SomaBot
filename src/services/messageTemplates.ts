/**
 * WhatsApp Message Templates Utility
 * Provides reusable templates and a render function for placeholder replacement.
 */

export type TemplateType = 'lesson' | 'quiz' | 'reminder' | 'notification';

const templates: Record<TemplateType, string> = {
  lesson: '*{lessonTitle}*\n\n{lessonContent}\n\nKeep learning, {name}! 😊',
  quiz: '*Quiz Time!*\n\n{quizQuestion}\nA) {optionA}\nB) {optionB}\nC) {optionC}\nD) {optionD}',
  reminder: '⏰ Hi {name}, don\'t forget your lesson: *{lessonTitle}* today!',
  notification: '🔔 {message}'
};

/**
 * Render a template with data, replacing {placeholders} with values
 * @param type - Template type
 * @param data - Object with placeholder values
 * @returns Rendered message string
 */
export function renderTemplate(type: TemplateType, data: Record<string, string | number>): string {
  let template = templates[type];
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    data[key] !== undefined ? String(data[key]) : `{${key}}`
  );
} 