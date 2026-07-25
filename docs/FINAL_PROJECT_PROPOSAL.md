# Smart Travel Planner AI

## Final two-week project proposal

Smart Travel Planner AI is a focused web application that turns a structured trip brief into a practical, editable travel plan through an AI-guided conversation. The interface remains light, professional and easy to understand rather than looking like a complex booking platform.

## Problem

Travel planning is usually spread across search engines, notes, maps, social media and booking websites. Users repeatedly explain the same requirements—budget, trip length, companions, interests and visa situation—while trying to compare destinations and activities.

The proposed product keeps these requirements visible in one fixed Trip Brief and uses them throughout the planning conversation.

## Core user experience

### Fixed Trip Brief

The Trip Brief remains visible above the chat and contains:

- Age
- Travelling with
- Children
- Themes and interests
- Travelling from
- Destination
- Number of days
- Budget
- Visa status

The user can update the brief at any point. Later recommendations should respect the latest values.

### AI planning conversation

Below the Trip Brief, the user can ask for a plan, refine recommendations and request changes such as:

- Reduce the total cost
- Replace an activity
- Add child-friendly places
- Focus on food, history, nature or shopping
- Reorder the itinerary
- Make one day less crowded

### Itinerary output

The application produces a clear day-by-day itinerary containing:

- Recommended places
- Suggested time windows
- Short reasons for each recommendation
- Estimated budget ranges
- Travel notes
- Optional alternatives

### 360-view experience

Recommendation cards may include a free 360-view or panoramic preview when a suitable public source is available. When a place has no usable 360 source, the card falls back to a standard destination image or map-style preview rather than leaving an empty section.

The application will not require downloading 360 media or storing it locally.

## MVP scope

The two-week MVP will focus on a limited curated dataset rather than attempting global coverage.

- Professional light-mode interface
- Authentication
- Fixed Trip Brief
- AI chat flow
- Curated destination and attraction dataset
- Day-by-day itinerary generation
- Recommendation cards
- 360 or panoramic fallback card
- Save and reopen plans
- Edit and regenerate individual itinerary sections
- Mobile-responsive web interface
- PDF or print-friendly itinerary export if time permits

## Technical approach

```text
Next.js web interface
        │
        ├── Supabase Authentication
        ├── Supabase PostgreSQL
        │     ├── user profiles
        │     ├── trip briefs
        │     ├── saved trips
        │     └── curated destination data
        │
        ├── Server-side AI planning route
        └── Public 360/panorama embed or visual fallback
```

### Proposed stack

- Next.js and TypeScript
- Supabase Authentication and PostgreSQL
- Row-Level Security
- Server-side AI provider integration
- Structured JSON itinerary responses
- Responsive CSS
- Vercel deployment

## Data model

### `trip_briefs`

- `id`
- `user_id`
- `age`
- `travelling_with`
- `children`
- `themes`
- `origin`
- `destination`
- `days`
- `budget`
- `visa_status`
- `created_at`
- `updated_at`

### `trips`

- `id`
- `user_id`
- `brief_id`
- `title`
- `summary`
- `itinerary_json`
- `created_at`
- `updated_at`

### `places`

- `id`
- `city`
- `name`
- `category`
- `description`
- `estimated_cost`
- `recommended_duration`
- `image_url`
- `panorama_url`
- `source_url`

## Security

- AI provider credentials remain server-side.
- Supabase service-role credentials are never exposed to the browser.
- Row-Level Security restricts saved briefs and trips to their owners.
- External embeds are validated before display.
- User input is validated before database storage and AI processing.

## Two-week implementation plan

### Week 1

1. Finalize scope, wireframes and data model.
2. Build authentication and the fixed Trip Brief.
3. Create the chat interface and server-side AI request flow.
4. Build the curated place dataset and recommendation cards.
5. Generate and render a structured day-by-day itinerary.

### Week 2

1. Add saved trips and itinerary editing.
2. Add 360/panorama cards and visual fallback behavior.
3. Improve mobile responsiveness and loading/error states.
4. Add print/PDF-friendly output if the core flow is stable.
5. Test, deploy, document and record the final demonstration.

## Success criteria

The MVP is successful when a user can:

1. Sign in.
2. Complete the fixed Trip Brief.
3. Request a trip plan through chat.
4. Receive a structured day-by-day itinerary based on the brief.
5. View recommendation cards with a 360/panorama or visual fallback.
6. Refine part of the plan through chat.
7. Save and reopen the trip.
8. Use the application comfortably on desktop and mobile.

## Future expansion

- Collaborative trip planning
- Shared budgets
- Booking links
- Visa-document checklists
- Weather-aware itinerary adjustments
- Offline saved itinerary access
- Native mobile application
- Broader destination coverage
