from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import secrets

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    matric_number = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')  # 'student' or 'admin'
    profile_picture = db.Column(db.String(255), default='default-avatar.png')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    enrollments = db.relationship('Enrollment', backref='user', lazy=True, cascade='all, delete-orphan')
    attendance_records = db.relationship('AttendanceRecord', backref='user', lazy=True, cascade='all, delete-orphan')
    announcements = db.relationship('Announcement', backref='author', lazy=True)
    notification_reads = db.relationship('AnnouncementRead', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.full_name} ({self.matric_number})>'

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_code = db.Column(db.String(10), unique=True, nullable=False)
    course_title = db.Column(db.String(200), nullable=False)
    lecturer_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    join_code = db.Column(db.String(10), unique=True, nullable=False)
    cover_image = db.Column(db.String(255), default='default-course.jpg')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    enrollments = db.relationship('Enrollment', backref='course', lazy=True, cascade='all, delete-orphan')
    class_sessions = db.relationship('ClassSession', backref='course', lazy=True, cascade='all, delete-orphan')
    attendance_records = db.relationship('AttendanceRecord', backref='course', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        super(Course, self).__init__(**kwargs)
        if not self.join_code:
            self.join_code = secrets.token_urlsafe(6).upper()
    
    def get_enrollment_count(self):
        return len(self.enrollments)
    
    def get_attendance_percentage(self, user_id):
        user_records = AttendanceRecord.query.filter_by(
            user_id=user_id,
            course_id=self.id
        ).all()
        
        if not user_records:
            return 0
        
        present_count = len([r for r in user_records if r.status == 'present'])
        return round((present_count / len(user_records)) * 100, 1)
    
    def get_weekly_attendance(self, user_id, max_weeks=12):
        """Get attendance records grouped by week for a user"""
        from sqlalchemy import func
        
        # Get all attendance records for this user and course
        records = db.session.query(AttendanceRecord, ClassSession).join(
            ClassSession, AttendanceRecord.class_session_id == ClassSession.id
        ).filter(
            AttendanceRecord.user_id == user_id,
            AttendanceRecord.course_id == self.id
        ).order_by(ClassSession.date.desc()).limit(max_weeks * 7).all()
        
        # Group by week
        weekly_data = {}
        for record, session in records:
            week_start = session.date - timedelta(days=session.date.weekday())
            week_key = week_start.strftime('%Y-W%U')
            
            if week_key not in weekly_data:
                weekly_data[week_key] = {
                    'week_start': week_start,
                    'records': []
                }
            
            weekly_data[week_key]['records'].append({
                'date': session.date,
                'status': record.status,
                'time': record.timestamp.strftime('%H:%M'),
                'session_time': f"{session.start_time.strftime('%H:%M')} - {session.end_time.strftime('%H:%M')}"
            })
        
        # Sort and limit to max_weeks
        sorted_weeks = sorted(weekly_data.items(), key=lambda x: x[1]['week_start'], reverse=True)[:max_weeks]
        return dict(sorted_weeks)
    
    def __repr__(self):
        return f'<Course {self.course_code}: {self.course_title}>'

class Enrollment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate enrollments
    __table_args__ = (db.UniqueConstraint('user_id', 'course_id', name='unique_enrollment'),)
    
    def __repr__(self):
        return f'<Enrollment User:{self.user_id} Course:{self.course_id}>'

class ClassSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    location = db.Column(db.String(100))
    status = db.Column(db.String(20), default='scheduled')  # 'scheduled', 'active', 'completed', 'cancelled'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def is_active(self):
        now = datetime.now()
        session_start = datetime.combine(self.date, self.start_time)
        session_end = datetime.combine(self.date, self.end_time)
        return session_start <= now <= session_end
    
    def is_upcoming(self):
        now = datetime.now()
        session_start = datetime.combine(self.date, self.start_time)
        return now < session_start
    
    def __repr__(self):
        return f'<ClassSession {self.course.course_code} on {self.date}>'

class AttendanceRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    class_session_id = db.Column(db.Integer, db.ForeignKey('class_session.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # 'present', 'absent'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    marked_by = db.Column(db.String(20), default='system')  # 'student', 'admin', 'system'
    
    # Relationships
    class_session = db.relationship('ClassSession', backref='attendance_records', lazy=True)
    
    # Unique constraint to prevent duplicate records for same student in same session
    __table_args__ = (db.UniqueConstraint('user_id', 'class_session_id', name='unique_attendance'),)
    
    def __repr__(self):
        return f'<AttendanceRecord {self.user.full_name} - {self.status}>'

class Announcement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=True)  # null = general announcement
    priority = db.Column(db.String(20), default='normal')  # 'low', 'normal', 'high', 'urgent'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    course = db.relationship('Course', backref='announcements', lazy=True)
    reads = db.relationship('AnnouncementRead', backref='announcement', lazy=True, cascade='all, delete-orphan')
    
    def is_read_by(self, user_id):
        return AnnouncementRead.query.filter_by(
            announcement_id=self.id, 
            user_id=user_id
        ).first() is not None
    
    def __repr__(self):
        return f'<Announcement {self.title}>'

class AnnouncementRead(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    announcement_id = db.Column(db.Integer, db.ForeignKey('announcement.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    read_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate reads
    __table_args__ = (db.UniqueConstraint('announcement_id', 'user_id', name='unique_read'),)
    
    def __repr__(self):
        return f'<AnnouncementRead {self.announcement_id} by {self.user_id}>'
