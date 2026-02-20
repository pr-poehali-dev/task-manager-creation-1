import json
import os
import hashlib
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

def row_to_recipient(r):
    emails = r.get('emails') or []
    if isinstance(emails, str):
        emails = []
    return {
        'id': str(r['id']),
        'fullName': r['full_name'],
        'organization': r.get('organization') or '',
        'position': r['position'],
        'address': r['address'],
        'emails': list(emails),
        'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
    }

def emails_to_pg_array(emails):
    safe = [e.replace("'", "''").replace('"', '') for e in emails if e.strip()]
    return "ARRAY[%s]::TEXT[]" % ','.join("'%s'" % e for e in safe) if safe else "ARRAY[]::TEXT[]"

def handler(event, context):
    """API для справочника адресатов: ФИО, организация, должность, адрес, несколько email"""
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
            cur.execute(
                "SELECT id, full_name, organization, position, address, emails, created_at "
                "FROM %s.recipients WHERE user_id = '%s' ORDER BY full_name ASC"
                % (SCHEMA, uid)
            )
            rows = cur.fetchall()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps([row_to_recipient(r) for r in rows])}

        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            full_name = body.get('fullName', '').replace("'", "''")
            organization = body.get('organization', '').replace("'", "''")
            position = body.get('position', '').replace("'", "''")
            address = body.get('address', '').replace("'", "''")
            emails = body.get('emails', [])
            if not isinstance(emails, list):
                emails = [emails] if emails else []

            if not full_name:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'fullName required'})}

            emails_sql = emails_to_pg_array(emails)
            cur.execute(
                "INSERT INTO %s.recipients (user_id, full_name, organization, position, address, emails) "
                "VALUES ('%s', '%s', '%s', '%s', '%s', %s) "
                "RETURNING id, full_name, organization, position, address, emails, created_at"
                % (SCHEMA, uid, full_name, organization, position, address, emails_sql)
            )
            r = cur.fetchone()
            return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps(row_to_recipient(r))}

        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            rec_id = body.get('id', '').replace("'", "")
            sets = ["updated_at = NOW()"]
            if 'fullName' in body:
                sets.append("full_name = '%s'" % body['fullName'].replace("'", "''"))
            if 'organization' in body:
                sets.append("organization = '%s'" % body['organization'].replace("'", "''"))
            if 'position' in body:
                sets.append("position = '%s'" % body['position'].replace("'", "''"))
            if 'address' in body:
                sets.append("address = '%s'" % body['address'].replace("'", "''"))
            if 'emails' in body:
                emails = body['emails']
                if not isinstance(emails, list):
                    emails = [emails] if emails else []
                sets.append("emails = %s" % emails_to_pg_array(emails))

            cur.execute(
                "UPDATE %s.recipients SET %s WHERE id = '%s' AND user_id = '%s' "
                "RETURNING id, full_name, organization, position, address, emails, created_at"
                % (SCHEMA, ', '.join(sets), rec_id, uid)
            )
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(row_to_recipient(r))}

        elif method == 'DELETE':
            rec_id = params.get('id', '').replace("'", "")
            cur.execute(
                "DELETE FROM %s.recipients WHERE id = '%s' AND user_id = '%s'"
                % (SCHEMA, rec_id, uid)
            )
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}
    finally:
        cur.close()
        conn.close()
