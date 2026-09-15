# Disposable Mailbox Testing Guide

This guide provides step-by-step instructions for testing the disposable mailbox functionality locally and setting up Cloudflare Email Routing for production use.

## Local Testing Results

### ✅ Test Results Summary

The disposable mailbox functionality has been successfully tested locally with the following results:

1. **Mailbox Creation**: ✅ Successfully created disposable mailboxes via API
2. **OTP Email Reception**: ✅ Successfully received and displayed OTP emails  
3. **Text Content**: ✅ Successfully handled plain text email content
4. **HTML Content**: ✅ Successfully handled HTML email content
5. **Attachments**: ✅ Successfully processed email attachments
6. **Rate Limiting**: ✅ Rate limiting working correctly (50 requests/hour default)
7. **Public Access**: ✅ Public API endpoints accessible without authentication (when configured)

### Tested API Endpoints

#### 1. Create Disposable Mailbox
```bash
curl -X POST http://localhost:3000/api/public/mailbox/test-disposable@localhost.com
```

**Response**: 
```json
{
  "success": true,
  "data": {
    "mailbox": {
      "address": "test-disposable@localhost.com",
      "displayName": null,
      "isActive": true,
      "createdAt": "2026-09-14T05:04:56.516Z"
    },
    "rateLimit": {
      "remaining": 49,
      "resetTime": 1789365896507
    }
  }
}
```

#### 2. Simulate Incoming Email (with Webhook Secret)
```bash
curl -X POST http://localhost:3000/api/emails \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "messageId": "test-message-123",
    "from": {
      "address": "sender@example.com",
      "name": "Test Sender"
    },
    "to": [{"address": "test-otp@localhost.com"}],
    "subject": "Your OTP code is 123456",
    "text": "Your verification code is 123456. This code expires in 10 minutes.",
    "html": "<p>Your verification code is <strong>123456</strong>. This code expires in 10 minutes.</p>"
  }'
```

#### 3. Retrieve Inbox Contents
```bash
curl http://localhost:3000/api/public/inbox/test-otp@localhost.com
```

**Response**: Returns all emails for the disposable mailbox including OTP codes, text content, HTML content, and attachments.

## Configuration for Local Testing

### Environment Variables Required

To enable public access without authentication for local testing, ensure your `.env` file contains:

```env
# Disable Basic Auth for public endpoints (for local testing)
BASIC_AUTH_PUBLIC_REQUIRED=false

# Webhook secret for email ingestion
WEBHOOK_SECRET=your_webhook_secret_here

# Rate limiting configuration
INBOX_ACCESS_RATE_LIMIT=50
INBOX_CREATION_RATE_LIMIT=10
API_RATE_LIMIT=100
RATE_LIMIT_WINDOW_HOURS=1
```

### Starting the Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Cloudflare Email Routing Setup for Production

To receive real emails from external senders, you need to set up Cloudflare Email Routing. Here are the detailed steps:

### Step 1: Cloudflare API Token Setup

1. **Log in to Cloudflare Dashboard**
   - Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
   - Navigate to your profile (top right corner → "My Profile")

2. **Create API Token**
   - Click on **API Tokens** tab
   - Click **Create Token** → **Create Custom Token**

3. **Configure Token Permissions**
   
   Add the following permissions:

   | Resource | Permission |
   |----------|-----------|
   | Zone — Zone Settings | Edit |
   | Zone — Email Routing | Edit |
   | Zone — DNS | Edit |
   | Account — Workers Scripts | Edit |

4. **Set Zone Resources**
   - Under **Zone Resources**, select **Include → Specific zone**
   - Choose your domain from the dropdown
   - This restricts the token to only work with your specific domain

5. **Create and Copy Token**
   - Click **Continue to summary**
   - Review the permissions
   - Click **Create Token**
   - **Important**: Copy the token immediately - it's only shown once!

### Step 2: Configure Your Domain

1. **Enable Email Routing in Cloudflare**
   - Go to your domain in Cloudflare Dashboard
   - Navigate to **Email** → **Email Routing**
   - Click **Enable Email Routing**
   - Follow the setup wizard to configure MX records

2. **Verify DNS Configuration**
   - Ensure your domain's MX records are properly configured
   - Cloudflare will automatically set up the required MX records

### Step 3: Link Domain in Mailbox Application

1. **Deploy Your Application**
   - Your Mailbox application must be deployed to a public HTTPS URL
   - Cannot use localhost for production email routing
   - Example: `https://mail.yourdomain.com`

2. **Access Cloudflare Integration Settings**
   - Log in to your Mailbox dashboard as Admin or Owner
   - Navigate to **Settings** → **Cloudflare Integration**

3. **Configure Integration**
   - **API Token**: Paste the Cloudflare API token from Step 1
   - **Zone/Domain**: Select your domain (e.g., `yourdomain.com`)
   - **Webhook URL**: Enter your public application URL (e.g., `https://mail.yourdomain.com`)

4. **Link Domain**
   - Click **Link Domain**
   - Mailbox will automatically:
     - Deploy a Cloudflare Worker script
     - Create catch-all email routing rules
     - Configure the webhook to forward emails to your application

### Step 4: Configure Webhook Secret

1. **Generate Webhook Secret**
   ```bash
   openssl rand -hex 32
   ```

2. **Set Environment Variable**
   - Add the generated secret to your `.env` file:
   ```env
   WEBHOOK_SECRET=your_generated_secret_here
   ```

3. **Configure Cloudflare Worker**
   - The Mailbox application will automatically configure the Cloudflare Worker
   - The Worker will use this secret to authenticate webhook requests

### Step 5: Test Email Reception

1. **Create a Disposable Mailbox**
   ```bash
   curl -X POST https://your-domain.com/api/public/mailbox/test@yourdomain.com
   ```

2. **Send a Test Email**
   - Send an email from any external email service to `test@yourdomain.com`
   - The email will be routed through Cloudflare to your application

3. **Check the Inbox**
   ```bash
   curl https://your-domain.com/api/public/inbox/test@yourdomain.com
   ```

4. **Verify Web Interface**
   - Access `https://your-domain.com/inbox/test@yourdomain.com`
   - You should see the received email in the web interface

## Security Considerations

### API Token Security
- **Important**: The Cloudflare API Token is used only once during domain linking
- After linking, you can revoke the token from Cloudflare dashboard
- The token is never stored in the database or logs

### Webhook Secret
- Keep your `WEBHOOK_SECRET` secure and never commit it to version control
- Use a strong, randomly generated secret (32+ characters)
- Rotate the secret periodically for enhanced security

### Rate Limiting
- Configure appropriate rate limits for your use case
- Monitor rate limit headers in API responses
- Adjust limits based on your traffic patterns

### Basic Authentication
- For production, consider enabling Basic Auth for public endpoints
- Set `BASIC_AUTH_PUBLIC_REQUIRED=true` in your `.env` file
- Configure strong username and password

## Troubleshooting

### Emails Not Arriving
1. Check Cloudflare Email Routing is enabled for your domain
2. Verify MX records are properly configured
3. Check that your webhook URL is publicly accessible
4. Review Cloudflare Worker logs for errors

### Authentication Errors
1. Verify `WEBHOOK_SECRET` matches between application and Cloudflare Worker
2. Check that Basic Auth credentials are correct (if enabled)
3. Ensure API token has the required permissions

### Rate Limiting Issues
1. Check rate limit headers in API responses
2. Adjust rate limits in `.env` file if needed
3. Implement backoff logic in your client applications

### Worker Deployment Failures
1. Verify API token has `Workers Scripts: Edit` permission
2. Check that the zone ID is correct
3. Review Cloudflare Account permissions

## Email Format Requirements

### Inbound Email Payload Structure

When sending test emails via the webhook API, use this structure:

```json
{
  "messageId": "unique-message-id",
  "from": {
    "address": "sender@example.com",
    "name": "Sender Name"
  },
  "to": [
    {
      "address": "recipient@yourdomain.com"
    }
  ],
  "subject": "Email Subject",
  "text": "Plain text content",
  "html": "<p>HTML content</p>",
  "inReplyTo": "optional-message-id",
  "references": "optional-message-ids",
  "attachments": [
    {
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "size": 1024,
      "content": "base64-encoded-content"
    }
  ],
  "deliveryHash": "optional-sha256-hash"
}
```

### Attachment Limits

Default limits (configurable in `.env`):
- Maximum email size: 10MB
- Maximum attachment size: 4MB per attachment
- Maximum attachments: 5 per email

## Next Steps

1. **Deploy to Production**: Deploy your Mailbox application to a public URL
2. **Configure Cloudflare**: Follow the steps above to set up Email Routing
3. **Test Real Emails**: Send actual emails from external services
4. **Monitor Performance**: Set up monitoring for email delivery and processing
5. **Configure Rate Limits**: Adjust rate limits based on your usage patterns

## Support

For issues or questions:
- Check the main project documentation
- Review Cloudflare Email Routing documentation
- Check the application logs for detailed error messages
- Verify all environment variables are correctly configured