import { S3Client, GetObjectCommand, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.554.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.554.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
const region = Deno.env.get('AWS_REGION') || 'us-east-1'
const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
})

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const {
            bucket = 'adthub-documents-dev',
            expires_in = 60,
            operation,
            fileNames, // Array of strings (keys)
            key // Fallback for single file
        } = body

        // Normalize input to an array of keys
        let keys: string[] = []
        if (Array.isArray(fileNames)) {
            keys = fileNames
        } else if (key) {
            keys = [key]
        }

        if (keys.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No fileNames or key provided' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }



        if (!accessKeyId || !secretAccessKey) {
            return new Response(
                JSON.stringify({ error: 'AWS credentials not configured' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const results = await Promise.all(keys.map(async (fileName) => {
            const fileNameParts = fileName.split('/');
            const name = fileNameParts.pop();
            const path = fileNameParts.length > 0 ? fileNameParts.join('/') + '/' : '';
            let newFileName = `${path}${crypto.randomUUID()}-${name}`

            let command: GetObjectCommand | PutObjectCommand
            if (operation === 'put') {
                command = new PutObjectCommand({ Bucket: bucket, Key: newFileName })
            } else if (operation === 'get') {
                command = new GetObjectCommand({ Bucket: bucket, Key: fileName })
                newFileName = fileName
            }

            const url = await getSignedUrl(s3Client, command, { expiresIn: Number(expires_in) })
            return { newFileName, url }
        }))

        return new Response(
            JSON.stringify({ urls: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('Error generating pre-signed URLs:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
