#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Pulse Mobile App
Tests all authentication, habits, mood, focus, and analytics endpoints
"""

import requests
import json
from datetime import datetime, timedelta
import uuid
import time

# Configuration
BASE_URL = "https://pulse-insights-5.preview.emergentagent.com/api"
TEST_USER_EMAIL = "sarah.wellness@example.com"
TEST_USER_PASSWORD = "SecurePass123!"
TEST_USER_NAME = "Sarah Wellness"

class PulseAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.user_id = None
        self.test_habits = []
        self.test_results = {
            "auth": {"passed": 0, "failed": 0, "errors": []},
            "habits": {"passed": 0, "failed": 0, "errors": []},
            "mood": {"passed": 0, "failed": 0, "errors": []},
            "focus": {"passed": 0, "failed": 0, "errors": []},
            "analytics": {"passed": 0, "failed": 0, "errors": []}
        }
    
    def log_result(self, category, test_name, success, error_msg=None):
        """Log test result"""
        if success:
            self.test_results[category]["passed"] += 1
            print(f"✅ {category.upper()}: {test_name}")
        else:
            self.test_results[category]["failed"] += 1
            self.test_results[category]["errors"].append(f"{test_name}: {error_msg}")
            print(f"❌ {category.upper()}: {test_name} - {error_msg}")
    
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        default_headers = {"Content-Type": "application/json"}
        
        if self.token:
            default_headers["Authorization"] = f"Bearer {self.token}"
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method == "GET":
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            return None, str(e)
    
    def test_authentication(self):
        """Test all authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test 1: Register new user
        register_data = {
            "name": TEST_USER_NAME,
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/register", register_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_result("auth", "User Registration", True)
            else:
                self.log_result("auth", "User Registration", False, "Missing token or user in response")
        elif response and response.status_code == 400:
            # User might already exist, try login
            self.log_result("auth", "User Registration", True, "User already exists (expected)")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("auth", "User Registration", False, error_msg)
        
        # Test 2: Login user
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_result("auth", "User Login", True)
            else:
                self.log_result("auth", "User Login", False, "Missing token or user in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("auth", "User Login", False, error_msg)
        
        # Test 3: Get current user info
        if self.token:
            response = self.make_request("GET", "/auth/me")
            if response and response.status_code == 200:
                data = response.json()
                if "id" in data and "name" in data and "email" in data:
                    self.log_result("auth", "Get Current User", True)
                else:
                    self.log_result("auth", "Get Current User", False, "Missing user fields in response")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_result("auth", "Get Current User", False, error_msg)
        else:
            self.log_result("auth", "Get Current User", False, "No auth token available")
    
    def test_habits_api(self):
        """Test all habits endpoints"""
        print("\n🎯 Testing Habits API...")
        
        if not self.token:
            self.log_result("habits", "All Habits Tests", False, "No auth token available")
            return
        
        # Test 1: Create habits
        habits_to_create = [
            {
                "name": "Morning Meditation",
                "description": "10 minutes of mindfulness meditation",
                "frequency": "daily",
                "color": "#4CAF50",
                "icon": "leaf",
                "target_per_week": 7
            },
            {
                "name": "Evening Reading",
                "description": "Read for 30 minutes before bed",
                "frequency": "daily",
                "color": "#2196F3",
                "icon": "book",
                "target_per_week": 5
            },
            {
                "name": "Weekly Exercise",
                "description": "Gym or outdoor workout",
                "frequency": "weekly",
                "color": "#FF5722",
                "icon": "fitness",
                "target_per_week": 3
            }
        ]
        
        for habit_data in habits_to_create:
            response = self.make_request("POST", "/habits", habit_data)
            if response and response.status_code == 200:
                data = response.json()
                if "id" in data and "name" in data:
                    self.test_habits.append(data)
                    self.log_result("habits", f"Create Habit: {habit_data['name']}", True)
                else:
                    self.log_result("habits", f"Create Habit: {habit_data['name']}", False, "Missing fields in response")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_result("habits", f"Create Habit: {habit_data['name']}", False, error_msg)
        
        # Test 2: Get all habits
        response = self.make_request("GET", "/habits")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= len(self.test_habits):
                self.log_result("habits", "Get All Habits", True)
            else:
                self.log_result("habits", "Get All Habits", False, f"Expected list with {len(self.test_habits)} habits, got {len(data) if isinstance(data, list) else 'non-list'}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("habits", "Get All Habits", False, error_msg)
        
        # Test 3: Log habit completions for multiple days
        if self.test_habits:
            dates_to_log = [
                (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
                (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
                datetime.now().strftime("%Y-%m-%d")
            ]
            
            for date in dates_to_log:
                for i, habit in enumerate(self.test_habits):
                    log_data = {
                        "habit_id": habit["id"],
                        "date": date,
                        "completed": i % 2 == 0,  # Alternate completion status
                        "notes": f"Completed on {date}"
                    }
                    
                    response = self.make_request("POST", "/habits/log", log_data)
                    if response and response.status_code == 200:
                        data = response.json()
                        if "id" in data and "completed" in data:
                            self.log_result("habits", f"Log Habit {habit['name']} on {date}", True)
                        else:
                            self.log_result("habits", f"Log Habit {habit['name']} on {date}", False, "Missing fields in response")
                    else:
                        error_msg = f"Status: {response.status_code if response else 'No response'}"
                        self.log_result("habits", f"Log Habit {habit['name']} on {date}", False, error_msg)
        
        # Test 4: Get habit logs
        response = self.make_request("GET", "/habits/logs")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("habits", "Get All Habit Logs", True)
            else:
                self.log_result("habits", "Get All Habit Logs", False, "Response is not a list")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("habits", "Get All Habit Logs", False, error_msg)
        
        # Test 5: Get logs for specific habit
        if self.test_habits:
            habit_id = self.test_habits[0]["id"]
            response = self.make_request("GET", f"/habits/logs?habit_id={habit_id}")
            if response and response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("habits", "Get Specific Habit Logs", True)
                else:
                    self.log_result("habits", "Get Specific Habit Logs", False, "Response is not a list")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_result("habits", "Get Specific Habit Logs", False, error_msg)
    
    def test_mood_api(self):
        """Test mood tracking endpoints"""
        print("\n😊 Testing Mood API...")
        
        if not self.token:
            self.log_result("mood", "All Mood Tests", False, "No auth token available")
            return
        
        # Test 1: Create mood entries for multiple days
        mood_entries = [
            {
                "mood_level": 4,
                "energy_level": 3,
                "sleep_hours": 7.5,
                "notes": "Feeling great after good sleep",
                "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
            },
            {
                "mood_level": 3,
                "energy_level": 2,
                "sleep_hours": 5.5,
                "notes": "Tired from late night work",
                "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            },
            {
                "mood_level": 5,
                "energy_level": 4,
                "sleep_hours": 8.0,
                "notes": "Excellent mood and energy today",
                "date": datetime.now().strftime("%Y-%m-%d")
            }
        ]
        
        for entry_data in mood_entries:
            response = self.make_request("POST", "/mood", entry_data)
            if response and response.status_code == 200:
                data = response.json()
                if "id" in data and "mood_level" in data and "energy_level" in data:
                    self.log_result("mood", f"Create Mood Entry for {entry_data['date']}", True)
                else:
                    self.log_result("mood", f"Create Mood Entry for {entry_data['date']}", False, "Missing fields in response")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_result("mood", f"Create Mood Entry for {entry_data['date']}", False, error_msg)
        
        # Test 2: Update existing mood entry (same date)
        update_data = {
            "mood_level": 4,
            "energy_level": 4,
            "sleep_hours": 8.5,
            "notes": "Updated mood entry with better sleep",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        
        response = self.make_request("POST", "/mood", update_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("sleep_hours") == 8.5:
                self.log_result("mood", "Update Mood Entry (Same Date)", True)
            else:
                self.log_result("mood", "Update Mood Entry (Same Date)", False, "Entry not updated correctly")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("mood", "Update Mood Entry (Same Date)", False, error_msg)
        
        # Test 3: Get all mood entries
        response = self.make_request("GET", "/mood")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 3:
                self.log_result("mood", "Get All Mood Entries", True)
            else:
                self.log_result("mood", "Get All Mood Entries", False, f"Expected list with at least 3 entries, got {len(data) if isinstance(data, list) else 'non-list'}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("mood", "Get All Mood Entries", False, error_msg)
    
    def test_focus_api(self):
        """Test focus sessions endpoints"""
        print("\n🎯 Testing Focus API...")
        
        if not self.token:
            self.log_result("focus", "All Focus Tests", False, "No auth token available")
            return
        
        # Test 1: Create focus sessions for multiple days
        focus_sessions = [
            {
                "task_name": "Deep Work - Code Review",
                "duration_minutes": 45,
                "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
                "completed": True
            },
            {
                "task_name": "Project Planning",
                "duration_minutes": 30,
                "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
                "completed": True
            },
            {
                "task_name": "Learning New Framework",
                "duration_minutes": 60,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "completed": True
            },
            {
                "task_name": "Writing Documentation",
                "duration_minutes": 25,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "completed": False
            }
        ]
        
        for session_data in focus_sessions:
            response = self.make_request("POST", "/focus", session_data)
            if response and response.status_code == 200:
                data = response.json()
                if "id" in data and "task_name" in data and "duration_minutes" in data:
                    self.log_result("focus", f"Create Focus Session: {session_data['task_name']}", True)
                else:
                    self.log_result("focus", f"Create Focus Session: {session_data['task_name']}", False, "Missing fields in response")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_result("focus", f"Create Focus Session: {session_data['task_name']}", False, error_msg)
        
        # Test 2: Get all focus sessions
        response = self.make_request("GET", "/focus")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 4:
                self.log_result("focus", "Get All Focus Sessions", True)
            else:
                self.log_result("focus", "Get All Focus Sessions", False, f"Expected list with at least 4 sessions, got {len(data) if isinstance(data, list) else 'non-list'}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("focus", "Get All Focus Sessions", False, error_msg)
    
    def test_analytics_api(self):
        """Test analytics endpoint comprehensively"""
        print("\n📊 Testing Analytics API...")
        
        if not self.token:
            self.log_result("analytics", "All Analytics Tests", False, "No auth token available")
            return
        
        # Wait a moment to ensure all data is processed
        time.sleep(2)
        
        # Test 1: Get analytics data
        response = self.make_request("GET", "/analytics")
        if response and response.status_code == 200:
            data = response.json()
            
            # Validate weekly_stats structure
            if "weekly_stats" in data:
                stats = data["weekly_stats"]
                required_fields = ["total_habits_completed", "total_focus_minutes", "average_mood", 
                                 "average_energy", "average_sleep", "habit_completion_rate"]
                
                if all(field in stats for field in required_fields):
                    self.log_result("analytics", "Weekly Stats Structure", True)
                    
                    # Validate data makes sense
                    if stats["total_focus_minutes"] > 0 and stats["average_mood"] > 0:
                        self.log_result("analytics", "Weekly Stats Data Validity", True)
                    else:
                        self.log_result("analytics", "Weekly Stats Data Validity", False, "Stats contain zero values when data exists")
                else:
                    missing = [f for f in required_fields if f not in stats]
                    self.log_result("analytics", "Weekly Stats Structure", False, f"Missing fields: {missing}")
            else:
                self.log_result("analytics", "Weekly Stats Structure", False, "weekly_stats not in response")
            
            # Validate insights structure
            if "insights" in data:
                insights = data["insights"]
                if isinstance(insights, list):
                    self.log_result("analytics", "Insights Structure", True)
                    
                    # Check if insights contain expected types
                    insight_types = [insight.get("type") for insight in insights]
                    if any(t in insight_types for t in ["sleep_focus", "habit_streak", "mood_trend", "focus_productivity"]):
                        self.log_result("analytics", "Insights Content", True)
                    else:
                        self.log_result("analytics", "Insights Content", False, f"No expected insight types found: {insight_types}")
                else:
                    self.log_result("analytics", "Insights Structure", False, "insights is not a list")
            else:
                self.log_result("analytics", "Insights Structure", False, "insights not in response")
            
            # Validate habit_streaks
            if "habit_streaks" in data:
                streaks = data["habit_streaks"]
                if isinstance(streaks, dict):
                    self.log_result("analytics", "Habit Streaks Structure", True)
                else:
                    self.log_result("analytics", "Habit Streaks Structure", False, "habit_streaks is not a dict")
            else:
                self.log_result("analytics", "Habit Streaks Structure", False, "habit_streaks not in response")
            
            # Validate chart data
            if "mood_chart_data" in data and "focus_chart_data" in data:
                mood_data = data["mood_chart_data"]
                focus_data = data["focus_chart_data"]
                
                if isinstance(mood_data, list) and isinstance(focus_data, list):
                    self.log_result("analytics", "Chart Data Structure", True)
                    
                    # Check if chart data has expected fields
                    if mood_data and all("date" in item and "mood" in item for item in mood_data):
                        self.log_result("analytics", "Mood Chart Data Content", True)
                    else:
                        self.log_result("analytics", "Mood Chart Data Content", False, "Missing required fields in mood chart data")
                    
                    if focus_data and all("date" in item and "minutes" in item for item in focus_data):
                        self.log_result("analytics", "Focus Chart Data Content", True)
                    else:
                        self.log_result("analytics", "Focus Chart Data Content", False, "Missing required fields in focus chart data")
                else:
                    self.log_result("analytics", "Chart Data Structure", False, "Chart data is not in list format")
            else:
                self.log_result("analytics", "Chart Data Structure", False, "Chart data not in response")
            
            # Test sleep-focus correlation calculation
            if "insights" in data:
                sleep_focus_insights = [i for i in data["insights"] if i.get("type") == "sleep_focus"]
                if sleep_focus_insights:
                    self.log_result("analytics", "Sleep-Focus Correlation", True)
                else:
                    self.log_result("analytics", "Sleep-Focus Correlation", False, "No sleep-focus correlation insight generated")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("analytics", "Get Analytics", False, error_msg)
    
    def test_unauthorized_access(self):
        """Test that endpoints properly require authentication"""
        print("\n🔒 Testing Unauthorized Access...")
        
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        endpoints_to_test = [
            ("/auth/me", "GET"),
            ("/habits", "GET"),
            ("/habits", "POST"),
            ("/mood", "GET"),
            ("/focus", "GET"),
            ("/analytics", "GET")
        ]
        
        for endpoint, method in endpoints_to_test:
            response = self.make_request(method, endpoint, {})
            if response and response.status_code in [401, 403]:  # Both 401 and 403 are valid for unauthorized access
                self.log_result("auth", f"Unauthorized Access Protection: {method} {endpoint}", True)
            else:
                status = response.status_code if response else "No response"
                self.log_result("auth", f"Unauthorized Access Protection: {method} {endpoint}", False, f"Expected 401/403, got {status}")
        
        # Restore token
        self.token = original_token
    
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Pulse Backend API Comprehensive Testing...")
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {TEST_USER_EMAIL}")
        
        # Run all test suites
        self.test_authentication()
        self.test_habits_api()
        self.test_mood_api()
        self.test_focus_api()
        self.test_analytics_api()
        self.test_unauthorized_access()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "="*60)
        print("📋 TEST RESULTS SUMMARY")
        print("="*60)
        
        total_passed = 0
        total_failed = 0
        
        for category, results in self.test_results.items():
            passed = results["passed"]
            failed = results["failed"]
            total_passed += passed
            total_failed += failed
            
            status = "✅ PASS" if failed == 0 else "❌ FAIL"
            print(f"{category.upper():12} | {status} | {passed:2d} passed, {failed:2d} failed")
            
            if results["errors"]:
                for error in results["errors"]:
                    print(f"             | ERROR: {error}")
        
        print("-" * 60)
        print(f"TOTAL        | {total_passed:2d} passed, {total_failed:2d} failed")
        
        if total_failed == 0:
            print("\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
        else:
            print(f"\n⚠️  {total_failed} TESTS FAILED. Please review the errors above.")
        
        return total_failed == 0

if __name__ == "__main__":
    tester = PulseAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)