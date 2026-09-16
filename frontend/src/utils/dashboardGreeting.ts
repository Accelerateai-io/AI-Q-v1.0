export function getDashboardGreetingName(fallback = "there"): string {
  return (
    (sessionStorage.getItem("userFirstName") ?? "").trim() ||
    (sessionStorage.getItem("userName") ?? "").trim().split(/\s+/)[0] ||
    fallback
  );
}

function getTimeOfDayPart(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** Time-of-day greeting using the user's first name (or fallback). */
export function getDashboardGreeting(fallback = "there"): string {
  return `${getTimeOfDayPart()}, ${getDashboardGreetingName(fallback)}!`;
}

/** Rotating dashboard headlines for the typewriter greeting. */
export function getDashboardGreetingLoop(
  role: "buyer" | "vendor",
  fallback = "there",
): string[] {
  const name = getDashboardGreetingName(fallback);
  const part = getTimeOfDayPart();
  if (role === "buyer") {
    return [
      `${part}, ${name}!`,
      `Welcome back, ${name}`,
      "Ready to evaluate vendor trust?",
      "Your AI risk insights await",
    ];
  }
  return [
    `${part}, ${name}!`,
    `Welcome back, ${name}`,
    "Ready to attest and assess?",
  ];
}

/** Substrings to emphasize in blue inside typewriter headlines. */
export function getDashboardGreetingHighlights(
  role: "buyer" | "vendor",
  fallback = "there",
): string[] {
  const name = getDashboardGreetingName(fallback);
  if (role === "vendor") {
    return [name, "attest", "assess"].filter(Boolean);
  }
  return [name, "evaluate vendor trust", "AI risk insights"].filter(Boolean);
}
