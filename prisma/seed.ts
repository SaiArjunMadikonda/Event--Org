/**
 * Fictional demo data. Every person here is made up.
 * Run with `npm run db:setup` (resets the database, then seeds).
 */
import { PrismaClient } from "@prisma/client";
import { INTEREST_CATALOG } from "../src/lib/interests";

const prisma = new PrismaClient();

function daysFromNow(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

type Person = { name: string; city: string; bio: string; share: boolean; interests: string[] };

const PEOPLE: Person[] = [
  { name: "Aarav Shah", city: "Irving", bio: "New to DFW, software tester, will try any cuisine once.", share: true, interests: ["Action", "Science fiction", "Indian food", "Badminton", "Board games"] },
  { name: "Bianca Torres", city: "Irving", bio: "Nurse on weekday shifts. Big on comedies.", share: true, interests: ["Comedy", "Animation", "Mexican food", "Walking", "Trivia"] },
  { name: "Chen Wei", city: "Las Colinas", bio: "Amateur photographer and sci-fi reader.", share: false, interests: ["Science fiction", "Documentary", "Thai food", "Photography", "Hiking"] },
  { name: "Daniela Ruiz", city: "Irving", bio: "", share: false, interests: ["Drama", "Comedy", "Italian food", "Singing", "Coffee & cafés"] },
  { name: "Emeka Obi", city: "Grand Prairie", bio: "Plays guitar badly but enthusiastically.", share: true, interests: ["Action", "Horror", "Street food", "Guitar", "Soccer"] },
  { name: "Fatima Khan", city: "Irving", bio: "Grad student. Looking for weekend plans.", share: true, interests: ["Drama", "Documentary", "Indian food", "Badminton", "Walking"] },
  { name: "Gabe Miller", city: "Coppell", bio: "", share: false, interests: ["Action", "Science fiction", "Video games", "Board games", "Pickleball"] },
  { name: "Hana Sato", city: "Irving", bio: "Moved from Seattle last month.", share: true, interests: ["Animation", "Comedy", "Coffee & cafés", "Board games", "Indie"] },
  { name: "Ishaan Patel", city: "Irving", bio: "Cricket on Sundays, movies on Fridays.", share: true, interests: ["Action", "Comedy", "Cricket", "Badminton", "Bollywood"] },
  { name: "Jada Brooks", city: "Dallas", bio: "", share: false, interests: ["Horror", "Drama", "Mexican food", "Hip-hop", "Running"] },
  { name: "Kenji Mori", city: "Las Colinas", bio: "Board game collector (120+ games).", share: true, interests: ["Science fiction", "Animation", "Board games", "Card games", "Thai food"] },
  { name: "Lena Fischer", city: "Irving", bio: "Weekend hiker and coffee snob.", share: true, interests: ["Documentary", "Drama", "Hiking", "Coffee & cafés", "Photography"] },
  { name: "Marcus Green", city: "Irving", bio: "", share: false, interests: ["Action", "Horror", "Soccer", "Street food", "Video games"] },
  { name: "Nadia Haddad", city: "Euless", bio: "Jazz and long walks.", share: true, interests: ["Comedy", "Drama", "Jazz", "Walking", "Vegetarian"] },
  { name: "Omar Farouk", city: "Irving", bio: "Learning badminton this year.", share: true, interests: ["Science fiction", "Action", "Badminton", "Indian food", "Trivia"] },
  { name: "Priya Nair", city: "Irving", bio: "Sings in a community choir.", share: true, interests: ["Comedy", "Animation", "Singing", "Bollywood", "Vegetarian"] },
  { name: "Quinn Taylor", city: "Coppell", bio: "", share: false, interests: ["Horror", "Science fiction", "Cycling", "Indie", "Board games"] },
  { name: "Rosa Delgado", city: "Irving", bio: "Teacher. Trivia night regular.", share: true, interests: ["Drama", "Comedy", "Trivia", "Mexican food", "Parks"] },
];

async function main() {
  // Interests
  const interestIds = new Map<string, string>();
  for (const [category, names] of Object.entries(INTEREST_CATALOG)) {
    for (const name of names) {
      const row = await prisma.interest.create({ data: { name, category } });
      interestIds.set(name, row.id);
    }
  }

  // Organizer
  const organizer = await prisma.user.create({
    data: {
      name: "Maya Organizer",
      email: "maya.organizer@example.test",
      city: "Irving",
      role: "ORGANIZER",
      bio: "Runs small-group meetups around Irving.",
      shareBioWithGroup: true,
    },
  });

  // Participants
  const users = [];
  for (const p of PEOPLE) {
    const email = `${p.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.test`;
    const u = await prisma.user.create({
      data: {
        name: p.name,
        email,
        city: p.city,
        bio: p.bio,
        shareBioWithGroup: p.share,
        interests: { create: p.interests.map((n) => ({ interestId: interestIds.get(n)! })) },
      },
    });
    users.push(u);
  }

  const base = {
    organizerId: organizer.id,
    status: "OPEN",
  };

  const movieNight = await prisma.event.create({
    data: {
      ...base,
      title: "Movie and Dinner Night",
      activity: "Movies & Dinner",
      description:
        "Catch an evening movie together, then head to dinner nearby in small groups to talk about it. You'll be placed at a table of five with people who share some of your movie tastes.",
      whatToExpect:
        "Arrive 15 minutes early at the cinema lobby. Look for the organizer holding a green sign. Tickets are bought individually at the box office. After the movie, walk over to dinner with your group.",
      startsAt: daysFromNow(10, 18, 30),
      durationMinutes: 240,
      area: "Las Colinas, Irving",
      meetingPoint: "Cinema lobby, 320 W Las Colinas Blvd (fictional venue for the demo)",
      costEstimate: "$15–$35 (movie ticket + dinner, pay individually)",
      capacity: 15,
      minGroupSize: 5,
      maxGroupSize: 5,
      interestCategory: "Movies",
      registrationQuestion: "Any dietary preferences or restrictions?",
    },
  });

  const badminton = await prisma.event.create({
    data: {
      ...base,
      title: "Beginner Badminton",
      activity: "Badminton",
      description:
        "Relaxed beginner-friendly badminton. Rackets available to borrow. Groups of four to six share a court and rotate doubles.",
      whatToExpect: "Wear non-marking indoor shoes. Check in at the front desk and say you're with the group.",
      startsAt: daysFromNow(4, 9, 0),
      durationMinutes: 120,
      area: "North Irving",
      meetingPoint: "Front desk, Irving Community Rec Center (fictional venue for the demo)",
      costEstimate: "$8 court share",
      capacity: 12,
      minGroupSize: 4,
      maxGroupSize: 6,
      interestCategory: "Sports",
      registrationQuestion: "Have you played badminton before? (never / a few times / regularly)",
    },
  });

  await prisma.event.create({
    data: {
      ...base,
      title: "Saturday Coffee Meetup",
      activity: "Coffee",
      description: "Low-key coffee and conversation in small tables of three to four.",
      whatToExpect: "Order at the counter, then find the reserved tables at the back.",
      startsAt: daysFromNow(4, 10, 30),
      durationMinutes: 90,
      area: "Irving Heritage District",
      meetingPoint: "Back room, Heritage Coffee Co. (fictional venue for the demo)",
      costEstimate: "$5–$10",
      capacity: 16,
      minGroupSize: 3,
      maxGroupSize: 4,
      interestCategory: null,
    },
  });

  await prisma.event.create({
    data: {
      ...base,
      title: "Board Games at a Café",
      activity: "Board games",
      description: "Learn a new game or bring a favorite. Tables of four to five.",
      whatToExpect: "The café has 300+ games. A game guide can teach rules.",
      startsAt: daysFromNow(7, 19, 0),
      durationMinutes: 180,
      area: "Valley Ranch, Irving",
      meetingPoint: "Table area, Dice & Brew Café (fictional venue for the demo)",
      costEstimate: "$10 table fee",
      capacity: 20,
      minGroupSize: 4,
      maxGroupSize: 5,
      interestCategory: "Games",
    },
  });

  await prisma.event.create({
    data: {
      ...base,
      title: "Weekend Walk",
      activity: "Walking",
      description: "An easy 3-mile loop around the lake, walking in small groups.",
      whatToExpect: "Bring water. Flat paved path, suitable for all fitness levels.",
      startsAt: daysFromNow(11, 8, 0),
      durationMinutes: 90,
      area: "Lake Carolyn, Las Colinas",
      meetingPoint: "Mustangs sculpture plaza (fictional meeting point for the demo)",
      costEstimate: "Free",
      capacity: 25,
      minGroupSize: 4,
      maxGroupSize: 6,
      interestCategory: "Outdoors",
    },
  });

  await prisma.event.create({
    data: {
      ...base,
      title: "Music Jamming Session",
      activity: "Music",
      description: "Bring an instrument or your voice. Small groups jam together for an hour, then share.",
      whatToExpect: "A keyboard and amp are provided. Acoustic instruments welcome.",
      startsAt: daysFromNow(14, 17, 0),
      durationMinutes: 150,
      area: "Irving",
      meetingPoint: "Studio B, Irving Arts Space (fictional venue for the demo)",
      costEstimate: "$12 room share",
      capacity: 12,
      minGroupSize: 3,
      maxGroupSize: 4,
      interestCategory: "Music",
      registrationQuestion: "What do you play or sing?",
    },
  });

  // 15 registrations for Movie Night, in a known order.
  const dietary = ["", "Vegetarian", "", "No pork", "", "", "Vegan", "", "", "Gluten-free", "", "", "", "Vegetarian", ""];
  for (let i = 0; i < 15; i++) {
    await prisma.registration.create({
      data: {
        eventId: movieNight.id,
        userId: users[i].id,
        answer: dietary[i],
        createdAt: new Date(Date.now() - (20 - i) * 3600_000),
      },
    });
  }

  // 7 registrations for Beginner Badminton (groups of 4–6 → one group of 6 + 1 unassigned).
  const badmintonPlayers = [0, 5, 8, 14, 6, 11, 2];
  const levels = ["a few times", "never", "regularly", "never", "a few times", "never", "never"];
  for (let i = 0; i < badmintonPlayers.length; i++) {
    await prisma.registration.create({
      data: {
        eventId: badminton.id,
        userId: users[badmintonPlayers[i]].id,
        answer: levels[i],
        createdAt: new Date(Date.now() - (10 - i) * 3600_000),
      },
    });
  }

  // A block between two Movie Night attendees, so the matcher must keep them apart.
  await prisma.block.create({ data: { blockerId: users[4].id, blockedId: users[9].id } });

  // Activity requests
  await prisma.activityRequest.createMany({
    data: [
      { userId: users[5].id, activity: "Badminton", experienceLevel: "Beginner", area: "Irving", timeWindow: "Saturday morning", budgetMax: 20, groupSizeMin: 4, groupSizeMax: 6, notes: "" },
      { userId: users[14].id, activity: "Badminton", experienceLevel: "Beginner", area: "Irving", timeWindow: "Saturday morning", budgetMax: 15, groupSizeMin: 4, groupSizeMax: 6, notes: "Would love a regular weekly game." },
      { userId: users[1].id, activity: "Try a new restaurant", experienceLevel: "Any", area: "Irving / Las Colinas", timeWindow: "Friday evening", budgetMax: 40, groupSizeMin: 4, groupSizeMax: 6, notes: "None of my friends are free this Friday." },
      { userId: users[10].id, activity: "Board games", experienceLevel: "Any", area: "Las Colinas", timeWindow: "Weeknight evening", budgetMax: 15, groupSizeMin: 3, groupSizeMax: 5, notes: "Strategy games preferred." },
    ],
  });

  console.log(`Seeded ${users.length + 1} users, 6 events, 22 registrations, 4 activity requests.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
