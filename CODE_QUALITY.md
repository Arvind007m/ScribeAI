# Code Quality Guide for ScribeAI

This document outlines the code quality tools and practices used in the ScribeAI project.

## 🛠️ Tools Overview

### 1. **ESLint** - Code Linting

Catches bugs, enforces coding standards, and identifies problematic patterns.

### 2. **Prettier** - Code Formatting

Automatically formats code for consistency across the codebase.

### 3. **Zod** - Runtime Type Validation

Validates API request/response payloads at runtime for type safety.

### 4. **TypeScript** - Static Type Checking

Provides compile-time type safety and better IDE support.

---

## 📋 Available Scripts

### Linting

```bash
# Run ESLint to check for errors
npm run lint

# Auto-fix ESLint errors where possible
npm run lint:fix
```

### Formatting

```bash
# Format all files with Prettier
npm run format

# Check if files are formatted correctly (CI/CD)
npm run format:check
```

### Type Checking

```bash
# Run TypeScript compiler to check types
npm run typecheck
```

### All-in-One Quality Check

```bash
# Format, lint, and type-check in one command
npm run quality
```

---

## 🔧 Configuration Files

### `.eslintrc.json`

ESLint configuration with:

- Next.js recommended rules
- TypeScript support
- Prettier integration
- Custom rules for the project

### `.prettierrc`

Prettier configuration:

- Single quotes
- 2-space indentation
- 100 character line width
- Semicolons enabled
- Trailing commas (ES5)

### `.prettierignore`

Files/folders to exclude from formatting:

- `node_modules/`
- `.next/`
- `build/`
- `dist/`
- Generated files

---

## 📝 Zod Validation

### Location

All validation schemas are defined in `src/lib/validations.ts`

### Available Schemas

#### Authentication

- `signUpSchema` - User registration
- `signInSchema` - User login

#### Sessions

- `createSessionSchema` - Create recording session
- `updateSessionSchema` - Update session details
- `sessionIdSchema` - Validate session ID

#### AI

- `generateSummarySchema` - AI summary generation

#### WebSocket Events

- `startSessionEventSchema` - Start recording
- `audioChunkEventSchema` - Audio chunk data
- `sessionControlEventSchema` - Pause/resume/stop

### Usage Example

```typescript
import { z } from 'zod';
import { createSessionSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate with Zod
  const validationResult = createSessionSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validationResult.error.errors,
      },
      { status: 400 }
    );
  }

  // Use validated data
  const { userId, title, audioSource } = validationResult.data;
  // ... rest of the logic
}
```

### Helper Functions

```typescript
import { validateData, validateOrThrow } from '@/lib/validations';

// Safe validation (returns result object)
const result = validateData(schema, data);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.errors);
}

// Throws on validation error
try {
  const validData = validateOrThrow(schema, data);
  // Use validData
} catch (error) {
  console.error(error.message);
}
```

---

## 🎯 Best Practices

### 1. **Always Validate API Inputs**

```typescript
// ✅ Good
const validationResult = schema.safeParse(body);
if (!validationResult.success) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}

// ❌ Bad
const { userId } = body; // No validation
```

### 2. **Use Type Inference**

```typescript
// ✅ Good - Infer types from Zod schemas
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

// ❌ Bad - Duplicate type definitions
interface CreateSessionInput {
  userId: string;
  title: string;
  // ...
}
```

### 3. **Format Before Committing**

```bash
# Always run before committing
npm run quality
```

### 4. **Handle Validation Errors Gracefully**

```typescript
// ✅ Good - Provide helpful error messages
return NextResponse.json(
  {
    error: 'Validation failed',
    details: validationResult.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  },
  { status: 400 }
);

// ❌ Bad - Generic error
return NextResponse.json({ error: 'Bad request' }, { status: 400 });
```

### 5. **Use JSDoc Comments**

```typescript
/**
 * Process audio chunk and generate transcription using Gemini
 * @param {Buffer} audioData - Raw audio buffer (WebM format)
 * @param {string} sessionId - Recording session ID
 * @param {number} chunkIndex - Sequential chunk number
 * @returns {Promise<Object|null>} Transcript segment with speaker identification
 */
async function processAudioChunk(audioData, sessionId, chunkIndex) {
  // ...
}
```

---

## 🚀 Pre-Commit Checklist

Before committing code, ensure:

- [ ] Code is formatted: `npm run format`
- [ ] No linting errors: `npm run lint:fix`
- [ ] Types are correct: `npm run typecheck`
- [ ] All API routes have Zod validation
- [ ] Functions have JSDoc comments
- [ ] No `console.log` in production code (use proper logging)
- [ ] Tests pass (if applicable)

**Quick command:**

```bash
npm run quality && git add . && git commit -m "Your message"
```

---

## 📊 Code Quality Metrics

### Current Status

- ✅ ESLint configured
- ✅ Prettier configured
- ✅ Zod validation implemented
- ✅ TypeScript strict mode
- ✅ JSDoc comments on key functions

### Goals

- Maintain 0 ESLint errors
- 100% Prettier compliance
- All API routes validated with Zod
- 80%+ JSDoc coverage on public functions

---

## 🔍 Troubleshooting

### ESLint Errors

**Issue:** `'React' must be in scope when using JSX`
**Solution:** This is handled by Next.js 13+, add to `.eslintrc.json`:

```json
"rules": {
  "react/react-in-jsx-scope": "off"
}
```

### Prettier Conflicts

**Issue:** ESLint and Prettier rules conflict
**Solution:** Use `eslint-config-prettier` (already configured)

### Zod Validation Fails

**Issue:** Validation fails for valid data
**Solution:** Check schema definition, use `.safeParse()` for debugging:

```typescript
const result = schema.safeParse(data);
console.log(result); // See detailed error messages
```

---

## 📚 Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Next.js ESLint](https://nextjs.org/docs/app/building-your-application/configuring/eslint)

---

**Last Updated:** $(date)
**Maintained by:** ScribeAI Team
