import json
import os
import uuid
import psycopg2
import psycopg2.extras

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event, context):
    """API для управления задачами: получение, создание, обновление, удаление"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            cur.execute("""
                SELECT id, title, description, priority, status,
                       due_date, created_at, completed_at
                FROM tasks ORDER BY created_at DESC
            """)
            rows = cur.fetchall()
            tasks = []
            for r in rows:
                tasks.append({
                    'id': r['id'],
                    'title': r['title'],
                    'description': r['description'],
                    'priority': r['priority'],
                    'status': r['status'],
                    'dueDate': r['due_date'].isoformat() if r['due_date'] else None,
                    'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
                    'completedAt': r['completed_at'].isoformat() if r['completed_at'] else None,
                })
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
                "INSERT INTO tasks (id, title, description, priority, due_date) "
                "VALUES ('%s', '%s', '%s', '%s', %s) "
                "RETURNING id, title, description, priority, status, due_date, created_at, completed_at"
                % (
                    task_id.replace("'", ""),
                    title.replace("'", "''"),
                    description.replace("'", "''"),
                    priority.replace("'", ""),
                    due_val
                )
            )
            r = cur.fetchone()
            task = {
                'id': r['id'],
                'title': r['title'],
                'description': r['description'],
                'priority': r['priority'],
                'status': r['status'],
                'dueDate': r['due_date'].isoformat() if r['due_date'] else None,
                'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
                'completedAt': r['completed_at'].isoformat() if r['completed_at'] else None,
            }
            return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps(task)}

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
                "UPDATE tasks SET %s WHERE id = '%s' "
                "RETURNING id, title, description, priority, status, due_date, created_at, completed_at"
                % (', '.join(sets), task_id.replace("'", ""))
            )
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
            task = {
                'id': r['id'],
                'title': r['title'],
                'description': r['description'],
                'priority': r['priority'],
                'status': r['status'],
                'dueDate': r['due_date'].isoformat() if r['due_date'] else None,
                'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
                'completedAt': r['completed_at'].isoformat() if r['completed_at'] else None,
            }
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(task)}

        elif method == 'DELETE':
            task_id = params.get('id', '')
            cur.execute("DELETE FROM tasks WHERE id = '%s'" % task_id.replace("'", ""))
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}
    finally:
        cur.close()
        conn.close()
