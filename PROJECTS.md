# Kairos Igreja - Development Board

## Project Board Structure

This file defines the GitHub Projects board structure for the **kairos-igreja** repository.

## Columns

### 1. Backlog
- Feature ideas not yet planned
- Technical debt items
- User feedback / requests

### 2. To Do (Next Sprint)
- Tasks selected for the upcoming sprint
- Must have clear acceptance criteria

### 3. In Progress
- Tasks currently being worked on
- Assigned to a developer

### 4. In Review
- PR created, awaiting code review
- QA testing in progress

### 5. Done
- Merged and deployed to production

## Current Issues

| Issue | Title | Priority | Assignee |
|-------|-------|----------|----------|
| #1 | Deploy to VPS with custom domain | High | - |
| #2 | Add authentication system | High | - |
| #3 | Connect to PostgreSQL database | High | - |
| #4 | Multi-tenant support | Medium | - |
| #5 | PWA support | Medium | - |

## Milestones

### v0.1.0 - MVP (In Progress)
- [x] Dockerfile and docker-compose
- [ ] Deploy to VPS (187.77.229.227)
- [ ] Configure custom domain
- [ ] Health check endpoint

### v0.2.0 - Authentication
- [ ] JWT authentication
- [ ] User roles (super_admin, church_admin, pastor)
- [ ] Login page

### v0.3.0 - Database
- [ ] PostgreSQL integration
- [ ] Prisma ORM
- [ ] Member management CRUD

## How to Create the Project Board

Since the GitHub token doesn't have `project` scope, create the board manually:

1. Go to https://github.com/appfbj-stack/kairos-igreja/projects
2. Click "New Project"
3. Choose "Table" template
4. Name: "Kairos Igreja - Development Board"
5. Set visibility to "Private"
6. Add columns: Backlog, To Do, In Progress, In Review, Done
7. Add the issues listed above as cards