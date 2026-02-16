import json
import os
import uuid
import base64
import hashlib
import hmac
import time
import boto3
import psycopg2
import psycopg2.extras

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
}

SECRET = None

def get_secret():
    global SECRET
    if SECRET is None:
        SECRET = os.environ.get('AUTH_SECRET', 'task-manager-secret-2024')
    return SECRET

def verify_token(token):
    parts = token.split(":")
    if len(parts) != 3:
        return None
    user_id, ts, sig = parts
    payload = user_id + ":" + ts
    expected = hmac.new(get_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    if not hmac.compare_digest(sig, expected):
        return None
    if int(time.time()) - int(ts) > 30 * 24 * 3600:
        return None
    return user_id

def get_user_id(event):
    auth = (event.get('headers') or {}).get('X-Authorization', '')
    if not auth:
        auth = (event.get('headers') or {}).get('x-authorization', '')
    if auth.startswith('Bearer '):
        return verify_token(auth[7:])
    return None

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )

def cdn_url(key):
    return "https://cdn.poehali.dev/projects/%s/bucket/%s" % (os.environ['AWS_ACCESS_KEY_ID'], key)

def handler(event, context):
    """Загрузка, получение и удаление файлов-вложений к задачам с авторизацией"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    user_id = get_user_id(event)
    if not user_id:
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            task_id = params.get('task_id', '')
            cur.execute(
                "SELECT id, task_id, file_name, file_size, content_type, cdn_url, created_at "
                "FROM attachments WHERE task_id = '%s' AND user_id = '%s' ORDER BY created_at DESC"
                % (task_id.replace("'", ""), user_id.replace("'", ""))
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                result.append({
                    'id': r['id'],
                    'taskId': r['task_id'],
                    'fileName': r['file_name'],
                    'fileSize': r['file_size'],
                    'contentType': r['content_type'],
                    'cdnUrl': r['cdn_url'],
                    'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
                })
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(result)}

        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            task_id = body.get('taskId', '')
            file_name = body.get('fileName', 'file')
            content_type = body.get('contentType', 'application/octet-stream')
            file_data_b64 = body.get('fileData', '')

            file_bytes = base64.b64decode(file_data_b64)
            file_size = len(file_bytes)

            file_id = str(uuid.uuid4())[:12]
            safe_name = file_name.replace("'", "").replace("/", "_").replace("\\", "_")
            s3_key = "attachments/%s/%s_%s" % (task_id.replace("'", ""), file_id, safe_name)

            s3 = get_s3()
            s3.put_object(
                Bucket='files',
                Key=s3_key,
                Body=file_bytes,
                ContentType=content_type
            )

            url = cdn_url(s3_key)

            cur.execute(
                "INSERT INTO attachments (id, task_id, file_name, file_size, content_type, cdn_url, user_id) "
                "VALUES ('%s', '%s', '%s', %d, '%s', '%s', '%s') "
                "RETURNING id, task_id, file_name, file_size, content_type, cdn_url, created_at"
                % (
                    file_id,
                    task_id.replace("'", ""),
                    safe_name.replace("'", "''"),
                    file_size,
                    content_type.replace("'", ""),
                    url.replace("'", ""),
                    user_id.replace("'", "")
                )
            )
            r = cur.fetchone()
            return {
                'statusCode': 201,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'id': r['id'],
                    'taskId': r['task_id'],
                    'fileName': r['file_name'],
                    'fileSize': r['file_size'],
                    'contentType': r['content_type'],
                    'cdnUrl': r['cdn_url'],
                    'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
                })
            }

        elif method == 'DELETE':
            file_id = params.get('id', '').replace("'", "")
            cur.execute(
                "UPDATE attachments SET task_id = '' WHERE id = '%s' AND user_id = '%s'"
                % (file_id, user_id.replace("'", ""))
            )
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}
    finally:
        cur.close()
        conn.close()
