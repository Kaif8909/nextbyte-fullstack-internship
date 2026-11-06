# EventEase: Event Registration System

## Project overview
EventEase is a proposed full-stack web application that helps people discover events and register online. This repository contains Week 1 planning documents and a working Week 2 frontend demo for the NextByte full-stack internship.

## User problem
People often learn about events through scattered posts or messages and have to contact an organizer manually to register. This makes it difficult to find accurate event information and can cause incomplete, duplicated, or lost registrations.

## Proposed solution
Build a simple website where visitors can browse available events, open an event details page, submit their name and email to register, and receive an on-screen confirmation. Event registrations will be saved in a database.

## Target users
- Attendees who want to find an event and register quickly.
- Event organizers who need a reliable list of registrations (organizer tools may be added in a later version).

## Week 1 goals
- [x] Choose project: Event Registration System.
- [x] Define the user problem and minimum viable product (MVP).
- [x] Sketch four main screens.
- [x] Plan database entities and relationships.
- [x] Define initial API endpoints and request flow.
- [x] Create the GitHub repository named `nextbyte-fullstack-internship` and upload these files.

## MVP features
1. View a list of events.
2. View details about a selected event.
3. Register with a full name and email address.
4. See a confirmation when registration succeeds.
5. Prevent invalid registrations, duplicate registrations for one event, and registrations beyond event capacity.

## Not included in MVP
Payments, account logins, email notifications, QR tickets, and a public attendee list.

## Proposed technology stack
- Frontend: HTML, CSS, and JavaScript.
- Backend: Node.js and Express.
- Database: SQLite.

These tools are proposed for the later implementation; no functional application is claimed in Week 1.

## Main screens
- Events listing
- Event details
- Registration form
- Confirmation

See [Screen sketches](docs/wireframes.md).

## Data model
Two core entities: `Event` and `Registration`, connected by `Registration.event_id`.

See [Data model](docs/data-model.md).

## API planning
The browser will call backend API endpoints. The backend validates requests and reads/writes data in SQLite.

See [API flow](docs/api-flow.md).

## Example user story
As an attendee, I want to view an event and register with my name and email so that I can reserve a place without contacting the organizer manually.

## Acceptance criteria
- Visitors can see event titles, dates, and venues.
- Visitors can open one event's details.
- A registration requires a valid name and email.
- A successful registration is stored and shows confirmation.
- A duplicate or full-event registration shows a clear error.

## Week 2: Frontend foundation

The project now includes a responsive, working **frontend-only demo**. It uses eight fictional events, category filters, a search box, reusable UI components, page navigation, and a demo registration confirmation. Registrations are only stored in the current browser using `localStorage`; there is no API or server database yet.

### How to run

Open this folder in VS Code and use **Live Server** on `index.html`, or open a terminal here and run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

> Demo content is fictional. No real events, bookings, emails, payments, or database connection are provided.

### Week 2 screenshots and progress

See [Week 2 progress](docs/week2-progress.md) and [desktop screenshot](docs/screenshots/home-desktop.png).

## Repository structure
```text
nextbyte-fullstack-internship/
|-- index.html
|-- event.html
|-- register.html
|-- success.html
|-- README.md
|-- .gitignore
|-- assets/
|   |-- css/styles.css
|   `-- js/
|       |-- app.js
|       |-- components.js
|       `-- data.js
`-- docs/
    |-- wireframes.md
    |-- data-model.md
    |-- api-flow.md
    |-- week2-progress.md
    `-- screenshots/
        |-- home-desktop.png
        |-- home-mobile.png
        `-- registration-desktop.png
```

## Status
Week 1 planning completed. Week 2 frontend implemented with static demo data. Backend, database and server-side registration checks are future phases.
