# Avatar Upload API Runbook

## Endpoint

**POST** `/api/user/avatar`

## Authentication

Requires authentication token in Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

## Request Payload

### Multipart Form Data

```
Content-Type: multipart/form-data

{
  "avatar": File (binary)
}
```

### File Requirements
- **Types**: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- **Max Size**: 5MB (5,242,880 bytes)
- **Dimensions**: Any (will be cropped to 1:1 square server-side)
- **EXIF**: Should be stripped client-side before upload

## Response

### Success (200 OK)

```json
{
  "success": true,
  "avatarUrl": "https://storage.googleapis.com/.../avatar.jpg",
  "message": "Avatar uploaded successfully"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid file type. Only JPG, PNG, and WebP are allowed."
}
```

```json
{
  "success": false,
  "error": "File size exceeds 5MB limit."
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 413 Payload Too Large
```json
{
  "success": false,
  "error": "File size exceeds 5MB limit."
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to process avatar upload"
}
```

## Implementation Notes

### Current Implementation (Firebase Storage)

The current implementation uses Firebase Storage directly:

1. **Upload Path**: `avatars/{userId}/{timestamp}.jpg`
2. **Processing**: Client-side EXIF stripping and 1:1 cropping
3. **Storage**: Firebase Storage with public read access
4. **CDN**: Firebase Storage CDN URLs

### Service Function

```typescript
// src/app/services/avatarService.ts
export const uploadAvatar = async (userId: string, file: File): Promise<string>
```

**Returns**: Download URL string

**Throws**: Error with message on failure

### Alternative API Implementation

If migrating to a backend API, the endpoint should:

1. Validate authentication token
2. Validate file type and size
3. Process image (crop to 1:1, strip EXIF, optimize)
4. Store in cloud storage (S3, GCS, etc.)
5. Return public URL
6. Update user profile in database

### Example cURL Request

```bash
curl -X POST https://api.example.com/api/user/avatar \
  -H "Authorization: Bearer <token>" \
  -F "avatar=@/path/to/image.jpg"
```

### Example Fetch Request

```javascript
const formData = new FormData();
formData.append('avatar', file);

const response = await fetch('/api/user/avatar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
```

## Database Update

After successful upload, update user profile:

**Firestore Path**: `/users/{userId}`

**Update Field**: `avatarUrl` (string)

## Cleanup

Old avatar files should be deleted from storage when:
- User uploads a new avatar
- User removes avatar (reverts to default)

**Note**: Default avatars (dicebear.com URLs) should not be deleted.

