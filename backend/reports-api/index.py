import json
import os
import hmac
import hashlib
import psycopg2  # noqa
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
    expected = hmac.new(get_secret().encode(), f"{user_id}:{ts}".encode(), hashlib.sha256).hexdigest()
    if hmac.compare_digest(expected, sig):
        return user_id
    return None

def get_user(event):
    auth = event.get('headers', {}).get('X-Authorization', '')
    if auth.startswith('Bearer '):
        return verify_token(auth[7:])
    return None

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """API для управления сохранёнными отчётами: список, сохранение, загрузка, удаление."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    user_id = get_user(event)
    if not user_id:
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    parts = [p for p in path.strip('/').split('/') if p]
    report_id = parts[-1] if len(parts) >= 2 else None

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # GET /reports-api — список всех отчётов (структура год→месяц)
        if method == 'GET' and not report_id:
            cur.execute("""
                SELECT id, name, report_year, report_month, month_label, department, created_at, updated_at
                FROM reports
                ORDER BY report_year DESC, report_month DESC, created_at DESC
            """)
            rows = cur.fetchall()
            result = {}
            for r in rows:
                year = str(r['report_year'])
                if year not in result:
                    result[year] = {}
                month_key = f"{r['report_month']:02d}"
                if month_key not in result[year]:
                    result[year][month_key] = []
                result[year][month_key].append({
                    'id': r['id'],
                    'name': r['name'],
                    'month_label': r['month_label'],
                    'department': r['department'],
                    'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                    'updated_at': r['updated_at'].isoformat() if r['updated_at'] else None,
                })
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(result)}

        # GET /reports-api/{id} — загрузить отчёт
        if method == 'GET' and report_id:
            cur.execute("SELECT * FROM reports WHERE id = %s", (report_id,))
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({
                'id': r['id'],
                'name': r['name'],
                'report_year': r['report_year'],
                'report_month': r['report_month'],
                'month_label': r['month_label'],
                'department': r['department'],
                'rows_data': r['rows_data'],
                'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                'updated_at': r['updated_at'].isoformat() if r['updated_at'] else None,
            })}

        # POST /reports-api — сохранить новый отчёт
        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            name = body.get('name', 'Отчёт')
            report_year = int(body.get('report_year', 2026))
            report_month = int(body.get('report_month', 1))
            month_label = body.get('month_label', '')
            department = body.get('department', '')
            rows_data = json.dumps(body.get('rows_data', []), ensure_ascii=False)

            cur.execute("""
                INSERT INTO reports (name, report_year, report_month, month_label, department, rows_data)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, created_at
            """, (name, report_year, report_month, month_label, department, rows_data))
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps({'id': row['id'], 'created_at': row['created_at'].isoformat()})}

        # PUT /reports-api/{id} — обновить отчёт
        if method == 'PUT' and report_id:
            body = json.loads(event.get('body') or '{}')
            name = body.get('name', 'Отчёт')
            report_year = int(body.get('report_year', 2026))
            report_month = int(body.get('report_month', 1))
            month_label = body.get('month_label', '')
            department = body.get('department', '')
            rows_data = json.dumps(body.get('rows_data', []), ensure_ascii=False)

            cur.execute("""
                UPDATE reports SET name=%s, report_year=%s, report_month=%s, month_label=%s,
                department=%s, rows_data=%s, updated_at=NOW()
                WHERE id=%s
            """, (name, report_year, report_month, month_label, department, rows_data, report_id))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        # DELETE /reports-api/{id} — удалить отчёт
        if method == 'DELETE' and report_id:
            cur.execute("DELETE FROM reports WHERE id = %s", (report_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    finally:
        cur.close()
        conn.close()