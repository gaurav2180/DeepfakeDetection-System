from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import cv2
import numpy as np
from PIL import Image
import os
from werkzeug.utils import secure_filename
import time
import traceback
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

print("=" * 60)
print("🎯 ML Model")
print("⚠️  Low confidence = FAKE")
print("=" * 60)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Globals
pretrained_model = None
pretrained_processor = None
device = None

# Background job management
MAX_WORKERS = 2
JOB_TTL_SECONDS = 60 * 60
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
jobs = {}
jobs_lock = threading.Lock()

def load_pretrained_model():
    """Load ML model"""
    global pretrained_model, pretrained_processor, device
    
    try:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"\n🚀 Device: {device}")
        
        if torch.cuda.is_available():
            print(f"🎮 GPU: {torch.cuda.get_device_name(0)}")
        
        print("\n📥 Loading ML model...")
        print("⏳ First run: Downloading (~400MB)...")
        
        from transformers import ViTImageProcessor, ViTForImageClassification
        
        model_name = "dima806/deepfake_vs_real_image_detection"
        
        print(f"🤗 Model: {model_name}")
        
        pretrained_processor = ViTImageProcessor.from_pretrained(model_name)
        pretrained_model = ViTForImageClassification.from_pretrained(model_name)
        
        pretrained_model = pretrained_model.to(device)
        pretrained_model.eval()
        
        print(f"\n✅ ML MODEL LOADED!")
        print(f"🎯 Labels: {pretrained_model.config.id2label}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ML model failed: {e}")
        print("⚠️ Will use heuristics-only mode")
        traceback.print_exc()
        return False

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def analyze_image(image):
    """Analyze single frame with ML"""
    
    if pretrained_model is None or pretrained_processor is None:
        return None, None, None, None
    
    try:
        # Convert to PIL
        if isinstance(image, np.ndarray):
            image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        # Preprocess
        inputs = pretrained_processor(images=image, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Predict
        with torch.inference_mode():
            outputs = pretrained_model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1)
        
        # Get probabilities
        probs_list = probs[0].cpu().numpy()
        
        # Get labels
        labels = pretrained_model.config.id2label
        label_0 = str(labels[0]).lower()
        
        # Determine which is fake/real
        if 'fake' in label_0:
            fake_prob = float(probs_list[0])
            real_prob = float(probs_list[1])
        else:
            real_prob = float(probs_list[0])
            fake_prob = float(probs_list[1])
        
        # Make prediction
        if real_prob > fake_prob:
            prediction = 'real'
            confidence = real_prob
        else:
            prediction = 'deepfake'
            confidence = fake_prob
        
        return prediction, confidence, real_prob, fake_prob
        
    except Exception as e:
        print(f"⚠️ ML frame analysis error: {e}")
        return None, None, None, None

def analyze_images_batch(images):
    """Analyze multiple frames with ML (batched for speed)"""
    if pretrained_model is None or pretrained_processor is None:
        return []

    try:
        pil_images = []
        for image in images:
            if isinstance(image, np.ndarray):
                pil_images.append(Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB)))
            else:
                pil_images.append(image)

        inputs = pretrained_processor(images=pil_images, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.inference_mode():
            outputs = pretrained_model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1)

        probs_list = probs.cpu().numpy()
        labels = pretrained_model.config.id2label
        label_0 = str(labels[0]).lower()
        fake_first = 'fake' in label_0

        results = []
        for row in probs_list:
            if fake_first:
                fake_prob = float(row[0])
                real_prob = float(row[1])
            else:
                real_prob = float(row[0])
                fake_prob = float(row[1])

            if real_prob > fake_prob:
                prediction = 'real'
                confidence = real_prob
            else:
                prediction = 'deepfake'
                confidence = fake_prob

            results.append((prediction, confidence, real_prob, fake_prob))

        return results

    except Exception as e:
        print(f"⚠️ ML batch analysis error: {e}")
        return []

def determine_num_frames(total_frames, fps):
    if total_frames <= 0:
        return 0
    duration = total_frames / fps if fps > 0 else 0
    if duration <= 5:
        target = 8
    elif duration <= 15:
        target = 12
    elif duration <= 30:
        target = 16
    else:
        target = 20
    if total_frames < target:
        return total_frames
    if total_frames >= 6 and target < 6:
        return 6
    return target

def calculate_heuristic_score(video_path):
    """Calculate heuristic score for video"""
    
    cap = cv2.VideoCapture(video_path)
    
    # Get video metadata
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0
    file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
    
    score = 100  # Start perfect
    warnings = []
    red_flags = []
    
    # === CRITICAL RED FLAGS (Very suspicious) ===
    
    # 1. Classic deepfake resolution
    if width == 256 and height == 256:
        score -= 50
        red_flags.append("🚨 CRITICAL: 256x256 resolution (classic deepfake size)")
    elif width <= 360 or height <= 360:
        score -= 35
        red_flags.append("🚨 Very low resolution (deepfake indicator)")
    elif width < 480:
        score -= 20
        warnings.append("⚠️ Low resolution")
    
    # 2. Suspiciously small file size
    expected_size = (width * height * fps * duration) / (1024 * 1024 * 80)
    if file_size_mb < expected_size * 0.2:
        score -= 40
        red_flags.append("🚨 CRITICAL: Extremely compressed (deepfake indicator)")
    elif file_size_mb < expected_size * 0.4:
        score -= 25
        warnings.append("⚠️ Very small file size for resolution")
    
    # 3. Very low FPS
    if fps < 15:
        score -= 25
        warnings.append("⚠️ Very low frame rate")
    elif fps < 24:
        score -= 10
        warnings.append("⚠️ Low frame rate")
    
    # 4. Very short duration (deepfakes often short)
    if duration < 2:
        score -= 20
        warnings.append("⚠️ Very short video")
    elif duration < 5:
        score -= 10
    
    # 5. Check frame consistency (sample a few frames)
    frame_quality_scores = []
    sample_indices = np.linspace(0, total_frames - 1, min(5, total_frames), dtype=int)
    
    for idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            # Calculate sharpness (Laplacian variance)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
            frame_quality_scores.append(sharpness)
    
    cap.release()
    
    if frame_quality_scores:
        avg_sharpness = np.mean(frame_quality_scores)
        if avg_sharpness < 50:  # Very blurry
            score -= 20
            warnings.append("⚠️ Very blurry/low quality frames")
        elif avg_sharpness < 100:
            score -= 10
    
    # Ensure score doesn't go below 0
    score = max(0, score)
    
    metadata = {
        'total_frames': total_frames,
        'resolution': f"{width}x{height}",
        'file_size_mb': round(file_size_mb, 2),
        'fps': round(fps, 1),
        'duration': round(duration, 2),
        'expected_size_mb': round(expected_size, 2),
        'avg_sharpness': round(np.mean(frame_quality_scores), 2) if frame_quality_scores else 0
    }
    
    return score, warnings, red_flags, metadata

def analyze_video_hybrid(video_path, num_frames=None):
    """HYBRID: Heuristics + ML Analysis - STRICT MODE (Low confidence = FAKE)"""
    
    print(f"\n{'='*60}")

    print(f"{'='*60}")
    
    # === STEP 1: HEURISTICS (FAST!) ===
    
    print("\n📊 STEP 1: ANALYSIS")
    h_score, warnings, red_flags, metadata = calculate_heuristic_score(video_path)
    
    print(f"   Resolution: {metadata['resolution']}")
    print(f"   File size: {metadata['file_size_mb']} MB (expected: {metadata['expected_size_mb']} MB)")
    print(f"   FPS: {metadata['fps']}")
    print(f"   Duration: {metadata['duration']}s")
    print(f"   Sharpness: {metadata['avg_sharpness']}")
    print(f"\n   Score: {h_score}/100")
    
    if red_flags:
        print(f"\n   🚨 RED FLAGS DETECTED:")
        for flag in red_flags:
            print(f"      {flag}")
    
    if warnings:
        print(f"\n   ⚠️ WARNINGS:")
        for warn in warnings:
            print(f"      {warn}")
    
    
    if h_score < 30:
        print(f"\n🚨 DECISION: OBVIOUS DEEPFAKE ")
        return 'deepfake', 0.92, 0.08, 0.92, h_score, red_flags + warnings, metadata, "Heuristics - Obvious Fake"
    
    
    if pretrained_model is None:
        print(f"\n⚠️ ML model not available")
        if h_score < 60:
            return 'deepfake', 0.75, 0.25, 0.75, h_score, red_flags + warnings, metadata, "Heuristics Only"
        else:
            return 'real', 0.70, 0.70, 0.30, h_score, red_flags + warnings, metadata, "Heuristics Only"
    
    print(f"\n🤖 STEP 2: ML ANALYSIS")
    
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if total_frames == 0:
        cap.release()
        return 'deepfake', 0.60, 0.40, 0.60, h_score, warnings, metadata, "Error - Default Fake"
    
    if num_frames is None:
        num_frames = determine_num_frames(total_frames, metadata.get('fps', 0))

    frame_indices = np.linspace(0, total_frames - 1, min(num_frames, total_frames), dtype=int)
    predictions = []

    print(f"   Analyzing {len(frame_indices)} frames...")

    frames = []
    for frame_idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        
        if not ret:
            continue

        frames.append(frame)
    
    cap.release()

    batch_size = 4
    for i in range(0, len(frames), batch_size):
        batch = frames[i:i + batch_size]
        batch_results = analyze_images_batch(batch)
        for result in batch_results:
            pred, conf, real_prob, fake_prob = result
            predictions.append({
                'prediction': pred,
                'confidence': conf,
                'real_prob': real_prob,
                'fake_prob': fake_prob
            })

        if (i // batch_size + 1) % 1 == 0:
            processed = min(i + batch_size, len(frames))
            print(f"      Frame {processed}/{len(frames)}...")
    
    if not predictions:
        print(f"   ⚠️ ML analysis failed")
        if h_score < 60:
            return 'deepfake', 0.70, 0.30, 0.70, h_score, red_flags + warnings, metadata, "ML Failed - Heuristics"
        else:
            return 'real', 0.65, 0.65, 0.35, h_score, red_flags + warnings, metadata, "ML Failed - Heuristics"
    
    # Aggregate ML results
    fake_votes = sum(1 for p in predictions if p['prediction'] == 'deepfake')
    real_votes = len(predictions) - fake_votes
    
    avg_real = np.mean([p['real_prob'] for p in predictions])
    avg_fake = np.mean([p['fake_prob'] for p in predictions])
    
    ml_pred = 'real' if real_votes > fake_votes else 'deepfake'
    ml_conf = avg_real if ml_pred == 'real' else avg_fake
    
    print(f"   ML Votes: {real_votes} Real, {fake_votes} Fake")
    print(f"   ML Prediction: {ml_pred.upper()} ({ml_conf:.2%})")
    
    # === STEP 3: HYBRID DECISION (STRICT MODE - Bias towards FAKE) ===
    
    print(f"\n🧠 STEP 3: HYBRID DECISION (STRICT MODE)")
    
    decision_method = "Hybrid"
    
    # Rule 1: Critical red flags = ALWAYS FAKE
    if red_flags:
        print(f"   🚨 Critical red flags detected = DEEPFAKE")
        final_pred = 'deepfake'
        final_conf = 0.85
        decision_method = "Red Flags"
    
    # Rule 2: Low heuristic score (suspicious patterns) = FAKE
    elif h_score < 50:
        print(f"   🚨 Low heuristic score ({h_score}/100) = DEEPFAKE")
        final_pred = 'deepfake'
        final_conf = 0.80
        decision_method = "Low Heuristic Score"
    
    # Rule 3: ML says fake with any confidence = FAKE
    elif ml_pred == 'deepfake':
        print(f"   🤖 ML detected deepfake ({ml_conf:.2%})")
        final_pred = 'deepfake'
        final_conf = max(ml_conf, 0.70)  # At least 70% confidence
        decision_method = "ML Detected Fake"
    
    # Rule 4: ML says real but LOW CONFIDENCE (<75%) = FAKE ⭐ STRICT!
    elif ml_pred == 'real' and ml_conf < 0.75:
        print(f"   🚨 ML says real but LOW CONFIDENCE ({ml_conf:.2%}) = DEEPFAKE")
        final_pred = 'deepfake'
        final_conf = 0.70
        decision_method = "Low Confidence = Suspicious"
    
    # Rule 5: ML says real with OK confidence but poor heuristics = FAKE
    elif ml_pred == 'real' and ml_conf >= 0.75 and h_score < 60:
        print(f"   🚨 ML says real but poor heuristics ({h_score}/100) = DEEPFAKE")
        final_pred = 'deepfake'
        final_conf = 0.65
        decision_method = "Heuristics Override"
    
    # Rule 6: ML says real with good confidence + good heuristics = REAL
    elif ml_pred == 'real' and ml_conf >= 0.75 and h_score >= 60:
        print(f"   ✅ ML confident ({ml_conf:.2%}) + good heuristics ({h_score}/100) = REAL")
        final_pred = 'real'
        final_conf = ml_conf
        decision_method = "Both Agree Real"
    
    # Rule 7: ML very high confidence real (>85%) = REAL (even with medium heuristics)
    elif ml_pred == 'real' and ml_conf >= 0.85 and h_score >= 50:
        print(f"   ✅ ML very confident ({ml_conf:.2%}) = REAL")
        final_pred = 'real'
        final_conf = ml_conf
        decision_method = "ML High Confidence"
    
    # Default: If uncertain, call it FAKE (safe default)
    else:
        print(f"   🚨 Uncertain case = DEEPFAKE (safe default)")
        final_pred = 'deepfake'
        final_conf = 0.60
        decision_method = "Uncertain = Fake"
    
    print(f"\n🎯 FINAL DECISION: {final_pred.upper()} ({final_conf:.2%})")
    print(f"   Decision Method: {decision_method}")
    
    return final_pred, final_conf, avg_real, avg_fake, h_score, red_flags + warnings, metadata, decision_method

def format_response_data(filename, prediction, confidence, real_score, fake_score, h_score, flags, metadata, method, processing_time):
    if prediction == 'deepfake':
        if confidence > 0.85:
            risk_level = 'high'
            message = 'ðŸš¨ High confidence deepfake detected'
        elif confidence > 0.70:
            risk_level = 'medium'
            message = 'âš ï¸ Likely a deepfake'
        else:
            risk_level = 'low'
            message = 'ðŸ¤” Possible deepfake (low confidence)'
    else:
        if confidence > 0.85:
            risk_level = 'authentic_high'
            message = 'âœ… High confidence authentic video'
        elif confidence > 0.75:
            risk_level = 'authentic_medium'
            message = 'âœ… Likely authentic'
        else:
            risk_level = 'authentic_low'
            message = 'âœ… Possibly authentic (medium confidence)'

    return {
        'status': 'completed',
        'filename': filename,
        'duration': round(metadata.get('duration', 0), 2),
        'total_frames': metadata.get('total_frames', 0),
        'prediction': prediction,
        'confidence': round(confidence, 4),
        'risk_level': risk_level,
        'message': message,
        'processing_time': round(processing_time, 2),
        'scores': {
            'real': round(real_score, 4),
            'fake': round(fake_score, 4)
        },
        'heuristic_analysis': {
            'score': h_score,
            'warnings': flags,
            'metadata': metadata
        },
        'decision_method': method,
        'model_info': {
            'type': 'Hybrid (ML + Heuristics) - STRICT MODE',
            'ml_model': 'dima806/deepfake_vs_real_image_detection' if pretrained_model else 'Not loaded',
            'source': 'Hugging Face + Custom Logic',
            'mode': 'Low confidence = FAKE'
        }
    }

def cleanup_jobs():
    now = time.time()
    expired = []
    with jobs_lock:
        for job_id, job in jobs.items():
            if now - job.get('updated_at', now) > JOB_TTL_SECONDS:
                expired.append(job_id)
        for job_id in expired:
            jobs.pop(job_id, None)

def run_analysis_job(job_id, filepath, filename):
    with jobs_lock:
        job = jobs.get(job_id, {})
        job['status'] = 'running'
        job['updated_at'] = time.time()
        jobs[job_id] = job

    try:
        start_time = time.time()
        prediction, confidence, real_score, fake_score, h_score, flags, metadata, method = \
            analyze_video_hybrid(filepath, num_frames=None)
        processing_time = time.time() - start_time

        response_data = format_response_data(
            filename, prediction, confidence, real_score, fake_score, h_score, flags, metadata, method, processing_time
        )

        with jobs_lock:
            jobs[job_id] = {
                'status': 'completed',
                'updated_at': time.time(),
                'result': response_data,
                'filename': filename
            }
    except Exception as e:
        with jobs_lock:
            jobs[job_id] = {
                'status': 'failed',
                'updated_at': time.time(),
                'error': str(e),
                'filename': filename
            }

# ===== API ROUTES =====

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': '✅ Ready',
        'model': 'Hybrid (ML + Heuristics) - STRICT MODE',
        'ml_loaded': pretrained_model is not None,
        'device': str(device) if device else 'cpu'
    })

@app.route('/api/upload', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            cap = cv2.VideoCapture(filepath)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            duration = frame_count / fps if fps > 0 else 0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()
            
            return jsonify({
                'message': '✅ Uploaded',
                'filename': filename,
                'duration': round(duration, 2),
                'frames': frame_count,
                'resolution': f"{width}x{height}",
                'fps': round(fps, 1),
                'analysis_ready': True
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Invalid file'}), 400

@app.route('/api/analyze/<filename>', methods=['POST', 'OPTIONS'])
def analyze_video_route(filename):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(filepath):
        return jsonify({'error': 'Video not found'}), 404

    try:
        print(f"\n{'='*60}")
        print(f"🎬 ANALYZING: {filename}")
        print(f"{'='*60}")

        start_time = time.time()

        prediction, confidence, real_score, fake_score, h_score, flags, metadata, method = \
            analyze_video_hybrid(filepath, num_frames=None)

        processing_time = time.time() - start_time

        response_data = format_response_data(
            filename, prediction, confidence, real_score, fake_score, h_score, flags, metadata, method, processing_time
        )

        print(f"\n{'='*60}")
        print(f"✅ FINAL RESULT: {prediction.upper()}")
        print(f"📊 Confidence: {confidence:.2%}")
        print(f"📈 Heuristic Score: {h_score}/100")
        print(f"🧠 Method: {method}")
        print(f"⏱️  Time: {processing_time:.1f}s")
        print(f"{'='*60}\n")

        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        traceback.print_exc()

        error_response = jsonify({
            'error': str(e),
            'status': 'failed'
        })
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500

@app.route('/api/analyze_async/<filename>', methods=['POST', 'OPTIONS'])
def analyze_video_async_route(filename):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'Video not found'}), 404

    cleanup_jobs()

    job_id = uuid.uuid4().hex
    with jobs_lock:
        jobs[job_id] = {
            'status': 'queued',
            'created_at': time.time(),
            'updated_at': time.time(),
            'filename': filename
        }

    executor.submit(run_analysis_job, job_id, filepath, filename)

    response = jsonify({
        'status': 'queued',
        'job_id': job_id,
        'filename': filename
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/api/analyze_status/<job_id>', methods=['GET'])
def analyze_status_route(job_id):
    cleanup_jobs()
    with jobs_lock:
        job = jobs.get(job_id)

    if not job:
        return jsonify({'error': 'Job not found'}), 404

    response_data = {
        'status': job.get('status', 'unknown'),
        'job_id': job_id,
        'filename': job.get('filename')
    }

    if job.get('status') == 'completed':
        response_data['result'] = job.get('result')
    elif job.get('status') == 'failed':
        response_data['error'] = job.get('error', 'Unknown error')

    response = jsonify(response_data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response
# ===== STARTUP =====
if __name__ == '__main__':
   
    
    success = load_pretrained_model()
    
    if not success:
        print("\n⚠️ ML model not loaded")
    
    print("\n" + "="*60)
    print("🌐 Server: http://localhost:5000")
    print("="*60)
    print("✅ READY TO DETECT DEEPFAKES!")
    print("="*60 + "\n")
    
    app.run(debug=False, port=5000, host='127.0.0.1', threaded=True)

