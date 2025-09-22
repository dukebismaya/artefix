import json
import os
import sys
import time
import base64
from typing import Optional
from http.server import BaseHTTPRequestHandler
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

# Simple Python serverless endpoint for Artemis (Vercel style)
# Features:
# - Text chat via Hugging Face Inference API (instruct models)
# - Optional image generation via Hugging Face (text-to-image)
# - Local fallback
# Env:
#   HF_TOKEN (required for HF calls)
#   HF_CHAT_MODEL (default: google/gemma-2-2b-it)
#   HF_CHAT_MODEL_FALLBACK (default: TinyLlama/TinyLlama-1.1B-Chat-v1.0)
#   HF_IMAGE_MODEL (optional, e.g., stabilityai/stable-diffusion-2-1)


def sanitize_model_id(s: str) -> str:
    if not s:
        return s
    s = str(s).strip().strip('"').strip("'")
    if ':' in s:
        s = s.split(':')[0]
    return s


def to_hf_prompt(system: str, messages: list) -> str:
    parts = []
    if system:
        parts.append(f"<system>\n{system}\n</system>\n")
    hist = []
    for m in messages[-10:]:
        if not m or not m.get('content'):
            continue
        if m.get('role') == 'assistant':
            hist.append(f"Assistant: {m['content']}")
        else:
            hist.append(f"User: {m['content']}")
    parts.append("\n".join(hist))
    parts.append("\nAssistant:")
    return "\n".join(parts)


def system_prompt(ctx: dict, options: dict) -> str:
    ctx = ctx or {}
    options = options or {}
    path = ctx.get('path')
    product = ctx.get('product') or {}
    role = ctx.get('role')
    persona_style = options.get('persona', 'friendly and helpful')
    basics = (
        f"You are Artemis, an AI assistant for an artisan marketplace. Your personality is {persona_style}. "
        "Be concise, kind, and helpful. Never invent unavailable product specifics "
        "(dimensions, materials) — instead, suggest asking the artisan."
    )
    page = f"Current page: {path}." if path else ''
    if product:
        prod = (
            f"Product: {product.get('name','')} • Category: {product.get('category','')} "
            f"• Price: ₹{product.get('price','')} • Stock: {product.get('stock','')} "
            f"• Origin: {product.get('region','')} • Techniques: {', '.join(product.get('techniques',[]) or [])}"
        )
    else:
        prod = 'Product: none.'
    user_role = f"User role: {role}." if role else ''
    return (
        f"{basics}\n{page}\n{prod}\n{user_role}\n"
        "Guidelines: Help with materials/care/gifting/delivery generally; for exact details, recommend “Chat with Artisan.”"
    )


class HFException(Exception):
    def __init__(self, message: str, code: str = 'HF_ERROR', status: int = 0, body: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.body = body


def hf_text_generate(model: str, token: str, prompt: str) -> str:
    url = f"https://api-inference.huggingface.co/models/{model}"
    payload = json.dumps({
        'inputs': prompt,
        'parameters': {
            'max_new_tokens': 320,
            'temperature': 0.3,
            'return_full_text': False
        },
        'options': {
            'wait_for_model': True
        }
    }).encode('utf-8')
    req = urlrequest.Request(url, data=payload, headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }, method='POST')
    try:
        with urlrequest.urlopen(req, timeout=60) as resp:
            status = resp.getcode()
            body = resp.read()
            if status == 404:
                raise HFException(f'HF_NOT_FOUND: {model}', code='HF_NOT_FOUND', status=status, body=body[:200].decode('utf-8', errors='ignore'))
            if status == 401 or status == 403:
                raise HFException('HF_UNAUTHORIZED', code='HF_UNAUTHORIZED', status=status, body=body[:200].decode('utf-8', errors='ignore'))
            if status == 429:
                raise HFException('HF_RATE_LIMIT', code='HF_RATE_LIMIT', status=status, body=body[:200].decode('utf-8', errors='ignore'))
            if status == 503:
                raise HFException('HF_LOADING', code='HF_LOADING', status=status, body=body[:200].decode('utf-8', errors='ignore'))
            if status < 200 or status >= 300:
                raise HFException(f'HF_ERROR_{status}', code='HF_SERVER', status=status, body=body[:200].decode('utf-8', errors='ignore'))
            try:
                data = json.loads(body.decode('utf-8'))
            except Exception:
                return 'I’m here to help.'
            if isinstance(data, list) and data and isinstance(data[0], dict) and 'generated_text' in data[0]:
                return data[0]['generated_text']
            if isinstance(data, dict) and 'generated_text' in data:
                return data['generated_text']
            return 'I’m here to help.'
    except HTTPError as he:
        status = getattr(he, 'code', 0)
        body = (he.read() or b'')[:200]
        code = 'HF_SERVER'
        if status == 404:
            code = 'HF_NOT_FOUND'
        elif status in (401, 403):
            code = 'HF_UNAUTHORIZED'
        elif status == 429:
            code = 'HF_RATE_LIMIT'
        elif status == 503:
            code = 'HF_LOADING'
        raise HFException(f'{code}: {model}', code=code, status=status, body=body.decode('utf-8', errors='ignore'))
    except URLError as ue:
        raise HFException('HF_NETWORK', code='HF_NETWORK', status=0, body=str(ue))


def hf_image_generate(model: str, token: str, prompt: str) -> str:
    """
    Returns a data URI (data:image/png;base64,...) generated by an image model.
    """
    url = f"https://api-inference.huggingface.co/models/{model}"
    payload = json.dumps({
        'inputs': prompt,
        'options': {
            'wait_for_model': True
        }
    }).encode('utf-8')
    req = urlrequest.Request(url, data=payload, headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }, method='POST')
    try:
        with urlrequest.urlopen(req, timeout=120) as resp:
            status = resp.getcode()
            content_type = resp.headers.get('Content-Type', '')
            data = resp.read()
            if status == 404:
                raise HFException(f'HF_NOT_FOUND: {model}', code='HF_NOT_FOUND', status=status)
            if status == 401 or status == 403:
                raise HFException('HF_UNAUTHORIZED', code='HF_UNAUTHORIZED', status=status)
            if status == 429:
                raise HFException('HF_RATE_LIMIT', code='HF_RATE_LIMIT', status=status)
            if status == 503:
                raise HFException('HF_LOADING', code='HF_LOADING', status=status)
            if status < 200 or status >= 300:
                raise HFException(f'HF img error {status}', code='HF_SERVER', status=status)
            # Most image models return image bytes with image/* content-type
            if content_type.startswith('image/'):
                b64 = base64.b64encode(data).decode('ascii')
                mime = content_type or 'image/png'
                return f"data:{mime};base64,{b64}"
            # Some models return JSON with error
            try:
                j = json.loads(data.decode('utf-8'))
                if isinstance(j, dict) and 'error' in j:
                    raise HFException(j['error'], code='HF_BAD_RESPONSE', status=status)
            except Exception:
                pass
            raise HFException('Unexpected image response', code='HF_BAD_RESPONSE', status=status)
    except HTTPError as he:
        status = getattr(he, 'code', 0)
        code = 'HF_SERVER'
        if status == 404:
            code = 'HF_NOT_FOUND'
        elif status in (401, 403):
            code = 'HF_UNAUTHORIZED'
        elif status == 429:
            code = 'HF_RATE_LIMIT'
        elif status == 503:
            code = 'HF_LOADING'
        raise HFException(code, code=code, status=status)
    except URLError as ue:
        raise HFException('HF_NETWORK', code='HF_NETWORK', status=0, body=str(ue))


def local_fallback(messages: list, context: dict) -> str:
    last = ''
    if messages:
        c = messages[-1].get('content')
        if isinstance(c, str):
            last = c.lower()
    p = (context or {}).get('product')
    if p:
        if 'material' in last or 'made of' in last:
            return 'It’s artisan-made with premium materials chosen for the design. For exact materials, ask the artisan via “Chat with Artisan.”'
        if 'care' in last or 'wash' in last or 'clean' in last:
            return 'Avoid harsh chemicals and moisture; wipe with a soft dry cloth. Store away from direct sun.'
        if 'ship' in last or 'deliver' in last or 'pincode' in last or 'zip' in last or 'eta' in last:
            return 'Tap “Check delivery” on the product page and enter your PIN. Standard orders arrive in ~3–6 days in most cities.'
    return 'I’m here to help with shopping, delivery, returns, gifts, or talking to artisans. Ask me anything.'


class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status: int = 200, trace_id: Optional[str] = None):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        if trace_id:
            self.send_header('x-trace-id', trace_id)
        self.end_headers()

    def do_OPTIONS(self):
        # Basic CORS for local dev if needed
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        t0 = int(time.time() * 1000)
        trace_id = f"{format(t0, 'x')}-{str(time.time()).replace('.', '')[-6:]}"
        try:
            length = int(self.headers.get('content-length', '0'))
        except Exception:
            length = 0
        raw = self.rfile.read(length) if length > 0 else b''
        try:
            body = json.loads(raw.decode('utf-8')) if raw else {}
        except Exception:
            body = {}
        messages = body.get('messages') or []
        context = body.get('context') or {}
        options = body.get('options') or {}
        if not isinstance(messages, list):
            self._set_headers(400, trace_id)
            self.wfile.write(json.dumps({'error': 'messages must be an array'}).encode('utf-8'))
            return

        hf_token = os.environ.get('HF_TOKEN')
        hf_chat_model = sanitize_model_id(options.get('hfModel') or os.environ.get('HF_CHAT_MODEL') or 'google/gemma-2-2b-it')
        hf_fallback_model = sanitize_model_id(options.get('hfFallback') or os.environ.get('HF_CHAT_MODEL_FALLBACK') or 'TinyLlama/TinyLlama-1.1B-Chat-v1.0')
        hf_image_model = sanitize_model_id(options.get('imageModel') or os.environ.get('HF_IMAGE_MODEL') or '')

        # Force local only
        if options.get('forceLocal'):
            reply = local_fallback(messages, context)
            elapsed = int(time.time() * 1000) - t0
            self._set_headers(200, trace_id)
            self.wfile.write(json.dumps({'reply': reply, 'provider': 'local-only', 'note': 'forced-local', 'elapsedMs': elapsed, 'traceId': trace_id}).encode('utf-8'))
            return

        # Image generation
        if options.get('generateImage'):
            if not hf_token or not hf_image_model:
                reply = 'Image generator not configured. Set HF_TOKEN and HF_IMAGE_MODEL.'
                elapsed = int(time.time() * 1000) - t0
                self._set_headers(200, trace_id)
                self.wfile.write(json.dumps({'reply': reply, 'provider': 'local-fallback', 'note': 'image-not-configured', 'elapsedMs': elapsed, 'traceId': trace_id}).encode('utf-8'))
                return
            prompt = options.get('imagePrompt') or (messages[-1].get('content') if messages else '')
            try:
                data_uri = hf_image_generate(hf_image_model, hf_token, prompt)
                elapsed = int(time.time() * 1000) - t0
                self._set_headers(200, trace_id)
                self.wfile.write(json.dumps({'reply': 'Here is your generated image.', 'imageDataUri': data_uri, 'provider': 'huggingface-image', 'modelUsed': hf_image_model, 'note': 'ok', 'elapsedMs': elapsed, 'traceId': trace_id}).encode('utf-8'))
                return
            except Exception as e:
                # Fall back to text reply if possible
                note = str(e)
                reply = local_fallback(messages, context)
                elapsed = int(time.time() * 1000) - t0
                self._set_headers(200, trace_id)
                self.wfile.write(json.dumps({'reply': reply, 'provider': 'local-fallback', 'note': f'image-error:{note}', 'elapsedMs': elapsed, 'traceId': trace_id}).encode('utf-8'))
                return

        # Text chat via HF
        if not hf_token:
            reply = local_fallback(messages, context)
            elapsed = int(time.time() * 1000) - t0
            self._set_headers(200, trace_id)
            self.wfile.write(json.dumps({'reply': reply, 'provider': 'local-fallback', 'note': 'no-hf-token', 'elapsedMs': elapsed, 'traceId': trace_id}).encode('utf-8'))
            return

        sys_prompt = system_prompt(context, options)
        prompt = to_hf_prompt(sys_prompt, messages)
        # Try a small chain of models: primary -> fallback -> TinyLlama
        models = [m for m in [hf_chat_model, hf_fallback_model, 'TinyLlama/TinyLlama-1.1B-Chat-v1.0'] if m]
        last_error_note = ''
        for idx, mdl in enumerate(models):
            try:
                reply = hf_text_generate(mdl, hf_token, prompt)
                elapsed = int(time.time() * 1000) - t0
                note = 'ok' if idx == 0 else f'fallback:{idx}'
                self._set_headers(200, trace_id)
                self.wfile.write(json.dumps({'reply': reply, 'provider': 'huggingface', 'modelUsed': mdl, 'note': note, 'elapsedMs': elapsed, 'traceId': trace_id}).encode('utf-8'))
                return
            except HFException as he:
                last_error_note = f'{he.code}:{mdl}'
                continue
            except Exception as e:
                last_error_note = f'hf-error:{type(e).__name__}'
                continue

        reply = local_fallback(messages, context)
        elapsed = int(time.time() * 1000) - t0
        self._set_headers(200, trace_id)
        self.wfile.write(json.dumps({'reply': reply, 'provider': 'local-fallback', 'note': last_error_note or 'hf-error', 'elapsedMs': elapsed, 'traceId': trace_id}).encode('utf-8'))
        return
