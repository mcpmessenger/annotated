// ─── DOM Helpers ─────────────────────────────────────────────────────────────

export const $ = <T extends HTMLElement = HTMLElement>(
  sel: string,
  root: ParentNode = document
): T | null => root.querySelector<T>(sel);

export const $$ = <T extends HTMLElement = HTMLElement>(
  sel: string,
  root: ParentNode = document
): NodeListOf<T> => root.querySelectorAll<T>(sel);
