# Overview

This is a React-based web application that helps users generate professional templates for appealing Poshmark account suspensions or responding to warnings. The application uses AI (OpenAI GPT) to generate customized letters based on user input and includes usage tracking with daily limits to manage API costs. It features a modern UI built with shadcn/ui components and Tailwind CSS, with a full-stack architecture using Express.js for the backend and PostgreSQL for data persistence.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Components**: shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom CSS variables for theming and design tokens
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Form Handling**: React Hook Form with Zod schema validation for type-safe form management
- **Routing**: Wouter for lightweight client-side routing
- **Build System**: Vite with custom aliases for clean imports and development features

## Backend Architecture
- **Runtime**: Node.js with Express.js framework using TypeScript
- **API Design**: RESTful endpoints with JSON request/response format
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Validation**: Zod schemas shared between frontend and backend for consistent validation
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Development**: Hot reload with custom logging middleware for API request tracking

## Data Storage
- **Primary Database**: PostgreSQL with connection via @neondatabase/serverless
- **Schema Management**: Drizzle migrations with schema defined in shared directory
- **Fallback Storage**: In-memory storage implementation for development or when database is unavailable
- **Data Models**: Users table for potential authentication and usage_tracking table for API rate limiting

## Usage Tracking System
- **Rate Limiting**: IP-based daily usage limits (20 requests per day per IP)
- **Reset Logic**: Daily reset of usage counters with date-based tracking
- **Storage**: Persistent tracking in PostgreSQL with automatic cleanup and reset functionality

## External Dependencies

### AI Service Integration
- **OpenAI API**: GPT-4 integration for generating professional letter templates
- **API Key Management**: Environment variable-based configuration with fallback handling
- **Content Generation**: Customized prompts for different scenarios (suspension appeals vs warning responses)

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Connection Management**: Environment-based database URL configuration with error handling

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Cartographer**: Development-only plugin for enhanced debugging and visualization
- **Runtime Error Overlay**: Development error handling with modal overlays

### UI and Styling Dependencies
- **Radix UI**: Comprehensive primitive components for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **Lucide React**: Icon library for consistent iconography
- **Date-fns**: Date manipulation utilities for usage tracking

### Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation for runtime type safety
- **Hookform Resolvers**: Integration layer between React Hook Form and Zod