# AWS S3 Setup for Student Photos

This document provides step-by-step instructions for setting up an AWS S3 bucket to store student photos with public read access.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- AWS Amplify already set up for the project

## Step 1: Create S3 Bucket

1. Open AWS Console and navigate to S3 service
2. Click "Create bucket"
3. Enter bucket name (e.g., `schoollink-student-photos-[your-unique-id]`)
4. Choose your preferred region
5. **Uncheck "Block all public access"** (we need public read access for photos)
6. Acknowledge the warning about public access
7. Leave other settings as default
8. Click "Create bucket"

## Step 2: Configure Bucket Policy for Public Read Access

1. Select your bucket from the S3 console
2. Go to "Permissions" tab
3. Scroll down to "Bucket policy"
4. Click "Edit" and paste the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/student-photos/*"
        }
    ]
}
```

**Important:** Replace `YOUR_BUCKET_NAME` with your actual bucket name.

5. Click "Save changes"

## Step 3: Configure CORS for Web Uploads

1. In the same "Permissions" tab, scroll to "Cross-origin resource sharing (CORS)"
2. Click "Edit" and paste the following CORS configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:4200",
            "https://your-domain.com"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

**Important:** Replace `https://your-domain.com` with your actual domain. Add multiple domains as needed.

3. Click "Save changes"

## Step 4: Update Amplify Configuration

1. Open your `amplify/backend/storage/` directory
2. If you don't have a storage configuration, run:
   ```bash
   amplify add storage
   ```
3. Choose "Content (Images, audio, video, etc.)"
4. Configure the storage with appropriate permissions:
   - Auth users: Create/update, Read, Delete
   - Guest users: Read (for public photo access)

## Step 5: Update Application Configuration

1. Update the `StudentPhotoService` to use your actual bucket URL
2. In `src/app/core/services/student-photo.service.ts`, find the `generatePhotoUrl` method
3. Replace the placeholder URL with your actual S3 bucket URL:

```typescript
private generatePhotoUrl(studentOpenEmisId: string): string {
  return `https://YOUR_BUCKET_NAME.s3.YOUR_REGION.amazonaws.com/student-photos/${studentOpenEmisId}.jpg`;
}
```

## Step 6: Deploy and Test

1. Deploy your Amplify configuration:
   ```bash
   amplify push
   ```

2. Start your development server:
   ```bash
   npm start
   ```

3. Test the photo functionality:
   - Select a student for editing
   - Click "Take Photo" button
   - Capture a photo and save it
   - Verify the photo appears in the student editor
   - Check that the photo is stored in S3 under `student-photos/[StudentOpenEMIS_ID].jpg`

## Security Considerations

1. **Public Access**: The bucket is configured for public read access to allow photo display. This is intentional for the student photo feature.

2. **Upload Permissions**: Only authenticated users can upload photos through the application.

3. **File Naming**: Photos are stored with the StudentOpenEMIS_ID as the filename, ensuring no conflicts and easy identification.

4. **File Types**: The application only uploads JPEG files with quality optimization.

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure your domain is listed in the CORS configuration
2. **Permission Denied**: Verify the bucket policy is correctly configured
3. **Upload Fails**: Check Amplify authentication and storage permissions
4. **Photos Not Loading**: Verify the bucket URL in the service matches your actual bucket

### AWS CLI Commands:

To verify bucket configuration:
```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket YOUR_BUCKET_NAME

# List objects in bucket
aws s3 ls s3://YOUR_BUCKET_NAME/student-photos/

# Check CORS configuration
aws s3api get-bucket-cors --bucket YOUR_BUCKET_NAME
```

## Cost Considerations

- S3 storage costs are minimal for photos (typically under $1/month for hundreds of photos)
- Consider implementing lifecycle policies to manage old photos if needed
- Monitor usage through AWS Cost Explorer

---

**Note**: Replace all placeholder values (YOUR_BUCKET_NAME, YOUR_REGION, your-domain.com) with your actual configuration values before deploying.
