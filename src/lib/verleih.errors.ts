export function translateGarmentError(message: string): string {
  if (message.includes("garments_code_key")) {
    return "Diese Kennung ist bereits vergeben.";
  }
  return message;
}
