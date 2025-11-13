export function notify(message: string) {
  // Replace with a toast system if available
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message)
  }
}
