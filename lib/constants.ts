export const INTERESTS = [
  "Music", "Gaming", "Movies", "Books", "Travel", "Cooking", "Fitness",
  "Photography", "Art", "Technology", "Science", "Sports", "Fashion",
  "Nature", "Anime", "Coding", "Design", "Yoga", "Dancing", "Writing",
  "Podcasts", "History", "Politics", "Finance", "Languages", "Pets",
  "Cars", "Space", "Psychology", "Philosophy",
];

export const ICE_BREAKERS = [
  "What's the most interesting place you've ever visited?",
  "If you could have dinner with any historical figure, who would it be?",
  "What's your all-time favorite movie or TV show?",
  "What skill do you wish you had but don't?",
  "What's the last book you read that you'd recommend?",
  "If you could live anywhere in the world, where would it be?",
  "What's your go-to comfort food after a tough day?",
  "What hobby have you recently picked up or want to try?",
  "Tell me one surprising fun fact about yourself!",
  "If you could time travel, where/when would you go?",
];

export function getRandomIceBreaker(): string {
  return ICE_BREAKERS[Math.floor(Math.random() * ICE_BREAKERS.length)];
}

export function getCommonInterests(a: string[], b: string[]): string[] {
  return a.filter((i) => b.includes(i));
}
