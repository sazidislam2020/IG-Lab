# Testing Checklist — Ignite Lab v1

## Auth Flow
- [ ] Sign up with new email → shows "Account Pending" screen
- [ ] Pending user logs in → sees waiting screen with progress steps
- [ ] Super admin approves user → user can log in
- [ ] Rejected user sees rejection message with contact info
- [ ] Dashboard shows correct role & status badge
- [ ] Sign out works correctly

## Admin Features
- [ ] Approval panel loads user list (`/admin/approvals`)
- [ ] Filter tabs work (Pending / Approved / Rejected / All)
- [ ] Approve button changes user status to approved
- [ ] Reject button changes user status to rejected
- [ ] Revoke / Re-approve buttons work
- [ ] Role dropdown changes user role
- [ ] Audit log records all admin actions (`/admin/audit-log`)
- [ ] Admin can manage courses, levels, tasks (`/admin/courses`)

## Learning System
- [ ] Course listing page shows course cards (`/courses`)
- [ ] Click course → shows levels (`/courses/:id`)
- [ ] Click level → shows tasks (`/levels/:id`)
- [ ] Task page loads with prompt + code editor (`/tasks/:id`)
- [ ] JavaScript tasks run locally and check expected output
- [ ] Python/Java/C/C++ tasks execute via Judge0 CE
- [ ] Submit button awards points on pass
- [ ] Completed tasks show ✅ checkmark
- [ ] Submission history shows in profile

## Code Sandbox
- [ ] Monaco Editor loads with syntax highlighting (`/sandbox`)
- [ ] Language selector switches between languages
- [ ] Starter code loads for each language
- [ ] JavaScript runs locally (console.log output)
- [ ] Python executes via Judge0 CE
- [ ] Java executes via Judge0 CE
- [ ] C executes via Judge0 CE
- [ ] C++ executes via Judge0 CE
- [ ] HTML/CSS show preview message
- [ ] Output panel shows results with timing

## 3D Simulation
- [ ] 3D robot arm renders in viewport (`/simulation`)
- [ ] Mouse drag orbits the camera
- [ ] Joint sliders move the arm in real-time
- [ ] Gripper open/close buttons work
- [ ] Reset All returns arm to home position
- [ ] Demo scripts run (Wave, Pick & Place, Draw Square)
- [ ] Code tab allows custom script editing
- [ ] Output tab shows script logs

## Dashboard & Navigation
- [ ] Dashboard shows role-appropriate cards
- [ ] Student cards: Profile, Courses, Leaderboard, Sandbox, Simulation
- [ ] Teacher/Admin cards: Students, Courses & Tasks
- [ ] Super Admin cards: User Approvals, Audit Log
- [ ] All links navigate to correct pages
- [ ] Nav bar shows role badge and user name

## Leaderboard
- [ ] Top 3 podium displays with medals (`/leaderboard`)
- [ ] Full ranked list below podium
- [ ] Current user highlighted with "(you)" label

## Teacher Dashboard
- [ ] Stats cards show correct numbers (`/teacher`)
- [ ] Students table lists all students
- [ ] Recent submissions table shows latest activity

## Student Profile
- [ ] Stats cards show points, tasks, submissions (`/profile`)
- [ ] Course progress bars show correct percentages
- [ ] Submission history table shows all attempts

## Responsive
- [ ] Landing page looks good on mobile
- [ ] Dashboard cards stack on mobile
- [ ] Sandbox works on tablet/desktop (not mobile — expected)

## Landing Page
- [ ] Hero section with tech badges
- [ ] Features grid (6 cards)
- [ ] Pricing tiers (Free, Builder, Engineer, Institution)
- [ ] CTA section links to signup
- [ ] Footer with DRILL branding
- [ ] Sticky nav with blur backdrop
