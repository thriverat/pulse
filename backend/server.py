from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import aiosqlite
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

# SQLite Database path
DB_PATH = ROOT_DIR / 'pulse_app.db'

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
    frequency: str = "daily"
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
    date: str
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
    mood_level: int
    energy_level: int
    sleep_hours: float
    notes: Optional[str] = ""
    date: str

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
    date: str
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
    trend: str

class AnalyticsResponse(BaseModel):
    weekly_stats: WeeklyStats
    insights: List[InsightItem]
    habit_streaks: dict
    mood_chart_data: List[dict]
    focus_chart_data: List[dict]

# ========== DATABASE HELPERS ==========

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db

async def init_db():
    db = await get_db()
    
    # Users table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Habits table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS habits (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            frequency TEXT DEFAULT 'daily',
            color TEXT DEFAULT '#3f8cff',
            icon TEXT DEFAULT 'checkmark-circle',
            target_per_week INTEGER DEFAULT 7,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    # Habit logs table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS habit_logs (
            id TEXT PRIMARY KEY,
            habit_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            notes TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(habit_id, date),
            FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    # Mood entries table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS mood_entries (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            mood_level INTEGER NOT NULL,
            energy_level INTEGER NOT NULL,
            sleep_hours REAL NOT NULL,
            notes TEXT,
            date TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    # Focus sessions table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS focus_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            task_name TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            date TEXT NOT NULL,
            completed BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    await db.commit()
    await db.close()

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
        
        db = await get_db()
        async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            user = dict(row) if row else None
        await db.close()
        
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
    db = await get_db()
    
    # Check if user exists
    async with db.execute("SELECT * FROM users WHERE email = ?", (user_data.email,)) as cursor:
        existing_user = await cursor.fetchone()
    
    if existing_user:
        await db.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    await db.execute(
        "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, user_data.name, user_data.email, hash_password(user_data.password), created_at)
    )
    await db.commit()
    await db.close()
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            name=user_data.name,
            email=user_data.email,
            created_at=created_at
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    db = await get_db()
    async with db.execute("SELECT * FROM users WHERE email = ?", (credentials.email,)) as cursor:
        row = await cursor.fetchone()
        user = dict(row) if row else None
    await db.close()
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        created_at=current_user["created_at"]
    )

# ========== HABIT ENDPOINTS ==========

@api_router.post("/habits", response_model=Habit)
async def create_habit(habit_data: HabitCreate, current_user = Depends(get_current_user)):
    db = await get_db()
    
    habit_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    await db.execute(
        """INSERT INTO habits (id, user_id, name, description, frequency, color, icon, target_per_week, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (habit_id, current_user["id"], habit_data.name, habit_data.description,
         habit_data.frequency, habit_data.color, habit_data.icon, habit_data.target_per_week, created_at)
    )
    await db.commit()
    await db.close()
    
    return Habit(
        id=habit_id,
        user_id=current_user["id"],
        name=habit_data.name,
        description=habit_data.description,
        frequency=habit_data.frequency,
        color=habit_data.color,
        icon=habit_data.icon,
        target_per_week=habit_data.target_per_week,
        created_at=created_at
    )

@api_router.get("/habits", response_model=List[Habit])
async def get_habits(current_user = Depends(get_current_user)):
    db = await get_db()
    async with db.execute("SELECT * FROM habits WHERE user_id = ?", (current_user["id"],)) as cursor:
        rows = await cursor.fetchall()
        habits = [dict(row) for row in rows]
    await db.close()
    
    return [Habit(**h) for h in habits]

@api_router.post("/habits/log", response_model=HabitLog)
async def log_habit(log_data: HabitLogCreate, current_user = Depends(get_current_user)):
    db = await get_db()
    
    # Check if log exists
    async with db.execute(
        "SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?",
        (log_data.habit_id, log_data.date)
    ) as cursor:
        row = await cursor.fetchone()
        existing_log = dict(row) if row else None
    
    if existing_log:
        # Update
        await db.execute(
            "UPDATE habit_logs SET completed = ?, notes = ? WHERE id = ?",
            (log_data.completed, log_data.notes, existing_log["id"])
        )
        log_id = existing_log["id"]
    else:
        # Insert
        log_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()
        await db.execute(
            """INSERT INTO habit_logs (id, habit_id, user_id, date, completed, notes, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (log_id, log_data.habit_id, current_user["id"], log_data.date, log_data.completed, log_data.notes, timestamp)
        )
    
    await db.commit()
    
    # Fetch the log
    async with db.execute("SELECT * FROM habit_logs WHERE id = ?", (log_id,)) as cursor:
        row = await cursor.fetchone()
        log = dict(row)
    await db.close()
    
    return HabitLog(**log)

@api_router.get("/habits/logs", response_model=List[HabitLog])
async def get_habit_logs(habit_id: Optional[str] = None, current_user = Depends(get_current_user)):
    db = await get_db()
    
    if habit_id:
        async with db.execute(
            "SELECT * FROM habit_logs WHERE user_id = ? AND habit_id = ? ORDER BY date DESC",
            (current_user["id"], habit_id)
        ) as cursor:
            rows = await cursor.fetchall()
    else:
        async with db.execute(
            "SELECT * FROM habit_logs WHERE user_id = ? ORDER BY date DESC",
            (current_user["id"],)
        ) as cursor:
            rows = await cursor.fetchall()
    
    logs = [dict(row) for row in rows]
    await db.close()
    
    return [HabitLog(**log) for log in logs]

# ========== MOOD ENDPOINTS ==========

@api_router.post("/mood", response_model=MoodEntry)
async def create_mood_entry(entry_data: MoodEntryCreate, current_user = Depends(get_current_user)):
    db = await get_db()
    
    # Check if entry exists
    async with db.execute(
        "SELECT * FROM mood_entries WHERE user_id = ? AND date = ?",
        (current_user["id"], entry_data.date)
    ) as cursor:
        row = await cursor.fetchone()
        existing_entry = dict(row) if row else None
    
    if existing_entry:
        # Update
        await db.execute(
            """UPDATE mood_entries SET mood_level = ?, energy_level = ?, sleep_hours = ?, notes = ?
               WHERE id = ?""",
            (entry_data.mood_level, entry_data.energy_level, entry_data.sleep_hours, entry_data.notes, existing_entry["id"])
        )
        entry_id = existing_entry["id"]
    else:
        # Insert
        entry_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()
        await db.execute(
            """INSERT INTO mood_entries (id, user_id, mood_level, energy_level, sleep_hours, notes, date, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (entry_id, current_user["id"], entry_data.mood_level, entry_data.energy_level,
             entry_data.sleep_hours, entry_data.notes, entry_data.date, timestamp)
        )
    
    await db.commit()
    
    # Fetch the entry
    async with db.execute("SELECT * FROM mood_entries WHERE id = ?", (entry_id,)) as cursor:
        row = await cursor.fetchone()
        entry = dict(row)
    await db.close()
    
    return MoodEntry(**entry)

@api_router.get("/mood", response_model=List[MoodEntry])
async def get_mood_entries(current_user = Depends(get_current_user)):
    db = await get_db()
    async with db.execute(
        "SELECT * FROM mood_entries WHERE user_id = ? ORDER BY date DESC",
        (current_user["id"],)
    ) as cursor:
        rows = await cursor.fetchall()
        entries = [dict(row) for row in rows]
    await db.close()
    
    return [MoodEntry(**e) for e in entries]

# ========== FOCUS ENDPOINTS ==========

@api_router.post("/focus", response_model=FocusSession)
async def create_focus_session(session_data: FocusSessionCreate, current_user = Depends(get_current_user)):
    db = await get_db()
    
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    start_time = now - timedelta(minutes=session_data.duration_minutes)
    
    await db.execute(
        """INSERT INTO focus_sessions (id, user_id, task_name, duration_minutes, start_time, end_time, date, completed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (session_id, current_user["id"], session_data.task_name, session_data.duration_minutes,
         start_time, now, session_data.date, session_data.completed)
    )
    await db.commit()
    await db.close()
    
    return FocusSession(
        id=session_id,
        user_id=current_user["id"],
        task_name=session_data.task_name,
        duration_minutes=session_data.duration_minutes,
        start_time=start_time,
        end_time=now,
        date=session_data.date,
        completed=session_data.completed
    )

@api_router.get("/focus", response_model=List[FocusSession])
async def get_focus_sessions(current_user = Depends(get_current_user)):
    db = await get_db()
    async with db.execute(
        "SELECT * FROM focus_sessions WHERE user_id = ? ORDER BY start_time DESC",
        (current_user["id"],)
    ) as cursor:
        rows = await cursor.fetchall()
        sessions = [dict(row) for row in rows]
    await db.close()
    
    return [FocusSession(**s) for s in sessions]

# ========== ANALYTICS ENDPOINTS ==========

@api_router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(current_user = Depends(get_current_user)):
    db = await get_db()
    
    # Get data for last 7 days
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    week_ago_str = week_ago.strftime("%Y-%m-%d")
    
    # Fetch data
    async with db.execute(
        "SELECT * FROM habit_logs WHERE user_id = ? AND date >= ?",
        (current_user["id"], week_ago_str)
    ) as cursor:
        habit_logs = [dict(row) for row in await cursor.fetchall()]
    
    async with db.execute(
        "SELECT * FROM mood_entries WHERE user_id = ? AND date >= ?",
        (current_user["id"], week_ago_str)
    ) as cursor:
        mood_entries = [dict(row) for row in await cursor.fetchall()]
    
    async with db.execute(
        "SELECT * FROM focus_sessions WHERE user_id = ? AND date >= ?",
        (current_user["id"], week_ago_str)
    ) as cursor:
        focus_sessions = [dict(row) for row in await cursor.fetchall()]
    
    async with db.execute(
        "SELECT * FROM habits WHERE user_id = ?",
        (current_user["id"],)
    ) as cursor:
        habits = [dict(row) for row in await cursor.fetchall()]
    
    await db.close()
    
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
    
    # Habit streaks
    habit_streaks = {}
    for habit in habits:
        habit_id = habit["id"]
        habit_specific_logs = [log for log in habit_logs if log["habit_id"] == habit_id and log["completed"]]
        current_streak = len(habit_specific_logs)
        habit_streaks[habit["name"]] = current_streak
    
    # Chart data
    date_strings = [(week_ago + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(8)]
    
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

@app.on_event("startup")
async def startup_db():
    await init_db()
    logger.info(f"SQLite database initialized at {DB_PATH}")
