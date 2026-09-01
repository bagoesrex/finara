export const CATEGORY_MAPPING_PROMPT = `For transaction categoryHint, choose only from the available category names supplied as data.
Choose a category compatible with the transaction type.
Use the transaction meaning. Common mappings: makan/food to Food & Drink; bensin/Grab/ride to Transport; Wi-Fi/internet/utilities to Bills; gaji/salary to Salary.
If no category clearly matches, choose the compatible category named Other.`;
