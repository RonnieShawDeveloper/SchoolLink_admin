const AWS = require('aws-sdk');
const Jimp = require('jimp');

const s3 = new AWS.S3();

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

        // Only process files in the student-photos folder with .jpg extension
        if (!key.startsWith('student-photos/') || !key.toLowerCase().endsWith('.jpg')) {
            console.log(`Skipping ${key} - not a student photo`);
            continue;
        }

        // Extract the StudentOpenEMIS_ID from the filename
        const fileName = key.split('/').pop();
        const studentId = fileName.replace(/\.jpg$/i, '');

        // Skip if this is already a thumbnail
        if (studentId.endsWith('-thumb')) {
            console.log(`Skipping ${key} - already a thumbnail`);
            continue;
        }

        try {
            console.log(`Processing ${key} for student ID: ${studentId}`);

            // Get the original image from S3
            const getObjectParams = {
                Bucket: bucket,
                Key: key
            };

            const originalImage = await s3.getObject(getObjectParams).promise();

            // Create 60x60 thumbnail using Jimp (center crop)
            const image = await Jimp.read(originalImage.Body);
            image.cover(60, 60).quality(85);
            const thumbnailBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

            // Upload thumbnail back to S3
            const thumbnailKey = `student-photos/${studentId}-thumb.jpg`;
            const putObjectParams = {
                Bucket: bucket,
                Key: thumbnailKey,
                Body: thumbnailBuffer,
                ContentType: 'image/jpeg',
                CacheControl: 'no-store, no-cache, must-revalidate, max-age=0',
                Expires: new Date(0)
            };

            await s3.putObject(putObjectParams).promise();

            console.log(`Successfully created thumbnail: ${thumbnailKey}`);

        } catch (error) {
            console.error(`Error processing ${key}:`, error);
            throw error;
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify('Thumbnails processed successfully')
    };
};
