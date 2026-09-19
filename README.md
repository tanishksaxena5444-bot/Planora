# 🚀 Planora

### AI-Powered Project Management Platform

Planora is a full-stack AI-powered project management platform designed to help teams organize projects, manage tasks, collaborate with team members, track project activity, and make better decisions using AI-powered tools.

It combines **real-time collaboration, role-based access control, Firebase authentication, MongoDB, Socket.IO, Gemini AI, and task attachments** into a single modern web application.

---

## 🌐 Live Demo

**Frontend:**  
https://planora-frontend.onrender.com

**Backend API:**  
https://planora-fnqk.onrender.com

> The application is hosted on Render. The backend uses a free instance and may take some time to wake up after a period of inactivity.

---

# ✨ Features

## 📊 Project Management

- Create and manage projects
- Update project information
- Delete projects
- View project details
- Organize project-related work in one place
- Share projects through project links

---

## ✅ Task Management

- Create and manage tasks
- Update task details
- Delete tasks
- Track task progress
- Organize tasks inside projects
- Prioritize tasks
- Real-time task updates

---

## 📎 Task Attachments

- Upload files to tasks
- View task attachments
- Delete uploaded attachments
- Support multiple attachments per task
- File upload validation using Multer

---

## 👥 Team Collaboration

- Add members to projects
- Manage project member roles
- Role-based project permissions
- Project-level access control
- Collaborate with team members

---

## ⚡ Real-Time Collaboration

Planora uses **Socket.IO** to provide real-time communication between connected users.

Project and task-related updates can be reflected across connected clients without requiring a manual page refresh.

Socket connections are authenticated using Firebase ID tokens.

---

## 🔐 Authentication & Authorization

Authentication is implemented using **Firebase Authentication**.

Supported authentication includes:

- Email/password authentication
- Google authentication
- Firebase ID token authentication
- Protected application routes
- Firebase ID token verification on the backend
- Role-based authorization

The backend uses the **Firebase Admin SDK** to verify authenticated users before allowing access to protected resources.

---

## 🤖 Gemini AI Project Assistant

Planora includes an AI-powered project copilot using **Google Gemini**.

The AI assistant is designed specifically around project-management workflows.

The AI features include:

- 📋 **Project Summary** — Generate a summary of the current project
- 🎯 **AI Task Priorities** — Analyze tasks and identify which ones should be prioritized
- ⚠️ **Risk Analysis** — Identify potential project risks
- ⏱️ **AI Deadline Planner** — Create a plan based on a project deadline
- 💬 **AI Project Copilot** — Ask natural-language questions about the project
- 📝 **AI Task Creation** — Generate task suggestions using project context

---

## 🔗 Project Sharing

Planora allows users to generate project links for easier project access.

A shared project link can be opened directly in the deployed application without encountering a frontend routing error.

The application uses React Router with SPA rewrite configuration to support direct project URLs.

---

## 📈 Project Activity

Planora provides project-level information and activity tracking to help users understand changes and work happening within their projects.

This gives project members better visibility into ongoing work.

---

## 🔔 User Feedback

The application provides feedback notifications for important actions such as:

- Successful operations
- Errors
- Project updates
- Task operations
- Sharing actions
- Authentication events
- AI operations

---

# 🛠️ Tech Stack

## Frontend

- React
- Vite
- JavaScript
- React Router
- Context API
- CSS
- Firebase Client SDK
- Socket.IO Client

## Backend

- Node.js
- Express.js
- JavaScript / ES Modules
- REST APIs
- Socket.IO
- Multer
- Node-Cron
- Nodemailer

## Database

- MongoDB
- Mongoose
- MongoDB Atlas

## Authentication

- Firebase Authentication
- Firebase Admin SDK

## Artificial Intelligence

- Google Gemini API
- `@google/genai`

## File Uploads

- Multer

## Deployment

- GitHub
- Render
- MongoDB Atlas
- Firebase

---

# 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │       Planora        │
                         │      Web Client      │
                         └──────────┬───────────┘
                                    │
                              React / Vite
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
             REST API Requests                Socket.IO
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Node + Express    │
                         │       Backend        │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
                    ▼               ▼                ▼
              MongoDB Atlas   Firebase Admin    Gemini API
                    │               │                │
                    ▼               ▼                ▼
                 Database       Auth / Tokens     AI Features
