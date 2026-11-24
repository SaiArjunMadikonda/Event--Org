# Community Events & Smart Group Matching Platform

A platform that helps people turn an interest into a real-world experience with a small group.

This is the **first working version**. It demonstrates one complete journey:

> An organizer creates an event → people register and select interests → the system proposes small groups →
> the organizer reviews and publishes them → each attendee sees their assignment.

It also includes a structured **Suggest an Activity** form that organizers review by hand.

## Run it locally

Requires Node.js 20+ (built and tested with Node 26).

```powershell
npm install
npm run db:setup   # creates prisma/dev.db and fills it with fictional demo data
npm run dev        # http://localhost:3000
```

`npm run db:setup` resets the database every time you run it, so use it to start a demo over.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the matching-engine tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build |

## Demo walkthrough

All people in the seed data are fictional. Sign-in is a demo picker with no passwords (see *Limitations*).

1. **Sign in as Maya Organizer.** Open **Movie and Dinner Night**: 15 people are registered, groups of exactly 5.
2. Choose **Interest-based groups** → **Create Group Preview**. You get three groups of five, each with the movie
   genres its members share. Emeka and Jada have a block between them, so they are never in the same group.
3. Click **Publish groups**.
4. **Switch user** → sign in as e.g. **Aarav Shah** → **My Events** → **My group**. Aarav sees his group number,
   meeting point, first names of his group, interests in common, and how the group was formed.
5. As Maya, open **Beginner Badminton** (7 registered, groups of 4–6) and create a preview. The result is one group of
   six and **one unassigned** person, with the reason shown. Change the rule (e.g. 3–4) and preview again to see two
   groups.
6. As any participant, open **Suggest an Activity** and submit a request. As Maya, open **Activity requests** to see
   requests grouped by activity and mark them Reviewing / Planned / Declined. The requester sees the status.
7. As Maya, **+ Create event** to publish a new activity; it appears on everyone's Discover page.

## How group matching works

The engine is a pure TypeScript module: [src/lib/matching/engine.ts](src/lib/matching/engine.ts), tested in
[engine.test.ts](src/lib/matching/engine.test.ts).

**Hard rules (never broken).** `validateAssignment` checks all of them on every run, and again at publish time
against the *current* registrations and blocks, so a stale preview can't be published.

1. Only registered attendees are assigned.
2. Nobody is placed twice in one run (also enforced by a database unique constraint).
3. Every group stays within the event's min–max size.
4. People who blocked each other (either direction) are never grouped together.
5. Only the event's organizer can generate, publish or discard groups (checked in the server actions).

**Group sizes.** The engine places everyone with the fewest, most even groups it can (14 people at 4–6 → 5, 5, 4).
If the rule makes that impossible (7 people at 4–6), it places as many as it can and reports the rest as
unassigned, earliest registrants first. It never quietly makes a group outside the rule.

**Methods.**

- *Interest-based*: a greedy pass places each person in the group where they share the most interests, then random
  swaps between groups are kept when they raise the overall shared-interest score. The score rewards common ground
  without requiring identical people.
- *Mostly random*: a seeded shuffle into even groups. Interests are not used.

The method is stored with the run and shown to attendees honestly. Each run's random seed is stored, so a preview can
be reproduced. Matching uses only the interests in the event's category (e.g. movie genres for movie night), if one
is set.

**Unassigned reasons:** not enough people for even one group, no room under the size rule, or every group with room
contained someone they are blocked with.

## Privacy choices

- Email is never shown to other participants.
- Group members see first names, interests they share with you, and a bio only if that person opted in.
- The exact meeting point is shown only to registered attendees.
- Attendees see only their own group, never the other groups.
- Participants can block someone (affects all future matching) and report a person or an event problem; reports go
  to the organizer dashboard.

## Project layout

```
prisma/schema.prisma        Data model (users, interests, events, registrations, requests,
                            matching runs, groups, group members, blocks, reports)
prisma/seed.ts              Fictional demo data
src/lib/matching/           Matching engine + tests (no database access)
src/lib/runs.ts             Builds engine input from the database; stores and publishes runs
src/app/actions/            Server actions (all writes and permission checks)
src/app/                    Screens: Discover, Event details, My group, Profile, My events,
                            Suggest, Organizer dashboard, Create event, Event management /
                            group preview, Activity requests
```

## Where this came from

This is a fresh Next.js project written for this platform. We considered starting from
[eventOS](https://github.com/rohan2025/eventOS), but chose a clean build so the code fits the social-activity journey
and every part is clearly our own. No eventOS code is included.

## Limitations of this prototype (and what replaces them)

| Prototype | Before real users |
|---|---|
| Demo sign-in picker, no passwords (cookie holds the user id) | Supabase Auth |
| SQLite file database | Supabase Postgres: set `provider = "postgresql"` in the schema and point `DATABASE_URL` at Supabase |
| Organizer role set in the seed data | Organizer onboarding and approval |
| Times shown in US Central time | Per-event time zone |
| Activity requests reviewed manually | Matching similar requests and suggesting events |

## Next steps

Feedback after events, mutual reconnect, recurring Circles, organizer follows, venues, large-event table assignment
(the same engine handles 100 people into 20 tables of five), and payments. See the product plan for the full roadmap.
