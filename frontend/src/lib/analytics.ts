export function trackEvent(event: string, data?: Record<string, any>) {
  // Integrate with analytics service here (e.g., Segment, Mixpanel)
  // Example: analytics.track(event, data);
  console.log("Track event:", event, data);
}