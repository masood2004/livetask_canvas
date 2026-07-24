# Short Loom Script — Session 2 Task 2

> This is LiveTask Canvas, my Session 2 Task 2 application. It is a focused task-management product built with Next.js and Supabase.
>
> A user can create an account, confirm the email where required, sign in and access a protected dashboard. The dashboard verifies the authenticated user on the server before loading any task data.
>
> The application supports complete CRUD. I can create a task, read the task list, update the task details or status, and delete the task. I also added priority, due date, searching and status filtering to make the small product useful without making its scope too large.
>
> Every task contains a user ID. Supabase Row-Level Security compares that value with the authenticated user's ID for select, insert, update and delete operations. Therefore, one user cannot access another user's tasks even when calling the database API directly.
>
> This task intentionally does not include real-time subscriptions yet. The authenticated CRUD foundation is Task 2. In Task 3, I will subscribe to changes in the tasks table so separate browser sessions and future platforms update without refreshing.
