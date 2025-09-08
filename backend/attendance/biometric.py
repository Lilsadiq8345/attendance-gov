from __future__ import annotations

from typing import List, Optional, Tuple, Dict, Any
import math

try:
    import numpy as np
except Exception:  # pragma: no cover - numpy not strictly required for fallback
    np = None  # type: ignore


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two equal-length vectors.

    Returns a value in [-1, 1]. If vectors are all-zero or mismatched lengths, returns 0.0.
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    if np is not None:
        a = np.asarray(vec_a, dtype=float)
        b = np.asarray(vec_b, dtype=float)
        denom = (np.linalg.norm(a) * np.linalg.norm(b))
        if denom == 0:
            return 0.0
        return float(a.dot(b) / denom)

    # Fallback without numpy
    dot = sum(x * y for x, y in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(x * x for x in vec_a))
    norm_b = math.sqrt(sum(y * y for y in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def compare_feature_vectors(
    enrolled: Optional[List[float]],
    probe: Optional[List[float]],
    min_similarity: float,
) -> Tuple[bool, float]:
    """Compare two feature vectors using cosine similarity.

    - enrolled: reference vector stored for the user
    - probe: incoming vector from the scanner
    - min_similarity: threshold in [0, 1] required to accept match

    Returns (is_match, confidence) where confidence is similarity in [0, 1].
    """
    if not enrolled or not probe:
        return False, 0.0
    similarity = _cosine_similarity(enrolled, probe)
    # Map from [-1,1] to [0,1] for a confidence-like score
    confidence = (similarity + 1.0) / 2.0
    return confidence >= min_similarity, confidence


def verify_biometrics(
    user_biometric_data: Dict[str, Any],
    probe_biometric_data: Dict[str, Any],
    face_threshold: float,
    ear_threshold: float,
) -> Dict[str, Any]:
    """Verify face and ear biometrics by comparing feature vectors.

    Expected keys:
    - user_biometric_data: may contain 'face_features' and 'ear_features'
    - probe_biometric_data: may contain 'face_features' and 'ear_features'
    """
    enrolled_face = user_biometric_data.get('face_features')
    # Ear can include left/right separately
    enrolled_ear = user_biometric_data.get('ear_features')
    enrolled_ear_left = user_biometric_data.get('ear_left_features')
    enrolled_ear_right = user_biometric_data.get('ear_right_features')

    probe_face = probe_biometric_data.get('face_features')
    probe_ear = probe_biometric_data.get('ear_features')
    probe_ear_left = probe_biometric_data.get('ear_left_features')
    probe_ear_right = probe_biometric_data.get('ear_right_features')

    face_ok, face_conf = compare_feature_vectors(enrolled_face, probe_face, face_threshold)

    # Ear verification accepts if either unified ear matches or both left/right match, taking best confidence
    ear_matches = []
    ear_confs = []
    for e, p in [
        (enrolled_ear, probe_ear),
        (enrolled_ear_left, probe_ear_left),
        (enrolled_ear_right, probe_ear_right),
    ]:
        ok, conf = compare_feature_vectors(e, p, ear_threshold)
        ear_matches.append(ok)
        ear_confs.append(conf)
    ear_ok = any(ear_matches)
    ear_conf = max(ear_confs) if ear_confs else 0.0

    return {
        'face_verified': bool(face_ok),
        'ear_verified': bool(ear_ok),
        'face_confidence': float(face_conf),
        'ear_confidence': float(ear_conf),
    }


