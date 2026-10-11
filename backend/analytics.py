import json
import os
import threading
from datetime import datetime, timedelta
from pathlib import Path
from backend.config import LOGGER

ANALYTICS_FILE = Path("./db_rag/analytics.json")
_lock = threading.Lock()

def _load_analytics():
    if not ANALYTICS_FILE.exists():
        return {
            "daily_activity": {},
            "topics": {"etudiant": 0, "etablissement": 0, "association": 0, "all": 0},
            "latencies": [],
            "total_requests": 0,
            "cache_hits": 0,
            "users": set()
        }
    try:
        with open(ANALYTICS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "users" in data:
                data["users"] = set(data["users"])
            return data
    except Exception as e:
        LOGGER.error(f"Erreur de lecture des analytics: {e}")
        return {
            "daily_activity": {},
            "topics": {"etudiant": 0, "etablissement": 0, "association": 0, "all": 0},
            "latencies": [],
            "total_requests": 0,
            "cache_hits": 0,
            "users": set()
        }

def _save_analytics(data):
    try:
        ANALYTICS_FILE.parent.mkdir(parents=True, exist_ok=True)
        # Convertir les set en liste pour le JSON
        save_data = data.copy()
        if "users" in save_data:
            save_data["users"] = list(save_data["users"])
            
        with open(ANALYTICS_FILE, "w", encoding="utf-8") as f:
            json.dump(save_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        LOGGER.error(f"Erreur de sauvegarde des analytics: {e}")

def track_request(session_id: str, latency: float, cache_hit: bool, profile: str, is_db_latency: bool = False):
    """Enregistre une interaction"""
    with _lock:
        data = _load_analytics()
        
        # On utilise la date exacte YYYY-MM-DD pour ne pas mélanger les semaines
        day_str = datetime.now().strftime("%Y-%m-%d")
        
        # Init jour
        if day_str not in data["daily_activity"]:
            data["daily_activity"][day_str] = {"requetes": 0, "cache": 0}
            
        data["total_requests"] += 1
        data["daily_activity"][day_str]["requetes"] += 1
        
        if cache_hit:
            data["cache_hits"] += 1
            data["daily_activity"][day_str]["cache"] += 1
            
        # Topics
        norm_profile = str(profile).lower() if profile else "all"
        if norm_profile not in data["topics"]:
            data["topics"][norm_profile] = 0
        data["topics"][norm_profile] += 1
        
        # Latencies (on garde les 20 dernières)
        now_time = datetime.now().strftime("%H:%M")
        latency_ms = int(latency * 1000)
        
        # Add latency record
        data["latencies"].append({
            "time": now_time,
            "latency": 0 if cache_hit else latency_ms,
            "db_latency": latency_ms if cache_hit or is_db_latency else int(latency_ms * 0.2)
        })
        if len(data["latencies"]) > 20:
            data["latencies"].pop(0)
            
        # Users
        if "users" not in data:
            data["users"] = set()
        if session_id:
            data["users"].add(session_id)
            
        _save_analytics(data)


def get_stats():
    """Formate les stats pour le Dashboard Frontend"""
    with _lock:
        data = _load_analytics()
        
    activity_data = []
    fr_days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    
    # On calcule les 7 derniers jours dynamiquement (de J-6 jusqu'à Aujourd'hui)
    for i in range(6, -1, -1):
        target_date = datetime.now() - timedelta(days=i)
        date_str = target_date.strftime("%Y-%m-%d")
        
        # On récupère le nom du jour en français (0 = Lundi, 6 = Dimanche)
        display_name = fr_days[target_date.weekday()]
        
        if date_str in data["daily_activity"]:
            activity_data.append({
                "name": display_name,
                "requetes": data["daily_activity"][date_str]["requetes"],
                "cache": data["daily_activity"][date_str]["cache"]
            })
        else:
            activity_data.append({
                "name": display_name,
                "requetes": 0,
                "cache": 0
            })
            
    # Topics formating
    total_topics = sum(data["topics"].values())
    topic_data = []
    if total_topics == 0:
        topic_data = [{"name": "Aucune donnée", "value": 100}]
    else:
        for k, v in data["topics"].items():
            if v > 0:
                name = k.capitalize()
                if k == "all": name = "Général"
                topic_data.append({
                    "name": name,
                    "value": round((v / total_topics) * 100)
                })
                
    # KPI calcul
    cache_rate = 0
    if data["total_requests"] > 0:
        cache_rate = (data["cache_hits"] / data["total_requests"]) * 100
        
    avg_latency = 0
    if len(data["latencies"]) > 0:
        valid_latencies = [l["latency"] for l in data["latencies"] if l["latency"] > 0]
        if valid_latencies:
            avg_latency = sum(valid_latencies) / len(valid_latencies)
        avg_latency = round(avg_latency / 1000, 2) # en secondes
        
    return {
        "activityData": activity_data,
        "topicData": topic_data,
        "latencyData": data["latencies"][-6:], # les 6 dernières
        "kpi": {
            "total_requests": data["total_requests"],
            "cache_rate": f"{cache_rate:.1f}%",
            "active_users": len(data.get("users", set())),
            "avg_latency": f"{avg_latency}s"
        }
    }