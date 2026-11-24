/** Interest catalog: categories and the topics people can pick inside each. */
export const INTEREST_CATALOG: Record<string, string[]> = {
  Movies: ["Action", "Comedy", "Science fiction", "Drama", "Horror", "Animation", "Documentary"],
  Food: ["Indian food", "Mexican food", "Thai food", "Italian food", "Vegetarian", "Street food", "Coffee & cafés"],
  Sports: ["Badminton", "Pickleball", "Soccer", "Running", "Hiking", "Cricket"],
  Games: ["Board games", "Trivia", "Video games", "Card games"],
  Music: ["Guitar", "Singing", "Jazz", "Hip-hop", "Bollywood", "Indie"],
  Outdoors: ["Walking", "Photography", "Parks", "Cycling"],
};

export const INTEREST_CATEGORIES = Object.keys(INTEREST_CATALOG);
