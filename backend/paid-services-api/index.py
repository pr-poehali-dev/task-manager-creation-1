import json
import os
import hmac
import hashlib
import base64
import uuid
import psycopg2
import psycopg2.extras
import boto3

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

def service_row(r):
    extra_costs = r['extra_costs']
    if isinstance(extra_costs, str):
        extra_costs = json.loads(extra_costs)
    tag_ids = r['tag_ids'] or []
    hours = float(r['hours']) if r['hours'] is not None else 0
    hourly_rate = float(r['hourly_rate']) if r['hourly_rate'] is not None else 1420
    fixed_price = float(r['fixed_price']) if r['fixed_price'] is not None else None
    is_fixed = bool(r['is_fixed_price'])
    extra_total = sum(float(e.get('amount', 0)) for e in extra_costs)
    if is_fixed:
        total = (fixed_price or 0) + extra_total
    else:
        total = hours * hourly_rate + extra_total
    return {
        'id': r['id'],
        'serviceName': r['service_name'],
        'applicantName': r['applicant_name'],
        'applicantId': r['applicant_id'],
        'serviceCatalogId': r['service_catalog_id'],
        'hours': hours,
        'hourlyRate': hourly_rate,
        'isFixedPrice': is_fixed,
        'fixedPrice': fixed_price,
        'extraCosts': extra_costs,
        'tagIds': tag_ids,
        'status': r['status'],
        'notes': r['notes'],
        'contractDraftUrl': r['contract_draft_url'],
        'contractFinalUrl': r['contract_final_url'],
        'serviceDate': r['service_date'].isoformat() if r['service_date'] else None,
        'total': total,
        'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
        'updatedAt': r['updated_at'].isoformat() if r['updated_at'] else None,
    }

def catalog_row(r):
    return {
        'id': r['id'],
        'name': r['name'],
        'description': r['description'],
        'isFixedPrice': bool(r['is_fixed_price']),
        'fixedPrice': float(r['fixed_price']) if r['fixed_price'] else None,
        'hourlyRate': float(r['hourly_rate']),
        'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
    }

def applicant_row(r):
    return {
        'id': r['id'],
        'name': r['name'],
        'address': r['address'],
        'inn': r['inn'],
        'contact': r['contact'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
    }

def tag_row(r):
    return {'id': r['id'], 'name': r['name']}

def handler(event: dict, context) -> dict:
    """API для модуля платных услуг: услуги, справочник, заявители, теги, загрузка файлов."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    user_id = get_user(event)
    if not user_id:
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    parts = [p for p in path.strip('/').split('/') if p]
    # parts[0] = function-name, parts[1] = resource, parts[2] = id (optional)
    resource = parts[1] if len(parts) >= 2 else 'services'
    res_id = parts[2] if len(parts) >= 3 else None
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # ── TAGS ────────────────────────────────────────────────────────────────
        if resource == 'tags':
            if method == 'GET':
                cur.execute("SELECT id, name FROM service_tags ORDER BY id")
                return {'statusCode': 200, 'headers': CORS_HEADERS,
                        'body': json.dumps([tag_row(r) for r in cur.fetchall()])}
            if method == 'POST':
                body = json.loads(event.get('body') or '{}')
                name = body.get('name', '').strip()
                if not name:
                    return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'name required'})}
                cur.execute("INSERT INTO service_tags (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id, name", (name,))
                conn.commit()
                return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps(tag_row(cur.fetchone()))}
            if method == 'DELETE' and res_id:
                cur.execute("DELETE FROM service_tags WHERE id=%s", (res_id,))
                conn.commit()
                return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        # ── APPLICANTS ───────────────────────────────────────────────────────────
        if resource == 'applicants':
            if method == 'GET':
                if res_id:
                    cur.execute("SELECT * FROM applicants WHERE id=%s", (res_id,))
                    r = cur.fetchone()
                    if not r:
                        return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
                    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(applicant_row(r))}
                cur.execute("SELECT * FROM applicants ORDER BY name")
                return {'statusCode': 200, 'headers': CORS_HEADERS,
                        'body': json.dumps([applicant_row(r) for r in cur.fetchall()])}
            if method == 'POST':
                body = json.loads(event.get('body') or '{}')
                cur.execute(
                    "INSERT INTO applicants (name, address, inn, contact) VALUES (%s,%s,%s,%s) RETURNING *",
                    (body.get('name',''), body.get('address',''), body.get('inn',''), body.get('contact',''))
                )
                conn.commit()
                return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps(applicant_row(cur.fetchone()))}
            if method == 'PUT' and res_id:
                body = json.loads(event.get('body') or '{}')
                cur.execute(
                    "UPDATE applicants SET name=%s, address=%s, inn=%s, contact=%s WHERE id=%s RETURNING *",
                    (body.get('name',''), body.get('address',''), body.get('inn',''), body.get('contact',''), res_id)
                )
                conn.commit()
                r = cur.fetchone()
                if not r:
                    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
                return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(applicant_row(r))}
            if method == 'DELETE' and res_id:
                cur.execute("DELETE FROM applicants WHERE id=%s", (res_id,))
                conn.commit()
                return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        # ── SERVICE CATALOG ──────────────────────────────────────────────────────
        if resource == 'catalog':
            if method == 'GET':
                if res_id:
                    cur.execute("SELECT * FROM service_catalog WHERE id=%s", (res_id,))
                    r = cur.fetchone()
                    if not r:
                        return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
                    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(catalog_row(r))}
                cur.execute("SELECT * FROM service_catalog ORDER BY name")
                return {'statusCode': 200, 'headers': CORS_HEADERS,
                        'body': json.dumps([catalog_row(r) for r in cur.fetchall()])}
            if method == 'POST':
                body = json.loads(event.get('body') or '{}')
                cur.execute(
                    "INSERT INTO service_catalog (name, description, is_fixed_price, fixed_price, hourly_rate) VALUES (%s,%s,%s,%s,%s) RETURNING *",
                    (body.get('name',''), body.get('description',''),
                     bool(body.get('isFixedPrice', False)),
                     body.get('fixedPrice') or None,
                     float(body.get('hourlyRate', 1420)))
                )
                conn.commit()
                return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps(catalog_row(cur.fetchone()))}
            if method == 'PUT' and res_id:
                body = json.loads(event.get('body') or '{}')
                cur.execute(
                    "UPDATE service_catalog SET name=%s, description=%s, is_fixed_price=%s, fixed_price=%s, hourly_rate=%s WHERE id=%s RETURNING *",
                    (body.get('name',''), body.get('description',''),
                     bool(body.get('isFixedPrice', False)),
                     body.get('fixedPrice') or None,
                     float(body.get('hourlyRate', 1420)), res_id)
                )
                conn.commit()
                r = cur.fetchone()
                if not r:
                    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
                return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(catalog_row(r))}
            if method == 'DELETE' and res_id:
                cur.execute("DELETE FROM service_catalog WHERE id=%s", (res_id,))
                conn.commit()
                return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        # ── FILE UPLOAD for paid_services ────────────────────────────────────────
        if resource == 'upload' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            service_id = body.get('serviceId', '')
            file_type = body.get('fileType', 'draft')  # 'draft' | 'final'
            file_name = body.get('fileName', 'file')
            content_type = body.get('contentType', 'application/octet-stream')
            file_data_b64 = body.get('fileData', '')
            file_bytes = base64.b64decode(file_data_b64)
            file_id = str(uuid.uuid4())[:12]
            safe_name = file_name.replace("'", "").replace("/", "_").replace("\\", "_")
            s3_key = "paid-services/%s/%s_%s" % (service_id, file_id, safe_name)
            s3 = get_s3()
            s3.put_object(Bucket='files', Key=s3_key, Body=file_bytes, ContentType=content_type)
            url = cdn_url(s3_key)
            field = 'contract_draft_url' if file_type == 'draft' else 'contract_final_url'
            cur.execute(
                "UPDATE paid_services SET %s=%%s, updated_at=NOW() WHERE id=%%s RETURNING id" % field,
                (url, service_id)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'url': url})}

        # ── PAID SERVICES (default resource) ─────────────────────────────────────
        if method == 'GET':
            if res_id:
                cur.execute("SELECT * FROM paid_services WHERE id=%s", (res_id,))
                r = cur.fetchone()
                if not r:
                    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
                return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(service_row(r))}
            # list with optional filters
            date_from = params.get('date_from', '')
            date_to = params.get('date_to', '')
            status_filter = params.get('status', '')
            wheres = []
            if date_from:
                wheres.append("service_date >= '%s'" % date_from.replace("'", ""))
            if date_to:
                wheres.append("service_date <= '%s'" % date_to.replace("'", ""))
            if status_filter:
                wheres.append("status = '%s'" % status_filter.replace("'", ""))
            where_sql = ('WHERE ' + ' AND '.join(wheres)) if wheres else ''
            cur.execute("SELECT * FROM paid_services %s ORDER BY created_at DESC" % where_sql)
            return {'statusCode': 200, 'headers': CORS_HEADERS,
                    'body': json.dumps([service_row(r) for r in cur.fetchall()])}

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            extra_costs = json.dumps(body.get('extraCosts', []), ensure_ascii=False)
            tag_ids = body.get('tagIds', [])
            tag_ids_pg = '{' + ','.join(str(t) for t in tag_ids) + '}'
            cur.execute(
                """INSERT INTO paid_services
                   (service_name, applicant_name, applicant_id, service_catalog_id,
                    hours, hourly_rate, is_fixed_price, fixed_price,
                    extra_costs, tag_ids, status, notes, service_date)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                (body.get('serviceName',''),
                 body.get('applicantName',''),
                 body.get('applicantId') or None,
                 body.get('serviceCatalogId') or None,
                 float(body.get('hours', 0)),
                 float(body.get('hourlyRate', 1420)),
                 bool(body.get('isFixedPrice', False)),
                 body.get('fixedPrice') or None,
                 extra_costs, tag_ids_pg,
                 body.get('status', 'draft'),
                 body.get('notes', ''),
                 body.get('serviceDate') or None)
            )
            conn.commit()
            return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps(service_row(cur.fetchone()))}

        if method == 'PUT' and res_id:
            body = json.loads(event.get('body') or '{}')
            extra_costs = json.dumps(body.get('extraCosts', []), ensure_ascii=False)
            tag_ids = body.get('tagIds', [])
            tag_ids_pg = '{' + ','.join(str(t) for t in tag_ids) + '}'
            cur.execute(
                """UPDATE paid_services SET
                   service_name=%s, applicant_name=%s, applicant_id=%s, service_catalog_id=%s,
                   hours=%s, hourly_rate=%s, is_fixed_price=%s, fixed_price=%s,
                   extra_costs=%s, tag_ids=%s, status=%s, notes=%s, service_date=%s, updated_at=NOW()
                   WHERE id=%s RETURNING *""",
                (body.get('serviceName',''),
                 body.get('applicantName',''),
                 body.get('applicantId') or None,
                 body.get('serviceCatalogId') or None,
                 float(body.get('hours', 0)),
                 float(body.get('hourlyRate', 1420)),
                 bool(body.get('isFixedPrice', False)),
                 body.get('fixedPrice') or None,
                 extra_costs, tag_ids_pg,
                 body.get('status', 'draft'),
                 body.get('notes', ''),
                 body.get('serviceDate') or None,
                 res_id)
            )
            conn.commit()
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(service_row(r))}

        if method == 'DELETE' and res_id:
            cur.execute("DELETE FROM paid_services WHERE id=%s", (res_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    finally:
        cur.close()
        conn.close()
