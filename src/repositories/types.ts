export interface Course {
  id: string;
  title: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Offering {
  id: string;
  course_id: string;
  teacher_id: string;
  name: string;
  capacity: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Session {
  id: string;
  offering_id: string;
  teacher_id: string;
  start_time: Date;
  end_time: Date;
}

export interface Booking {
  id: string;
  offering_id: string;
  parent_id: string;
  booked_at: Date;
}
