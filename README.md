# EventEase: Event Registration System

## Project overview
EventEase is a proposed full-stack web application that helps people discover events and register online. This repository contains the initial planning documents for Week 1 of the NextByte full-stack internship.

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
- [ ] Create the GitHub repository named `nextbyte-fullstack-internship` and upload these files.

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

## Repository structure
```text
nextbyte-fullstack-internship/
|-- README.md
|-- .gitignore
`-- docs/
    |-- wireframes.md
    |-- data-model.md
    `-- api-flow.md
```

## Status
Week 1: planning and repository setup. Coding, database implementation, and testing are future phases.
