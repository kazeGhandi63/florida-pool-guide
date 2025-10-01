# AI Development Rules

This document provides guidelines for the AI editor (Dyad) to follow when developing this application. The goal is to maintain consistency, readability, and best practices throughout the codebase.

## Tech Stack

This project is built with a modern, type-safe, and efficient stack:

-   **Framework**: React with Vite for a fast development experience.
-   **Language**: TypeScript for static typing and improved code quality.
-   **Styling**: Tailwind CSS for a utility-first styling approach.
-   **UI Components**: shadcn/ui, a collection of beautifully designed, accessible, and customizable components.
-   **Routing**: React Router (`react-router-dom`) for client-side navigation.
-   **Backend & Database**: Supabase for authentication, database, and other backend services.
-   **Data Fetching**: TanStack Query (React Query) for managing server state, caching, and data synchronization.
-   **Forms**: React Hook Form for performant and flexible form state management, paired with Zod for schema validation.
-   **Icons**: Lucide React for a comprehensive and consistent set of icons.

## Library Usage Guidelines

To ensure consistency, please adhere to the following rules when using libraries:

### Styling & UI

-   **Styling**: **ALWAYS** use Tailwind CSS utility classes for styling. Avoid writing custom CSS in `.css` files unless it's for a highly specific use case that Tailwind cannot handle.
-   **UI Components**: **ALWAYS** prioritize using components from the `src/components/ui` directory (shadcn/ui). If a required component is not available, create a new, reusable component in `src/components/` following the existing architectural style.
-   **Layout**: Use Flexbox and Grid utilities from Tailwind CSS for all layout needs. Ensure all layouts are responsive.

### Routing

-   **Navigation**: Use `react-router-dom` for all routing.
-   **Route Definitions**: All top-level routes **MUST** be defined in `src/App.tsx`.
-   **Linking**: Use the `<Link>` component from `react-router-dom` for internal navigation and the `useNavigate` hook for programmatic navigation.

### State Management

-   **Server State**: **ALWAYS** use TanStack Query (`@tanstack/react-query`) for fetching, caching, and managing data from Supabase. Use hooks like `useQuery` and `useMutation`.
-   **Client State**: For simple, local component state, use React's built-in hooks (`useState`, `useReducer`). Avoid introducing a global state management library (like Redux or Zustand) unless the application's complexity absolutely requires it.

### Backend (Supabase)

-   **Client**: **ALWAYS** use the pre-configured Supabase client from `src/integrations/supabase/client.ts` for all interactions with the database and authentication services.
-   **Types**: Utilize the generated Supabase types from `src/integrations/supabase/types.ts` to ensure type safety when querying data.

### Forms

-   **Form Handling**: **ALWAYS** use `react-hook-form` to manage form state, validation, and submissions.
-   **Validation**: **ALWAYS** use `zod` to define validation schemas for forms, and connect them using `@hookform/resolvers/zod`.

### Icons

-   **Icons**: **ALWAYS** use icons from the `lucide-react` library to maintain visual consistency.

### Notifications

-   **Toasts**: Use the `useToast` hook from `src/hooks/use-toast.ts` for displaying simple, non-blocking notifications to the user. For more complex notifications, `sonner` is also available.