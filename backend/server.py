from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ========== MODELS ==========

# Auth Models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Habit Models
class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    frequency: str = "daily"  # daily, weekly
    color: str = "#3f8cff"
    icon: str = "checkmark-circle"
    target_per_week: int = 7

class Habit(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    frequency: str
    color: str
    icon: str
    target_per_week: int
    created_at: datetime

class HabitLogCreate(BaseModel):
    habit_id: str
    date: str  # YYYY-MM-DD
    completed: bool
    notes: Optional[str] = ""

class HabitLog(BaseModel):
    id: str
    habit_id: str
    user_id: str
    date: str
    completed: bool
    notes: str
    timestamp: datetime

# Mood Models
class MoodEntryCreate(BaseModel):
    mood_level: int  # 1-5
    energy_level: int  # 1-5
    sleep_hours: float
    notes: Optional[str] = ""
    date: str  # YYYY-MM-DD

class MoodEntry(BaseModel):
    id: str
    user_id: str
    mood_level: int
    energy_level: int
    sleep_hours: float
    notes: str
    date: str
    timestamp: datetime

# Focus Models
class FocusSessionCreate(BaseModel):
    task_name: str
    duration_minutes: int
    date: str  # YYYY-MM-DD
    completed: bool = True

class FocusSession(BaseModel):
    id: str
    user_id: str
    task_name: str
    duration_minutes: int
    start_time: datetime
    end_time: datetime
    date: str
    completed: bool

# Analytics Models
class WeeklyStats(BaseModel):
    total_habits_completed: int
    total_focus_minutes: int
    average_mood: float
    average_energy: float
    average_sleep: float
    habit_completion_rate: float

class InsightItem(BaseModel):
    type: str
    title: str
    description: str
    value: str
    trend: str  # "up", "down", "neutral"

class AnalyticsResponse(BaseModel):
    weekly_stats: WeeklyStats
    insights: List[InsightItem]
    habit_streaks: dict
    mood_chart_data: List[dict]
    focus_chart_data: List[dict]

# ========== AUTH HELPERS ==========

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ========== AUTH ENDPOINTS ==========

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "_id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            name=user["name"],
            email=user["email"],
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["_id"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["_id"],
            name=user["name"],
            email=user["email"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        name=current_user["name"],
        email=current_user["email"],
        created_at=current_user["created_at"]
    )

# ========== HABIT ENDPOINTS ==========

@api_router.post("/habits", response_model=Habit)
async def create_habit(habit_data: HabitCreate, current_user = Depends(get_current_user)):
    habit_id = str(uuid.uuid4())
    habit = {
        "_id": habit_id,
        "user_id": current_user["_id"],
        "name": habit_data.name,
        "description": habit_data.description,
        "frequency": habit_data.frequency,
        "color": habit_data.color,
        "icon": habit_data.icon,
        "target_per_week": habit_data.target_per_week,
        "created_at": datetime.utcnow()
    }
    
    await db.habits.insert_one(habit)
    
    return Habit(
        id=habit_id,
        user_id=habit["user_id"],
        name=habit["name"],
        description=habit["description"],
        frequency=habit["frequency"],
        color=habit["color"],
        icon=habit["icon"],
        target_per_week=habit["target_per_week"],
        created_at=habit["created_at"]
    )

@api_router.get("/habits", response_model=List[Habit])
async def get_habits(current_user = Depends(get_current_user)):
    habits = await db.habits.find({"user_id": current_user["_id"]}).to_list(1000)
    return [
        Habit(
            id=h["_id"],
            user_id=h["user_id"],
            name=h["name"],
            description=h.get("description", ""),
            frequency=h["frequency"],
            color=h.get("color", "#3f8cff"),
            icon=h.get("icon", "checkmark-circle"),
            target_per_week=h.get("target_per_week", 7),
            created_at=h["created_at"]
        )
        for h in habits
    ]

@api_router.post("/habits/log", response_model=HabitLog)
async def log_habit(log_data: HabitLogCreate, current_user = Depends(get_current_user)):
    # Check if log already exists for this date
    existing_log = await db.habit_logs.find_one({
        "habit_id": log_data.habit_id,
        "user_id": current_user["_id"],
        "date": log_data.date
    })
    
    if existing_log:
        # Update existing log
        await db.habit_logs.update_one(
            {"_id": existing_log["_id"]},
            {"$set": {"completed": log_data.completed, "notes": log_data.notes}}
        )
        log_id = existing_log["_id"]
    else:
        # Create new log
        log_id = str(uuid.uuid4())
        log = {
            "_id": log_id,
            "habit_id": log_data.habit_id,
            "user_id": current_user["_id"],
            "date": log_data.date,
            "completed": log_data.completed,
            "notes": log_data.notes,
            "timestamp": datetime.utcnow()
        }
        await db.habit_logs.insert_one(log)
    
    # Fetch and return the log
    log = await db.habit_logs.find_one({"_id": log_id})
    return HabitLog(
        id=log["_id"],
        habit_id=log["habit_id"],
        user_id=log["user_id"],
        date=log["date"],
        completed=log["completed"],
        notes=log.get("notes", ""),
        timestamp=log["timestamp"]
    )

@api_router.get("/habits/logs", response_model=List[HabitLog])
async def get_habit_logs(habit_id: Optional[str] = None, current_user = Depends(get_current_user)):
    query = {"user_id": current_user["_id"]}
    if habit_id:
        query["habit_id"] = habit_id
    
    logs = await db.habit_logs.find(query).sort("date", -1).to_list(1000)
    return [
        HabitLog(
            id=log["_id"],
            habit_id=log["habit_id"],
            user_id=log["user_id"],
            date=log["date"],
            completed=log["completed"],
            notes=log.get("notes", ""),
            timestamp=log["timestamp"]
        )
        for log in logs
    ]

# ========== MOOD ENDPOINTS ==========

@api_router.post("/mood", response_model=MoodEntry)
async def create_mood_entry(entry_data: MoodEntryCreate, current_user = Depends(get_current_user)):
    # Check if entry exists for this date
    existing_entry = await db.mood_entries.find_one({
        "user_id": current_user["_id"],
        "date": entry_data.date
    })
    
    if existing_entry:
        # Update existing entry
        await db.mood_entries.update_one(
            {"_id": existing_entry["_id"]},
            {"$set": {
                "mood_level": entry_data.mood_level,
                "energy_level": entry_data.energy_level,
                "sleep_hours": entry_data.sleep_hours,
                "notes": entry_data.notes
            }}
        )
        entry_id = existing_entry["_id"]
    else:
        # Create new entry
        entry_id = str(uuid.uuid4())
        entry = {
            "_id": entry_id,
            "user_id": current_user["_id"],
            "mood_level": entry_data.mood_level,
            "energy_level": entry_data.energy_level,
            "sleep_hours": entry_data.sleep_hours,
            "notes": entry_data.notes,
            "date": entry_data.date,
            "timestamp": datetime.utcnow()
        }
        await db.mood_entries.insert_one(entry)
    
    # Fetch and return
    entry = await db.mood_entries.find_one({"_id": entry_id})
    return MoodEntry(
        id=entry["_id"],
        user_id=entry["user_id"],
        mood_level=entry["mood_level"],
        energy_level=entry["energy_level"],
        sleep_hours=entry["sleep_hours"],
        notes=entry.get("notes", ""),
        date=entry["date"],
        timestamp=entry["timestamp"]
    )

@api_router.get("/mood", response_model=List[MoodEntry])
async def get_mood_entries(current_user = Depends(get_current_user)):
    entries = await db.mood_entries.find({"user_id": current_user["_id"]}).sort("date", -1).to_list(1000)
    return [
        MoodEntry(
            id=e["_id"],
            user_id=e["user_id"],
            mood_level=e["mood_level"],
            energy_level=e["energy_level"],
            sleep_hours=e["sleep_hours"],
            notes=e.get("notes", ""),
            date=e["date"],
            timestamp=e["timestamp"]
        )
        for e in entries
    ]

# ========== FOCUS ENDPOINTS ==========

@api_router.post("/focus", response_model=FocusSession)
async def create_focus_session(session_data: FocusSessionCreate, current_user = Depends(get_current_user)):
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    start_time = now - timedelta(minutes=session_data.duration_minutes)
    
    session = {
        "_id": session_id,
        "user_id": current_user["_id"],
        "task_name": session_data.task_name,
        "duration_minutes": session_data.duration_minutes,
        "start_time": start_time,
        "end_time": now,
        "date": session_data.date,
        "completed": session_data.completed
    }
    
    await db.focus_sessions.insert_one(session)
    
    return FocusSession(
        id=session_id,
        user_id=session["user_id"],
        task_name=session["task_name"],
        duration_minutes=session["duration_minutes"],
        start_time=session["start_time"],
        end_time=session["end_time"],
        date=session["date"],
        completed=session["completed"]
    )

@api_router.get("/focus", response_model=List[FocusSession])
async def get_focus_sessions(current_user = Depends(get_current_user)):
    sessions = await db.focus_sessions.find({"user_id": current_user["_id"]}).sort("start_time", -1).to_list(1000)
    return [
        FocusSession(
            id=s["_id"],
            user_id=s["user_id"],
            task_name=s["task_name"],
            duration_minutes=s["duration_minutes"],
            start_time=s["start_time"],
            end_time=s["end_time"],
            date=s["date"],
            completed=s["completed"]
        )
        for s in sessions
    ]

# ========== ANALYTICS ENDPOINTS ==========

@api_router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(current_user = Depends(get_current_user)):
    # Get data for last 7 days
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    
    date_strings = [(week_ago + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(8)]
    
    # Fetch all data
    habit_logs = await db.habit_logs.find({
        "user_id": current_user["_id"],
        "date": {"$in": date_strings}
    }).to_list(1000)
    
    mood_entries = await db.mood_entries.find({
        "user_id": current_user["_id"],
        "date": {"$in": date_strings}
    }).to_list(1000)
    
    focus_sessions = await db.focus_sessions.find({
        "user_id": current_user["_id"],
        "date": {"$in": date_strings}
    }).to_list(1000)
    
    habits = await db.habits.find({"user_id": current_user["_id"]}).to_list(1000)
    
    # Calculate weekly stats
    completed_habits = sum(1 for log in habit_logs if log["completed"])
    total_focus_minutes = sum(s["duration_minutes"] for s in focus_sessions)
    
    avg_mood = sum(e["mood_level"] for e in mood_entries) / len(mood_entries) if mood_entries else 0
    avg_energy = sum(e["energy_level"] for e in mood_entries) / len(mood_entries) if mood_entries else 0
    avg_sleep = sum(e["sleep_hours"] for e in mood_entries) / len(mood_entries) if mood_entries else 0
    
    expected_completions = len(habits) * 7
    completion_rate = (completed_habits / expected_completions * 100) if expected_completions > 0 else 0
    
    weekly_stats = WeeklyStats(
        total_habits_completed=completed_habits,
        total_focus_minutes=total_focus_minutes,
        average_mood=round(avg_mood, 1),
        average_energy=round(avg_energy, 1),
        average_sleep=round(avg_sleep, 1),
        habit_completion_rate=round(completion_rate, 1)
    )
    
    # Generate insights
    insights = []
    
    # Sleep vs Focus correlation
    if mood_entries and focus_sessions:
        sleep_focus_map = defaultdict(list)
        for mood in mood_entries:
            day_focus = [s["duration_minutes"] for s in focus_sessions if s["date"] == mood["date"]]
            if day_focus:
                sleep_bucket = "low" if mood["sleep_hours"] < 6 else "high"
                sleep_focus_map[sleep_bucket].extend(day_focus)
        
        if "low" in sleep_focus_map and "high" in sleep_focus_map:
            avg_low = sum(sleep_focus_map["low"]) / len(sleep_focus_map["low"])
            avg_high = sum(sleep_focus_map["high"]) / len(sleep_focus_map["high"])
            diff_pct = abs(avg_high - avg_low) / avg_high * 100 if avg_high > 0 else 0
            
            if avg_low < avg_high:
                insights.append(InsightItem(
                    type="sleep_focus",
                    title="Sleep Affects Focus",
                    description=f"On days you sleep < 6 hours, your focus drops by {round(diff_pct)}%",
                    value=f"{round(diff_pct)}%",
                    trend="down"
                ))
    
    # Habit streak
    if habit_logs and habits:
        best_habit = None
        max_streak = 0
        
        for habit in habits:
            habit_id = habit["_id"]
            habit_specific_logs = sorted(
                [log for log in habit_logs if log["habit_id"] == habit_id and log["completed"]],
                key=lambda x: x["date"]
            )
            
            if habit_specific_logs:
                current_streak = 1
                for i in range(1, len(habit_specific_logs)):
                    if habit_specific_logs[i]["date"] == habit_specific_logs[i-1]["date"]:
                        continue
                    # Simple streak calculation
                    current_streak += 1
                
                if current_streak > max_streak:
                    max_streak = current_streak
                    best_habit = habit["name"]
        
        if best_habit:
            insights.append(InsightItem(
                type="habit_streak",
                title="Habit Streak",
                description=f"You're on a {max_streak}-day streak with {best_habit}!",
                value=f"{max_streak} days",
                trend="up"
            ))
    
    # Mood trend
    if len(mood_entries) >= 2:
        recent_moods = sorted(mood_entries, key=lambda x: x["date"])[-3:]
        avg_recent = sum(m["mood_level"] for m in recent_moods) / len(recent_moods)
        
        if avg_recent >= 4:
            insights.append(InsightItem(
                type="mood_trend",
                title="Great Mood Trend",
                description=f"Your mood has been excellent lately (avg {round(avg_recent, 1)}/5)",
                value=f"{round(avg_recent, 1)}/5",
                trend="up"
            ))
    
    # Focus productivity
    if total_focus_minutes > 0:
        avg_daily_focus = total_focus_minutes / 7
        insights.append(InsightItem(
            type="focus_productivity",
            title="Focus Time",
            description=f"You averaged {round(avg_daily_focus)} minutes of focus per day",
            value=f"{round(avg_daily_focus)} min",
            trend="neutral"
        ))
    
    # Habit streaks calculation
    habit_streaks = {}
    for habit in habits:
        habit_id = habit["_id"]
        habit_specific_logs = sorted(
            [log for log in habit_logs if log["habit_id"] == habit_id and log["completed"]],
            key=lambda x: x["date"],
            reverse=True
        )
        
        current_streak = len(habit_specific_logs) if habit_specific_logs else 0
        habit_streaks[habit["name"]] = current_streak
    
    # Chart data
    mood_chart_data = [
        {
            "date": e["date"],
            "mood": e["mood_level"],
            "energy": e["energy_level"]
        }
        for e in sorted(mood_entries, key=lambda x: x["date"])
    ]
    
    focus_chart_data = [
        {
            "date": date_str,
            "minutes": sum(s["duration_minutes"] for s in focus_sessions if s["date"] == date_str)
        }
        for date_str in date_strings
    ]
    
    return AnalyticsResponse(
        weekly_stats=weekly_stats,
        insights=insights,
        habit_streaks=habit_streaks,
        mood_chart_data=mood_chart_data,
        focus_chart_data=focus_chart_data
    )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
