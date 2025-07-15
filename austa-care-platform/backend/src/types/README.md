# Type System Documentation

## Overview

This directory contains all TypeScript type definitions for the AUSTA Care Platform backend. The type system is designed with:

1. **Type Safety**: Using branded types for IDs and domain values
2. **Consistency**: Standardized request/response types
3. **Maintainability**: Clear separation of concerns
4. **Developer Experience**: Comprehensive type guards and utilities

## Directory Structure

```
types/
├── core/                    # Core type utilities
│   ├── branded.types.ts    # Branded types for type safety
│   ├── express.types.ts    # Express request/response types
│   ├── api-response.types.ts # Standardized API responses
│   └── index.ts            # Core types export
├── user.types.ts           # User domain types
├── risk.types.ts           # Risk assessment types
├── questionnaire.types.ts  # Questionnaire types
├── workflow.types.ts       # Workflow types
├── whatsapp.types.ts      # WhatsApp integration types
├── tasy-integration.types.ts # TASY integration types
└── index.ts               # Main export file
```

## Usage Examples

### Branded Types

```typescript
import { UserId, toUserId } from '@/types';

// Create a branded UserId
const userId: UserId = toUserId('user123');

// Type guard
if (isUserId(value)) {
  // value is UserId
}
```

### Request Handlers

```typescript
import { AuthenticatedRequestHandler } from '@/types';

export const getUser: AuthenticatedRequestHandler<
  { id: string },    // Params
  UserResponse,      // Response body
  never,            // Request body
  { details?: boolean } // Query
> = async (req, res) => {
  const userId = toUserId(req.params.id);
  const user = await userService.findById(userId);
  
  res.json(APIResponse.success(user));
};
```

### API Responses

```typescript
import { APIResponse, ErrorCode } from '@/types';

// Success response
return res.json(APIResponse.success(data, {
  pagination: { page: 1, limit: 10, total: 100 }
}));

// Error response
return res.status(404).json(
  APIResponse.error(ErrorCode.NOT_FOUND, 'User not found')
);
```

## Type Conventions

1. **Interface Naming**: Use PascalCase and descriptive names
2. **Type Aliases**: Use for union types and branded types
3. **Enums**: Use for fixed sets of values
4. **Generics**: Use meaningful type parameter names (T, TData, TError)

## Best Practices

1. **Always use branded types for IDs**
2. **Prefer interfaces over type aliases for objects**
3. **Use strict null checks**
4. **Document complex types with JSDoc**
5. **Export type guards alongside types**

## Common Patterns

### Service Response Pattern

```typescript
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}
```

### Repository Pattern Types

```typescript
interface Repository<T, TId = string> {
  findById(id: TId): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: TId, data: Partial<T>): Promise<T>;
  delete(id: TId): Promise<boolean>;
}
```

### Event Types

```typescript
interface DomainEvent<T = any> {
  type: string;
  timestamp: Date;
  payload: T;
  metadata?: EventMetadata;
}
```