import json
import os
import hashlib
# v2
import hmac
import time
import psycopg2
import psycopg2.extras

SCHEMA = 't_p54371197_task_manager_creatio'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

def row_to_doc(r):
    return {
        'id': str(r['id']),
        'title': r['title'],
        'content': r['content'],
        'category': r['category'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
        'updatedAt': r['updated_at'].isoformat() if r['updated_at'] else None,
    }

def handler(event, context):
    """API для управления документами: письма, внутренние, прочие"""
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
        uid = user_id.replace("'", "")

        if method == 'GET':
            category = params.get('category', '')
            if category and category in ('letters', 'internal', 'other'):
                cur.execute(
                    "SELECT id, title, content, category, created_at, updated_at "
                    "FROM %s.documents WHERE user_id = '%s' AND category = '%s' ORDER BY updated_at DESC"
                    % (SCHEMA, uid, category)
                )
            else:
                cur.execute(
                    "SELECT id, title, content, category, created_at, updated_at "
                    "FROM %s.documents WHERE user_id = '%s' ORDER BY updated_at DESC"
                    % (SCHEMA, uid)
                )
            rows = cur.fetchall()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps([row_to_doc(r) for r in rows])}

        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            title = body.get('title', '').replace("'", "''")
            content = body.get('content', '').replace("'", "''")
            category = body.get('category', 'other').replace("'", "")
            if category not in ('letters', 'internal', 'other'):
                category = 'other'

            cur.execute(
                "INSERT INTO %s.documents (user_id, title, content, category) "
                "VALUES ('%s', '%s', '%s', '%s') "
                "RETURNING id, title, content, category, created_at, updated_at"
                % (SCHEMA, uid, title, content, category)
            )
            r = cur.fetchone()
            return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps(row_to_doc(r))}

        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            doc_id = body.get('id', '').replace("'", "")
            sets = ["updated_at = NOW()"]
            if 'title' in body:
                sets.append("title = '%s'" % body['title'].replace("'", "''"))
            if 'content' in body:
                sets.append("content = '%s'" % body['content'].replace("'", "''"))
            if 'category' in body and body['category'] in ('letters', 'internal', 'other'):
                sets.append("category = '%s'" % body['category'])

            cur.execute(
                "UPDATE %s.documents SET %s WHERE id = '%s' AND user_id = '%s' "
                "RETURNING id, title, content, category, created_at, updated_at"
                % (SCHEMA, ', '.join(sets), doc_id, uid)
            )
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(row_to_doc(r))}

        elif method == 'DELETE':
            doc_id = params.get('id', '').replace("'", "")
            cur.execute(
                "DELETE FROM %s.documents WHERE id = '%s' AND user_id = '%s'"
                % (SCHEMA, doc_id, uid)
            )
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}
    finally:
        cur.close()
        conn.close()