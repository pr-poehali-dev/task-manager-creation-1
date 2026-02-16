import json
import os
import uuid
import hashlib
import hmac
import time
import psycopg2
import psycopg2.extras

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

def row_to_task(r):
    return {
        'id': r['id'],
        'title': r['title'],
        'description': r['description'],
        'priority': r['priority'],
        'status': r['status'],
        'dueDate': r['due_date'].isoformat() if r['due_date'] else None,
        'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
        'completedAt': r['completed_at'].isoformat() if r['completed_at'] else None,
    }

def handler(event, context):
    """API для управления задачами с привязкой к пользователю"""
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
            cur.execute(
                "SELECT id, title, description, priority, status, due_date, created_at, completed_at "
                "FROM tasks WHERE user_id = '%s' ORDER BY created_at DESC"
                % user_id.replace("'", "")
            )
            rows = cur.fetchall()
            tasks = [row_to_task(r) for r in rows]
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(tasks)}

        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            task_id = str(uuid.uuid4())[:12]
            title = body.get('title', '')
            description = body.get('description', '')
            priority = body.get('priority', 'medium')
            due_date = body.get('dueDate')
            due_val = "NULL" if not due_date else "'" + due_date.replace("'", "") + "'"

            cur.execute(
                "INSERT INTO tasks (id, title, description, priority, due_date, user_id) "
                "VALUES ('%s', '%s', '%s', '%s', %s, '%s') "
                "RETURNING id, title, description, priority, status, due_date, created_at, completed_at"
                % (
                    task_id.replace("'", ""),
                    title.replace("'", "''"),
                    description.replace("'", "''"),
                    priority.replace("'", ""),
                    due_val,
                    user_id.replace("'", "")
                )
            )
            r = cur.fetchone()
            return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps(row_to_task(r))}

        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            task_id = body.get('id', '')
            sets = []
            if 'title' in body:
                sets.append("title = '%s'" % body['title'].replace("'", "''"))
            if 'description' in body:
                sets.append("description = '%s'" % body['description'].replace("'", "''"))
            if 'priority' in body:
                sets.append("priority = '%s'" % body['priority'].replace("'", ""))
            if 'status' in body:
                sets.append("status = '%s'" % body['status'].replace("'", ""))
                if body['status'] == 'completed':
                    sets.append("completed_at = NOW()")
                elif body['status'] == 'active':
                    sets.append("completed_at = NULL")
            if 'dueDate' in body:
                if body['dueDate']:
                    sets.append("due_date = '%s'" % body['dueDate'].replace("'", ""))
                else:
                    sets.append("due_date = NULL")

            if not sets:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Nothing to update'})}

            cur.execute(
                "UPDATE tasks SET %s WHERE id = '%s' AND user_id = '%s' "
                "RETURNING id, title, description, priority, status, due_date, created_at, completed_at"
                % (', '.join(sets), task_id.replace("'", ""), user_id.replace("'", ""))
            )
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(row_to_task(r))}

        elif method == 'DELETE':
            task_id = params.get('id', '')
            cur.execute(
                "UPDATE tasks SET status = 'archived' WHERE id = '%s' AND user_id = '%s'"
                % (task_id.replace("'", ""), user_id.replace("'", ""))
            )
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}
    finally:
        cur.close()
        conn.close()
