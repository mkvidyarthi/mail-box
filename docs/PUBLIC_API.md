# Public API Documentation

This document describes the public API endpoints for accessing mailboxes and emails without authentication (or with optional Basic Auth).

## Base URL

```
https://your-domain.com/api/public
```

## Authentication

The public API supports optional Basic Authentication:

- **Optional**: If `BASIC_AUTH_PUBLIC_REQUIRED=false` (default), endpoints can be accessed without authentication
- **Required**: If `BASIC_AUTH_PUBLIC_REQUIRED=true`, Basic Auth credentials are required
- **Credentials**: Set via environment variables `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD`

### Basic Auth Format

```
Authorization: Basic base64(username:password)
```

## Rate Limiting

All public API endpoints are rate-limited to prevent abuse:

- **Inbox Access**: 50 requests per hour (configurable via `INBOX_ACCESS_RATE_LIMIT`)
- **Mailbox Creation**: 10 requests per hour (configurable via `INBOX_CREATION_RATE_LIMIT`)
- **API Access**: 100 requests per hour (configurable via `API_RATE_LIMIT`)

Rate limit headers are included in responses:

```
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1634567890
```

When rate limit is exceeded, returns HTTP 429 with error message.

## Endpoints

### 1. Get Inbox

Get all emails for a specific mailbox address.

**Endpoint**: `GET /api/public/inbox/{address}`

**Parameters**:
- `address` (path): Email address (e.g., `test@domain.com`)

**Response**:
```json
{
  "success": true,
  "data": {
    "mailbox": {
      "address": "test@domain.com",
      "displayName": null,
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "accessedAt": "2024-01-15T14:20:00Z"
    },
    "emails": [
      {
        "id": "clx123abc",
        "mailboxAddressId": "clx456def",
        "messageId": "<message-id@sender.com>",
        "fromAddress": "sender@example.com",
        "fromName": "John Doe",
        "subject": "Test Email",
        "bodyText": "Email content...",
        "bodyHtml": null,
        "receivedAt": "2024-01-15T12:00:00Z",
        "mailboxAddress": {
          "address": "test@domain.com",
          "displayName": null
        }
      }
    ],
    "total": 1,
    "rateLimit": {
      "remaining": 49,
      "resetTime": 1634567890
    }
  }
}
```

**Error Responses**:
- `401`: Authentication required (if Basic Auth is enabled)
- `404`: Mailbox not found
- `429`: Rate limit exceeded
- `500`: Server error

---

### 2. Get Specific Email

Get a specific email from a mailbox.

**Endpoint**: `GET /api/public/inbox/{address}/{emailId}`

**Parameters**:
- `address` (path): Email address
- `emailId` (path): Email ID

**Response**:
```json
{
  "success": true,
  "data": {
    "email": {
      "id": "clx123abc",
      "mailboxAddressId": "clx456def",
      "messageId": "<message-id@sender.com>",
      "fromAddress": "sender@example.com",
      "fromName": "John Doe",
      "subject": "Test Email",
      "bodyText": "Email content...",
      "bodyHtml": "<p>HTML content...</p>",
      "attachments": [],
      "receivedAt": "2024-01-15T12:00:00Z",
      "mailboxAddress": {
        "address": "test@domain.com",
        "displayName": null
      }
    },
    "rateLimit": {
      "remaining": 48,
      "resetTime": 1634567890
    }
  }
}
```

**Error Responses**:
- `401`: Authentication required
- `404`: Email or mailbox not found
- `429`: Rate limit exceeded
- `500`: Server error

---

### 3. Create Mailbox

Create a new public mailbox (auto-creates if doesn't exist).

**Endpoint**: `POST /api/public/mailbox/{address}`

**Parameters**:
- `address` (path): Email address to create

**Response**:
```json
{
  "success": true,
  "data": {
    "mailbox": {
      "address": "new@domain.com",
      "displayName": null,
      "isActive": true,
      "createdAt": "2024-01-15T15:00:00Z"
    },
    "rateLimit": {
      "remaining": 9,
      "resetTime": 1634567890
    }
  }
}
```

**Error Responses**:
- `400`: Invalid address or reserved address
- `401`: Authentication required
- `409`: Mailbox already exists
- `429`: Rate limit exceeded
- `500`: Server error

**Reserved Addresses**: The following local parts cannot be used:
- `admin`, `administrator`, `root`, `support`, `security`, `abuse`, `postmaster`, `webmaster`, `system`, `api`, `mail`, `smtp`, `info`, `contact`, `help`, `sales`, `billing`, `noreply`, `no-reply`, `notifications`, `alerts`, `status`, `dev`, `development`, `staging`, `production`, `test`, `testing`

---

### 4. Get Mailbox Info

Get information about a specific mailbox.

**Endpoint**: `GET /api/public/mailbox/{address}`

**Parameters**:
- `address` (path): Email address

**Response**:
```json
{
  "success": true,
  "data": {
    "mailbox": {
      "address": "test@domain.com",
      "displayName": "Test Inbox",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "accessedAt": "2024-01-15T14:20:00Z"
    },
    "rateLimit": {
      "remaining": 47,
      "resetTime": 1634567890
    }
  }
}
```

**Error Responses**:
- `401`: Authentication required
- `404`: Mailbox not found
- `429`: Rate limit exceeded
- `500`: Server error

---

## Web Interface

Public mailboxes can also be accessed via the web interface:

**URL Format**: `https://your-domain.com/inbox/{address}`

Example: `https://your-domain.com/inbox/test@domain.com`

The web interface:
- Auto-creates mailboxes if they don't exist
- Displays emails in stacked (non-threaded) format
- Supports optional Basic Auth
- Includes rate limiting
- Shows email count and refresh functionality

---

## Email Size Limits

The API enforces the following limits on incoming emails:

- **Maximum Email Size**: 10MB (configurable via `MAX_EMAIL_SIZE_MB`)
- **Maximum Attachment Size**: 4MB per attachment (configurable via `MAX_ATTACHMENT_SIZE_MB`)
- **Maximum Attachments**: 5 per email (configurable via `MAX_ATTACHMENTS`)

Emails exceeding these limits will be rejected with appropriate error messages.

---

## Security Considerations

1. **HTTPS**: Always use HTTPS in production to protect Basic Auth credentials
2. **Rate Limiting**: Implemented to prevent abuse
3. **Reserved Addresses**: System addresses are protected from creation
4. **IP Tracking**: Creator IP addresses are logged for abuse prevention
5. **Cleanup**: Inactive mailboxes are automatically cleaned up after 48 hours (configurable)

---

## Examples

### cURL Examples

**Get inbox without auth**:
```bash
curl https://your-domain.com/api/public/inbox/test@domain.com
```

**Get inbox with Basic Auth**:
```bash
curl -u username:password https://your-domain.com/api/public/inbox/test@domain.com
```

**Create mailbox**:
```bash
curl -X POST https://your-domain.com/api/public/mailbox/new@domain.com
```

**Get specific email**:
```bash
curl https://your-domain.com/api/public/inbox/test@domain.com/clx123abc
```

### JavaScript Examples

**Fetch inbox**:
```javascript
const response = await fetch('https://your-domain.com/api/public/inbox/test@domain.com');
const data = await response.json();
console.log(data.data.emails);
```

**Fetch with Basic Auth**:
```javascript
const response = await fetch('https://your-domain.com/api/public/inbox/test@domain.com', {
  headers: {
    'Authorization': 'Basic ' + btoa('username:password')
  }
});
const data = await response.json();
console.log(data.data.emails);
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common error codes:
- `400`: Bad Request (invalid parameters, reserved address, etc.)
- `401`: Unauthorized (authentication required or invalid)
- `404`: Not Found (mailbox or email doesn't exist)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error (server-side error)

---

## Configuration

All API behavior can be configured via environment variables:

```env
# Basic Auth
BASIC_AUTH_USERNAME=your_user
BASIC_AUTH_PASSWORD=your_password
BASIC_AUTH_PUBLIC_REQUIRED=false

# Rate Limiting
INBOX_ACCESS_RATE_LIMIT=50
INBOX_CREATION_RATE_LIMIT=10
API_RATE_LIMIT=100
RATE_LIMIT_WINDOW_HOURS=1

# Email Limits
MAX_EMAIL_SIZE_MB=10
MAX_ATTACHMENT_SIZE_MB=4
MAX_ATTACHMENTS=5

# Cleanup
MAILBOX_CLEANUP_HOURS=48
```

---

## Support

For issues or questions about the public API, please refer to the main project documentation or contact support.
