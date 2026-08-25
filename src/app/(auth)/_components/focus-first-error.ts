export function focusFirstError(
  form: HTMLFormElement,
  fieldNames: readonly string[],
) {
  for (const fieldName of fieldNames) {
    const control = form.elements.namedItem(fieldName);
    if (control instanceof HTMLElement) {
      control.focus();
      return;
    }

    if (control && "length" in control) {
      const firstControl = control.item(0);
      if (firstControl instanceof HTMLElement) {
        firstControl.focus();
        return;
      }
    }
  }
}
