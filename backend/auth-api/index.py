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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id):
    ts = str(int(time.time()))
    payload = user_id + ":" + ts
    sig = hmac.new(get_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return payload + ":" + sig

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

def handler(event, context):
    """Авторизация: регистрация, вход и проверка токена"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    if method == 'GET' and action == 'me':
        token = ''
        auth = (event.get('headers') or {}).get('X-Authorization', '')
        if not auth:
            auth = (event.get('headers') or {}).get('x-authorization', '')
        if auth.startswith('Bearer '):
            token = auth[7:]
        if not token:
            return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'No token'})}
        user_id = verify_token(token)
        if not user_id:
            return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Invalid token'})}
        conn = get_conn()
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cur.execute("SELECT id, email, name, created_at FROM users WHERE id = '%s'" % user_id.replace("'", ""))
            user = cur.fetchone()
            if not user:
                return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'User not found'})}
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
            })}
        finally:
            cur.close()
            conn.close()

    if method != 'POST':
        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body', '{}'))
    action = body.get('action', '')

    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if action == 'register':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            name = body.get('name', '').strip()

            if not email or not password:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Email и пароль обязательны'})}
            if len(password) < 6:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}

            cur.execute("SELECT id FROM users WHERE email = '%s'" % email.replace("'", "''"))
            if cur.fetchone():
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Пользователь уже существует'})}

            user_id = str(uuid.uuid4())[:12]
            pw_hash = hash_password(password)
            cur.execute(
                "INSERT INTO users (id, email, password_hash, name) VALUES ('%s', '%s', '%s', '%s') "
                "RETURNING id, email, name"
                % (user_id, email.replace("'", "''"), pw_hash, name.replace("'", "''"))
            )
            user = cur.fetchone()
            token = create_token(user['id'])
            return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps({
                'token': token,
                'user': {'id': user['id'], 'email': user['email'], 'name': user['name']}
            })}

        elif action == 'login':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')

            if not email or not password:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Email и пароль обязательны'})}

            pw_hash = hash_password(password)
            cur.execute(
                "SELECT id, email, name FROM users WHERE email = '%s' AND password_hash = '%s'"
                % (email.replace("'", "''"), pw_hash)
            )
            user = cur.fetchone()
            if not user:
                return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неверный email или пароль'})}

            token = create_token(user['id'])
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({
                'token': token,
                'user': {'id': user['id'], 'email': user['email'], 'name': user['name']}
            })}

        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Unknown action'})}
    finally:
        cur.close()
        conn.close()
